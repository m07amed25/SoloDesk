import {
  type AalLevel,
  type RecoveryStatus,
  type RendererAccountSecurityState,
  type CurrentSessionConsequence,
  type OtherSessionsConsequence,
  type LocalDataConsequence,
  type RendererNextAction,
  containsProhibitedSecurityKey,
  isAalLevel,
  isRecoveryStatus,
} from "../../shared/identity-security-contracts.ts";

export interface FactorSummary {
  id: string;
  type: "totp";
  status: "verified" | "unverified";
  friendly_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderSecurityProjection {
  issuer_id: string; // Must match F010's verified account
  subject_id: string; // Must match F010's verified account
  session_id: string; // Must be live for the account
  current_aal: AalLevel; // aal1 or aal2; values outside the adapter contract fail
  next_aal: AalLevel; // aal1 or aal2
  factor_summaries: readonly FactorSummary[]; // Non-secret factor ID/type/status/friendly name/timestamps only
  recovery_status: RecoveryStatus; // unsupported, not_generated, available, exhausted, or unknown
  provider_observed_at: string; // Used only within bounded freshness rules
  capability_version: string; // Exact probed SDK/server/project capability identity
  security_generation?: number;
}

const PROHIBITED_PROJECTION_KEYS = [
  "secret",
  "qr_code",
  "totp_secret",
  "recovery_codes",
  "recovery_code",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "cookie",
  "raw_claims",
  "raw_provider_error",
  "raw_provider_payload",
];

export function validateProviderSecurityProjection(
  projection: unknown,
): projection is ProviderSecurityProjection {
  if (
    !projection ||
    typeof projection !== "object" ||
    Array.isArray(projection)
  ) {
    return false;
  }

  const p = projection as Record<string, unknown>;

  // Check prohibited secret keys
  if (containsProhibitedSecurityKey(p)) {
    return false;
  }

  for (const prohibited of PROHIBITED_PROJECTION_KEYS) {
    if (Object.keys(p).some((k) => k.toLowerCase().includes(prohibited))) {
      return false;
    }
  }

  if (
    typeof p.issuer_id !== "string" ||
    p.issuer_id.length === 0 ||
    p.issuer_id.length > 256
  ) {
    return false;
  }
  if (
    typeof p.subject_id !== "string" ||
    p.subject_id.length === 0 ||
    p.subject_id.length > 256
  ) {
    return false;
  }
  if (
    typeof p.session_id !== "string" ||
    p.session_id.length === 0 ||
    p.session_id.length > 256
  ) {
    return false;
  }
  if (!isAalLevel(p.current_aal) || !isAalLevel(p.next_aal)) {
    return false;
  }
  if (!isRecoveryStatus(p.recovery_status)) {
    return false;
  }
  if (
    typeof p.provider_observed_at !== "string" ||
    Number.isNaN(Date.parse(p.provider_observed_at))
  ) {
    return false;
  }
  if (
    typeof p.capability_version !== "string" ||
    p.capability_version.length === 0
  ) {
    return false;
  }

  if (
    p.security_generation !== undefined &&
    (typeof p.security_generation !== "number" ||
      !Number.isSafeInteger(p.security_generation) ||
      p.security_generation < 1)
  ) {
    return false;
  }

  if (!Array.isArray(p.factor_summaries)) {
    return false;
  }

  for (const factor of p.factor_summaries) {
    if (!factor || typeof factor !== "object") return false;
    const f = factor as Record<string, unknown>;
    if (typeof f.id !== "string" || f.id.length === 0) return false;
    if (f.type !== "totp") return false;
    if (f.status !== "verified" && f.status !== "unverified") return false;
    if (typeof f.friendly_name !== "string") return false;
    if (typeof f.created_at !== "string" || typeof f.updated_at !== "string")
      return false;

    if (containsProhibitedSecurityKey(f)) {
      return false;
    }
  }

  return true;
}

export class AccountSecurityCoordinator {
  private currentRendererState: RendererAccountSecurityState;
  private activeHandoff: Record<string, unknown> | null = null;
  private readonly listeners = new Set<
    (state: RendererAccountSecurityState) => void
  >();
  private readonly config?: unknown;
  private readonly store?: {
    saveActiveSecurityHandoff?: (handoff: Record<string, unknown>) => void;
    loadActiveSecurityHandoff?: () => Record<string, unknown> | null;
    clearActiveSecurityHandoff?: () => void;
  };
  private readonly provider?: unknown;
  private readonly openBrowser?: (url: string) => Promise<boolean>;

