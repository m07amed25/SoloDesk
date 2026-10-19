export const PROTECTION_REASONS = Object.freeze([
  "vault_locked",
  "key_missing",
  "protection_denied",
  "unprotected_backend",
  "integrity_failed",
  "interrupted_rotation",
  "unsupported_format",
] as const);
export type ProtectionReason = (typeof PROTECTION_REASONS)[number];
export type ProtectionAction =
  | "retry_unlock"
  | "restore_provider"
  | "contact_support"
  | "inspect_surviving_copy";

export type ProtectionResult = Readonly<
  | { status: "ready"; correlationId: string }
  | {
      status: "blocked";
      reason: ProtectionReason;
      nextAction: ProtectionAction;
      correlationId: string;
    }
>;

const ACTIONS: Readonly<Record<ProtectionReason, ProtectionAction>> =
  Object.freeze({
    vault_locked: "retry_unlock",
    key_missing: "restore_provider",
    protection_denied: "contact_support",
    unprotected_backend: "contact_support",
    integrity_failed: "contact_support",
    interrupted_rotation: "inspect_surviving_copy",
    unsupported_format: "contact_support",
  });

/** Closed mapping: never interpolate an exception, path, key or fixture value. */
export function blockedProtection(reason: ProtectionReason): ProtectionResult {
  return Object.freeze({
    status: "blocked",
    reason,
    nextAction: ACTIONS[reason],
    correlationId: globalThis.crypto.randomUUID(),
  });
}

export function isProtectionResult(value: unknown): value is ProtectionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.correlationId !== "string" ||
    !/^[0-9a-f-]{36}$/.test(entry.correlationId)
  )
    return false;
  if (entry.status === "ready") return Object.keys(entry).length === 2;
  return (
    entry.status === "blocked" &&
    Object.keys(entry).length === 4 &&
    PROTECTION_REASONS.includes(entry.reason as ProtectionReason) &&
    entry.nextAction === ACTIONS[entry.reason as ProtectionReason]
  );
}
