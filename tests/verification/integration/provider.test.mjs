import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProvider } from "../../../tooling/verification/inspect-provider.mjs";
import { context, shaA, shaB, shaC } from "../fixtures/records.mjs";
const run = () => ({
  id: 42,
  run_attempt: 1,
  head_sha: shaA,
  event: "pull_request",
  path: ".github/workflows/verify.yml",
  status: "completed",
  created_at: "2026-10-18T00:00:00Z",
  updated_at: "2026-10-18T00:01:00Z",
});
test("head and merge subject kept distinct", () => {
  const p = normalizeProvider(
    run(),
    [{ id: 1, name: "F002 / baseline", conclusion: "success" }],
    { head: { sha: shaA }, base: { sha: shaB } },
    context(),
    [],
  );
  assert.equal(p.current_head, shaA);
  assert.equal(p.tested_sha, shaC);
  assert.equal(p.authenticated, true);
});
test("changed head/base and invalid association rejected", () => {
  assert.throws(
    () =>
      normalizeProvider(
        run(),
        [],
        { head: { sha: "d".repeat(40) }, base: { sha: shaB } },
        context(),
        [],
      ),
    /stale/,
  );
  assert.throws(
    () =>
      normalizeProvider(
        { ...run(), head_sha: "e".repeat(40) },
        [],
        { head: { sha: shaA }, base: { sha: shaB } },
        context(),
        [],
      ),
    /association/,
  );
});
test("execution duration differs from late review freshness", () => {
  assert.doesNotThrow(() =>
    normalizeProvider(
      run(),
      [],
      { head: { sha: shaA }, base: { sha: shaB } },
      context(),
      [],
    ),
  );
  assert.throws(
    () =>
      normalizeProvider(
        { ...run(), updated_at: "2026-10-18T02:00:00Z" },
        [],
        { head: { sha: shaA }, base: { sha: shaB } },
        context(),
        [],
      ),
    /budget/,
  );
});
test("a later rerun uses attempt start rather than original run creation", () => {
  assert.doesNotThrow(() =>
    normalizeProvider(
      {
        ...run(),
        created_at: "2026-10-01T00:00:00Z",
        run_started_at: "2026-10-18T00:00:00Z",
      },
      [],
      { head: { sha: shaA }, base: { sha: shaB } },
      context(),
      [],
    ),
  );
});
test("provider pagination, malformed data and outages stay bounded", async () => {
  const { pages } =
    await import("../../../tooling/verification/inspect-provider.mjs");
  let calls = 0;
  const values = await pages(
    "/repos/example/synthetic/jobs",
    "jobs",
    "synthetic",
    async () => ({
      jobs:
        ++calls === 1 ? Array.from({ length: 100 }, (_, id) => ({ id })) : [],
    }),
  );
  assert.equal(values.length, 100);
  assert.equal(calls, 2);
  await assert.rejects(
    () =>
      pages(
        "/repos/example/synthetic/jobs",
        "jobs",
        "synthetic",
        async () => ({}),
      ),
    /malformed/,
  );
  await assert.rejects(
    () =>
      pages("/repos/example/synthetic/jobs", "jobs", "synthetic", async () => {
        throw new Error("provider-unavailable");
      }),
    /unavailable/,
  );
});
test("provider cannot loop through unlimited full pages", async () => {
  const { pages } =
    await import("../../../tooling/verification/inspect-provider.mjs");
  let calls = 0;
  await assert.rejects(
    () =>
      pages("/repos/example/synthetic/jobs", "jobs", "synthetic", async () => {
        calls++;
        return { jobs: Array(100).fill({ id: 1 }) };
      }),
    /pagination-limit/,
  );
  assert.equal(calls, 20);
});
