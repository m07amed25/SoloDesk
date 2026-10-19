import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-13: Composite foreign key constraints prevent cross-tenant pointer poisoning (SQLSTATE 23503)", () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // Attempting to insert a project in Alpha (ws_alpha_01) referencing Beta's client (cli_beta_01)
  // Even if RLS was bypassed, the engine-level composite constraint (workspace_id, client_id) rejects it!
  const crossProjectInsert = emulator.from("projects").insert({
    workspace_id: "ws_alpha_01",
    id: "prj_poison_alpha_beta",
    client_id: "cli_beta_01", // Belongs to ws_beta_02!
    name: "Poisoned Cross-Tenant Project",
    status: "active",
  });

  assert.ok(
    crossProjectInsert.error,
    "Cross-tenant composite FK insert must fail",
  );
  assert.equal(
    crossProjectInsert.error.code,
    "23503",
    "Must fail with SQLSTATE 23503 foreign_key_violation",
  );

  // Direct SQL execution also triggers composite FK violation
  assert.throws(
    () => {
      emulator.execSql(`
        INSERT INTO projects (workspace_id, id, client_id, name, status)
        VALUES ('ws_alpha_01', 'prj_raw_poison', 'cli_beta_01', 'Raw Cross-Tenant', 'active')
      `);
    },
    (err) => err.code === "23503",
    "Direct raw SQL inserting cross-tenant pointer must trigger 23503",
  );

  // Attempting to link a task in Alpha to a project in Beta
  assert.throws(
    () => {
      emulator.execSql(`
        INSERT INTO tasks (workspace_id, id, project_id, title, status)
        VALUES ('ws_alpha_01', 'tsk_cross_project', 'prj_beta_01', 'Cross Task', 'todo')
      `);
    },
    (err) => err.code === "23503",
    "Task cross-referencing Beta project must throw 23503",
  );

  // Attempting to link a time entry in Alpha to a task in Beta
  assert.throws(
    () => {
      emulator.execSql(`
        INSERT INTO time_entries (workspace_id, id, task_id, user_id, duration_seconds, work_date, billable, status)
        VALUES ('ws_alpha_01', 'tim_cross_entry', 'tsk_beta_01', 'usr_alice', 1800, '2026-10-19', 1, 'draft')
      `);
    },
    (err) => err.code === "23503",
    "Time entry cross-referencing Beta task must throw 23503",
  );
});
