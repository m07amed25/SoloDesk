import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import { logAuditEvent } from "../../supabase/functions/_shared/audit-service.ts";

test("A-08: Auditable membership and role modifications write immutable append-only records with redacted diffs", () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // 1. Log a role change audit event
  const event = logAuditEvent(emulator.rawDb, {
    workspaceId: "ws_alpha_01",
    actorId: "usr_alice",
    actionType: "role_changed",
    targetResourceType: "workspace_memberships",
    targetResourceId: "usr_bob",
    changeDiff: {
      oldRole: "contributor",
      newRole: "manager",
      invitation_token: "secret_token_123", // Must be redacted
    },
  });

  assert.ok(event.id.startsWith("aud_"));
  assert.equal(
    event.changeDiff.invitation_token,
    "[REDACTED]",
    "Sensitive tokens must be redacted in audit diff",
  );
  assert.equal(event.changeDiff.newRole, "manager");

  // 2. Query tenant audit events as Admin/Owner (Alice) -> allowed
  const rows = emulator.from("tenant_audit_events").select("*").all();
  assert.ok(rows.data.length >= 1, "Alice must see audit events in Alpha");
  const recorded = rows.data.find((r) => r.id === event.id);
  assert.ok(recorded, "Audit record must be present");
  assert.equal(recorded.actor_id, "usr_alice");

  // 3. Attempting direct UPDATE or DELETE on audit table is denied
  // Even admins cannot rewrite history!
  assert.throws(() => {
    emulator.execSql(
      "UPDATE tenant_audit_events SET change_diff = '{}' WHERE id = ?",
      [event.id],
    );
  }, "Direct modification of audit trail is disallowed or table is append-only");

  // 4. Querying audit events as Contributor (Bob) -> denied / empty by RLS
  emulator.setAuth("usr_bob");
  const bobAudit = emulator.from("tenant_audit_events").select("*").all();
  assert.equal(
    bobAudit.data.length,
    0,
    "Contributor must NOT be able to read audit events under RLS",
  );

  // 5. Querying audit events from Workspace Beta as Alice -> returns 0 rows (zero leakage)
  emulator.setAuth("usr_alice");
  const betaAudit = emulator
    .from("tenant_audit_events")
    .select("*")
    .eq("workspace_id", "ws_beta_02");
  assert.equal(betaAudit.data.length, 0, "Alice cannot view Beta audit events");
});
