import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { WorkspaceCoordinator } from "../../../app/main/workspaces/coordinator.ts";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { TEST_SECRET_PROTECTION } from "../../f010/fixtures/identity-fixtures.mjs";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-faults-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    "prof_a_00000000-0000-4000-8000-000000000001",
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore };
}

test("T064: Failure Injection - Policy load network failure fails closed safely", async (t) => {
  const { identityStore } = setup(t);

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      throw new Error("ETIMEDOUT");
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: { async openRetainedWorkspace() { return { status: "ready" }; }, async closeWorkspaceStore() {} },
    identityStore,
    workspaceService: mockService,
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "online_required");
  assert.ok(state.nextActions.includes("retry"));
});

test("T064: Failure Injection - Lost response / outcome_unknown reconciles prior commit", async (t) => {
  const { identityStore } = setup(t);
  const ws = FIXTURE_WORKSPACES.ws1;
  const intentId = randomUUID();

  let firstAttempt = true;
  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_create_workspace") {
        if (firstAttempt) {
          firstAttempt = false;
          throw new Error("ECONNRESET"); // simulate network dropping after cloud commit
        }
      }
      if (fn === "solodesk_reconcile_workspace_creation") {
        return {
          status: "committed",
          workspace: ws,
          membership: { role: "owner", status: "active" },
          receiptId: "r0000000-0000-4000-8000-000000000001",
          committedAt: "2026-10-21T12:00:00.000Z",
          readinessState: "setup_incomplete",
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async initializeAuthorizedWorkspace() { return { status: "ready" }; },
      async openRetainedWorkspace() { return { status: "ready" }; },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: mockService,
  });

  // Attempt 1 fails with outcome_unknown
  const res1 = await coordinator.create({
    displayName: "Acme Studio",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    defaultLocale: "en",
    profileVersion: 1,
    creationPolicyVersion: "f012_v1_synthetic",
  }, intentId);

  assert.equal(res1.status, "rejected");

  // Reconcile retrieves committed result without duplicate insertion
  const res2 = await coordinator.reconcileCreation(intentId);
  assert.equal(res2.status, "committed");
  assert.equal(res2.workspace.workspaceId, ws.workspaceId);
  assert.equal(coordinator.currentWorkspaceId, ws.workspaceId);
});

test("T064: Failure Injection - Concurrent switch requests serialize cleanly", async (t) => {
  const { identityStore } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return { version: 1, creation: { enabled: true, locales: ["en", "ar"], currencyCodes: ["USD"] }, workspaces: [wsA, wsB] };
      }
      if (fn === "solodesk_check_workspace_selectability") {
        return { status: "selectable", workspace: wsB };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async openRetainedWorkspace(id) { return { workspaceId: id, status: "ready" }; },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: mockService,
  });

  await coordinator.bootstrap();
  const gen0 = coordinator.currentSelectionGeneration;

  // Fire two switches concurrently
  const [r1, r2] = await Promise.all([
    coordinator.switch(wsB.workspaceId, gen0),
    coordinator.switch(wsB.workspaceId, gen0),
  ]);

  // One succeeds, the second is rejected as stale context because generation advanced
  const successes = [r1, r2].filter((r) => r.success);
  const stales = [r1, r2].filter((r) => !r.success && r.code === "stale_context");

  assert.equal(successes.length, 1);
  assert.equal(stales.length, 1);
  assert.equal(coordinator.currentWorkspaceId, wsB.workspaceId);
});
