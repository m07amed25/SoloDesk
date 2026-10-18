import { publicError } from "../../contracts/src/errors.ts";
import { id } from "../../domain/src/ids.ts";
import { record, ok, fail, type Result } from "../../domain/src/integers.ts";
import { en } from "./en.ts";
import { ar } from "./ar.ts";
export type Display = Readonly<{
  text: string;
  recovery: string;
  outcomeCertainty: string;
  diagnostic?: string;
}>;
export function localize(input: unknown, locale: unknown): Result<Display> {
  if (locale !== "en" && locale !== "ar") return fail("invalid_format");
  const catalogue = locale === "en" ? en : ar;
  const error = publicError(input);
  if (error.ok) {
    const v = error.value;
    return ok(
      Object.freeze({
        text: catalogue[v.messageKey] || catalogue["error.unknown"],
        recovery: v.recovery,
        outcomeCertainty: v.outcomeCertainty,
        diagnostic: v.diagnosticId.value,
      }),
    );
  }
  let diagnostic: string | undefined;
  if (
    record(
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
      ["diagnosticId"],
    )
  ) {
    const d = id(input.diagnosticId, "diagnostic");
    if (d.ok) diagnostic = d.value.value;
  }
  return ok(
    Object.freeze({
      text: catalogue["error.unknown"],
      recovery: "reconcile_operation",
      outcomeCertainty: "unknown",
      ...(diagnostic ? { diagnostic } : {}),
    }),
  );
}
