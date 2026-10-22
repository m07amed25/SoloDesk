import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { EvidenceCollector } from "./evidence.mjs";

export const SUITES = {
  "test:f012:contracts": {
    name: "Contracts & Primitives: Exact Keys, Canonical UUIDv4, Envelopes and Closed DTOs",
    files: [
      "tests/f012/unit/workspace-contracts.test.mjs",
      "tests/f012/unit/workspace-creation.test.mjs",
      "tests/f012/unit/pending-work.test.mjs",
    ],
  },
  "test:f012:service": {
    name: "Service & PostgreSQL Atomicity: Schema, Creation, Idempotent Reconciliation and Selectable Chooser",
    files: [
      "tests/f012/service/workspace-schema.test.mjs",
      "tests/f012/service/workspace-creation-atomicity.test.mjs",
      "tests/f012/service/workspace-creation-reconciliation.test.mjs",
      "tests/f012/service/selectable-workspaces.test.mjs",
    ],
  },
  "test:f012:switching": {
    name: "Switching & Partition Isolation: Coordinator, Generation Fencing, Durable Work and Restart",
    files: [
      "tests/f012/integration/workspace-creation-activation.test.mjs",
      "tests/f012/integration/workspace-switching.test.mjs",
      "tests/f012/integration/generation-fencing.test.mjs",
      "tests/f012/integration/workspace-isolation.test.mjs",
      "tests/f012/integration/retained-partition.test.mjs",
      "tests/f012/integration/workspace-restart.test.mjs",
      "tests/f012/integration/workspace-revocation.test.mjs",
      "tests/f012/integration/workspace-entry-points.test.mjs",
      "tests/f012/integration/workspace-projections.test.mjs",
    ],
  },
  "test:f012:security": {
    name: "Security, Failure Injection & Rollback: Failure Matrix and Reversible Disablement",
    files: [
      "tests/f012/integration/failure-injection.test.mjs",
      "tests/f012/integration/rollback.test.mjs",
    ],
  },
  "test:f012:ui": {
    name: "Bilingual UI & Accessibility: English/Arabic Parity, Bidi Isolation, Context Cues and Dialogs",
    files: [
      "tests/f012/ui/workspace-creation.test.mjs",
      "tests/f012/ui/workspace-context-cues.test.mjs",
      "tests/f012/ui/localization-parity.test.mjs",
      "tests/f012/ui/workspace-accessibility.test.mjs",
    ],
  },
};

const targetSuite = process.argv[2];
const suitesToRun =
  targetSuite && SUITES[targetSuite]
    ? { [targetSuite]: SUITES[targetSuite] }
    : SUITES;

if (targetSuite && !SUITES[targetSuite] && targetSuite !== "test:f012") {
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
  "\x1b[1m\x1b[36m=== SoloDesk F012 Workspace Creation & Safe Switching Verification ===\x1b[0m\n",
);

const collector = new EvidenceCollector("F012");

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

  const get = (keyName) => {
    const matches = [
      ...stdout.matchAll(new RegExp(`(?:#|ℹ) ${keyName} (\\d+)`, "g")),
    ];
    return matches.length ? Number(matches.at(-1)[1]) : null;
  };

  const executed = get("tests") ?? 0;
  const passed = get("pass") ?? 0;
  const failed = get("fail") ?? 0;
  const skipped = get("skipped") ?? 0;
  const todo = get("todo") ?? 0;
  const cancelled = get("cancelled") ?? 0;

  totalTests += executed;
  totalPassed += passed;

  const isPassed =
    !result.error &&
    result.status === 0 &&
    failed === 0 &&
    skipped === 0 &&
    todo === 0 &&
    cancelled === 0 &&
    executed > 0 &&
    passed === executed;

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

if (!targetSuite || targetSuite === "test:f012") {
  const report = collector.generateReport();
  console.log(
    `\x1b[36mVerification evidence recorded: ${report.passedScenarios}/${report.totalScenarios} scenarios in .verification/f012-evidence.json\x1b[0m\n`,
  );
}

if (anyFailed || totalTests === 0) {
  process.exit(1);
}
