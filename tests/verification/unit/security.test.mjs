import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditFindings,
  licenseFindings,
  applyDispositions,
  workflowFindings,
} from "../../../tooling/verification/security.mjs";
test("all audit severities require triage, malformed/unavailable data blocks", () => {
  for (const severity of ["low", "moderate", "high", "critical"])
    assert.equal(
      auditFindings({
        vulnerabilities: { synthetic: { severity, via: [] } },
      })[0].severity,
      severity,
    );
  assert.throws(() => auditFindings({ error: { code: "network" } }));
  assert.throws(() => auditFindings({}));
});
test("SPDX unknown/conflicting metadata fails; known expressions are inventory, not legal approval", () => {
  assert.equal(
    licenseFindings([{ name: "synthetic", version: "1", license: "MIT" }])
      .length,
    0,
  );
  for (const license of [
    null,
    "UNKNOWN",
    "MIT OR unknown",
    "SEE LICENSE IN file",
  ])
    assert.ok(
      licenseFindings([{ name: "synthetic", version: "1", license }]).length,
    );
  assert.ok(
    licenseFindings([
      {
        name: "synthetic",
        version: "1",
        license: "MIT",
        licenses: [{ type: "GPL-3.0-only" }],
      },
    ]).length,
  );
});
test("dispositions bind exact finding and scope, expire and cannot waive secrets", () => {
  const finding = {
    code: "dependency",
    package: "synthetic",
    version: "1",
    severity: "low",
  };
  const d = {
    ...finding,
    owner: "owner",
    reason: "reviewed mitigation",
    scope: "F002",
    evidence: "synthetic-only",
    expires_at: "2099-01-01T00:00:00.000Z",
  };
  assert.equal(applyDispositions([finding], [d], "F002").length, 0);
  assert.equal(
    applyDispositions([finding], [{ ...d, version: "2" }], "F002").length,
    1,
  );
  assert.throws(() =>
    applyDispositions(
      [finding],
      [{ ...d, expires_at: "2000-01-01T00:00:00.000Z" }],
      "F002",
    ),
  );
  assert.throws(() =>
    applyDispositions(
      [{ ...finding, code: "secret" }],
      [{ ...d, code: "secret" }],
      "F002",
    ),
  );
});
test("workflow unsafe privileges, floating actions and credential persistence block", () => {
  for (const text of [
    "on: pull_request_target",
    "permissions: write-all",
    "id-token: write",
    "uses: actions/checkout@main",
    "persist-credentials: true",
    "continue-on-error: true",
  ])
    assert.ok(workflowFindings(text).length);
});
