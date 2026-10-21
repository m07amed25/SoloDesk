import type { VerifiedIdentityContext } from "./identity-auth.ts";
import {
  type SecurityPurpose,
  type SecuritySetupState,
  type RecoveryHandoffState,
  type ProviderEffect,
  isSecurityPurpose,
  containsProhibitedSecurityKey,
} from "../../../app/shared/identity-security-contracts.ts";

export interface AccountSecurityDatabase {
  getState(identity: VerifiedIdentityContext): Promise<unknown>;
  begin(identity: VerifiedIdentityContext, payload: unknown): Promise<unknown>;
  observe(
    identity: VerifiedIdentityContext,
    payload: unknown,
  ): Promise<unknown>;
  acknowledgeRecoveryCodes(
    identity: VerifiedIdentityContext,
    payload: unknown,
  ): Promise<unknown>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST_REGEX = /^[0-9a-f]{64}$/;

export interface BeginOperationPayload {
  operationId: string;
  purpose: SecurityPurpose;
  expectedGeneration: number;
  requestDigest: string;
  policyVersion: string;
}

export function parseBeginOperationPayload(
  val: unknown,
): BeginOperationPayload | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const p = val as Record<string, unknown>;

  if (containsProhibitedSecurityKey(p)) return null;

  if (typeof p.operationId !== "string" || !UUID_REGEX.test(p.operationId)) {
    return null;
  }
  if (!isSecurityPurpose(p.purpose)) {
    return null;
  }
  if (
    typeof p.expectedGeneration !== "number" ||
    !Number.isSafeInteger(p.expectedGeneration) ||
    p.expectedGeneration < 1
  ) {
    return null;
  }
  if (
    typeof p.requestDigest !== "string" ||
    !DIGEST_REGEX.test(p.requestDigest)
  ) {
    return null;
  }
  if (
    typeof p.policyVersion !== "string" ||
    p.policyVersion.length === 0 ||
    p.policyVersion.length > 64
  ) {
    return null;
  }

  return {
    operationId: p.operationId,
    purpose: p.purpose,
    expectedGeneration: p.expectedGeneration,
    requestDigest: p.requestDigest,
    policyVersion: p.policyVersion,
  };
}

export interface ObserveOperationPayload {
  operationId: string;
  providerEffect: ProviderEffect;
  safeProviderReference?: string;
  sessionConsequence?: string;
  safeReasonCode?: string;
}

export function parseObserveOperationPayload(
  val: unknown,
): ObserveOperationPayload | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const p = val as Record<string, unknown>;

  if (containsProhibitedSecurityKey(p)) return null;

  if (typeof p.operationId !== "string" || !UUID_REGEX.test(p.operationId)) {
    return null;
  }
  const allowedEffects = [
    "not_started",
    "not_observed",
    "observed_applied",
    "observed_not_applied",
    "unknown",
  ];
  if (
    typeof p.providerEffect !== "string" ||
    !allowedEffects.includes(p.providerEffect)
  ) {
    return null;
  }

  if (
    p.safeProviderReference !== undefined &&
    (typeof p.safeProviderReference !== "string" ||
      p.safeProviderReference.length > 128)
  ) {
    return null;
  }
  const allowedSessionConsequences = [
    "continues_aal2",
    "continues_aal1",
    "reauthentication_required",
    "ended",
    "unknown",
  ];
  if (
    p.sessionConsequence !== undefined &&
    (typeof p.sessionConsequence !== "string" ||
      !allowedSessionConsequences.includes(p.sessionConsequence))
  ) {
    return null;
  }
  if (
    p.safeReasonCode !== undefined &&
    (typeof p.safeReasonCode !== "string" || p.safeReasonCode.length > 64)
  ) {
    return null;
  }

  return {
    operationId: p.operationId,
    providerEffect: p.providerEffect as ProviderEffect,
    safeProviderReference: p.safeProviderReference as string | undefined,
    sessionConsequence: p.sessionConsequence as string | undefined,
    safeReasonCode: p.safeReasonCode as string | undefined,
  };
}

export interface AcknowledgeRecoveryCodesPayload {
  operationId: string;
  expectedGeneration: number;
}

export function parseAcknowledgeRecoveryCodesPayload(
  val: unknown,
): AcknowledgeRecoveryCodesPayload | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const p = val as Record<string, unknown>;

  if (containsProhibitedSecurityKey(p)) return null;

  if (typeof p.operationId !== "string" || !UUID_REGEX.test(p.operationId)) {
    return null;
  }
  if (
    typeof p.expectedGeneration !== "number" ||
    !Number.isSafeInteger(p.expectedGeneration) ||
    p.expectedGeneration < 1
  ) {
    return null;
  }

  return {
    operationId: p.operationId,
    expectedGeneration: p.expectedGeneration,
  };
}

