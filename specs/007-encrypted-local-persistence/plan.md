# Implementation Plan: F007 — Encrypted Local Persistence and Migrations

**Branch**: `feat/f006-cross-platform-key-protection-and-encryption-proof` (current checkout; Spec Kit setup identity: `007-encrypted-local-persistence`; proposed F007 implementation branch in root plan is not created here) | **Date**: 2026-10-19 | **Spec**: [F007 specification](spec.md)

**Input**: Feature specification from `specs/007-encrypted-local-persistence/spec.md`

**Status**: Phase 0 research and Phase 1 design complete as documentation. No application code, database schema migrations, or business persistence was implemented by this planning request.

---

## Summary

F007 establishes the protected, per-account and per-workspace local persistence layer for SoloDesk. It delivers encrypted local storage, atomic domain/outbox transactions, schema version tracking, restorable migration snapshots, fail-closed read handling with zero empty replacements, and accessible bilingual recovery guidance.

The architecture consumes the key protection boundary evaluated in F006 (`better-sqlite3-multiple-ciphers` in SQLCipher v4 mode), strictly isolates storage within the Electron main process, and exposes only high-level status diagnostics to the sandboxed renderer. Complete details are documented in [research](research.md), [data model](data-model.md), [contracts/](contracts/), and [quickstart](quickstart.md).

---

## Technical Context

**Language/Version**: TypeScript 7.0.2, Node >=24 <25, Electron 44.8.0 per pinned package manifest.

**Primary Dependencies**: Electron Forge/Vite 8.0.1, F004 secure desktop lifecycle/bridge, F003 shared domain primitives, and `better-sqlite3-multiple-ciphers` 13.0.3 (evaluated under F006). Zero new runtime packages are required or installed by this plan.

**Storage**: Per-workspace encrypted SQLite databases (`store.db` with WAL mode and SQLCipher v4 AES-256-CBC encryption), migration journals (`_migration_journal`), pre-migration snapshots (`.snapshot`), and authenticated staged attachment storage.

**Testing**: Verification harness (`tooling/verification/`), native desktop test harness, focused persistence unit tests, storage integration crash simulations, migration step verification, and invariant reconciliation against the reference dataset.

**Target Platform**: Windows, macOS, and Linux desktop targets. Production persistence remains gated on multi-target native host proof from F006.

**Project Type**: Single Electron desktop application with trusted main-process storage management, sandboxed preload bridge, and unprivileged React renderer.

**Performance Goals**: Sub-50ms local reads for cached views; sub-100ms atomic commits for domain-outbox mutations; migration pre-flight checks under 200ms; zero frame drops in renderer during background persistence flushes.

**Constraints**:

- Strict fail-closed behavior: read failures, locked vaults, and corrupted files MUST NEVER create an empty replacement database.
- Zero plaintext fallback on any disk surface (pages, WAL, temporary tables, index structures).
- Zero SQL execution, file paths, or cryptographic keys exposed to the renderer process.
- All error and recovery states must provide complete bilingual (English & Arabic) guidance meeting WCAG 2.2 AA standards.

**Scale/Scope**: Multi-workspace local caching supporting up to 50,000 local records per workspace; up to 100 concurrent outbox operations; database sizes up to 500MB with 2x pre-flight disk space headroom enforcement.

---

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                        | Pre-research gate                                                                                                               | Post-design disposition                                                                                                                    |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Scope and traceability**    | **PASS**: Planning within user request; PLT-007, NFR-003, NFR-010 tracked; no unauthorized code implementation.                 | **PASS**: Documentation only; spec requirements (FR-001–FR-014) map directly to data model and contracts.                                  |
| **II. Desktop trust**            | **PASS with obligation**: Storage engine must execute exclusively in main process; renderer remains unprivileged.               | **PASS as design**: All database handles, SQL statements, and keys reside in main; preload exposes only safe `getState()` / `retryOpen()`. |
| **III. Offline/cloud authority** | **PASS with boundary**: Local persistence provides offline cache and outbox; server retains final financial/issuance authority. | **PASS**: Outbox operations are queued locally with expected revisions; final numbering and issuance remain cloud-authoritative.           |
| **IV. Financial evidence**       | **PASS**: Minor-unit integers and exact seconds must be preserved without float coercion.                                       | **PASS**: Reference dataset and invariant reconciliation explicitly assert exact minor units and integer seconds preservation.             |
| **V. Fail-closed security**      | **PASS with obligation**: Storage must fail closed without plaintext fallback or unencrypted temporary files.                   | **PASS as design**: SQLCipher page encryption enforced; locked vault or missing key immediately halts startup into `recovery_required`.    |
| **VI. Arabic/accessibility**     | **PASS with obligation**: Recovery screens, errors, and stored data must support full English and Arabic with RTL.              | **PASS as design**: All recovery states provide complete English/Arabic text; data model validates Arabic UTF-8 text integrity.            |
| **VII. Recoverable evolution**   | **PASS with obligation**: Migrations must have pre-flight space verification, snapshots, and fail-safe recovery.                | **PASS as design**: 5-phase migration protocol with 2x space check, restorable `.snapshot`, and journal-driven automatic rollback.         |
| **VIII. Evidence**               | **PASS with obligation**: Automated crash simulation, read-failure injection, and invariant checks required.                    | **PASS as design**: Quickstart scenarios define executable test suites for corruption, process kill, and invariant reconciliation.         |

