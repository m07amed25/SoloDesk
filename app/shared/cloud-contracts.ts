// F008 Shared Cloud & Multi-Tenant Isolation Contracts
// Conforms to F003 domain primitives and Constitution Principles I-VIII.

import type { Id } from "../../packages/domain/src/ids.ts";
import type { PublicError } from "../../packages/contracts/src/errors.ts";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "manager"
  | "contributor"
  | "finance"
  | "viewer";

export type WorkspaceStatus = "active" | "suspended" | "closing" | "archived";

export type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

export type QuotaTier =
  | "normal"
  | "warning_70"
  | "warning_85"
  | "critical_95"
  | "exhausted_100";

export type ProviderStatus =
  | "operational"
  | "degraded"
  | "paused"
  | "maintenance";

export type WorkspaceTenantDto = Readonly<{
  id: string; // 'ws_...'
  legalName: string;
  tradeName?: string | null;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLocale: "en" | "ar";
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type WorkspaceMembershipDto = Readonly<{
  workspaceId: string;
  userId: string; // 'usr_...'
  role: WorkspaceRole;
  status: MembershipStatus;
  invitedEmail?: string | null;
  invitationToken?: never;
  invitationExpiresAt?: string | null;
  grantedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type TenantAuditEventDto = Readonly<{
  id: string; // 'aud_...'
  workspaceId: string;
  actorId: string;
  actionType:
    | "membership_invited"
    | "membership_accepted"
    | "membership_revoked"
    | "role_granted"
    | "role_changed"
    | "owner_transferred"
    | "workspace_created"
    | "workspace_updated"
    | "policy_updated";
  targetResourceType: string;
  targetResourceId: string;
  changeDiff: Record<string, unknown>;
  correlationId: string;
  occurredAt: string;
}>;

export type TrustedContext = Readonly<{
  actorId: Id<"actor">; // 'usr_...'
  workspaceId: Id<"workspace">; // 'ws_...'
  deviceId?: Id<"device">;
  role: WorkspaceRole;
  sessionObservation: string;
  authorityObservation: string;
}>;

export type ProviderQuotaProfileDto = Readonly<{
  workspaceId: string;
  dbStorageBytes: number;
  objectStorageBytes: number;
  monthlyEgressBytes: number;
  dbStorageLimitBytes: number;
  objectStorageLimitBytes: number;
  monthlyEgressLimitBytes: number;
  quotaTier: QuotaTier;
  providerStatus: ProviderStatus;
  lastEvaluatedAt: string;
}>;

export type StorageObjectMetadataDto = Readonly<{
  id: string; // 'obj_...'
  workspaceId: string;
  bucketId: "workspaces";
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string;
  accessTier: "private";
  owningEntityType: "invoice" | "receipt" | "contract" | "project" | "profile";
  owningEntityId: string;
  uploadedBy: string;
  createdAt: string;
}>;

export type SignedUrlResponseDto = Readonly<{
  signedUrl: string;
  expiresInSeconds: number; // 900
  expiresAt: string;
}>;

export type CommandGatewayRequest = Readonly<{
  command: string;
  payload: Record<string, unknown>;
}>;

export type CommandGatewayResponse<T = unknown> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: PublicError }>;
