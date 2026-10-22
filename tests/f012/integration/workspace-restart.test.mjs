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

function setup(t, profileId = "prof_a_00000000-0000-4000-8000-000000000001") {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-restart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    profileId,
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore, profileId };
}

function makeMockService(workspaces) {
  return new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: { enabled: true, locales: ["en", "ar"], currencyCodes: ["USD", "SAR"] },
          workspaces,
        };
      }
      if (fn === "solodesk_list_selectable_workspaces") {
        return { workspaces };
      }
      if (fn === "solodesk_check_workspace_selectability") {
        const found = workspaces.find((w) => w.workspaceId === params.target_workspace_id);
        if (found) return { status: "selectable", workspace: found };
        return { status: "workspace_unavailable" };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });
}

test("T041: Restart with state 'current' restores saved workspace cleanly", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  // Pre-seed a 'current' selection record for wsB
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 5,
    state: "current",
    currentWorkspaceId: wsB.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  let openedId = null;
  const mockPersistence = {
    async openRetainedWorkspace(id) {
      openedId = id;
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: makeMockService([wsA, wsB]),
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "ready");
  assert.equal(coordinator.currentWorkspaceId, wsB.workspaceId);
  assert.equal(openedId, wsB.workspaceId);
  assert.equal(coordinator.currentSelectionGeneration, 5);
});

test("T041: Same coordinator restores its workspace after sign-out teardown", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 2,
    state: "current",
    currentWorkspaceId: wsA.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });
  let openCount = 0;
  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async openRetainedWorkspace(id) { openCount += 1; return { workspaceId: id, status: "ready" }; },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: makeMockService([wsA]),
  });
  let published = 0;
  coordinator.onStateChanged(() => { published += 1; });

  await coordinator.bootstrap();
  await coordinator.dispose();
  const state = await coordinator.refresh();

  assert.equal(state.lifecycle, "ready");
  assert.equal(state.current.workspaceId, wsA.workspaceId);
  assert.equal(openCount, 2);
  assert.ok(published >= 4);
});

test("T041: Restart with state 'switching' converges back to safe source workspace", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  // Pre-seed an interrupted 'switching' record from wsA to wsB
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 3,
    state: "switching",
    currentWorkspaceId: wsA.workspaceId,
    targetWorkspaceId: wsB.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  let openedId = null;
  const mockPersistence = {
    async openRetainedWorkspace(id) {
      openedId = id;
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: makeMockService([wsA, wsB]),
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "ready");
  // Converges back to source A
  assert.equal(coordinator.currentWorkspaceId, wsA.workspaceId);
  assert.equal(openedId, wsA.workspaceId);

  // Selection record is updated from 'switching' to 'current'
  const saved = identityStore.loadWorkspaceSelection();
  assert.equal(saved.state, "current");
  assert.equal(saved.currentWorkspaceId, wsA.workspaceId);
});

test("T041: Restart with state 'locked' presents locked chooser without guessing tenant", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;

  // Pre-seed a 'locked' record
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 2,
    state: "locked",
    currentWorkspaceId: wsA.workspaceId,
    safeReasonCode: "local_partition_missing",
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      return { workspaceId: id, status: "recovery_required", reason: "key_missing" };
    },
    async closeWorkspaceStore() {},
  };

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: makeMockService([wsA]),
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "locked");
  assert.ok(state.nextActions.includes("choose_another_workspace"));
});

test("T041: Account or profile mismatch ignores foreign selection record without disclosure", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;

  // Pre-seed a record for a DIFFERENT account
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://foreign-auth.test",
    subjectId: "a0000000-0000-4000-8000-999999999999",
    selectionGeneration: 10,
    state: "current",
    currentWorkspaceId: wsA.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  let openedId = null;
  const mockPersistence = {
    async openRetainedWorkspace(id) {
      openedId = id;
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    // Current logged in account is local alice, NOT foreign-auth
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: makeMockService([wsA]),
  });

  const state = await coordinator.bootstrap();
  // Foreign selection record was ignored; selectionGeneration defaults fresh to 1
  assert.equal(coordinator.currentSelectionGeneration, 1);
});

test("T041: Restart when candidate workspace is no longer selectable online enters locked chooser", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsRevoked = FIXTURE_WORKSPACES.ws2DuplicateName;

  // Pre-seed selection record for wsRevoked
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 4,
    state: "current",
    currentWorkspaceId: wsRevoked.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    // wsRevoked is NOT in the selectable list returned from server
    workspaceService: makeMockService([wsA]),
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "locked");
  assert.equal(state.current, undefined);
  assert.ok(state.nextActions.includes("choose_another_workspace"));
});
