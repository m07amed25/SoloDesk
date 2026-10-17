import test from "node:test";
import assert from "node:assert/strict";
import {
  runProcess,
  testCounts,
} from "../../../tooling/verification/run-suite.mjs";
test("independent TAP counts accept real assertions, not zero or wrapper-only", () => {
  assert.equal(
    testCounts("# tests 2\n# pass 2\n# fail 0\n# skipped 0\n# todo 0\n", 2)
      .executed,
    2,
  );
  assert.throws(() => testCounts("# tests 0\n# pass 0\n# fail 0", 1), /suite/);
  assert.throws(() => testCounts("partial", 1), /suite/);
  assert.throws(
    () => testCounts("# tests 1\n# pass 1\n# fail 0\n# skipped 1", 1),
    /suite/,
  );
});
test("actual child success and failure observed", async () => {
  assert.equal(
    (
      await runProcess(process.execPath, ["-e", "process.exit(0)"], {
        cwd: process.cwd(),
        timeout: 2000,
      })
    ).code,
    0,
  );
  assert.equal(
    (
      await runProcess(process.execPath, ["-e", "process.exit(7)"], {
        cwd: process.cwd(),
        timeout: 2000,
      })
    ).code,
    7,
  );
});
test("bounded deadline and sensitive output", async () => {
  const r = await runProcess(
    process.execPath,
    ["-e", "console.log('F002_SECRET_synthetic');setInterval(()=>{},1000)"],
    { cwd: process.cwd(), timeout: 100 },
  );
  assert.equal(r.reason, "timed-out");
  assert.ok(!r.stdout.includes("F002_SECRET_"));
});
