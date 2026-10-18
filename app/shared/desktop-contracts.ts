import { BOUNDS } from "../../packages/contracts/src/bounds.ts";
import {
  publicError,
  recoveryFor,
  type Code,
  type PublicError,
} from "../../packages/contracts/src/errors.ts";
import {
  plainData,
  type Data,
} from "../../packages/contracts/src/validation.ts";
import { id, type Id } from "../../packages/domain/src/ids.ts";

export const DESKTOP_VERSION = 1 as const;

export const METHODS = Object.freeze([
  "window.getState",
  "window.minimize",
  "window.restore",
  "window.requestClose",
  "lifecycle.onState",
  "links.onDecision",
] as const);

export type DesktopMethod = (typeof METHODS)[number];

export type WindowState = Readonly<{
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
}>;

export type DesktopRequest = Readonly<{
  version: 1;
  requestId: Id<"request">;
  payload: Readonly<Record<string, never>>;
}>;

export type DesktopResponse =
  | Readonly<{
      version: 1;
      requestId: Id<"request">;
      status: "ok";
      data: WindowState | Readonly<{ subscriptionId: string }> | Readonly<Record<string, never>>;
    }>
  | Readonly<{
      version: 1;
      requestId: Id<"request">;
      status: "accepted";
      transition: "closing";
    }>
  | Readonly<{
      version: 1;
      requestId: Id<"request">;
      status: "rejected" | "outcome_unknown";
      error: PublicError;
    }>;

type Checked<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: Code }>;

const accepted = <T>(value: T): Checked<T> => ({ ok: true, value });
const denied = <T>(code: Code): Checked<T> => ({ ok: false, code });

const keysAre = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateRequest(
  method: string,
  input: unknown,
): Checked<DesktopRequest> {
  if (!METHODS.includes(method as DesktopMethod))
    return denied("RESOURCE_UNAVAILABLE");

  const copy = plainData(input);
  if (
    !copy.ok ||
    !record(copy.value) ||
    !keysAre(copy.value, ["version", "requestId", "payload"])
  )
    return denied("VALIDATION");

  if (copy.value.version !== DESKTOP_VERSION) return denied("UPGRADE_REQUIRED");

  const requestId = id(copy.value.requestId, "request");
  if (
    !requestId.ok ||
    !record(copy.value.payload) ||
    !keysAre(copy.value.payload, [])
  )
    return denied("VALIDATION");

  return accepted(
    Object.freeze({
      version: 1,
      requestId: requestId.value,
      payload: Object.freeze({}),
    }),
  );
}

export function validateResponse(
  input: unknown,
  requestId: Id<"request">,
): Checked<DesktopResponse> {
  const copy = plainData(input);
  if (!copy.ok || !record(copy.value) || copy.value.version !== 1)
    return denied("UPGRADE_REQUIRED");

  const correlation = id(copy.value.requestId, "request");
  if (!correlation.ok || correlation.value.value !== requestId.value)
    return denied("VALIDATION");

  if (
    copy.value.status === "accepted" &&
    keysAre(copy.value, ["version", "requestId", "status", "transition"]) &&
    copy.value.transition === "closing"
  )
    return accepted(copy.value as DesktopResponse);

  if (
    copy.value.status === "ok" &&
    keysAre(copy.value, ["version", "requestId", "status", "data"]) &&
    record(copy.value.data)
  ) {
    const data = copy.value.data;
    if (
      keysAre(data, []) ||
      (keysAre(data, ["subscriptionId"]) &&
        typeof data.subscriptionId === "string" &&
        /^[0-9a-f-]{36}$/.test(data.subscriptionId)) ||
      (keysAre(data, ["visible", "minimized", "maximized", "focused"]) &&
        Object.values(data).every((v) => typeof v === "boolean"))
    )
      return accepted(copy.value as DesktopResponse);
  }
  if (
    (copy.value.status === "rejected" ||
      copy.value.status === "outcome_unknown") &&
    keysAre(copy.value, ["version", "requestId", "status", "error"]) &&
    publicError(copy.value.error).ok &&
    record(copy.value.error) &&
    copy.value.error.outcomeCertainty ===
      (copy.value.status === "rejected" ? "not_applied" : "unknown")
  )
    return accepted(copy.value as DesktopResponse);

  return denied("VALIDATION");
}

export function safeError(
  code: Code,
  certainty: "not_applied" | "unknown" = "not_applied",
): PublicError {
  return Object.freeze({
    code,
    messageKey: `error.${code.toLowerCase()}`,
    params: Object.freeze({}),
    diagnosticId: Object.freeze({
      kind: "diagnostic",
      value: globalThis.crypto.randomUUID(),
    }),
    recovery: recoveryFor(code),
    outcomeCertainty: certainty,
  });
}

export const guidance = Object.freeze({
  en: Object.freeze({
    denied:
      "This action is unavailable. Return to the SoloDesk home view or refresh access.",
    linkDenied:
      "This link could not be opened. Return to the SoloDesk home view and check the link.",
    linkUnavailable:
      "This link is not available yet. Return to the SoloDesk home view.",
    failure:
      "SoloDesk could not open this view. Close it and restart the app; your protected work was not replaced.",
    interrupted:
      "The app closed before this action was confirmed. Reopen it and check the current state.",
  }),
  ar: Object.freeze({
    denied:
      "هذا الإجراء غير متاح. عُد إلى الصفحة الرئيسية أو حدّث صلاحية الوصول.",
    linkDenied:
      "تعذّر فتح هذا الرابط. عُد إلى الصفحة الرئيسية وتحقّق من الرابط.",
    linkUnavailable:
      "هذا الرابط غير متاح بعد. عُد إلى الصفحة الرئيسية.",
    failure:
      "تعذّر فتح هذه النافذة. أغلق التطبيق وأعِد تشغيله؛ لم تُستبدل بياناتك المحمية.",
    interrupted:
      "أُغلق التطبيق قبل تأكيد الإجراء. افتحه مجددًا وتحقّق من الحالة الحالية.",
  }),
});

export function boundedEvent(input: unknown): Data | null {
  const safe = plainData(input);
  if (!safe.ok) return null;
  return JSON.stringify(safe.value).length <= Math.min(BOUNDS.errorBytes, 4096)
    ? safe.value
    : null;
}
