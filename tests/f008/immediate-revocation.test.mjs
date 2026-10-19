import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import { validateTrustedContext } from "../../supabase/functions/_shared/auth.ts";

test("A-06: Immediate revocation blocks subsequent queries without waiting for JWT expiration", async () => {
  const emulator = seedTenants(createF008Emulator());

  // 1. Bob makes an authenticated query while active -> succeeds
  emulator.setAuth("usr_bob");
  const initialTasks = emulator.from("tasks").select("*").all();
  assert.equal(
    initialTasks.data.length,
    1,
    "Active Bob can read tasks in Alpha",
  );

  // 2. Gateway authentication check for Bob while active -> succeeds
  const mockReq = new Request(
    "http://localhost:54321/functions/v1/command-gateway",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer usr_bob",
        "X-Workspace-Id": "ws_alpha_01",
      },
    },
  );

  const liveLookup = (wsId, userId) => {
    return emulator.rawDb
      .prepare(
        "SELECT role, status FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?",
      )
      .get(wsId, userId);
  };

  const authBefore = await validateTrustedContext(mockReq, liveLookup);
  assert.equal(authBefore.ok, true);
  assert.equal(authBefore.context.role, "contributor");

  // 3. Alice (Owner) revokes Bob's membership immediately
  emulator.setAuth("usr_alice");
  const revokeResult = emulator
    .from("workspace_memberships")
    .update({ status: "revoked" })
    .eq("user_id", "usr_bob");
  assert.equal(revokeResult.count, 1, "Alice revokes Bob's membership");

  // 4. Bob immediately tries to read tasks with his existing session/token
  emulator.setAuth("usr_bob");
  const revokedTasks = emulator.from("tasks").select("*").all();
  assert.equal(
    revokedTasks.data.length,
    0,
    "Revoked Bob's immediate next query must return 0 rows (empty set) under RLS",
  );

  // 5. Bob tries to execute via Gateway with his existing JWT
  const authAfter = await validateTrustedContext(mockReq, liveLookup);
  assert.equal(
    authAfter.ok,
    false,
    "Gateway must reject revoked member immediately",
  );
  assert.equal(authAfter.status, 401);
  assert.equal(authAfter.error.code, "SESSION_REVOKED");
});
