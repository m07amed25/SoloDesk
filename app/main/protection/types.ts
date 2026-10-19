/** F006 proof metadata. No raw key or recovery secret belongs in these shapes. */
export const PROTECTION_FORMAT_VERSION = 1 as const;

export type ProtectedDataSet = Readonly<{
  dataSetId: string; // Opaque local identifier; unique and never accepted as authorization by itself.
  identityBindingId: string;
  formatVersion: typeof PROTECTION_FORMAT_VERSION;
  activeGeneration: string; // A data set has exactly one active generation.
  state:
    | "sealed"
    | "unlocked"
    | "locked"
    | "rotation_pending"
    | "recovery_required";
  fixtureDigest?: string;
}>;

export type DeviceKeyBinding = Readonly<{
  bindingId: string;
  identityBindingId: string;
  dataSetId: string;
  generation: string;
  providerClass: "os_protected" | "approved_user_unlock" | "unprotected";
  availability: "available" | "locked" | "missing" | "denied" | "unprotected";
}>;

export type ProtectedStagedFile = Readonly<{
  fileId: string; // Opaque local identifier, not a filename or authority token.
  identityBindingId: string;
  dataSetId: string;
  generation: string;
  lifecycle: "staging" | "sealed" | "interrupted" | "rejected";
  byteCount: number;
  expectedDigest: string;
}>;

export type RotationAttempt = Readonly<{
  attemptId: string;
  identityBindingId: string;
  dataSetId: string;
  fromGeneration: string;
  toGeneration: string;
  phase:
    | "prepared"
    | "candidate_written"
    | "candidate_verified"
    | "selected"
    | "retired"
    | "recovery_required";
  validationResult: "pending" | "valid" | "invalid" | "unknown";
}>;

export type RecoveryState = Readonly<{
  reason:
    | "vault_locked"
    | "key_missing"
    | "protection_denied"
    | "unprotected_backend"
    | "integrity_failed"
    | "interrupted_rotation"
    | "unsupported_format";
  dataDisposition:
    | "intact_locked"
    | "prior_generation_available"
    | "new_generation_available"
    | "unverified";
  nextAction:
    | "retry_unlock"
    | "restore_provider"
    | "contact_support"
    | "inspect_surviving_copy";
  localeKey: string;
}>;

export type ProtectionProofRecord = Readonly<{
  schemaVersion: 1;
  candidateId: string;
  buildCommit: string;
  buildDigest: string;
  os: string;
  osRelease: string;
  cpu: string;
  desktopSession: string;
  packageMode: string;
  signingState: string;
  adapterVersion: string;
  formatVersion: number;
  providerClass: string;
  scenarioIds: readonly string[];
  fixtureId: string;
  fileInventory: readonly Readonly<{
    surface: string;
    digest: string;
    bytes: number;
  }>[];
  expected: Readonly<Record<string, string>>;
  observed: Readonly<Record<string, string>>;
  licenseDisposition: string;
  defects: readonly string[];
  reviewer: string;
  reviewedAt: string;
  status: "planned" | "failed" | "blocked" | "passed";
}>;

// Unknown versions open recovery/upgrade state, not an empty replacement.
export function isSupportedFormat(
  value: unknown,
): value is typeof PROTECTION_FORMAT_VERSION {
  return value === PROTECTION_FORMAT_VERSION;
}
