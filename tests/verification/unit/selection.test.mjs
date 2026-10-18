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
test("candidate cannot remove an existing native target from base minimum", () => {
  const base = policy(),
    candidate = { ...policy(), targets: [] };
  const s = selectChecks(
    { ...context(), changed_paths: ["app/main/main.ts"] },
    candidate,
    manifest(),
    { basePolicy: base },
  );
  assert.ok(
    s.checks.some((c) => c.check_id === "desktop:linux-x64" && c.selected),
  );
  assert.ok(s.findings.some((f) => f.code === "target-policy-downgrade"));
});
test("candidate cannot append a disabling flag to an existing mandatory command", () => {
  const base = manifest(),
    candidate = manifest();
  base.checks[0].kind = "command";
  candidate.checks[0].kind = "command";
  candidate.checks[0].argv.push("--noCheck");
  assert.ok(
    selectChecks(context(), policy(), candidate, {
      basePolicy: policy(),
      baseManifest: base,
    }).findings.some((f) => f.code === "suite-downgrade"),
  );
});
test("future required suite needs an owned namespace and explicit nonempty test entry", () => {
  const p = policy(),
    m = manifest();
  p.mandatory_checks.push("unowned");
  m.checks.push({
    id: "unowned",
    group: "baseline",
    executable: "$NODE",
    argv: ["-e", "process.exit(0)"],
    kind: "command",
    entry_files: [],
    phase_ids: ["F999"],
  });
  assert.throws(() => selectChecks(context(), p, m), /suite-enrollment/);
});
import fs from 'node:fs';
test('F003 producer removal blocks and existing protected commands stay unchanged',()=>{
 const actual=JSON.parse(fs.readFileSync('verification/suites.v1.json','utf8'));
 const selected=selectChecks(context(),policy(),actual);
 for(const id of ['unit','adapters','errors','source-quality','runtime'])assert.ok(selected.checks.some(c=>c.check_id===`F003:${id}`&&c.selected));
 const candidate=structuredClone(actual);candidate.checks=candidate.checks.filter(c=>c.id!=='F003:runtime');
 assert.ok(selectChecks(context(),policy(),candidate,{baseManifest:actual}).findings.some(f=>f.code==='suite-downgrade'&&f.check_id==='F003:runtime'));
});
