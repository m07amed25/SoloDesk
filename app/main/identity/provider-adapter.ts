import type { IdentityConfig } from "./config.ts";
import { validateIdentityAccount } from "../../../supabase/functions/_shared/identity-auth.ts";
import {
  type ProviderSecurityProjection,
  type FactorSummary,
  validateProviderSecurityProjection,
} from "./account-security.ts";
import type {
  AalLevel,
  RecoveryStatus,
} from "../../shared/identity-security-contracts.ts";
import { isAllowedIdentityAvatarUrl } from "../../shared/identity-contracts.ts";

export type ExchangeParams = Readonly<{
  code: string;
  verifier: string;
  redirectUri: string;
}>;

export type IdTokenPayload = Readonly<{
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getGoogleAvatarUrl(user: unknown): string | undefined {
  const record = asRecord(user);
  if (!record) return undefined;

  const candidates: unknown[] = [];
  if (Array.isArray(record.identities)) {
    for (const identity of record.identities) {
      const entry = asRecord(identity);
      if (entry?.provider !== "google") continue;
      const data = asRecord(entry.identity_data);
      candidates.push(data?.avatar_url, data?.picture);
    }
  }

  const appMetadata = asRecord(record.app_metadata);
  const providers = Array.isArray(appMetadata?.providers)
    ? appMetadata.providers
    : [];
  if (appMetadata?.provider === "google" || providers.includes("google")) {
    const metadata = asRecord(record.user_metadata);
    candidates.push(metadata?.avatar_url, metadata?.picture);
  }

  return candidates.find(isAllowedIdentityAvatarUrl);
}

export type ProviderTokens = Readonly<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}>;

export type PasswordSignUpResult = Readonly<{
  confirmationRequired: boolean;
  tokens?: ProviderTokens;
}>;

export interface IdentityProviderAdapter {
  exchangeCodeForTokens(params: ExchangeParams): Promise<ProviderTokens>;
  signInWithPassword?(email: string, password: string): Promise<ProviderTokens>;
  signUpWithPassword?(
    email: string,
    password: string,
  ): Promise<PasswordSignUpResult>;
  verifySession(tokens: ProviderTokens): Promise<IdTokenPayload>;
  refreshSession?(refreshToken: string): Promise<ProviderTokens>;
  signOut?(accessToken: string): Promise<void>;
  observeSecurityProjection(
    tokens: ProviderTokens,
    verifiedAccount: { issuerId: string; subjectId: string },
  ): Promise<ProviderSecurityProjection>;
  observeRecoveryStatus?(
    tokens: ProviderTokens,
    verifiedAccount: { issuerId: string; subjectId: string },
  ): Promise<RecoveryStatus>;
  verifyRecoveryCode?(
    tokens: ProviderTokens,
    code: string,
  ): Promise<{ success: boolean; upgradedAal: AalLevel }>;
  requestPrimaryRecovery?(
    identifier: string,
  ): Promise<{ status: "recovery_requested" }>;
}

export class SupabaseProviderAdapter implements IdentityProviderAdapter {
  private readonly config: IdentityConfig;
  constructor(config: IdentityConfig) {
    this.config = config;
  }

