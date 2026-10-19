# Quickstart Validation Guide: F008 Managed Backend and Tenant Isolation

**Date**: 2026-10-19  
**Feature**: [F008 — Managed Backend and Tenant Isolation](spec.md)  
**Parent Contract**: [Data Model](data-model.md) | [Contracts](contracts/)  
**Status**: Authoritative Runnable Validation Guide

---

## 1. Overview & Objectives

This guide documents the executable verification scenarios that prove F008's multi-tenant isolation, database Row Level Security, composite integrity constraints, role authorization, private storage policies, and quota monitoring end-to-end.

Testing utilizes a local emulated Supabase/PostgreSQL environment (`supabase start` / PostgreSQL test containers) with synthetic seed data, satisfying decisions D-19 and Q-02 without requiring paid cloud provisioning.

---

## 2. Prerequisites & Setup

### 2.1. Environment Prerequisites

- Node.js `>=24 <25` (per `package.json` engines)
- Docker / Podman (for running local Supabase emulator)
- Supabase CLI installed locally or via npx (`npx supabase@latest`)

### 2.2. Local Test Environment Initialization

```bash
# 1. Initialize and start local Supabase backend services
npx supabase init
npx supabase start

# 2. Apply F008 database migrations and RLS policies
npx supabase db reset --local

# 3. Seed test tenants and user accounts
# Creates:
# - Workspace Alpha ('ws_alpha_01') with Owner ('usr_alice'), Contributor ('usr_bob')
# - Workspace Beta ('ws_beta_02') with Owner ('usr_charlie')
node tooling/f008/seed-test-tenants.mjs
```

---

## 3. Executable Validation Scenarios

### Scenario 1: Strict Cross-Tenant Database Isolation & Zero Leakage (Acceptance A-01, A-02, A-03)

Proves that an authenticated user in Workspace Alpha cannot read, mutate, count, or discover records in Workspace Beta.

```bash
# Execute cross-tenant isolation test suite
node tooling/f008/verify.mjs test:cross-tenant-isolation
```

**Expected Outcomes**:

- **A-01 (Cross-tenant read)**: Authenticated as `usr_alice` (Workspace Alpha), requesting `SELECT * FROM clients WHERE id = 'cli_beta_99'` returns 0 rows (empty set); direct API returns `404 RESOURCE_UNAVAILABLE` without revealing whether `cli_beta_99` exists.
- **A-02 (Cross-tenant write)**: Inserting a task with `workspace_id = 'ws_beta_02'` while authenticated as `usr_alice` throws PostgreSQL error `42501 (insufficient_privilege)`. Zero rows are inserted.
- **A-03 (Zero aggregate/search leakage)**: `SELECT count(*) FROM clients` returns only Alpha's client count; text search for keyword `"Acme"` matches only Alpha's client name with zero leakage from Beta.

---

### Scenario 2: Immutable Workspace ID & Composite Foreign Key Defense (Acceptance A-04, A-13, A-15)

Proves that records cannot be re-parented across tenants and relational foreign keys strictly prevent cross-tenant graph links.

```bash
# Execute relational constraint and trigger test suite
node tooling/f008/verify.mjs test:relational-constraints
```

**Expected Outcomes**:

- **A-04 (Workspace ID immutability)**: Attempting `UPDATE clients SET workspace_id = 'ws_beta_02' WHERE id = 'cli_alpha_01'` triggers `reject_workspace_id_mutation()`, throwing an exception with SQLSTATE `23514` / integrity constraint violation. The record remains in Workspace Alpha.
- **A-13 (Composite foreign key enforcement)**: Attempting to insert a project with `workspace_id = 'ws_alpha_01'` and `client_id = 'cli_beta_01'` is rejected by `fk_projects_client` composite constraint `(workspace_id, client_id)`. SQLSTATE `23503 (foreign_key_violation)`.
- **A-15 (Uniform tenant attribution)**: Multi-entity batch transaction inserting client, project, and task with mismatched tenant IDs rolls back completely.

---

### Scenario 3: Real-Time Role Authorization, Revocation & Owner Continuity (Acceptance A-05, A-06, A-07, A-08)

Proves that role permissions are validated dynamically on live membership tables, member revocations take effect immediately, and sole owners cannot be removed.

```bash
# Execute role lifecycle and ownership continuity test suite
node tooling/f008/verify.mjs test:role-lifecycle
```

**Expected Outcomes**:

