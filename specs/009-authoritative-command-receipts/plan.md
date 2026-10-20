# Implementation Plan: F009 — Authoritative Command Receipts and Audit

**Branch**: `009-authoritative-command-receipts` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-authoritative-command-receipts/spec.md`

**Authorization**: Planning and documentation only. This plan does not authorize implementation, provisioning, deployment, PR mutation, merge, or release.

## Summary

F009 establishes the trusted server-side command foundation that guarantees one authoritative effect under retries, response loss, and concurrency. It specializes the existing F003 closed request/result/event protocol and the F008 tenant boundary rather than defining a second wire format. A trusted gateway validates and canonicalizes each registered command, derives the actor from verified credentials, and invokes one restricted PostgreSQL transaction that rechecks current authority and revision, claims the operation identity, applies the domain effect, advances a transactional per-workspace progress position, and appends the operation claim, authoritative receipt, accepted event, and allowlisted audit entry atomically.

Identical retries return the original result after current authorization is rechecked; changed-intent reuse is rejected without disclosure. Connection loss remains `outcome_unknown` until reconciliation of the same operation proves a commit or establishes non-application through an atomic fence. Rich receipts may later be archived, but a minimal operation claim and permanent finance/source uniqueness survive archival. Audit reads, counts, search, and exports use narrow allowlisted contracts and distinct current grants. Service audit access is disabled until its separate policy is approved.

## Technical Context

**Language/Version**: TypeScript 7.0.2; Node.js `>=24 <25`; Supabase Edge Functions on the provider's Deno 2.1-compatible runtime; PostgreSQL 16 in the current local Supabase configuration

**Primary Dependencies**: Existing `packages/domain` and `packages/contracts` F003 primitives; `@supabase/supabase-js` 2.118.0; F008 authenticated command gateway and tenant authorization; Web Crypto SHA-256; no new runtime dependency planned

**Storage**: Managed PostgreSQL authoritative records in a non-exposed schema; existing F008 tenant/membership records; F007 encrypted SQLite remains local cache/outbox only and is not authoritative for F009 receipts

**Testing**: Node test runner for pure contract fixtures; local PostgreSQL/Supabase integration tests for transactions, RLS/grants, concurrency, failpoints, recovery, and migrations; existing lint/typecheck/docs/security and F003/F008 regression suites; manual bilingual/accessibility/usability evidence for any enabled F009 UI

**Target Platform**: Managed Supabase service boundary consumed by the Electron desktop application on Windows, macOS, and Linux; synthetic local/staging environments for verification

**Project Type**: Electron desktop application plus managed web-service authority and shared pure contract packages

**Performance Goals**: Ordinary accepted command p95 ≤ 1 second on the declared 50-ms RTT benchmark; bounded receipt reconciliation and first audit page p95 ≤ 1 second on the reference dataset; measure per-workspace progress-row contention rather than claiming unbounded throughput

**Constraints**: One effect under at-least-once delivery; no partial effect/evidence commit; current tenant/resource/action authorization at execution and disclosure; no raw payload or secret in receipt/audit/event projections; unsupported versions fail closed; authoritative progress must not advance for rolled-back work; unknown outcomes reconcile before retry; English/Arabic stable evidence presentation; retention and service-access production policies remain unapproved

**Scale/Scope**: Reference fixture of 50 members, 500 clients/projects, 10,000 tasks, 100,000 time entries, and 10,000 financial documents; per-workspace ordered command evidence; five F009 stories, 25 acceptance scenarios, 20 requirements, four external contract documents, and no business-domain command breadth beyond bounded test/representative registrations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

### Pre-Design Evaluation

| Principle                                          | Status                  | Plan evidence and gate                                                                                                                                                                    |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Authorized Scope and Traceable Decisions        | PASS                    | Work is documentation only; PLT-014, NFR-001, NFR-004, F003/F008 dependencies, F017/F018 boundaries, and open policy decisions remain explicit.                                           |
| II. Desktop Platform and Explicit Trust Boundaries | PASS                    | Renderer receives no SQL, secret, generic execute bridge, or service credential. F003 pure contracts remain independent; the service revalidates trusted inputs and authority.            |
| III. Durable Offline Work with Cloud Authority     | PASS                    | Local/queued state is not an authoritative receipt. At-least-once retries deduplicate, revoked authority is rechecked, and F017/F018 remain separate dependent features.                  |
| IV. Exact, Immutable Financial Evidence            | PASS                    | Lost replies reconcile the original operation; permanent operation/source uniqueness survives receipt archival; no financial policy or offline finalization is invented.                  |
| V. Fail-Closed Security and Least Privilege        | PASS                    | Non-exposed evidence tables, restricted transaction entry points, current scoped authorization, allowlisted summaries, zero-leakage queries, and default-off service access are required. |
| VI. English, Arabic and Accessible Interaction     | PASS WITH DELIVERY GATE | Contracts preserve stable evidence values across locales. Any enabled UI must pass bilingual/RTL/keyboard/screen-reader checks; SC-010/SC-011 cannot be claimed from backend tests.       |
| VII. Recoverable Data and Compatible Evolution     | PASS                    | Schema and projection versions are explicit; unsupported versions stop safely; restore/migration mismatches block authoritative writes until reconciled.                                  |
| VIII. Evidence Before Completion or Release        | PASS                    | Planned suites require actual PostgreSQL concurrency/failure/recovery evidence and separate manual UI/usability evidence; this plan claims no implementation completion.                  |

### Open Production Gates

- Exact receipt, audit, archive, backup, legal-hold, retry, and offline-support retention windows require product and operations/legal approval. Until then, evidence is not purged and no production retention claim is made.
- Service audit access remains disabled until an approved policy names approvers, operator identity, purpose, minimum scope, actions, duration, reauthentication, notification, redaction, and review.
- Q-02 region/budget, Q-05 broader capability matrix, Q-06 offline authorization duration, Q-13 retention, and Q-16 RPO/RTO remain unresolved outside this design.

No pre-design constitutional violation requires an exception.

## Phase 0 Research Outcomes

Phase 0 is complete in [research.md](research.md). It resolves the technical approach without converting open product/operations gates into implementation assumptions. Primary decisions:

1. Reuse F003 protocol v1 and add versioned F009 projections rather than copy F008's illustrative gateway schema.
2. Recompute `F003-intent-v1` canonical intent server-side and store a versioned SHA-256 digest plus minimal non-secret identity metadata; do not persist raw request payloads.
3. Run every authoritative command through one restricted PostgreSQL transaction/RPC; the Edge Function performs authentication, bounded decoding, canonicalization, and result mapping only.
4. Use a permanent minimal operation claim for deduplication and a separate archivable public receipt.
5. Use guarded revision updates and a transactionally locked per-workspace progress row; do not use a PostgreSQL sequence for semantic progress.
6. Treat `outcome_unknown` as a client/transport state and use an atomic reconciliation fence before declaring an operation not applied.
7. Replace generic blacklist redaction with operation-owned, allowlisted, bounded audit projections.
8. Keep service access disabled and retention durations unclaimed until their explicit gates are approved.

## Phase 1 Design

### Data and Transaction Design

[data-model.md](data-model.md) defines permanent command claims, archivable receipts, transactionally ordered accepted events, append-only structured audit evidence, separate audit grants, and a per-workspace recovery readiness gate. The owning transaction function validates the actual target and current grants, compares the canonical digest, locks operation/progress rows in deterministic order, conditionally updates the target revision, and commits every required record or none. Domain features later provide bounded handlers and an effect-to-receipt correlation; F009 does not permit caller-selected SQL, tables, or arbitrary operations.

### Interface Contracts

Four contracts specialize the F003 vocabulary:

- [authoritative-command-gateway.md](contracts/authoritative-command-gateway.md)
- [receipts-and-reconciliation.md](contracts/receipts-and-reconciliation.md)
- [accepted-events-and-progress.md](contracts/accepted-events-and-progress.md)
- [audit-evidence-and-access.md](contracts/audit-evidence-and-access.md)

Each contract declares versioning, closed fields, current-authorization behavior, safe status/error mapping, privacy exclusions, and compatibility fixtures. HTTP status never overrides authoritative outcome certainty.

### Validation Design

[quickstart.md](quickstart.md) defines runnable future validation lanes for canonical intent, atomicity/failpoints, lost responses, concurrency, authorization/non-disclosure, audit redaction/access, event ordering, retention, recovery/migration, and conditional UI localization/accessibility. SQLite doubles remain useful for pure tests but cannot satisfy PostgreSQL transaction, lock, RLS, sequence-rollback, or restore evidence.

## Post-Design Constitution Re-evaluation

| Gate                    | Status after design     | Evidence                                                                                                                                      |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope and traceability  | PASS                    | Artifacts remain planning-only and map F009 requirements/scenarios to contracts and verification.                                             |
| Trust boundary          | PASS                    | Service-only transaction entry point, closed operation registry, F003 IDs/envelopes, no generic renderer/server execution.                    |
| Offline/cloud authority | PASS                    | Local states stay distinct; replay/reconciliation use the same operation identity and current authority.                                      |
| Financial integrity     | PASS                    | Claims and domain uniqueness survive receipt archival; no sequence/source reuse or guessed not-applied outcome.                               |
| Security/privacy        | PASS                    | Private schema, explicit grants, restricted function execution, structured redaction, page-by-page authorization, default-off service access. |
| Bilingual/accessibility | PASS WITH DELIVERY GATE | Contract preserves values; UI and usability criteria require later observed evidence before enabling user-facing surfaces.                    |
| Evolution/recovery      | PASS                    | Additive schema, versioned projections, write readiness gate, no stale replay, and integrity reconciliation.                                  |
| Evidence                | PASS                    | Quickstart requires real transaction/concurrency/failure and manual evidence; no plan-only completion claim.                                  |

No post-design constitutional exception is requested. Production remains blocked by the retention and service-audit decisions listed above.

## Project Structure

### Documentation (this feature)

```text
specs/009-authoritative-command-receipts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── authoritative-command-gateway.md
│   ├── receipts-and-reconciliation.md
│   ├── accepted-events-and-progress.md
│   └── audit-evidence-and-access.md
└── tasks.md                              # Created later by $speckit-tasks
```

### Source Code (repository root; planned implementation locations)

```text
packages/contracts/src/
├── envelopes.ts                         # Refine F003 production registrations
├── intent.ts                            # Existing canonical F003 intent
├── authoritative-commands.ts            # F009 closed receipt/reconciliation contracts
└── audit-evidence.ts                    # F009 audit/event query projections

