import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { EvidenceCollector } from "./evidence.mjs";

const SUITES = {
  "test:f009:intent": {
    name: "Scenario 1: Canonical Intent and Changed-Intent Reuse (A-03, FR-003, SC-002)",
    files: ["tests/f009/unit/intent-canonical.test.mjs"],
  },
  "test:f009:atomicity": {
    name: "Scenarios 2, 3, 4: Atomic Commit, Reconciliation, and Concurrency (A-01, A-02, A-04, A-09–A-12)",
    files: [
      "tests/f009/integration/atomicity-commit.test.mjs",
      "tests/f009/integration/atomicity-failpoints.test.mjs",
      "tests/f009/integration/reconciliation.test.mjs",
      "tests/f009/integration/concurrency.test.mjs",
    ],
  },
  "test:f009:authorization": {
    name: "Scenario 5: Current Authority and Zero Leakage (A-05–A-08, A-13, SC-003, SC-006)",
    files: ["tests/f009/authorization/current-authority.test.mjs", "tests/f009/authorization/boundary-regressions.test.mjs"],
  },
  "test:f009:audit": {
    name: "Scenario 6: Audit Integrity, Redaction, and Access (A-14–A-18, A-24, SC-007, SC-008)",
    files: ["tests/f009/integration/audit-redaction.test.mjs"],
  },
  "test:f009:events": {
    name: "Scenario 7: Accepted Event and Progress Contract (A-19–A-22, FR-015, FR-016)",
    files: ["tests/f009/events/event-ordering.test.mjs"],
  },
  "test:f009:recovery": {
    name: "Scenarios 8 & 9: Receipt Archival, Migration, and Recovery Integrity (A-23, A-25, FR-017, FR-019)",
    files: ["tests/f009/integration/recovery-integrity.test.mjs"],
  },
  "test:f009:ui": {
    name: "Scenario 10: English, Arabic, and Status Announcements (FR-020, SC-010, SC-011)",
    files: ["tests/f009/ui/bilingual-receipt-states.test.mjs"],
  },
};

const targetSuite = process.argv[2];
const suitesToRun =
  targetSuite && SUITES[targetSuite]
    ? { [targetSuite]: SUITES[targetSuite] }
    : SUITES;

if (targetSuite && !SUITES[targetSuite] && targetSuite !== "test:f009") {
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
  "\x1b[1m\x1b[36m=== SoloDesk F009 Authoritative Command Receipts & Audit Verification ===\x1b[0m\n",
);

const collector = new EvidenceCollector("F009");

for (const [key, suite] of Object.entries(suitesToRun)) {
  const existingFiles = suite.files.filter((f) => existsSync(path.resolve(f)));
  if (existingFiles.length !== suite.files.length) {
    console.log(
      `\x1b[33m⚠ ${suite.name} - PENDING (files not yet created)\x1b[0m`,
    );
    anyFailed = true;
    continue;
  }

  const result = spawnSync(process.execPath, ["--test", "--test-isolation=none", "--test-reporter=tap", ...existingFiles], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = stdout + stderr + (result.error ? String(result.error) : "");

  const passed = Number(stdout.match(/^# pass (\d+)$/m)?.[1] ?? 0);
  const failed = Number(stdout.match(/^# fail (\d+)$/m)?.[1] ?? 0);
  totalTests += passed + failed;
  totalPassed += passed;

  const isPassed = !result.error && result.status === 0 && failed === 0 && passed > 0;

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

if (!targetSuite || targetSuite === "test:f009") {
  const report = collector.generateReport();
  console.log(
    `\x1b[36mVerification evidence recorded: ${report.passedScenarios}/${report.totalScenarios} scenarios in .verification/f009-evidence.json\x1b[0m\n`,
  );
}

if (anyFailed || totalTests === 0) {
  process.exit(1);
}
