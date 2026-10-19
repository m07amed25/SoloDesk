# Phase 1 Quickstart Validation Guide: F007 Encrypted Local Persistence and Migrations

**Date**: 2026-10-19
**Status**: Technical validation guide detailing runnable test scenarios and acceptance verifications for F007.

This document guides contributors and automated test runners through executing the core validation scenarios that prove F007 meets all specification requirements and quality gates.

---

## 1. Prerequisites & Environment Setup

- **Node.js**: `>= 24 < 25`
- **Native Dependencies**: Rebuilt native modules for local Electron runtime (`better-sqlite3-multiple-ciphers`).
- **Prerequisite Features**:
  - [F003 shared domain contracts](file:///home/mohamed-s/Desktop/SoloDesk/specs/003-shared-domain-contracts/spec.md) verified.
  - [F006 key protection boundary](file:///home/mohamed-s/Desktop/SoloDesk/specs/006-cross-platform-key-protection/spec.md) available in evaluation mode.

---

## 2. Test Execution Commands

```bash
# Run pure persistence unit tests (schema validation, pre-flight space calculations)
npm run test:f007:unit

# Run storage integration tests (transactions, atomic outbox commits, raw file inspection)
npm run test:f007:integration

# Run migration & snapshot recovery tests (interrupted migration, snapshot rollback)
npm run test:f007:migrations

# Run full F007 verification suite with reference dataset reconciliation
npm run test:f007
```

_(Note: Test command aliases are established during implementation tasks)_

---

## 3. Core Validation Scenarios

### Scenario 1: Isolated Encrypted Persistence & Raw File Inspection

**Goal**: Prove that local databases persist into per-workspace encrypted containers with zero plaintext leakage.

1. **Execution**:
   - Initialize workspace store `ws-test-alpha` with synthetic encryption key.
   - Insert records containing distinctive marker strings (e.g., `ALPHA-SECRET-9941`, `مهمة سرية جداً`).
   - Insert records into a separate workspace store `ws-test-beta` (e.g., `BETA-SECRET-1122`).
   - Close connections.
2. **Verification**:
   - Inspect raw disk files (`store.db`, `store.db-wal`) with string and hex inspection tools.
   - Assert `ALPHA-SECRET-9941` and Arabic strings are **completely absent** from raw disk bytes.
   - Query `ws-test-alpha`; assert only alpha records are returned and zero beta records exist.

---

### Scenario 2: Atomic Transaction & Outbox Crash Simulation

**Goal**: Prove that domain entity changes and outbound sync queue entries commit atomically, or roll back cleanly on crash.

1. **Execution**:
   - Open active transaction on `ws-test-alpha`.
   - Mutate a task record and enqueue an `outbox_operations` record.
   - Simulate sudden process termination (SIGKILL) immediately prior to commit.
   - Reopen workspace store on fresh process startup.
2. **Verification**:
   - Query task table: assert uncommitted task edit does NOT exist.
   - Query outbox table: assert uncommitted outbox operation does NOT exist.
   - Repeat test with SIGKILL immediately _after_ commit: assert BOTH task edit and outbox operation exist.

---

### Scenario 3: Fail-Closed Storage Reads & No Empty Replacement

**Goal**: Prove that read failures, header corruption, or missing keys halt startup without creating a blank database.

1. **Execution**:
   - Populate database `ws-test-corrupt` with 10 records.
   - Induce simulated header corruption (corrupt first 100 bytes).
   - Attempt to open `ws-test-corrupt` via `openWorkspaceStore()`.
2. **Verification**:
   - Assert call throws or returns `status: 'recovery_required'`.
   - Assert `reasonCode` is `'integrity_failed'`.
   - Assert original file on disk is **not overwritten or truncated** (file size matches original).
   - Assert zero empty replacement database or tables were created.

---

### Scenario 4: Pre-Flight Disk Space Rejection & Snapshot Creation

**Goal**: Prove that migrations refuse to run when disk space is constrained, and create verified snapshots when space is adequate.

1. **Execution**:
   - Configure a mock filesystem reporting available disk space less than 2x database size.
   - Request schema migration from version 1 to version 2.
2. **Verification**:
   - Assert migration halts immediately with `reasonCode: 'disk_full'`.
   - Assert zero database modifications occurred.
   - Re-run with adequate mock disk space:
     - Assert `.snapshot` file is created in `.migration/`.
     - Assert snapshot SHA-256 matches verified source database.

---

### Scenario 5: Interrupted Migration & Automatic Snapshot Rollback

**Goal**: Prove that an interrupted migration step automatically restores the pre-migration snapshot on restart.

1. **Execution**:
   - Start migration sequence from version 1 to version 2.
   - Migration journal inserts `step_id: "0002_add_field"` with `status: 'in_progress'`.
   - Simulate power cut / crash midway through table alteration.
   - Restart application and trigger store opening for the workspace.
2. **Verification**:
   - Startup sequence discovers `status: 'in_progress'` in `_migration_journal`.
   - System automatically restores `.snapshot` over `store.db`.
   - System updates journal step status to `'rolled_back'`.
   - System halts in `recovery_required` with `reasonCode: 'interrupted_migration'`.
   - Database reopens safely under version 1 with zero data corruption.

---

### Scenario 6: Reference Dataset & Arabic Invariant Reconciliation

**Goal**: Prove that migrations preserve 100% of reference data and multilingual invariants.

1. **Execution**:
   - Seed database with the full standardized Reference Dataset (Arabic text, minor-unit currencies, integer seconds).
   - Run complete migration sequence to current schema version.
   - Execute automated invariant reconciliation check.
2. **Verification**:
   - Assert `totalEntitiesBefore === totalEntitiesAfter`.
   - Assert zero broken foreign keys.
   - Assert Arabic strings (e.g. `شركة الأفق الرقمي`) match byte-for-byte.
   - Assert exact integers (e.g. `1250050` minor units, `7200` seconds) are unchanged.
