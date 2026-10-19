import type {
  TrustedContext,
  WorkspaceRole,
  MembershipStatus,
} from "../../../app/shared/cloud-contracts.ts";
import { assertActionAuthorized } from "./role-authorizer.ts";

export interface MembershipRecord {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  invited_email?: string | null;
  invitation_token?: string | null;
}

export interface MembershipDbAdapter {
  getMember(workspaceId: string, userId: string): MembershipRecord | null;
  getActiveOwnerCount(workspaceId: string): number;
  insertMember(record: MembershipRecord): void;
  updateMember(
    workspaceId: string,
    userId: string,
    updates: Partial<MembershipRecord>,
  ): void;
  deleteMember(workspaceId: string, userId: string): void;
}

export class MembershipHandler {
  constructor(private adapter: MembershipDbAdapter) {}

  inviteMember(
    context: TrustedContext,
    targetUserId: string,
    role: WorkspaceRole,
    email: string,
  ): MembershipRecord {
    assertActionAuthorized(context.role, "membership.invite");

    const record: MembershipRecord = {
      workspace_id: context.workspaceId,
      user_id: targetUserId,
      role,
      status: "invited",
      invited_email: email,
      invitation_token: `inv_${Math.random().toString(36).substring(2, 12)}`,
    };

    this.adapter.insertMember(record);
    return record;
  }

  updateMemberRole(
    context: TrustedContext,
    targetUserId: string,
    newRole: WorkspaceRole,
  ): void {
    assertActionAuthorized(context.role, "membership.update_role");

    const existing = this.adapter.getMember(context.workspaceId, targetUserId);
    if (!existing) {
      const err = new Error("Member not found");
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.role === "owner" && newRole !== "owner") {
      const activeOwners = this.adapter.getActiveOwnerCount(
        context.workspaceId,
      );
      if (activeOwners <= 1) {
        const err = new Error(
          "Ownership continuity violation: cannot downgrade the sole workspace Owner.",
        );
        (err as any).statusCode = 400;
        (err as any).code = "23514";
        throw err;
      }
    }

    this.adapter.updateMember(context.workspaceId, targetUserId, {
      role: newRole,
    });
  }

  revokeMember(context: TrustedContext, targetUserId: string): void {
    assertActionAuthorized(context.role, "membership.revoke");

    const existing = this.adapter.getMember(context.workspaceId, targetUserId);
    if (!existing) {
      const err = new Error("Member not found");
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.role === "owner") {
      const activeOwners = this.adapter.getActiveOwnerCount(
        context.workspaceId,
      );
      if (activeOwners <= 1) {
        const err = new Error(
          "Ownership continuity violation: cannot revoke the sole workspace Owner.",
        );
        (err as any).statusCode = 400;
        (err as any).code = "23514";
        throw err;
      }
    }

    this.adapter.updateMember(context.workspaceId, targetUserId, {
      status: "revoked",
    });
  }
}
