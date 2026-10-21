import type { IdentityConfig } from "./config.ts";
import { validateIdentityAccount } from "../../../supabase/functions/_shared/identity-auth.ts";

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
}>;

export type ProviderTokens = Readonly<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}>;

export interface IdentityProviderAdapter {
  exchangeCodeForTokens(params: ExchangeParams): Promise<ProviderTokens>;
  verifySession(tokens: ProviderTokens): Promise<IdTokenPayload>;
  refreshSession?(refreshToken: string): Promise<ProviderTokens>;
  signOut?(accessToken: string): Promise<void>;
}

export class SupabaseProviderAdapter implements IdentityProviderAdapter {
  private readonly config: IdentityConfig;
  constructor(config: IdentityConfig) { this.config = config; }

  async exchangeCodeForTokens(params: ExchangeParams): Promise<ProviderTokens> {
    return this.tokenRequest("pkce", {
      auth_code: params.code,
      code_verifier: params.verifier,
    });
  }

  async refreshSession(refreshToken: string): Promise<ProviderTokens> {
    return this.tokenRequest("refresh_token", { refresh_token: refreshToken });
  }

  private async tokenRequest(grant: string, body: Record<string, string>): Promise<ProviderTokens> {
    const response = await fetch(`${this.config.issuer}/token?grant_type=${grant}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this.config.publishableKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(response.status < 500 ? "invalid_grant" : "provider_unavailable");
    const data = await response.json();
    if (typeof data.access_token !== "string" || !data.access_token ||
      (data.refresh_token !== undefined && typeof data.refresh_token !== "string"))
      throw new Error("invalid_provider_response");
    return Object.freeze({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
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
      headers: { apikey: this.config.publishableKey, Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("session_rejected");
    const user = await response.json();
    if (user.id !== identity.subjectId) throw new Error("account_mismatch");
    // Decode only after signature, issuer, audience and time validation.
    const claims = JSON.parse(Buffer.from(tokens.access_token.split(".")[1], "base64url").toString("utf8"));
    return Object.freeze({
      iss: identity.issuerId,
      sub: identity.subjectId,
      aud: this.config.audience,
      exp: claims.exp,
      iat: claims.iat,
      name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      email: typeof user.email === "string" ? user.email : undefined,
    });
  }

  async signOut(accessToken: string): Promise<void> {
    const response = await fetch(`${this.config.issuer}/logout?scope=local`, {
      method: "POST",
      headers: { apikey: this.config.publishableKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok && response.status !== 401) throw new Error("provider_unavailable");
  }
}
