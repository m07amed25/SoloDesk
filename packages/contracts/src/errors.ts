import { ok, fail, record, type Result } from "../../domain/src/integers.ts";
import { id, type Id } from "../../domain/src/ids.ts";
import { BOUNDS, utf8Length } from "./bounds.ts";
import { plainData } from "./validation.ts";

export const CODES = [
  "VALIDATION",
  "AUTH_REQUIRED",
  "SESSION_REVOKED",
  "FORBIDDEN",
  "RESOURCE_UNAVAILABLE",
  "REVISION_CONFLICT",
  "FINANCIAL_LOCK",
  "ALLOCATION_CONFLICT",
  "ONLINE_REQUIRED",
  "OUTCOME_UNKNOWN",
  "RATE_LIMITED",
  "UPGRADE_REQUIRED",
  "SCHEMA_UNSUPPORTED",
  "STORAGE_UNAVAILABLE",
  "KEY_UNAVAILABLE",
  "PROVIDER_FAILURE",
  "SERVICE_UNAVAILABLE",
] as const;

export type Code = (typeof CODES)[number];

export const ISSUE_KEYS = [
  "required",
  "unknown_field",
  "invalid_type",
  "invalid_format",
  "invalid_enum",
  "unsupported_version",
  "noncanonical",
  "out_of_range",
  "division_by_zero",
  "incompatible_unit",
  "non_representable",
  "work_limit",
  "duplicate_field",
] as const;

export const RECOVERY = [
  "correct_fields",
  "sign_in",
  "refresh_access",
  "connect",
  "resolve_conflict",
  "permitted_correction",
  "reconcile_operation",
  "retry_after",
  "upgrade",
  "upgrade_or_recover",
  "recover_storage",
  "contact_support",
] as const;

export type Recovery = (typeof RECOVERY)[number];

export const recoveryFor = (code: Code): Recovery =>
  (
    ({
      VALIDATION: "correct_fields",
      AUTH_REQUIRED: "sign_in",
      SESSION_REVOKED: "sign_in",
      FORBIDDEN: "refresh_access",
      RESOURCE_UNAVAILABLE: "refresh_access",
      REVISION_CONFLICT: "resolve_conflict",
      FINANCIAL_LOCK: "permitted_correction",
      ALLOCATION_CONFLICT: "permitted_correction",
      ONLINE_REQUIRED: "connect",
      OUTCOME_UNKNOWN: "reconcile_operation",
      RATE_LIMITED: "retry_after",
      UPGRADE_REQUIRED: "upgrade",
      SCHEMA_UNSUPPORTED: "upgrade_or_recover",
      STORAGE_UNAVAILABLE: "recover_storage",
      KEY_UNAVAILABLE: "recover_storage",
      PROVIDER_FAILURE: "reconcile_operation",
      SERVICE_UNAVAILABLE: "reconcile_operation",
    }) as const
  )[code];

export type PublicError = Readonly<{
  code: Code;
  messageKey: string;
  params: Readonly<Record<string, never>>;
  diagnosticId: Id<"diagnostic">;
  recovery: Recovery;
  outcomeCertainty: "not_applied" | "applied" | "unknown";
  retryAfterMs?: number;
  issues?: readonly Readonly<{
    key: (typeof ISSUE_KEYS)[number];
    path: readonly (string | number)[];
  }>[];
  issuesTruncated?: boolean;
}>;

export function publicError(input: unknown): Result<PublicError> {
  const safe = plainData(input);
  if (!safe.ok) return safe;

  input = safe.value;
  if (
    !record(
      input,
      [
        "code",
        "messageKey",
        "params",
        "diagnosticId",
        "recovery",
        "outcomeCertainty",
        "retryAfterMs",
        "issues",
        "issuesTruncated",
      ],
      [
        "code",
        "messageKey",
        "params",
        "diagnosticId",
        "recovery",
        "outcomeCertainty",
      ],
    )
  )
    return fail("invalid_type");

  if (
    typeof input.code !== "string" ||
    !(CODES as readonly string[]).includes(input.code)
  )
    return fail("invalid_format");

  const code = input.code as Code;
  if (
    input.messageKey !== `error.${code.toLowerCase()}` ||
    !record(input.params, []) ||
    input.recovery !== recoveryFor(code) ||
    typeof input.outcomeCertainty !== "string" ||
    !["not_applied", "applied", "unknown"].includes(input.outcomeCertainty)
  )
    return fail("invalid_format");

  const diagnostic = id(input.diagnosticId, "diagnostic");
  if (!diagnostic.ok) return diagnostic;

  if (
    input.outcomeCertainty === "unknown" &&
    ["retry_after", "correct_fields"].includes(String(input.recovery))
  )
    return fail("invalid_format");

  if (code === "OUTCOME_UNKNOWN" && input.outcomeCertainty !== "unknown")
    return fail("invalid_format");

  if (input.recovery === "retry_after") {
    if (
      input.outcomeCertainty !== "not_applied" ||
      typeof input.retryAfterMs !== "number" ||
      !Number.isInteger(input.retryAfterMs) ||
      input.retryAfterMs < 1 ||
      input.retryAfterMs > BOUNDS.retryMs
    )
      return fail("out_of_range");
  } else if (Object.hasOwn(input, "retryAfterMs"))
    return fail("invalid_format");

  if (
    Object.hasOwn(input, "issues") &&
    (!Array.isArray(input.issues) ||
      input.issues.length > BOUNDS.issues ||
      code !== "VALIDATION")
  )
    return fail("out_of_range");

  if (
    Object.hasOwn(input, "issuesTruncated") &&
    typeof input.issuesTruncated !== "boolean"
  )
    return fail("invalid_type");

  const issues: Readonly<{
    key: (typeof ISSUE_KEYS)[number];
    path: readonly (string | number)[];
  }>[] = [];

  for (const issue of (input.issues as unknown[] | undefined) || []) {
    if (
      !record(issue, ["key", "path"]) ||
      !(ISSUE_KEYS as readonly unknown[]).includes(issue.key) ||
      !Array.isArray(issue.path) ||
      issue.path.length > 16 ||
      issue.path.some((s: unknown) =>
        typeof s === "number"
          ? !Number.isInteger(s) || s < 0 || s >= 1000
          : typeof s !== "string" ||
            ![
              "payload",
              "unknownField",
              "coefficient",
              "scale",
              "numerator",
              "denominator",
              "minorUnits",
              "currency",
              "exponent",
              "profileVersion",
              "seconds",
              "date",
              "instant",
              "reference",
              "id",
              "workspaceId",
              "kind",
              "value",
              "version",
              "operation",
            ].includes(s),
      )
    )
      return fail("invalid_format");

    issues.push(
      Object.freeze({
        key: issue.key as (typeof ISSUE_KEYS)[number],
        path: Object.freeze([...issue.path]),
      }),
    );
  }

  const out = Object.freeze({
    ...input,
    diagnosticId: diagnostic.value,
    params: Object.freeze({}),
    ...(Object.hasOwn(input, "issues")
      ? { issues: Object.freeze(issues) }
      : {}),
  }) as PublicError;

  if (utf8Length(JSON.stringify(out)) > BOUNDS.errorBytes)
    return fail("out_of_range");

  return ok(out);
}
