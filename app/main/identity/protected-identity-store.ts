import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  isLocalAccountProfile,
  isProtectedSessionBinding,
  type LocalAccountProfile,
  type ProtectedSessionBinding,
} from "../../shared/identity-contracts.ts";
import {
  type SecurityPurpose,
  isSecurityPurpose,
  containsProhibitedSecurityKey,
} from "../../shared/identity-security-contracts.ts";
import type { ProtectionOwner } from "../protection/owner.ts";

export interface IdentitySecretProtection {
  assertAvailable(): void;
  sealSecret(value: string): Buffer;
  openSecret(value: Buffer): string;
}

export const HOSTED_DESTINATION_IDS = Object.freeze([
  "security_enrollment_v1",
  "security_challenge_v1",
  "security_recovery_v1",
  "security_reauth_v1",
] as const);
export type HostedDestinationId = (typeof HOSTED_DESTINATION_IDS)[number];

export const HANDOFF_LIFECYCLES = Object.freeze([
  "pending",
  "returned",
  "reconcile_required",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
] as const);
export type HandoffLifecycle = (typeof HANDOFF_LIFECYCLES)[number];

export type ProtectedSecurityHandoff = Readonly<{
  format_version: 1;
  profile_reference: string;
  profile_generation: number;
  session_generation: number;
  operation_id: string;
  purpose: SecurityPurpose;
  expected_security_generation: number;
  hosted_destination_id: HostedDestinationId;
  lifecycle: HandoffLifecycle;
  created_at: string;
  expires_at: string;
}>;

export type StoredAttemptRecord = Readonly<{
  attempt_id: string;
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
  status:
    | "pending"
    | "cancelled"
    | "expired"
    | "consumed"
    | "rejected"
    | "superseded";
  consumed_at?: string;
  safe_reason_code?: string;
  diagnostic_id?: string;
  raw_proof?: {
    verifier: string;
    state: string;
    nonce: string;
  };
}>;

export type ProtectedIdentityPaths = Readonly<{
  directory: string;
  profile: string;
  session: string;
  attempt: string;
  credentials: string;
  enrollment: string;
  securityHandoff: string;
}>;

export type StoredEnrollmentIntent = Readonly<{
  enrollmentIntentId: string;
  requestDigest: string;
  profileReference: string;
  profileGeneration: number;
  installationContextId: string;
  deviceContextDigest: string;
  deviceLabel?: string;
  platform: string;
  architecture: string;
  appVersion: string;
  protectionProofReference: string;
  payloadVersion: 1;
  status:
    | "prepared"
    | "submitted"
    | "outcome_unknown"
    | "service_confirmed"
    | "locally_committed"
    | "reconciled_not_enrolled"
    | "rejected"
    | "recovery_required";
  deviceEnrollmentId?: string;
  receiptId?: string;
}>;

function isValidProfileId(profileId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(profileId) && !profileId.includes("..");
}

export function deriveIdentityPaths(
  userData: string,
  profileId: string,
): ProtectedIdentityPaths {
  if (!isValidProfileId(profileId)) {
    throw new Error("invalid_profile_id");
  }
  const directory = path.join(userData, "identities", profileId);
  return Object.freeze({
    directory,
    profile: path.join(directory, "profile.v1.json"),
    session: path.join(directory, "session.v1.json"),
    attempt: path.join(directory, "attempt.v1.json"),
    credentials: path.join(directory, "credentials.v1.enc"),
    enrollment: path.join(directory, "enrollment.v1.json"),
    securityHandoff: path.join(directory, "security-handoff.v1.json"),
  });
}

function atomicWrite(targetPath: string, content: string | Buffer): void {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const tmpPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, content, { mode: 0o600 });
  fs.renameSync(tmpPath, targetPath);
}

export class ProtectedIdentityStore {
  private readonly userData: string;
  private readonly profileId: string;
  private readonly paths: ProtectedIdentityPaths;
  private readonly protectionOwner?: ProtectionOwner;
  private readonly secretProtection?: IdentitySecretProtection;

  constructor(
    userData: string,
    profileId: string,
    protectionOwner?: ProtectionOwner,
    secretProtection?: IdentitySecretProtection,
  ) {
    this.userData = userData;
    this.profileId = profileId;
    this.paths = deriveIdentityPaths(userData, profileId);
    this.protectionOwner = protectionOwner;
    this.secretProtection = secretProtection;
  }

  getProfileId(): string {
    return this.profileId;
  }

  getPaths(): ProtectedIdentityPaths {
    return this.paths;
  }

  assertProtectionUsable(): void {
    if (!this.secretProtection) throw new Error("protection_denied");
    this.secretProtection.assertAvailable();
    if (this.protectionOwner) {
      this.protectionOwner.assertKeyAvailable();
    }
  }

  hasProfile(): boolean {
    return fs.existsSync(this.paths.profile);
  }

