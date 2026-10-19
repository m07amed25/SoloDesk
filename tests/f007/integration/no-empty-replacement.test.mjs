import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fixture, createRecord } from "../fixtures.mjs";

test("header corruption preserves the existing encrypted file byte-for-byte", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await createRecord(f.service, "ws-test-alpha", "record-1", "local unsynced work");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const paths = f.paths();
    const bytes = readFileSync(paths.database);
    bytes.fill(0, 0, 100);
    writeFileSync(paths.database, bytes);
    const before = readFileSync(paths.database);
    const state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.status, "recovery_required");
    assert.equal(state.recoveryDetails.reasonCode, "integrity_failed");
    assert.equal(statSync(paths.database).size, before.length);
    assert.deepEqual(readFileSync(paths.database), before);
  } finally { f.cleanup(); }
});
