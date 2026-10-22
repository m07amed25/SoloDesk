import crypto from "node:crypto";
import type { IdentityConfig } from "./config.ts";
import type { ProtectedIdentityStore } from "./protected-identity-store.ts";
import type { IdentityProviderAdapter, ProviderTokens } from "./provider-adapter.ts";
import type {
  ProtectedSessionBinding,
  SessionStatus,
} from "../../shared/identity-contracts.ts";

export type VerifiedAccount = Readonly<{
  issuer_id: string; // Composite stable identity; unique
  subject_id: string;
  verification_status: "verified";
  display_name?: string;
  display_identifier?: string;
  avatar_url?: string;
  session_status: SessionStatus;
  verified_at: string;
  diagnostic_id?: string;
}>;

export type ExchangeRequest = Readonly<{
  code: string;
  verifier: string;
  redirectUri: string;
  profileId: string;
  profileGeneration: number;
  expectedNonce: string;
  isCurrent?: () => boolean;
}>;

export type AdoptSessionRequest = Readonly<{
  tokens: ProviderTokens;
  profileId: string;
  profileGeneration: number;
  expectedNonce?: string;
  isCurrent?: () => boolean;
}>;

export type ExchangeResult =
  | Readonly<{
      success: true;
      account: VerifiedAccount;
      sessionBinding: ProtectedSessionBinding;
    }>
  | Readonly<{
      success: false;
      reason: string;
      diagnosticId: string;
    }>;

export type SignOutResult = Readonly<{
  profileGeneration: number;
  retainedWork: "none" | "present" | "unknown";
}>;

function maskIdentifier(id: string): string {
  if (id.includes("@")) {
    const parts = id.split("@");
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 1 ? `${name[0]}***` : "***";
    return `${maskedName}@${domain}`;
  }
  if (id.length <= 4) return "***";
  return `${id.slice(0, 2)}***${id.slice(-2)}`;
}

export class SessionOwner {
  private readonly config: IdentityConfig;
  private readonly store: ProtectedIdentityStore;
  private readonly provider: IdentityProviderAdapter;
  private currentAccount: VerifiedAccount | null = null;
  private currentBinding: ProtectedSessionBinding | null = null;
  private operationGeneration = 0;

  constructor(
    config: IdentityConfig,
    store: ProtectedIdentityStore,
    provider: IdentityProviderAdapter,
  ) {
    this.config = config;
    this.store = store;
    this.provider = provider;
  }

  getCurrentAccount(): VerifiedAccount | null {
    return this.currentAccount;
  }

  getCurrentBinding(): ProtectedSessionBinding | null {
    return this.currentBinding;
  }

  getAccessToken(): string {
    if (!this.currentBinding || this.currentBinding.status !== "current")
      throw new Error("session_rejected");
    const credentials = this.store.loadEncryptedCredentials();
    if (!credentials?.accessToken) throw new Error("session_rejected");
    return credentials.accessToken;
  }

