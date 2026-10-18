import { test } from "node:test";
import assert from "node:assert/strict";
import { CODES, ISSUE_KEYS } from "../../../packages/contracts/src/errors.ts";
import { en } from "../../../packages/localization/src/en.ts";
import { ar } from "../../../packages/localization/src/ar.ts";
import { localize } from "../../../packages/localization/src/errors.ts";
import { rawError } from "../fixtures/outcomes.mjs";
import { tagged } from "../fixtures/context.mjs";
for (const key of [
  ...CODES.map((c) => `error.${c.toLowerCase()}`),
  ...ISSUE_KEYS.map((k) => `issue.${k}`),
])
  test(`A-23 paired complete message ${key}`, () => {
    assert.equal(typeof en[key], "string");
    assert.equal(typeof ar[key], "string");
    assert.notEqual(en[key].trim(), "");
    assert.notEqual(ar[key].trim(), "");
    assert.deepEqual(
      en[key].match(/\{\w+\}/g) || [],
      ar[key].match(/\{\w+\}/g) || [],
    );
  });
test("A-25 unknown error fallback preserves uncertainty and no raw text", () => {
  const value = localize(
    {
      code: "FUTURE",
      diagnosticId: tagged("diagnostic", 90),
      message: "<script>SECRET</script>",
    },
    "ar",
  ).value;
  assert.equal(value.text, ar["error.unknown"]);
  assert.equal(value.recovery, "reconcile_operation");
  assert.equal(value.outcomeCertainty, "unknown");
  assert.doesNotMatch(JSON.stringify(value), /SECRET|script/);
});
test("A-23 language switch never mutates code/values/diagnostic", () => {
  const error = rawError("REVISION_CONFLICT"),
    before = JSON.stringify(error);
  const a = localize(error, "en").value,
    b = localize(error, "ar").value;
  assert.notEqual(a.text, b.text);
  assert.equal(a.diagnostic, b.diagnostic);
  assert.equal(a.recovery, b.recovery);
  assert.equal(JSON.stringify(error), before);
});
test("A-26 malformed parameters use inert safe fallback", () => {
  assert.equal(
    localize(
      { ...rawError(), params: { html: "<script>SECRET</script>" } },
      "en",
    ).value.text,
    en["error.unknown"],
  );
  assert.equal(localize(rawError(), "unknown").ok, false);
});
