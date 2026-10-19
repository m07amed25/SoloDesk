# Phase 0 Research: F007 Encrypted Local Persistence and Migrations

**Date**: 2026-10-19
**Status**: Technical design direction resolved for implementation planning; F006 native host proof gate for production customer data remains tracked as a prerequisite gate.

Research builds upon the repository's pinned Electron 44.8.0, Node >=24 <25, TypeScript 7.0.2, and `better-sqlite3-multiple-ciphers` 13.0.3 (evaluated under F006 in SQLCipher v4 mode).

---

## R-01 — Storage Engine and Encryption Consumption

**Decision**: Consume the F006 `ProtectionOwner` key protection and encrypted SQLite boundary (`better-sqlite3-multiple-ciphers` with SQLCipher v4 compatibility) as the local persistence engine for per-workspace stores. Keep database connections and SQL execution strictly within the main process; the renderer never receives raw SQL capabilities, file paths, or cryptographic keys.

**Rationale**:

- Constitution Principle V and NFR-005 mandate encryption at rest for all database pages, write-ahead logs (WAL), and temporary tables.
- F006 established that `better-sqlite3-multiple-ciphers` in SQLCipher mode provides full page-level AES-256-CBC encryption with HMAC-SHA512 integrity verification.
- Encapsulating storage behind a typed repository/DAO pattern in the Electron main process prevents SQL injection and enforces trust boundaries (Constitution Principle II, F004 bridge).

**Alternatives considered**:

- _Plain `better-sqlite3`_: Disqualified by Constitution Principle V and NFR-005 (zero at-rest encryption).
- _Encrypted JSON/flat files_: Fails ACID transactional requirements, exhibits poor query performance on complex multi-table queries, and lacks crash-safe WAL journaling.
- _Renderer-side IndexedDB / SQLite_: Violates Constitution Principle II (renderer must remain sandboxed with no direct database or file access).

**Remaining gate**: Multi-target native host verification from F006 remains required before persisting live customer business records. F007 uses synthetic fixtures and qualification datasets.

---

## R-02 — Atomic Local Mutations and Outbox Coupling (PLT-008)

**Decision**: Bundle all local domain entity mutations (e.g., tasks, drafts, time entries) and their corresponding synchronization outbox queue records (`outbox_operations`) into a single atomic SQLite transaction.

**Rationale**:

- PLT-008 requires saving eligible offline work and its outbox operation atomically.
- If entity persistence succeeds but outbox enqueuing fails (due to crash or disk full), the local change will never sync to the server. If outbox enqueuing succeeds without entity persistence, the queue will replay stale or invalid payloads.
- SQLite WAL mode ensures that multi-table transactions are strictly atomic, providing durable commits or clean rollbacks upon abrupt process termination.

**Alternatives considered**:

- _Two-phase commit / saga_: Over-engineered and unnecessary for a single local SQLite database file.
- _Post-commit outbox hook_: Vulnerable to process crashes between entity commit and queue insertion.

---

## R-03 — Fail-Closed Read Failure and Corruption Handling (No Empty Replacement)

**Decision**: Implement a fail-closed database initialization sequence. If a database file exists on disk but cannot be opened, decrypted, or read (e.g., due to key unavailability, file corruption, or permission denial), the system MUST halt storage startup and transition into a structured `recovery_required` state. It MUST strictly refuse to execute `CREATE TABLE` or initialize a new empty database over the existing file.

**Rationale**:

- Constitution Principle VII explicitly states: _"Read failure MUST NOT create an empty replacement database."_
- Standard database initialization logic frequently executes DDL unconditionally if tables are missing, which can silently overwrite or orphan existing files, causing catastrophic loss of unpushed local work.
- The system must preserve the physical file on disk, emit a closed error code (`vault_locked`, `key_missing`, `integrity_failed`, `unsupported_version`), and provide clear recovery instructions in English and Arabic.

**Alternatives considered**:

- _Auto-rename corrupt database to `.bak` and create new database_: Causes user panic, orphans unsynced outbox edits, and risks unreviewed sync conflicts.
- _Silent retry loop_: Can lock filesystem resources and provide poor UX without user transparency.

---

## R-04 — Pre-Migration Safety Snapshot and Journal-Based Recovery (NFR-003, NFR-010)

**Decision**: Structure schema migrations into a 5-phase transactional protocol with pre-flight checks and a restorable pre-migration safety snapshot:

1. **Pre-flight verification**: Verify encryption key validity, current schema compatibility, and available disk space (minimum 2x current database size).
2. **Pre-migration snapshot**: Create an authenticated, byte-verified encrypted copy of the database (`.snapshot`) before executing any DDL.
3. **Journal step start**: Log the migration step as `in_progress` in the persistent `_migration_journal` table.
4. **Step execution**: Execute migration DDL/DML within an atomic transaction.
5. **Invariant reconciliation & commit**: Verify relational constraints and record counts, update `_schema_version`, mark step `completed` in `_migration_journal`, and commit.

If a migration is interrupted by power loss or abrupt exit, the next startup detects the `in_progress` step in `_migration_journal`, restores the `.snapshot` copy, and halts with an explicit recovery message.

**Rationale**:

- The project data lifecycle specification requires: _"Migration flow: check space/keys/version → verified backup → lock writers → migrate/reconcile counts/invariants → mark ready → resume. Failure retains old data or enters explicit recovery."_
- SQLite supports transactional DDL for many statements, but complex migrations involving table re-creation (table rebuild pattern) require disabling foreign keys temporarily; a snapshot ensures absolute recovery if interrupted mid-rebuild.

**Alternatives considered**:

- _In-place migration without snapshot_: An interruption during a table recreate leaves partial tables and inconsistent schemas with no deterministic recovery.
- _In-memory migration dry-run_: Cannot catch filesystem-level issues (such as running out of disk space during table re-indexing).

---

## R-05 — Forward Compatibility and Downgrade Prevention (NFR-010)

**Decision**: Maintain a monotonic integer schema version in `_schema_version` alongside maximum supported application versions. If the database file has a schema version greater than the maximum version supported by the current application binary, the system MUST refuse to open the store, prevent backward migrations, and display an explicit update-required notification in English and Arabic.

**Rationale**:

- Running older code on a database modified by a newer release can cause silent data corruption (e.g., dropping unknown columns during writes, corrupting new constraint definitions).
- NFR-010 mandates that compatible protocols/schema migrations preserve data safely. Downgrades are blocked unless an explicit forward-to-backward migration path is proved.

**Alternatives considered**:

- _Permissive mode (ignore unknown columns/tables)_: SQLite's table structure means standard `INSERT` or `UPDATE` queries that touch modified tables would fail or discard data.

---

## R-06 — Standardized Baseline Reference Dataset

**Decision**: Author a comprehensive reference dataset fixture covering core entities (accounts, workspaces, profiles, tasks, draft documents, time entries, attachments, outbox operations), edge-case values (Arabic text, RTL strings, exact minor-unit money values, large timestamps), and relational hierarchies. Every migration test MUST execute against this reference dataset and prove 100% preservation of records and invariants.

**Rationale**:

- Plan requirement: _"Entry decisions/limits: Approve local migration recovery and reference dataset."_
- Proves that migrations do not introduce silent column truncation, character encoding corruption (especially Arabic UTF-8), or foreign key orphanages.

---

## Research Disposition

All technical unknowns for F007 planning are resolved. The design leverages the F006 protection boundary, enforces atomic outbox persistence, guarantees fail-closed read behavior without empty database creation, and defines a robust 5-phase migration protocol with restorable snapshots.
