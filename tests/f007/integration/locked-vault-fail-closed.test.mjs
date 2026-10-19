import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fixture, createRecord } from "../fixtures.mjs";

test("unavailable vault and missing envelope deny without replacement", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await createRecord(f.service, "ws-test-alpha", "record-1", "unsynced");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const before = readFileSync(f.paths().database);
    f.block();
    let state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "vault_locked");
    f.block(false);
    rmSync(f.paths().envelope);
    state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "key_missing");
    assert.deepEqual(readFileSync(f.paths().database), before);
  } finally { f.cleanup(); }
});

test("a failed first key creation leaves no stranded empty workspace", async () => {
  const f = fixture();
  try {
    const create = f.provider.create;
    f.provider.create = async () => { throw new Error("vault_locked"); };
    const state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "vault_locked");
    assert.equal(existsSync(f.paths().directory), false);
    f.provider.create = create;
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
  } finally { f.cleanup(); }
});