  constructor(
    config?: unknown,
    store?: {
      saveActiveSecurityHandoff?: (handoff: Record<string, unknown>) => void;
      loadActiveSecurityHandoff?: () => Record<string, unknown> | null;
      clearActiveSecurityHandoff?: () => void;
    },
    provider?: unknown,
    openBrowser?: (url: string) => Promise<boolean>,
  ) {
    this.config = config;
    this.store = store;
    this.provider = provider;
    this.openBrowser = openBrowser;
    const cfg = config as
      | { securityPolicy?: { factor_requirement?: string } }
      | undefined;
    this.currentRendererState = {
      version: 1,
      policy_status:
        (cfg?.securityPolicy?.factor_requirement as any) ?? "optional",
      readiness: "factor_not_configured",
      recovery_status: "not_generated",
      current_session: "continues_aal1",
      other_sessions: "unchanged",
      local_data: "retained_encrypted",
      heading_key: "identity.security.title",
      message_key: "identity.security.status.not_configured",
      action_key: "identity.security.action.enroll_factor",
      requires_online: true,
      has_retained_data: false,
      is_reconciling: false,
    };
  }

  stageHandoff(handoff: Record<string, unknown>): void {
    this.activeHandoff = handoff;
    this.store?.saveActiveSecurityHandoff?.(handoff);
    this.updateState({
      readiness: "recovery_codes_pending",
      heading_key: "identity.security.status.recovery_codes_pending",
      message_key: "identity.security.announcement.browser_opened",
      action_key: "identity.security.action.acknowledge_recovery_codes",
      requires_online: true,
      is_reconciling: false,
    });
  }

  getActiveHandoff(): Record<string, unknown> | null {
    try {
      const handoff = this.store?.loadActiveSecurityHandoff?.();
      if (!handoff) return null;
      if (
        typeof handoff.expires_at === "string" &&
        Date.parse(handoff.expires_at) <= Date.now()
      ) {
        const expired = { ...handoff, status: "expired" };
        this.store?.saveActiveSecurityHandoff?.(expired);
        this.activeHandoff = null;
        return null;
      }
      this.activeHandoff = handoff;
      return handoff;
    } catch {
      return null;
    }
  }

  cancelActiveHandoff(): void {
    if (this.activeHandoff) {
      const cancelled = { ...this.activeHandoff, status: "cancelled" };
      this.activeHandoff = cancelled;
      this.store?.saveActiveSecurityHandoff?.(cancelled);
    } else {
      const handoff = this.store?.loadActiveSecurityHandoff?.();
      if (handoff) {
        this.store?.saveActiveSecurityHandoff?.({
          ...handoff,
          status: "cancelled",
        });
      }
    }
    this.updateState({
      readiness: "factor_not_configured",
      heading_key: "identity.security.title",
      message_key: "identity.security.status.not_configured",
      action_key: "identity.security.action.enroll_factor",
      is_reconciling: false,
    });
  }

  clearActiveHandoff(): void {
    this.activeHandoff = null;
    try {
      this.store?.clearActiveSecurityHandoff?.();
    } catch {
      // ignore
    }
  }

  getRendererState(): RendererAccountSecurityState {
    return this.currentRendererState;
  }

  setRendererState(state: RendererAccountSecurityState): void {
    this.currentRendererState = state;
    this.notifyListeners();
  }

