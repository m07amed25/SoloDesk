import crypto from "node:crypto";
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
  type SafeInvitationFailure,
  createSafeInvitationFailure,
  normalizeAndValidateRecipientEmail,
  computeInvitationOperationDigest,
  INVITATION_BOUNDS,
} from "../../shared/invitation-contracts.ts";

export type RpcExecutor = (
  functionName: string,
  params?: Record<string, unknown>,
  accessToken?: string,
) => Promise<unknown>;

export interface InvitationServiceConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly rpcExecutor?: RpcExecutor;
  readonly deliverySink?: (dispatch: {
    invitationId: string;
    recipientEmail: string;
    selector: string;
    secret: string;
  }) => Promise<{ ok: boolean }>;
}

export function mapServiceErrorToSafeFailure(
  error: unknown,
  fallbackCode:
    | "temporarily_unavailable"
    | "outcome_unknown" = "temporarily_unavailable",
): SafeInvitationFailure {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("ECONNREFUSED")
  ) {
    return createSafeInvitationFailure("online_required", "connect_and_retry");
  }
  if (
    msg.includes("not_authorized") ||
    msg.includes("JWT") ||
    msg.includes("auth")
  ) {
    return createSafeInvitationFailure("not_authorized", "connect_and_retry");
  }
  if (msg.includes("recipient_already_member")) {
    return createSafeInvitationFailure("recipient_already_member", "none", {
      field: "recipient",
    });
  }
  if (msg.includes("invitation_already_pending")) {
    return createSafeInvitationFailure(
      "invitation_already_pending",
      "refresh",
      { field: "recipient" },
    );
  }
  if (
    msg.includes("stale_state") ||
    msg.includes("revision") ||
    msg.includes("conflict")
  ) {
    return createSafeInvitationFailure("stale_state", "refresh");
  }
  if (msg.includes("policy_unavailable")) {
    return createSafeInvitationFailure("policy_unavailable", "refresh", {
      field: "offer",
    });
  }
  if (msg.includes("invalid_input") || msg.includes("validation")) {
    return createSafeInvitationFailure("invalid_input", "correct_input");
  }
  if (msg.includes("rate_limited")) {
    return createSafeInvitationFailure("rate_limited", "try_again_later");
  }
  return createSafeInvitationFailure(fallbackCode, "connect_and_retry");
}

export class InvitationService {
  private readonly config: InvitationServiceConfig;
  private readonly rpc: RpcExecutor;

