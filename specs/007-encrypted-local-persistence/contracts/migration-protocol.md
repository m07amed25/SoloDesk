# Contract: Schema Migration & Snapshot Recovery Protocol

**Feature**: F007 Encrypted Local Persistence and Migrations
**Scope**: Schema Evolution, Pre-Flight Safety Checks, Migration Journaling, and Snapshot Rollback

---

## 1. Migration Protocol Overview

All local database schema alterations follow a deterministic 5-phase protocol. The protocol ensures that migrations either succeed completely and verify all invariants, or roll back to a known-good pre-migration snapshot without manual database reconstruction.

```text
[Current Store]
      │
      ▼
Phase 1: Pre-Flight Validation (Keys, Version, Disk Space >= 2x DB Size)
      │
      ▼
Phase 2: Pre-Migration Snapshot Creation (.snapshot file + SHA-256 digest)
      │
      ▼
Phase 3: Migration Journal Initialization (record step as 'in_progress')
      │
      ▼
Phase 4: Transactional Migration Execution (execute DDL / DML transformations)
      │
      ▼
Phase 5: Invariant Reconciliation & Version Monotonic Bump (mark 'completed')
      │
      ▼
[Ready Store]
```

---

## 2. Phase 1: Pre-Flight Safety Verification

Before any modification or file lock, the migration coordinator executes three non-destructive pre-flight checks:

1. **Key Availability Check**:
   - Asserts valid decryption key from `ProtectionOwner`.
   - Executes a test query (`SELECT count(*) FROM _schema_version`) to confirm readable database pages.
2. **Schema Version Compatibility Check**:
   - Queries `current_version` from `_schema_version`.
   - If `current_version > app_max_supported_version`: Halt with `unsupported_future_version`.
   - If `current_version == target_version`: Return immediately (`ready`, no migration needed).
3. **Disk Space Headroom Check**:
   - Computes total database size $S_{db} = \text{size}(store.db) + \text{size}(store.db-wal)$.
   - Required free space $S_{required} = 2 \times S_{db} + 50\text{ MB}$ (safety buffer).
   - If available disk space on the storage volume $< S_{required}$: Halt with `disk_full` diagnostic before creating files.

---

## 3. Phase 2: Pre-Migration Safety Snapshot

1. **Checkpoint & Flush**:
   - Force SQLite checkpoint to merge WAL pages into `store.db`.
2. **Snapshot Creation**:
   - Copy `store.db` into `.migration/pre-migration-v<version>-<timestamp>.snapshot`.
   - The snapshot remains encrypted under the identical SQLCipher key.
3. **Integrity Validation**:
   - Calculate SHA-256 digest of the created snapshot.
   - Verify byte count matches source database.
   - File permissions are set strictly to owner read/write (`0600`).

---

## 4. Phase 3 & 4: Journaling & Step Execution

### 4.1 Migration Step Definition Interface

```typescript
export interface MigrationStep {
  readonly version: number;
  readonly name: string;
  readonly checksum: string; // SHA-256 of migration script content

  /**
   * Applies schema modifications and data transformations.
   * Executes within an active SQLite transaction.
   */
  up(db: DatabaseConnection): Promise<void>;

  /**
   * Post-migration validation hook asserting table structure and invariant counts.
   */
  verify(db: DatabaseConnection): Promise<boolean>;
}
```

### 4.2 Step Execution Lifecycle

1. Insert step record into `_migration_journal`:
   ```sql
   INSERT INTO _migration_journal (
     step_id, from_version, to_version, status, started_at, snapshot_path, checksum
   ) VALUES (?, ?, ?, 'in_progress', ?, ?, ?);
   ```
2. Begin SQLite transaction (`BEGIN IMMEDIATE`).
3. Execute `step.up(db)`.
4. Run `step.verify(db)`. If verification fails, throw `MigrationVerificationError`.
5. Update `_schema_version`:
   ```sql
   UPDATE _schema_version
   SET current_version = ?, last_migrated_at = ?
   WHERE id = 1;
   ```
6. Update journal status to `'completed'` with `completed_at` timestamp.
7. Commit transaction (`COMMIT`).

---

## 5. Phase 5: Interrupted Migration & Crash Recovery

### 5.1 Recovery Detection on Startup

During database startup, the coordinator inspects `_migration_journal`:

```sql
SELECT step_id, from_version, to_version, status, snapshot_path
FROM _migration_journal
WHERE status = 'in_progress'
ORDER BY started_at DESC LIMIT 1;
```

If an `in_progress` step is discovered:

1. **Diagnosis**: An abrupt shutdown, crash, or power loss occurred during migration.
2. **Automatic Rollback**:
   - Close any active database handles.
   - Verify existence and checksum of `snapshot_path`.
   - Restore the snapshot by overwriting `store.db` with the `.snapshot` file.
   - Remove lingering `.db-wal` or `.db-shm` files.
   - Reopen the restored database.
   - Update `_migration_journal` marking the step status as `'rolled_back'`.
3. **State Transition**:
   - System enters `recovery_required` with `reasonCode: 'interrupted_migration'`.
   - Displays clear bilingual explanation to user stating the database was safely reverted to its pre-migration state.

---

## 6. Snapshot Retention & Cleanup

- Once all pending migration steps complete and post-migration validation succeeds, the coordinator purges pre-migration snapshot files older than the most recent successful migration.
- At least the latest snapshot is retained until subsequent workspace session verification succeeds.
