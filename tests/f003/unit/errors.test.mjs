import { test } from "node:test";
import assert from "node:assert/strict";
import { publicError, CODES } from "../../../packages/contracts/src/errors.ts";
import { rawError } from "../fixtures/outcomes.mjs";
for (const code of CODES)
  test(`A-23 complete stable code ${code}`, () =>
    assert.equal(publicError(rawError(code)).ok, true));
for (const [name, change] of [
  ["extra raw message", (v) => (v.message = "SYNTHETIC_SECRET")],
  ["secret param", (v) => (v.params = { token: "SYNTHETIC_SECRET" })],
  [
    "unsafe field",
    (v) => (v.issues = [{ key: "invalid_type", path: ["PRIVATE_CUSTOMER"] }]),
  ],
  ["invalid certainty", (v) => (v.outcomeCertainty = "success")],
  ["unknown key", (v) => (v.messageKey = "error.raw")],
  ["raw stack", (v) => (v.stack = "SECRET")],
])
  test(`A-26 rejects ${name}`, () => {
    const v = rawError();
    change(v);
    assert.equal(publicError(v).ok, false);
  });
test("A-24 issue count/truncation is bounded", () => {
  const v = rawError();
  v.issues = Array.from({ length: 32 }, () => ({
    key: "invalid_type",
    path: ["payload", 0],
  }));
  v.issuesTruncated = true;
  assert.equal(publicError(v).ok, true);
  v.issues.push(v.issues[0]);
  assert.equal(publicError(v).ok, false);
});
test("A-27 unknown outcomes never blind-retry", () => {
  const v = rawError("RATE_LIMITED");
  v.outcomeCertainty = "unknown";
  assert.equal(publicError(v).ok, false);
});
test("A-27 retry delay exact boundaries", () => {
  for (const n of [1, 3600000])
    assert.equal(
      publicError({ ...rawError("RATE_LIMITED"), retryAfterMs: n }).ok,
      true,
    );
  for (const n of [0, 3600001, 1.5])
    assert.equal(
      publicError({ ...rawError("RATE_LIMITED"), retryAfterMs: n }).ok,
      false,
    );
});
test("A-26 nested accessors are never invoked", () => {
  let reads = 0;
  const v = rawError();
  v.params = {
    get secret() {
      reads++;
      return "SECRET";
    },
  };
  assert.equal(publicError(v).ok, false);
  assert.equal(reads, 0);
});
import { Issues } from "../../../packages/contracts/src/validation.ts";
test("issue collector drops unknown keys and attacker-owned paths", () => {
  const issues = new Issues();
  issues.add("PRIVATE_EXCEPTION", ["payload"]);
  issues.add("invalid_type", ["secretCustomerName"]);
  assert.deepEqual(issues.result(), { issues: [], issuesTruncated: false });
});
test("A-03 schema-owned issue-path ceiling and bounded maximum public error", () => {
  const value = rawError();
  value.issues = Array.from({ length: 32 }, () => ({
    key: "unsupported_version",
    path: Array(16).fill("profileVersion"),
  }));
  value.issuesTruncated = true;
  const accepted = publicError(value);
  assert.equal(accepted.ok, true);
  assert.ok(
    new TextEncoder().encode(JSON.stringify(accepted.value)).length <= 16384,
  );
  value.issues[0].path.push("profileVersion");
  assert.equal(publicError(value).ok, false);
  assert.equal(
    publicError({ ...rawError(), params: { raw: "x".repeat(16385) } }).ok,
    false,
  );
});
