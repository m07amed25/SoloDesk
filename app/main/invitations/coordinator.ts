import type { WorkspaceContextEnvelope } from "../../shared/workspace-contracts.ts";
import { isMatchingContextEnvelope } from "../../shared/workspace-contracts.ts";
import {
  type GetInvitationPolicyResult,
  type ListInvitationsInput,
  type ListInvitationsResult,
  type CreateInvitationInput,
  type CreateInvitationResult,
  type ResendInvitationInput,
  type ResendInvitationResult,
  type RevokeInvitationInput,
  type RevokeInvitationResult,
  type ReconcileInvitationInput,
  type ReconcileInvitationResult,
  createSafeInvitationFailure,
} from "../../shared/invitation-contracts.ts";
import type { InvitationService } from "./invitation-service.ts";

export interface InvitationCoordinatorOptions {
  readonly profileId: string;
  readonly getProfileGeneration: () => number;
  readonly getContextEnvelope: () => WorkspaceContextEnvelope | null;
  readonly getAccessToken: () => Promise<string | null>;
  readonly getDeviceEnrollmentId: () => string | null;
  readonly invitationService: InvitationService;
}

export class InvitationCoordinator {
  private readonly profileId: string;
  private readonly getProfileGeneration: () => number;
  private readonly getContextEnvelope: () => WorkspaceContextEnvelope | null;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly getDeviceEnrollmentId: () => string | null;
  private readonly service: InvitationService;

  private isBusy = false;
  private busyQueue: (() => void)[] = [];

  constructor(options: InvitationCoordinatorOptions) {
    this.profileId = options.profileId;
    this.getProfileGeneration = options.getProfileGeneration;
    this.getContextEnvelope = options.getContextEnvelope;
    this.getAccessToken = options.getAccessToken;
    this.getDeviceEnrollmentId = options.getDeviceEnrollmentId;
    this.service = options.invitationService;
  }

  private async acquireLock(): Promise<() => void> {
    if (!this.isBusy) {
      this.isBusy = true;
      return () => this.releaseLock();
    }
    await new Promise<void>((resolve) => {
      this.busyQueue.push(resolve);
    });
    this.isBusy = true;
    return () => this.releaseLock();
  }

  private releaseLock(): void {
    if (this.busyQueue.length > 0) {
      const next = this.busyQueue.shift();
      next?.();
    } else {
      this.isBusy = false;
    }
  }

  private validateEnvelope(
    candidate: unknown,
  ): { ok: true; envelope: WorkspaceContextEnvelope } | { ok: false } {
    const current = this.getContextEnvelope();
    if (!current) return { ok: false };
    if (!candidate || typeof candidate !== "object") return { ok: false };
    if (
      isMatchingContextEnvelope(candidate as WorkspaceContextEnvelope, current)
    ) {
      return { ok: true, envelope: current };
    }
    const cand = candidate as Partial<WorkspaceContextEnvelope> & {
      generation?: number;
    };
    if (
      cand.workspaceId === current.workspaceId &&
      (cand.profileReference === undefined ||
        cand.profileReference === current.profileReference) &&
      (cand.profileGeneration === undefined ||
        cand.profileGeneration === current.profileGeneration) &&
      (cand.selectionGeneration === undefined ||
        cand.selectionGeneration === current.selectionGeneration)
    ) {
      return { ok: true, envelope: current };
    }
    return { ok: false };
  }

  async getPolicy(
    envelope: WorkspaceContextEnvelope,
  ): Promise<GetInvitationPolicyResult> {
    const validation = this.validateEnvelope(envelope);
    if (!validation.ok) {
      return createSafeInvitationFailure("stale_state", "refresh");
    }
    const token = await this.getAccessToken();
    if (!token) {
      return createSafeInvitationFailure(
        "online_required",
        "connect_and_retry",
      );
    }
    return this.service.getPolicy(validation.envelope.workspaceId, token);
  }

  async list(
    envelope: WorkspaceContextEnvelope,
    input: ListInvitationsInput,
  ): Promise<ListInvitationsResult> {
    const validation = this.validateEnvelope(envelope);
    if (!validation.ok) {
      return createSafeInvitationFailure("stale_state", "refresh");
    }
    const token = await this.getAccessToken();
    if (!token) {
      return createSafeInvitationFailure(
        "online_required",
        "connect_and_retry",
      );
    }
    const result = await this.service.list(
      validation.envelope.workspaceId,
      input,
      token,
    );
    const recheck = this.validateEnvelope(envelope);
    if (!recheck.ok) {
      return createSafeInvitationFailure("stale_state", "refresh");
    }
    return result;
  }

  async create(
    envelope: WorkspaceContextEnvelope,
    input: CreateInvitationInput,
  ): Promise<CreateInvitationResult> {
    const release = await this.acquireLock();
    try {
      const validation = this.validateEnvelope(envelope);
      if (!validation.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      const token = await this.getAccessToken();
      const deviceId = this.getDeviceEnrollmentId();
      if (!token || !deviceId) {
        return createSafeInvitationFailure(
          "online_required",
          "connect_and_retry",
        );
      }
      const result = await this.service.create(
        validation.envelope.workspaceId,
        input,
        deviceId,
        token,
      );
      // Ensure context did not change while network call was processing
      const recheck = this.validateEnvelope(envelope);
      if (!recheck.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      return result;
    } finally {
      release();
    }
  }

  async resend(
    envelope: WorkspaceContextEnvelope,
    input: ResendInvitationInput,
  ): Promise<ResendInvitationResult> {
    const release = await this.acquireLock();
    try {
      const validation = this.validateEnvelope(envelope);
      if (!validation.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      const token = await this.getAccessToken();
      const deviceId = this.getDeviceEnrollmentId();
      if (!token || !deviceId) {
        return createSafeInvitationFailure(
          "online_required",
          "connect_and_retry",
        );
      }
      const result = await this.service.resend(
        validation.envelope.workspaceId,
        input,
        deviceId,
        token,
      );
      const recheck = this.validateEnvelope(envelope);
      if (!recheck.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      return result;
    } finally {
      release();
    }
  }

  async revoke(
    envelope: WorkspaceContextEnvelope,
    input: RevokeInvitationInput,
  ): Promise<RevokeInvitationResult> {
    const release = await this.acquireLock();
    try {
      const validation = this.validateEnvelope(envelope);
      if (!validation.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      const token = await this.getAccessToken();
      const deviceId = this.getDeviceEnrollmentId();
      if (!token || !deviceId) {
        return createSafeInvitationFailure(
          "online_required",
          "connect_and_retry",
        );
      }
      const result = await this.service.revoke(
        validation.envelope.workspaceId,
        input,
        deviceId,
        token,
      );
      const recheck = this.validateEnvelope(envelope);
      if (!recheck.ok) {
        return createSafeInvitationFailure("stale_state", "refresh");
      }
      return result;
    } finally {
      release();
    }
  }

  async reconcile(
    envelope: WorkspaceContextEnvelope,
    input: ReconcileInvitationInput,
  ): Promise<ReconcileInvitationResult> {
    const validation = this.validateEnvelope(envelope);
    if (!validation.ok) {
      return createSafeInvitationFailure("stale_state", "refresh");
    }
    const token = await this.getAccessToken();
    if (!token) {
      return createSafeInvitationFailure(
        "online_required",
        "connect_and_retry",
      );
    }
    return this.service.reconcile(
      validation.envelope.workspaceId,
      input,
      token,
    );
  }
}
