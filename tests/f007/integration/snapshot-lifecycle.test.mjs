import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { fixture } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";
import { createSnapshot, verifySnapshot } from "../../../app/main/persistence/snapshot-manager.ts";

test("pre-migration snapshot is encrypted, byte-verified and owner-only", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const connection = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    const snapshot = await createSnapshot(connection, f.paths(), 1, 2);
    assert.deepEqual(await verifySnapshot(f.paths(), snapshot.file), snapshot);
    assert.equal(statSync(snapshot.file).mode & 0o777, 0o600);
    assert.equal(snapshot.bytes, statSync(f.paths().database).size);
    connection.close();
  } finally { f.cleanup(); }
});
