import { createHash } from "node:crypto";
import type { NativeDatabase } from "better-sqlite3-multiple-ciphers";

export function initializeOutboxSchema(db: NativeDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox_operations (
      operation_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'execute')),
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      expected_revision INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'acknowledged', 'conflicted', 'rejected')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempted_at TEXT,
      error_details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_operations_status ON outbox_operations (status, created_at);
    CREATE INDEX IF NOT EXISTS idx_outbox_operations_aggregate ON outbox_operations (aggregate_type, aggregate_id);
  `);
}

export function payloadDigest(payloadJson: string): string {
  return createHash("sha256").update(payloadJson, "utf8").digest("hex");
}
