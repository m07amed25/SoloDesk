import crypto from "node:crypto";
import { id } from "../../../packages/domain/src/ids.ts";
import { isValidOperationType } from "../../../packages/contracts/src/authoritative-commands.ts";
import { intent } from "../../../packages/contracts/src/intent.ts";
import {
  publicError,
  recoveryFor,
  type PublicError,
  type Code,
  type ISSUE_KEYS,
} from "../../../packages/contracts/src/errors.ts";
import type { Registry } from "../../../packages/contracts/src/registry.ts";
import type {
  OperationClaim,
  AuthoritativeReceipt,
  AuthoritativeWriteState,
  ResultStatus,
  ReconciliationOutcome,
  ReconciliationQueryResult,
} from "../../../packages/contracts/src/authoritative-commands.ts";
import type {
  AcceptedEvent,
  CommandAuditEntry,
  AuditQueryFilters,
} from "../../../packages/contracts/src/audit-evidence.ts";
import { projectCommandAudit } from "./audit-projectors.ts";
import {
  evaluateEvidenceAuthority,
  type DatabaseMembershipReader,
} from "./evidence-authorization.ts";

/**
 * Helper to construct a strictly validated PublicError.
 */
export function makePublicError(
  code: Code,
  options: {
    certainty?: "not_applied" | "applied" | "unknown";
    diagnosticId?: string;
    issues?: readonly {
      key: (typeof ISSUE_KEYS)[number];
      path: readonly (string | number)[];
    }[];
    retryAfterMs?: number;
  } = {},
): PublicError {
  const diagUuid = options.diagnosticId ?? crypto.randomUUID();
  const certainty =
    options.certainty ??
    (code === "OUTCOME_UNKNOWN" ||
    code === "PROVIDER_FAILURE" ||
    code === "SERVICE_UNAVAILABLE"
      ? "unknown"
      : "not_applied");
  const errRes = publicError({
    code,
    messageKey: `error.${code.toLowerCase()}`,
    params: {},
    diagnosticId: { kind: "diagnostic", value: diagUuid },
    recovery: recoveryFor(code),
    outcomeCertainty: certainty,
    ...(options.retryAfterMs ? { retryAfterMs: options.retryAfterMs } : {}),
    ...(options.issues ? { issues: options.issues } : {}),
  });
  if (!errRes.ok) {
    throw new Error(`Failed to create public error: ${errRes.issue}`);
  }
  return errRes.value;
}

/**
 * Computes 32-byte SHA-256 digest of canonical UTF-8 string as lowercase hex.
 */
