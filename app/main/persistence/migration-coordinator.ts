import type { NativeDatabase } from "better-sqlite3-multiple-ciphers";
import { DatabaseConnection } from "./database-connection.ts";
import { initializeMetadataSchema } from "./schema/metadata-schema.ts";
import { initialSchema } from "./schema/migrations/0001_initial_schema.ts";
import {
  assertSupportedVersion,
  verifyMigrationSpace,
} from "./pre-flight-verifier.ts";
import {
  createSnapshot,
  retainLatestSnapshot,
  restoreSnapshot,
  verifySnapshot,
} from "./snapshot-manager.ts";
import type { WorkspacePaths } from "./workspace-storage-paths.ts";

export type MigrationStep = Readonly<{
  version: number;
  name: string;
  checksum: string;
  up(db: NativeDatabase): void;
  verify(db: NativeDatabase): boolean;
}>;

type VersionRow = { current_version: number };
type PendingRow = {
  step_id: string;
  from_version: number;
  to_version: number;
  snapshot_path: string | null;
  checksum: string;
};

export class MigrationCoordinator {
  private readonly paths: WorkspacePaths;
  private readonly steps: readonly MigrationStep[];
  private readonly availableSpaceOverride?: number;
  constructor(
    paths: WorkspacePaths,
    steps: readonly MigrationStep[] = [initialSchema],
    availableSpaceOverride?: number,
  ) {
    this.paths = paths;
    this.steps = steps;
    this.availableSpaceOverride = availableSpaceOverride;
  }

  initializeNew(connection: DatabaseConnection): void {
    const db = connection.db;
    db.transaction(() => {
      initializeMetadataSchema(db);
      initialSchema.up(db);
      if (!initialSchema.verify(db)) throw new Error("integrity_failed");
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO _schema_version (id, current_version, min_app_version, max_app_version, last_migrated_at, created_at) VALUES (1, 1, '0.0.0', '0.0.0', ?, ?)",
      ).run(now, now);
      db.prepare(
        "INSERT INTO _migration_journal (step_id, from_version, to_version, status, started_at, completed_at, checksum) VALUES (?, 0, 1, 'completed', ?, ?, ?)",
      ).run(initialSchema.name, now, now, initialSchema.checksum);
    })();
  }

  currentVersion(connection: DatabaseConnection): number {
    const row = connection.db
      .prepare("SELECT current_version FROM _schema_version WHERE id = 1")
      .get() as VersionRow | undefined;
    if (!row) throw new Error("integrity_failed");
    return row.current_version;
  }

  async recoverInterrupted(
    connection: DatabaseConnection,
    key: Buffer,
  ): Promise<{ connection: DatabaseConnection; interrupted: boolean }> {
    const pending = connection.db
      .prepare(
        "SELECT step_id, from_version, to_version, snapshot_path, checksum FROM _migration_journal WHERE status IN ('in_progress', 'failed') ORDER BY started_at DESC LIMIT 1",
      )
      .get() as PendingRow | undefined;
    if (!pending) return { connection, interrupted: false };
    if (!pending.snapshot_path) throw new Error("integrity_failed");
    const snapshot = await verifySnapshot(this.paths, pending.snapshot_path);
    if (
      snapshot.from !== pending.from_version ||
      snapshot.to !== pending.to_version
    )
      throw new Error("integrity_failed");
    connection.close();
    await restoreSnapshot(this.paths, snapshot);
    const restored = DatabaseConnection.open(this.paths.database, key, true);
    try {
      restored.db
        .prepare(
          "INSERT OR REPLACE INTO _migration_journal (step_id, from_version, to_version, status, started_at, completed_at, snapshot_path, checksum, error_code) VALUES (?, ?, ?, 'rolled_back', ?, ?, ?, ?, 'interrupted_migration')",
        )
        .run(
          pending.step_id,
          pending.from_version,
          pending.to_version,
          new Date().toISOString(),
          new Date().toISOString(),
          pending.snapshot_path,
          pending.checksum,
        );
      if (this.currentVersion(restored) !== pending.from_version)
        throw new Error("integrity_failed");
      return { connection: restored, interrupted: true };
    } catch (error) {
      restored.close();
      throw error;
    }
  }

  async migrate(
    connection: DatabaseConnection,
    key: Buffer,
  ): Promise<DatabaseConnection> {
    let active = connection;
    const recovered = await this.recoverInterrupted(active, key);
    active = recovered.connection;
    if (recovered.interrupted) {
      active.close();
      throw new Error("interrupted_migration");
    }
    const supported = Math.max(...this.steps.map((step) => step.version));
    let current = this.currentVersion(active);
    assertSupportedVersion(current, supported);
    for (const step of [...this.steps].sort((a, b) => a.version - b.version)) {
      if (step.version <= current) continue;
      if (step.version !== current + 1)
        throw new Error("unsupported_future_version");
      verifyMigrationSpace(this.paths, this.availableSpaceOverride);
      const snapshot = await createSnapshot(
        active,
        this.paths,
        current,
        step.version,
      );
      const now = new Date().toISOString();
      active.db
        .prepare(
          "INSERT OR REPLACE INTO _migration_journal (step_id, from_version, to_version, status, started_at, snapshot_path, checksum) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
        )
        .run(
          step.name,
          current,
          step.version,
          now,
          snapshot.file,
          step.checksum,
        );
      active.db.prepare("UPDATE _migration_journal SET status = 'in_progress' WHERE step_id = ? AND status = 'pending'").run(step.name);
      try {
        active.db.transaction(() => {
          step.up(active.db);
          if (
            !step.verify(active.db) ||
            (active.db.pragma("foreign_key_check") as unknown[]).length > 0
          )
            throw new Error("integrity_failed");
          active.db
            .prepare(
              "UPDATE _schema_version SET current_version = ?, last_migrated_at = ? WHERE id = 1",
            )
            .run(step.version, new Date().toISOString());
          active.db
            .prepare(
              "UPDATE _migration_journal SET status = 'completed', completed_at = ? WHERE step_id = ?",
            )
            .run(new Date().toISOString(), step.name);
        })();
        current = step.version;
      } catch {
        active.db
          .prepare(
            "UPDATE _migration_journal SET status = 'failed', error_code = 'integrity_failed' WHERE step_id = ?",
          )
          .run(step.name);
        const restored = await this.recoverInterrupted(active, key);
        restored.connection.close();
        throw new Error("interrupted_migration");
      }
    }
    await retainLatestSnapshot(this.paths);
    return active;
  }
}
