import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";

test("future schema version refuses to open without downgrading data", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const connection = DatabaseConnection.open(f.paths().database, Buffer.from(f.key), true);
    connection.db.prepare("UPDATE _schema_version SET current_version = 99").run();
    connection.close();
    const before = readFileSync(f.paths().database);
    const state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "unsupported_future_version");
    assert.deepEqual(readFileSync(f.paths().database), before);
  } finally { f.cleanup(); }
});
