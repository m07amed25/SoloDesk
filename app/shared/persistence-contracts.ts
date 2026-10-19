export type PersistenceReasonCode =
  | "vault_locked"
  | "key_missing"
  | "integrity_failed"
  | "disk_full"
  | "interrupted_migration"
  | "unsupported_future_version"
  | "io_error";

export type PersistenceAction = "retry" | "unlock" | "export_backup" | "quit";
export type Localized = Readonly<{ en: string; ar: string }>;

export interface PersistenceRecoveryState {
  workspaceId: string;
  reasonCode: PersistenceReasonCode;
  isRecoverable: boolean;
  /** A closed database cannot establish whether all unsynced work is intact. */
  unsyncedWorkRetained: boolean;
  requiredFreeSpaceBytes?: number;
  availableFreeSpaceBytes?: number;
  currentSchemaVersion?: number;
  appSupportedSchemaVersion?: number;
  localizedTitle: Localized;
  localizedMessage: Localized;
  localizedGuidance: Localized;
  permittedActions: PersistenceAction[];
}

export interface PersistenceStatusDto {
  workspaceId: string;
  status:
    | "uninitialized"
    | "opening"
    | "ready"
    | "recovery_required"
    | "closed";
  recoveryDetails?: PersistenceRecoveryState;
}

export type PersistenceIpcResponse =
  | Readonly<{ status: "ok"; data: PersistenceStatusDto }>
  | Readonly<{
      status: "rejected";
      code: "VALIDATION" | "FORBIDDEN" | "RESOURCE_UNAVAILABLE";
    }>;

export function isPersistenceRequest(
  input: unknown,
): input is { workspaceId: string } {
  return (
    input !== null &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Object.keys(input).length === 1 &&
    isWorkspaceId((input as { workspaceId?: unknown }).workspaceId)
  );
}

export function isWorkspaceId(input: unknown): input is string {
  return (
    typeof input === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(input)
  );
}

export function isPersistenceStatus(
  input: unknown,
): input is PersistenceStatusDto {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  if (
    !isWorkspaceId(value.workspaceId) ||
    ![
      "uninitialized",
      "opening",
      "ready",
      "recovery_required",
      "closed",
    ].includes(String(value.status))
  )
    return false;
  if (value.status !== "recovery_required")
    return value.recoveryDetails === undefined;
  const recovery = value.recoveryDetails;
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery))
    return false;
  const detail = recovery as Record<string, unknown>;
  const localized = (field: unknown) =>
    field !== null &&
    typeof field === "object" &&
    typeof (field as Localized).en === "string" &&
    typeof (field as Localized).ar === "string";
  return (
    detail.workspaceId === value.workspaceId &&
    [
      "vault_locked",
      "key_missing",
      "integrity_failed",
      "disk_full",
      "interrupted_migration",
      "unsupported_future_version",
      "io_error",
    ].includes(String(detail.reasonCode)) &&
    typeof detail.isRecoverable === "boolean" &&
    typeof detail.unsyncedWorkRetained === "boolean" &&
    localized(detail.localizedTitle) &&
    localized(detail.localizedMessage) &&
    localized(detail.localizedGuidance) &&
    Array.isArray(detail.permittedActions) &&
    detail.permittedActions.every((action) =>
      ["retry", "unlock", "export_backup", "quit"].includes(action),
    )
  );
}

export function sanitizePersistenceStatus(
  input: unknown,
): PersistenceStatusDto | null {
  if (!isPersistenceStatus(input)) return null;
  const base: PersistenceStatusDto = {
    workspaceId: input.workspaceId,
    status: input.status,
  };
  if (!input.recoveryDetails) return base;
  const detail = input.recoveryDetails;
  const trimLocalized = (text: Localized): Localized => ({
    en: text.en.slice(0, 500),
    ar: text.ar.slice(0, 500),
  });
  return {
    ...base,
    recoveryDetails: {
      workspaceId: input.workspaceId,
      reasonCode: detail.reasonCode,
      isRecoverable: detail.isRecoverable,
      unsyncedWorkRetained: detail.unsyncedWorkRetained,
      localizedTitle: trimLocalized(detail.localizedTitle),
      localizedMessage: trimLocalized(detail.localizedMessage),
      localizedGuidance: trimLocalized(detail.localizedGuidance),
      permittedActions: detail.permittedActions.filter((action) =>
        ["retry", "unlock", "export_backup", "quit"].includes(action),
      ),
      ...(Number.isSafeInteger(detail.requiredFreeSpaceBytes)
        ? { requiredFreeSpaceBytes: detail.requiredFreeSpaceBytes }
        : {}),
      ...(Number.isSafeInteger(detail.availableFreeSpaceBytes)
        ? { availableFreeSpaceBytes: detail.availableFreeSpaceBytes }
        : {}),
      ...(Number.isSafeInteger(detail.currentSchemaVersion)
        ? { currentSchemaVersion: detail.currentSchemaVersion }
        : {}),
      ...(Number.isSafeInteger(detail.appSupportedSchemaVersion)
        ? { appSupportedSchemaVersion: detail.appSupportedSchemaVersion }
        : {}),
    },
  };
}
