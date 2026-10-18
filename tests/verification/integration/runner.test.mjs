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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCheck } from "../../../tooling/verification/run-suite.mjs";
import { aggregate } from "../../../tooling/verification/aggregate.mjs";
import { context } from "../fixtures/records.mjs";
test("real enrolled F003 entry failure, empty entry and missing entry block aggregation; repair passes", async () => {
  const enrolled = JSON.parse(
    fs.readFileSync("verification/suites.v1.json", "utf8"),
  ).checks.find((c) => c.id === "F003:runtime");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "f003-producer-"));
  const entry = path.join(temp, enrolled.entry_files[0]);
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  const selected = {
    context_ref: context().id,
    checks: [
      {
        check_id: enrolled.id,
        selected: true,
        group: "baseline",
        expected_argv: enrolled.argv,
        min_tests: 3,
      },
    ],
    findings: [],
  };
  try {
    for (const source of [
      "import test from 'node:test';import assert from 'node:assert/strict';test('real failing assertion',()=>assert.equal(1,2));",
      "",
      null,
    ]) {
      if (source === null) fs.rmSync(entry);
      else fs.writeFileSync(entry, source);
      const report = await runCheck(temp, enrolled, context(), "f003-trial");
      assert.notEqual(report.status, "passed");
      assert.equal(
        aggregate(context(), selected, [report]).automated_ready,
        false,
      );
    }
    fs.writeFileSync(
      entry,
      "import test from 'node:test';import assert from 'node:assert/strict';for(const n of [1,2,3])test('repaired '+n,()=>assert.ok(n>0));",
    );
    const repaired = await runCheck(
      temp,
      enrolled,
      context(),
      "f003-trial-repaired",
    );
    assert.equal(repaired.status, "passed");
    assert.equal(repaired.counts.executed, 3);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
