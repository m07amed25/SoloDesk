import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildFixtures } from "../../../tooling/f003/build.mjs";
import {
  probe,
  runtimeExecutable,
  validateObservation,
} from "../../../tooling/f003/runtime-probe.mjs";
import {
  runProcess,
  childEnvironment,
  testCounts,
} from "../../../tooling/verification/run-suite.mjs";
import { pack } from "../fixtures/runtime-pack.mjs";
const root = process.cwd();
test("real Node, embedded Electron and permission-free Deno agree on every fixture", async () => {
  const built = await buildFixtures(root),
    results = [];
  for (const kind of ["node", "electron", "deno"]) {
    const result = await probe(kind, built, root);
    assert.equal(result.executed, pack.count);
    results.push(result);
  }
  assert.deepEqual(results[0].observations, results[1].observations);
  assert.deepEqual(results[0].observations, results[2].observations);
  console.log(
    JSON.stringify({
      bundle_sha256: built.sha256,
      owned: built.owned,
      runtimes: results.map((v) => ({
        engine: v.engine,
        version: v.version,
        node: v.node,
        executed: v.executed,
        passed: v.passed,
      })),
    }),
  );
});
test("missing runtime, empty fixtures, wrong version and stale bundle cannot pass", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "f003-absent-"));
  try {
    assert.throws(() => runtimeExecutable("deno", temp));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  for (const value of [
    {},
    {
      engine: "node",
      pack: pack.id,
      executed: 0,
      passed: 0,
      failed: 0,
      observations: [],
    },
    {
      engine: "node",
      pack: pack.id,
      executed: 1,
      passed: 1,
      failed: 0,
      observations: [{ id: "invented", passed: true }],
    },
  ])
    assert.throws(() => validateObservation(value, "node"));
  assert.throws(
    () =>
      validateObservation(
        {
          engine: "node",
          version: "wrong",
          pack: pack.id,
          executed: pack.count,
          passed: pack.count,
          failed: 0,
          observations: pack.ids.map((id) => ({ id, passed: true })),
        },
        "node",
        "24.21.0",
      ),
    /runtime-version/,
  );
  const built = await buildFixtures(root);
  fs.appendFileSync(built.bundle, "\n// stale");
  await assert.rejects(probe("node", built, root), /stale-bundle/);
  assert.throws(() => testCounts("# tests 0\n# pass 0\n# fail 0", 1));
  assert.throws(() =>
    testCounts("ok 1 - nested\n# tests 2\n# pass 1\n# fail 1", 1),
  );
});
test("permission demand and bounded child timeout block runtime success", async () => {
  const pin = runtimeExecutable("deno", root),
    env = childEnvironment();
  const built = await buildFixtures(root),
    entry = path.join(root, built.owned, "permission.mjs");
  fs.writeFileSync(entry, 'Deno.readTextFileSync("package.json")');
  const denied = await runProcess(
    pin.executable,
    ["run", "--no-config", "--no-lock", "--cached-only", "--no-prompt", entry],
    { cwd: root, env, timeout: 10000 },
  );
  assert.notEqual(denied.code, 0);
  assert.match(denied.stderr, /permission|Requires read access/i);
  const timeout = await runProcess(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    { cwd: root, env, timeout: 100 },
  );
  assert.equal(timeout.reason, "timed-out");
  const captured = await runProcess(
    process.execPath,
    ["-e", 'console.log("F003-stdout")'],
    { cwd: root, env, timeout: 1000 },
  );
  assert.equal(captured.stdout.trim(), "F003-stdout");
});
