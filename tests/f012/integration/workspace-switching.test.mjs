import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceCoordinator } from "../../../app/main/workspaces/coordinator.ts";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { TEST_SECRET_PROTECTION } from "../../f010/fixtures/identity-fixtures.mjs";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-switch-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    "prof_a_00000000-0000-4000-8000-000000000001",
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore };
}

test("T031: Atomic switch successfully switches from workspace A to B", async (t) => {
  const { identityStore } = setup(t);

  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  let closedWs = null;
  let openedWs = null;

  const mockPersistence = {
    async openRetainedWorkspace(workspaceId) {
      openedWs = workspaceId;
      return { workspaceId, status: "ready" };
    },
    async closeWorkspaceStore(workspaceId) {
      closedWs = workspaceId;
    },
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_check_workspace_selectability") {
        return { status: "selectable", workspace: wsB };
      }
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: {
            enabled: true,
            locales: ["en", "ar"],
            currencyCodes: ["USD", "SAR"],
          },
          workspaces: [wsA, wsB],
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
  const initialGen = coordinator.currentSelectionGeneration;
  assert.equal(coordinator.currentWorkspaceId, wsA.workspaceId);

  // Switch to B
  const res = await coordinator.switch(wsB.workspaceId, initialGen);
  assert.equal(res.success, true);
  assert.equal(closedWs, wsA.workspaceId);
  assert.equal(openedWs, wsB.workspaceId);
  assert.equal(coordinator.currentWorkspaceId, wsB.workspaceId);
  assert.equal(coordinator.currentSelectionGeneration, initialGen + 1);

  // State published is clean B
  const state = coordinator.getState();
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.current.workspaceId, wsB.workspaceId);
  assert.equal(state.target, undefined);
});

test("T031: Stale generation in switch request is safely rejected with stale_context", async (t) => {
  const { identityStore } = setup(t);

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({
      issuerId: "https://auth.solodesk.test",
      subjectId: "a0000000-0000-4000-8000-000000000001",
    }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async openRetainedWorkspace() {
        return { status: "ready" };
      },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: new WorkspaceService({
      supabaseUrl: "https://auth.solodesk.test",
      supabaseAnonKey: "anon-key",
    }),
  });

  const res = await coordinator.switch(
    "22222222-2222-4222-8222-222222222222",
    999,
  );
  assert.equal(res.success, false);
  assert.equal(res.code, "stale_context");
  assert.equal(res.recovery, "refresh_workspace");
});

test("T031: Target selectability check failure rolls back to source A without mixing state", async (t) => {
  const { identityStore } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  let sourceReopened = false;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      if (id === wsA.workspaceId) {
        sourceReopened = true;
        return { workspaceId: id, status: "ready" };
      }
      return { workspaceId: id, status: "recovery_required" };
    },
    async closeWorkspaceStore() {},
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: { enabled: true },
          workspaces: [wsA, wsB],
        };
      }
      if (fn === "solodesk_check_workspace_selectability") {
        // Target is revoked or unavailable
        return { status: "unavailable", code: "workspace_unavailable" };
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
  const gen = coordinator.currentSelectionGeneration;

  const res = await coordinator.switch(wsB.workspaceId, gen);
  assert.equal(res.success, false);
  assert.equal(res.code, "workspace_unavailable");

  // Verified source A was reopened and remains current
  assert.equal(sourceReopened, true);
  assert.equal(coordinator.currentWorkspaceId, wsA.workspaceId);
  const state = coordinator.getState();
  assert.equal(state.current.workspaceId, wsA.workspaceId);
  assert.equal(state.target, undefined);
});

test("T031: Target partition missing locks without exposing uninitialized replacement", async (t) => {
  const { identityStore } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      if (id === wsA.workspaceId) {
        // Source fails to reopen too (e.g. partition locked)
        return { workspaceId: id, status: "recovery_required" };
      }
      // Target is not initialized locally
      return { workspaceId: id, status: "recovery_required" };
    },
    async closeWorkspaceStore() {},
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: { enabled: true },
          workspaces: [wsA, wsB],
        };
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
  const gen = coordinator.currentSelectionGeneration;

  const res = await coordinator.switch(wsB.workspaceId, gen);
  assert.equal(res.success, false);
  assert.equal(res.code, "local_partition_missing");

  // Coordinator locks safely
  const state = coordinator.getState();
  assert.equal(state.lifecycle, "locked");
  assert.equal(state.current, undefined);
  assert.equal(state.target, undefined);
});
