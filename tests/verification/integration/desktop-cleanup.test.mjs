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
test("owned leftover descendant is detected and terminated", async () => {
  if (process.platform === "win32") return; // Windows tree termination is observed by its separate native producer.
  const r = await runProcess(
    process.execPath,
    [
      "-e",
      "const {spawn}=require('node:child_process');spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});process.exit(0)",
    ],
    { timeout: 1000 },
  );
  assert.ok(["leftover-owned-process", "cleanup-failed"].includes(r.reason));
  assert.ok(r.elapsed_ms < 21000);
});
test("desktop refuses relabeled native targets and reports unavailable launch prerequisite", async () => {
  const other = process.platform === "linux" ? "windows-x64" : "linux-x64";
  const r = await runProcess(
    process.execPath,
    ["tooling/verification/desktop.mjs", other],
    { cwd: process.cwd(), timeout: 1000 },
  );
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /native-target-unavailable/);
});
