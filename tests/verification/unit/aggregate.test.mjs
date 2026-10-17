import test from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../../../tooling/verification/aggregate.mjs";
import { context, report } from "../fixtures/records.mjs";
const selection = () => ({
  context_ref: "context-synthetic",
  policy_ref: "policy-synthetic",
  checks: [
    {
      check_id: "typecheck",
      selected: true,
      group: "baseline",
      reason: "mandatory",
    },
  ],
  findings: [],
});
test("complete current set passes automated stage with human stages pending", () => {
  const r = aggregate(context(), selection(), [report()]);
  assert.equal(r.automated_ready, true);
  assert.equal(r.human_stages.owner, "pending");
  assert.equal(r.merge_authorized, undefined);
});
for (const status of [
  "failed",
  "not run",
  "unavailable",
  "stale",
  "not applicable",
  "canceled",
  "timed-out",
  "skipped",
])
  test(`required ${status} blocks`, () =>
    assert.equal(
      aggregate(context(), selection(), [{ ...report(), status }])
        .automated_ready,
      false,
    ));
test("missing, duplicate and wrong context records block", () => {
  assert.equal(aggregate(context(), selection(), []).automated_ready, false);
  assert.equal(
    aggregate(context(), selection(), [report(), report()]).automated_ready,
    false,
  );
  assert.equal(
    aggregate(context(), selection(), [{ ...report(), context_ref: "other" }])
      .automated_ready,
    false,
  );
});
test("provider failure overrides editable passing report", () => {
  const provider = {
    authenticated: true,
    jobs: [{ name: "F002 / baseline", conclusion: "failure" }],
  };
  assert.equal(
    aggregate(
      { ...context(), execution_mode: "hosted-pr" },
      selection(),
      [report()],
      { provider },
    ).automated_ready,
    false,
  );
});
test("empty suite, cleanup failure and forged authority block", () => {
  for (const patch of [
    { counts: { kind: "tests", executed: 0, failed: 0 } },
    { cleanup: { status: "failed" } },
    { merge_authorized: true },
  ])
    assert.equal(
      aggregate(context(), selection(), [{ ...report(), ...patch }])
        .automated_ready,
      false,
    );
});
test("duplicate record IDs and wrong command bindings block", () => {
  const s = selection();
  s.checks.push({
    check_id: "build",
    selected: true,
    group: "baseline",
    reason: "mandatory",
  });
  assert.equal(
    aggregate(context(), s, [
      report(),
      { ...report(), check_id: "build", command_id: "build" },
    ]).automated_ready,
    false,
  );
  assert.equal(
    aggregate(context(), selection(), [{ ...report(), command_id: "other" }])
      .automated_ready,
    false,
  );
});
for (const claim of [
  "agent-only",
  "editable-approval",
  "withdrawn",
  "stale",
  "silence",
])
  test(`automation cannot grant owner authority from ${claim}`, () => {
    const c = { ...context(), untrusted_owner_claim: claim };
    const r = aggregate(c, selection(), [report()]);
    assert.equal(r.human_stages.owner, "pending");
    assert.equal(r.merge_authorized, undefined);
  });
test("expired, wrong-context and inaccessible required artifact block", () => {
  for (const a of [
    {
      expires_at: "2000-01-01T00:00:00.000Z",
      context_ref: "context-synthetic",
      run_ref: "run-synthetic",
    },
    {
      expires_at: "2099-01-01T00:00:00.000Z",
      context_ref: "wrong",
      run_ref: "run-synthetic",
    },
  ])
    assert.equal(
      aggregate(context(), selection(), [{ ...report(), artifacts: [a] }])
        .automated_ready,
      false,
    );
  const r = report();
  r.artifacts = [
    {
      path: "../escape",
      bytes: 1,
      sha256: "0".repeat(64),
      context_ref: r.context_ref,
      run_ref: r.run_ref,
      expires_at: "2099-01-01T00:00:00.000Z",
    },
  ];
  assert.equal(
    aggregate(context(), selection(), [r], { root: process.cwd() })
      .automated_ready,
    false,
  );
});
test("missing selected matrix target and wrong command argv remain blockers", () => {
  const s = selection();
  s.checks.push({
    check_id: "desktop:windows-x64",
    group: "desktop",
    selected: true,
    target_id: "windows-x64",
  });
  assert.equal(aggregate(context(), s, [report()]).automated_ready, false);
  const bound = selection();
  bound.checks[0].expected_argv = ["required.mjs"];
  assert.equal(aggregate(context(), bound, [report()]).automated_ready, false);
});
test("ambiguous producer jobs and wrong provider attempt block even with a success", () => {
  const c = {
    ...context(),
    execution_mode: "hosted-pr",
    provider: { run_id: 1, attempt: 1 },
  };
  const p = {
    authenticated: true,
    context_ref: c.id,
    run_id: 1,
    attempt: 2,
    current_head: c.proposal_head_sha,
    current_base: c.base_sha,
    tested_sha: c.tested_sha,
    jobs: [
      { name: "F002 / baseline", status: "completed", conclusion: "success" },
      { name: "F002 / baseline", status: "completed", conclusion: "failure" },
    ],
    artifacts: [],
  };
  const s = aggregate(c, selection(), [report()], { provider: p });
  assert.equal(s.automated_ready, false);
  assert.ok(s.findings.some((f) => f.code === "producer-unsuccessful"));
  assert.ok(s.findings.some((f) => f.code === "provider-context-stale"));
});
