import crypto from "node:crypto";
import type {
  LocalAccountProfile,
  ProtectedSessionBinding,
} from "../../shared/identity-contracts.ts";
import { hasControlCharacters } from "../../shared/identity-contracts.ts";
import type { VerifiedAccount } from "./session-owner.ts";
import type {
  ProtectedIdentityStore,
  StoredEnrollmentIntent,
} from "./protected-identity-store.ts";

export type EnrollmentServiceResult =
  | Readonly<{
      status: "enrolled";
      deviceEnrollmentId: string;
      deviceId: string;
      receiptId: string;
    }>
  | Readonly<{ status: "outcome_unknown" | "not_enrolled" | "rejected" }>;

export interface EnrollmentService {
  enroll(
    account: Readonly<{ issuerId: string; subjectId: string }>,
    request: StoredEnrollmentIntent,
  ): Promise<EnrollmentServiceResult>;
  result(
    account: Readonly<{ issuerId: string; subjectId: string }>,
    enrollmentIntentId: string,
  ): Promise<EnrollmentServiceResult | null>;
}

export type EnrollmentCoordinatorResult = Readonly<{
  status:
    | "enrolled"
    | "outcome_unknown"
    | "not_enrolled"
    | "rejected"
    | "protection_unavailable"
    | "recovery_required";
  deviceLabel?: string;
}>;

type Options = Readonly<{
  store: ProtectedIdentityStore;
  service: EnrollmentService;
  account: VerifiedAccount | Readonly<{ issuer_id: string; subject_id: string }>;
  profile: LocalAccountProfile;
  sessionBinding: ProtectedSessionBinding;
  installationContextId: string;
  platform: string;
  architecture: string;
  appVersion: string;
  protectionProofReference: string;
  isCurrent?: () => boolean;
}>;

