import crypto from "node:crypto";
import type { IdentityConfig } from "./config.ts";
import type { ProtectedIdentityStore } from "./protected-identity-store.ts";

export type AttemptStatus =
  | "pending"
  | "cancelled"
  | "expired"
  | "consumed"
  | "rejected"
  | "superseded";

export type SignInAttempt = Readonly<{
  attempt_id: string; // Opaque UUID; unique
  profile_id: string;
  profile_generation: number;
  protocol_version: number;
  identity_method: string;
  issuer_id: string;
  application_audience: string;
  state_digest: string;
  nonce_digest: string;
  challenge_method: "S256";
  challenge_reference: string;
  return_destination_id: string;
  created_at: string;
  expires_at: string;
  status: AttemptStatus;
  consumed_at?: string;
  safe_reason_code?: string;
  diagnostic_id?: string;
}>;

export type AttemptProof = Readonly<{
  verifier: string;
  state: string;
  nonce: string;
}>;

export type ConsumeResult =
  | Readonly<{
      success: true;
      attempt: SignInAttempt;
      verifier: string;
      nonce: string;
    }>
  | Readonly<{
      success: false;
      reason: string;
    }>;

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256Base64Url(data: string): string {
  return crypto.createHash("sha256").update(data).digest("base64url");
}

export class AuthAttemptManager {
  private readonly config: IdentityConfig;
  private readonly store?: ProtectedIdentityStore;
  private attempts: Map<string, SignInAttempt> = new Map();
  private proofs: Map<string, AttemptProof> = new Map();

  constructor(config: IdentityConfig, store?: ProtectedIdentityStore) {
    this.config = config;
    this.store = store;
  }

  createAttempt(
    profileId: string,
    profileGeneration: number,
    returnDestinationId: string = "desktop_loopback_v1",
  ): SignInAttempt {
    if (!this.config.destinations[returnDestinationId] || !Number.isSafeInteger(profileGeneration) || profileGeneration < 1)
      throw new Error("invalid_attempt_context");
    // 1. Supersede any existing pending attempt for this profile & generation
    for (const [id, att] of this.attempts.entries()) {
      if (
        att.profile_id === profileId &&
        att.profile_generation === profileGeneration &&
        att.status === "pending"
      ) {
        this.supersedeAttempt(id);
      }
    }

    // 2. Generate cryptographically random high-entropy PKCE verifier, state, and nonce
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = sha256Base64Url(verifier);
    const state = crypto.randomBytes(16).toString("hex");
    const nonce = crypto.randomBytes(16).toString("hex");

    const state_digest = sha256Hex(state);
    const nonce_digest = sha256Hex(nonce);

    const now = Date.now();
    const created_at = new Date(now).toISOString();
    const expires_at = new Date(
      now + this.config.attemptLifetimeMs,
    ).toISOString();
    const attempt_id = crypto.randomUUID();

    const attempt: SignInAttempt = Object.freeze({
      attempt_id,
      profile_id: profileId,
      profile_generation: profileGeneration,
      protocol_version: 1,
      identity_method: "authorization_code",
      issuer_id: this.config.issuer,
      application_audience: this.config.audience,
      state_digest,
      nonce_digest,
      challenge_method: "S256",
      challenge_reference: challenge,
      return_destination_id: returnDestinationId,
      created_at,
      expires_at,
      status: "pending",
    });

    const proof: AttemptProof = Object.freeze({
      verifier,
      state,
      nonce,
    });

    this.attempts.set(attempt_id, attempt);
    this.proofs.set(attempt_id, proof);

    if (this.store) {
      this.store.saveActiveAttempt({
          ...attempt,
          raw_proof: { verifier, state, nonce },
      });
    }

    return attempt;
  }

  getAttempt(attemptId: string): SignInAttempt | null {
    return this.attempts.get(attemptId) || null;
  }

  getAttemptProof(attemptId: string): AttemptProof | null {
    return this.proofs.get(attemptId) || null;
  }

