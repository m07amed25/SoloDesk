import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fixture } from "../fixtures.mjs";

test("SIGKILL before commit rolls back both rows; after commit retains both", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    for (const mode of ["before", "after"]) {
      const result = spawnSync(process.execPath, ["tooling/f007/crash-worker.mjs", f.root, "ws-test-alpha", mode], {
        cwd: process.cwd(),
        env: { ...process.env, F007_SYNTHETIC_KEY: f.key.toString("hex") },
        encoding: "utf8",
      });
      assert.equal(result.signal, "SIGKILL", result.stderr);
      assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
      const entities = f.service.inspectForVerification("ws-test-alpha", "entities");
      const outbox = f.service.inspectForVerification("ws-test-alpha", "outbox");
      assert.equal(entities.some((row) => row.id === `crash-${mode}`), mode === "after");
      assert.equal(outbox.some((row) => row.operation_id === `op-crash-${mode}`), mode === "after");
      assert.equal(entities.length, outbox.length);
      await f.service.closeWorkspaceStore("ws-test-alpha");
    }
  } finally { f.cleanup(); }
});
