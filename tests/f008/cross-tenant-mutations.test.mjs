import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-02: Denied cross-workspace mutations throw 42501 insufficient_privilege with 0 rows modified", () => {
  const emulator = seedTenants(createF008Emulator());

  // Authenticate as Alice (member of Alpha only)
  emulator.setAuth("usr_alice");

  // 1. Attempting to INSERT a task directly targeting Workspace Beta
  const insertResult = emulator.from("tasks").insert({
    workspace_id: "ws_beta_02",
    id: "tsk_cross_poison",
    project_id: "prj_beta_01",
    title: "Poison task",
    status: "todo",
  });

  assert.ok(insertResult.error, "Cross-tenant INSERT must fail");
  assert.equal(
    insertResult.error.code,
    "42501",
    "Must fail with SQLSTATE 42501 insufficient_privilege",
  );

  // Verify zero rows inserted in Beta
  emulator.setAuth("usr_charlie");
  const checkTask = emulator
    .from("tasks")
    .select("*")
    .eq("id", "tsk_cross_poison");
  assert.equal(
    checkTask.data.length,
    0,
    "Zero rows must be inserted into Beta",
  );

  // 2. Attempting to UPDATE a record in Workspace Beta while authenticated as Alice
  emulator.setAuth("usr_alice");
  const updateResult = emulator
    .from("clients")
    .update({ name: "Hacked by Alice" })
    .eq("id", "cli_beta_01");
  assert.ok(updateResult.error, "Cross-tenant UPDATE must fail");
  assert.equal(
    updateResult.error.code,
    "42501",
    "Must fail with SQLSTATE 42501",
  );

  // Verify Beta client remains unmutated
  emulator.setAuth("usr_charlie");
  const checkClient = emulator
    .from("clients")
    .select("*")
    .eq("id", "cli_beta_01");
  assert.equal(
    checkClient.data[0].name,
    "Beta Industries",
    "Beta client name must not be modified",
  );

  // 3. Attempting to DELETE a record in Workspace Beta while authenticated as Alice
  emulator.setAuth("usr_alice");
  const deleteResult = emulator.from("tasks").delete().eq("id", "tsk_beta_01");
  assert.ok(deleteResult.error, "Cross-tenant DELETE must fail");
  assert.equal(
    deleteResult.error.code,
    "42501",
    "Must fail with SQLSTATE 42501",
  );

  // Verify Beta task still exists
  emulator.setAuth("usr_charlie");
  const checkBetaTask = emulator
    .from("tasks")
    .select("*")
    .eq("id", "tsk_beta_01");
  assert.equal(checkBetaTask.data.length, 1, "Beta task must not be deleted");
});
