# Quickstart Validation Guide: F009 — Authoritative Command Receipts and Audit

**Date**: 2026-10-20
**Feature**: [F009 specification](spec.md)
**Design**: [plan.md](plan.md) | [data model](data-model.md) | [contracts](contracts/)
**Status**: Phase 1 validation design; commands/fixtures are future implementation deliverables and have not been run by this planning task

## 1. Objective

Prove that authoritative commands have one effect under retries/concurrency, produce atomic correlated receipt/event/audit evidence, enforce current tenant/resource/action authorization, reconcile unknown outcomes safely, preserve uniqueness after archival, and block writes when recovery evidence is inconsistent.

SQLite doubles may verify pure codecs and projections, but PostgreSQL/Supabase is required for transaction, unique-lock, RLS/privilege, concurrency, rollback-progress, migration, and restore evidence.

## 2. Prerequisites

- Node.js `>=24 <25` and npm 11 from `package.json`.
- Docker or Podman for isolated local Supabase/PostgreSQL.
- A repository-pinned Supabase CLI version established during authorized implementation. Discover its exact commands with `supabase --help`; do not use an unpinned `latest` download.
- Synthetic fixtures only. Do not use customer data, production credentials, service secrets, or real financial records.
- F003/F008 prerequisites and migrations passing in the same build.

Future implementation setup:

```bash
npm ci --ignore-scripts --no-audit --no-fund
supabase --version
supabase --help
supabase start
supabase db reset --local
node tooling/f009/seed-fixtures.mjs
```

The seed establishes two workspaces, authorized/revoked members, one revisioned synthetic target, audit grants, a progress watermark, and a ready write-state. Service access remains disabled by default.

## 3. Planned Test Commands

```bash
npm run test:f009:intent
npm run test:f009:atomicity
npm run test:f009:authorization
npm run test:f009:audit
npm run test:f009:events
npm run test:f009:recovery
npm run test:f009:ui
npm run test:f009
```

The implementation phase must add these aliases before this guide can be executed. `test:f009:ui` runs only when F009 enables a user-visible state; otherwise its unrun status remains an explicit blocker for enabling that UI, not a synthetic pass.

## 4. Scenario 1 — Canonical Intent and Changed-Intent Reuse

**Covers**: A-03, FR-003, SC-002

```bash
npm run test:f009:intent
```

Expected:

- Independent golden fixtures produce identical canonical intent/digest for reordered object keys and equivalent JSON encoding.
- Request/correlation identity changes do not alter intent.
- Changing target, expected revision, payload value, omission versus null, required reason/policy version, supported occurrence evidence, verified actor scope, or required device binding changes the digest and rejects operation-ID reuse.
- Arabic combining text, mixed-direction identifiers, arrays, exact decimals, and canonical revisions retain exact semantic values.
- Raw/canonical payload and synthetic secret markers are absent from persisted claims, receipts, audit, events, and logs.

## 5. Scenario 2 — Atomic First Commit and Failure Boundaries

**Covers**: A-01, A-04, A-21, FR-007, SC-004

```bash
npm run test:f009:atomicity -- --scenario first-commit
npm run test:f009:atomicity -- --scenario failpoints
```

Expected first commit:

- Synthetic target moves from revision `0` to `1` exactly once.
- Exactly one terminal accepted claim, receipt, accepted event, and command audit entry exist.
- Workspace progress moves from `0` to `1`.
- Workspace, operation, target revision, receipt, event, audit, correlation, and commit instant agree.

Expected failpoints:

- Inject failure after each planned stage: domain effect, claim, receipt, progress allocation, event, and audit.
- Every run leaves target revision `0`, progress `0`, and zero accepted claim/receipt/event/audit rows.
- No response claims authoritative success.

## 6. Scenario 3 — Lost Response and Reconciliation

**Covers**: A-02, A-10–A-12, FR-004, FR-009–FR-010, SC-001, SC-005

```bash
npm run test:f009:atomicity -- --scenario lost-response
npm run test:f009:atomicity -- --scenario reconcile-fence
```

Expected:

- Transport is dropped after database commit but before response delivery.
- Client state is `outcome_unknown`, never synthesized `not_applied`.
- Reconciliation of the same operation returns the original receipt.
- An identical replay with a new request ID returns the same semantic receipt; evidence/effect counts remain one.
- A pre-dispatch/non-application case becomes `proven_not_applied` only after the atomic fence binds the original digest.
- A deliberately new attempt is permitted only after proof and uses a new operation identity.
- Missing lookup while an original transaction is in flight remains unknown or waits for that transaction; it never falsely proves absence.

## 7. Scenario 4 — Concurrent Replay and Revision Race

**Covers**: A-09 and concurrent-retry edge case

```bash
npm run test:f009:atomicity -- --scenario concurrent-replay --callers 32
npm run test:f009:atomicity -- --scenario revision-race --callers 2
```

Expected:

- Thirty-two callers on separate connections/devices submit the same actor/scope/operation/intent through a barrier.
- Every accepted/reconciled caller converges on one receipt; target/claim/receipt/event/audit counts are each one.
- Two distinct operations compete on one expected revision; at most one commits. The loser receives conflict/non-success and has no accepted partial evidence.
- Serialization/deadlock retry, if exercised, reuses the same operation identity and intent.

## 8. Scenario 5 — Current Authority and Zero Leakage

**Covers**: A-05–A-08, A-13, A-17, SC-003, SC-006

```bash
npm run test:f009:authorization
```

