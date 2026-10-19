import { createHash } from "node:crypto";
import type { NativeDatabase } from "better-sqlite3-multiple-ciphers";
import { initializeOutboxSchema } from "../outbox-schema.ts";

export const INITIAL_SCHEMA_VERSION = 1;
const ENTITY_SQL = `
  CREATE TABLE IF NOT EXISTS _entity_example (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    parent_id TEXT REFERENCES _entity_example(id),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
    sync_state TEXT NOT NULL CHECK (sync_state IN ('synced', 'locally_created', 'locally_modified', 'locally_deleted')),
    data_payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_entity_example_sync ON _entity_example (sync_state, updated_at);
`;

export const initialSchema = Object.freeze({
  version: INITIAL_SCHEMA_VERSION,
  name: "0001_initial_schema",
  checksum: createHash("sha256").update(ENTITY_SQL).digest("hex"),
  up(db: NativeDatabase): void {
    db.exec(ENTITY_SQL);
    initializeOutboxSchema(db);
  },
  verify(db: NativeDatabase): boolean {
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    return (
      ["_entity_example", "outbox_operations"].every((name) =>
        names.some((row) => row.name === name),
      ) && (db.pragma("foreign_key_check") as unknown[]).length === 0
    );
  },
});
