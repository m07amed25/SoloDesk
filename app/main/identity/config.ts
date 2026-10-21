import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export function identityEnvironment(directory: string, environment = process.env): Record<string, string | undefined> {
  const file = path.join(directory, ".env.local");
  const local = fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
  const allowed = Object.fromEntries(Object.entries(local).filter(([key]) =>
    key.startsWith("SOLODESK_AUTH_") || ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].includes(key),
  ));
  return { ...allowed, ...environment };
}

export type CallbackTransport = "loopback" | "custom_scheme";

export type CallbackDestinationConfig = Readonly<{
  destinationId: string;
  transport: CallbackTransport;
  scheme: string;
  host: string;
  path: string;
}>;

export type IdentityConfig = Readonly<{
  hostedOrigin: string;
  hostedPath: string;
  issuer: string;
  audience: string;
  destinations: Readonly<Record<string, CallbackDestinationConfig>>;
  pkceMethod: "S256";
  attemptLifetimeMs: number;
  maxQueryBytes: number;
  maxDeviceLabelLength: number;
  publishableKey: string;
  publicRegistrationEnabled: boolean;
}>;

export function parseIdentityConfig(
  env: Record<string, string | undefined> = process.env,
): IdentityConfig {
  const isTest = env.NODE_ENV === "test" || env.SOLODESK_TEST_MODE === "1";

  const rawHostedOrigin =
    env.SOLODESK_AUTH_HOSTED_ORIGIN ||
    (isTest ? "https://auth.solodesk.test" : undefined);
  if (!rawHostedOrigin) {
    throw new Error("missing_hosted_origin");
  }

  let hostedOriginUrl: URL;
  try {
    hostedOriginUrl = new URL(rawHostedOrigin);
  } catch {
    throw new Error("invalid_hosted_origin");
  }

  if (
    hostedOriginUrl.protocol !== "https:" &&
    !(
      isTest &&
      hostedOriginUrl.protocol === "http:" &&
      (hostedOriginUrl.hostname === "127.0.0.1" ||
        hostedOriginUrl.hostname === "localhost")
    )
  ) {
    throw new Error("hosted_origin_must_be_https");
  }

  const hostedOrigin = hostedOriginUrl.origin;
  const hostedPath = env.SOLODESK_AUTH_HOSTED_PATH || "/auth/signin";
  if (!hostedPath.startsWith("/")) {
    throw new Error("invalid_hosted_path");
  }

  const rawIssuer =
    env.SOLODESK_AUTH_ISSUER ||
    (env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/auth/v1` : undefined) ||
    (isTest ? "https://auth.solodesk.test" : undefined);
  if (!rawIssuer) {
    throw new Error("missing_auth_issuer");
  }

  let issuerUrl: URL;
  try {
    issuerUrl = new URL(rawIssuer);
  } catch {
    throw new Error("invalid_auth_issuer");
  }

  if (
    issuerUrl.protocol !== "https:" &&
    !(isTest && issuerUrl.protocol === "http:")
  ) {
    throw new Error("auth_issuer_must_be_https");
  }

  const issuer = issuerUrl.toString().replace(/\/$/, "");
  const audience = env.SOLODESK_AUTH_AUDIENCE || (env.VITE_SUPABASE_URL ? "authenticated" : "solodesk-desktop");
  if (!audience || audience.trim().length === 0) {
    throw new Error("invalid_auth_audience");
  }

  const publishableKey =
    env.SOLODESK_AUTH_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (isTest ? "sb_pub_test_key_non_secret" : "");
  if (!publishableKey && !isTest) {
    throw new Error("missing_publishable_key");
  }

  if (publishableKey) {
    if (
      publishableKey.toLowerCase().includes("service_role") ||
      publishableKey.toLowerCase().includes("secret_key")
      || publishableKey.startsWith("sb_secret_")
    ) {
      throw new Error("service_role_key_prohibited");
    }
  }

  const pkceMethod = (env.SOLODESK_AUTH_PKCE_METHOD || "S256") as "S256";
  if (pkceMethod !== "S256") {
    throw new Error("unsupported_pkce_method");
  }

  const attemptLifetimeMs = Number(
    env.SOLODESK_AUTH_ATTEMPT_LIFETIME_MS || 300000,
  );
  if (
    !Number.isSafeInteger(attemptLifetimeMs) ||
    attemptLifetimeMs <= 0 ||
    attemptLifetimeMs > 3600000
  ) {
    throw new Error("invalid_attempt_lifetime");
  }

  const maxQueryBytes = Number(env.SOLODESK_AUTH_MAX_QUERY_BYTES || 2048);
  if (
    !Number.isSafeInteger(maxQueryBytes) ||
    maxQueryBytes <= 0 ||
    maxQueryBytes > 16384
  ) {
    throw new Error("invalid_max_query_bytes");
  }

  const maxDeviceLabelLength = 64;
  const publicRegistrationEnabled =
    env.SOLODESK_AUTH_PUBLIC_REGISTRATION === "true";

  const destinations: Record<string, CallbackDestinationConfig> = {
    desktop_loopback_v1: Object.freeze({
      destinationId: "desktop_loopback_v1",
      transport: "loopback",
      scheme: "http",
      host: "127.0.0.1",
      path: "/auth/callback",
    }),
    desktop_custom_scheme_v1: Object.freeze({
      destinationId: "desktop_custom_scheme_v1",
      transport: "custom_scheme",
      scheme: "solodesk",
      host: "auth",
      path: "/callback",
    }),
  };

  return Object.freeze({
    hostedOrigin,
    hostedPath,
    issuer,
    audience,
    destinations: Object.freeze(destinations),
    pkceMethod,
    attemptLifetimeMs,
    maxQueryBytes,
    maxDeviceLabelLength,
    publishableKey,
    publicRegistrationEnabled,
  });
}
