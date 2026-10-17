import { test } from "node:test";
import assert from "node:assert/strict";
import {
  childEnvironment,
  runProcess,
} from "../../../tooling/verification/run-suite.mjs";
test("candidate child receives no protected credentials and sentinel output is redacted", async () => {
  const old = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "F002_SECRET_sentinel";
  try {
    const env = childEnvironment();
    assert.equal(env.GITHUB_TOKEN, undefined);
    assert.equal(env.GH_TOKEN, undefined);
    const r = await runProcess(
      process.execPath,
      [
        "-e",
        "console.log(JSON.stringify({token:process.env.GITHUB_TOKEN,secret:'F002_SECRET_sentinel'}))",
      ],
      { env, timeout: 1000 },
    );
    assert.equal(r.code, 0);
    assert.ok(!r.stdout.includes("F002_SECRET_"));
  } finally {
    if (old === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = old;
  }
});