Matrix:

- forged caller actor/workspace claims;
- revoked membership between admission and commit;
- missing action or audit grant;
- foreign-workspace target/operation identity;
- stale expected revision;
- target deleted, archived, or moved out of scope;
- permission revoked between audit pages/export chunks.

Expected:

- No unauthorized effect or accepted evidence commits.
- Missing and inaccessible resources/operations use the same safe public shape.
- Receipt reconciliation, audit rows, counts, search matches, page tokens, exports, and timing reveal no hidden existence/detail.
- Permission loss stops later pagination/export disclosure.

## 9. Scenario 6 — Audit Integrity, Redaction, and Access

**Covers**: A-14–A-18, A-24, FR-011–FR-014, FR-018, SC-006–SC-008

```bash
npm run test:f009:audit
```

Expected:

- An accepted command containing distinctive synthetic markers for bearer/session material, credentials, raw private content, diagnostics, and environment data stores only its allowlisted summary.
- Marker scan across database projection, query response, export, logs, and generated evidence finds zero excluded values.
- Authorized reviewer can trace actor, workspace, operation, target, revisions, service instants, correlation, receipt, event, and progress.
- Owner/Admin/ordinary role UPDATE/DELETE attempts fail; original evidence remains unchanged.
- Removed/pseudonymized actor reference remains stable and non-reassignable.
- Default service access denies all. A synthetic named/minimum-scope/unexpired grant reveals only approved metadata and creates one access event; expired/wrong-purpose/broader grants reveal nothing.

Production service access remains disabled even if the mechanism test passes.

## 10. Scenario 7 — Accepted Event and Progress Contract

**Covers**: A-19–A-22, FR-015–FR-016

```bash
npm run test:f009:events
```

Expected:

- Commands with future, old, and reordered client occurrence times receive unique positions in authoritative workspace commit order.
- Every event correlates to the same workspace, operation, receipt, audit entry, target, accepted revision, and commit instant.
- Evidence rollback publishes no event/token and leaves progress unchanged.
- An unsupported event kind/version/closed field is preserved; the consumer stops before applying it or advancing progress and surfaces upgrade/recovery guidance.
- Tests cover F009 event production and a minimal consumer only; full incremental pull remains F018.

## 11. Scenario 8 — Receipt Archival Boundary

**Covers**: A-23, FR-017

```bash
npm run test:f009:recovery -- --scenario archival
```

Expected:

- A parameterized synthetic policy archives the rich receipt while retaining the minimal claim and protected uniqueness.
- Same operation/intent returns a safe retained/reconciliation outcome and cannot repeat the effect.
- Changed intent remains rejected.
- Direct lookup window is verified to be no shorter than the configured retry/offline compatibility window.
- Test values do not become a production retention promise; the real duration remains blocked pending approval.

## 12. Scenario 9 — Migration and Recovery Integrity

**Covers**: A-25, FR-019, SC-009

```bash
npm run test:f009:recovery -- --scenario migration
npm run test:f009:recovery -- --scenario restore
```

Expected:

- Valid migration/restore preserves claim/digest versions, receipt/event/audit references, positions, and target revisions before writes resume.
- Independently remove/corrupt effect reference, claim, receipt, audit, event, correlation, progress, archive manifest, or supported version in isolated fixtures.
- Every mismatch leaves authoritative write state `blocked` with a redacted reason.
- An old snapshot cannot replay stale outbox work, regress progress, or duplicate later accepted operations.
- No test mutates a live/shared environment.

## 13. Scenario 10 — English, Arabic, Accessibility, and Usability

**Covers**: FR-020, SC-010, SC-011

```bash
npm run test:f009:ui
```

If a user-visible receipt, rejection, conflict, outcome-unknown, reconciliation, or audit-review surface is enabled, verify:

- equivalent English/Arabic meaning and recovery actions;
- full RTL/logical layout and mixed-bidi isolation;
- unchanged IDs, revisions, timestamps, operation kinds, and amounts across locale switching;
- keyboard-only completion, visible focus, semantic focus movement/status announcements, screen-reader names, and zoom/reflow;
- fluent Arabic review;
- at least 90% of representative participants distinguish committed/rejected/conflict/job-accepted/outcome-unknown on first attempt and choose reconciliation after an unknown outcome.

Automated localization/a11y checks do not replace fluent/manual review. If F009 enables no UI, record these criteria as unrun blockers for later UI enablement rather than passing them by inspection.

## 14. Regression and Documentation Checks

```bash
npm run lint
npm run typecheck
npm run check:docs
npm run test:f003
npm run test:f008
npm run check:security
```

Run repository-wide verification when the eventual implementation scope and F001 policy require it. Green baseline checks do not substitute for the F009 PostgreSQL/concurrency/recovery scenarios.

## 15. Evidence Record

For every executed scenario record:

- F009 scenario, FR, and SC identifiers;
- git/build identity and application/API/schema/policy/intent/event versions;
- OS, CPU, locale, database/runtime versions, and isolated environment;
- synthetic fixture seed and exact command;
- failpoint/barrier/timing configuration;
- expected versus observed outcome and invariant/count snapshot;
- redacted artifact path and checksum;
- pass/fail, defects, reviewer, and date.

Maintain observed results in future `docs/qa/F009.md`/machine-readable evidence, separating local synthetic, hosted staging, native/UI, manual, and unrun gates. A command name, URL, screenshot, or code inspection alone is not evidence of transaction, authorization, recovery, Arabic, or release readiness.
