import crypto from "node:crypto";
import os from "node:os";

export const MANDATORY_SCENARIOS = Object.freeze([
  "A-01",
  "A-02",
  "A-03",
  "A-04",
  "A-05",
  "A-06",
  "A-07",
  "A-08",
  "A-09",
  "A-10",
  "A-11",
  "A-12",
  "A-13",
  "A-14",
  "A-15",
  "A-16",
  "A-17",
  "SC-001",
  "SC-002",
  "SC-003",
  "SC-004",
  "SC-005",
  "SC-006",
  "SC-007",
]);

const SYNTHETIC_FIXTURE_IDS = new Set(["synthetic-a", "synthetic-b"]);

export function redactSensitiveData(input) {
  if (typeof input !== "string") {
    if (input && typeof input === "object") {
      const sanitized = Array.isArray(input) ? [] : {};
      for (const [key, val] of Object.entries(input)) {
        sanitized[key] = redactSensitiveData(val);
      }
      return sanitized;
    }
    return input;
  }

  return input
    .replace(/[0-9a-fA-F]{64}/g, "[REDACTED_KEY]")
    .replace(/(password=["']?)([^"'\s]+)(["']?)/gi, "$1[REDACTED_PASSWORD]$3")
    .replace(/(secret=["']?)([^"'\s]+)(["']?)/gi, "$1[REDACTED_SECRET]$3");
}

export function collectTargetEnvironment() {
  return {
    os: process.platform,
    osRelease: os.release(),
    cpu: process.arch,
    desktopSession:
      process.env.XDG_SESSION_TYPE ||
      process.env.DESKTOP_SESSION ||
      (process.platform === "linux" ? "headless-linux" : "native-desktop"),
    packageMode: process.env.NODE_ENV === "production" ? "packaged" : "dir",
    signingState:
      process.platform === "darwin"
        ? "developer-id"
        : process.platform === "win32"
          ? "authenticode"
          : "none",
  };
}

export function createProofRecord(fields) {
  const recordId = fields.recordId || `proof-${crypto.randomUUID()}`;
  const scenarioIds = Object.freeze([...(fields.scenarioIds || [])]);
  const fileInventory = Object.freeze(
    (fields.fileInventory || []).map((f) => ({
      surface: f.surface,
      digest: f.digest,
      bytes: Number(f.bytes || 0),
    })),
  );
  const defects = Object.freeze([...(fields.defects || [])]);

  const sanitizedExpected = redactSensitiveData(fields.expected || {});
  const sanitizedObserved = redactSensitiveData(fields.observed || {});

  return Object.freeze({
    recordId,
    candidateDigest: fields.candidateDigest || "",
    buildDigest: fields.buildDigest || "",
    os: fields.os || "",
    osRelease: fields.osRelease || "",
    cpu: fields.cpu || "",
    desktopSession: fields.desktopSession || "",
    packageMode: fields.packageMode || "dir",
    signingState: fields.signingState || "none",
    adapterVersion: fields.adapterVersion || "",
    formatVersion: fields.formatVersion ?? 1,
    providerClass: fields.providerClass || "",
    scenarioIds,
    fixtureId: fields.fixtureId || "",
    fileInventory,
    expected: Object.freeze(sanitizedExpected),
    observed: Object.freeze(sanitizedObserved),
    licenseDisposition: fields.licenseDisposition || "",
    defects,
    reviewer: fields.reviewer || "",
    reviewedAt: fields.reviewedAt || "",
    status: fields.status || "planned",
  });
}

export function evaluateProofGate(record) {
  const reasons = [];

  // 1. Fixture identity check
  if (!SYNTHETIC_FIXTURE_IDS.has(record.fixtureId)) {
    reasons.push(
      `invalid fixtureId "${record.fixtureId}": must be a declared synthetic fixture (synthetic-a or synthetic-b)`,
    );
    return { status: "failed", reasons };
  }

  // 2. License disposition check
  if (!record.licenseDisposition || record.licenseDisposition.trim() === "") {
    reasons.push("missing license disposition");
  } else if (
    record.licenseDisposition.toLowerCase().includes("unapproved") ||
    record.licenseDisposition.toLowerCase().includes("rejected")
  ) {
    reasons.push(
      `unapproved license disposition: ${record.licenseDisposition}`,
    );
  }

  // 3. Reviewer checks
  if (!record.reviewer || record.reviewer.trim() === "") {
    reasons.push("missing reviewer identification");
  }
  if (!record.reviewedAt || record.reviewedAt.trim() === "") {
    reasons.push("missing review timestamp");
  }

  // 4. Mandatory scenarios coverage check
  const declaredScenarios = new Set(record.scenarioIds);
  const missingScenarios = MANDATORY_SCENARIOS.filter(
    (id) => !declaredScenarios.has(id),
  );
  if (missingScenarios.length > 0) {
    reasons.push(`missing mandatory scenarios: ${missingScenarios.join(", ")}`);
  }

  // 5. Native observations check
  const observedKeys = Object.keys(record.observed);
  if (observedKeys.length === 0) {
    reasons.push("missing native observations");
  }

  // 6. Native keystore provider check (Linux basic_text fail-closed rule)
  if (
    record.providerClass === "basic_text" ||
    record.providerClass === "unprotected" ||
    record.providerClass.toLowerCase().includes("unprotected")
  ) {
    reasons.push(
      `unprotected backend (${record.providerClass}) on native target: target keystore is absent or unprotected`,
    );
  }

  // 7. Defects check
  if (record.defects.length > 0) {
    reasons.push(`critical defects recorded: ${record.defects.join("; ")}`);
  }

  // Determine final status
  if (reasons.length > 0) {
    // If provider is basic_text/unprotected or native results are missing/blocked, status is blocked
    const isBlocked =
      reasons.some(
        (r) => r.includes("unprotected") || r.includes("basic_text"),
      ) ||
      Object.values(record.observed).includes("blocked") ||
      !record.reviewer ||
      !record.licenseDisposition;

    const isFailed =
      record.defects.length > 0 ||
      Object.values(record.observed).includes("failed");

    return {
      status: isFailed ? "failed" : isBlocked ? "blocked" : "failed",
      reasons,
    };
  }

  // Check if all observations passed
  const allObservationsPassed = MANDATORY_SCENARIOS.every(
    (id) => record.observed[id] === "passed",
  );

  if (!allObservationsPassed) {
    reasons.push(
      "one or more mandatory scenarios did not observe passed outcome",
    );
    return { status: "blocked", reasons };
  }

  return { status: "passed", reasons: [] };
}
