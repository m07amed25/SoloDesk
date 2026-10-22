import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import {
  deriveDiscriminator,
  PROHIBITED_AUTHORITY_KEYS,
  validateExactKeys,
} from "../../../app/shared/workspace-contracts.ts";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";

test("T029: listSelectable returns only active memberships with bounded summaries", async () => {
  const summaries = [FIXTURE_WORKSPACES.ws1, FIXTURE_WORKSPACES.ws2DuplicateName];

  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params, token) => {
      assert.equal(fn, "solodesk_list_selectable_workspaces");
      assert.equal(token, "token-user-a");
      return summaries;
    },
  });

  const list = await service.listSelectable("token-user-a");
  assert.equal(list.length, 2);
  for (const item of list) {
    assert.equal(item.membershipStatus, "active");
    assert.equal(item.workspaceStatus, "active");
    // Ensure no sensitive or unbounded fields exist
    assert.equal(item.connectionString, undefined);
    assert.equal(item.rawErrors, undefined);
    assert.equal(item.tenantSecret, undefined);
    assert.ok(item.workspaceId);
    assert.ok(item.displayName);
    assert.ok(item.discriminator);
  }
});

test("T029: Duplicate display names produce unique discriminators derived from IDs", async () => {
  const ws1 = FIXTURE_WORKSPACES.ws1;
  const ws2 = FIXTURE_WORKSPACES.ws2DuplicateName;

  assert.equal(ws1.displayName, ws2.displayName);
  assert.notEqual(ws1.workspaceId, ws2.workspaceId);

  const disc1 = deriveDiscriminator(ws1.workspaceId);
  const disc2 = deriveDiscriminator(ws2.workspaceId);

  assert.notEqual(disc1, disc2);
  assert.equal(disc1, "1111");
  assert.equal(disc2, "2222");
});

test("T029: Non-member, suspended, revoked, and non-existent targets return uniform workspace_unavailable", async () => {
  const testCases = [
    { name: "non-member", targetId: "99999999-9999-4999-8999-999999999999" },
    { name: "suspended", targetId: "88888888-8888-4888-8888-888888888888" },
    { name: "revoked", targetId: "77777777-7777-4777-8777-777777777777" },
    { name: "random-guess", targetId: "00000000-0000-4000-8000-000000000000" },
  ];

  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      assert.equal(fn, "solodesk_check_workspace_selectability");
      // Server returns uniform status: unavailable without revealing existence
      return { status: "unavailable", code: "workspace_unavailable" };
    },
  });

  for (const tc of testCases) {
    const res = await service.checkSelectability("token-user-a", tc.targetId);
    assert.equal(
      res.status,
      "unavailable",
      `Expected ${tc.name} to yield unavailable`,
    );
    assert.equal(res.code, "workspace_unavailable");
    // Assert no hidden tenant info leaked
    assert.equal(res.workspace, undefined);
    assert.equal(res.exists, undefined);
    assert.equal(res.statusReason, undefined);
  }
});

test("T029: Selectability check succeeds for valid active member workspace", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      assert.equal(fn, "solodesk_check_workspace_selectability");
      assert.equal(params.p_workspace_id, FIXTURE_WORKSPACES.ws1.workspaceId);
      return { status: "selectable", workspace: FIXTURE_WORKSPACES.ws1 };
    },
  });

  const res = await service.checkSelectability(
    "token-user-a",
    FIXTURE_WORKSPACES.ws1.workspaceId,
  );
  assert.equal(res.status, "selectable");
  assert.equal(res.workspace.workspaceId, FIXTURE_WORKSPACES.ws1.workspaceId);
  assert.equal(res.workspace.role, "owner");
});
