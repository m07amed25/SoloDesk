import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fixture, createRecord } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";

test("SQLCipher database and WAL reveal no fixture plaintext", async () => {
  const f = fixture();
  try {
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    await createRecord(f.service, "ws-test-alpha", "alpha-1", "ALPHA-SECRET-9941 مهمة سرية جداً");
    const paths = f.paths();
    for (const file of [paths.database, paths.wal]) {
      if (!existsSync(file)) continue;
      const bytes = readFileSync(file);
      for (const marker of ["ALPHA-SECRET-9941", "مهمة سرية جداً", "SQLite format 3"])
        assert.equal(bytes.includes(Buffer.from(marker)), false, `${file} leaked ${marker}`);
    }
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const direct = DatabaseConnection.open(paths.database, Buffer.from(f.key), true);
    assert.equal(direct.db.pragma("temp_store", { simple: true }), 2);
    direct.db.exec("CREATE TEMP TABLE transient_secret (body TEXT NOT NULL)");
    direct.db.prepare("INSERT INTO transient_secret VALUES (?)").run("TEMP-SECRET-6612");
    for (const file of [paths.database, paths.wal])
      if (existsSync(file)) assert.equal(readFileSync(file).includes(Buffer.from("TEMP-SECRET-6612")), false);
    direct.close();
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "entities").length, 1);
  } finally { f.cleanup(); }
});