  constructor(config: InvitationServiceConfig) {
    this.config = config;
    this.rpc =
      config.rpcExecutor ??
      (async (fn: string, params?: Record<string, unknown>, token?: string) => {
        const url = `${this.config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: this.config.supabaseAnonKey,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: params ? JSON.stringify(params) : "{}",
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(
            `RPC ${fn} failed (${resp.status}): ${text.slice(0, 200)}`,
          );
        }
        return resp.json();
      });
  }

  async getPolicy(
    workspaceId: string,
    accessToken?: string,
  ): Promise<GetInvitationPolicyResult> {
    try {
      const result = (await this.rpc(
        "solodesk_invitation_get_policy",
        { p_workspace_id: workspaceId },
        accessToken,
      )) as GetInvitationPolicyResult;
      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err);
    }
  }

  async list(
    workspaceId: string,
    input: ListInvitationsInput,
    accessToken?: string,
  ): Promise<ListInvitationsResult> {
    try {
      const pageSize = Math.min(
        Math.max(input.pageSize || INVITATION_BOUNDS.defaultPageSize, 1),
        INVITATION_BOUNDS.maxPageSize,
      );
      const result = (await this.rpc(
        "solodesk_invitation_list",
        {
          p_workspace_id: workspaceId,
          p_page_size: pageSize,
          p_cursor: input.cursor ?? null,
        },
        accessToken,
      )) as ListInvitationsResult;
      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err);
    }
  }

  async create(
    workspaceId: string,
    input: CreateInvitationInput,
    deviceEnrollmentId: string,
    accessToken?: string,
  ): Promise<CreateInvitationResult> {
    try {
      const validatedEmail = normalizeAndValidateRecipientEmail(
        input.recipient.value,
      );
      if (!validatedEmail.ok) {
        return createSafeInvitationFailure("invalid_input", "correct_input", {
          field: "recipient",
        });
      }

      // Mint in-memory random selector and 256-bit secret
      const selector = `sel_${crypto.randomBytes(16).toString("hex")}`;
      const rawSecret = crypto.randomBytes(32);
      const secretDigest = crypto
        .createHash("sha256")
        .update(`solodesk:f013:secret:${rawSecret.toString("hex")}`)
        .digest();

      const requestDigest = computeInvitationOperationDigest("create", {
        workspaceId,
        recipientEmail: validatedEmail.email,
        offerRef: input.offerRef,
        policyRevision: input.policyRevision,
      });

      const result = (await this.rpc(
        "solodesk_invitation_create",
        {
          p_workspace_id: workspaceId,
          p_operation_id: input.operationId,
          p_request_digest: requestDigest,
          p_recipient_email: validatedEmail.email,
          p_offer_ref: input.offerRef,
          p_policy_revision: input.policyRevision,
          p_device_enrollment_id: deviceEnrollmentId,
          p_selector: selector,
          p_secret_digest: "\\x" + secretDigest.toString("hex"),
        },
        accessToken,
      )) as CreateInvitationResult;

      // Single outside-transaction dispatch attempt to sink
      if (result.ok && this.config.deliverySink) {
        try {
          await this.config.deliverySink({
            invitationId: result.invitation.invitationId,
            recipientEmail: validatedEmail.email,
            selector,
            secret: rawSecret.toString("hex"),
          });
        } catch {
          // Delivery sink failure does not roll back committed invitation
        }
      }

      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err, "outcome_unknown");
    }
  }

  async resend(
    workspaceId: string,
    input: ResendInvitationInput,
    deviceEnrollmentId: string,
    accessToken?: string,
  ): Promise<ResendInvitationResult> {
    try {
      const selector = `sel_${crypto.randomBytes(16).toString("hex")}`;
      const rawSecret = crypto.randomBytes(32);
      const secretDigest = crypto
        .createHash("sha256")
        .update(`solodesk:f013:secret:${rawSecret.toString("hex")}`)
        .digest();

      const requestDigest = computeInvitationOperationDigest("resend", {
        workspaceId,
        invitationId: input.invitationId,
        expectedRevision: input.expectedRevision,
      });

      const result = (await this.rpc(
        "solodesk_invitation_resend",
        {
          p_workspace_id: workspaceId,
          p_operation_id: input.operationId,
          p_request_digest: requestDigest,
          p_invitation_id: input.invitationId,
          p_expected_revision: input.expectedRevision,
          p_selector: selector,
          p_secret_digest: "\\x" + secretDigest.toString("hex"),
        },
        accessToken,
      )) as ResendInvitationResult;

      if (result.ok && this.config.deliverySink) {
        try {
          await this.config.deliverySink({
            invitationId: input.invitationId,
            recipientEmail: result.invitation.recipientLabel,
            selector,
            secret: rawSecret.toString("hex"),
          });
        } catch {
          // Delivery failure remains distinct from committed invitation rotation
        }
      }

      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err, "outcome_unknown");
    }
  }

  async revoke(
    workspaceId: string,
    input: RevokeInvitationInput,
    deviceEnrollmentId: string,
    accessToken?: string,
  ): Promise<RevokeInvitationResult> {
    try {
      const requestDigest = computeInvitationOperationDigest("revoke", {
        workspaceId,
        invitationId: input.invitationId,
        expectedRevision: input.expectedRevision,
      });

      const result = (await this.rpc(
        "solodesk_invitation_revoke",
        {
          p_workspace_id: workspaceId,
          p_operation_id: input.operationId,
          p_request_digest: requestDigest,
          p_invitation_id: input.invitationId,
          p_expected_revision: input.expectedRevision,
        },
        accessToken,
      )) as RevokeInvitationResult;

      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err, "outcome_unknown");
    }
  }

  async reconcile(
    workspaceId: string,
    input: ReconcileInvitationInput,
    accessToken?: string,
  ): Promise<ReconcileInvitationResult> {
    try {
      const result = (await this.rpc(
        "solodesk_invitation_reconcile",
        {
          p_workspace_id: workspaceId,
          p_operation_id: input.operationId,
        },
        accessToken,
      )) as ReconcileInvitationResult;

      return result;
    } catch (err) {
      return mapServiceErrorToSafeFailure(err, "outcome_unknown");
    }
  }
}