- **A-05 (Real-time role evaluation)**: Contributor `usr_bob` attempts `INSERT INTO clients` $\rightarrow$ rejected by RLS with `insufficient_privilege`. Admin promotes `usr_bob` to `manager` $\rightarrow$ identical insert statement succeeds immediately.
- **A-06 (Immediate revocation)**: While `usr_bob` holds an active session, Admin revokes `usr_bob`'s membership (`status = 'revoked'`). `usr_bob`'s immediate next query `SELECT * FROM tasks` is rejected with `401 SESSION_REVOKED` without waiting for JWT expiration.
- **A-07 (Protected owner continuity)**: Attempting `DELETE FROM workspace_memberships WHERE user_id = 'usr_alice' AND workspace_id = 'ws_alpha_01'` triggers `prevent_last_owner_removal()`, failing with `Ownership continuity violation`.
- **A-08 (Auditable permission changes)**: Each role change and member invite generates an immutable append-only record in `tenant_audit_events` with actor ID, timestamp, and redacted diff.

---

### Scenario 4: Private Object Storage & 15-Minute Signed URLs (Acceptance A-09, A-10, A-11, A-12)

Proves that cloud file storage is private by default, tenant partitioned, and accessible only through expiring signed tokens.

```bash
# Execute private storage protocol test suite
node tooling/f008/verify.mjs test:private-storage
```

**Expected Outcomes**:

- **A-09 (Private storage by default)**: Direct unauthenticated HTTP GET to `http://localhost:54321/storage/v1/object/workspaces/ws_alpha_01/invoices/inv_01/doc.pdf` returns `HTTP 403 Forbidden`.
- **A-10 (Tenant path partitioning)**: Attempting to upload a file to `workspaces/ws_beta_02/...` while authenticated as `usr_alice` (Alpha) is rejected by storage RLS with `HTTP 403 Forbidden`.
- **A-11 (15-Minute Signed URL Lifespan)**: Requesting a signed URL through the gateway generates a token valid for 900 seconds. Downloading with the signed token succeeds within 15 minutes; attempting download at $T + 901\text{s}$ returns `HTTP 400 ExpiredToken`.
- **A-12 (Cross-tenant file manipulation)**: `usr_alice` cannot delete or overwrite files in `workspaces/ws_beta_02/...`.

---

### Scenario 5: Quota Threshold Alerts & Graceful Degraded Offline Mode (Acceptance A-16, A-17, A-18)

Proves that quota warnings alert users at 70%, 85%, 95%, cloud writes halt cleanly at 100% without data loss, and cloud outages degrade safely to local offline mode.

```bash
# Execute quota tracking and degraded-mode test suite
node tooling/f008/verify.mjs test:quota-resilience
```

**Expected Outcomes**:

- **A-16 (Threshold alerts)**: Seeding storage to 72% triggers bilingual `warning_70` alert; seeding to 87% triggers `warning_85`; seeding to 96% triggers `critical_95`. Notifications display complete English and Arabic text with correct RTL formatting.
- **A-17 (Safe write rejection on 100% quota)**: Seeding storage to 100% capacity and attempting an attachment upload returns a clean `507 STORAGE_UNAVAILABLE` error. Zero existing files or records are deleted or modified.
- **A-18 (Non-destructive offline degradation)**: Halting the local Supabase container (`npx supabase stop`) and triggering a task save causes the client to transition into `offline_degraded` mode, displaying the bilingual offline banner and saving the edit to the local encrypted SQLite database (`store.db`) with `status = 'pending_outbox'`. No crashes, no blank screens.

---

### Scenario 6: Secret Vault Isolation & Zero Service-Role Leakage (FR-012, SC-009)

Proves that client application builds, renderer bundles, and desktop packages contain zero service-role keys or superuser credentials.

```bash
# Execute static security audit on build distributions
npm run check:security
node tooling/f008/verify.mjs test:secret-isolation
```

**Expected Outcomes**:

- **SC-009**: The scanner inspects all files in `.vite/build`, `app/`, `dist/`, and environment bundles. It asserts that `SUPABASE_SERVICE_ROLE_KEY`, `postgres://postgres:...`, and admin tokens are 100% absent from all client-facing artifacts. Result: `0 secrets detected. PASS`.

---

## 4. Complete Verification Command

Run the full end-to-end F008 verification suite:

```bash
node tooling/f008/verify.mjs
```

A passing run reports:

```text
✔ Test Suite 1: Cross-Tenant Database Isolation (A-01, A-02, A-03) - PASSED (14/14 tests)
✔ Test Suite 2: Relational Constraints & Immutability (A-04, A-13, A-15) - PASSED (8/8 tests)
✔ Test Suite 3: Real-Time Role Lifecycle & Continuity (A-05, A-06, A-07, A-08) - PASSED (11/11 tests)
✔ Test Suite 4: Private Storage & Signed Tokens (A-09, A-10, A-11, A-12) - PASSED (9/9 tests)
✔ Test Suite 5: Quota Tracking & Degraded Resilience (A-16, A-17, A-18) - PASSED (10/10 tests)
✔ Test Suite 6: Secret Isolation & Distribution Scan (FR-012, SC-009) - PASSED (5/5 tests)

Overall Result: 57 / 57 tests PASSED (100% compliance with F008 acceptance criteria)
```