export interface AccountSecurityStateRecord {
  issuer_id: string;
  subject_id: string;
  security_generation: number;
  policy_version: string;
  setup_state: SecuritySetupState;
  recovery_handoff_state: RecoveryHandoffState;
  provider_factor_reference?: string | null;
  provider_capability_version?: string | null;
  last_operation_id?: string | null;
  last_session_consequence?: string | null;
  ready: boolean;
  updated_at: string;
}

function mapPurposeToEventType(
  purpose: string,
  outcome: "accepted" | "rejected",
): string {
  switch (purpose) {
    case "factor_enroll":
      return outcome === "accepted"
        ? "factor_enrollment_accepted"
        : "factor_enrollment_rejected";
    case "recovery_codes_regenerate":
      return outcome === "accepted"
        ? "recovery_codes_regenerated"
        : "security_change_rejected";
    case "lost_factor_recover":
    case "primary_credential_recover":
      return outcome === "accepted"
        ? "account_recovery_accepted"
        : "account_recovery_rejected";
    case "mfa_challenge":
      return outcome === "accepted"
        ? "mfa_challenge_verified"
        : "mfa_challenge_rejected";
    case "recovery_codes_acknowledge":
      return "recovery_codes_acknowledged";
    default:
      return outcome === "accepted"
        ? "security_change_accepted"
        : "security_change_rejected";
  }
}

export class AccountSecurityService implements AccountSecurityDatabase {
  private states = new Map<string, AccountSecurityStateRecord>();
  private operations = new Map<string, Record<string, unknown>>();
  private evidence = new Map<string, unknown[]>();

  private accountKey(identity: VerifiedIdentityContext): string {
    return `${identity.issuerId}\0${identity.subjectId}`;
  }

  async getState(
    identity: VerifiedIdentityContext,
  ): Promise<AccountSecurityStateRecord> {
    const key = this.accountKey(identity);
    let state = this.states.get(key);
    if (!state) {
      state = {
        issuer_id: identity.issuerId,
        subject_id: identity.subjectId,
        security_generation: 1,
        policy_version: "f011_v1_synthetic",
        setup_state: "factor_not_configured",
        recovery_handoff_state: "not_generated",
        provider_factor_reference: null,
        provider_capability_version: null,
        last_operation_id: null,
        last_session_consequence: null,
        ready: false,
        updated_at: new Date().toISOString(),
      };
      this.states.set(key, state);
    }
    return structuredClone(state);
  }

