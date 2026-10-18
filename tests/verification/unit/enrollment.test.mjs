import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnrollment } from "../../../tooling/verification/enrollment.mjs";
const suite = {
  id: "F003:authorization",
  feature: "F003",
  entry_files: ["tests/F003/authorization.test.mjs"],
  positive: ["authorized access succeeds"],
  negative: ["other tenant denied"],
  categories: ["authorization"],
  scenarios: ["F003:A-01"],
};
test("future suite must have real owned entries, namespaced identity and independent assertions", () => {
  assert.equal(
    validateEnrollment(suite, ["tests/F003/authorization.test.mjs"]),
    true,
  );
  for (const patch of [
    { id: "smoke" },
    { entry_files: [] },
    { positive: [] },
    { negative: [] },
    { scenarios: ["A-01"] },
    { entry_files: ["absent.mjs"] },
  ])
    assert.throws(() =>
      validateEnrollment({ ...suite, ...patch }, [
        "tests/F003/authorization.test.mjs",
      ]),
    );
});
test("specialist categories remain explicit obligations, never a future placeholder pass", () => {
  for (const category of [
    "bilingual",
    "finance",
    "authorization",
    "sync",
    "documents",
  ])
    assert.equal(
      validateEnrollment(
        { ...suite, categories: [category] },
        suite.entry_files,
      ),
      true,
    );
  assert.throws(() =>
    validateEnrollment(
      { ...suite, categories: ["invented"] },
      suite.entry_files,
    ),
  );
});
import fs from "node:fs";
import path from "node:path";
test("all five real F003 suites have owned entries, reviewed floors and obligations", () => {
  const checks = JSON.parse(
    fs.readFileSync("verification/suites.v1.json", "utf8"),
  ).checks.filter((c) => c.id.startsWith("F003:"));
  assert.equal(checks.length, 5);
  const floors = {
    "F003:unit": 48,
    "F003:adapters": 13,
    "F003:errors": 30,
    "F003:source-quality": 3,
    "F003:runtime": 3,
  };
  for (const check of checks) {
    assert.ok(check.min_tests >= floors[check.id]);
    assert.equal(
      validateEnrollment(
        check,
        check.entry_files.filter((p) => fs.statSync(path.resolve(p)).isFile()),
      ),
      true,
    );
    assert.ok(check.argv.includes("--test-isolation=none"));
  }
});
