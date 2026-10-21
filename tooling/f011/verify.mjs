import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { EvidenceCollector } from "./evidence.mjs";

export const SUITES = {
  "test:f011:policy": {
    name: "Policy & Contracts: Versioned Policy, Enums, DTOs and Fail-Closed Boundaries",
    files: ["tests/f011/unit/identity-security-contracts.test.mjs"],
  },
  "test:f011:mfa": {
    name: "MFA Enrollment & Challenge: TOTP, AAL, Recovery Handoff and Purpose-Bound Challenge",
    files: [
      "tests/f011/unit/provider-security-adapter.test.mjs",
      "tests/f011/service/factor-enrollment.test.mjs",
      "tests/f011/integration/factor-enrollment.test.mjs",
      "tests/f011/unit/mfa-challenge.test.mjs",
      "tests/f011/integration/mfa-challenge.test.mjs",
      "tests/f011/integration/mfa-abuse.test.mjs",
    ],
  },
  "test:f011:recovery": {
    name: "Account Recovery: Recovery Codes, Primary Credential and Local-Key Isolation",
    files: [
      "tests/f011/integration/recovery-code.test.mjs",
      "tests/f011/integration/primary-recovery.test.mjs",
      "tests/f011/integration/recovery-reconciliation.test.mjs",
    ],
  },
  "test:f011:security": {
    name: "Security Changes & Atomicity: Capability Probe, Sensitive Changes, Generation Invalidation and Schema",
    files: [
      "tests/f011/unit/capability-probe.test.mjs",
      "tests/f011/service/account-security-schema.test.mjs",
      "tests/f011/integration/security-changes.test.mjs",
      "tests/f011/service/security-change-atomicity.test.mjs",
    ],
  },
  "test:f011:reconciliation": {
    name: "Reconciliation & Failure Injection: Restart, Lost Responses, Skew and Concurrent Mutations",
    files: [
      "tests/f011/integration/recovery-reconciliation.test.mjs",
      "tests/f011/integration/failure-injection.test.mjs",
    ],
  },
  "test:f011:boundary": {
    name: "Rollback & Boundary: Reversible Disablement and Protection Preservation",
    files: ["tests/f011/integration/rollback.test.mjs"],
  },
  "test:f011:privacy": {
    name: "Privacy & Evidence: Redacted Audit Events and Secret Boundary Canary Scans",
    files: ["tests/f011/integration/security-evidence.test.mjs"],
  },
  "test:f011:ui": {
    name: "Bilingual UI & Accessibility: English/Arabic Parity, Bidi Isolation, Semantics and Zoom",
    files: [
      "tests/f011/ui/factor-enrollment.test.mjs",
      "tests/f011/ui/localization-parity.test.mjs",
      "tests/f011/ui/hosted-security.test.mjs",
    ],
  },
};

const targetSuite = process.argv[2];
const suitesToRun =
  targetSuite && SUITES[targetSuite]
    ? { [targetSuite]: SUITES[targetSuite] }
    : SUITES;

if (targetSuite && !SUITES[targetSuite] && targetSuite !== "test:f011") {
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
  "\x1b[1m\x1b[36m=== SoloDesk F011 MFA & Account Recovery Verification ===\x1b[0m\n",
);

const collector = new EvidenceCollector("F011");

for (const [key, suite] of Object.entries(suitesToRun)) {
  const existingFiles = suite.files.filter((f) => existsSync(path.resolve(f)));
  if (existingFiles.length !== suite.files.length) {
    const missing = suite.files.filter((f) => !existsSync(path.resolve(f)));
    console.log(
      `\x1b[33m⚠ ${suite.name} - PENDING (${missing.length} missing file(s))\x1b[0m`,
    );
    anyFailed = true;
    continue;
  }

  if (existingFiles.length === 0) {
    console.log(`\x1b[31m✖ ${suite.name} - FAILED (zero test files)\x1b[0m`);
    anyFailed = true;
    continue;
  }

  const result = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-isolation=none",
      "--test-reporter=tap",
      ...existingFiles,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf-8",
      env: { ...process.env, FORCE_COLOR: "1" },
    },
  );

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = stdout + stderr + (result.error ? String(result.error) : "");

  const passed = Number(stdout.match(/^# pass (\d+)$/m)?.[1] ?? 0);
  const failed = Number(stdout.match(/^# fail (\d+)$/m)?.[1] ?? 0);
  totalTests += passed + failed;
  totalPassed += passed;

  const isPassed =
    !result.error && result.status === 0 && failed === 0 && passed > 0;

  collector.recordScenario({
    scenarioId: key,
    name: suite.name,
    passed: isPassed,
    assertions: passed,
    details: { files: existingFiles, stdout: stdout.slice(0, 1000) },
  });

  if (isPassed) {
    console.log(
      `\x1b[32m✔ ${suite.name} - PASSED (${passed}/${passed} tests)\x1b[0m`,
    );
  } else {
    anyFailed = true;
    console.log(
      `\x1b[31m✖ ${suite.name} - FAILED (${passed}/${passed + failed} passed)\x1b[0m`,
    );
    if (combined.trim()) {
      console.log(combined);
    }
  }
}

console.log(
  `\n\x1b[1mOverall Result: ${totalPassed} / ${totalTests} tests PASSED\x1b[0m\n`,
);

if (!targetSuite || targetSuite === "test:f011") {
  const report = collector.generateReport();
  console.log(
    `\x1b[36mVerification evidence recorded: ${report.passedScenarios}/${report.totalScenarios} scenarios in .verification/f011-evidence.json\x1b[0m\n`,
  );
}

if (anyFailed || totalTests === 0) {
  process.exit(1);
}