**Gate Result**: All constitutional principles PASS as design. Production customer data persistence remains gated on multi-target native host proof from F006.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-encrypted-local-persistence/
├── spec.md                     # Feature specification (speckit-specify output)
├── checklists/
│   └── requirements.md         # Requirements quality validation checklist
├── plan.md                     # Implementation plan (this file)
├── research.md                 # Phase 0 technical research
├── data-model.md               # Phase 1 data schemas, metadata, and state machines
├── quickstart.md               # Phase 1 quickstart validation scenarios
└── contracts/
    ├── persistence-boundary.md # Main process persistence API and IPC contract
    ├── migration-protocol.md   # 5-phase migration protocol & snapshot recovery
    └── reference-dataset.md    # Standardized dataset & invariant reconciliation
```

### Source Code Layout (repository root; proposed implementation layout)

```text
app/
├── main/
│   ├── persistence/            # Planned F007 persistence module
│   │   ├── database-connection.ts   # SQLCipher connection manager
│   │   ├── persistence-service.ts   # Core persistence lifecycle & transactions
│   │   ├── migration-coordinator.ts # 5-phase migration runner & pre-flight
│   │   ├── snapshot-manager.ts      # Pre-migration snapshot creation & restore
│   │   └── schema/
│   │       ├── migrations/          # Monotonic migration step definitions
│   │       └── reference-dataset.ts # Baseline qualification fixtures
│   ├── bridge.ts               # Existing F004 bridge; register safe persistence handlers
│   └── main.ts                 # Main process bootstrap & workspace store lifecycle
├── preload/
│   └── preload.ts              # Expose window.solodesk.persistence safe facade
├── shared/
│   └── persistence-contracts.ts# Shared types, error codes, and DTOs
└── renderer/
    └── shell/
        └── PersistenceRecoveryModal.tsx # Accessible English/Arabic recovery dialog
tooling/
└── f007/                       # Verification scripts and crash-test runners
    ├── verify.mjs              # F007 test suite runner
    └── test-fixtures.mjs       # Reference dataset seeders and inspectors
tests/
└── f007/                       # Automated test suites
    ├── unit/                   # Pre-flight, space math, version parsing
    ├── integration/            # Transactions, outbox atomicity, raw file inspection
    └── migrations/             # Interrupted migrations, snapshot rollback
```

---

## Design and Implementation Sequence

1. **Step 1: Core Persistence Service & Connection Lifecycle**
   Implement `DatabaseConnection` and `PersistenceService` in `app/main/persistence/`. Integrate with F006 `ProtectionOwner` to open encrypted databases in SQLCipher v4 mode. Enforce fail-closed read behavior: if a database file exists but cannot be opened/decrypted, transition into `recovery_required` and strictly forbid calling `CREATE TABLE` or creating an empty replacement.

2. **Step 2: Atomic Transaction & Outbox Enqueue Engine**
   Implement `executeTransaction()` in `PersistenceService`. Provide transactional helpers that bind domain entity mutations and `outbox_operations` queue records in a single SQLite WAL transaction. Implement automated crash-simulation tests proving atomic all-or-nothing commits.

3. **Step 3: Migration Coordinator & Pre-Flight Space Engine**
   Implement `MigrationCoordinator` in `app/main/persistence/`. Build pre-flight verifiers that assert encryption key validity, check schema compatibility, and calculate free disk space on the target volume ($S_{required} \ge 2 \times S_{db} + 50\text{MB}$). Reject migrations with `disk_full` when headroom is insufficient.

4. **Step 4: Snapshot Manager & Journaling Engine**
   Implement `SnapshotManager` to flush WAL, copy the encrypted database into `.migration/*.snapshot`, and compute its SHA-256 digest before schema alterations begin. Implement `_migration_journal` logging with step transitions (`in_progress` $\rightarrow$ `completed`).

5. **Step 5: Interrupted Migration Detection & Automatic Rollback**
   Implement startup recovery logic: detect `in_progress` steps in `_migration_journal`, restore the verified `.snapshot` file over `store.db`, update journal status to `rolled_back`, and display a structured `interrupted_migration` recovery dialog.

6. **Step 6: Reference Dataset & Invariant Reconciliation Suite**
   Create the standardized reference dataset in `app/main/persistence/schema/reference-dataset.ts`. Build the invariant reconciliation checker in `tooling/f007/` asserting 100% preservation of counts, foreign keys, Arabic text, and exact numeric primitives.

7. **Step 7: Preload Bridge & Accessible Bilingual Recovery UI**
   Register safe IPC handlers in `app/main/bridge.ts` for `solodesk.persistence.getState()` and `retryOpen()`. Create the accessible, bilingual `PersistenceRecoveryModal` in the renderer shell supporting keyboard navigation, visible focus indicators, and truthful unsynced work warnings.

8. **Step 8: Automated Verification, Documentation & Evidence**
   Integrate F007 verification suites into `npm run test:f007` and the F002 evidence pipeline. Capture test outputs, raw disk file inspections, crash simulations, and invariant reconciliation reports. Update `docs/features/F007.md` and `docs/qa/F007.md`.
