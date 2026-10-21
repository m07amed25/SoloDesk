import {
  SECURITY_PURPOSES,
  type SecurityPurpose,
  containsProhibitedSecurityKey,
} from "../../app/shared/identity-security-contracts.ts";

export const HOSTED_SECURITY_PURPOSES = Object.freeze([
  "factor_enroll",
  "mfa_challenge",
  "recovery_codes_acknowledge",
  "recovery_codes_regenerate",
  "lost_factor_recover",
  "primary_credential_recover",
  "factor_disable",
  "factor_replace",
  "primary_credential_change",
  "recovery_identity_change",
] as const);

export type HostedSecurityPurpose = (typeof HOSTED_SECURITY_PURPOSES)[number];

export const RESULT_HINTS = Object.freeze([
  "completed",
  "cancelled",
  "failed",
  "reconcile",
] as const);

export type ResultHint = (typeof RESULT_HINTS)[number];

export interface SecurityReturn {
  operation_reference: string;
  purpose: HostedSecurityPurpose;
  result_hint: ResultHint;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSecurityReturn(input: unknown): SecurityReturn | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;

  if (containsProhibitedSecurityKey(obj)) return null;

  if (
    typeof obj.operation_reference !== "string" ||
    !UUID_REGEX.test(obj.operation_reference)
  ) {
    return null;
  }

  if (
    typeof obj.purpose !== "string" ||
    !(HOSTED_SECURITY_PURPOSES as readonly string[]).includes(obj.purpose)
  ) {
    return null;
  }

  if (
    typeof obj.result_hint !== "string" ||
    !(RESULT_HINTS as readonly string[]).includes(obj.result_hint)
  ) {
    return null;
  }

  // Reject unexpected keys outside the closed grammar
  const allowedKeys = new Set([
    "operation_reference",
    "purpose",
    "result_hint",
  ]);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) return null;
  }

  return {
    operation_reference: obj.operation_reference,
    purpose: obj.purpose as HostedSecurityPurpose,
    result_hint: obj.result_hint as ResultHint,
  };
}

export function buildSecurityReturnUrl(
  baseCallbackUrl: string,
  ret: SecurityReturn,
): string {
  const url = new URL(baseCallbackUrl);
  url.searchParams.set("operation_reference", ret.operation_reference);
  url.searchParams.set("purpose", ret.purpose);
  url.searchParams.set("result_hint", ret.result_hint);
  return url.toString();
}

export interface HostedChallengeBinding {
  operation_reference: string;
  attempt_reference: string;
  purpose: "mfa_challenge";
  result_hint: ResultHint;
}

export function buildChallengeReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "mfa_challenge",
    result_hint: hint,
  };
}

export function buildLostFactorRecoveryReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "lost_factor_recover",
    result_hint: hint,
  };
}

export function buildPrimaryCredentialRecoveryReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "primary_credential_recover",
    result_hint: hint,
  };
}

export function buildRecoveryCodesRegenerateReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "recovery_codes_regenerate",
    result_hint: hint,
  };
}

export function buildFactorDisableReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "factor_disable",
    result_hint: hint,
  };
}

export function buildFactorReplaceReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "factor_replace",
    result_hint: hint,
  };
}

export function buildPrimaryCredentialChangeReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "primary_credential_change",
    result_hint: hint,
  };
}

export function buildRecoveryIdentityChangeReturn(
  operationReference: string,
  hint: ResultHint,
): SecurityReturn {
  return {
    operation_reference: operationReference,
    purpose: "recovery_identity_change",
    result_hint: hint,
  };
}
