import type { IdentityConfig } from "./config.ts";
import { hasControlCharacters } from "../../shared/identity-contracts.ts";

export type CallbackParseResult =
  | Readonly<{
      type: "success";
      code: string;
      state: string;
      responseIssuer?: string;
    }>
  | Readonly<{
      type: "error";
      error: string;
      state: string;
      responseIssuer?: string;
    }>
  | Readonly<{
      type: "invalid";
      reason: string;
    }>;

const ALLOWED_QUERY_KEYS = new Set([
  "code",
  "state",
  "error",
  "error_description",
  "iss",
]);

export function parseAuthCallback(
  rawUrl: string,
  config: IdentityConfig,
  expectedRedirectUri?: string,
): CallbackParseResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return Object.freeze({ type: "invalid", reason: "empty_callback_url" });
  }

  if (Buffer.byteLength(rawUrl, "utf-8") > config.maxQueryBytes) {
    return Object.freeze({ type: "invalid", reason: "payload_too_large" });
  }

  if (rawUrl.includes("#")) {
    return Object.freeze({ type: "invalid", reason: "fragments_prohibited" });
  }

  if (hasControlCharacters(rawUrl)) {
    return Object.freeze({
      type: "invalid",
      reason: "control_characters_prohibited",
    });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Object.freeze({ type: "invalid", reason: "malformed_url" });
  }

  let destinationMatched = false;
  if (url.username || url.password || url.hash) return Object.freeze({ type: "invalid", reason: "unapproved_callback_destination" });
  if (expectedRedirectUri) {
    const expected = new URL(expectedRedirectUri);
    if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname)
      return Object.freeze({ type: "invalid", reason: "unapproved_callback_destination" });
  }
  for (const dest of Object.values(config.destinations)) {
    if (dest.transport === "loopback") {
      if (
        url.protocol === `${dest.scheme}:` &&
        url.hostname === dest.host &&
        url.pathname === dest.path
      ) {
        destinationMatched = true;
        break;
      }
    } else if (dest.transport === "custom_scheme") {
      if (
        url.protocol === `${dest.scheme}:` &&
        url.hostname === dest.host &&
        url.pathname === dest.path
      ) {
        destinationMatched = true;
        break;
      }
    }
  }

  if (!destinationMatched) {
    return Object.freeze({
      type: "invalid",
      reason: "unapproved_callback_destination",
    });
  }

  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : "";
  if (!rawQuery) {
    return Object.freeze({
      type: "invalid",
      reason: "missing_code_or_error",
    });
  }

  const seenKeys = new Set<string>();
  const pairs = rawQuery.split("&");
  for (const pair of pairs) {
    try { decodeURIComponent(pair); } catch {
      return Object.freeze({ type: "invalid", reason: "malformed_encoding" });
    }
    const key = pair.split("=")[0];
    if (seenKeys.has(key)) {
      return Object.freeze({
        type: "invalid",
        reason: "duplicate_query_keys",
      });
    }
    seenKeys.add(key);
  }

  for (const key of seenKeys) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return Object.freeze({
        type: "invalid",
        reason: "unknown_query_keys",
      });
    }
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const iss = url.searchParams.get("iss");

  if (!state || state.trim().length === 0) {
    return Object.freeze({ type: "invalid", reason: "missing_state" });
  }

  for (const param of [code, error, state, iss]) {
    if (param && hasControlCharacters(param)) {
      return Object.freeze({
        type: "invalid",
        reason: "control_characters_prohibited",
      });
    }
  }

  for (const param of [code, error, state]) {
    if (param && /^[a-z]+:\/\//i.test(param)) {
      return Object.freeze({
        type: "invalid",
        reason: "nested_destinations_prohibited",
      });
    }
  }

  if (code && error) {
    return Object.freeze({
      type: "invalid",
      reason: "ambiguous_callback_fields",
    });
  }

  if (!code && !error) {
    return Object.freeze({
      type: "invalid",
      reason: "missing_code_or_error",
    });
  }

  if (iss && config.issuer) {
    if (iss !== config.issuer) {
      return Object.freeze({
        type: "invalid",
        reason: "issuer_mismatch",
      });
    }
  }

  if (code) {
    return Object.freeze({
      type: "success",
      code,
      state,
      responseIssuer: iss || undefined,
    });
  }

  return Object.freeze({
    type: "error",
    error: error!,
    state,
    responseIssuer: iss || undefined,
  });
}