  async restore(binding: ProtectedSessionBinding, isCurrent: () => boolean): Promise<VerifiedAccount | null> {
    const generation = this.operationGeneration;
    this.store.assertProtectionUsable();
    let credentials = this.store.loadEncryptedCredentials();
    if (!credentials?.accessToken) return null;
    let tokens: ProviderTokens = { access_token: credentials.accessToken, refresh_token: credentials.refreshToken };
    let identity;
    try {
      identity = await this.provider.verifySession(tokens);
    } catch {
      if (!tokens.refresh_token || !this.provider.refreshSession) return null;
      tokens = await this.provider.refreshSession(tokens.refresh_token);
      identity = await this.provider.verifySession(tokens);
    }
    if (generation !== this.operationGeneration || !isCurrent()) return null;
    if (identity.iss !== binding.issuer_id || identity.sub !== binding.subject_id) return null;
    this.store.saveEncryptedCredentials({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    this.currentBinding = binding;
    this.currentAccount = Object.freeze({
      issuer_id: identity.iss,
      subject_id: identity.sub,
      verification_status: "verified",
      session_status: "current",
      verified_at: new Date().toISOString(),
      display_name: identity.name?.slice(0, 128),
      display_identifier: maskIdentifier(identity.email || identity.sub),
      avatar_url: identity.avatar_url,
    });
    credentials = null;
    return this.currentAccount;
  }

  async exchangeAndVerify(request: ExchangeRequest): Promise<ExchangeResult> {
    const diagnosticId = crypto.randomUUID();
    const operationGeneration = this.operationGeneration;

    let tokens;
    try {
      this.store.assertProtectionUsable();
      tokens = await this.provider.exchangeCodeForTokens({
        code: request.code,
        verifier: request.verifier,
        redirectUri: request.redirectUri,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "exchange_failed";
      return Object.freeze({
        success: false,
        reason:
          msg === "invalid_grant" ? "invalid_grant" : "provider_unavailable",
        diagnosticId,
      });
    }

    return this.adoptSession(
      {
        tokens,
        profileId: request.profileId,
        profileGeneration: request.profileGeneration,
        expectedNonce: request.expectedNonce,
        isCurrent: request.isCurrent,
      },
      diagnosticId,
      operationGeneration,
    );
  }

  async adoptSession(
    request: AdoptSessionRequest,
    diagnosticId = crypto.randomUUID(),
    operationGeneration = this.operationGeneration,
  ): Promise<ExchangeResult> {

    let idToken;
    try {
      this.store.assertProtectionUsable();
      idToken = await this.provider.verifySession(request.tokens);
    } catch {
      return Object.freeze({
        success: false,
        reason: "session_rejected",
        diagnosticId,
      });
    }

    // 1. Verify issuer
    if (idToken.iss !== this.config.issuer) {
      return Object.freeze({
        success: false,
        reason: "issuer_mismatch",
        diagnosticId,
      });
    }

    // 2. Verify audience
    if (idToken.aud !== this.config.audience) {
      return Object.freeze({
        success: false,
        reason: "audience_mismatch",
        diagnosticId,
      });
    }

    // 3. Verify nonce
    if (
      request.expectedNonce !== undefined &&
      idToken.nonce !== undefined &&
      idToken.nonce !== request.expectedNonce
    ) {
      return Object.freeze({
        success: false,
        reason: "nonce_mismatch",
        diagnosticId,
      });
    }

    // 4. Verify expiry with 60s clock skew allowance
    const nowSec = Math.floor(Date.now() / 1000);
    if (!idToken.sub || !Number.isSafeInteger(idToken.exp) || idToken.exp <= nowSec ||
      !Number.isSafeInteger(idToken.iat) || idToken.iat > nowSec + 60 || idToken.iat >= idToken.exp) {
      return Object.freeze({
        success: false,
        reason: "token_expired",
        diagnosticId,
      });
    }

    // 5. Build VerifiedAccount (never use email as identity key; sub is subject_id)
    const verifiedAccount: VerifiedAccount = Object.freeze({
      issuer_id: idToken.iss,
      subject_id: idToken.sub,
      verification_status: "verified",
      display_name: idToken.name?.slice(0, 128),
      display_identifier: idToken.email
        ? maskIdentifier(idToken.email)
        : maskIdentifier(idToken.sub),
      avatar_url: idToken.avatar_url,
      session_status: "current",
      verified_at: new Date().toISOString(),
      diagnostic_id: diagnosticId,
    });

    // 6. Build ProtectedSessionBinding
    const bindingId = crypto.randomUUID();
    const credRef = `cred_${crypto.randomUUID()}`;

    const sessionBinding: ProtectedSessionBinding = Object.freeze({
      binding_id: bindingId,
      profile_id: request.profileId,
      profile_generation: request.profileGeneration,
      issuer_id: verifiedAccount.issuer_id,
      subject_id: verifiedAccount.subject_id,
      credential_reference: credRef,
      session_generation: 1,
      status: "current",
      protected_write_status: "committed",
      validated_at: verifiedAccount.verified_at,
    });

    if (operationGeneration !== this.operationGeneration || (request.isCurrent && !request.isCurrent())) {
      return Object.freeze({ success: false, reason: "session_invalidated", diagnosticId });
    }

    // 7. Store encrypted credentials in protected identity store
    try {
      this.store.assertProtectionUsable();
      const profile = this.store.loadProfile();
      if (profile && (profile.issuer_id !== idToken.iss || profile.subject_id !== idToken.sub ||
        profile.profile_generation !== request.profileGeneration)) {
        return Object.freeze({ success: false, reason: "account_mismatch", diagnosticId });
      }
      if (!profile) this.store.saveProfile({
        profile_id: request.profileId,
        issuer_id: idToken.iss,
        subject_id: idToken.sub,
        protection_binding_id: `protection:${request.profileId}`,
        profile_generation: request.profileGeneration,
        compatibility_version: 1,
        lifecycle: "enrolling",
        last_transition_at: new Date().toISOString(),
      });
      this.store.saveEncryptedCredentials(
        {
          accessToken: request.tokens.access_token,
          refreshToken: request.tokens.refresh_token,
        },
      );
      this.store.saveSessionBinding(sessionBinding);
    } catch {
      return Object.freeze({
        success: false,
        reason: "protected_store_write_failed",
        diagnosticId,
      });
    }

    this.currentAccount = verifiedAccount;
    this.currentBinding = sessionBinding;

    return Object.freeze({
      success: true,
      account: verifiedAccount,
      sessionBinding,
    });
  }

  signOut(generationIncrement: boolean = true): SignOutResult {
    this.operationGeneration += 1;
    let accessToken: string | undefined;
    try { accessToken = this.store.loadEncryptedCredentials()?.accessToken; } catch { /* Local removal still proceeds. */ }
    let profileGeneration = (this.currentBinding?.profile_generation ?? 0) + 1;
    let retainedWork: SignOutResult["retainedWork"] = "unknown";
    try {
      const profile = this.store.loadProfile();
      profileGeneration = generationIncrement
        ? (profile?.profile_generation ?? this.currentBinding?.profile_generation ?? 0) + 1
        : (profile?.profile_generation ?? this.currentBinding?.profile_generation ?? 1);
      retainedWork = profile?.retained_work_status ?? (profile ? "unknown" : "none");
      if (profile) this.store.saveProfile({
        ...profile, profile_generation: profileGeneration, lifecycle: "sign_in_required",
        retained_work_status: retainedWork, last_transition_at: new Date().toISOString(),
      });
    } finally {
      this.currentBinding = null;
      this.currentAccount = null;
      this.store.clearSessionBinding();
      if (accessToken && this.provider.signOut)
        void this.provider.signOut(accessToken).catch(() => {});
    }
    return Object.freeze({ profileGeneration, retainedWork });
  }
}
