import test from "node:test";
import assert from "node:assert/strict";
import { selectChecks } from "../../../tooling/verification/selection.mjs";
import { context, policy, manifest } from "../fixtures/records.mjs";
test("docs-only still selects mandatory baseline with explicit desktop omission", () => {
  const c = { ...context(), changed_paths: ["docs/synthetic.md"] };
  const s = selectChecks(c, policy(), manifest());
  assert.equal(s.checks.find((c) => c.check_id === "typecheck").selected, true);
  assert.equal(
    s.checks.find((c) => c.check_id === "desktop:linux-x64").selected,
    false,
  );
  assert.ok(s.checks.every((c) => c.reason));
});
for (const file of [
  "app/main/main.ts",
  "package-lock.json",
  "tooling/verification/selection.mjs",
  "unknown-root",
])
  test(`risk selects native and review: ${file}`, () => {
    const s = selectChecks(
      { ...context(), changed_paths: [file] },
      policy(),
      manifest(),
    );
    assert.ok(
      s.checks.find((c) => c.check_id === "desktop:linux-x64").selected,
    );
    assert.ok(s.review_required);
  });
test("base obligations cannot be removed by candidate", () => {
  const p = policy(),
    base = { ...p, mandatory_checks: ["typecheck", "security-required"] };
  const s = selectChecks(context(), p, manifest(), { basePolicy: base });
  assert.ok(s.findings.some((f) => f.code === "policy-downgrade"));
  assert.ok(
    s.checks.some((c) => c.check_id === "security-required" && c.selected),
  );
});
test("missing required suite is explicit gap", () => {
  const p = { ...policy(), mandatory_checks: ["missing"] };
  assert.ok(
    selectChecks(context(), p, manifest()).findings.some(
      (f) => f.code === "required-suite-missing",
    ),
  );
});
test("base command minima cannot be changed or lowered by candidate registry", () => {
  const base = manifest(),
    candidate = manifest();
  candidate.checks[0].argv = ["-e", "process.exit(0)"];
  assert.ok(
    selectChecks(context(), policy(), candidate, {
      basePolicy: policy(),
      baseManifest: base,
    }).findings.some((f) => f.code === "suite-downgrade"),
  );
});
