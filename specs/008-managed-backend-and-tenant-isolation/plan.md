# Implementation Plan: F008 — Managed Backend and Tenant Isolation

**Branch**: `feat/f008-managed-backend-and-tenant-isolation` (proposed in the root plan; Spec Kit setup identity: `008-managed-backend-and-tenant-isolation`) | **Date**: 2026-10-19 | **Spec**: [F008 feature specification](spec.md)

**Input**: Feature specification from `specs/008-managed-backend-and-tenant-isolation/spec.md`

**Status**: Phase 0 research and Phase 1 design complete as documentation. No application code, database schema migrations, or cloud infrastructure was provisioned or implemented by this planning request.

---

## Summary

F008 establishes the authoritative managed cloud backend architecture and multi-tenant security foundation for SoloDesk. It delivers PostgreSQL relational schemas with row-level tenant discrimination, database-level Row Level Security (RLS) policies, composite relational constraints preventing cross-tenant pointer poisoning, immutable workspace identifiers, protected workspace ownership continuity, private object storage with 15-minute signed download URLs, serverless Edge Function gateway boundaries, and proactive quota tracking with graceful offline degradation.

The architecture accommodates both solo freelancers and collaborative small teams using an identical workspace isolation model (Constitution Principle III). In accordance with decisions D-19 and Q-02, local development and continuous integration utilize local emulated Supabase/PostgreSQL services with synthetic multi-tenant datasets, deferring paid cloud signups and production provisioning until authorized.

Complete architectural research, schema definitions, interface contracts, and runnable validation scenarios are documented in [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), and [quickstart.md](quickstart.md).

---

## Technical Context

**Language/Version**: TypeScript 7.0.2, Node >=24 <25 (runtime), PostgreSQL 16+ (Supabase database engine), Deno 1.45+ (Edge Function runtime), Electron 44.8.0 per pinned package manifest.

