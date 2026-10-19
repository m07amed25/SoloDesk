import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-04: Workspace identifier immutability trigger blocks cross-tenant re-parenting", () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // Attempting to mutate workspace_id on a client record from ws_alpha_01 to ws_beta_02
  const updateResult = emulator
    .from("clients")
    .update({ workspace_id: "ws_beta_02" })
    .eq("id", "cli_alpha_01");
  assert.ok(updateResult.error, "Mutation of workspace_id must fail");
  assert.equal(
    updateResult.error.code,
    "23514",
    "Must throw SQLSTATE 23514 integrity_constraint_violation",
  );
  assert.match(updateResult.error.message, /Immutable workspace_id/);

  // Attempting on task
  const updateTask = emulator
    .from("tasks")
    .update({ workspace_id: "ws_beta_02" })
    .eq("id", "tsk_alpha_01");
  assert.ok(updateTask.error, "Mutation of workspace_id on task must fail");
  assert.equal(updateTask.error.code, "23514");

  // Attempting on membership
  const updateMember = emulator
    .from("workspace_memberships")
    .update({ workspace_id: "ws_beta_02" })
    .eq("user_id", "usr_bob");
  assert.ok(
    updateMember.error,
    "Mutation of workspace_id on membership must fail",
  );
  assert.equal(updateMember.error.code, "23514");

  // Direct SQL update attempt also fails
  assert.throws(
    () => {
      emulator.execSql(
        "UPDATE clients SET workspace_id = 'ws_beta_02' WHERE id = 'cli_alpha_01'",
      );
    },
    (err) => {
      return (
        err.code === "23514" || err.message.includes("Immutable workspace_id")
      );
    },
    "Direct SQL update of workspace_id must trigger exception",
  );

  // Verify that the record remains safely in ws_alpha_01
  const verify = emulator.from("clients").select("*").eq("id", "cli_alpha_01");
  assert.equal(
    verify.data[0].workspace_id,
    "ws_alpha_01",
    "Record must remain in Workspace Alpha",
  );
});