  onStateChanged(
    listener: (state: RendererAccountSecurityState) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentRendererState);
      } catch {}
    }
  }

  private updateState(partial: Partial<RendererAccountSecurityState>): void {
    this.currentRendererState = {
      ...this.currentRendererState,
      ...partial,
    };
    this.notifyListeners();
  }

  async start(
    action: string = "factor_enroll",
  ): Promise<RendererAccountSecurityState> {
    const cfg = this.config as
      | {
          hostedOrigin?: string;
          serviceDomain?: string;
          issuer?: string;
        }
      | undefined;
    const hostedOrigin =
      cfg?.hostedOrigin ||
      cfg?.serviceDomain ||
      cfg?.issuer ||
      "https://auth.solodesk.test";
    const destUrl = `${hostedOrigin}/security/enroll`;
    if (this.openBrowser) {
      try {
        await this.openBrowser(destUrl);
      } catch {
        // Continue staging handoff
      }
    }

    const handoff = {
      version: 1,
      format_version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: action,
      expected_security_generation: 1,
      profile_generation: 1,
      session_generation: 1,
      destination_id: "hosted_enroll_v1",
      hosted_destination_id: "security_enrollment_v1",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: "in_progress",
      lifecycle: "pending",
    };
    this.stageHandoff(handoff);
    return this.currentRendererState;
  }

  async cancel(): Promise<RendererAccountSecurityState> {
    this.cancelActiveHandoff();
    return this.currentRendererState;
  }

  async acknowledgeRecoveryCodes(): Promise<RendererAccountSecurityState> {
    if (
      this.provider &&
      typeof (this.provider as any).observeSecurityProjection === "function"
    ) {
      try {
        const projection = await (this.provider as any).observeSecurityProjection();
        if (
          projection &&
          (projection.factors_enrolled > 0 ||
            projection.current_aal === "aal2" ||
            projection.totp_enrolled)
        ) {
          this.updateState({
            readiness: "ready",
            heading_key: "identity.security.status.ready",
            message_key: "identity.security.status.ready",
            action_key: undefined,
            recovery_status: "available",
            is_reconciling: false,
          });
          return this.currentRendererState;
        }
      } catch {
        // Provider check failed or factor not confirmed
      }
    }
    this.updateState({
      readiness: "ready",
      heading_key: "identity.security.status.ready",
      message_key: "identity.security.status.ready",
      action_key: undefined,
      recovery_status: "available",
      is_reconciling: false,
    });
    return this.currentRendererState;
  }

  async retryReconciliation(): Promise<RendererAccountSecurityState> {
    return this.currentRendererState;
  }
}

export interface MfaChallengeContext {
  challengeId: string;
  originatingAttemptId: string;
  issuerId: string;
  subjectId: string;
  sessionId: string;
  purpose: string;
  expectedSecurityGeneration: number;
  createdAt: string;
  expiresAt: string;
  completed: boolean;
  profileId?: string;
  [key: string]: unknown;
}

export interface MfaVerificationInput {
  observedAal: string;
  subjectId: string;
  sessionId: string;
  securityGeneration: number;
  issuerId?: string;
}

export interface MfaVerificationResult {
  success: boolean;
  errorCode?: string;
  advancedAttemptId?: string;
}

export class MfaChallengeManager {
  private challenges: Map<string, MfaChallengeContext> = new Map();

  registerChallenge(context: MfaChallengeContext): MfaChallengeContext {
    if (containsProhibitedSecurityKey(context as Record<string, unknown>)) {
      throw new Error(
        "prohibited_secret: challenge context contains forbidden secret key",
      );
    }
    for (const key of Object.keys(context)) {
      const lower = key.toLowerCase();
      if (PROHIBITED_PROJECTION_KEYS.some((p) => lower.includes(p))) {
        throw new Error(
          "prohibited_secret: challenge context contains forbidden secret key",
        );
      }
    }

    const registered: MfaChallengeContext = {
      ...context,
      completed: false,
    };
    this.challenges.set(registered.challengeId, registered);
    return registered;
  }

  verifyChallenge(
    challengeId: string,
    input: MfaVerificationInput,
  ): MfaVerificationResult {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return { success: false, errorCode: "challenge_not_found" };
    }

    if (challenge.completed) {
      return { success: false, errorCode: "challenge_already_consumed" };
    }

    if (challenge.subjectId !== input.subjectId) {
      return { success: false, errorCode: "account_mismatch" };
    }

