import type { TenantAuditEventDto } from "../../../app/shared/cloud-contracts.ts";

export interface AuditEventParams {
  workspaceId: string;
  actorId: string;
  actionType: TenantAuditEventDto["actionType"];
  targetResourceType: string;
  targetResourceId: string;
  changeDiff?: Record<string, unknown>;
  correlationId?: string;
}

export interface AuditDbAdapter {
  prepare(sql: string): {
    run(...params: any[]): any;
  };
}

export function redactSensitiveFields(
  diff: Record<string, unknown>,
): Record<string, unknown> {
  const SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "authorization",
    "invitation_token",
  ];
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(diff)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      clean[key] = redactSensitiveFields(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }

  return clean;
}

export function logAuditEvent(
  db: AuditDbAdapter,
  params: AuditEventParams,
): TenantAuditEventDto {
  const id = `aud_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  const correlationId =
    params.correlationId ||
    `cor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const occurredAt = new Date().toISOString();
  const redactedDiff = redactSensitiveFields(params.changeDiff || {});

  db.prepare(
    `
    INSERT INTO tenant_audit_events
    (id, workspace_id, actor_id, action_type, target_resource_type, target_resource_id, change_diff, correlation_id, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `,
  ).run(
    id,
    params.workspaceId,
    params.actorId,
    params.actionType,
    params.targetResourceType,
    params.targetResourceId,
    JSON.stringify(redactedDiff),
    correlationId,
  );

  return {
    id,
    workspaceId: params.workspaceId,
    actorId: params.actorId,
    actionType: params.actionType,
    targetResourceType: params.targetResourceType,
    targetResourceId: params.targetResourceId,
    changeDiff: redactedDiff,
    correlationId,
    occurredAt,
  };
}
