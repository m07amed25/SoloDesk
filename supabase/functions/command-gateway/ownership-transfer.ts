// Atomic two-phase ownership transfer transaction
// Promotes new owner before demoting previous owner to satisfy prevent_last_owner_removal trigger.

import type { TrustedContext } from "../../../app/shared/cloud-contracts.ts";
import { assertActionAuthorized } from "./role-authorizer.ts";

export interface OwnershipTransferDb {
  transaction<T>(fn: () => T): T;
  prepare(sql: string): {
    get(...params: any[]): any;
    run(...params: any[]): any;
  };
}

export function executeOwnershipTransfer(
  db: OwnershipTransferDb,
  context: TrustedContext,
  targetUserId: string,
  newFormerOwnerRole: "admin" | "manager" = "admin",
): { success: true; transferredAt: string } {
  // Only current Owner can transfer ownership
  assertActionAuthorized(context.role, "workspace.transfer_ownership");

  if (context.actorId === targetUserId) {
    const err = new Error("Cannot transfer ownership to yourself");
    (err as any).statusCode = 400;
    throw err;
  }

  const tx = db.transaction(() => {
    // 1. Verify target user is an active member
    const targetMember = db
      .prepare(
        "SELECT role, status FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?",
      )
      .get(context.workspaceId, targetUserId);

    if (!targetMember || targetMember.status !== "active") {
      const err = new Error("Target user must be an active workspace member");
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Phase 1: Promote target user to 'owner' first (ensuring active owner count >= 2)
    db.prepare(
      "UPDATE workspace_memberships SET role = 'owner', updated_at = datetime('now') WHERE workspace_id = ? AND user_id = ?",
    ).run(context.workspaceId, targetUserId);

    // 3. Phase 2: Demote former owner to new role (e.g. 'admin')
    db.prepare(
      "UPDATE workspace_memberships SET role = ?, updated_at = datetime('now') WHERE workspace_id = ? AND user_id = ?",
    ).run(newFormerOwnerRole, context.workspaceId, context.actorId);

    // 4. Record audit event
    const auditId = `aud_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const correlationId = `cor_${Date.now()}`;
    const diff = JSON.stringify({
      previousOwner: context.actorId,
      newOwner: targetUserId,
      formerOwnerNewRole: newFormerOwnerRole,
    });

    db.prepare(
      `
      INSERT INTO tenant_audit_events
      (id, workspace_id, actor_id, action_type, target_resource_type, target_resource_id, change_diff, correlation_id, occurred_at)
      VALUES (?, ?, ?, 'owner_transferred', 'workspace_tenants', ?, ?, ?, datetime('now'))
    `,
    ).run(
      auditId,
      context.workspaceId,
      context.actorId,
      context.workspaceId,
      diff,
      correlationId,
    );

    return {
      success: true,
      transferredAt: new Date().toISOString(),
    };
  });

  return tx();
}