supabase/
├── migrations/                          # CLI-generated additive F009 migration
└── functions/
    ├── _shared/
    │   ├── authoritative-command.ts      # Trusted orchestration adapter
    │   ├── audit-projectors.ts           # Operation-owned allowlisted summaries
    │   └── evidence-authorization.ts     # Receipt/audit current-scope checks
    └── command-gateway/
        └── index.ts                      # F003 envelope admission and result mapping

tooling/f009/
├── seed-fixtures.mjs
├── verify.mjs
└── evidence.mjs

tests/f009/
├── unit/                                # Canonical intent and closed projection fixtures
├── integration/                         # PostgreSQL transaction/failpoint/recovery tests
├── authorization/                       # Tenant, grant, receipt/audit non-disclosure
├── events/                              # Commit ordering and unsupported-version stop
└── ui/                                  # Only enabled F009 user-visible states
```

**Structure Decision**: Extend the existing monorepo boundaries. Pure versioned contracts stay in `packages/contracts`; authoritative persistence and restricted transaction functions stay under `supabase`; the existing gateway remains the only service entry point for registered operations; deterministic verification belongs in dedicated `tooling/f009` and `tests/f009` lanes. No new application, microservice, generic IPC bridge, or runtime dependency is introduced.

## Rollout, Compatibility and Recovery

1. Generate an additive imperative migration through the Supabase CLI workflow; do not invent a migration filename manually.
2. Create the private evidence schema/tables and indexes first, with no client table grants and no production service-audit grants.
3. Add service-only transaction/query functions with execution revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to the server role. Functions use pinned/empty search paths and qualified relations.
4. Register protocol-v1 F009 projections and compatibility fixtures before switching any command handler.
5. Migrate one bounded representative/synthetic command through the new transaction path; retain existing F008 audit rows without rewriting history.
6. Keep authoritative writes blocked during migration/backfill verification. Validate claim/receipt/audit/event/progress correlations and only then mark the workspace ready.
7. Roll forward on failure; do not drop or rewrite accepted evidence. A rollback may disable the new gateway while preserving additive tables for reconciliation.
8. Enable broader domain commands only after their own specifications provide target revision, effect correlation, audit projection, and recovery verification.

## Complexity Tracking

No constitutional violations or exception-worthy complexity are introduced. Separate operation claims, receipts, audit entries, and accepted events are required because they have different privacy, retention, access, and compatibility lifecycles; merging them would either retain sensitive evidence too broadly or allow archival to weaken exactly-once guarantees.