  restoreAttempt(
    profileId: string,
    profileGeneration: number,
    returnDestinationId: string,
  ): SignInAttempt | null {
    if (!this.store) return null;
    const stored = this.store.loadActiveAttempt();
    if (!stored) return null;

    const proof = stored.raw_proof;
    const createdAt = Date.parse(stored.created_at);
    const expiresAt = Date.parse(stored.expires_at);
    const expired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
    const supportedDestination = this.config.destinations[returnDestinationId];
    const valid =
      /^[0-9a-f-]{36}$/i.test(stored.attempt_id) &&
      stored.status === "pending" &&
      stored.profile_id === profileId &&
      stored.profile_generation === profileGeneration &&
      stored.protocol_version === 1 &&
      stored.identity_method === "authorization_code" &&
      stored.issuer_id === this.config.issuer &&
      stored.application_audience === this.config.audience &&
      stored.challenge_method === "S256" &&
      stored.return_destination_id === returnDestinationId &&
      supportedDestination?.transport === "custom_scheme" &&
      Number.isFinite(createdAt) &&
      Number.isFinite(expiresAt) &&
      createdAt < expiresAt &&
      expiresAt - createdAt <= this.config.attemptLifetimeMs &&
      !expired &&
      Boolean(
        proof &&
        typeof proof.verifier === "string" &&
        proof.verifier.length > 0 &&
        typeof proof.state === "string" &&
        proof.state.length > 0 &&
        typeof proof.nonce === "string" &&
        proof.nonce.length > 0 &&
        stored.challenge_reference === sha256Base64Url(proof.verifier) &&
        stored.state_digest === sha256Hex(proof.state) &&
        stored.nonce_digest === sha256Hex(proof.nonce),
      );

    if (!valid) {
      this.store.saveActiveAttempt({
        ...stored,
        status: expired ? "expired" : "cancelled",
        safe_reason_code: expired
          ? "attempt_expired"
          : "attempt_restart_validation_failed",
        raw_proof: undefined,
      });
      return null;
    }

    const { raw_proof: rawProof, ...attempt } = stored;
    void rawProof;
    const restoredAttempt = Object.freeze(attempt) as SignInAttempt;
    this.attempts.set(restoredAttempt.attempt_id, restoredAttempt);
    this.proofs.set(restoredAttempt.attempt_id, Object.freeze({ ...proof! }));
    return restoredAttempt;
  }

  findPendingAttemptByState(
    rawState: string,
    profileId: string,
    profileGeneration: number,
  ): SignInAttempt | null {
    const stateDigest = sha256Hex(rawState);
    for (const att of this.attempts.values()) {
      if (
        att.profile_id === profileId &&
        att.profile_generation === profileGeneration &&
        att.status === "pending" &&
        att.state_digest === stateDigest
      ) {
        return att;
      }
    }
    return null;
  }

  isExpired(attemptId: string): boolean {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return true;
    return Date.parse(attempt.expires_at) <= Date.now();
  }

  cancelAttempt(
    attemptId: string,
    profileId: string,
    profileGeneration: number,
  ): boolean {
    const attempt = this.attempts.get(attemptId);
    if (
      !attempt ||
      attempt.profile_id !== profileId ||
      attempt.profile_generation !== profileGeneration ||
      attempt.status !== "pending"
    ) {
      return false;
    }

    this.attempts.set(
      attemptId,
      Object.freeze({
        ...attempt,
        status: "cancelled",
        safe_reason_code: "cancelled_by_user",
      }),
    );
    this.proofs.delete(attemptId);
    if (this.store) {
      this.store.clearActiveAttempt();
    }
    return true;
  }

  private supersedeAttempt(attemptId: string): void {
    const attempt = this.attempts.get(attemptId);
    if (attempt && attempt.status === "pending") {
      this.attempts.set(
        attemptId,
        Object.freeze({
          ...attempt,
          status: "superseded",
          safe_reason_code: "superseded_by_new_attempt",
        }),
      );
      this.proofs.delete(attemptId);
    }
  }

  consumeAttempt(
    attemptId: string,
    rawState: string,
    profileId: string,
    profileGeneration: number,
  ): ConsumeResult {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      return Object.freeze({ success: false, reason: "attempt_not_found" });
    }

    if (
      attempt.profile_id !== profileId ||
      attempt.profile_generation !== profileGeneration
    ) {
      return Object.freeze({ success: false, reason: "profile_mismatch" });
    }

    if (attempt.status !== "pending") {
      return Object.freeze({ success: false, reason: "invalid_attempt_state" });
    }

    if (Date.parse(attempt.expires_at) <= Date.now()) {
      this.attempts.set(
        attemptId,
        Object.freeze({
          ...attempt,
          status: "expired",
          safe_reason_code: "attempt_expired",
        }),
      );
      this.proofs.delete(attemptId);
      return Object.freeze({ success: false, reason: "attempt_expired" });
    }

    const proof = this.proofs.get(attemptId);
    if (!proof) {
      return Object.freeze({ success: false, reason: "attempt_proof_missing" });
    }

    // Constant-time compare state
    const stateDigest = sha256Hex(rawState);
    if (stateDigest !== attempt.state_digest) {
      return Object.freeze({ success: false, reason: "state_mismatch" });
    }

    // Atomically transition pending -> consumed
    const consumedAttempt: SignInAttempt = Object.freeze({
      ...attempt,
      status: "consumed",
      consumed_at: new Date().toISOString(),
      safe_reason_code: "consumed_normally",
    });

    this.attempts.set(attemptId, consumedAttempt);
    // Delete proof from memory so it can never be consumed again
    this.proofs.delete(attemptId);

    if (this.store) {
      this.store.clearActiveAttempt();
    }

    return Object.freeze({
      success: true,
      attempt: consumedAttempt,
      verifier: proof.verifier,
      nonce: proof.nonce,
    });
  }
}
