import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

test("WorkspaceService reconcileCreation returns committed result for existing intent", async () => {
  const committedResponse = {
    status: "committed",
    workspace: FIXTURE_WORKSPACES.ws1,
    membership: { role: "owner", status: "active" },
    receiptId: "r0000000-0000-4000-8000-000000000001",
    committedAt: "2026-10-21T12:00:00.000Z",
    readinessState: "setup_incomplete",
  };

  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params, token) => {
      assert.equal(fn, "solodesk_reconcile_workspace_creation");
      assert.equal(params.p_intent_id, "f47ac10b-58cc-4372-a567-0e02b2c3d479");
      assert.equal(token, "token-account-a");
      return committedResponse;
    },
  });

  const res = await service.reconcileCreation(
    "token-account-a",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  );
  assert.equal(res.status, "committed");
  assert.equal(res.workspace.workspaceId, FIXTURE_WORKSPACES.ws1.workspaceId);
  assert.equal(res.receiptId, "r0000000-0000-4000-8000-000000000001");
});

test("WorkspaceService reconcileCreation handles lost response / network failure as outcome_unknown", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error("network fetch timeout / outcome_unknown");
    },
  });

  const res = await service.reconcileCreation(
    "valid-token",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  );
  assert.equal(res.status, "rejected");
  assert.equal(res.code, "outcome_unknown");
  assert.equal(res.recovery, "reconcile_creation");
});

test("WorkspaceService reconcileCreation rejects invalid or non-UUIDv4 intent", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
  });

  const res = await service.reconcileCreation("valid-token", "not-a-uuid");
  assert.equal(res.status, "rejected");
  assert.equal(res.code, "validation");
  assert.equal(res.recovery, "correct_input");
});

test("WorkspaceService reconcileCreation returns proven_not_created or safe rejection", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      return {
        status: "proven_not_created",
        code: "workspace_creation_unavailable",
        diagnosticId: "intent-not-found",
        recovery: "retry_or_contact_support",
      };
    },
  });

  const res = await service.reconcileCreation(
    "valid-token",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  );
  assert.equal(res.status, "proven_not_created");
  assert.equal(res.code, "workspace_creation_unavailable");
});

test("Reconciliation prohibits display-name matching and foreign-account leakage", async () => {
  let queriedBy = null;
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params, token) => {
      queriedBy = { fn, params, token };
      // Foreign account or non-existent intent returns safe not found
      return {
        status: "proven_not_created",
        code: "workspace_creation_unavailable",
        diagnosticId: "diag-foreign-intent",
        recovery: "retry_or_contact_support",
      };
    },
  });

  const res = await service.reconcileCreation(
    "token-account-b",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  );

  // Assert RPC only receives intentId, NEVER display name or name query
  assert.equal(queriedBy.fn, "solodesk_reconcile_workspace_creation");
  assert.ok(queriedBy.params.p_intent_id);
  assert.equal(queriedBy.params.displayName, undefined);
  assert.equal(queriedBy.params.name, undefined);
  assert.equal(res.status, "proven_not_created");
});
