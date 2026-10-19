import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type ProtectedDataSet,
  type ProtectedStagedFile,
  type RotationAttempt,
} from "./types.ts";
import { createDatabase } from "./database.ts";
import { sealStagedFile } from "./files.ts";
import type { KeyBoundary } from "./owner.ts";
import type { ProtectionOwner } from "./owner.ts";

const MONOTONIC_ORDER = [
  "prepared",
  "candidate_written",
  "candidate_verified",
  "selected",
  "retired",
] as const;

export type RotationPhase =
  | (typeof MONOTONIC_ORDER)[number]
  | "recovery_required";

export function isValidTransition(
  from: RotationPhase,
  to: RotationPhase,
): boolean {
  if (to === "recovery_required") return true;
  const fromIdx = MONOTONIC_ORDER.indexOf(
    from as (typeof MONOTONIC_ORDER)[number],
  );
  const toIdx = MONOTONIC_ORDER.indexOf(to as (typeof MONOTONIC_ORDER)[number]);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

export type RotationOptions = {
  failAt?: RotationPhase;
  injectWriteError?: boolean;
};

export type RotationResult = {
  attempt: RotationAttempt;
  newGeneration: string;
  stagedFiles: ProtectedStagedFile[];
};

export async function persistAttempt(
  root: string,
  attempt: RotationAttempt,
): Promise<void> {
  const filePath = path.join(root, "rotation.json");
  await writeFile(filePath, JSON.stringify(attempt), { mode: 0o600 });
}

export async function loadAttempt(
  root: string,
): Promise<RotationAttempt | null> {
  try {
    const raw = await readFile(path.join(root, "rotation.json"), "utf8");
    return JSON.parse(raw) as RotationAttempt;
  } catch {
    return null;
  }
}

/**
 * Executes a full cryptographic key rotation for an opened ProtectionOwner.
 * Monotonically advances through prepared -> candidate_written -> candidate_verified -> selected -> retired.
 */
export async function rotateKey(
  owner: ProtectionOwner,
  root: string,
  keys: KeyBoundary,
  options: RotationOptions = {},
): Promise<RotationResult> {
  const dsRaw = await readFile(path.join(root, "dataset.json"), "utf8");
  const dataSet = JSON.parse(dsRaw) as ProtectedDataSet;

  const fromGeneration = dataSet.activeGeneration;
  const toGeneration = randomUUID();
  const attemptId = randomUUID();

  let attempt: RotationAttempt = Object.freeze({
    attemptId,
    identityBindingId: dataSet.identityBindingId,
    dataSetId: dataSet.dataSetId,
    fromGeneration,
    toGeneration,
    phase: "prepared",
    validationResult: "pending",
  });

  // 1. Prepared: Create candidate envelope
  await persistAttempt(root, attempt);
  if (options.failAt === "prepared") {
    const err = new Error("interrupted_at_prepared");
    (err as unknown as { attempt: RotationAttempt }).attempt = attempt;
    throw err;
  }

  const storageFrom = path.join(root, "generations", fromGeneration);
  const storageTo = path.join(root, "generations", toGeneration);
  await mkdir(storageTo, { recursive: true, mode: 0o700 });

  keys.assertAvailable();
  const handleTo = await keys.create(path.join(storageTo, "key.envelope"), {
    identityBindingId: dataSet.identityBindingId,
    dataSetId: dataSet.dataSetId,
    generation: toGeneration,
  });

  // 2. Candidate Written
  if (options.injectWriteError) {
    await rm(storageTo, { recursive: true, force: true });
    await rm(path.join(root, "rotation.json"), { force: true });
    throw new Error("disk_full_or_write_denied");
  }

  // Copy records from existing DB
  const records = owner.allRecords();
  const candidateDb = createDatabase(
    path.join(storageTo, "data.db"),
    handleTo.key,
    {
      identityBindingId: dataSet.identityBindingId,
      dataSetId: dataSet.dataSetId,
      generation: toGeneration,
    },
  );

  for (const record of records) {
    candidateDb.writeRecord(record);
  }

  // Copy staged files
  const stagedFiles: ProtectedStagedFile[] = [];
  const entries = await readdir(storageFrom);
  for (const entry of entries) {
    if (entry.endsWith(".stage") && !entry.endsWith(".stage.meta")) {
      const fileId = entry.replace(/\.stage$/, "");
      let stagedMeta: ProtectedStagedFile;
      try {
        const metaRaw = await readFile(
          path.join(storageFrom, `${fileId}.stage.meta`),
          "utf8",
        );
        stagedMeta = JSON.parse(metaRaw) as ProtectedStagedFile;
      } catch {
        stagedMeta = {
          fileId,
          identityBindingId: dataSet.identityBindingId,
          dataSetId: dataSet.dataSetId,
          generation: fromGeneration,
          lifecycle: "sealed",
          byteCount: 0,
          expectedDigest: "",
        };
      }
      const bytes = await owner.readSyntheticFile(stagedMeta);
      const newStaged = await sealStagedFile(
        storageTo,
        handleTo.key,
        {
          identityBindingId: dataSet.identityBindingId,
          dataSetId: dataSet.dataSetId,
          generation: toGeneration,
        },
        bytes,
      );
      stagedFiles.push(newStaged);
    }
  }

  attempt = Object.freeze({
    ...attempt,
    phase: "candidate_written",
    validationResult: "pending",
  });
  await persistAttempt(root, attempt);
  if (options.failAt === "candidate_written") {
    candidateDb.close();
    const err = new Error("interrupted_at_candidate_written");
    (err as unknown as { attempt: RotationAttempt }).attempt = attempt;
    throw err;
  }

  // 3. Candidate Verified
  const candidateRecords = candidateDb.allRecords();
  candidateDb.close();

  const recordsMatch =
    JSON.stringify(candidateRecords) === JSON.stringify(records);
  if (!recordsMatch) {
    attempt = Object.freeze({
      ...attempt,
      phase: "recovery_required",
      validationResult: "invalid",
    });
    await persistAttempt(root, attempt);
    throw new Error("candidate_verification_failed");
  }

  attempt = Object.freeze({
    ...attempt,
    phase: "candidate_verified",
    validationResult: "valid",
  });
  await persistAttempt(root, attempt);
  if (options.failAt === "candidate_verified") {
    const err = new Error("interrupted_at_candidate_verified");
    (err as unknown as { attempt: RotationAttempt }).attempt = attempt;
    throw err;
  }

  // 4. Selected
  const updatedDataSet: ProtectedDataSet = Object.freeze({
    ...dataSet,
    activeGeneration: toGeneration,
  });
  await writeFile(
    path.join(root, "dataset.json"),
    JSON.stringify(updatedDataSet),
    { mode: 0o600 },
  );

  attempt = Object.freeze({
    ...attempt,
    phase: "selected",
  });
  await persistAttempt(root, attempt);
  if (options.failAt === "selected") {
    const err = new Error("interrupted_at_selected");
    (err as unknown as { attempt: RotationAttempt }).attempt = attempt;
    throw err;
  }

  // 5. Retired
  // Remove old envelope so old key alone cannot open the dataset
  await rm(path.join(storageFrom, "key.envelope"), { force: true });

  attempt = Object.freeze({
    ...attempt,
    phase: "retired",
  });
  await persistAttempt(root, attempt);

  return {
    attempt,
    newGeneration: toGeneration,
    stagedFiles,
  };
}

/**
 * On restart, reconcile incomplete rotation and unknown write outcomes.
 * Selects the intact prior or complete new version, or enters recovery_required.
 */
export async function reconcileRotation(
  root: string,
  keys?: KeyBoundary,
): Promise<{ selectedGeneration: string | null; status: string }> {
  void keys;
  
  const attempt = await loadAttempt(root);
  if (!attempt) {
    const dsRaw = await readFile(path.join(root, "dataset.json"), "utf8");
    const ds = JSON.parse(dsRaw) as ProtectedDataSet;
    return { selectedGeneration: ds.activeGeneration, status: "none" };
  }

  if (attempt.phase === "recovery_required") {
    return { selectedGeneration: null, status: "recovery_required" };
  }

  if (
    attempt.phase === "prepared" ||
    attempt.phase === "candidate_written" ||
    attempt.phase === "candidate_verified"
  ) {
    // Selection was not committed. Revert to prior generation.
    const candidateDir = path.join(root, "generations", attempt.toGeneration);
    await rm(candidateDir, { recursive: true, force: true });
    await rm(path.join(root, "rotation.json"), { force: true });
    return {
      selectedGeneration: attempt.fromGeneration,
      status: "reverted_to_prior",
    };
  }

  if (attempt.phase === "selected" || attempt.phase === "retired") {
    // Selection was committed. Ensure old key is retired.
    const oldEnvelope = path.join(
      root,
      "generations",
      attempt.fromGeneration,
      "key.envelope",
    );
    await rm(oldEnvelope, { force: true });
    await rm(path.join(root, "rotation.json"), { force: true });
    return {
      selectedGeneration: attempt.toGeneration,
      status: "completed",
    };
  }

  return { selectedGeneration: null, status: "recovery_required" };
}
