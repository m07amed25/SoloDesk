import crypto from "node:crypto";
import type { IdentityConfig } from "./config.ts";
import type { ProtectedIdentityStore } from "./protected-identity-store.ts";
import type { IdentityProviderAdapter } from "./provider-adapter.ts";
import { AuthAttemptManager, type SignInAttempt } from "./auth-attempts.ts";
import { SessionOwner, type VerifiedAccount } from "./session-owner.ts";
import {
  EnrollmentCoordinator,
  type EnrollmentService,
} from "./enrollment.ts";
import {
  BrowserHandoffManager,
  buildAuthorizationUrl,
} from "./browser-handoff.ts";
import type { IdentityReturnIntent } from "../links.ts";
import {
  type RendererIdentityState,
  type IdentityLifecycle,
  type SessionStatus,
  type EnrollmentStatus,
  type RetainedWorkStatus,
  type IdentityAction,
  sanitizeRendererState,
} from "../../shared/identity-contracts.ts";
import type {
  LocalAccountProfile,
  ProtectedSessionBinding,
} from "../../shared/identity-contracts.ts";
import { identityRecoveryState } from "../persistence/recovery-state.ts";
import { parseAuthCallback } from "./auth-callback.ts";

export type IdentityCoordinatorOptions = {
  profileId: string;
  epoch: number;
  config: IdentityConfig;
  store: ProtectedIdentityStore;
  provider: IdentityProviderAdapter;
  onStateChanged?: (state: RendererIdentityState) => void;
  openBrowser?: (url: string) => Promise<boolean>;
  isCurrentOwner?: () => boolean;
  onTeardown?: () => Promise<void>;
  restoreSession?: (
    binding: ProtectedSessionBinding,
  ) => Promise<VerifiedAccount | null>;
  enrollment?: Readonly<{
    service: EnrollmentService;
    installationContextId: string;
    protectionProofReference: string;
    appVersion: string;
  }>;
};

export class IdentityCoordinator {
  readonly profileId: string;
  readonly epoch: number;
  private readonly config: IdentityConfig;
  private readonly store: ProtectedIdentityStore;
  private readonly provider: IdentityProviderAdapter;
  private readonly attempts: AuthAttemptManager;
  private readonly sessionOwner: SessionOwner;
  private readonly handoff: BrowserHandoffManager;
  private readonly onStateChanged?: (state: RendererIdentityState) => void;
  private readonly enrollmentOptions?: IdentityCoordinatorOptions["enrollment"];
  private readonly restoreSession?: IdentityCoordinatorOptions["restoreSession"];

  private lifecycle: IdentityLifecycle = "sign_in_required";
  private currentAttempt: SignInAttempt | null = null;
  private currentRedirectUri: string | null = null;
  private verifiedAccount: VerifiedAccount | null = null;
  private enrollment: EnrollmentCoordinator | null = null;
  private safeDeviceLabel?: string;
  private sessionStatus: SessionStatus = "none";
  private enrollmentStatus: EnrollmentStatus = "not_enrolled";
  private retainedWork: RetainedWorkStatus = "none";
  private messageKey: string = "shell.identity.signInRequired";
  private actionKey: string = "shell.identity.action.signIn";
  private nextActions: readonly IdentityAction[] = Object.freeze(["sign_in_again"]);
  private authorityGeneration = 0;
  private profileGeneration: number;
  private disposed = false;
  private readonly isCurrentOwner?: () => boolean;
  private readonly onTeardown?: () => Promise<void>;

  constructor(options: IdentityCoordinatorOptions) {
    this.profileId = options.profileId;
    this.epoch = options.epoch;
    this.profileGeneration = options.epoch;
    this.isCurrentOwner = options.isCurrentOwner;
    this.onTeardown = options.onTeardown;
    this.config = options.config;
    this.store = options.store;
    this.provider = options.provider;
    this.attempts = new AuthAttemptManager(this.config, this.store);
    this.sessionOwner = new SessionOwner(this.config, this.store, this.provider);
    this.handoff = new BrowserHandoffManager(this.config, {
      onCallbackReceived: async (rawUrl) => {
        const parsed = parseAuthCallback(rawUrl, this.config, this.currentRedirectUri ?? undefined);
        if (parsed.type === "invalid" || !this.currentAttempt ||
          !this.attempts.findPendingAttemptByState(parsed.state, this.profileId, this.profileGeneration)) return false;
        await this.handleIdentityReturn({ kind: "identity_return", ...parsed, rawUrl });
        return true;
      },
      shellOpenExternal: options.openBrowser
        ? async (url) => {
            if (!(await options.openBrowser?.(url))) {
              throw new Error("browser_launch_failed");
            }
          }
        : undefined,
    });
    this.onStateChanged = options.onStateChanged;
    this.enrollmentOptions = options.enrollment;
    this.restoreSession = options.restoreSession;
  }