  loadProfile(): LocalAccountProfile | null {
    if (!fs.existsSync(this.paths.profile)) {
      return null;
    }
    const raw = fs.readFileSync(this.paths.profile, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Preserve existing bytes, never replace with empty profile!
      throw new Error("corrupt_profile");
    }
    if (!isLocalAccountProfile(parsed)) {
      throw new Error("unsupported_format");
    }
    if (parsed.compatibility_version !== 1) {
      throw new Error("unsupported_format");
    }
    return parsed;
  }

  saveProfile(profile: LocalAccountProfile): void {
    if (
      !isLocalAccountProfile(profile) ||
      profile.compatibility_version !== 1
    ) {
      throw new Error("invalid_profile_data");
    }
    if (profile.profile_id !== this.profileId) {
      throw new Error("profile_id_mismatch");
    }
    atomicWrite(this.paths.profile, JSON.stringify(profile, null, 2));
  }

  loadSessionBinding(): ProtectedSessionBinding | null {
    if (!fs.existsSync(this.paths.session)) {
      return null;
    }
    const raw = fs.readFileSync(this.paths.session, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("corrupt_session_binding");
    }
    if (!isProtectedSessionBinding(parsed)) {
      throw new Error("unsupported_session_format");
    }
    return parsed;
  }

  saveSessionBinding(binding: ProtectedSessionBinding): void {
    this.assertProtectionUsable();
    if (!isProtectedSessionBinding(binding)) {
      throw new Error("invalid_session_binding");
    }
    if (binding.profile_id !== this.profileId) {
      throw new Error("profile_id_mismatch");
    }
    atomicWrite(this.paths.session, JSON.stringify(binding, null, 2));
  }

  clearSessionBinding(): void {
    if (fs.existsSync(this.paths.session)) {
      fs.unlinkSync(this.paths.session);
    }
    if (fs.existsSync(this.paths.credentials)) {
      fs.unlinkSync(this.paths.credentials);
    }
  }

  loadActiveAttempt(): StoredAttemptRecord | null {
    if (!fs.existsSync(this.paths.attempt)) {
      return null;
    }
    this.assertProtectionUsable();
    const raw = fs.readFileSync(this.paths.attempt, "utf-8");
    let parsed: StoredAttemptRecord;
    try {
      const envelope = JSON.parse(raw);
      if (envelope.version !== 2 || typeof envelope.sealed !== "string")
        throw new Error("unsupported_attempt_format");
      parsed = JSON.parse(
        this.secretProtection!.openSecret(
          Buffer.from(envelope.sealed, "base64"),
        ),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "unsupported_attempt_format"
      )
        throw error;
      throw new Error("corrupt_attempt_record");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.profile_id !== this.profileId
    ) {
      throw new Error("invalid_attempt_record");
    }
    return parsed;
  }

  saveActiveAttempt(attempt: StoredAttemptRecord): void {
    this.assertProtectionUsable();
    if (!attempt || attempt.profile_id !== this.profileId) {
      throw new Error("invalid_attempt_data");
    }
    const sealed = this.secretProtection!.sealSecret(
      JSON.stringify(attempt),
    ).toString("base64");
    atomicWrite(this.paths.attempt, JSON.stringify({ version: 2, sealed }));
  }

  clearActiveAttempt(): void {
    if (fs.existsSync(this.paths.attempt)) {
      fs.unlinkSync(this.paths.attempt);
    }
  }

