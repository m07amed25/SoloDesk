// F003-compliant error formatter for Supabase Edge Functions
import type {
  Code,
  PublicError,
  Recovery,
} from "../../../packages/contracts/src/errors.ts";
import { recoveryFor } from "../../../packages/contracts/src/errors.ts";

export function createPublicError(
  code: Code,
  options?: {
    outcomeCertainty?: "not_applied" | "applied" | "unknown";
    retryAfterMs?: number;
    issues?: readonly Readonly<{
      key: string;
      path: readonly (string | number)[];
    }>[];
  },
): PublicError {
  const diagnosticId =
    `dia_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}` as PublicError["diagnosticId"];
  const recovery: Recovery = recoveryFor(code);

  return {
    code,
    messageKey: `error.${code.toLowerCase()}`,
    params: Object.freeze({}),
    diagnosticId,
    recovery,
    outcomeCertainty: options?.outcomeCertainty ?? "not_applied",
    ...(options?.retryAfterMs !== undefined
      ? { retryAfterMs: options.retryAfterMs }
      : {}),
    ...(options?.issues
      ? { issues: options.issues as PublicError["issues"] }
      : {}),
  };
}

export function jsonErrorResponse(
  code: Code,
  status = 400,
  extra?: { retryAfterMs?: number },
): Response {
  const err = createPublicError(code, extra);
  return new Response(JSON.stringify({ ok: false, error: err }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