**Primary Dependencies**: `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, F003 pure domain contracts and envelope primitives (`packages/domain`, `packages/contracts`), Supabase CLI (local emulator). Zero new runtime packages are required or installed by this plan.

**Storage**: PostgreSQL 16+ managed relational database with Row Level Security (`ENABLE & FORCE ROW LEVEL SECURITY`), composite primary/foreign keys `(workspace_id, id)`, immutable workspace triggers, private Supabase Storage bucket (`workspaces`), and local encrypted SQLite outbox (F007).

**Testing**: Local Supabase CLI emulator / PostgreSQL test containers, synthetic multi-tenant seed fixtures (`tooling/f008/seed-test-tenants.mjs`), verification test runner (`tooling/f008/verify.mjs`), security static scans (`npm run check:security`), and F002 verification harness.

**Target Platform**: Managed cloud backend (Supabase PostgreSQL, Auth, Storage, Edge Functions) interfaced with cross-platform Electron desktop clients on Windows, macOS, and Linux.

**Project Type**: Multi-tenant cloud backend infrastructure (relational schemas, RLS policies, private storage, Edge Functions) supporting desktop and future web portal clients.

**Performance Goals**: Sub-10ms overhead for RLS policy evaluation; sub-50ms query latency for indexed tenant views; 100% fail-closed rejection of cross-tenant queries; signed file download URL generation under 50ms; zero impact on renderer frame rates during background synchronization.

**Constraints**:

- Strict fail-closed tenant isolation enforced at the database engine level (never relying on client-side filtering).
- 100% zero data leakage across workspaces in queries, mutations, counts, aggregations, or full-text search.
- Immutable `workspace_id` across all tenant records via PostgreSQL triggers.
- Enforced workspace owner continuity: the sole remaining Owner can never be removed or downgraded without prior transfer.
- Zero service-role or database superuser keys distributed in client application bundles.
- 100% data preservation on quota exhaustion: zero silent data drops, seamless fallback to local offline outbox (F007).
- Complete bilingual English and Arabic localized errors and quota notifications with compliant RTL layout (WCAG 2.2 AA).

**Scale/Scope**: Designed to support thousands of independent solo and team workspaces on shared managed cloud infrastructure; up to 50 members per workspace; up to 100MB per file attachment; operational quota monitoring tuned to 500MB DB / 1GB Storage / 5GB Egress free/pilot allowances.

---

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                        | Pre-research gate                                                                                                                                     | Post-design disposition                                                                                                                              |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Scope and traceability**    | **PASS**: Planning within user request; PLT-003, PLT-005, NFR-004, NFR-009 tracked; no unauthorized code implementation.                              | **PASS**: Documentation only; spec requirements (FR-001–FR-016) map directly to data model and contracts.                                            |
| **II. Desktop trust**            | **PASS with obligation**: Cloud backend must enforce its own security; renderer remains unprivileged; zero service-role keys in bundles.              | **PASS as design**: Zero service keys in client; desktop calls API via anon key with RLS; Edge Functions validate JWT and membership.                |
| **III. Offline/cloud authority** | **PASS with boundary**: Cloud DB is authoritative for accepted records; solo freelancers share team isolation; local offline outbox preserves drafts. | **PASS as design**: Solo and team workspaces use identical schema; cloud outages cleanly degrade to local encrypted SQLite outbox (F007).            |
| **IV. Exact financial evidence** | **PASS**: Currency minor units, exact decimals, and integer seconds must be preserved without floating-point coercion.                                | **PASS as design**: Schemas strictly use `bigint` for minor units, bounded strings/decimals for rates, and integer seconds for durations.            |
| **V. Fail-closed security**      | **PASS with obligation**: Must enforce default-deny RLS, composite constraints, private storage, and 15-min signed URLs.                              | **PASS as design**: `FORCE ROW LEVEL SECURITY` on all tables; composite FKs `(workspace_id, parent_id)`; private storage bucket; 15-min signed URLs. |
| **VI. Arabic/accessibility**     | **PASS with obligation**: Quota alerts, error envelopes, and degraded mode notifications must support English and Arabic with RTL.                    | **PASS as design**: Complete paired English and Arabic strings specified in `contracts/quota-and-degraded-mode.md` with WCAG 2.2 AA compliance.      |
| **VII. Recoverable evolution**   | **PASS with obligation**: Quota limits must not silently delete data; outages must degrade gracefully without empty replacement states.               | **PASS as design**: 100% data retention on quota exhaustion; write rejections cleanly captured in local outbox; zero destructive purging.            |
| **VIII. Evidence**               | **PASS with obligation**: Executable test suites for cross-tenant leakage, composite FKs, role revocation, and quota rejection required.              | **PASS as design**: Quickstart scenarios define 6 executable verification suites with 57 concrete assertion points.                                  |

**Gate Result**: All constitutional principles PASS as design. Implementation and cloud provisioning remain gated on user authorization and resolution of operational decision Q-02.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-managed-backend-and-tenant-isolation/
├── spec.md                          # Feature specification (speckit-specify output)
├── checklists/
│   └── requirements.md              # Requirements quality validation checklist
├── plan.md                          # Implementation plan (this file)
├── research.md                      # Phase 0 technical research findings
├── data-model.md                    # Phase 1 relational schema, constraints, RLS, and state machines
├── quickstart.md                    # Phase 1 runnable validation guide and test scenarios
└── contracts/
    ├── tenant-relational-schema.md  # PostgreSQL DDL, composite keys, triggers, and RLS policies
    ├── private-storage-protocol.md  # Supabase Storage bucket, path taxonomy, and 15-min signed URLs
    ├── domain-gateway-boundary.md   # Edge Function execution boundary, TrustedContext, and F003 errors
    └── quota-and-degraded-mode.md   # Quota thresholds, bilingual alerts, and offline degraded mode
```

### Source Code Layout (repository root; proposed implementation layout)

