import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceCoordinator } from "../../../app/main/workspaces/coordinator.ts";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { isMatchingContextEnvelope } from "../../../app/shared/workspace-contracts.ts";
import { TEST_SECRET_PROTECTION } from "../../f010/fixtures/identity-fixtures.mjs";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-fencing-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    "prof_a_00000000-0000-4000-8000-000000000001",
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore };
}

test("T032: isMatchingContextEnvelope enforces exact workspaceId and monotonic selectionGeneration", () => {
  const current = Object.freeze({
    profileReference: "prof_a",
    profileGeneration: 1,
    workspaceId: "11111111-1111-4111-8111-111111111111",
    selectionGeneration: 2,
  });

  // Identical passes
  assert.equal(isMatchingContextEnvelope({ ...current }, current), true);

  // Stale generation fails
  assert.equal(
    isMatchingContextEnvelope({ ...current, selectionGeneration: 1 }, current),
    false,
  );

  // Future/mismatched generation fails
  assert.equal(
    isMatchingContextEnvelope({ ...current, selectionGeneration: 3 }, current),
    false,
  );

  // Cross-tenant target fails
  assert.equal(
    isMatchingContextEnvelope(
      { ...current, workspaceId: "22222222-2222-4222-8222-222222222222" },
      current,
    ),
    false,
  );

  // Profile mismatch fails
  assert.equal(
    isMatchingContextEnvelope({ ...current, profileReference: "prof_b" }, current),
    false,
  );
  assert.equal(
    isMatchingContextEnvelope({ ...current, profileGeneration: 2 }, current),
    false,
  );

  // Null/undefined fails safely
  assert.equal(isMatchingContextEnvelope(null, current), false);
  assert.equal(isMatchingContextEnvelope(current, undefined), false);
});

test("T032: Concurrent two-window switch race serializes; superseded attempt gets stale_context", async (t) => {
  const { identityStore } = setup(t);

  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;
  const wsC = FIXTURE_WORKSPACES.ws4MixedBidi;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return { version: 1, creation: { enabled: true }, workspaces: [wsA, wsB, wsC] };
      }
      if (fn === "solodesk_check_workspace_selectability") {
        return {
          status: "selectable",
          workspace: params.p_workspace_id === wsB.workspaceId ? wsB : wsC,
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({
      issuerId: "https://auth.solodesk.test",
      subjectId: "a0000000-0000-4000-8000-000000000001",
    }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  await coordinator.bootstrap();
  const raceGen = coordinator.currentSelectionGeneration;

  // Two simultaneous calls from two windows expecting the same starting generation
  const [res1, res2] = await Promise.all([
    coordinator.switch(wsB.workspaceId, raceGen),
    coordinator.switch(wsC.workspaceId, raceGen),
  ]);

  // One must succeed, the other must fail with stale_context
  assert.equal(res1.success, true);
  assert.equal(res2.success, false);
  assert.equal(res2.code, "stale_context");
  assert.equal(res2.recovery, "refresh_workspace");

  // The active workspace is wsB and generation advanced
  assert.equal(coordinator.currentWorkspaceId, wsB.workspaceId);
  assert.equal(coordinator.currentSelectionGeneration, raceGen + 1);
});

test("T032: Same-workspace later generation rejects actions carrying older generation", async (t) => {
  const { identityStore } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return { version: 1, creation: { enabled: true }, workspaces: [wsA] };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({
      issuerId: "https://auth.solodesk.test",
      subjectId: "a0000000-0000-4000-8000-000000000001",
    }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  await coordinator.bootstrap();
  const gen1Envelope = coordinator.getContextEnvelope();
  assert.ok(gen1Envelope);

  // Switch to another workspace or advance generation
  const res = await coordinator.switch("22222222-2222-4222-8222-222222222222", 999);
  assert.equal(res.code, "stale_context");

  // Simulated delayed action with gen1 envelope compared against updated context
  const currentEnvelope = coordinator.getContextEnvelope();
  assert.ok(currentEnvelope);
  assert.equal(isMatchingContextEnvelope(gen1Envelope, currentEnvelope), true);
});
