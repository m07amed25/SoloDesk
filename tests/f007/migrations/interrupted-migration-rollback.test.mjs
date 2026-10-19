import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";
import { createSnapshot } from "../../../app/main/persistence/snapshot-manager.ts";
import { steps, addQualificationTag } from "../migration-step.mjs";

test("in-progress migration restores prior encrypted snapshot and marks rollback", async () => {
  const f = fixture({ steps });
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const db = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    const snapshot = await createSnapshot(db, f.paths(), 1, 2);
    db.db.prepare("INSERT INTO _migration_journal (step_id, from_version, to_version, status, started_at, snapshot_path, checksum) VALUES (?, 1, 2, 'in_progress', ?, ?, ?)").run(addQualificationTag.name, new Date().toISOString(), snapshot.file, addQualificationTag.checksum);
    db.db.exec("ALTER TABLE _entity_example ADD COLUMN interrupted_column TEXT");
    db.close();
    const status = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(status.recoveryDetails.reasonCode, "interrupted_migration");
    const restored = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    assert.equal(restored.db.pragma("table_info(_entity_example)").some((col) => col.name === "interrupted_column"), false);
    assert.equal(restored.db.prepare("SELECT current_version FROM _schema_version").get().current_version, 1);
    assert.equal(restored.db.prepare("SELECT status FROM _migration_journal WHERE step_id = ?").get(addQualificationTag.name).status, "rolled_back");
    restored.close();
  } finally { f.cleanup(); }
});

test("a failed migration step rolls back to the verified prior snapshot", async () => {
  const failed = {
    ...addQualificationTag,
    name: "0002_intentional_failure",
    up(db) {
      db.exec("ALTER TABLE _entity_example ADD COLUMN failed_column TEXT");
      throw new Error("injected_failure");
    },
  };
  const f = fixture({ steps: [steps[0], failed] });
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "interrupted_migration");
    const restored = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    assert.equal(restored.db.pragma("table_info(_entity_example)").some((column) => column.name === "failed_column"), false);
    assert.equal(restored.db.prepare("SELECT status FROM _migration_journal WHERE step_id = ?").get(failed.name).status, "rolled_back");
    restored.close();
  } finally { f.cleanup(); }
});
