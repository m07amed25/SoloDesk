import type { Data } from "../../../packages/contracts/src/validation.ts";

export interface AuditProjection {
  summary_kind: string;
  summary_version: number;
  summary: Data;
}

export type AuditProjector = (
  operationType: string,
  payload: Record<string, unknown>,
  target?: { kind?: string | null; id?: string | null },
) => AuditProjection;

// Markers to explicitly reject or redact
const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /private_key/i,
  /session/i,
  /key/i,
  /cookie/i,
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function sanitizeAuditValue(val: unknown): any {
  if (val === null || val === undefined) return val;
  if (typeof val !== "object") return val;
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeAuditValue(item));
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      result[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      result[k] = sanitizeAuditValue(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function sanitizeAllowlist(
  source: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, Data> {
  const result: Record<string, Data> = {};
  for (const key of allowedKeys) {
    if (Object.hasOwn(source, key) && !isSensitiveKey(key)) {
      const val = source[key];
      // Bounded values only
      if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean" ||
        val === null
      ) {
        result[key] = val;
      } else if (Array.isArray(val)) {
        // Allow array of primitives
        result[key] = val.filter(
          (item) =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean",
        );
      }
    }
  }
  return result;
}

// Registry of allowlisted projectors per operation
const PROJECTORS = new Map<string, AuditProjector>();

export function registerAuditProjector(
  operationType: string,
  projector: AuditProjector,
): void {
  PROJECTORS.set(operationType, projector);
}

// Default synthetic projector for F009 test/target operations
registerAuditProjector("synthetic.mutate-target", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "targetId",
    "targetKind",
    "name",
    "status",
    "delta",
    "note",
  ]);
  return {
    summary_kind: "synthetic.mutate_target.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.targetId ?? null,
      targetKind: target?.kind ?? safe.targetKind ?? null,
      ...safe,
    },
  };
});
registerAuditProjector("synthetic.mutate_target", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "targetId",
    "targetKind",
    "name",
    "status",
    "delta",
    "note",
  ]);
  return {
    summary_kind: "synthetic.mutate_target.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.targetId ?? null,
      targetKind: target?.kind ?? safe.targetKind ?? null,
      ...safe,
    },
  };
});

registerAuditProjector("client.create", (_op, payload) => {
  const safe = sanitizeAllowlist(payload, ["clientId", "name", "currency"]);
  return {
    summary_kind: "client.create.summary",
    summary_version: 1,
    summary: safe,
  };
});

registerAuditProjector("project.create", (_op, payload) => {
  const safe = sanitizeAllowlist(payload, ["projectId", "clientId", "name"]);
  return {
    summary_kind: "project.create.summary",
    summary_version: 1,
    summary: safe,
  };
});

registerAuditProjector("task.create", (_op, payload) => {
  const safe = sanitizeAllowlist(payload, ["taskId", "projectId", "title"]);
  return {
    summary_kind: "task.create.summary",
    summary_version: 1,
    summary: safe,
  };
});

registerAuditProjector("invitation.create", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "invitationId",
    "workspaceId",
    "recipientLabel",
    "offerRef",
    "policyRevision",
  ]);
  return {
    summary_kind: "invitation.create.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.invitationId ?? null,
      targetKind: target?.kind ?? "invitation",
      ...safe,
    },
  };
});

registerAuditProjector("invitation.resend", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "invitationId",
    "workspaceId",
    "expectedRevision",
    "newGenerationNumber",
  ]);
  return {
    summary_kind: "invitation.resend.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.invitationId ?? null,
      targetKind: target?.kind ?? "invitation",
      ...safe,
    },
  };
});

registerAuditProjector("invitation.revoke", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "invitationId",
    "workspaceId",
    "expectedRevision",
    "terminalOutcome",
  ]);
  return {
    summary_kind: "invitation.revoke.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.invitationId ?? null,
      targetKind: target?.kind ?? "invitation",
      ...safe,
    },
  };
});

registerAuditProjector("invitation.accept", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "invitationId",
    "workspaceId",
    "membershipId",
  ]);
  return {
    summary_kind: "invitation.accept.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? safe.invitationId ?? null,
      targetKind: target?.kind ?? "invitation",
      ...safe,
    },
  };
});

registerAuditProjector("invitation.delivery_status", (_op, payload, target) => {
  const safe = sanitizeAllowlist(payload, [
    "deliveryStatus",
    "attemptNumber",
    "providerDigest",
  ]);
  return {
    summary_kind: "invitation.delivery_status.summary",
    summary_version: 1,
    summary: {
      targetId: target?.id ?? null,
      targetKind: target?.kind ?? "invitation_delivery",
      ...safe,
    },
  };
});

/**
 * Executes registered projector or safe minimal projection for the command.
 * Strictly avoids generic raw payload copying.
 */
export function projectCommandAudit(
  operationType: string,
  payload: Record<string, unknown>,
  target?: { kind?: string | null; id?: string | null },
): AuditProjection {
  const custom = PROJECTORS.get(operationType);
  if (custom) {
    return custom(operationType, payload, target);
  }

  // Fallback: minimal allowlisted summary
  const safeSummary: Record<string, Data> = {};
  if (target?.id) safeSummary.targetId = target.id;
  if (target?.kind) safeSummary.targetKind = target.kind;

  return {
    summary_kind: `${operationType}.minimal_summary`,
    summary_version: 1,
    summary: safeSummary,
  };
}
