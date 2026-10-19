import test from "node:test";
import assert from "node:assert/strict";
import { fixture, createRecord } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";

test("foreign keys and optimistic revisions reject invalid local writes", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await assert.rejects(f.service.executeTransaction("ws-test-alpha", async (tx) => {
      await tx.persistEntity("_entity_example", { id: "child", workspaceId: "ws-test-alpha", parentId: "missing", expectedRevision: 0, dataPayload: "child" });
    }), /invalid_parent/);
    await createRecord(f.service, "ws-test-alpha", "record-1", "first");
    await assert.rejects(f.service.executeTransaction("ws-test-alpha", async (tx) => {
      await tx.persistEntity("_entity_example", { id: "record-1", workspaceId: "ws-test-alpha", expectedRevision: 42, dataPayload: "wrong" });
    }), /revision_conflict/);
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "entities")[0].data_payload, "first");
    assert.deepEqual(f.service.inspectForVerification("ws-test-alpha", "foreign_keys"), []);
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const direct = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    assert.equal(direct.db.pragma("foreign_keys", { simple: true }), 1);
    assert.throws(() => direct.db.prepare("INSERT INTO _entity_example (id, workspace_id, parent_id, revision, sync_state, data_payload, created_at, updated_at) VALUES ('bad', 'ws-test-alpha', 'missing', 1, 'synced', '{}', 'now', 'now')").run(), /FOREIGN KEY constraint failed/);
    direct.close();
  } finally { f.cleanup(); }
});
