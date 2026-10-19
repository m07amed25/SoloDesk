// Role capability matrix authorizer for F008 Command Gateway
// Matches capability requirements in docs/specs/platform-and-workspaces.md and contracts/domain-gateway-boundary.md.

import type { WorkspaceRole } from "../../../app/shared/cloud-contracts.ts";

export type ActionCapability =
  | "workspace.settings"
  | "workspace.transfer_ownership"
  | "membership.invite"
  | "membership.update_role"
  | "membership.revoke"
  | "client.create"
  | "client.edit"
  | "client.delete"
  | "project.create"
  | "project.edit"
  | "project.delete"
  | "task.create"
  | "task.edit"
  | "task.delete"
  | "time.create_own"
  | "time.edit_own"
  | "time.approve_others"
  | "invoice.draft"
  | "invoice.issue"
  | "cost_rates.view"
  | "storage.upload"
  | "storage.delete"
  | "audit.read";

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<ActionCapability>> = {
  owner: new Set<ActionCapability>([
    "workspace.settings",
    "workspace.transfer_ownership",
    "membership.invite",
    "membership.update_role",
    "membership.revoke",
    "client.create",
    "client.edit",
    "client.delete",
    "project.create",
    "project.edit",
    "project.delete",
    "task.create",
    "task.edit",
    "task.delete",
    "time.create_own",
    "time.edit_own",
    "time.approve_others",
    "invoice.draft",
    "invoice.issue",
    "cost_rates.view",
    "storage.upload",
    "storage.delete",
    "audit.read",
  ]),

  admin: new Set<ActionCapability>([
    "workspace.settings",
    "membership.invite",
    "membership.update_role",
    "membership.revoke",
    "client.create",
    "client.edit",
    "client.delete",
    "project.create",
    "project.edit",
    "project.delete",
    "task.create",
    "task.edit",
    "task.delete",
    "time.create_own",
    "time.edit_own",
    "time.approve_others",
    "invoice.draft",
    "storage.upload",
    "storage.delete",
    "audit.read",
  ]),

  manager: new Set<ActionCapability>([
    "client.create",
    "client.edit",
    "project.create",
    "project.edit",
    "task.create",
    "task.edit",
    "task.delete",
    "time.create_own",
    "time.edit_own",
    "time.approve_others",
    "invoice.draft",
    "storage.upload",
  ]),

  contributor: new Set<ActionCapability>([
    "task.create",
    "task.edit",
    "time.create_own",
    "time.edit_own",
    "storage.upload",
  ]),

  finance: new Set<ActionCapability>([
    "time.create_own",
    "time.edit_own",
    "invoice.draft",
    "invoice.issue",
    "cost_rates.view",
    "storage.upload",
  ]),

  viewer: new Set<ActionCapability>([]),
};

export function isActionAuthorized(
  role: WorkspaceRole,
  capability: ActionCapability,
): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.has(capability) : false;
}

export function assertActionAuthorized(
  role: WorkspaceRole,
  capability: ActionCapability,
): void {
  if (!isActionAuthorized(role, capability)) {
    const err = new Error(
      `Forbidden: role '${role}' is not authorized for capability '${capability}'`,
    );
    (err as any).statusCode = 403;
    (err as any).code = "FORBIDDEN";
    throw err;
  }
}