```text
supabase/
├── config.toml                      # Supabase local emulator configuration
├── migrations/                      # Monotonic PostgreSQL database migrations
│   ├── 20261020000001_workspace_tenants.sql       # Tenants, memberships, and audit tables
│   ├── 20261020000002_security_helper_functions.sql # current_user_id, has_active_membership, role checks
│   ├── 20261020000003_immutability_and_ownership.sql# reject_workspace_mutation & owner continuity triggers
│   ├── 20261020000004_tenant_rls_policies.sql     # Fail-closed RLS policies on all tables
│   ├── 20261020000005_private_storage_setup.sql   # Private bucket & storage.objects RLS policies
│   └── 20261020000006_provider_quota_profiles.sql # Quota tracking tables & calculation triggers
├── functions/                       # TypeScript Supabase Edge Functions (Deno runtime)
│   ├── _shared/
│   │   ├── auth.ts                  # JWT validation & TrustedContext constructor
│   │   ├── errors.ts                # F003 PublicError response formatter
│   │   ├── rls-client.ts            # Authenticated Supabase client factory (scoped to tenant)
│   │   └── quota.ts                 # Quota pre-flight verifiers
│   ├── command-gateway/             # Bounded command dispatcher
│   │   └── index.ts
│   └── storage-signed-url/          # 15-minute signed URL token generator
│       └── index.ts
└── seed.sql                         # Synthetic multi-tenant test seed data

app/
├── main/
│   └── cloud/                       # Main process cloud connection & degraded mode monitor
│       ├── cloud-gateway-client.ts  # Client interface for Edge Functions & RLS queries
│       └── degraded-mode-manager.ts # Network health monitor & local outbox fallback coordinator
├── shared/
│   └── cloud-contracts.ts           # Shared TypeScript types for cloud requests, quotas, and errors
└── renderer/
    └── shell/
        └── QuotaWarningBanner.tsx   # Accessible English/Arabic quota alert & degraded mode banner

tooling/
└── f008/                            # F008 automated verification suite
    ├── seed-test-tenants.mjs        # Seeds Workspace Alpha and Beta synthetic fixtures
    ├── verify.mjs                   # Main F008 verification runner (6 test suites)
    ├── test-cross-tenant.mjs        # Cross-tenant read, write, count, and search isolation tests
    ├── test-relational.mjs          # Composite FK and workspace immutability trigger tests
    ├── test-roles.mjs               # Real-time role check, immediate revocation, and owner continuity
    ├── test-storage.mjs             # Private bucket, path traversal, and 15-minute signed URL tests
    ├── test-quota.mjs               # 70/85/95/100% quota warnings and write rejection tests
    └── test-secrets.mjs             # Static bundle scanner asserting zero service-role keys

tests/
└── f008/                            # Jest/Node integration test definitions
    ├── cross-tenant-isolation.test.ts
    ├── relational-integrity.test.ts
    ├── role-lifecycle.test.ts
    ├── private-storage.test.ts
    └── quota-resilience.test.ts
```

---

## Design and Implementation Sequence

1. **Step 1: Local Supabase Infrastructure & Migration Harness**
   Configure `supabase/config.toml` for local emulation. Build the migration runner in `tooling/f008/` to apply versioned migrations against local PostgreSQL containers without requiring cloud network connectivity.

2. **Step 2: Core Relational Tenant Schema & Helper Functions**
   Implement migrations `20261020000001` and `20261020000002`: create `workspace_tenants`, `workspace_memberships`, and `tenant_audit_events`. Implement `SECURITY DEFINER` helper functions (`current_user_id()`, `has_active_membership()`, `get_workspace_role()`) optimized with stable execution plans.

3. **Step 3: Relational Integrity, Triggers & Ownership Continuity**
   Implement migration `20261020000003`: add `reject_workspace_id_mutation()` trigger function and attach it to all tenant tables. Add `prevent_last_owner_removal()` trigger on `workspace_memberships`. Create representative child tables (`clients`, `projects`, `tasks`, `time_entries`) with composite foreign keys `(workspace_id, parent_id)`.

4. **Step 4: Database Row Level Security (RLS) Policy Engine**
   Implement migration `20261020000004`: enable and force RLS on 100% of tenant tables. Define strict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies evaluated dynamically against live `workspace_memberships`. Test that aggregate calculations (`COUNT`, `SUM`) and full-text searches produce zero cross-tenant leakage.

5. **Step 5: Private Object Storage & Signed URL Generator**
   Implement migration `20261020000005`: configure private `workspaces` storage bucket (`public = false`) with 100MB file limit. Implement RLS policies on `storage.objects` enforcing tenant path prefixing (`workspaces/{workspace_id}/...`). Build the Edge Function `storage-signed-url` to generate time-limited (15-minute) signed access URLs after verifying entity read grants.

