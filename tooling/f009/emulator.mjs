import Database from "better-sqlite3-multiple-ciphers";

export class F009Emulator {
  constructor() {
    this.db = new Database(":memory:");
    this.db.pragma("foreign_keys = ON");

    // Initialize Schema
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_tenants (
        id TEXT PRIMARY KEY,
        legal_name TEXT NOT NULL,
        trade_name TEXT,
        default_timezone TEXT NOT NULL DEFAULT 'UTC',
        default_currency TEXT NOT NULL DEFAULT 'USD',
        default_locale TEXT NOT NULL DEFAULT 'en',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workspace_memberships (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        granted_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (workspace_id, user_id)
      );

      -- Synthetic Domain Targets table for testing revision locking and effects
      CREATE TABLE IF NOT EXISTS synthetic_targets (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        target_kind TEXT NOT NULL,
        target_id TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (workspace_id, target_kind, target_id)
      );

      -- F009 private tables
      CREATE TABLE IF NOT EXISTS command_operations (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        actor_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        protocol_version INTEGER NOT NULL DEFAULT 1,
        payload_version INTEGER NOT NULL DEFAULT 1,
        intent_profile TEXT NOT NULL DEFAULT 'F003-intent-v1',
        digest_profile TEXT NOT NULL DEFAULT 'sha256-v1',
        intent_digest TEXT NOT NULL,
        required_device_id TEXT,
        expected_revision INTEGER,
        target_kind TEXT,
        target_id TEXT,
        disposition TEXT NOT NULL,
        safe_error_code TEXT,
        result_locator TEXT,
        created_at TEXT NOT NULL,
        finalized_at TEXT NOT NULL,
        retention_class TEXT NOT NULL DEFAULT 'default',
        archived_at TEXT,
        PRIMARY KEY (workspace_id, actor_id, operation_type, operation_id)
      );

      CREATE TABLE IF NOT EXISTS command_receipts (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        receipt_id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        receipt_version INTEGER NOT NULL DEFAULT 1,
        operation_payload_version INTEGER NOT NULL DEFAULT 1,
        result_status TEXT NOT NULL,
        target_kind TEXT,
        target_id TEXT,
        prior_revision INTEGER,
        committed_revision INTEGER,
        service_received_at TEXT NOT NULL,
        committed_at TEXT NOT NULL,
        accepting_request_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        progress_position INTEGER NOT NULL,
        retention_class TEXT NOT NULL DEFAULT 'default',
        archived_at TEXT,
        CONSTRAINT uq_receipt_workspace UNIQUE (workspace_id, receipt_id),
        CONSTRAINT uq_receipt_operation UNIQUE (workspace_id, actor_id, operation_type, operation_id)
      );

      CREATE TABLE IF NOT EXISTS workspace_command_progress (
        workspace_id TEXT PRIMARY KEY REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        last_position INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accepted_events (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        progress_position INTEGER NOT NULL,
        event_id TEXT NOT NULL,
        event_version INTEGER NOT NULL DEFAULT 1,
        event_kind TEXT NOT NULL,
        entity_kind TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        accepted_revision INTEGER NOT NULL DEFAULT 0,
        operation_type TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        receipt_id TEXT NOT NULL,
        audit_entry_id TEXT NOT NULL,
        actor_id TEXT,
        committed_at TEXT NOT NULL,
        occurred_at TEXT,
        projection_kind TEXT NOT NULL,
        projection_version INTEGER NOT NULL DEFAULT 1,
        projection TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (workspace_id, progress_position),
        CONSTRAINT uq_event_id UNIQUE (workspace_id, event_id),
        CONSTRAINT uq_event_receipt UNIQUE (workspace_id, receipt_id),
        CONSTRAINT uq_event_audit UNIQUE (workspace_id, audit_entry_id)
      );

      CREATE TABLE IF NOT EXISTS command_audit_entries (
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        audit_entry_id TEXT PRIMARY KEY,
        audit_version INTEGER NOT NULL DEFAULT 1,
        actor_kind TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        payload_version INTEGER NOT NULL DEFAULT 1,
        operation_id TEXT NOT NULL,
        target_kind TEXT,
        target_id TEXT,
        prior_revision INTEGER,
        committed_revision INTEGER,
        occurred_at TEXT,
        service_received_at TEXT NOT NULL,
        committed_at TEXT NOT NULL,
        reason_code TEXT,
        safe_reason_note TEXT,
        accepting_request_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        receipt_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        progress_position INTEGER NOT NULL,
        summary_kind TEXT NOT NULL,
        summary_version INTEGER NOT NULL DEFAULT 1,
        summary TEXT NOT NULL DEFAULT '{}',
        retention_class TEXT NOT NULL DEFAULT 'default',
        CONSTRAINT uq_audit_receipt UNIQUE (workspace_id, receipt_id)
      );

      CREATE TABLE IF NOT EXISTS audit_access_grants (
        grant_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        subject_kind TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_kind TEXT,
        resource_id TEXT,
        purpose_code TEXT,
        granted_by TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        policy_version TEXT NOT NULL DEFAULT 'v1'
      );

      CREATE TABLE IF NOT EXISTS audit_access_events (
        event_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        operator_id TEXT NOT NULL,
        grant_id TEXT NOT NULL,
        action TEXT NOT NULL,
        purpose_code TEXT NOT NULL,
        requested_resource_kind TEXT,
        requested_resource_id TEXT,
        result_count INTEGER NOT NULL DEFAULT 0,
        occurred_at TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS authoritative_write_state (
        workspace_id TEXT PRIMARY KEY REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
        state TEXT NOT NULL DEFAULT 'verification_required',
        verified_schema_version TEXT,
        verified_progress_position INTEGER NOT NULL DEFAULT 0,
        last_verified_at TEXT,
        verification_manifest_digest TEXT,
        safe_block_reason TEXT
      );

      -- Reject triggers for immutable tables
      CREATE TRIGGER IF NOT EXISTS trg_reject_receipt_update
      BEFORE UPDATE ON command_receipts
      WHEN NOT (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL)
        OR OLD.workspace_id IS NOT NEW.workspace_id
        OR OLD.receipt_id IS NOT NEW.receipt_id
        OR OLD.actor_id IS NOT NEW.actor_id
        OR OLD.operation_type IS NOT NEW.operation_type
        OR OLD.operation_id IS NOT NEW.operation_id
        OR OLD.receipt_version IS NOT NEW.receipt_version
        OR OLD.operation_payload_version IS NOT NEW.operation_payload_version
        OR OLD.result_status IS NOT NEW.result_status
        OR OLD.target_kind IS NOT NEW.target_kind
        OR OLD.target_id IS NOT NEW.target_id
        OR OLD.prior_revision IS NOT NEW.prior_revision
        OR OLD.committed_revision IS NOT NEW.committed_revision
        OR OLD.service_received_at IS NOT NEW.service_received_at
        OR OLD.committed_at IS NOT NEW.committed_at
        OR OLD.accepting_request_id IS NOT NEW.accepting_request_id
        OR OLD.correlation_id IS NOT NEW.correlation_id
        OR OLD.event_id IS NOT NEW.event_id
        OR OLD.progress_position IS NOT NEW.progress_position
        OR OLD.retention_class IS NOT NEW.retention_class
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: UPDATE rejected on command_receipts');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_reject_receipt_delete
      BEFORE DELETE ON command_receipts
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: DELETE rejected on command_receipts');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_reject_event_update
      BEFORE UPDATE ON accepted_events
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: UPDATE rejected on accepted_events');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_reject_event_delete
      BEFORE DELETE ON accepted_events
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: DELETE rejected on accepted_events');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_reject_audit_update
      BEFORE UPDATE ON command_audit_entries
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: UPDATE rejected on command_audit_entries');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_reject_audit_delete
      BEFORE DELETE ON command_audit_entries
      BEGIN
        SELECT RAISE(FAIL, 'Immutable evidence: DELETE rejected on command_audit_entries');
      END;
    `);
  }

  // --- AuthoritativeDatabase implementation ---

  getWriteState(workspaceId) {
    const row = this.db
      .prepare("SELECT * FROM authoritative_write_state WHERE workspace_id = ?")
      .safeIntegers().get(workspaceId);
    if (!row) return null;
    return {
      workspace_id: row.workspace_id,
      state: row.state,
      verified_schema_version: row.verified_schema_version,
      verified_progress_position: BigInt(row.verified_progress_position),
      last_verified_at: row.last_verified_at,
      verification_manifest_digest: row.verification_manifest_digest,
      safe_block_reason: row.safe_block_reason,
    };
  }

  setWriteState(workspaceId, state, options = {}) {
    const existing = this.getWriteState(workspaceId);
    if (existing) {
      this.db
        .prepare(
          `UPDATE authoritative_write_state
           SET state = ?, verified_schema_version = ?, verified_progress_position = ?, last_verified_at = ?, safe_block_reason = ?
           WHERE workspace_id = ?`,
        )
        .run(
          state,
          options.verified_schema_version ??
            existing.verified_schema_version ??
            null,
          options.verified_progress_position !== undefined
            ? BigInt(options.verified_progress_position)
            : BigInt(existing.verified_progress_position),
          options.last_verified_at ?? existing.last_verified_at ?? null,
          options.safe_block_reason ?? existing.safe_block_reason ?? null,
          workspaceId,
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO authoritative_write_state
           (workspace_id, state, verified_schema_version, verified_progress_position, last_verified_at, safe_block_reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          workspaceId,
          state,
          options.verified_schema_version ?? null,
          options.verified_progress_position
            ? BigInt(options.verified_progress_position)
            : 0,
          options.last_verified_at ?? null,
          options.safe_block_reason ?? null,
        );
    }
  }

  getOperationClaim(workspaceId, actorId, operationType, operationId) {
    const row = this.db
      .prepare(
        `SELECT * FROM command_operations
         WHERE workspace_id = ? AND actor_id = ? AND operation_type = ? AND operation_id = ?`,
      )
      .safeIntegers().get(workspaceId, actorId, operationType, operationId);
    if (!row) return null;
    return {
      workspace_id: row.workspace_id,
      actor_id: row.actor_id,
      operation_type: row.operation_type,
      operation_id: row.operation_id,
      protocol_version: Number(row.protocol_version),
      payload_version: Number(row.payload_version),
      intent_profile: row.intent_profile,
      digest_profile: row.digest_profile,
      intent_digest: row.intent_digest,
      required_device_id: row.required_device_id,
      expected_revision:
        row.expected_revision !== null ? BigInt(row.expected_revision) : null,
      target_kind: row.target_kind,
      target_id: row.target_id,
      disposition: row.disposition,
      safe_error_code: row.safe_error_code,
      result_locator: row.result_locator,
      created_at: row.created_at,
      finalized_at: row.finalized_at,
      retention_class: row.retention_class,
      archived_at: row.archived_at,
    };
  }

  getReceiptByOperation(workspaceId, actorId, operationType, operationId) {
    const row = this.db
      .prepare(
        `SELECT * FROM command_receipts
         WHERE workspace_id = ? AND actor_id = ? AND operation_type = ? AND operation_id = ?`,
      )
      .safeIntegers().get(workspaceId, actorId, operationType, operationId);
    if (!row) return null;
    return this.mapReceiptRow(row);
  }

  getReceiptById(workspaceId, receiptId) {
    const row = this.db
      .prepare(
        `SELECT * FROM command_receipts WHERE workspace_id = ? AND receipt_id = ?`,
      )
      .safeIntegers().get(workspaceId, receiptId);
    if (!row) return null;
    return this.mapReceiptRow(row);
  }

  mapReceiptRow(row) {
    return {
      workspace_id: row.workspace_id,
      receipt_id: row.receipt_id,
      actor_id: row.actor_id,
      operation_type: row.operation_type,
      operation_id: row.operation_id,
      receipt_version: Number(row.receipt_version),
      operation_payload_version: Number(row.operation_payload_version),
      result_status: row.result_status,
      target_kind: row.target_kind,
      target_id: row.target_id,
      prior_revision:
        row.prior_revision !== null ? BigInt(row.prior_revision) : null,
      committed_revision:
        row.committed_revision !== null ? BigInt(row.committed_revision) : null,
      service_received_at: row.service_received_at,
      committed_at: row.committed_at,
      accepting_request_id: row.accepting_request_id,
      correlation_id: row.correlation_id,
      event_id: row.event_id,
      progress_position: BigInt(row.progress_position),
      retention_class: row.retention_class,
      archived_at: row.archived_at,
    };
  }

  getProgress(workspaceId) {
    const row = this.db
      .prepare(
        "SELECT last_position FROM workspace_command_progress WHERE workspace_id = ?",
      )
      .safeIntegers().get(workspaceId);
    return row ? BigInt(row.last_position) : 0n;
  }

  getTarget(workspaceId, kind, id) {
    const row = this.db
      .prepare(
        "SELECT revision, workspace_id FROM synthetic_targets WHERE workspace_id = ? AND target_kind = ? AND target_id = ?",
      )
      .safeIntegers().get(workspaceId, kind, id);
    if (!row) return null;
    return {
      revision: BigInt(row.revision),
      workspace_id: row.workspace_id,
    };
  }

  executeTransaction(fn) {
    const txn = this.db.transaction(fn);
    return txn();
  }

  saveOperationClaim(claim) {
    this.db
      .prepare(
        `INSERT INTO command_operations (
          workspace_id, actor_id, operation_type, operation_id,
          protocol_version, payload_version, intent_profile, digest_profile,
          intent_digest, required_device_id, expected_revision,
          target_kind, target_id, disposition, safe_error_code, result_locator,
          created_at, finalized_at, retention_class, archived_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )`,
      )
      .run(
        claim.workspace_id,
        claim.actor_id,
        claim.operation_type,
        claim.operation_id,
        claim.protocol_version,
        claim.payload_version,
        claim.intent_profile,
        claim.digest_profile,
        claim.intent_digest,
        claim.required_device_id ?? null,
        claim.expected_revision !== null &&
          claim.expected_revision !== undefined
          ? BigInt(claim.expected_revision)
          : null,
        claim.target_kind ?? null,
        claim.target_id ?? null,
        claim.disposition,
        claim.safe_error_code ?? null,
        claim.result_locator ?? null,
        claim.created_at,
        claim.finalized_at,
        claim.retention_class,
        claim.archived_at ?? null,
      );
  }

  saveReceipt(receipt) {
    this.db
      .prepare(
        `INSERT INTO command_receipts (
          workspace_id, receipt_id, actor_id, operation_type, operation_id,
          receipt_version, operation_payload_version, result_status,
          target_kind, target_id, prior_revision, committed_revision,
          service_received_at, committed_at, accepting_request_id,
          correlation_id, event_id, progress_position, retention_class, archived_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?
        )`,
      )
      .run(
        receipt.workspace_id,
        receipt.receipt_id,
        receipt.actor_id,
        receipt.operation_type,
        receipt.operation_id,
        receipt.receipt_version,
        receipt.operation_payload_version,
        receipt.result_status,
        receipt.target_kind ?? null,
        receipt.target_id ?? null,
        receipt.prior_revision !== null && receipt.prior_revision !== undefined
          ? BigInt(receipt.prior_revision)
          : null,
        receipt.committed_revision !== null &&
          receipt.committed_revision !== undefined
          ? BigInt(receipt.committed_revision)
          : null,
        receipt.service_received_at,
        receipt.committed_at,
        receipt.accepting_request_id,
        receipt.correlation_id,
        receipt.event_id,
        BigInt(receipt.progress_position),
        receipt.retention_class,
        receipt.archived_at ?? null,
      );
  }

  advanceProgress(workspaceId) {
    const existing = this.db
      .prepare(
        "SELECT last_position FROM workspace_command_progress WHERE workspace_id = ?",
      )
      .safeIntegers().get(workspaceId);

    const nextPos = existing ? BigInt(existing.last_position) + 1n : 1n;
    const nowIso = new Date().toISOString();

    if (existing) {
      this.db
        .prepare(
          "UPDATE workspace_command_progress SET last_position = ?, updated_at = ? WHERE workspace_id = ?",
        )
        .run(BigInt(nextPos), nowIso, workspaceId);
    } else {
      this.db
        .prepare(
          "INSERT INTO workspace_command_progress (workspace_id, last_position, updated_at) VALUES (?, ?, ?)",
        )
        .run(workspaceId, BigInt(nextPos), nowIso);
    }

    return nextPos;
  }

  saveAcceptedEvent(event) {
    this.db
      .prepare(
        `INSERT INTO accepted_events (
          workspace_id, progress_position, event_id, event_version,
          event_kind, entity_kind, entity_id, accepted_revision,
          operation_type, operation_id, receipt_id, audit_entry_id,
          actor_id, committed_at, occurred_at, projection_kind,
          projection_version, projection
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )`,
      )
      .run(
        event.workspace_id,
        BigInt(event.progress_position),
        event.event_id,
        event.event_version,
        event.event_kind,
        event.entity_kind,
        event.entity_id,
        BigInt(event.accepted_revision),
        event.operation_type,
        event.operation_id,
        event.receipt_id,
        event.audit_entry_id,
        event.actor_id ?? null,
        event.committed_at,
        event.occurred_at ?? null,
        event.projection_kind,
        event.projection_version,
        JSON.stringify(event.projection),
      );
  }

  saveAuditEntry(entry) {
    this.db
      .prepare(
        `INSERT INTO command_audit_entries (
          workspace_id, audit_entry_id, audit_version, actor_kind, actor_id,
          operation_type, payload_version, operation_id,
          target_kind, target_id, prior_revision, committed_revision,
          occurred_at, service_received_at, committed_at,
          reason_code, safe_reason_note, accepting_request_id,
          correlation_id, receipt_id, event_id, progress_position,
          summary_kind, summary_version, summary, retention_class
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )`,
      )
      .run(
        entry.workspace_id,
        entry.audit_entry_id,
        entry.audit_version,
        entry.actor_kind,
        entry.actor_id,
        entry.operation_type,
        entry.payload_version,
        entry.operation_id,
        entry.target_kind ?? null,
        entry.target_id ?? null,
        entry.prior_revision !== null && entry.prior_revision !== undefined
          ? BigInt(entry.prior_revision)
          : null,
        entry.committed_revision !== null &&
          entry.committed_revision !== undefined
          ? BigInt(entry.committed_revision)
          : null,
        entry.occurred_at ?? null,
        entry.service_received_at,
        entry.committed_at,
        entry.reason_code ?? null,
        entry.safe_reason_note ?? null,
        entry.accepting_request_id,
        entry.correlation_id,
        entry.receipt_id,
        entry.event_id,
        BigInt(entry.progress_position),
        entry.summary_kind,
        entry.summary_version,
        JSON.stringify(entry.summary),
        entry.retention_class,
      );
  }

  updateTargetRevision(workspaceId, kind, id, newRevision) {
    const existing = this.getTarget(workspaceId, kind, id);
    const nowIso = new Date().toISOString();
    if (existing) {
      this.db
        .prepare(
          "UPDATE synthetic_targets SET revision = ?, updated_at = ? WHERE workspace_id = ? AND target_kind = ? AND target_id = ?",
        )
        .run(BigInt(newRevision), nowIso, workspaceId, kind, id);
    } else {
      this.db
        .prepare(
          "INSERT INTO synthetic_targets (workspace_id, target_kind, target_id, revision, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(workspaceId, kind, id, BigInt(newRevision), nowIso);
    }
  }

  // --- Audit queries implementation ---

  getAuditEntry(workspaceId, auditEntryId) {
    const row = this.db
      .prepare(
        "SELECT * FROM command_audit_entries WHERE workspace_id = ? AND audit_entry_id = ?",
      )
      .safeIntegers().get(workspaceId, auditEntryId);
    if (!row) return null;
    return this.mapAuditRow(row);
  }

  listAuditEntries(workspaceId, filters = {}, limit = 50, offset = 0) {
    let sql = "SELECT * FROM command_audit_entries WHERE workspace_id = ?";
    const params = [workspaceId];

    if (filters.fromPosition !== undefined && filters.fromPosition !== null) {
      sql += " AND progress_position >= ?";
      params.push(BigInt(filters.fromPosition));
    }
    if (filters.toPosition !== undefined && filters.toPosition !== null) {
      sql += " AND progress_position <= ?";
      params.push(BigInt(filters.toPosition));
    }
    if (filters.fromTime) {
      sql += " AND committed_at >= ?";
      params.push(filters.fromTime);
    }
    if (filters.toTime) {
      sql += " AND committed_at <= ?";
      params.push(filters.toTime);
    }
    if (filters.actorId) {
      sql += " AND actor_id = ?";
      params.push(filters.actorId);
    }
    if (filters.operationType) {
      sql += " AND operation_type = ?";
      params.push(filters.operationType);
    }
    if (filters.targetKind) {
      sql += " AND target_kind = ?";
      params.push(filters.targetKind);
    }
    if (filters.targetId) {
      sql += " AND target_id = ?";
      params.push(filters.targetId);
    }
    if (filters.receiptId) {
      sql += " AND receipt_id = ?";
      params.push(filters.receiptId);
    }
    if (filters.correlationId) {
      sql += " AND correlation_id = ?";
      params.push(filters.correlationId);
    }

    // Chronological sequence order with stable ID tie breaker
    sql +=
      " ORDER BY progress_position ASC, audit_entry_id ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = this.db.prepare(sql).safeIntegers().all(...params);
    return rows.map((r) => this.mapAuditRow(r));
  }

  countAuditEntries(workspaceId, filters = {}) {
    let sql =
      "SELECT COUNT(*) as count FROM command_audit_entries WHERE workspace_id = ?";
    const params = [workspaceId];

    if (filters.fromPosition !== undefined && filters.fromPosition !== null) {
      sql += " AND progress_position >= ?";
      params.push(BigInt(filters.fromPosition));
    }
    if (filters.toPosition !== undefined && filters.toPosition !== null) {
      sql += " AND progress_position <= ?";
      params.push(BigInt(filters.toPosition));
    }
    if (filters.fromTime) {
      sql += " AND committed_at >= ?";
      params.push(filters.fromTime);
    }
    if (filters.toTime) {
      sql += " AND committed_at <= ?";
      params.push(filters.toTime);
    }
    if (filters.actorId) {
      sql += " AND actor_id = ?";
      params.push(filters.actorId);
    }
    if (filters.operationType) {
      sql += " AND operation_type = ?";
      params.push(filters.operationType);
    }

    const row = this.db.prepare(sql).safeIntegers().get(...params);
    return row ? Number(row.count) : 0;
  }

  mapAuditRow(row) {
    return {
      workspace_id: row.workspace_id,
      audit_entry_id: row.audit_entry_id,
      audit_version: Number(row.audit_version),
      actor_kind: row.actor_kind,
      actor_id: row.actor_id,
      operation_type: row.operation_type,
      payload_version: Number(row.payload_version),
      operation_id: row.operation_id,
      target_kind: row.target_kind,
      target_id: row.target_id,
      prior_revision:
        row.prior_revision !== null ? BigInt(row.prior_revision) : null,
      committed_revision:
        row.committed_revision !== null ? BigInt(row.committed_revision) : null,
      occurred_at: row.occurred_at,
      service_received_at: row.service_received_at,
      committed_at: row.committed_at,
      reason_code: row.reason_code,
      safe_reason_note: row.safe_reason_note,
      accepting_request_id: row.accepting_request_id,
      correlation_id: row.correlation_id,
      receipt_id: row.receipt_id,
      event_id: row.event_id,
      progress_position: BigInt(row.progress_position),
      summary_kind: row.summary_kind,
      summary_version: Number(row.summary_version),
      summary: JSON.parse(row.summary || "{}"),
      retention_class: row.retention_class,
    };
  }

  // --- DatabaseMembershipReader implementation ---

  getMembership(workspaceId, actorId) {
    const row = this.db
      .prepare(
        "SELECT role, status FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?",
      )
      .safeIntegers().get(workspaceId, actorId);
    if (!row) return null;
    return { role: row.role, status: row.status };
  }

  getAuditGrant(workspaceId, subjectId, action) {
    const row = this.db
      .prepare(
        `SELECT * FROM audit_access_grants
         WHERE workspace_id = ? AND subject_id = ? AND action = ?`,
      )
      .safeIntegers().get(workspaceId, subjectId, action);
    if (!row) return null;
    return {
      grant_id: row.grant_id,
      workspace_id: row.workspace_id,
      subject_kind: row.subject_kind,
      subject_id: row.subject_id,
      action: row.action,
      resource_kind: row.resource_kind,
      resource_id: row.resource_id,
      purpose_code: row.purpose_code,
      granted_by: row.granted_by,
      starts_at: row.starts_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      policy_version: row.policy_version,
    };
  }

  // Seeder helper methods
  addWorkspace(id, name = "Test Workspace") {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO workspace_tenants (id, legal_name, default_currency) VALUES (?, ?, 'USD')",
      )
      .run(id, name);
    this.setWriteState(id, "ready", {
      verified_schema_version: "20261020000008",
      verified_progress_position: 0n,
      last_verified_at: new Date().toISOString(),
    });
  }

  addMember(workspaceId, userId, role = "admin", status = "active") {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO workspace_memberships (workspace_id, user_id, role, status) VALUES (?, ?, ?, ?)",
      )
      .run(workspaceId, userId, role, status);
  }

  addTarget(workspaceId, kind, id, revision = 0) {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO synthetic_targets (workspace_id, target_kind, target_id, revision) VALUES (?, ?, ?, ?)",
      )
      .run(workspaceId, kind, id, revision);
  }

  addAuditGrant(grant) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO audit_access_grants (
          grant_id, workspace_id, subject_kind, subject_id, action,
          resource_kind, resource_id, purpose_code, granted_by,
          starts_at, expires_at, revoked_at, policy_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        grant.grant_id,
        grant.workspace_id,
        grant.subject_kind,
        grant.subject_id,
        grant.action,
        grant.resource_kind ?? null,
        grant.resource_id ?? null,
        grant.purpose_code ?? null,
        grant.granted_by,
        grant.starts_at,
        grant.expires_at,
        grant.revoked_at ?? null,
        grant.policy_version,
      );
  }
}