  async restoreStartup(): Promise<RendererIdentityState> {
    const generation = this.authorityGeneration;
    try {
      this.store.assertProtectionUsable();
      const profile = this.store.loadProfile();
      this.profileGeneration = profile?.profile_generation ?? this.profileGeneration;
      const storedAttempt = this.store.loadActiveAttempt();
      if (storedAttempt) {
        const attempt = this.attempts.restoreAttempt(
          this.profileId,
          this.profileGeneration,
          storedAttempt.return_destination_id,
        );
        if (attempt) {
          this.currentAttempt = attempt;
          const destination = this.config.destinations[attempt.return_destination_id];
          this.currentRedirectUri = `${destination.scheme}://${destination.host}${destination.path}`;
          this.lifecycle = "signing_in";
          this.sessionStatus = "sign_in_required";
          this.messageKey = "shell.identity.browserOpened";
          this.actionKey = "shell.identity.action.cancel";
          this.nextActions = Object.freeze(["cancel"]);
          return this.getState();
        }
      }

      const binding = this.store.loadSessionBinding();
      if (!profile && !binding) return this.getState();
      if (
        !profile ||
        !binding ||
        profile.profile_id !== this.profileId ||
        profile.profile_generation !== this.profileGeneration ||
        binding.profile_id !== this.profileId ||
        binding.profile_generation !== this.profileGeneration ||
        binding.issuer_id !== profile.issuer_id ||
        binding.subject_id !== profile.subject_id ||
        binding.status !== "current" ||
        binding.protected_write_status !== "committed"
      ) throw new Error("session_rejected");

      const account = this.restoreSession
        ? await this.restoreSession(binding)
        : await this.sessionOwner.restore(binding, () => this.isCurrent(generation));
      if (!this.isCurrent(generation)) return this.getState();
      if (
        !account ||
        account.issuer_id !== binding.issuer_id ||
        account.subject_id !== binding.subject_id
      ) throw new Error("session_rejected");

      this.verifiedAccount = account;
      this.sessionStatus = "current";
      this.configureEnrollment(account, profile, binding);
      const intent = this.store.loadEnrollmentIntent();
      if (profile.lifecycle === "enrolled" && intent?.status === "locally_committed") {
        this.lifecycle = "enrolled";
        this.enrollmentStatus = "enrolled";
        this.messageKey = "shell.identity.enrolled";
        this.actionKey = "shell.identity.action.none";
        this.nextActions = Object.freeze([]);
      } else if (intent && this.enrollment) {
        await this.retryReconciliation();
      } else {
        throw new Error("partial_enrollment");
      }
    } catch (error) {
      if (!this.isCurrent(generation)) return this.getState();
      const recovery = identityRecoveryState(error);
      this.lifecycle = recovery.lifecycle;
      this.sessionStatus = recovery.sessionStatus;
      this.messageKey = recovery.messageKey;
      this.actionKey = recovery.actionKey;
      this.nextActions = recovery.nextActions;
    }
    this.notifyStateChange();
    return this.getState();
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed && generation === this.authorityGeneration && (this.isCurrentOwner?.() ?? true);
  }

  getAccessToken(): string {
    if (this.disposed || this.sessionStatus !== "current") throw new Error("session_rejected");
    return this.sessionOwner.getAccessToken();
  }

  dispose(): void {
    this.authorityGeneration += 1;
    this.disposed = true;
    this.handoff.closeLoopbackListener();
    this.verifiedAccount = null;
    this.enrollment = null;
    this.safeDeviceLabel = undefined;
  }