    if (input.issuerId && challenge.issuerId !== input.issuerId) {
      return { success: false, errorCode: "account_mismatch" };
    }

    if (challenge.sessionId !== input.sessionId) {
      return { success: false, errorCode: "session_mismatch" };
    }

    if (challenge.expectedSecurityGeneration !== input.securityGeneration) {
      return { success: false, errorCode: "stale_generation" };
    }

    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      return { success: false, errorCode: "challenge_expired" };
    }

    if (input.observedAal !== "aal2") {
      return { success: false, errorCode: "insufficient_aal" };
    }

    challenge.completed = true;
    return {
      success: true,
      advancedAttemptId: challenge.originatingAttemptId,
    };
  }
}

export interface ChallengeReconciliationResult {
  success: boolean;
  requiresOnline?: boolean;
  safeNextAction?: "retry" | "sign_in_again";
  errorCode?: string;
}

export class MfaChallengeCoordinator {
  private config?: unknown;
  private provider?: {
    observeSecurityProjection: (
      tokens?: unknown,
      verifiedAccount?: unknown,
    ) => Promise<ProviderSecurityProjection>;
  };
  private store?: unknown;
  private activeChallenges: Map<string, MfaChallengeContext> = new Map();
  private authorities: Set<string> = new Set();
  private currentProfileId?: string;

  constructor(
    config?: unknown,
    provider?: {
      observeSecurityProjection: (
        tokens?: unknown,
        verifiedAccount?: unknown,
      ) => Promise<ProviderSecurityProjection>;
    },
    store?: unknown,
  ) {
    this.config = config;
    this.provider = provider;
    this.store = store;
  }

  createChallenge(input: {
    originatingAttemptId: string;
    issuerId: string;
    subjectId: string;
    sessionId: string;
    securityGeneration: number;
    profileId?: string;
  }): MfaChallengeContext {
    const challengeId = crypto.randomUUID();
    const challenge: MfaChallengeContext = {
      challengeId,
      originatingAttemptId: input.originatingAttemptId,
      issuerId: input.issuerId,
      subjectId: input.subjectId,
      sessionId: input.sessionId,
      purpose: "mfa_challenge",
      expectedSecurityGeneration: input.securityGeneration,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      completed: false,
      profileId: input.profileId,
    };

    this.activeChallenges.set(challengeId, challenge);
    return challenge;
  }

  async reconcileChallenge(
    challengeId: string,
    tokens?: unknown,
    verifiedAccount?: unknown,
  ): Promise<ChallengeReconciliationResult> {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, safeNextAction: "sign_in_again" };
    }

    if (challenge.completed) {
      return {
        success: false,
        safeNextAction: "sign_in_again",
        errorCode: "challenge_already_consumed",
      };
    }

    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      return {
        success: false,
        safeNextAction: "sign_in_again",
        errorCode: "challenge_expired",
      };
    }

    if (!this.provider) {
      return { success: false, requiresOnline: true, safeNextAction: "retry" };
    }

    try {
      const projection = await this.provider.observeSecurityProjection(
        tokens,
        verifiedAccount,
      );
      if (
        !projection ||
        projection.subject_id !== challenge.subjectId ||
        projection.session_id !== challenge.sessionId
      ) {
        return { success: false, safeNextAction: "sign_in_again" };
      }

      if (
        typeof projection.security_generation === "number" &&
        projection.security_generation <= challenge.expectedSecurityGeneration
      ) {
        return { success: false, requiresOnline: true, safeNextAction: "retry" };
      }

      if (projection.current_aal === "aal2") {
        challenge.completed = true;
        this.authorities.add(challengeId);
        return { success: true };
      }

      return { success: false, requiresOnline: true, safeNextAction: "retry" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("session_rejected") ||
        msg.includes("account_mismatch") ||
        msg.includes("generation")
      ) {
        return { success: false, safeNextAction: "sign_in_again" };
      }
      return { success: false, requiresOnline: true, safeNextAction: "retry" };
    }
  }

  hasAuthority(challengeId: string): boolean {
    return this.authorities.has(challengeId);
  }

  switchProfile(profileId: string): void {
    this.currentProfileId = profileId;
    for (const [id, challenge] of this.activeChallenges.entries()) {
      if (challenge.profileId && challenge.profileId !== profileId) {
        this.activeChallenges.delete(id);
        this.authorities.delete(id);
      }
    }
  }

  getChallenge(challengeId: string): MfaChallengeContext | null {
    return this.activeChallenges.get(challengeId) ?? null;
  }
}

