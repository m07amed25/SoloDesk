// Bounded create/reconcile routing for F013 Member Invitations in command gateway
// Mint secret only after admission, commit before delivery, never return secret in command response.

import crypto from "node:crypto";
import type { TrustedContext } from "../../../app/shared/cloud-contracts.ts";
import {
  type CreateInvitationResult,
  type ResendInvitationResult,
  type RevokeInvitationResult,
  type ReconcileInvitationResult,
  type SafeInvitationSummary,
  validateCreateInvitationInput,
  computeInvitationOperationDigest,
  createSafeInvitationFailure,
  INVITATION_BOUNDS,
} from "../../../app/shared/invitation-contracts.ts";
import { assertActionAuthorized } from "./role-authorizer.ts";

export interface InvitationDbAdapter {
  executeCreate(params: {
    workspaceId: string;
    actorId: string;
    operationId: string;
    requestDigest: string;
    recipientEmail: string;
    offerRef: string;
    policyRevision: number;
    selector: string;
    secretDigest: string;
  }): Promise<CreateInvitationResult>;

  executeReconcile(params: {
    workspaceId: string;
    actorId: string;
    operationId: string;
  }): Promise<ReconcileInvitationResult>;

  executeResend(params: {
    workspaceId: string;
    actorId: string;
    operationId: string;
    requestDigest: string;
    invitationId: string;
    expectedRevision: number;
    selector: string;
    secretDigest: string;
  }): Promise<ResendInvitationResult>;

  executeRevoke(params: {
    workspaceId: string;
    actorId: string;
    operationId: string;
    requestDigest: string;
    invitationId: string;
    expectedRevision: number;
  }): Promise<RevokeInvitationResult>;
}

export type DeliverySink = (dispatch: {
  invitationId: string;
  recipientEmail: string;
  selector: string;
  secret: string;
}) => Promise<{ ok: boolean }>;

export class InvitationHandler {
  constructor(
    private readonly db: InvitationDbAdapter,
    private readonly deliverySink?: DeliverySink,
  ) {}

  async create(
    context: TrustedContext,
    rawPayload: unknown,
    allowedOffers?: readonly string[],
  ): Promise<CreateInvitationResult> {
    // 1. Authorize actor
    try {
      assertActionAuthorized(context.role, "membership.invite");
    } catch {
      return createSafeInvitationFailure("not_authorized", "none");
    }

    // 2. Validate input and reject caller-supplied authority
    const validated = validateCreateInvitationInput(rawPayload, allowedOffers);
    if (!validated.ok) {
      return createSafeInvitationFailure(validated.code, "correct_input", {
        field: validated.field,
      });
    }

    // 3. Mint selector and 256-bit cryptographic secret ONLY after admission
    const selector = `sel_${crypto.randomBytes(16).toString("hex")}`;
    const rawSecret = crypto.randomBytes(32);
    const secretDigest = crypto
      .createHash("sha256")
      .update(`solodesk:f013:secret:${rawSecret.toString("hex")}`)
      .digest("hex");

    const requestDigest = computeInvitationOperationDigest("create", {
      workspaceId: context.workspaceId,
      recipientEmail: validated.input.recipient.value,
      offerRef: validated.input.offerRef,
      policyRevision: validated.input.policyRevision,
    });

    // 4. Commit to database atomically BEFORE delivery attempt
    const result = await this.db.executeCreate({
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      operationId: validated.input.operationId,
      requestDigest,
      recipientEmail: validated.input.recipient.value,
      offerRef: validated.input.offerRef,
      policyRevision: validated.input.policyRevision,
      selector,
      secretDigest: `\\x${secretDigest}`,
    });

    // 5. If committed successfully, attempt delivery once through deliverySink
    if (result.ok && this.deliverySink && result.effect === "created") {
      try {
        await this.deliverySink({
          invitationId: result.invitation.invitationId,
          recipientEmail: validated.input.recipient.value,
          selector,
          secret: rawSecret.toString("hex"),
        });
      } catch {
        // Delivery failure is tracked separately; committed invitation remains valid
      }
    }

    // 6. Return safe result; NEVER expose selector, secret, rawSecret, or secretDigest
    return result;
  }

  async resend(
    context: TrustedContext,
    rawPayload: unknown,
  ): Promise<ResendInvitationResult> {
    try {
      assertActionAuthorized(context.role, "membership.invite");
    } catch {
      return createSafeInvitationFailure("not_authorized", "none");
    }

    if (!rawPayload || typeof rawPayload !== "object") {
      return createSafeInvitationFailure("invalid_input", "correct_input");
    }

    const payload = rawPayload as Record<string, unknown>;
    const operationId = payload.operationId;
    const invitationId = payload.invitationId;
    const expectedRevision = payload.expectedRevision;

    if (
      typeof operationId !== "string" ||
      typeof invitationId !== "string" ||
      typeof expectedRevision !== "number" ||
      expectedRevision < 1
    ) {
      return createSafeInvitationFailure("invalid_input", "correct_input");
    }

    // Mint new selector and secret
    const selector = `sel_${crypto.randomBytes(16).toString("hex")}`;
    const rawSecret = crypto.randomBytes(32);
    const secretDigest = crypto
      .createHash("sha256")
      .update(`solodesk:f013:secret:${rawSecret.toString("hex")}`)
      .digest("hex");

    const requestDigest = computeInvitationOperationDigest("resend", {
      workspaceId: context.workspaceId,
      invitationId,
      expectedRevision,
    });

    const result = await this.db.executeResend({
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      operationId,
      requestDigest,
      invitationId,
      expectedRevision,
      selector,
      secretDigest: `\\x${secretDigest}`,
    });

    if (result.ok && this.deliverySink && result.effect === "resent") {
      try {
        await this.deliverySink({
          invitationId,
          recipientEmail: result.invitation.recipientLabel,
          selector,
          secret: rawSecret.toString("hex"),
        });
      } catch {
        // Delivery failure kept distinct from invitation commit
      }
    }

    return result;
  }

  async revoke(
    context: TrustedContext,
    rawPayload: unknown,
  ): Promise<RevokeInvitationResult> {
    try {
      assertActionAuthorized(context.role, "membership.invite");
    } catch {
      return createSafeInvitationFailure("not_authorized", "none");
    }

    if (!rawPayload || typeof rawPayload !== "object") {
      return createSafeInvitationFailure("invalid_input", "correct_input");
    }

    const payload = rawPayload as Record<string, unknown>;
    const operationId = payload.operationId;
    const invitationId = payload.invitationId;
    const expectedRevision = payload.expectedRevision;

    if (
      typeof operationId !== "string" ||
      typeof invitationId !== "string" ||
      typeof expectedRevision !== "number" ||
      expectedRevision < 1
    ) {
      return createSafeInvitationFailure("invalid_input", "correct_input");
    }

    const requestDigest = computeInvitationOperationDigest("revoke", {
      workspaceId: context.workspaceId,
      invitationId,
      expectedRevision,
    });

    return this.db.executeRevoke({
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      operationId,
      requestDigest,
      invitationId,
      expectedRevision,
    });
  }

  async reconcile(
    context: TrustedContext,
    operationId: string,
  ): Promise<ReconcileInvitationResult> {
    try {
      assertActionAuthorized(context.role, "membership.invite");
    } catch {
      return createSafeInvitationFailure("not_authorized", "none");
    }

    return this.db.executeReconcile({
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      operationId,
    });
  }
}
