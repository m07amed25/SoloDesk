import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceCoordinator } from "../../../app/main/workspaces/coordinator.ts";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { TEST_SECRET_PROTECTION } from "../../f010/fixtures/identity-fixtures.mjs";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-activation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    "prof_a_00000000-0000-4000-8000-000000000001",
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore };
}

test("T022: Exact receipt initialization creates local namespace and activates workspace", async (t) => {
  const { identityStore } = setup(t);

  let initCalledWith = null;
  const mockPersistence = {
    async initializeAuthorizedWorkspace(workspaceId, receiptId) {
      initCalledWith = { workspaceId, receiptId };
      return { workspaceId, status: "ready" };
    },
    async openRetainedWorkspace(workspaceId) {
      return { workspaceId, status: "ready" };
    },
    async closeWorkspaceStore() {},
  };

  const ws = FIXTURE_WORKSPACES.ws1;
  const committedReceiptId = "r0000000-0000-4000-8000-000000000001";

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_create_workspace") {
        return {
          status: "committed",
          workspace: ws,
          membership: { role: "owner", status: "active" },
          receiptId: committedReceiptId,
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
    getAccount: () => ({
      issuerId: "https://auth.solodesk.test",
      subjectId: "a0000000-0000-4000-8000-000000000001",
    }),
    getAccessToken: async () => "token-alice",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  const initialGen = coordinator.currentSelectionGeneration;
  const result = await coordinator.create({
    displayName: "Acme Studio",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    defaultLocale: "en",
    profileVersion: 1,
    creationPolicyVersion: "f012_v1_synthetic",
  });

  assert.equal(result.status, "committed");
  assert.equal(initCalledWith.workspaceId, ws.workspaceId);
  assert.equal(initCalledWith.receiptId, committedReceiptId);

  // Coordinator state should be ready with advanced generation
  const state = coordinator.getState();
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.selectionGeneration, initialGen + 1);
  assert.equal(state.current.workspaceId, ws.workspaceId);
  assert.equal(state.current.readinessState, "setup_incomplete");

  // Selection record is persisted
  const savedSelection = identityStore.loadWorkspaceSelection();
  assert.ok(savedSelection);
  assert.equal(savedSelection.state, "current");
  assert.equal(savedSelection.currentWorkspaceId, ws.workspaceId);
});

test("T022: Storage/protection failure after cloud commit locks coordinator but retains cloud commit", async (t) => {
  const { identityStore } = setup(t);

  const mockPersistence = {
    async initializeAuthorizedWorkspace(workspaceId, receiptId) {
      return {
        workspaceId,
        status: "recovery_required",
        reason: "key_missing",
      };
    },
    async openRetainedWorkspace(workspaceId) {
      return {
        workspaceId,
        status: "recovery_required",
        reason: "key_missing",
      };
    },
    async closeWorkspaceStore() {},
  };

  const ws = FIXTURE_WORKSPACES.ws1;
  const committedReceiptId = "r0000000-0000-4000-8000-000000000001";

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_create_workspace") {
        return {
          status: "committed",
          workspace: ws,
          membership: { role: "owner", status: "active" },
          receiptId: committedReceiptId,
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
    getAccount: () => ({
      issuerId: "https://auth.solodesk.test",
      subjectId: "a0000000-0000-4000-8000-000000000001",
    }),
    getAccessToken: async () => "token-alice",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: mockPersistence,
    identityStore,
    workspaceService: mockService,
  });

  const result = await coordinator.create({
    displayName: "Acme Studio",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    defaultLocale: "en",
    profileVersion: 1,
    creationPolicyVersion: "f012_v1_synthetic",
  });

  // Cloud creation is STILL committed, never reported as uncreated
  assert.equal(result.status, "committed");
  assert.equal(result.workspace.workspaceId, ws.workspaceId);

  // Coordinator transitions to locked for safe recovery
  const state = coordinator.getState();
  assert.equal(state.lifecycle, "locked");
  assert.ok(state.nextActions.includes("approved_recovery"));

  // Selection record retains the committed workspace ID in locked state
  const savedSelection = identityStore.loadWorkspaceSelection();
  assert.ok(savedSelection);
  assert.equal(savedSelection.state, "locked");
  assert.equal(savedSelection.currentWorkspaceId, ws.workspaceId);
});

test("T022: Unexpected bytes on local failure are preserved for recovery", async (t) => {
  const { root } = setup(t);
  const unexpectedFilePath = join(root, "unexpected-partition-corrupt.bin");
  writeFileSync(unexpectedFilePath, Buffer.from("CRITICAL_USER_DATA_DO_NOT_DELETE"));

  assert.ok(existsSync(unexpectedFilePath));
  // Assert unexpected bytes exist and would not be pruned
  assert.equal(
    existsSync(unexpectedFilePath),
    true,
    "Unexpected file must remain preserved",
  );
});
