import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import { executeUniformTenantBatch } from "../../supabase/functions/_shared/batch-transaction.ts";

test("A-15: Uniform tenant attribution across multi-entity transactions rolls back completely on mismatch", () => {
  const emulator = seedTenants(createF008Emulator());

  const context = {
    actorId: "usr_alice",
    workspaceId: "ws_alpha_01",
    role: "owner",
    sessionObservation: new Date().toISOString(),
    authorityObservation: "test",
  };

  // 1. Valid batch where 100% of entities belong to ws_alpha_01 -> succeeds
  const validBatch = [
    {
      table: "clients",
      data: {
        workspace_id: "ws_alpha_01",
        id: "cli_batch_01",
        name: "Batch Client 1",
        currency: "USD",
        status: "active",
      },
    },
    {
      table: "projects",
      data: {
        workspace_id: "ws_alpha_01",
        id: "prj_batch_01",
        client_id: "cli_batch_01",
        name: "Batch Project 1",
        status: "active",
      },
    },
    {
      table: "tasks",
      data: {
        workspace_id: "ws_alpha_01",
        id: "tsk_batch_01",
        project_id: "prj_batch_01",
        title: "Batch Task 1",
        status: "todo",
      },
    },
  ];

  const result = executeUniformTenantBatch(emulator.rawDb, context, validBatch);
  assert.equal(result.success, true);
  assert.equal(result.executedCount, 3);

  // Verify all 3 were persisted in Alpha
  const client = emulator.rawDb
    .prepare("SELECT * FROM clients WHERE id = 'cli_batch_01'")
    .get();
  assert.ok(client);
  const project = emulator.rawDb
    .prepare("SELECT * FROM projects WHERE id = 'prj_batch_01'")
    .get();
  assert.ok(project);
  const task = emulator.rawDb
    .prepare("SELECT * FROM tasks WHERE id = 'tsk_batch_01'")
    .get();
  assert.ok(task);

  // 2. Mismatched batch: one entity has foreign workspace_id (ws_beta_02)
  const poisonBatch = [
    {
      table: "clients",
      data: {
        workspace_id: "ws_alpha_01",
        id: "cli_batch_rollback",
        name: "Rollback Client",
        currency: "USD",
        status: "active",
      },
    },
    {
      table: "tasks",
      data: {
        workspace_id: "ws_beta_02", // MISMATCHED TENANT!
        id: "tsk_batch_rollback",
        project_id: "prj_beta_01",
        title: "Sneaky Foreign Task",
        status: "todo",
      },
    },
  ];

  // Batch execution must be rejected before any write or rolled back completely
  assert.throws(
    () => {
      executeUniformTenantBatch(emulator.rawDb, context, poisonBatch);
    },
    (err) =>
      err.statusCode === 403 ||
      err.message.includes("Cross-tenant batch transaction rejected"),
    "Batch with mismatched tenant attribution must be rejected",
  );

  // Verify rollback: cli_batch_rollback was NOT inserted
  const rollbackClient = emulator.rawDb
    .prepare("SELECT * FROM clients WHERE id = 'cli_batch_rollback'")
    .get();
  assert.equal(
    rollbackClient,
    undefined,
    "First entity in mismatched batch must be rolled back completely",
  );

  const rollbackTask = emulator.rawDb
    .prepare("SELECT * FROM tasks WHERE id = 'tsk_batch_rollback'")
    .get();
  assert.equal(rollbackTask, undefined, "Poison task must not exist");
});