export async function computeIntentDigest(
  canonicalStr: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TrustedContext {
  actorId: string;
  workspaceId: string;
  deviceId?: string;
  sessionObservation: string;
  authorityObservation: string;
  isServiceOperator?: boolean;
}

export interface AuthoritativeCommandExecutionInput {
  rawRequest: unknown;
  trustedContext: TrustedContext;
  registry: Registry;
  targetResolver?: (
    workspaceId: string,
    targetKind: string,
    targetId: string,
  ) =>
    | Promise<{ currentRevision: bigint | string; workspaceId: string } | null>
    | { currentRevision: bigint | string; workspaceId: string }
    | null;
  domainMutator?: (
    workspaceId: string,
    targetKind: string,
    targetId: string,
    nextRevision: bigint | string,
    payload: Record<string, unknown>,
  ) => Promise<void> | void;
}

export interface AuthoritativeCommandOutput {
  ok: boolean;
  status:
    | "authoritative_committed"
    | "job_accepted"
    | "conflict"
    | "rejected"
    | "outcome_unknown";
  receipt?: AuthoritativeReceipt;
  event?: AcceptedEvent;
  auditEntry?: CommandAuditEntry;
  error?: PublicError;
  currentRevision?: string;
  progressToken?: string;
}

/**
 * Abstract interface for F009 authoritative database transaction execution.
 */
export interface AuthoritativeDatabase {
  getWriteState(workspaceId: string): AuthoritativeWriteState | null;
  getOperationClaim(
    workspaceId: string,
    actorId: string,
    operationType: string,
    operationId: string,
  ): OperationClaim | null;
  getReceiptByOperation(
    workspaceId: string,
    actorId: string,
    operationType: string,
    operationId: string,
  ): AuthoritativeReceipt | null;
  getReceiptById(
    workspaceId: string,
    receiptId: string,
  ): AuthoritativeReceipt | null;
  getProgress(workspaceId: string): bigint;
  getTarget(
    workspaceId: string,
    kind: string,
    id: string,
  ): { revision: bigint; workspace_id: string } | null;

  // Transaction execution
  executeTransaction<T>(fn: () => T): T;

  // Mutations
  saveOperationClaim(claim: OperationClaim): void;
  saveReceipt(receipt: AuthoritativeReceipt): void;
  advanceProgress(workspaceId: string): bigint;
  saveAcceptedEvent(event: AcceptedEvent): void;
  saveAuditEntry(entry: CommandAuditEntry): void;
  updateTargetRevision(
    workspaceId: string,
    kind: string,
    id: string,
    newRevision: bigint,
  ): void;

  // Audit queries
  getAuditEntry(
    workspaceId: string,
    auditEntryId: string,
  ): CommandAuditEntry | null;
  listAuditEntries(
    workspaceId: string,
    filters?: AuditQueryFilters,
    limit?: number,
    offset?: number,
  ): CommandAuditEntry[];
  countAuditEntries(workspaceId: string, filters?: AuditQueryFilters): number;
}

/**
 * Executes an authoritative command through the trusted transaction boundary.
 */
export async function executeAuthoritativeCommand(
  db: AuthoritativeDatabase,
  membershipReader: DatabaseMembershipReader,
  input: AuthoritativeCommandExecutionInput,
): Promise<AuthoritativeCommandOutput> {
  const { rawRequest, trustedContext, registry } = input;
  const normalizedContext = {
    ...trustedContext,
    actorId:
      typeof trustedContext.actorId === "string"
        ? { kind: "actor", value: trustedContext.actorId }
        : trustedContext.actorId,
    workspaceId:
      typeof trustedContext.workspaceId === "string"
        ? { kind: "workspace", value: trustedContext.workspaceId }
        : trustedContext.workspaceId,
    ...(trustedContext.deviceId
      ? {
          deviceId:
            typeof trustedContext.deviceId === "string"
              ? { kind: "device", value: trustedContext.deviceId }
              : trustedContext.deviceId,
        }
      : {}),
  };

  // 1. Recompute canonical intent and parse envelope
  const intentResult = intent(rawRequest, normalizedContext, registry);
  if (!intentResult.ok) {
    return {
      ok: false,
      status: "rejected",
      error: makePublicError("VALIDATION", {
        issues: [{ key: "invalid_format", path: ["operation"] }],
      }),
    };
  }

  const { canonical: canonicalBytes, original } = intentResult.value;
  const digest = await computeIntentDigest(canonicalBytes);

  const req = original as any;
  const rawReq = rawRequest as any;
  const workspaceId =
    typeof trustedContext.workspaceId === "string"
      ? trustedContext.workspaceId
      : (trustedContext.workspaceId as any).value;
  const actorId =
    typeof trustedContext.actorId === "string"
      ? trustedContext.actorId
      : (trustedContext.actorId as any).value;
  const operationType = req.operation as string;
  const operationId = req.operationId.value as string;
  const requestId =
    typeof rawReq?.requestId?.value === "string"
      ? rawReq.requestId.value
      : typeof rawReq?.requestId === "string"
        ? rawReq.requestId
        : crypto.randomUUID();
  const correlationId =
    typeof rawReq?.correlationId === "string"
      ? rawReq.correlationId
      : requestId;

  // 2. Lock and check workspace write state
  const writeState = db.getWriteState(workspaceId);
  if (!writeState || writeState.state !== "ready") {
    return {
      ok: false,
      status: "rejected",
      error: makePublicError("SERVICE_UNAVAILABLE"),
    };
  }

  // 3. Current membership / authority check
  const authority = await evaluateEvidenceAuthority(
    {
      verifiedActorId: actorId,
      claimedWorkspaceId: workspaceId,
      requiredAction: "command_execute",
    },
    membershipReader,
  );

  if (!authority.authorized) {
    return {
      ok: false,
      status: "rejected",
      error: makePublicError((authority.denialReason as Code) ?? "FORBIDDEN"),
    };
  }

  // 4. Check existing operation claim under scope (workspace, actor, op, opId)
  const existingClaim = db.getOperationClaim(
    workspaceId,
    actorId,
    operationType,
    operationId,
  );
  if (existingClaim) {
    // Collision check: same digest?
    if (existingClaim.intent_digest !== digest) {
      // Changed-intent collision rejection: fixed error without disclosure
      return {
        ok: false,
        status: "rejected",
        error: makePublicError("VALIDATION", {
          issues: [{ key: "invalid_format", path: ["operation"] }],
        }),
      };
    }

    // Identical retry: return original safe terminal result after current authorization
    if (
      existingClaim.disposition === "committed" ||
      existingClaim.disposition === "job_accepted"
    ) {
      const receipt = db.getReceiptByOperation(
        workspaceId,
        actorId,
        operationType,
        operationId,
      );
      if (receipt) {
        return {
          ok: true,
          status: receipt.result_status,
          receipt,
          progressToken: String(receipt.progress_position),
        };
      }
      return { ok: false, status: "outcome_unknown", error: makePublicError("OUTCOME_UNKNOWN") };
    }

    if (existingClaim.disposition === "conflict") {
      return {
        ok: false,
        status: "conflict",
        error: makePublicError("REVISION_CONFLICT"),
      };
    }

    if (existingClaim.disposition === "proven_not_applied") {
      return {
        ok: false,
        status: "rejected",
        error: makePublicError("VALIDATION", {
          issues: [{ key: "invalid_format", path: ["operation"] }],
        }),
      };
    }

    // Default terminal rejected claim
    return {
      ok: false,
      status: "rejected",
      error: makePublicError(
        (existingClaim.safe_error_code as Code) ?? "VALIDATION",
      ),
    };
  }

  // 5. Execute owning transaction
  return db.executeTransaction(() => {
    if (db.getWriteState(workspaceId)?.state !== "ready") {
      return { ok: false, status: "rejected", error: makePublicError("SERVICE_UNAVAILABLE") };
    }
    // Recheck live membership within transaction
    const liveAuth = membershipReader.getMembership(workspaceId, actorId);
    // The transaction adapter is synchronous; asynchronous readers cannot prove live authority here.
    if (!liveAuth || "then" in liveAuth || liveAuth.status !== "active") {
      return {
        ok: false,
        status: "rejected",
        error: makePublicError(liveAuth && !("then" in liveAuth) && liveAuth.status === "revoked" ? "SESSION_REVOKED" : "FORBIDDEN"),
      };
    }

    const payload = req.payload as Record<string, unknown>;
    const targetKind =
      (payload?.targetKind as string) ||
      (payload?.entityKind as string) ||
      null;
    const targetId =
      (payload?.targetId as string) || (payload?.entityId as string) || null;

    let priorRevision: bigint | null = null;
    let committedRevision: bigint | null = null;

    // Check target and revision if applicable
    if (targetKind && targetId) {
      const target = db.getTarget(workspaceId, targetKind, targetId);
      if (!target || target.workspace_id !== workspaceId) {
        // Non-disclosing error for foreign or missing targets
        return {
          ok: false,
          status: "rejected",
          error: makePublicError("RESOURCE_UNAVAILABLE"),
        };
      }

      priorRevision = target.revision;
      if (req.expectedRevision !== undefined) {
        const expected = BigInt(req.expectedRevision);
        if (expected !== priorRevision) {
          // Record terminal conflict claim
          const conflictClaim: OperationClaim = {
            workspace_id: workspaceId,
            actor_id: actorId,
            operation_type: operationType,
            operation_id: operationId,
            protocol_version: 1,
            payload_version: req.payloadVersion ?? 1,
            intent_profile: "F003-intent-v1",
            digest_profile: "sha256-v1",
            intent_digest: digest,
            required_device_id: req.deviceId?.value ?? null,
            expected_revision: expected,
            target_kind: targetKind,
            target_id: targetId,
            disposition: "conflict",
            safe_error_code: "REVISION_CONFLICT",
            result_locator: null,
            created_at: new Date().toISOString(),
            finalized_at: new Date().toISOString(),
            retention_class: "default",
          };
          db.saveOperationClaim(conflictClaim);

          return {
            ok: false,
            status: "conflict",
            currentRevision: String(priorRevision),
            error: makePublicError("REVISION_CONFLICT"),
          };
        }
      }

      committedRevision = priorRevision + 1n;
      db.updateTargetRevision(
        workspaceId,
        targetKind,
        targetId,
        committedRevision,
      );
    }

    // Allocate transactional progress position
    const nextPosition = db.advanceProgress(workspaceId);
    const nowIso = new Date().toISOString();

    const receiptId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const auditEntryId = crypto.randomUUID();

    const resultStatus: ResultStatus = "authoritative_committed";

    // 1. Save receipt
    const receipt: AuthoritativeReceipt = {
      workspace_id: workspaceId,
      receipt_id: receiptId,
      actor_id: actorId,
      operation_type: operationType,
      operation_id: operationId,
      receipt_version: 1,
      operation_payload_version: req.payloadVersion ?? 1,
      result_status: resultStatus,
      target_kind: targetKind,
      target_id: targetId,
      prior_revision: priorRevision,
      committed_revision: committedRevision,
      service_received_at: nowIso,
      committed_at: nowIso,
      accepting_request_id: requestId,
      correlation_id: correlationId,
      event_id: eventId,
      progress_position: nextPosition,
      retention_class: "default",
    };
    db.saveReceipt(receipt);

    // 2. Save accepted event
    const event: AcceptedEvent = {
      workspace_id: workspaceId,
      progress_position: nextPosition,
      event_id: eventId,
      event_version: 1,
      event_kind: `${operationType}.accepted`,
      entity_kind: targetKind ?? "workspace",
      entity_id: targetId ?? workspaceId,
      accepted_revision: committedRevision ?? 0n,
      operation_type: operationType,
      operation_id: operationId,
      receipt_id: receiptId,
      audit_entry_id: auditEntryId,
      actor_id: actorId,
      committed_at: nowIso,
      occurred_at: req.occurredAt ?? null,
      projection_kind: `${operationType}.event_projection`,
      projection_version: 1,
      projection: {
        targetKind,
        targetId,
        revision: committedRevision ? String(committedRevision) : null,
      },
    };
    db.saveAcceptedEvent(event);

    // 3. Project and save audit entry
    const auditProj = projectCommandAudit(operationType, payload, {
      kind: targetKind,
      id: targetId,
    });
    const auditEntry: CommandAuditEntry = {
      workspace_id: workspaceId,
      audit_entry_id: auditEntryId,
      audit_version: 1,
      actor_kind: "member",
      actor_id: actorId,
      operation_type: operationType,
      payload_version: req.payloadVersion ?? 1,
      operation_id: operationId,
      target_kind: targetKind,
      target_id: targetId,
      prior_revision: priorRevision,
      committed_revision: committedRevision,
      occurred_at: req.occurredAt ?? null,
      service_received_at: nowIso,
      committed_at: nowIso,
      accepting_request_id: requestId,
      correlation_id: correlationId,
      receipt_id: receiptId,
      event_id: eventId,
      progress_position: nextPosition,
      summary_kind: auditProj.summary_kind,
      summary_version: auditProj.summary_version,
      summary: auditProj.summary,
      retention_class: "default",
    };
    db.saveAuditEntry(auditEntry);

    // 4. Save finalized operation claim
    const claim: OperationClaim = {
      workspace_id: workspaceId,
      actor_id: actorId,
      operation_type: operationType,
      operation_id: operationId,
      protocol_version: 1,
      payload_version: req.payloadVersion ?? 1,
      intent_profile: "F003-intent-v1",
      digest_profile: "sha256-v1",
      intent_digest: digest,
      required_device_id: req.deviceId?.value ?? null,
      expected_revision:
        req.expectedRevision !== undefined
          ? BigInt(req.expectedRevision)
          : null,
      target_kind: targetKind,
      target_id: targetId,
      disposition: "committed",
      result_locator: receiptId,
      created_at: nowIso,
      finalized_at: nowIso,
      retention_class: "default",
    };
    db.saveOperationClaim(claim);

    return {
      ok: true,
      status: "authoritative_committed",
      receipt,
      event,
      auditEntry,
      progressToken: String(nextPosition),
    };
  });
}

/**
 * Reconciles an operation per receipts contract §Reconciliation Query.
 */
export async function reconcileOperation(
  db: AuthoritativeDatabase,
  membershipReader: DatabaseMembershipReader,
  workspaceId: string,
  actorId: string,
  operationType: string,
  operationId: string,
): Promise<ReconciliationQueryResult> {
  if (!isValidOperationType(operationType) || !id({ kind: "operation", value: operationId }, "operation").ok) {
    return { outcome: "still_unknown", operationId, safeError: makePublicError("VALIDATION") };
  }
  // Recheck current membership
  const auth = await evaluateEvidenceAuthority(
    {
      verifiedActorId: actorId,
      claimedWorkspaceId: workspaceId,
      requiredAction: "command_execute",
    },
    membershipReader,
  );

  if (!auth.authorized) {
    return {
      outcome: "still_unknown",
      operationId,
      safeError: makePublicError("FORBIDDEN"),
    };
  }

  const existingClaim = db.getOperationClaim(
    workspaceId,
    actorId,
    operationType,
    operationId,
  );
  if (existingClaim) {
    if (
      existingClaim.disposition === "committed" ||
      existingClaim.disposition === "job_accepted"
    ) {
      const receipt = db.getReceiptByOperation(
        workspaceId,
        actorId,
        operationType,
        operationId,
      );
      return {
        outcome: receipt ? existingClaim.disposition : "still_unknown",
        receipt,
        operationId,
      };
    }
    if (existingClaim.disposition === "conflict") {
      return {
        outcome: "conflict",
        operationId,
        safeError: makePublicError("REVISION_CONFLICT"),
      };
    }
    if (existingClaim.disposition === "rejected") {
      return {
        outcome: "rejected",
        operationId,
        safeError: makePublicError(
          (existingClaim.safe_error_code as Code) ?? "VALIDATION",
        ),
      };
    }
    if (existingClaim.disposition === "proven_not_applied") {
      return {
        outcome: "proven_not_applied",
        operationId,
      };
    }
  }

  // Atomic Non-Application Fence:
  // If no claim exists, acquire uniqueness and establish terminal proven_not_applied claim
  return db.executeTransaction(() => {
    const doubleCheck = db.getOperationClaim(
      workspaceId,
      actorId,
      operationType,
      operationId,
    );
    if (doubleCheck) {
      if (
        doubleCheck.disposition === "committed" ||
        doubleCheck.disposition === "job_accepted"
      ) {
        const receipt = db.getReceiptByOperation(
          workspaceId,
          actorId,
          operationType,
          operationId,
        );
        return {
          outcome: receipt ? doubleCheck.disposition : "still_unknown",
          receipt,
          operationId,
        };
      }
      return {
        outcome: doubleCheck.disposition as ReconciliationOutcome,
        operationId,
      };
    }

    if (db.getWriteState(workspaceId)?.state !== "ready") {
      return { outcome: "still_unknown", operationId, safeError: makePublicError("SERVICE_UNAVAILABLE") };
    }
    const nowIso = new Date().toISOString();
    const fencedClaim: OperationClaim = {
      workspace_id: workspaceId,
      actor_id: actorId,
      operation_type: operationType,
      operation_id: operationId,
      protocol_version: 1,
      payload_version: 1,
      intent_profile: "F003-intent-v1",
      digest_profile: "sha256-v1",
      intent_digest: "fenced-not-applied",
      disposition: "proven_not_applied",
      safe_error_code: null,
      result_locator: null,
      created_at: nowIso,
      finalized_at: nowIso,
      retention_class: "default",
    };
    db.saveOperationClaim(fencedClaim);

    return {
      outcome: "proven_not_applied",
      operationId,
    };
  });
}

/**
 * Consumer compatibility verification per events contract §Consumer Compatibility.
 */
export function verifyEventConsumerCompatibility(
  event: AcceptedEvent,
  supportedKinds: Set<string>,
  maxSupportedVersion: number = 1,
): { ok: boolean; error?: PublicError } {
  if (event.event_version > maxSupportedVersion) {
    return {
      ok: false,
      error: makePublicError("UPGRADE_REQUIRED"),
    };
  }

  if (!supportedKinds.has(event.event_kind)) {
    return {
      ok: false,
      error: makePublicError("SCHEMA_UNSUPPORTED"),
    };
  }

  return { ok: true };
}
