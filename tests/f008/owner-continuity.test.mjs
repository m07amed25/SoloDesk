import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import { executeOwnershipTransfer } from "../../supabase/functions/command-gateway/ownership-transfer.ts";

test("A-07: Protected workspace ownership continuity blocks deletion, revocation or demotion of sole Owner", () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // 1. Attempting to DELETE the sole Owner Alice from Workspace Alpha -> rejected by trigger
  const deleteResult = emulator.from("workspace_memberships").delete().eq("user_id", "usr_alice");
  assert.ok(deleteResult.error, "Deleting sole owner must fail");
  assert.equal(deleteResult.error.code, "23514");
  assert.match(deleteResult.error.message, /Ownership continuity violation/);

  // 2. Attempting to DEMOTE Alice to 'admin' -> rejected by trigger
  const demoteResult = emulator
    .from("workspace_memberships")
    .update({ role: "admin" })
    .eq("user_id", "usr_alice");
  assert.ok(demoteResult.error, "Demoting sole owner must fail");
  assert.equal(demoteResult.error.code, "23514");
  assert.match(demoteResult.error.message, /Ownership continuity violation/);

  // 3. Attempting to REVOKE Alice's status -> rejected by trigger
  const revokeResult = emulator
    .from("workspace_memberships")
    .update({ status: "revoked" })
    .eq("user_id", "usr_alice");
  assert.ok(revokeResult.error, "Revoking sole owner must fail");
  assert.equal(revokeResult.error.code, "23514");
  assert.match(revokeResult.error.message, /Ownership continuity violation/);

  // Direct SQL execution also triggers prevent_last_owner_removal
  assert.throws(
    () => {
      emulator.execSql(
        "UPDATE workspace_memberships SET role = 'admin' WHERE workspace_id = 'ws_alpha_01' AND user_id = 'usr_alice'",
      );
    },
    (err) => err.code === "23514" || err.message.includes("Ownership continuity violation"),
    "Direct SQL update demoting sole owner must fail",
  );

  // 4. Executing two-phase ownership transfer from Alice to Bob -> succeeds!
  const context = {
    actorId: "usr_alice",
    workspaceId: "ws_alpha_01",
    role: "owner",
    sessionObservation: new Date().toISOString(),
    authorityObservation: "test",
  };

  const transfer = executeOwnershipTransfer(emulator.rawDb, context, "usr_bob", "admin");
  assert.equal(transfer.success, true);

  // Verify Bob is now Owner and Alice is Admin
  const bobMember = emulator.rawDb
    .prepare("SELECT role, status FROM workspace_memberships WHERE workspace_id = 'ws_alpha_01' AND user_id = 'usr_bob'")
    .get();
  assert.equal(bobMember.role, "owner");

  const aliceMember = emulator.rawDb
    .prepare("SELECT role, status FROM workspace_memberships WHERE workspace_id = 'ws_alpha_01' AND user_id = 'usr_alice'")
    .get();
  assert.equal(aliceMember.role, "admin");

  // Audit event was generated
  const audit = emulator.rawDb
    .prepare("SELECT * FROM tenant_audit_events WHERE workspace_id = 'ws_alpha_01' AND action_type = 'owner_transferred'")
    .get();
  assert.ok(audit);
  assert.equal(audit.actor_id, "usr_alice");
});
