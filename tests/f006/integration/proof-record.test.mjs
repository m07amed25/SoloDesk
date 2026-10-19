import test from "node:test";
import assert from "node:assert/strict";
import {
  MANDATORY_SCENARIOS,
  createProofRecord,
  evaluateProofGate,
  redactSensitiveData,
} from "../../../tooling/f006/evidence.mjs";

test("evaluateProofGate validates complete passing record", () => {
  const record = createProofRecord({
    recordId: "rec-linux-x64-pass",
    candidateDigest: "abc123candidate",
    buildDigest: "def456build",
    os: "linux",
    osRelease: "6.8.0-generic",
    cpu: "x64",
    desktopSession: "gnome-wayland",
    packageMode: "dir",
    signingState: "unsigned-dev",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "SecretServiceKeyProvider",
    scenarioIds: MANDATORY_SCENARIOS,
    fixtureId: "synthetic-a",
    fileInventory: [
      { surface: "records.db", digest: "sha256:111", bytes: 40960 },
      { surface: "file1.stage", digest: "sha256:222", bytes: 1024 },
    ],
    expected: Object.fromEntries(MANDATORY_SCENARIOS.map((id) => [id, "pass"])),
    observed: Object.fromEntries(
      MANDATORY_SCENARIOS.map((id) => [id, "passed"]),
    ),
    licenseDisposition: "GPL-3.0-or-later-SQLCipher-compatible-acceptable",
    defects: [],
    reviewer: "security-reviewer-1",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  const gate = evaluateProofGate(record);
  assert.equal(gate.status, "passed");
  assert.equal(gate.reasons.length, 0);
});

test("evaluateProofGate rejects missing native results or observations", () => {
  const record = createProofRecord({
    recordId: "rec-missing-native",
    candidateDigest: "abc123candidate",
    buildDigest: "def456build",
    os: "darwin",
    osRelease: "23.4.0",
    cpu: "arm64",
    desktopSession: "aqua",
    packageMode: "dmg",
    signingState: "developer-id",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "KeychainKeyProvider",
    scenarioIds: MANDATORY_SCENARIOS,
    fixtureId: "synthetic-a",
    fileInventory: [],
    expected: Object.fromEntries(MANDATORY_SCENARIOS.map((id) => [id, "pass"])),
    observed: {}, // Missing native observations
    licenseDisposition: "acceptable",
    defects: [],
    reviewer: "reviewer",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  const gate = evaluateProofGate(record);
  assert.notEqual(gate.status, "passed");
  assert.ok(gate.status === "blocked" || gate.status === "failed");
  assert.ok(
    gate.reasons.some((r) => r.includes("missing native observations")),
  );
});

test("evaluateProofGate marks unprotected basic_text host as blocked, not passed", () => {
  const record = createProofRecord({
    recordId: "rec-linux-basic-text",
    candidateDigest: "abc123candidate",
    buildDigest: "def456build",
    os: "linux",
    osRelease: "6.8.0",
    cpu: "x64",
    desktopSession: "headless-ci",
    packageMode: "dir",
    signingState: "none",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "basic_text",
    scenarioIds: MANDATORY_SCENARIOS,
    fixtureId: "synthetic-a",
    fileInventory: [],
    expected: Object.fromEntries(MANDATORY_SCENARIOS.map((id) => [id, "pass"])),
    observed: Object.fromEntries(
      MANDATORY_SCENARIOS.map((id) => [id, "blocked"]),
    ),
    licenseDisposition: "acceptable",
    defects: [],
    reviewer: "reviewer",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  const gate = evaluateProofGate(record);
  assert.equal(gate.status, "blocked");
  assert.ok(
    gate.reasons.some(
      (r) => r.includes("unprotected") || r.includes("basic_text"),
    ),
  );
});

test("evaluateProofGate rejects invalid/customer fixture identity", () => {
  const record = createProofRecord({
    recordId: "rec-customer-data",
    candidateDigest: "abc123candidate",
    buildDigest: "def456build",
    os: "linux",
    osRelease: "6.8.0",
    cpu: "x64",
    desktopSession: "gnome",
    packageMode: "dir",
    signingState: "none",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "SecretServiceKeyProvider",
    scenarioIds: MANDATORY_SCENARIOS,
    fixtureId: "customer-acme-corp", // NOT a synthetic fixture
    fileInventory: [],
    expected: {},
    observed: {},
    licenseDisposition: "acceptable",
    defects: [],
    reviewer: "reviewer",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  const gate = evaluateProofGate(record);
  assert.equal(gate.status, "failed");
  assert.ok(gate.reasons.some((r) => r.includes("synthetic fixture")));
});

test("evaluateProofGate rejects missing license disposition or reviewer", () => {
  const missingLicense = createProofRecord({
    recordId: "rec-no-license",
    candidateDigest: "abc",
    buildDigest: "def",
    os: "linux",
    osRelease: "6.8.0",
    cpu: "x64",
    desktopSession: "gnome",
    packageMode: "dir",
    signingState: "none",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "SecretServiceKeyProvider",
    scenarioIds: MANDATORY_SCENARIOS,
    fixtureId: "synthetic-a",
    fileInventory: [],
    expected: {},
    observed: {},
    licenseDisposition: "", // Missing
    defects: [],
    reviewer: "reviewer",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  assert.equal(evaluateProofGate(missingLicense).status, "blocked");

  const missingReviewer = createProofRecord({
    ...missingLicense,
    licenseDisposition: "acceptable",
    reviewer: "", // Missing
  });

  assert.equal(evaluateProofGate(missingReviewer).status, "blocked");
});

test("evaluateProofGate rejects missing mandatory scenarios", () => {
  const record = createProofRecord({
    recordId: "rec-missing-scenarios",
    candidateDigest: "abc",
    buildDigest: "def",
    os: "linux",
    osRelease: "6.8.0",
    cpu: "x64",
    desktopSession: "gnome",
    packageMode: "dir",
    signingState: "none",
    adapterVersion: "sqlite-multiple-ciphers-v3.0.0",
    formatVersion: 1,
    providerClass: "SecretServiceKeyProvider",
    scenarioIds: ["A-01", "A-02"], // Missing A-03..A-17, SC-001..SC-007
    fixtureId: "synthetic-a",
    fileInventory: [],
    expected: {},
    observed: {},
    licenseDisposition: "acceptable",
    defects: [],
    reviewer: "reviewer",
    reviewedAt: "2026-10-19T14:00:00Z",
  });

  const gate = evaluateProofGate(record);
  assert.notEqual(gate.status, "passed");
  assert.ok(gate.reasons.some((r) => r.includes("mandatory scenario")));
});

test("redactSensitiveData removes 256-bit hex keys and passwords", () => {
  const rawKey =
    "4a1f3c7e890123456789abcdef0123456789abcdef0123456789abcdef012345";
  const text = `Debug: key was ${rawKey} with password="secretPassword123"`;
  const sanitized = redactSensitiveData(text);

  assert.ok(!sanitized.includes(rawKey));
  assert.ok(!sanitized.includes("secretPassword123"));
  assert.ok(sanitized.includes("[REDACTED_KEY]"));
  assert.ok(sanitized.includes("[REDACTED_PASSWORD]"));
});
