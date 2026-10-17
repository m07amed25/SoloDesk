import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRecord,
  validateRecord,
} from "../../../tooling/verification/records.mjs";
const policy = () => ({
  schema: "solodesk.verification.policy",
  schema_version: 1,
  id: "synthetic-policy",
  authority: "bootstrap-candidate",
  mandatory_checks: ["typecheck"],
  risk_rules: [],
  targets: [],
  limits: {},
  suite_manifest_ref: "synthetic-suites",
  toolchain_ref: "synthetic-tools",
  disposition_refs: [],
});
test("accepts supported policy as inert data", () =>
  assert.equal(validateRecord(policy()).id, "synthetic-policy"));
test("duplicate JSON keys rejected including escaped spelling", () =>
  assert.throws(() => parseRecord('{"id":"a","\\u0069d":"b"}'), /duplicate/));
test("unknown version and kind rejected", () => {
  assert.throws(
    () => validateRecord({ ...policy(), schema_version: 2 }),
    /version/,
  );
  assert.throws(
    () =>
      validateRecord({ ...policy(), schema: "solodesk.verification.unknown" }),
    /schema/,
  );
});
test("mandatory policy cannot be empty or duplicate", () => {
  for (const list of [[], ["x", "x"]])
    assert.throws(
      () => validateRecord({ ...policy(), mandatory_checks: list }),
      /mandatory|duplicate/,
    );
});
test("unsafe numeric counts and unknown security field rejected", () => {
  assert.throws(
    () => validateRecord({ ...policy(), limits: { bytes: -1 } }),
    /integer/,
  );
  assert.throws(
    () => validateRecord({ ...policy(), merge_authorized: true }),
    /field/,
  );
});
test("bounded input and collection validated before use", () => {
  assert.throws(() => parseRecord(" ".repeat(2 * 1024 * 1024 + 1)), /limit/);
  assert.throws(
    () => validateRecord({ ...policy(), risk_rules: Array(2049).fill({}) }),
    /limit/,
  );
});
test("timestamp and nested authority constraints cannot be bypassed", () => {
  const tool = {
    schema: "solodesk.verification.toolchain",
    schema_version: 1,
    id: "synthetic-tool",
    runtime: {},
    packages: {},
    actions: {},
    cli_binaries: [],
    runner_images: [],
    review_ref: "synthetic",
    updated_at: "2026-02-30T00:00:00Z",
  };
  assert.throws(() => validateRecord(tool), /timestamp/);
  assert.throws(
    () => validateRecord({ ...policy(), limits: { merge_authorized: true } }),
    /field/,
  );
});

test("F002 controlled applicable assertion failure A-26", () =>
  assert.fail("Controlled primary-PR negative; repair before delivery"));