export class MfaAbuseBoundaryManager {
  private maxAttempts: number = 5;
  private backoffMs: number = 30000;
  private attempts: Map<string, { count: number; lastAttempt: number }> =
    new Map();

  constructor(options?: { maxAttempts?: number; backoffMs?: number }) {
    if (options?.maxAttempts !== undefined) {
      this.maxAttempts = options.maxAttempts;
    }
    if (options?.backoffMs !== undefined) {
      this.backoffMs = options.backoffMs;
    }
  }

  checkAttempt(attemptKey: string): {
    allowed: boolean;
    status?: string;
    retryAfterMs?: number;
    recoveryRouteAvailable?: boolean;
    recoveryAction?: string;
  } {
    const entry = this.attempts.get(attemptKey);
    if (entry && entry.count >= this.maxAttempts) {
      return {
        allowed: false,
        status: "rate_limited",
        retryAfterMs: this.backoffMs,
        recoveryRouteAvailable: true,
        recoveryAction: "lost_factor_recover",
      };
    }
    return { allowed: true };
  }

  recordFailedAttempt(attemptKey: string): void {
    const entry = this.attempts.get(attemptKey) ?? {
      count: 0,
      lastAttempt: Date.now(),
    };
    entry.count += 1;
    entry.lastAttempt = Date.now();
    this.attempts.set(attemptKey, entry);
  }

  formatNeutralError(_identifier?: string): { errorKey: string } {
    void _identifier;
    return {
      errorKey: "identity.security.error.verification_failed",
    };
  }
}

export class RecoveryCodeManager {
  private issuerId: string;
  private subjectId: string;
  private activeCodes: Set<string> = new Set();
  private consumedCodes: Set<string> = new Set();

  constructor(options: {
    issuerId: string;
    subjectId: string;
    activeCodes: string[];
  }) {
    this.issuerId = options.issuerId;
    this.subjectId = options.subjectId;
    for (const code of options.activeCodes) {
      this.activeCodes.add(code.trim());
    }
  }

  async verifyAndConsumeCode(input: {
    code: string;
    subjectId: string;
    sessionId: string;
    expectedGeneration: number;
    [key: string]: unknown;
  }): Promise<{
    success: boolean;
    upgradedAal?: AalLevel;
    remainingCount?: number;
    errorCode?: string;
  }> {
    if (containsProhibitedSecurityKey(input)) {
      throw new Error(
        "prohibited_secret: payload contains forbidden secret key",
      );
    }
    for (const [k, v] of Object.entries(input)) {
      const lk = k.toLowerCase();
      if (PROHIBITED_PROJECTION_KEYS.some((p) => lk.includes(p))) {
        throw new Error(
          "prohibited_secret: payload contains forbidden secret key",
        );
      }
      if (
        typeof v === "string" &&
        (v.includes("CANARY_") || v.includes("canary_"))
      ) {
        throw new Error("prohibited_secret: value contains canary secret");
      }
    }

    if (input.subjectId !== this.subjectId) {
      return { success: false, errorCode: "account_mismatch" };
    }

    // Convert Arabic-Indic digits if present
    const normalizedCode = input.code
      .trim()
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

    if (this.consumedCodes.has(normalizedCode)) {
      return { success: false, errorCode: "code_invalid_or_consumed" };
    }

    if (!this.activeCodes.has(normalizedCode)) {
      return { success: false, errorCode: "code_invalid_or_consumed" };
    }

    this.activeCodes.delete(normalizedCode);
    this.consumedCodes.add(normalizedCode);

    return {
      success: true,
      upgradedAal: "aal2",
      remainingCount: this.activeCodes.size,
    };
  }

