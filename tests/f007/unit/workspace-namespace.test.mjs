import test from "node:test";
import assert from "node:assert/strict";
import { fixture, createRecord } from "../fixtures.mjs";
import { workspacePaths } from "../../../app/main/persistence/workspace-storage-paths.ts";

test("profile and workspace namespaces are physically separate and validate IDs", async () => {
  const f = fixture();
  try {
    assert.notEqual(f.paths("ws-test-alpha").database, f.paths("ws-test-beta").database);
    assert.notEqual(f.paths().database, workspacePaths(f.root, "other-profile", "ws-test-alpha").database);
    assert.throws(() => f.paths("../escape"), /invalid_namespace/);
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    await createRecord(f.service, "ws-test-alpha", "alpha-1", "ALPHA-SECRET-9941");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    assert.equal((await f.service.openWorkspaceStore("ws-test-beta")).status, "ready");
    assert.deepEqual(f.service.inspectForVerification("ws-test-beta", "entities"), []);
    await f.service.closeWorkspaceStore("ws-test-beta");
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "entities").length, 1);
  } finally { f.cleanup(); }
});