6. **Step 6: Domain Command Gateway & Envelope Error Mapping**
   Build the TypeScript Edge Function `command-gateway` in `supabase/functions/command-gateway/`: parse incoming JWTs, construct `TrustedContext`, validate role capabilities against the authorization matrix, and format all error responses conforming strictly to F003 `PublicError`.

7. **Step 7: Quota Monitoring, Safe Rejection & Degraded Mode**
   Implement migration `20261020000006`: create `provider_quota_profiles`. Build pre-flight write verifiers halting uploads at 100% capacity with clean `STORAGE_UNAVAILABLE` errors. Implement `degraded-mode-manager.ts` in the desktop client to seamlessly route rejected or offline edits into the local encrypted SQLite outbox (F007). Build the accessible, bilingual `QuotaWarningBanner` in the renderer shell.

8. **Step 8: Automated Verification, Security Scans & Delivery Evidence**
   Build `tooling/f008/verify.mjs` running the 6 verification suites (57 assertion points). Integrate static secret bundle scanning into `check:security`. Document observed test outputs, schema versions, and native platform observations in `docs/features/F008.md` and `docs/qa/F008.md`.

---

## Interface, Data and Failure Summary

- [Relational Schema Contract](contracts/tenant-relational-schema.md) defines PostgreSQL DDL, composite uniqueness, composite foreign keys, immutability triggers, owner continuity guards, and fail-closed Row Level Security policies.
- [Private Storage Protocol](contracts/private-storage-protocol.md) defines private bucket setup, canonical path structure (`workspaces/{workspace_id}/...`), storage RLS, and 15-minute signed download URL generation.
- [Domain Gateway Boundary](contracts/domain-gateway-boundary.md) defines Edge Function request handling, `TrustedContext` extraction, role capability matrix, F003 `PublicError` mappings, and secret isolation.
- [Quota and Degraded Mode](contracts/quota-and-degraded-mode.md) defines capacity tiers (70/85/95/100%), write rejection rules, bilingual English/Arabic localized text, and non-destructive offline degradation.
- [Data Model](data-model.md) defines all relational schemas, column constraints, indexes, and state machine transitions.

---

## Verification and Traceability

| Requirement Slice                        | Functional Requirements        | Acceptance Scenarios   | Planned Verification Suite                                    |
| :--------------------------------------- | :----------------------------- | :--------------------- | :------------------------------------------------------------ |
| **Tenant Database Isolation**            | FR-001, FR-004                 | A-01, A-02, A-03       | `verify.mjs test:cross-tenant-isolation`                      |
| **Relational Integrity & Immutability**  | FR-002, FR-003                 | A-04, A-13, A-14, A-15 | `verify.mjs test:relational-constraints`                      |
| **Role Authorization & Continuity**      | FR-005, FR-006, FR-007, FR-008 | A-05, A-06, A-07, A-08 | `verify.mjs test:role-lifecycle`                              |
| **Private Storage & Expiring Tokens**    | FR-009, FR-010, FR-011         | A-09, A-10, A-11, A-12 | `verify.mjs test:private-storage`                             |
| **Quota Alerts & Offline Degraded Mode** | FR-013, FR-014, FR-015, FR-016 | A-16, A-17, A-18       | `verify.mjs test:quota-resilience`                            |
| **Secret Vault Isolation**               | FR-012                         | SC-009                 | `npm run check:security` / `verify.mjs test:secret-isolation` |

---

## Rollout, Compatibility and Recovery

F008 establishes the foundational cloud relational structure and does not replace existing customer databases. For initial development and test cycles, local synthetic databases can be reset safely via `supabase db reset --local`. Future schema evolution follows strict forward-compatible additive migration rules (Constitution Principle VII).

If a cloud provider outage or project inactivity pause occurs, desktop clients automatically enter degraded offline mode, preserving all uncommitted work in the local encrypted SQLite outbox (F007) until connectivity is re-established. Production cloud provisioning remains blocked pending operational decision Q-02.

---

## Complexity Tracking

No constitutional deviations or unjustified complexity are introduced. The shared database with row-level tenant discrimination and composite foreign keys is the minimal, most cost-effective architecture satisfying SoloDesk's multi-tenant isolation, offline synchronization, and free-tier cost constraints (decisions D-10, D-19, A-01).
