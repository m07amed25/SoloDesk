// Synthetic enrollment demonstration. No SoloDesk business behavior is claimed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnrollment } from "../../../tooling/verification/enrollment.mjs";
const suite = {
  id: "F999:synthetic-demo",
  feature: "F999",
  entry_files: ["tests/verification/fixtures/enrollment-demo.mjs"],
  positive: ["valid namespaced entry accepted"],
  negative: ["missing entry rejected"],
  categories: ["unit"],
  scenarios: ["F999:A-01"],
};
test("synthetic positive: explicit owned suite enrollment accepted", () =>
  assert.equal(
    validateEnrollment(suite, suite.entry_files),
    process.env.F002_ENROLLMENT_DEFECT === "1" ? false : true,
  ));
test("synthetic negative: missing entry rejected", () =>
  assert.throws(() => validateEnrollment(suite, []), /suite-entry-missing/));
