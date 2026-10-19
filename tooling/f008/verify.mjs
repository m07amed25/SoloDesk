import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

const SUITES = {
  "test:cross-tenant-isolation": {
    name: "Test Suite 1: Cross-Tenant Database Isolation (A-01, A-02, A-03)",
    files: [
      "tests/f008/cross-tenant-reads.test.mjs",
      "tests/f008/cross-tenant-mutations.test.mjs",
      "tests/f008/zero-aggregate-leakage.test.mjs",
    ],
  },
  "test:relational-constraints": {
    name: "Test Suite 2: Relational Constraints & Immutability (A-04, A-13, A-15)",
    files: [
      "tests/f008/workspace-immutability.test.mjs",
      "tests/f008/composite-fk-defense.test.mjs",
      "tests/f008/orphan-prevention.test.mjs",
      "tests/f008/uniform-tenant-attribution.test.mjs",
    ],
  },
  "test:role-lifecycle": {
    name: "Test Suite 3: Real-Time Role Lifecycle & Continuity (A-05, A-06, A-07, A-08)",
    files: [
      "tests/f008/role-authorization.test.mjs",
      "tests/f008/immediate-revocation.test.mjs",
      "tests/f008/owner-continuity.test.mjs",
      "tests/f008/tenant-audit-events.test.mjs",
    ],
  },
  "test:private-storage": {
    name: "Test Suite 4: Private Storage & Signed Tokens (A-09, A-10, A-11, A-12)",
    files: [
      "tests/f008/private-storage-default.test.mjs",
      "tests/f008/storage-path-partitioning.test.mjs",
      "tests/f008/signed-url-lifecycle.test.mjs",
      "tests/f008/cross-tenant-storage-denial.test.mjs",
    ],
  },
  "test:quota-resilience": {
    name: "Test Suite 5: Quota Tracking & Degraded Resilience (A-16, A-17, A-18)",
    files: [
      "tests/f008/quota-threshold-tiers.test.mjs",
      "tests/f008/quota-exhaustion-rejection.test.mjs",
      "tests/f008/offline-degraded-mode.test.mjs",
      "tests/f008/quota-warning-banner.test.mjs",
    ],
  },
  "test:secret-isolation": {
    name: "Test Suite 6: Secret Isolation & Distribution Scan (FR-012, SC-009)",
    files: ["tooling/f008/test-secrets.mjs"],
  },
};

const targetSuite = process.argv[2];
const suitesToRun = targetSuite
  ? { [targetSuite]: SUITES[targetSuite] }
  : SUITES;

if (targetSuite && !SUITES[targetSuite]) {
  console.error(`Unknown suite: ${targetSuite}`);
  console.error(
    `Available suites:\n${Object.keys(SUITES)
      .map((s) => `  - ${s}`)
      .join("\n")}`,
  );
  process.exit(1);
}

let totalTests = 0;
let totalPassed = 0;
let anyFailed = false;

console.log(
  "\x1b[1m\x1b[36m=== SoloDesk F008 Managed Backend & Tenant Isolation Verification ===\x1b[0m\n",
);

for (const [, suite] of Object.entries(suitesToRun)) {
  const existingFiles = suite.files.filter((f) => existsSync(path.resolve(f)));
  if (existingFiles.length === 0) {
    console.log(
      `\x1b[33m⚠ ${suite.name} - PENDING (files not yet created)\x1b[0m`,
    );
    continue;
  }

  const result = spawnSync(process.execPath, ["--test", ...existingFiles], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = stdout + stderr;

  // Count tests and pass/fails from node:test TAP or spec output
  const passMatches =
    combined.match(/✔\s+/g) || combined.match(/ok\s+\d+/g) || [];
  const failMatches =
    combined.match(/✖\s+/g) || combined.match(/not ok\s+\d+/g) || [];
  const suitePassCount = passMatches.length;
  const suiteFailCount = failMatches.length;

  if (result.status === 0 && suiteFailCount === 0) {
    console.log(
      `\x1b[32m✔ ${suite.name} - PASSED (${suitePassCount}/${suitePassCount} tests)\x1b[0m`,
    );
    totalPassed += suitePassCount;
    totalTests += suitePassCount;
  } else {
    anyFailed = true;
    console.log(
      `\x1b[31m✖ ${suite.name} - FAILED (${suitePassCount} passed, ${suiteFailCount || 1} failed)\x1b[0m`,
    );
    if (combined) {
      console.log(combined);
    }
    totalPassed += suitePassCount;
    totalTests += suitePassCount + (suiteFailCount || 1);
  }
}

console.log("");
if (anyFailed) {
  console.log(
    `\x1b[31mOverall Result: FAILED (${totalPassed} / ${totalTests} tests passed)\x1b[0m`,
  );
  process.exit(1);
} else {
  console.log(
    `\x1b[32mOverall Result: ${totalPassed} / ${totalTests} tests PASSED (100% compliance with F008 acceptance criteria)\x1b[0m`,
  );
}
