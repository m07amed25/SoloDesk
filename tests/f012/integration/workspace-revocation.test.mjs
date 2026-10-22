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
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-revocation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    profileId,
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore, profileId };
}

test("T042: Offline bootstrap without approved lease fails closed with online_required", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;

  // Pre-seed an existing current selection record
  identityStore.saveWorkspaceSelection({
    formatVersion: 1,
    profileReference: profileId,
    profileGeneration: 1,
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    selectionGeneration: 1,
    state: "current",
    currentWorkspaceId: wsA.workspaceId,
    attemptId: randomUUID(),
    correlationId: randomUUID(),
    pendingWorkDecision: "not_required",
    updatedAt: new Date().toISOString(),
  });

  let opened = false;
  const mockPersistence = {
    async openRetainedWorkspace() {
      opened = true;
      return { workspaceId: wsA.workspaceId, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
  });

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => null, // Offline, no access token
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "online_required");
  assert.equal(state.current, undefined);
  assert.equal(opened, false, "Must not open store offline without approved lease");
  assert.ok(state.nextActions.includes("reconnect"));
});

test("T042: Reconnect restores online authority and opens verified workspace", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;

  let isOnline = false;
  let openedWs = null;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      openedWs = id;
      return { workspaceId: id, status: "ready" };
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
          creation: { enabled: true, locales: ["en", "ar"], currencyCodes: ["USD"] },
          workspaces: [wsA],
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => (isOnline ? "token-valid" : null),
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  // Step 1: Initial offline bootstrap fails closed
  const offlineState = await coordinator.bootstrap();
  assert.equal(offlineState.lifecycle, "online_required");

  // Step 2: Connection restored, re-bootstrap
  isOnline = true;
  const onlineState = await coordinator.bootstrap();
  assert.equal(onlineState.lifecycle, "ready");
  assert.equal(coordinator.currentWorkspaceId, wsA.workspaceId);
  assert.equal(openedWs, wsA.workspaceId);
});

test("T042: Current membership revocation during refresh closes store and advances generation", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  let currentServerWorkspaces = [wsA, wsB];
  let currentCreationPolicy = {
    enabled: false,
    policyVersion: "none",
    locales: ["en", "ar"],
    currencyCodes: [],
  };
  let tokenAvailable = true;
  let closedWs = null;

  const mockPersistence = {
    async openRetainedWorkspace(id) {
      return { workspaceId: id, status: "ready" };
    },
    async closeWorkspaceStore(id) {
      closedWs = id;
    },
  };

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: currentCreationPolicy,
          workspaces: currentServerWorkspaces,
        };
      }
      if (fn === "solodesk_list_selectable_workspaces") {
        return { workspaces: currentServerWorkspaces };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => {
      if (!tokenAvailable) throw new Error("session unavailable");
      return "token-valid";
    },
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  await coordinator.bootstrap();
  assert.equal(coordinator.currentWorkspaceId, wsA.workspaceId);
  const initialGen = coordinator.currentSelectionGeneration;

  // Membership on wsA is REVOKED on server (now only wsB is returned)
  currentServerWorkspaces = [wsB];
  currentCreationPolicy = {
    enabled: true,
    policyVersion: "f012_v1_prod",
    locales: ["en", "ar"],
    currencyCodes: ["EGP", "USD"],
  };

  // Refresh
  const stateAfterRevocation = await coordinator.refresh();
  assert.equal(closedWs, wsA.workspaceId, "Source store must be cleanly closed");
  assert.equal(coordinator.currentWorkspaceId, undefined);
  assert.equal(stateAfterRevocation.lifecycle, "locked");
  assert.equal(coordinator.currentSelectionGeneration, initialGen + 1, "Generation must advance on revocation");
  assert.ok(stateAfterRevocation.nextActions.includes("choose_another_workspace"));
  assert.equal(stateAfterRevocation.creation.enabled, true);
  assert.equal(stateAfterRevocation.creation.policyVersion, "f012_v1_prod");

  tokenAvailable = false;
  const offlineState = await coordinator.refresh();
  assert.equal(offlineState.creation.policyVersion, "f012_v1_prod");

  // Check saved selection record is locked
  const saved = identityStore.loadWorkspaceSelection();
  assert.equal(saved.state, "locked");
});

test("T042: Switching while offline fails closed and preserves source workspace", async (t) => {
  const { identityStore, profileId } = setup(t);
  const wsA = FIXTURE_WORKSPACES.ws1;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic;

  let isOnline = true;
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
        return {
          version: 1,
          creation: { enabled: true, locales: ["en", "ar"], currencyCodes: ["USD"] },
          workspaces: [wsA, wsB],
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId,
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => (isOnline ? "token-valid" : null),
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  await coordinator.bootstrap();
  const initialGen = coordinator.currentSelectionGeneration;

  // Network drops
  isOnline = false;

  // Switch attempt to wsB
  const switchRes = await coordinator.switch(wsB.workspaceId, initialGen);
  assert.equal(switchRes.success, false);
  assert.equal(switchRes.code, "online_required");

  // Must not have switched to B
  assert.notEqual(coordinator.currentWorkspaceId, wsB.workspaceId);
});