function digest(value: Record<string, unknown>): string {
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))),
  );
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export class EnrollmentCoordinator {
  private readonly options: Options;
  private pending: Promise<EnrollmentCoordinatorResult> | null = null;

  constructor(options: Options) {
    this.options = options;
  }

  confirm(deviceLabel?: string): Promise<EnrollmentCoordinatorResult> {
    return this.runOnce(() => this.confirmOnce(deviceLabel));
  }

  private runOnce(operation: () => Promise<EnrollmentCoordinatorResult>): Promise<EnrollmentCoordinatorResult> {
    if (this.pending) return this.pending;
    this.pending = operation().catch(() => Object.freeze({ status: "recovery_required" as const }))
      .finally(() => { this.pending = null; });
    return this.pending;
  }

  private async confirmOnce(deviceLabel?: string): Promise<EnrollmentCoordinatorResult> {
    const { store, profile, account, sessionBinding } = this.options;
    if (this.options.isCurrent && !this.options.isCurrent())
      return Object.freeze({ status: "recovery_required" });
    try {
      store.assertProtectionUsable();
    } catch {
      return Object.freeze({ status: "protection_unavailable" });
    }
    if (
      profile.issuer_id !== account.issuer_id ||
      profile.subject_id !== account.subject_id ||
      sessionBinding.issuer_id !== account.issuer_id ||
      sessionBinding.subject_id !== account.subject_id ||
      sessionBinding.profile_id !== profile.profile_id ||
      sessionBinding.profile_generation !== profile.profile_generation ||
      sessionBinding.status !== "current" ||
      sessionBinding.protected_write_status !== "committed"
    ) return Object.freeze({ status: "recovery_required" });

    const label = deviceLabel?.trim();
    if (label && (label.length > 64 || hasControlCharacters(label))) {
      return Object.freeze({ status: "rejected" });
    }

    let intent = store.loadEnrollmentIntent();
    if (
      !intent ||
      intent.status === "reconciled_not_enrolled" ||
      intent.status === "rejected"
    ) {
      const input = {
        profileReference: `profile:${profile.profile_id}`,
        profileGeneration: profile.profile_generation,
        installationContextId: this.options.installationContextId,
        deviceContextDigest: digest({
          platform: this.options.platform,
          architecture: this.options.architecture,
          appVersion: this.options.appVersion,
          installationContextId: this.options.installationContextId,
        }),
        deviceLabel: label,
        platform: this.options.platform,
        architecture: this.options.architecture,
        appVersion: this.options.appVersion,
        protectionProofReference: this.options.protectionProofReference,
        payloadVersion: 1 as const,
      };
      intent = Object.freeze({
        enrollmentIntentId: crypto.randomUUID(),
        ...input,
        requestDigest: digest(input),
        status: "prepared" as const,
      });
      store.saveEnrollmentIntent(intent);
    }

    if (intent.status === "locally_committed") {
      return Object.freeze({ status: "enrolled", ...(label ? { deviceLabel: label } : {}) });
    }

    intent = Object.freeze({ ...intent, status: "submitted" });
    store.saveEnrollmentIntent(intent);

    let result: EnrollmentServiceResult;
    try {
      result = await this.options.service.enroll(
        { issuerId: account.issuer_id, subjectId: account.subject_id },
        intent,
      );
    } catch {
      result = { status: "outcome_unknown" };
    }
    return this.applyResult(intent, result, label);
  }

  reconcile(): Promise<EnrollmentCoordinatorResult> {
    return this.runOnce(() => this.reconcileOnce());
  }

  private async reconcileOnce(): Promise<EnrollmentCoordinatorResult> {
    if (this.options.isCurrent && !this.options.isCurrent())
      return Object.freeze({ status: "recovery_required" });
    this.options.store.assertProtectionUsable();
    const intent = this.options.store.loadEnrollmentIntent();
    if (!intent) return Object.freeze({ status: "not_enrolled" });
    let result: EnrollmentServiceResult | null;
    try { result = await this.options.service.result(
      {
        issuerId: this.options.account.issuer_id,
        subjectId: this.options.account.subject_id,
      },
      intent.enrollmentIntentId,
    ); } catch { result = { status: "outcome_unknown" }; }
    return this.applyResult(intent, result ?? { status: "outcome_unknown" }, intent.deviceLabel);
  }

  private applyResult(
    intent: StoredEnrollmentIntent,
    result: EnrollmentServiceResult,
    deviceLabel?: string,
  ): EnrollmentCoordinatorResult {
    const { store, profile, sessionBinding } = this.options;
    if (this.options.isCurrent && !this.options.isCurrent())
      return Object.freeze({ status: "recovery_required" });
    const latest = store.loadEnrollmentIntent();
    if (latest?.enrollmentIntentId !== intent.enrollmentIntentId)
      return Object.freeze({ status: "recovery_required" });
    if (latest.status === "locally_committed") return Object.freeze({ status: "enrolled" });
    if (result.status !== "enrolled") {
      const status = result.status === "outcome_unknown" ? "outcome_unknown" : result.status;
      store.saveEnrollmentIntent({
        ...intent,
        status:
          status === "not_enrolled" ? "reconciled_not_enrolled" : status,
      });
      return Object.freeze({ status });
    }
    try {
      store.assertProtectionUsable();
      store.saveEnrollmentIntent({
        ...intent,
        status: "service_confirmed",
        deviceEnrollmentId: result.deviceEnrollmentId,
        receiptId: result.receiptId,
      });
      store.saveSessionBinding(sessionBinding);
      store.saveProfile({
        ...profile,
        lifecycle: "enrolled",
        last_transition_at: new Date().toISOString(),
      });
      store.saveEnrollmentIntent({
        ...intent,
        status: "locally_committed",
        deviceEnrollmentId: result.deviceEnrollmentId,
        receiptId: result.receiptId,
      });
      return Object.freeze({ status: "enrolled", ...(deviceLabel ? { deviceLabel } : {}) });
    } catch {
      store.saveEnrollmentIntent({ ...intent, status: "recovery_required" });
      return Object.freeze({ status: "recovery_required" });
    }
  }
}

