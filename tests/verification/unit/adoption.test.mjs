import { test } from "node:test";
import assert from "node:assert/strict";
import {
  prepareAdoption,
  reviewState,
} from "../../../tooling/verification/delivery.mjs";
test("preparation preserves stronger constraints and never authenticates activation", () => {
  const value = prepareAdoption(
    { required_checks: ["existing"], required_reviews: 2 },
    [{ name: "F002 / automated-readiness", app_id: 1 }],
  );
  assert.equal(value.outcome, "prepared");
  assert.deepEqual(value.proposed_settings.required_checks, [
    "existing",
    "F002 / automated-readiness",
  ]);
  assert.equal(value.proposed_settings.required_reviews, 2);
  assert.equal(prepareAdoption({}, []).outcome, "blocked");
  assert.equal(prepareAdoption({ unavailable: true }, []).outcome, "blocked");
});
test("editable authorization cannot create actual activation", () => {
  assert.equal(
    prepareAdoption({}, [{ name: "F002 / automated-readiness", app_id: 1 }], {
      approved: true,
    }).outcome,
    "prepared",
  );
});
test("five human cases remain separately unverified, never merge authority", () => {
  for (const source of [
    "agent-only",
    "editable-approval",
    "withdrawn",
    "stale",
    "silence",
  ])
    assert.notEqual(
      reviewState({ source, status: "approved" }, {}),
      "approved",
    );
});