  private configureEnrollment(
    account: VerifiedAccount,
    profile: LocalAccountProfile,
    sessionBinding: ProtectedSessionBinding,
  ): void {
    if (!this.enrollmentOptions) return;
    const authorityGeneration = this.authorityGeneration;
    this.enrollment = new EnrollmentCoordinator({
      store: this.store,
      service: this.enrollmentOptions.service,
      account,
      profile,
      sessionBinding,
      installationContextId: this.enrollmentOptions.installationContextId,
      platform: process.platform,
      architecture: process.arch,
      appVersion: this.enrollmentOptions.appVersion,
      protectionProofReference: this.enrollmentOptions.protectionProofReference,
      isCurrent: () => this.isCurrent(authorityGeneration),
    });
  }

  getState(): RendererIdentityState {
    const raw: RendererIdentityState = {
      version: 1,
      lifecycle: this.lifecycle,
      profileReference: `profile:${this.profileId}`,
      ...(this.verifiedAccount?.display_name
        ? { displayName: this.verifiedAccount.display_name }
        : {}),
      ...(this.verifiedAccount?.display_identifier
        ? { displayIdentifier: this.verifiedAccount.display_identifier }
        : {}),
      ...(this.safeDeviceLabel ? { safeDeviceLabel: this.safeDeviceLabel } : {}),
      protectionStatus:
        this.lifecycle === "protection_unavailable" ? "blocked" : "ready",
      sessionStatus: this.sessionStatus,
      enrollmentStatus: this.enrollmentStatus,
      diagnosticId: crypto.randomUUID(),
      messageKey: this.messageKey,
      actionKey: this.actionKey,
      retainedWork: this.retainedWork,
      nextActions: this.nextActions,
    };
    return sanitizeRendererState(raw);
  }

  private notifyStateChange(): void {
    const state = this.getState();
    if (this.onStateChanged) {
      try {
        this.onStateChanged(state);
      } catch {
        /* fail-closed */
      }
    }
  }

