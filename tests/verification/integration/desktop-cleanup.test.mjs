import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { runProcess } from "../../../tooling/verification/run-suite.mjs";
test("owned timeout tree is cleaned while unrelated process survives", async () => {
  const control = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    stdio: "ignore",
  });
  try {
    const result = await runProcess(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      { timeout: 50 },
    );
    assert.equal(result.reason, "timed-out");
    assert.equal(control.exitCode, null);
  } finally {
    control.kill();
  }
});
test("missing executable is blocking unavailable", async () => {
  const r = await runProcess("F002-no-such-executable", [], { timeout: 100 });
  assert.equal(r.reason, "unavailable");
});
test("bootstrap rejects wrong profile before launching production entry", async () => {
  const r = await runProcess(
    process.execPath,
    ["tooling/verification/electron-bootstrap.cjs"],
    {
      cwd: process.cwd(),
      timeout: 1000,
      env: {
        ...process.env,
        F002_ROOT: process.cwd(),
        F002_USER_DATA: "/tmp/wrong",
        F002_SESSION_DATA: "/tmp/wrong",
      },
    },
  );
  assert.notEqual(r.code, 0);
});
