import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { EvidenceCollector } from "./evidence.mjs";

const SUITES = {
  "test:f010:attempts": {
    name: "User Story 1 & Foundation: Browser Handoff, PKCE, Return Grammar, and Verified Identity",
    files: [
      "tests/f010/unit/identity-contracts.test.mjs",
      "tests/f010/unit/auth-attempts.test.mjs",
      "tests/f010/unit/auth-callback.test.mjs",
      "tests/f010/integration/session-owner.test.mjs",
      "tests/f010/integration/browser-handoff.test.mjs",
    ],
  },
  "test:f010:enrollment": {
    name: "User Story 2: First Device Enrollment Schema, Atomicity, and Local Readiness",
    files: [
      "tests/f010/service/enrollment-schema.test.mjs",
      "tests/f010/service/enrollment-atomicity.test.mjs",
      "tests/f010/integration/enrollment-readiness.test.mjs",
      "tests/f010/integration/first-enrollment.test.mjs",
    ],
  },
  "test:f010:recovery": {
    name: "User Story 3: Interruption Recovery, Reconciliation, and Profile Faults",
    files: [
      "tests/f010/integration/interruption-recovery.test.mjs",
      "tests/f010/service/enrollment-reconciliation.test.mjs",
      "tests/f010/integration/profile-recovery.test.mjs",
      "tests/f010/integration/review-regressions.test.mjs",
    ],
  },
  "test:f010:isolation": {
    name: "User Story 4: Sign-out Race Teardown, Account Isolation, and Return to Account",
    files: [
      "tests/f010/integration/sign-out-races.test.mjs",
      "tests/f010/integration/account-isolation.test.mjs",
      "tests/f010/integration/account-return.test.mjs",
    ],
  },
  "test:f010:ui": {
    name: "User Story 5: English/Arabic Parity, Accessibility, RTL/Bidi, and Hosted Auth",
    files: [
      "tests/f010/ui/localization-parity.test.mjs",
      "tests/f010/ui/native-accessibility.test.mjs",
      "tests/f010/ui/rtl-bidi.test.mjs",
      "tests/f010/ui/hosted-auth.test.mjs",
    ],
  },
};

const targetSuite = process.argv[2];
const suitesToRun =
  targetSuite && SUITES[targetSuite]
    ? { [targetSuite]: SUITES[targetSuite] }
    : SUITES;

if (targetSuite && !SUITES[targetSuite] && targetSuite !== "test:f010") {
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
  "\x1b[1m\x1b[36m=== SoloDesk F010 Browser Sign-in & Native Enrollment Verification ===\x1b[0m\n",
);

const collector = new EvidenceCollector("F010");

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

if (!targetSuite || targetSuite === "test:f010") {
  const report = collector.generateReport();
  console.log(
    `\x1b[36mVerification evidence recorded: ${report.passedScenarios}/${report.totalScenarios} scenarios in .verification/f010-evidence.json\x1b[0m\n`,
  );
}

if (anyFailed || totalTests === 0) {
  process.exit(1);
}