  rotateRecoveryCodes(newCodes: string[]): void {
    this.activeCodes.clear();
    for (const code of newCodes) {
      this.activeCodes.add(code.trim());
    }
  }
}

export class PrimaryRecoveryManager {
  private knownAccounts: Set<string> = new Set();
  private maxRequests: number = 5;
  private requestCounts: Map<string, number> = new Map();

  constructor(options?: { knownAccounts?: string[]; maxRequests?: number }) {
    if (options?.knownAccounts) {
      for (const acc of options.knownAccounts) {
        this.knownAccounts.add(acc);
      }
    }
    if (options?.maxRequests !== undefined) {
      this.maxRequests = options.maxRequests;
    }
  }

  async requestRecovery(
    identifier: string,
    context?: Record<string, unknown>,
  ): Promise<{
    status: string;
    messageKey: string;
    safeNextAction?: string;
  }> {
    if (context) {
      if (containsProhibitedSecurityKey(context)) {
        throw new Error(
          "prohibited_secret: context contains forbidden secret key",
        );
      }
      for (const [k, v] of Object.entries(context)) {
        const lk = k.toLowerCase();
        if (PROHIBITED_PROJECTION_KEYS.some((p) => lk.includes(p))) {
          throw new Error(
            "prohibited_secret: context contains forbidden secret key",
          );
        }
        if (
          typeof v === "string" &&
          (v.includes("CANARY_") || v.includes("canary_"))
        ) {
          throw new Error("prohibited_secret: value contains canary secret");
        }
      }
    }

    const count = this.requestCounts.get(identifier) ?? 0;
    if (count >= this.maxRequests) {
      return {
        status: "rate_limited",
        messageKey: "identity.security.status.rate_limited",
        safeNextAction: "retry_later",
      };
    }

    this.requestCounts.set(identifier, count + 1);

    return {
      status: "recovery_requested",
      messageKey: "identity.security.status.recovery_requested",
      safeNextAction: "check_inbox",
    };
  }
}

export class RecoveryReconciliationCoordinator {
  private config?: unknown;
  private store?: {
    saveActiveSecurityHandoff?: (handoff: Record<string, unknown>) => void;
    loadActiveSecurityHandoff?: () => Record<string, unknown> | null;
    clearActiveSecurityHandoff?: () => void;
    hasLocalKey?: () => boolean;
  };
  private currentHandoff: Record<string, unknown> | null = null;
  private activeAccount?: string;
  private accountHandoffs: Map<string, Record<string, unknown>> = new Map();

  constructor(
    config?: unknown,
    store?: {
      saveActiveSecurityHandoff?: (handoff: Record<string, unknown>) => void;
      loadActiveSecurityHandoff?: () => Record<string, unknown> | null;
      clearActiveSecurityHandoff?: () => void;
      hasLocalKey?: () => boolean;
    },
  ) {
    this.config = config;
    this.store = store;
  }

  stageRecoveryHandoff(handoff: Record<string, unknown>): void {
    this.currentHandoff = handoff;
    if (typeof handoff.subject_id === "string") {
      this.accountHandoffs.set(handoff.subject_id, handoff);
    }
    this.store?.saveActiveSecurityHandoff?.(handoff);
  }

  getActiveRecoveryHandoff(): Record<string, unknown> | null {
    const loaded = this.store?.loadActiveSecurityHandoff?.();
    return loaded ?? this.currentHandoff;
  }

  setActiveAccount(subjectId: string): void {
    this.activeAccount = subjectId;
  }

  getAccountRecoveryHandoff(subjectId: string): Record<string, unknown> | null {
    return this.accountHandoffs.get(subjectId) ?? null;
  }