  async startSignIn(): Promise<RendererIdentityState> {
    if (this.disposed) return this.getState();
    const generation = ++this.authorityGeneration;
    this.handoff.closeLoopbackListener();
    try {
      this.store.assertProtectionUsable();
      this.profileGeneration = this.store.loadProfile()?.profile_generation ?? this.profileGeneration;
    } catch (error) {
      const state = identityRecoveryState(error);
      this.lifecycle = state.lifecycle;
      this.messageKey = state.messageKey;
      this.actionKey = state.actionKey;
      this.nextActions = state.nextActions;
      return this.getState();
    }
    // 1. Create fresh attempt
    const destinationId = "desktop_loopback_v1";
    const attempt = this.attempts.createAttempt(
      this.profileId,
      this.profileGeneration,
      destinationId,
    );
    this.currentAttempt = attempt;
    const proof = this.attempts.getAttemptProof(attempt.attempt_id);
    if (!proof) {
      this.lifecycle = "recovery_required";
      this.messageKey = "shell.identity.attemptFailed";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    // 2. Open browser handoff URL
    try {
      const port = await this.handoff.startLoopbackListener();
      if (!this.isCurrent(generation)) return this.getState();
      const destinationUri = `http://127.0.0.1:${port}/auth/callback`;
      this.currentRedirectUri = destinationUri;
      const authorizationUrl = buildAuthorizationUrl(this.config, {
        state: proof.state,
        challenge: attempt.challenge_reference,
        nonce: proof.nonce,
        redirectUri: destinationUri,
      });
      await this.handoff.openBrowser(authorizationUrl);
      if (!this.isCurrent(generation)) return this.getState();

      this.lifecycle = "signing_in";
      this.sessionStatus = "sign_in_required";
      this.messageKey = "shell.identity.browserOpened";
      this.actionKey = "shell.identity.action.cancel";
      this.nextActions = Object.freeze(["cancel"]);
    } catch {
      if (!this.isCurrent(generation)) return this.getState();
      this.handoff.closeLoopbackListener();
      this.lifecycle = "sign_in_required";
      this.messageKey = "shell.identity.browserLaunchFailed";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
    }

    this.notifyStateChange();
    return this.getState();
  }

  async cancelSignIn(): Promise<RendererIdentityState> {
    this.authorityGeneration += 1;
    this.handoff.closeLoopbackListener();
    if (this.currentAttempt) {
      this.attempts.cancelAttempt(
        this.currentAttempt.attempt_id,
        this.profileId,
        this.profileGeneration,
      );
      this.currentAttempt = null;
    }
    this.currentRedirectUri = null;
    this.lifecycle = "sign_in_required";
    this.sessionStatus = "none";
    this.messageKey = "shell.identity.signInCancelled";
    this.actionKey = "shell.identity.action.signIn";
    this.nextActions = Object.freeze(["sign_in_again"]);
    this.notifyStateChange();
    return this.getState();
  }

  async handleIdentityReturn(
    returnIntent: IdentityReturnIntent,
  ): Promise<RendererIdentityState> {
    const generation = this.authorityGeneration;
    const parsed = parseAuthCallback(returnIntent.rawUrl, this.config, this.currentRedirectUri ?? undefined);
    if (parsed.type === "invalid" || !this.isCurrent(generation) || !this.currentAttempt ||
      !this.attempts.findPendingAttemptByState(parsed.state, this.profileId, this.profileGeneration)) return this.getState();
    returnIntent = { kind: "identity_return", ...parsed, rawUrl: returnIntent.rawUrl };
    // Check if there is an active attempt matching the return's state
    if (!this.currentAttempt) {
      this.lifecycle = "sign_in_required";
      this.messageKey = "shell.identity.noPendingAttempt";
      this.actionKey = "shell.identity.action.signIn";
      this.nextActions = Object.freeze(["sign_in_again"]);
      this.notifyStateChange();
      return this.getState();
    }

    // Error in return?
    if (returnIntent.error) {
      this.attempts.cancelAttempt(
        this.currentAttempt.attempt_id,
        this.profileId,
        this.profileGeneration,
      );
      this.currentAttempt = null;
      this.lifecycle = "sign_in_required";
      this.sessionStatus = "rejected";
      this.messageKey = "shell.identity.providerError";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    if (!returnIntent.code) {
      this.attempts.cancelAttempt(
        this.currentAttempt.attempt_id,
        this.profileId,
        this.profileGeneration,
      );
      this.currentAttempt = null;
      this.lifecycle = "sign_in_required";
      this.messageKey = "shell.identity.invalidReturn";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    // Consume attempt with anti-replay
    const consume = this.attempts.consumeAttempt(
      this.currentAttempt.attempt_id,
      returnIntent.state,
      this.profileId,
      this.profileGeneration,
    );
    if (!consume.success) {
      this.currentAttempt = null;
      this.lifecycle = "sign_in_required";
      this.messageKey = "shell.identity.attemptExpiredOrReplayed";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    // Exchange code for verified account
    const destinationUri = this.currentRedirectUri;
    if (!destinationUri) {
      this.currentAttempt = null;
      this.lifecycle = "recovery_required";
      this.messageKey = "shell.identity.invalidReturn";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    const exchange = await this.sessionOwner.exchangeAndVerify({
      code: returnIntent.code,
      verifier: consume.verifier,
      redirectUri: destinationUri,
      profileId: this.profileId,
      profileGeneration: this.profileGeneration,
      expectedNonce: consume.nonce,
      isCurrent: () => this.isCurrent(generation),
    });

    if (!this.isCurrent(generation)) return this.getState();
    this.handoff.closeLoopbackListener();

    if (!exchange.success) {
      this.currentAttempt = null;
      this.lifecycle = "sign_in_required";
      this.sessionStatus = "rejected";
      this.messageKey = "shell.identity.exchangeFailed";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }

    this.currentAttempt = null;
    this.currentRedirectUri = null;
    this.verifiedAccount = exchange.account;
    const existingProfile = this.store.loadProfile();
    if (
      existingProfile &&
      (existingProfile.issuer_id !== exchange.account.issuer_id ||
        existingProfile.subject_id !== exchange.account.subject_id)
    ) {
      this.lifecycle = "recovery_required";
      this.sessionStatus = "rejected";
      this.messageKey = "shell.identity.accountMismatch";
      this.actionKey = "shell.identity.action.chooseIsolatedProfile";
      this.nextActions = Object.freeze(["choose_isolated_profile"]);
      this.notifyStateChange();
      return this.getState();
    }
    this.configureEnrollment(
      exchange.account,
      existingProfile ??
        Object.freeze({
          profile_id: this.profileId,
          issuer_id: exchange.account.issuer_id,
          subject_id: exchange.account.subject_id,
          protection_binding_id: `protection:${this.profileId}`,
          profile_generation: this.profileGeneration,
          compatibility_version: 1,
          lifecycle: "enrolling",
          last_transition_at: new Date().toISOString(),
        }),
      exchange.sessionBinding,
    );
    this.sessionStatus = "current";
    // Transition to enrolling as the verified account awaits first device enrollment
    this.lifecycle = "enrolling";
    this.enrollmentStatus = "pending";
    this.messageKey = "shell.identity.verifiedWaitingEnrollment";
    this.actionKey = "shell.identity.action.confirmEnrollment";
    this.nextActions = Object.freeze(["reconcile"]);
    this.notifyStateChange();
    return this.getState();
  }

  async confirmEnrollment(label?: string): Promise<RendererIdentityState> {
    const generation = this.authorityGeneration;
    if (!this.enrollment) {
      this.lifecycle = "recovery_required";
      this.messageKey = "shell.identity.enrollmentUnavailable";
      this.actionKey = "shell.identity.action.retry";
      this.nextActions = Object.freeze(["retry"]);
      this.notifyStateChange();
      return this.getState();
    }
    const result = await this.enrollment.confirm(label);
    if (!this.isCurrent(generation)) return this.getState();
    if (result.status === "enrolled") {
      this.safeDeviceLabel = result.deviceLabel;
      this.lifecycle = "enrolled";
      this.enrollmentStatus = "enrolled";
      this.messageKey = "shell.identity.enrolled";
      this.actionKey = "shell.identity.action.none";
      this.nextActions = Object.freeze([]);
    } else {
      this.lifecycle =
        result.status === "protection_unavailable"
          ? "protection_unavailable"
          : "recovery_required";
      this.enrollmentStatus =
        result.status === "rejected" ? "rejected" : "pending";
      this.messageKey = "shell.identity.enrollmentRecoveryRequired";
      this.actionKey = "shell.identity.action.reconcile";
      this.nextActions = Object.freeze(["reconcile"]);
    }
    this.notifyStateChange();
    return this.getState();
  }

  async retryReconciliation(): Promise<RendererIdentityState> {
    const generation = this.authorityGeneration;
    if (!this.enrollment) return this.confirmEnrollment();
    const result = await this.enrollment.reconcile();
    if (!this.isCurrent(generation)) return this.getState();
    if (result.status === "enrolled") {
      this.lifecycle = "enrolled";
      this.enrollmentStatus = "enrolled";
      this.messageKey = "shell.identity.enrolled";
      this.actionKey = "shell.identity.action.none";
      this.nextActions = Object.freeze([]);
    } else {
      this.lifecycle = "recovery_required";
      this.messageKey = "shell.identity.enrollmentRecoveryRequired";
      this.actionKey = "shell.identity.action.reconcile";
      this.nextActions = Object.freeze(["reconcile"]);
    }
    this.notifyStateChange();
    return this.getState();
  }

  async signOut(): Promise<RendererIdentityState> {
    this.authorityGeneration += 1;
    this.handoff.closeLoopbackListener();
    if (this.currentAttempt) {
      this.attempts.cancelAttempt(
        this.currentAttempt.attempt_id,
        this.profileId,
        this.profileGeneration,
      );
      this.currentAttempt = null;
    }
    this.currentRedirectUri = null;
    let signedOut;
    try {
      signedOut = this.sessionOwner.signOut();
      this.profileGeneration = signedOut.profileGeneration;
    } catch {
      this.verifiedAccount = null;
      this.enrollment = null;
      this.safeDeviceLabel = undefined;
      this.sessionStatus = "none";
      this.enrollmentStatus = "not_enrolled";
      this.lifecycle = "recovery_required";
      this.messageKey = "shell.identity.recovery.contactSupport";
      this.actionKey = "shell.identity.action.contactSupport";
      this.nextActions = Object.freeze(["contact_support"]);
      await this.onTeardown?.();
      this.notifyStateChange();
      return this.getState();
    }
    this.verifiedAccount = null;
    this.enrollment = null;
    this.safeDeviceLabel = undefined;
    this.sessionStatus = "none";
    this.enrollmentStatus = "not_enrolled";
    this.retainedWork = signedOut.retainedWork;
    this.lifecycle = "sign_in_required";
    this.messageKey = signedOut.retainedWork === "none"
      ? "shell.identity.signedOut"
      : "shell.identity.signedOutRetainedWork";
    this.actionKey = "shell.identity.action.signIn";
    this.nextActions = Object.freeze(["sign_in_again"]);
    await this.onTeardown?.();
    this.notifyStateChange();
    return this.getState();
  }

  async confirmAccountSwitch(): Promise<RendererIdentityState> {
    return this.signOut();
  }
}
