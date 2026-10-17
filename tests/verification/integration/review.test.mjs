import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePack } from "../../../tooling/verification/delivery.mjs";
test("incomplete delivery pack cannot pass or impersonate F001 evidence", () => {
  assert.throws(() =>
    validatePack({ schema: "solodesk.delivery.evidence", schema_version: 1 }),
  );
  assert.throws(() =>
    validatePack({
      schema: "solodesk.verification.pack",
      schema_version: 1,
      phase: "F002",
      requirements: [],
      acceptance: [],
      success: [],
      observations: [],
      findings: [],
      automated_ready: false,
      owner: { status: "pending" },
    }),
  );
});
test("synthetic later-feature entry actually passes and deliberate assertion defect actually fails", async () => {
  const { runProcess, childEnvironment, testCounts } =
    await import("../../../tooling/verification/run-suite.mjs");
  const args = [
    "--test",
    "--test-reporter=tap",
    "tests/verification/fixtures/enrollment-demo.mjs",
  ];
  const pass = await runProcess(process.execPath, args, {
    cwd: process.cwd(),
    timeout: 30000,
  });
  assert.equal(pass.code, 0);
  assert.equal(testCounts(pass.stdout, 2).executed, 2);
  const fail = await runProcess(process.execPath, args, {
    cwd: process.cwd(),
    timeout: 30000,
    env: childEnvironment({ F002_ENROLLMENT_DEFECT: "1" }),
  });
  assert.notEqual(fail.code, 0);
  assert.match(fail.stdout, /not ok/);
});
