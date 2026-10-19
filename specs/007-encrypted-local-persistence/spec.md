# Feature Specification: F007 — Encrypted Local Persistence and Migrations

**Feature Branch**: `feat/f007-encrypted-local-persistence-and-migrations` (proposed in the root plan; no branch created here)

**Created**: 2026-10-19

**Status**: Draft — specification only; implementation and release require separate evidence and approval

**Input**: User description: "Make a spec for f007 at plan.md"

**Feature / Milestone**: F007 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisites**: F003 shared typed commands and domain primitives, F006 cross-platform key protection and encryption proof. F007 provides encrypted local storage and migrations for subsequent features including F010 (enrollment/cache), F017 (durable outbox), F018 (incremental pull), and F023 (staged attachments).

**Parent requirements**: PLT-007, NFR-003, NFR-010. Supporting constraints: PLT-008, PLT-011, D-02, D-03, D-10, D-15, D-17, Q-07, and Constitution Principles I, II, III, V, VII and VIII.

**Authority**: [F007 card](../../plan.md#f007), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [persistence and migration in data lifecycle](../../docs/architecture/data-lifecycle.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [requirements](../../docs/product/requirements.md), [decisions](../../docs/planning/decisions.md), [acceptance](../../docs/quality/acceptance.md), [test strategy](../../docs/quality/test-strategy.md), and [constitution](../../.specify/memory/constitution.md).

F007 establishes the protected per-account and per-workspace local persistence layer for SoloDesk. It manages local cached records, outbox persistence, ACID transactions, schema versioning, migration journals, and fail-closed recovery for read errors and corrupted storage. A person working offline must have full confidence that local modifications survive application restarts, power loss, and software upgrades without data loss, that failed storage reads never destroy their existing work by initializing a blank database, and that local data remains unreadable on disk without the proper key.

F007 consumes the key protection and encryption boundary proven in F006 and implements the durable cache required for offline collaboration and sync (F017/F018). It does not implement cloud sync protocols, server-side permissions, user authentication, or final document issuance.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Secure and Isolated Workspace Persistence (Priority: P1)

As a freelancer or team member working across multiple workspaces or accounts on a shared or personal computer, I need my local records, draft documents, and search indexes stored in separate, encrypted storage containers for each workspace so that my data is protected at rest and cannot be accessed across account or workspace boundaries.

**Why this priority**: Confidentiality and data segregation are essential foundations for offline-capable business and financial tools. Mixing data across accounts or leaving it unprotected exposes sensitive business information.

**Independent Test**: Create two independent test workspaces for different user profiles. Store distinct sets of records in each workspace. Verify that each workspace operates within its own encrypted storage namespace, files on disk are fully encrypted, and no query or operation in one workspace can read, list, or overwrite data from another workspace.

**Acceptance Scenarios**:

1. **A-01 — Isolated namespace**: **Given** multiple enrolled workspaces or accounts on the same machine, **When** data is written and queried, **Then** each workspace persists into its own dedicated storage namespace with zero cross-tenant record leakage or shared unencrypted state.
2. **A-02 — Protection at rest**: **Given** an open, active workspace session, **When** records, indexes, transaction logs, and temporary tables are persisted, **Then** all underlying storage surfaces on disk remain fully encrypted using the approved protection key and reveal no plaintext content upon raw file inspection.
3. **A-03 — Clean session closure**: **Given** a workspace session is locked, switched, or closed, **When** the local database connection shuts down, **Then** cached keys, decrypted buffers, and volatile query memory are purged, requiring explicit unlock before further operations.

---

### User Story 2 - Atomic Local Changes and Outbox Persistence (Priority: P1)

As a user creating or editing work while offline, I need every local record change and its corresponding synchronization task to be saved together atomically, so that if my device loses power or the application crashes, my local state and outbound queue never fall out of sync or leave half-applied edits.

**Why this priority**: Offline reliability depends on strict atomicity. If a local record is saved without its sync queue entry (or vice versa), edits become permanently stranded or duplicated upon reconnection.

**Independent Test**: Execute complex multi-table mutations paired with outbox queue entries under simulated abrupt termination (process kill immediately before, during, and after commit). Restart the application and verify that transactions either committed completely (both record and outbox entry exist) or rolled back completely (neither exists).

**Acceptance Scenarios**:

1. **A-04 — All-or-nothing commit**: **Given** an offline edit that modifies local records and creates an outbound sync queue item, **When** the transaction is committed, **Then** both the record change and the sync task are persisted together atomically.
2. **A-05 — Crash resilience**: **Given** an uncommitted transaction in progress, **When** the application abruptly terminates or crashes, **Then** upon restart the database automatically recovers to the last consistent committed state with zero orphaned rows, partial records, or corrupted tables.
3. **A-06 — Relational and revision integrity**: **Given** foreign key constraints and record revision numbers, **When** local mutations occur, **Then** storage enforces relational integrity and revision checks locally, rejecting invalid references before committing.

---

### User Story 3 - Fail-Closed Storage Reads Without Empty Replacements (Priority: P1)

As a user whose local storage file has encountered an I/O error, file corruption, or an unavailable key, I need SoloDesk to fail closed safely and inform me of the problem with clear recovery guidance, strictly refusing to create a blank or empty database that could overwrite my existing work.

**Why this priority**: Silently replacing an unreadable or locked database with a new empty database destroys the user's unpushed offline work and creates false impressions of permanent data loss.

**Independent Test**: Induce simulated storage read failures, missing key states, file permission denials, and header corruption on an existing populated database. Attempt to open the workspace and verify that initialization halts, no new empty database file is created, no existing file is overwritten, and a recovery state is displayed.

**Acceptance Scenarios**:

1. **A-07 — No empty database replacement**: **Given** an existing local database file that cannot be read due to file corruption, I/O errors, or locked key storage, **When** the application attempts to open it, **Then** the system strictly refuses to create a blank replacement database or truncate the existing file.
2. **A-08 — Fail-closed on missing key**: **Given** an encrypted database whose decryption key is missing or locked, **When** storage initialization runs, **Then** access is immediately denied, no unencrypted fallback is attempted, and the stored data remains intact on disk.
3. **A-09 — Informative recovery state**: **Given** an unreadable or locked database condition, **When** startup halts, **Then** the interface displays an accessible, bilingual explanation detailing the failure reason and providing actionable recovery steps without risking data loss.

---

### User Story 4 - Safe Schema Evolution and Migration Recovery (Priority: P1)

As a user updating to a newer version of SoloDesk, I need application updates to migrate my local database schema reliably, verifying available disk space and key availability beforehand, creating a restorable pre-migration safety snapshot, and recovering cleanly if the migration is interrupted.

**Why this priority**: Corrupted or half-applied migrations leave databases unreadable and can permanently destroy offline business history. Updates must be fail-safe.

**Independent Test**: Prepare a test database with a baseline schema populated with a verified reference dataset. Execute schema migrations across sequential versions. Test normal execution and simulate failure/interruption (process kill, disk-full condition, key revocation) at each distinct migration stage. Verify automatic recovery of the pre-migration snapshot.

**Acceptance Scenarios**:

1. **A-10 — Pre-flight space and key verification**: **Given** a pending schema migration, **When** the migration process begins, **Then** the system verifies that the encryption key is valid, the current schema version is compatible, and sufficient disk space exists (minimum 2x database size) before modifying any data.
2. **A-11 — Pre-migration safety snapshot**: **Given** passing pre-flight checks, **When** a migration starts, **Then** a verified, restorable copy of the pre-migration database is created and recorded in the migration journal before schema alterations commence.
3. **A-12 — Sequential version tracking**: **Given** multiple pending migration steps, **When** migrations execute, **Then** each step is applied within a discrete transaction and logged in a durable migration journal, advancing the schema version monotonically.
4. **A-13 — Interrupted migration recovery**: **Given** an abrupt exit, power failure, or disk-full error during migration execution, **When** the application restarts, **Then** the system detects the incomplete migration in the journal, restores the pre-migration snapshot intact, and presents an explicit recovery notification without data corruption.
5. **A-14 — Forward compatibility block**: **Given** a local database created or migrated by a newer version of the application, **When** opened by an older application binary, **Then** the system detects the unsupported future schema version, refuses to run or downgrade, and guides the user to update the application.

---

### User Story 5 - Bilingual Recovery Guidance and Unsaved Work Diagnostics (Priority: P2)

As a user encountering an interrupted migration, disk-full condition, or locked storage state, I need accessible English and Arabic explanations that clearly describe what happened, whether local unsynced work is safe, and what next action to take without risking data loss.

**Why this priority**: In high-stress recovery situations, ambiguous error messages in an unfamiliar language lead users to make catastrophic choices (such as reinstalling and wiping data).

**Independent Test**: Trigger recovery states for disk-full, corrupted journal, locked vault, and future schema version. Review the displayed diagnostics and recovery actions in both English and Arabic with screen readers and keyboard navigation.

**Acceptance Scenarios**:

1. **A-15 — Accessible bilingual messaging**: **Given** any persistence failure or recovery state, **When** displayed to the user, **Then** all diagnostic text, error categories, and recovery choices are fully localized in English and Arabic, adhering to WCAG 2.2 AA accessibility standards.
2. **A-16 — Truthful unsynced work disclosure**: **Given** an unreadable storage state or failed migration, **When** the user reviews recovery options, **Then** guidance clearly distinguishes between cloud-synced records (which can be re-fetched after reconnection) and unsynced local drafts (which require retaining the local database file or restoring a backup).
3. **A-17 — Keyboard-navigable actions**: **Given** a recovery screen with available actions (e.g., retry, export diagnostic log, open backup location), **When** navigated via keyboard or assistive technology, **Then** all interactive elements have visible focus indicators and accessible names.

---

### Edge Cases

- **Abrupt power loss during multi-table transaction commit**: Database write-ahead logging and atomic transactions ensure either all modifications are visible or none are; restart triggers automatic recovery to the last committed checkpoint.
- **Abrupt termination during migration step execution**: Migration journal records step as in-progress; on restart, the system detects the unfinished step and rolls back to the pre-migration safety snapshot.
- **Disk full during pre-migration snapshot creation**: Pre-flight check detects insufficient space; migration halts before any database modification; existing data remains completely untouched.
- **Disk full during migration data backfill/transform**: Transaction fails and rolls back; database reverts to pre-migration snapshot; user is alerted with required free disk space in English and Arabic.
- **Filesystem permissions changed to read-only**: System detects inability to obtain write lock; opens in read-only diagnostic/recovery mode or halts cleanly; never attempts unsafe unauthenticated writes.
- **Encrypted database opened with wrong key**: Decryption and authentication tag validation fails; storage fails closed immediately; zero file truncation or header overwrite.
- **Database file zero-byte or truncated on disk**: Detected as corrupted storage; system enters recovery state; does not overwrite with a fresh database.
- **Downgrade attempt (database version > application supported version)**: System detects unsupported forward schema version; displays message indicating app update is required; prevents backward migrations that would discard new fields.
- **Concurrent instance launch on same local profile**: Single-instance desktop coordinator and storage file lock prevent multiple processes from modifying the database simultaneously.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST maintain isolated, encrypted local storage namespaces partitioned strictly by user account and workspace ID. Acceptance: A-01, A-02.
- **FR-002**: Local persistence MUST consume the key protection and encryption boundary verified in F006, ensuring all database files, write-ahead logs, temporary tables, and index structures remain encrypted at rest. Acceptance: A-02, A-08.
- **FR-003**: The system MUST support ACID transactions that atomically commit local domain entity modifications and corresponding outbound synchronization queue entries within a single boundary. Acceptance: A-04, A-05.
- **FR-004**: The storage engine MUST enforce relational foreign keys, column constraints, and optimistic concurrency revision checks on all local mutations. Acceptance: A-06.
- **FR-005**: If a database cannot be opened or read due to corruption, I/O error, or key unavailability, the system MUST fail closed into a recovery state and MUST NOT create an empty replacement database or overwrite existing files. Acceptance: A-07, A-08.
- **FR-006**: Before applying any schema migration, the system MUST perform pre-flight checks verifying valid key availability, schema compatibility, and adequate free disk space (minimum 2x database size). Acceptance: A-10.
- **FR-007**: Before initiating schema modifications, the system MUST create an authenticated, restorable pre-migration safety snapshot of the existing database and record it in the migration journal. Acceptance: A-11.
- **FR-008**: The system MUST maintain a persistent migration journal that records each schema migration step, including target version, execution status, timestamp, and snapshot reference. Acceptance: A-12.
- **FR-009**: If a schema migration is interrupted by crash, power loss, or failure, the system MUST detect the incomplete migration upon restart and restore the pre-migration safety snapshot automatically or halt in a safe recovery state. Acceptance: A-13.
- **FR-010**: The system MUST verify schema version compatibility on opening, rejecting databases with higher/unsupported schema versions and prompting the user to update the application. Acceptance: A-14.
- **FR-011**: All persistence failure, locked, disk-full, and recovery states MUST provide complete, accessible guidance in English and Arabic with full RTL support and WCAG 2.2 AA keyboard/screen-reader compliance. Acceptance: A-09, A-15, A-17.
- **FR-012**: Recovery guidance MUST truthfully distinguish between cloud-backed records and unsynced local edits, warning users before any action that could discard unpushed data. Acceptance: A-16.
- **FR-013**: When a session closes, locks, or switches workspaces, the system MUST flush pending transactions, close database connections, and purge cached encryption keys and decrypted buffers from volatile memory. Acceptance: A-03.
- **FR-014**: Schema migrations MUST validate post-migration data integrity against a standardized reference dataset to ensure no data loss, type coercion, or invariant violations occur during upgrades. Acceptance: A-12, A-13.

### Key Entities

- **Storage Namespace**: The isolated physical and logical container housing the encrypted database and auxiliary files for a specific account and workspace.
- **Local Transaction**: An atomic persistence unit binding one or more domain entity mutations with their corresponding sync outbox operations.
- **Schema Version**: An integer tracking the monotonic structural version of the database tables, views, and indexes.
- **Migration Step**: A discrete, versioned script or routine that applies schema modifications, constraint updates, or data transformations from version N to N+1.
- **Migration Journal**: An append-only audit log tracking migration execution history, step status (`pending`, `in_progress`, `completed`, `failed`), and associated snapshot paths.
- **Pre-Migration Snapshot**: A point-in-time, verified restorable copy of the local database preserved immediately prior to executing a migration sequence.
- **Persistence Recovery State**: A structured diagnostic state detailing the reason for a storage failure (`vault_locked`, `key_missing`, `integrity_failed`, `disk_full`, `interrupted_migration`, `unsupported_version`) along with localized instructions and safe recovery actions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of simulated abrupt terminations during active transactions result in zero database corruption and complete rollback to the last committed state on restart.
- **SC-002**: In 100% of induced storage read failures, key missing events, and corrupted header tests, the system halts with an explicit recovery message and zero empty replacement databases are created.
- **SC-003**: 100% of schema migrations across supported sequential versions complete with zero data loss and 100% data integrity verified against the reference dataset.
- **SC-004**: In 100% of migration interruption tests (simulated process kill at each recorded migration phase), restart detects the incomplete migration and restores the pre-migration snapshot intact with zero unrecoverable states.
- **SC-005**: Pre-flight verification rejects 100% of migration attempts when available disk space is less than the required safety margin or when encryption keys are inaccessible, leaving the existing database completely untouched.
- **SC-006**: 100% of storage failure, locked vault, and recovery states provide complete English and Arabic bilingual text, comply with WCAG 2.2 AA accessibility standards, and support full keyboard navigation.
- **SC-007**: 100% of storage files, write-ahead logs, and temporary tables reveal zero unencrypted plaintext data upon raw byte and string inspection.

## Assumptions

- F007 builds upon F003 domain primitives and contracts and consumes the F006 cross-platform key protection and encryption boundary.
- Production persistence of customer business records remains gated on multi-target native host proof from F006; initial F007 development and qualification utilize synthetic datasets.
- Local storage acts as an offline cache and outbox; authoritative document issuance, invoice numbering, and multi-device synchronization remain governed by backend cloud services (F008/F009/F017/F018).
- The operating system filesystem provides user-level directory isolation; SoloDesk enforces additional strict isolation between accounts and workspaces within the application data directory.
- Forward schema migrations are the supported evolution path. Rollbacks to older schema versions are permitted only when schema and data compatibility is proven; otherwise safe forward repair or snapshot restoration is employed.
- Free disk space calculations utilize standard platform APIs, and the 2x database size safety margin accommodates the pre-migration snapshot plus migration journaling.
