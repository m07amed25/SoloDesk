import type { NativeDatabase } from "better-sqlite3-multiple-ciphers";

export function initializeMetadataSchema(db: NativeDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_version INTEGER NOT NULL,
      min_app_version TEXT NOT NULL,
      max_app_version TEXT NOT NULL,
      last_migrated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS _migration_journal (
      step_id TEXT PRIMARY KEY,
      from_version INTEGER NOT NULL,
      to_version INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      snapshot_path TEXT,
      checksum TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_migration_journal_status ON _migration_journal (status, to_version);
  `);
}
