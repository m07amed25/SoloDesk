import { existsSync } from "node:fs";
import Database, { type NativeDatabase } from "better-sqlite3-multiple-ciphers";
import type { KeyContext } from "./key-provider.ts";
import { PROTECTION_FORMAT_VERSION } from "./types.ts";

type MetaRow = {
  identity: string;
  data_set: string;
  generation: string;
  format_version: number;
};
type TextRow = { body: string };

function configured(
  file: string,
  key: Buffer,
  existing: boolean,
): NativeDatabase {
  if (
    key.length !== 32 ||
    (existing && !existsSync(file)) ||
    (!existing && existsSync(file))
  )
    throw new Error("protection_denied");
  const db = new Database(file, { fileMustExist: existing, timeout: 1000 });
  try {
    // Explicit SQLCipher v4 compatibility; never rely on the library's default cipher.
    db.pragma("cipher='sqlcipher'");
    db.pragma("legacy=4");
    db.key(key);
    // File-based transient plaintext is forbidden for the proof.
    db.pragma("temp_store=MEMORY");
    db.pragma("journal_mode=DELETE");
    db.pragma("secure_delete=ON");
    if (
      db.pragma("cipher", { simple: true }) !== "sqlcipher" ||
      db.pragma("temp_store", { simple: true }) !== 2
    )
      throw new Error("unprotected_backend");
    return db;
  } catch {
    db.close();
    throw new Error("integrity_failed");
  }
}

export class ProtectedDatabase {
  private readonly db: NativeDatabase;
  constructor(db: NativeDatabase) {
    this.db = db;
  }
  writeRecord(body: string): void {
    if (!body || Buffer.byteLength(body, "utf8") > 4096)
      throw new Error("protection_denied");
    this.db.transaction(() => {
      const result = this.db
        .prepare("INSERT INTO records(body) VALUES (?)")
        .run(body);
      this.db
        .prepare("INSERT INTO record_search(rowid, body) VALUES (?, ?)")
        .run(result.lastInsertRowid, body);
    })();
  }
  search(term: string): string[] {
    if (!term || Buffer.byteLength(term, "utf8") > 256)
      throw new Error("protection_denied");
    return (
      this.db
        .prepare(
          "SELECT r.body FROM record_search s JOIN records r ON r.id=s.rowid WHERE record_search MATCH ? ORDER BY r.id",
        )
        .all(`"${term.replaceAll('"', '""')}"`) as TextRow[]
    ).map((row) => row.body);
  }
  allRecords(): string[] {
    return (
      this.db.prepare("SELECT body FROM records ORDER BY id").all() as TextRow[]
    ).map((row) => row.body);
  }
  close(): void {
    this.db.close();
  }
}

export function createDatabase(
  file: string,
  key: Buffer,
  context: KeyContext,
): ProtectedDatabase {
  const db = configured(file, key, false);
  try {
    db.exec(
      "CREATE TABLE metadata (identity TEXT NOT NULL, data_set TEXT NOT NULL, generation TEXT NOT NULL, format_version INTEGER NOT NULL); CREATE TABLE records (id INTEGER PRIMARY KEY, body TEXT NOT NULL); CREATE VIRTUAL TABLE record_search USING fts5(body, content='records', content_rowid='id')",
    );
    db.prepare("INSERT INTO metadata VALUES (?, ?, ?, ?)").run(
      context.identityBindingId,
      context.dataSetId,
      context.generation,
      PROTECTION_FORMAT_VERSION,
    );
    return new ProtectedDatabase(db);
  } catch {
    db.close();
    throw new Error("integrity_failed");
  }
}

export function openDatabase(
  file: string,
  key: Buffer,
  context: KeyContext,
): ProtectedDatabase {
  const db = configured(file, key, true);
  try {
    const rows = db
      .prepare(
        "SELECT identity, data_set, generation, format_version FROM metadata",
      )
      .all() as MetaRow[];
    if (
      rows.length !== 1 ||
      rows[0].format_version !== PROTECTION_FORMAT_VERSION
    )
      throw new Error("unsupported_format");
    if (
      rows[0].identity !== context.identityBindingId ||
      rows[0].data_set !== context.dataSetId ||
      rows[0].generation !== context.generation
    )
      throw new Error("protection_denied");
    if (db.pragma("quick_check", { simple: true }) !== "ok")
      throw new Error("integrity_failed");
    return new ProtectedDatabase(db);
  } catch (error) {
    db.close();
    if (
      error instanceof Error &&
      ["unsupported_format", "protection_denied"].includes(error.message)
    )
      throw error;
    throw new Error("integrity_failed");
  }
}
