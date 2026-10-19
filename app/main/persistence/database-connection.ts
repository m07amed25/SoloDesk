import { chmodSync, existsSync } from "node:fs";
import Database, { type NativeDatabase } from "better-sqlite3-multiple-ciphers";

/** SQLCipher handles are held only in Electron main. No plaintext database fallback exists. */
export class DatabaseConnection {
  private closed = false;
  private readonly handle: NativeDatabase;
  private constructor(handle: NativeDatabase) {
    this.handle = handle;
  }

  static open(
    file: string,
    key: Buffer,
    existing: boolean,
  ): DatabaseConnection {
    if (key.length !== 32 || existsSync(file) !== existing)
      throw new Error("integrity_failed");
    const db = new Database(file, { fileMustExist: existing, timeout: 1000 });
    try {
      chmodSync(file, 0o600);
      db.pragma("cipher='sqlcipher'");
      db.pragma("legacy=4");
      db.key(key);
      db.pragma("temp_store=MEMORY");
      db.pragma("secure_delete=ON");
      if (
        db.pragma("cipher", { simple: true }) !== "sqlcipher" ||
        db.pragma("temp_store", { simple: true }) !== 2
      )
        throw new Error("integrity_failed");
      // Decrypt and check an existing file before changing its journal mode.
      if (existing && db.pragma("quick_check", { simple: true }) !== "ok")
        throw new Error("integrity_failed");
      db.pragma("foreign_keys=ON");
      if (db.pragma("foreign_keys", { simple: true }) !== 1)
        throw new Error("integrity_failed");
      db.pragma("journal_mode=WAL");
      if (db.pragma("journal_mode", { simple: true }) !== "wal")
        throw new Error("integrity_failed");
      return new DatabaseConnection(db);
    } catch (error) {
      db.close();
      throw error;
    }
  }

  /** Main-process internal use only. Never cross IPC. */
  get db(): NativeDatabase {
    return this.handle;
  }

  updateEntityRevision(
    workspaceId: string,
    id: string,
    expectedRevision: number,
    payload: string,
    now: string,
  ): void {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
      throw new Error("revision_conflict");
    const result = this.handle
      .prepare(
        `
      UPDATE _entity_example SET revision = revision + 1,
        data_payload = ?, sync_state = 'locally_modified', updated_at = ?
      WHERE workspace_id = ? AND id = ? AND revision = ?
    `,
      )
      .run(payload, now, workspaceId, id, expectedRevision);
    if (result.changes !== 1) throw new Error("revision_conflict");
  }

  checkpoint(): void {
    this.handle.pragma("wal_checkpoint(TRUNCATE)");
  }
  close(): void {
    if (!this.closed) {
      this.handle.close();
      this.closed = true;
    }
  }
}