  loadEnrollmentIntent(): StoredEnrollmentIntent | null {
    if (!fs.existsSync(this.paths.enrollment)) return null;
    try {
      const value = JSON.parse(
        fs.readFileSync(this.paths.enrollment, "utf-8"),
      ) as StoredEnrollmentIntent;
      if (
        !value ||
        typeof value !== "object" ||
        !/^[0-9a-f-]{36}$/i.test(value.enrollmentIntentId) ||
        !/^[0-9a-f]{64}$/i.test(value.requestDigest) ||
        value.profileGeneration < 1 ||
        value.payloadVersion !== 1
      )
        throw new Error("invalid_enrollment_intent");
      return value;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "invalid_enrollment_intent"
      )
        throw error;
      throw new Error("corrupt_enrollment_intent");
    }
  }

  saveEnrollmentIntent(intent: StoredEnrollmentIntent): void {
    if (
      !/^[0-9a-f-]{36}$/i.test(intent.enrollmentIntentId) ||
      !/^[0-9a-f]{64}$/i.test(intent.requestDigest) ||
      intent.profileGeneration < 1 ||
      intent.payloadVersion !== 1
    )
      throw new Error("invalid_enrollment_intent");
    atomicWrite(this.paths.enrollment, JSON.stringify(intent, null, 2));
  }

  saveEncryptedCredentials(credentials: {
    accessToken?: string;
    refreshToken?: string;
  }): void {
    this.assertProtectionUsable();
    const sealed = this.secretProtection!.sealSecret(
      JSON.stringify(credentials),
    ).toString("base64");
    atomicWrite(this.paths.credentials, JSON.stringify({ version: 2, sealed }));
  }

  loadEncryptedCredentials(): {
    accessToken?: string;
    refreshToken?: string;
  } | null {
    if (!fs.existsSync(this.paths.credentials)) {
      return null;
    }
    this.assertProtectionUsable();
    try {
      const envelope = JSON.parse(
        fs.readFileSync(this.paths.credentials, "utf8"),
      );
      if (envelope.version !== 2 || typeof envelope.sealed !== "string")
        throw new Error("unsupported_credential_format");
      const credentials = JSON.parse(
        this.secretProtection!.openSecret(
          Buffer.from(envelope.sealed, "base64"),
        ),
      );
      if (
        !credentials ||
        typeof credentials.accessToken !== "string" ||
        !credentials.accessToken ||
        (credentials.refreshToken !== undefined &&
          typeof credentials.refreshToken !== "string")
      )
        throw new Error("corrupt_encrypted_credentials");
      return credentials;
    } catch {
      throw new Error("credentials_decryption_failed");
    }
  }

  loadSecurityHandoff(): ProtectedSecurityHandoff | null {
    if (!fs.existsSync(this.paths.securityHandoff)) {
      return null;
    }
    this.assertProtectionUsable();
    const raw = fs.readFileSync(this.paths.securityHandoff, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("corrupt_security_handoff");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid_security_handoff");
    }

    const h = parsed as Record<string, unknown>;

    // Unsupported format_version is rejected without replacement
    if (h.format_version !== 1) {
      throw new Error("unsupported_format_version");
    }

    // Must never contain prohibited keys
    if (containsProhibitedSecurityKey(h)) {
      throw new Error("prohibited_secret_in_handoff");
    }

    // Validate fields
    if (
      typeof h.profile_reference !== "string" ||
      h.profile_reference !== this.profileId
    ) {
      throw new Error("profile_reference_mismatch");
    }
    if (typeof h.profile_generation !== "number" || h.profile_generation < 1) {
      throw new Error("invalid_profile_generation");
    }
    if (typeof h.session_generation !== "number" || h.session_generation < 1) {
      throw new Error("invalid_session_generation");
    }
    if (
      typeof h.operation_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(h.operation_id)
    ) {
      throw new Error("invalid_operation_id");
    }
    if (!isSecurityPurpose(h.purpose)) {
      throw new Error("invalid_purpose");
    }
    if (
      typeof h.expected_security_generation !== "number" ||
      h.expected_security_generation < 1
    ) {
      throw new Error("invalid_expected_security_generation");
    }
    if (
      typeof h.hosted_destination_id !== "string" ||
      !(HOSTED_DESTINATION_IDS as readonly string[]).includes(
        h.hosted_destination_id,
      )
    ) {
      throw new Error("invalid_destination_id");
    }
    if (
      typeof h.lifecycle !== "string" ||
      !(HANDOFF_LIFECYCLES as readonly string[]).includes(h.lifecycle)
    ) {
      throw new Error("invalid_lifecycle");
    }
    if (
      typeof h.created_at !== "string" ||
      Number.isNaN(Date.parse(h.created_at))
    ) {
      throw new Error("invalid_created_at");
    }
    if (
      typeof h.expires_at !== "string" ||
      Number.isNaN(Date.parse(h.expires_at))
    ) {
      throw new Error("invalid_expires_at");
    }
    if (Date.parse(h.expires_at) <= Date.parse(h.created_at)) {
      throw new Error("invalid_lifetime_bounds");
    }

    return parsed as ProtectedSecurityHandoff;
  }

  saveSecurityHandoff(handoff: ProtectedSecurityHandoff): void {
    this.assertProtectionUsable();
    if (!handoff || typeof handoff !== "object") {
      throw new Error("invalid_security_handoff_data");
    }
    if (handoff.format_version !== 1) {
      throw new Error("unsupported_format_version");
    }
    if (containsProhibitedSecurityKey(handoff)) {
      throw new Error("prohibited_secret_in_handoff");
    }
    if (handoff.profile_reference !== this.profileId) {
      throw new Error("profile_reference_mismatch");
    }
    if (Date.parse(handoff.expires_at) <= Date.parse(handoff.created_at)) {
      throw new Error("invalid_lifetime_bounds");
    }

    atomicWrite(this.paths.securityHandoff, JSON.stringify(handoff, null, 2));
  }

  saveActiveSecurityHandoff(handoff: Record<string, unknown>): void {
    this.assertProtectionUsable();
    if (!handoff || typeof handoff !== "object") {
      throw new Error("invalid_security_handoff_data");
    }
    if (containsProhibitedSecurityKey(handoff)) {
      throw new Error("prohibited_secret_in_handoff");
    }
    atomicWrite(this.paths.securityHandoff, JSON.stringify(handoff, null, 2));
  }

  loadActiveSecurityHandoff(): Record<string, unknown> | null {
    if (!fs.existsSync(this.paths.securityHandoff)) {
      return null;
    }
    this.assertProtectionUsable();
    try {
      const raw = fs.readFileSync(this.paths.securityHandoff, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  clearSecurityHandoff(): void {
    if (fs.existsSync(this.paths.securityHandoff)) {
      fs.unlinkSync(this.paths.securityHandoff);
    }
  }

  clearActiveSecurityHandoff(): void {
    this.clearSecurityHandoff();
  }
}
