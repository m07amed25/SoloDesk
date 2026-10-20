import type {
  AuditAction,
  AuditAccessGrant,
  ActorKind,
} from "../../../packages/contracts/src/audit-evidence.ts";
import type { Code as PublicErrorCode } from "../../../packages/contracts/src/errors.ts";

export interface EvaluatedAuthority {
  authorized: boolean;
  actorId: string;
  actorKind: ActorKind;
  workspaceId: string;
  role?: string;
  grantId?: string;
  denialReason?: PublicErrorCode;
  safeMessage?: string;
}

export interface AuthorityEvaluationContext {
  verifiedActorId: string;
  claimedWorkspaceId: string;
  requiredAction?: AuditAction | "command_execute";
  resourceKind?: string | null;
  resourceId?: string | null;
  purposeCode?: string | null;
  isServiceOperator?: boolean;
}

export interface DatabaseMembershipReader {
  getMembership(
    workspaceId: string,
    actorId: string,
  ):
    | Promise<{
        role: string;
        status: string;
      } | null>
    | { role: string; status: string }
    | null;
  getAuditGrant?(
    workspaceId: string,
    subjectId: string,
    action: AuditAction,
  ): Promise<AuditAccessGrant | null> | AuditAccessGrant | null;
}

// Global flag for service audit access policy gate (default: false / disabled)
export const SERVICE_AUDIT_ACCESS_POLICY_ENABLED = false;

export async function evaluateEvidenceAuthority(
  context: AuthorityEvaluationContext,
  reader: DatabaseMembershipReader,
): Promise<EvaluatedAuthority> {
  const {
    verifiedActorId,
    claimedWorkspaceId,
    requiredAction = "command_execute",
    isServiceOperator = false,
  } = context;

  // 1. Service operator branch
  if (isServiceOperator) {
    if (!SERVICE_AUDIT_ACCESS_POLICY_ENABLED) {
      return {
        authorized: false,
        actorId: verifiedActorId,
        actorKind: "service_operator",
        workspaceId: claimedWorkspaceId,
        denialReason: "FORBIDDEN",
        safeMessage: "Service audit access is disabled by policy",
      };
    }

    if (!reader.getAuditGrant) {
      return {
        authorized: false,
        actorId: verifiedActorId,
        actorKind: "service_operator",
        workspaceId: claimedWorkspaceId,
        denialReason: "FORBIDDEN",
      };
    }

    const grant = await reader.getAuditGrant(
      claimedWorkspaceId,
      verifiedActorId,
      requiredAction as AuditAction,
    );

    if (!grant) {
      return {
        authorized: false,
        actorId: verifiedActorId,
        actorKind: "service_operator",
        workspaceId: claimedWorkspaceId,
        denialReason: "FORBIDDEN",
      };
    }

    const now = new Date();
    const startsAt = new Date(grant.starts_at);
    const expiresAt = new Date(grant.expires_at);

    if (grant.revoked_at || now < startsAt || now > expiresAt) {
      return {
        authorized: false,
        actorId: verifiedActorId,
        actorKind: "service_operator",
        workspaceId: claimedWorkspaceId,
        denialReason: "SESSION_REVOKED",
      };
    }

    return {
      authorized: true,
      actorId: verifiedActorId,
      actorKind: "service_operator",
      workspaceId: claimedWorkspaceId,
      grantId: grant.grant_id,
    };
  }

  // 2. Member branch - Recheck membership status live in database
  const membership = await reader.getMembership(
    claimedWorkspaceId,
    verifiedActorId,
  );

  if (!membership || membership.status !== "active") {
    return {
      authorized: false,
      actorId: verifiedActorId,
      actorKind: "member",
      workspaceId: claimedWorkspaceId,
      denialReason:
        membership?.status === "revoked" ? "SESSION_REVOKED" : "FORBIDDEN",
      safeMessage: "Unauthorized or revoked membership",
    };
  }

  // If command execution, any active member has role permissions evaluated inside transaction
  if (requiredAction === "command_execute") {
    return {
      authorized: true,
      actorId: verifiedActorId,
      actorKind: "member",
      workspaceId: claimedWorkspaceId,
      role: membership.role,
    };
  }

  // Audit query actions: owner/admin have built-in audit_read / audit_search;
  // other members or audit_export require an explicit grant
  if (
    (membership.role === "owner" || membership.role === "admin") &&
    (requiredAction === "audit_read" || requiredAction === "audit_search")
  ) {
    return {
      authorized: true,
      actorId: verifiedActorId,
      actorKind: "member",
      workspaceId: claimedWorkspaceId,
      role: membership.role,
    };
  }

  // Check explicit grant
  if (reader.getAuditGrant) {
    const grant = await reader.getAuditGrant(
      claimedWorkspaceId,
      verifiedActorId,
      requiredAction as AuditAction,
    );

    if (grant) {
      const now = new Date();
      if (
        grant.workspace_id === claimedWorkspaceId &&
        grant.subject_id === verifiedActorId &&
        grant.subject_kind === "member" &&
        grant.action === requiredAction &&
        (!grant.resource_kind || grant.resource_kind === context.resourceKind) &&
        (!grant.resource_id || grant.resource_id === context.resourceId) &&
        (!grant.purpose_code || grant.purpose_code === context.purposeCode) &&
        !grant.revoked_at &&
        now >= new Date(grant.starts_at) &&
        now < new Date(grant.expires_at)
      ) {
        return {
          authorized: true,
          actorId: verifiedActorId,
          actorKind: "member",
          workspaceId: claimedWorkspaceId,
          role: membership.role,
          grantId: grant.grant_id,
        };
      }
    }
  }

  return {
    authorized: false,
    actorId: verifiedActorId,
    actorKind: "member",
    workspaceId: claimedWorkspaceId,
    role: membership.role,
    denialReason: "FORBIDDEN",
    safeMessage: "Missing required audit action grant",
  };
}