  async exchangeCodeForTokens(params: ExchangeParams): Promise<ProviderTokens> {
    return this.tokenRequest("pkce", {
      auth_code: params.code,
      code_verifier: params.verifier,
    });
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<ProviderTokens> {
    return this.tokenRequest("password", { email, password });
  }

  async signUpWithPassword(
    email: string,
    password: string,
  ): Promise<PasswordSignUpResult> {
    const response = await fetch(`${this.config.issuer}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.config.publishableKey,
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      throw new Error(
        response.status < 500 ? "invalid_credentials" : "provider_unavailable",
      );
    }
    const data = await response.json();
    if (typeof data.access_token !== "string" || !data.access_token) {
      return Object.freeze({ confirmationRequired: true });
    }
    return Object.freeze({
      confirmationRequired: false,
      tokens: this.parseTokens(data),
    });
  }

  async refreshSession(refreshToken: string): Promise<ProviderTokens> {
    return this.tokenRequest("refresh_token", { refresh_token: refreshToken });
  }

  private async tokenRequest(
    grant: string,
    body: Record<string, string>,
  ): Promise<ProviderTokens> {
    const response = await fetch(
      `${this.config.issuer}/token?grant_type=${grant}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.config.publishableKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new Error(
        response.status < 500 ? "invalid_grant" : "provider_unavailable",
      );
    const data = await response.json();
    return this.parseTokens(data);
  }

  private parseTokens(data: Record<string, unknown>): ProviderTokens {
    if (
      typeof data.access_token !== "string" ||
      !data.access_token ||
      (data.refresh_token !== undefined &&
        typeof data.refresh_token !== "string") ||
      (data.expires_in !== undefined && typeof data.expires_in !== "number")
    )
      throw new Error("invalid_provider_response");
    return Object.freeze({
      access_token: data.access_token,
      refresh_token: data.refresh_token as string | undefined,
      expires_in: data.expires_in as number | undefined,
    });
  }

  async verifySession(tokens: ProviderTokens): Promise<IdTokenPayload> {
    const identity = await validateIdentityAccount(
      new Request(`${this.config.issuer}/user`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      { issuer: this.config.issuer, audience: this.config.audience },
    );
    if (!identity) throw new Error("invalid_session_signature");
    const response = await fetch(`${this.config.issuer}/user`, {
      headers: {
        apikey: this.config.publishableKey,
        Authorization: `Bearer ${tokens.access_token}`,
      },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("session_rejected");
    const user = await response.json();
    if (user.id !== identity.subjectId) throw new Error("account_mismatch");
    // Decode only after signature, issuer, audience and time validation.
    const claims = JSON.parse(
      Buffer.from(tokens.access_token.split(".")[1], "base64url").toString(
        "utf8",
      ),
    );
    return Object.freeze({
      iss: identity.issuerId,
      sub: identity.subjectId,
      aud: this.config.audience,
      exp: claims.exp,
      iat: claims.iat,
      name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
      email: typeof user.email === "string" ? user.email : undefined,
      avatar_url: getGoogleAvatarUrl(user),
    });
  }

  async signOut(accessToken: string): Promise<void> {
    const response = await fetch(`${this.config.issuer}/logout?scope=local`, {
      method: "POST",
      headers: {
        apikey: this.config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok && response.status !== 401)
      throw new Error("provider_unavailable");
  }

  async observeSecurityProjection(
    tokens: ProviderTokens,
    verifiedAccount: { issuerId: string; subjectId: string },
  ): Promise<ProviderSecurityProjection> {
    if (
      !tokens ||
      typeof tokens.access_token !== "string" ||
      !tokens.access_token.includes(".")
    ) {
      throw new Error("invalid_session_signature");
    }

    let claims: {
      iss?: string;
      sub?: string;
      session_id?: string;
      aal?: string;
      exp?: number;
      iat?: number;
      amr?: Array<{ method: string }>;
    };

    try {
      claims = JSON.parse(
        Buffer.from(tokens.access_token.split(".")[1], "base64url").toString(
          "utf8",
        ),
      );
    } catch {
      throw new Error("invalid_session_signature");
    }

    if (!claims || typeof claims !== "object") {
      throw new Error("invalid_session_signature");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && claims.exp <= nowSec) {
      throw new Error("session_rejected");
    }

    if (claims.iss && claims.iss !== verifiedAccount.issuerId) {
      throw new Error("account_mismatch");
    }

    if (claims.sub && claims.sub !== verifiedAccount.subjectId) {
      throw new Error("account_mismatch");
    }

    let userResponse: Response;
    try {
      userResponse = await fetch(`${this.config.issuer}/user`, {
        headers: {
          apikey: this.config.publishableKey,
          Authorization: `Bearer ${tokens.access_token}`,
        },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new Error("provider_unavailable");
    }

    if (!userResponse.ok) {
      if (userResponse.status === 401) throw new Error("session_rejected");
      if (userResponse.status === 429) throw new Error("rate_limited");
      throw new Error("provider_unavailable");
    }

    let userData: { id?: string; factors?: unknown[] };
    try {
      userData = await userResponse.json();
    } catch {
      throw new Error("provider_unavailable");
    }

    if (
      !userData ||
      typeof userData !== "object" ||
      userData.id !== verifiedAccount.subjectId
    ) {
      throw new Error("account_mismatch");
    }

    const factorSummaries: FactorSummary[] = [];
    let hasVerifiedTotp = false;

    if (Array.isArray(userData.factors)) {
      for (const factor of userData.factors) {
        if (!factor || typeof factor !== "object") continue;
        const f = factor as Record<string, unknown>;
        if (f.factor_type === "totp" && typeof f.id === "string") {
          const isVerified = f.status === "verified";
          if (isVerified) hasVerifiedTotp = true;
          factorSummaries.push(
            Object.freeze({
              id: f.id,
              type: "totp",
              status: isVerified ? "verified" : "unverified",
              friendly_name:
                typeof f.friendly_name === "string" &&
                f.friendly_name.length > 0
                  ? f.friendly_name
                  : "Authenticator App",
              created_at:
                typeof f.created_at === "string"
                  ? f.created_at
                  : new Date().toISOString(),
              updated_at:
                typeof f.updated_at === "string"
                  ? f.updated_at
                  : new Date().toISOString(),
            }),
          );
        }
      }
    }

    const currentAal: AalLevel = claims.aal === "aal2" ? "aal2" : "aal1";
    const nextAal: AalLevel =
      claims.aal === "aal2" ? "aal2" : hasVerifiedTotp ? "aal2" : "aal1";
    const recoveryStatus: RecoveryStatus = hasVerifiedTotp
      ? "available"
      : "not_generated";

    const projection: ProviderSecurityProjection = Object.freeze({
      issuer_id: verifiedAccount.issuerId,
      subject_id: verifiedAccount.subjectId,
      session_id:
        typeof claims.session_id === "string" && claims.session_id.length > 0
          ? claims.session_id
          : `sess_mock_${verifiedAccount.subjectId}`,
      current_aal: currentAal,
      next_aal: nextAal,
      factor_summaries: Object.freeze(factorSummaries),
      recovery_status: recoveryStatus,
      provider_observed_at: new Date().toISOString(),
      capability_version: "supabase-auth-v2-totp-rc-v1",
    });

    if (!validateProviderSecurityProjection(projection)) {
      throw new Error("provider_unavailable");
    }

    return projection;
  }

  async observeRecoveryStatus(
    tokens: ProviderTokens,
    verifiedAccount: { issuerId: string; subjectId: string },
  ): Promise<RecoveryStatus> {
    const projection = await this.observeSecurityProjection(
      tokens,
      verifiedAccount,
    );
    return projection.recovery_status;
  }

  async verifyRecoveryCode(
    tokens: ProviderTokens,
    code: string,
  ): Promise<{ success: boolean; upgradedAal: AalLevel }> {
    void tokens;
    void code;
    throw new Error("unsupported_capability");
  }

  async requestPrimaryRecovery(
    identifier: string,
  ): Promise<{ status: "recovery_requested" }> {
    void identifier;
    throw new Error("unsupported_capability");
  }
}