  async begin(
    identity: VerifiedIdentityContext,
    payload: unknown,
  ): Promise<{ operationId: string; status: string }> {
    const parsed = parseBeginOperationPayload(payload);
    if (!parsed) throw new Error("invalid_request");

    const key = `${this.accountKey(identity)}\0${parsed.operationId}`;
    const existing = this.operations.get(key);
    if (existing) {
      if (existing.requestDigest !== parsed.requestDigest) {
        throw new Error("changed_digest");
      }
      return {
        operationId: parsed.operationId,
        status: existing.status as string,
      };
    }

    const state = await this.getState(identity);
    if (parsed.expectedGeneration !== state.security_generation) {
      throw new Error("generation_mismatch");
    }

    const opRecord = {
      ...parsed,
      accountKey: this.accountKey(identity),
      status: "in_progress",
      provider_effect: "not_started",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.operations.set(key, opRecord);
    return { operationId: parsed.operationId, status: "in_progress" };
  }

  async observe(
    identity: VerifiedIdentityContext,
    payload: unknown,
  ): Promise<{
    operationId: string;
    securityGeneration: number;
    setupState: SecuritySetupState;
  }> {
    const parsed = parseObserveOperationPayload(payload);
    if (!parsed) throw new Error("invalid_request");

    const key = `${this.accountKey(identity)}\0${parsed.operationId}`;
    const op = this.operations.get(key);
    if (!op) throw new Error("operation_not_found");

    const stateKey = this.accountKey(identity);
    const state = await this.getState(identity);

    if (parsed.providerEffect === "observed_applied") {
      if (op.status !== "accepted") {
        if (op.expectedGeneration !== state.security_generation) {
          op.status = "reconcile_required";
          op.provider_effect = "observed_applied";
          throw new Error("generation_mismatch");
        }
        op.status = "accepted";
        op.provider_effect = "observed_applied";
        op.safeProviderReference = parsed.safeProviderReference;
        op.sessionConsequence = parsed.sessionConsequence;

        // Advance generation once
        state.security_generation += 1;
        if (op.purpose === "lost_factor_recover") {
          state.setup_state = "factor_reset_required";
          state.recovery_handoff_state = "not_generated";
          state.provider_factor_reference = null;
        } else if (op.purpose === "recovery_codes_regenerate") {
          state.recovery_handoff_state = "ack_pending";
        } else if (op.purpose === "primary_credential_recover") {
          // credential recovered
        } else {
          state.setup_state = "recovery_codes_pending";
          state.recovery_handoff_state = "ack_pending";
          state.provider_factor_reference =
            parsed.safeProviderReference ?? null;
        }

        state.last_operation_id = parsed.operationId;
        state.last_session_consequence = parsed.sessionConsequence ?? null;
        state.updated_at = new Date().toISOString();
        this.states.set(stateKey, state);

        this.recordEvidence(identity, {
          identity_event_type: mapPurposeToEventType(op.purpose as string, "accepted"),
          outcome: "accepted",
          identity_operation_reference: parsed.operationId,
          security_generation: state.security_generation,
          safe_reason_code: parsed.safeReasonCode ?? `${op.purpose}_completed`,
        });
      }
    } else if (
      parsed.providerEffect === "observed_not_applied" ||
      parsed.providerEffect === "rejected"
    ) {
      op.status = "rejected";
      op.provider_effect = parsed.providerEffect;
      this.recordEvidence(identity, {
        identity_event_type: mapPurposeToEventType(op.purpose as string, "rejected"),
        outcome: "rejected",
        identity_operation_reference: parsed.operationId,
        security_generation: state.security_generation,
        safe_reason_code: parsed.safeReasonCode ?? "provider_rejected",
      });
    }

    return {
      operationId: parsed.operationId,
      securityGeneration: state.security_generation,
      setupState: state.setup_state,
    };
  }

  async acknowledgeRecoveryCodes(
    identity: VerifiedIdentityContext,
    payload: unknown,
  ): Promise<{
    operationId: string;
    securityGeneration: number;
    setupState: SecuritySetupState;
  }> {
    const parsed = parseAcknowledgeRecoveryCodesPayload(payload);
    if (!parsed) throw new Error("invalid_request");

    const stateKey = this.accountKey(identity);
    const state = await this.getState(identity);

    if (parsed.expectedGeneration !== state.security_generation) {
      throw new Error("generation_mismatch");
    }

    if (
      state.recovery_handoff_state !== "ack_pending" &&
      state.setup_state !== "recovery_codes_pending"
    ) {
      throw new Error("invalid_setup_state");
    }

    const opKey = `${this.accountKey(identity)}\0${parsed.operationId}`;
    const op = this.operations.get(opKey);
    if (
      !op ||
      op.status !== "accepted" ||
      (op.purpose !== "factor_enroll" &&
        op.purpose !== "recovery_codes_regenerate")
    ) {
      throw new Error("invalid_operation");
    }

    state.setup_state = "ready";
    state.recovery_handoff_state = "acknowledged";
    state.ready = true;
    state.updated_at = new Date().toISOString();
    this.states.set(stateKey, state);

    this.recordEvidence(identity, {
      identity_event_type: "recovery_codes_acknowledged",
      outcome: "accepted",
      identity_operation_reference: crypto.randomUUID(),
      security_generation: state.security_generation,
      safe_reason_code: "codes_acknowledged",
    });

    return {
      operationId: parsed.operationId,
      securityGeneration: state.security_generation,
      setupState: "ready",
    };
  }

  private recordEvidence(
    identity: VerifiedIdentityContext,
    record: Record<string, unknown>,
  ) {
    const key = this.accountKey(identity);
    const list = this.evidence.get(key) || [];
    list.push(
      Object.freeze({
        evidence_id: crypto.randomUUID(),
        issuer_id: identity.issuerId,
        subject_id: identity.subjectId,
        server_observed_at: new Date().toISOString(),
        ...record,
      }),
    );
    this.evidence.set(key, list);
  }

  async getEvidence(
    identity: VerifiedIdentityContext,
  ): Promise<readonly unknown[]> {
    const key = this.accountKey(identity);
    return Object.freeze([...(this.evidence.get(key) || [])]);
  }
}