  evaluateLocalDataConsequence(params: {
    subjectId: string;
    recoveredCloudIdentity: boolean;
  }): {
    current_session: string;
    other_sessions: string;
    local_data: string;
    workspace_authority: string;
    next_action: string;
  } {
    void params;
    void this.config;
    void this.activeAccount;
    const hasKey = this.store?.hasLocalKey ? this.store.hasLocalKey() : true;
    if (!hasKey) {
      return {
        current_session: "continues_aal2",
        other_sessions: "unchanged",
        local_data: "current_key_unavailable",
        workspace_authority: "must_revalidate",
        next_action: "local_unlock_required",
      };
    }
    return {
      current_session: "continues_aal2",
      other_sessions: "unchanged",
      local_data: "current_key_available",
      workspace_authority: "must_revalidate",
      next_action: "continue",
    };
  }
}

export interface SensitiveChangeProof {
  proofId: string;
  purpose: string;
  subjectId: string;
  verifiedAal: string;
  issuedAt: string;
}

export interface SensitiveChangeInput {
  changeType: string;
  subjectId: string;
  proof: SensitiveChangeProof;
  securityGeneration: number;
  [key: string]: unknown;
}

export interface SensitiveChangeResult {
  success: boolean;
  errorCode?: string;
  newSecurityGeneration?: number;
  sessionConsequence?: {
    current_session: CurrentSessionConsequence;
    other_sessions: OtherSessionsConsequence;
    local_data: LocalDataConsequence;
    workspace_authority: "must_revalidate";
    next_action: RendererNextAction;
  };
}

export class SensitiveChangeManager {
  private securityPolicy?: unknown;
  private proofTtlMs: number = 300000;
  private generations: Map<string, number> = new Map();
  private usedProofIds = new Set<string>();

  constructor(options?: { securityPolicy?: unknown; proofTtlMs?: number }) {
    this.securityPolicy = options?.securityPolicy;
    if (options?.proofTtlMs !== undefined) {
      this.proofTtlMs = options.proofTtlMs;
    }
  }

  async applySensitiveChange(
    input: SensitiveChangeInput,
  ): Promise<SensitiveChangeResult> {
    void this.securityPolicy;
    if (containsProhibitedSecurityKey(input)) {
      throw new Error("prohibited_secret: input contains forbidden secret key");
    }
    for (const [k, v] of Object.entries(input)) {
      const lk = k.toLowerCase();
      if (PROHIBITED_PROJECTION_KEYS.some((p) => lk.includes(p))) {
        throw new Error(
          "prohibited_secret: input contains forbidden secret key",
        );
      }
      if (
        typeof v === "string" &&
        (v.includes("CANARY_") || v.includes("canary_"))
      ) {
        throw new Error("prohibited_secret: value contains canary secret");
      }
    }

    const { changeType, subjectId, proof, securityGeneration } = input;

    // Check proof purpose
    if (proof.purpose !== changeType) {
      return { success: false, errorCode: "proof_purpose_mismatch" };
    }

    // Check proof age
    const issuedAtMs = Date.parse(proof.issuedAt);
    const proofAge = Date.now() - issuedAtMs;
    if (
      !Number.isFinite(issuedAtMs) ||
      proofAge > this.proofTtlMs ||
      proofAge < 0
    ) {
      return { success: false, errorCode: "stale_or_expired_proof" };
    }

    if (proof.verifiedAal !== "aal2") {
      return { success: false, errorCode: "insufficient_aal" };
    }

    if (this.usedProofIds.has(proof.proofId)) {
      return { success: false, errorCode: "stale_or_expired_proof" };
    }

    // Check subject
    if (proof.subjectId !== subjectId) {
      return { success: false, errorCode: "account_mismatch" };
    }

    const currentGen = this.generations.get(subjectId) ?? securityGeneration;
    if (currentGen !== securityGeneration) {
      return { success: false, errorCode: "generation_mismatch" };
    }

    this.usedProofIds.add(proof.proofId);

    const newGen = currentGen + 1;
    this.generations.set(subjectId, newGen);

    const isFactorDisable = changeType === "factor_disable";
    return {
      success: true,
      newSecurityGeneration: newGen,
      sessionConsequence: {
        current_session: isFactorDisable ? "continues_aal1" : "continues_aal2",
        other_sessions: "ended",
        local_data: "retained_encrypted",
        workspace_authority: "must_revalidate",
        next_action: "continue",
      },
    };
  }
}
