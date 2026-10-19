import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-14: Orphan prevention and cascading delete boundaries remain strictly within tenant graph", () => {
  const emulator = seedTenants(createF008Emulator());

  // 1. Attempting to delete a client with existing projects is RESTRICTED (ON DELETE RESTRICT)
  assert.throws(
    () => {
      emulator.execSql(
        "DELETE FROM clients WHERE workspace_id = 'ws_alpha_01' AND id = 'cli_alpha_01'",
      );
    },
    (err) => err.code === "23503" || err.message.includes("FOREIGN KEY"),
    "Deleting client with active projects must fail with foreign_key_violation (23503)",
  );

  // 2. Attempting to delete a task with active time entries is RESTRICTED (ON DELETE RESTRICT)
  assert.throws(
    () => {
      emulator.execSql(
        "DELETE FROM tasks WHERE workspace_id = 'ws_alpha_01' AND id = 'tsk_alpha_01'",
      );
    },
    (err) => err.code === "23503" || err.message.includes("FOREIGN KEY"),
    "Deleting task with active time entries must fail with RESTRICT",
  );

  // 3. Cascading delete on projects: Create an isolated project and tasks in Alpha
  emulator.rawDb
    .prepare(
      `
    INSERT INTO projects (workspace_id, id, client_id, name, status)
    VALUES ('ws_alpha_01', 'prj_cascade_demo', 'cli_alpha_01', 'Cascade Demo', 'active')
  `,
    )
    .run();

  emulator.rawDb
    .prepare(
      `
    INSERT INTO tasks (workspace_id, id, project_id, title, status)
    VALUES ('ws_alpha_01', 'tsk_cascade_child', 'prj_cascade_demo', 'Child Task', 'todo')
  `,
    )
    .run();

  // Verify child task exists
  const taskBefore = emulator.rawDb
    .prepare(
      "SELECT * FROM tasks WHERE workspace_id = 'ws_alpha_01' AND id = 'tsk_cascade_child'",
    )
    .get();
  assert.ok(taskBefore, "Task must exist before project delete");

  // Delete project prj_cascade_demo
  emulator.rawDb
    .prepare(
      "DELETE FROM projects WHERE workspace_id = 'ws_alpha_01' AND id = 'prj_cascade_demo'",
    )
    .run();

  // Verify Alpha child task was cascaded
  const taskAfter = emulator.rawDb
    .prepare(
      "SELECT * FROM tasks WHERE workspace_id = 'ws_alpha_01' AND id = 'tsk_cascade_child'",
    )
    .get();
  assert.equal(taskAfter, undefined, "Alpha task must be deleted by cascade");

  // Verify Beta tasks (tsk_beta_01) remain 100% untouched
  const betaTask = emulator.rawDb
    .prepare(
      "SELECT * FROM tasks WHERE workspace_id = 'ws_beta_02' AND id = 'tsk_beta_01'",
    )
    .get();
  assert.ok(
    betaTask,
    "Beta task must NOT be affected by Alpha project deletion",
  );
  assert.equal(betaTask.title, "Deploy schema");
});
