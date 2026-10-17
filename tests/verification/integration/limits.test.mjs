import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runProcess } from "../../../tooling/verification/run-suite.mjs";
import { normalizeProvider } from "../../../tooling/verification/inspect-provider.mjs";
import { context } from "../fixtures/records.mjs";
test("declared bounds and zero-retry/cache settings remain finite", () => {
  const p = JSON.parse(fs.readFileSync("verification/policy.v1.json", "utf8"));
  assert.equal(p.limits.local_ms, 2700000);
  assert.equal(p.limits.hosted_ms, 3000000);
  assert.equal(p.limits.input_bytes, 2097152);
  assert.equal(p.limits.cumulative_bytes, 33554432);
  const workflow = fs.readFileSync(".github/workflows/verify.yml", "utf8");
  assert.ok(!workflow.includes("actions/cache"));
  assert.match(
    fs.readFileSync("playwright.config.mjs", "utf8"),
    /retries:\s*0/,
  );
});
test("oversize child output cannot silently pass", async () => {
  const r = await runProcess(
    process.execPath,
    ["-e", "console.log('x'.repeat(4096));setInterval(()=>{},1000)"],
    { maxBytes: 128, timeout: 1000 },
  );
  assert.equal(r.reason, "output-limit");
  assert.ok(r.stdout.length < 128);
});
test("overdue incomplete attempt is blocked without imposing old completed run TTL", () => {
  const c = context();
  const run = {
    id: 1,
    run_attempt: 1,
    head_sha: c.tested_sha,
    status: "in_progress",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:01:00Z",
  };
  assert.throws(
    () => normalizeProvider(run, [], null, c, []),
    /execution-budget/,
  );
  assert.doesNotThrow(() =>
    normalizeProvider({ ...run, status: "completed" }, [], null, c, []),
  );
});
test("coordinator reserves cleanup and starts no work after its deadline", async () => {
  const { executeGroup } =
    await import("../../../tooling/verification/run-suite.mjs");
  await assert.rejects(
    () =>
      executeGroup(process.cwd(), "baseline", context(), {
        deadline: Date.now() - 1,
      }),
    /coordinator-timeout/,
  );
});
test("unsupported cross-run cache request rejected before any install", async () => {
  const { setup } = await import("../../../tooling/verification/setup.mjs");
  assert.throws(() => setup(process.cwd(), { cache: true }), /cache-disabled/);
});
