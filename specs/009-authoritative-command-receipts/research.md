# Technical Research: F009 — Authoritative Command Receipts and Audit

**Date**: 2026-10-20
**Feature**: [F009 specification](spec.md)
**Status**: Complete — Phase 0 decisions for planning; not implementation evidence

## 1. Protocol and Compatibility Baseline

**Decision**: Specialize the existing F003 protocol-v1 vocabulary: closed request/result/event envelopes, `F003-bounds-v1`, `F003-intent-v1`, tagged UUIDv4 identities, canonical textual revisions, opaque progress tokens, and the existing public error catalogue. F009 adds version-1 receipt, reconciliation, audit, and accepted-event projections without creating a parallel command protocol.

**Rationale**: `packages/contracts` already distinguishes per-attempt request identity from stable operation identity and already models `authoritative_committed`, `job_accepted`, `conflict`, `rejected`, and `outcome_unknown`. Reusing it preserves runtime validation and prevents F008's illustrative `{command,payload}` gateway shape from becoming a second incompatible authority contract.

**Alternatives considered**:

- Copy F008 headers, prefixed strings, and response body into a new F009 endpoint — rejected because it duplicates F003 semantics and currently lacks required operation, revision, version, and certainty fields.
- Bump the whole protocol — rejected because F003 already has the required extension points; each new closed F009 projection receives its own explicit schema version.

## 2. Trusted Transaction Boundary

**Decision**: Keep the Edge Function responsible for authentication, bounded decoding, canonicalization, trusted-context construction, and result mapping. Execute every accepted authoritative command through one restricted PostgreSQL transaction/RPC that rechecks current membership/resource/action authority, handles replay, applies the domain effect, advances workspace progress, and writes the terminal claim, receipt, accepted event, and audit entry atomically.

**Rationale**: Only one database transaction can satisfy FR-007 and prove that failure of receipt/audit/event persistence rolls back the effect. The current JavaScript dispatcher plus separate inserts can split the effect from its evidence. Data-intensive transactional functions are an explicit Supabase database-function use case; privileged functions must have a fixed search path, explicit caller checks, and revoked default execution privileges.

**Alternatives considered**:

- Orchestrate domain write, receipt, audit, and event through separate service calls — rejected because process/network failure creates partial state.
- Permit a generic dynamic table/SQL dispatcher — rejected because it bypasses operation-owned validation and creates an unsafe public execution surface.
- Add another always-on application server — rejected until measured provider/runtime limits justify the added service and cost.

## 3. Canonical Intent and Digest

**Decision**: Reuse F003 `request()`, `intent()`, and `canonical()` to build canonical intent after verified actor/workspace/device context is available. Hash the UTF-8 canonical bytes at the trusted boundary with SHA-256 and persist `intent_profile = F003-intent-v1` plus `digest_profile = sha256-v1`, the 32-byte digest, and minimal non-secret identity metadata. Do not trust a client digest and do not persist the raw request or canonical payload.

The intent includes operation/payload versions, operation identity, verified workspace and actor, required device, expected revision, supported semantic occurrence evidence, and validated payload. It excludes per-attempt request/correlation identity and session/authority observation values so legitimate retries can use fresh attempt metadata.

**Rationale**: Canonical sorting makes semantically identical closed JSON stable across key ordering while exact value codecs protect money, time, and revision representations. Server recomputation prevents a caller from choosing the digest. Avoiding raw payload persistence minimizes duplicated customer content and secret-retention risk. Versioned profiles support future digest migration by retaining the algorithm used for each claim and requiring upgrade/recovery if it becomes unsupported.

**Alternatives considered**:

- Hash `JSON.stringify` or raw transport bytes — rejected because ordering, duplicate fields, encoding, and equivalent JSON forms produce unstable intent identity.
- Store only caller-supplied idempotency keys — rejected because changed intent could reuse a key undetected.
- Persist full canonical payload indefinitely — rejected because it duplicates private content beyond receipt/audit needs; F009 retains only the digest and closed non-secret metadata.

## 4. Operation Claim, Replay, and Reconciliation Fence

**Decision**: Scope an operation by `(workspace, verified actor, operation type, operation ID)` and enforce one permanent minimal claim for that scope. A first admitted command establishes its digest inside the owning transaction. Concurrent duplicates wait on the same uniqueness/lock boundary. Equal intent returns the original safe terminal result after current authorization; changed intent is rejected without disclosing prior details.

`outcome_unknown` is a client/transport observation, not a server terminal status. Reconciliation uses the original operation identity. To prove non-application, the service performs an atomic fence: it claims the absent scope with a terminal `proven_not_applied` disposition under the same lock/uniqueness boundary. If an original transaction is in flight, the fence waits and observes either its committed result or rollback before deciding. A null lookup alone never proves non-application.

**Rationale**: This design prevents a delayed original request from committing after the client has been told it is safe to use a new operation ID. It also handles simultaneous retries without a process-local mutex.

**Alternatives considered**:

- Map timeout or HTTP 5xx to `not_applied` — rejected because the transaction may already have committed.
- Permit immediate retry with a new identity after timeout — rejected because it can duplicate the effect.
- Use an in-memory idempotency map — rejected because it does not survive restart, scale across service instances, or participate in the business transaction.

## 5. Revision Concurrency and Authoritative Progress

**Decision**: Store revisions and internal progress positions as nonnegative `bigint`, serialized through contracts as canonical decimal text or opaque tokens. Apply existing-record mutations through a guarded revision predicate or locked row, then increment exactly once. Lock one `workspace_command_progress` row inside the transaction, assign `last_position + 1`, insert the accepted event, and update the watermark before commit.

**Rationale**: Two commands against one expected revision produce at most one winner. A per-workspace progress row provides deterministic continuation order appropriate for small teams and rolls back with the rest of the transaction. PostgreSQL sequences are explicitly nontransactional and advance even when a transaction aborts, so they cannot satisfy A-21's progress semantics. The public token remains opaque so storage can evolve.

**Alternatives considered**:

- Order by client occurrence time or device clock — rejected because clocks can skew, collide, or be malicious.
- Use `serial`/identity/sequence as semantic progress — rejected because sequence increments are not rolled back.
- Use one global progress lock — rejected because it creates unnecessary cross-workspace contention and information coupling.

## 6. Evidence Separation and Audit Projection

**Decision**: Separate permanent operation claims, public receipts, accepted events, and audit entries. Every registered operation owns a closed, bounded, allowlisted audit projector. Unknown fields are omitted through an approved minimal projection or fail the transaction; the system never copies the raw payload or generic JSON diff as a fallback.

F008's existing `tenant_audit_events` history remains immutable. F009 introduces command-specific evidence rather than overloading F008's limited administrative action enum and blacklist-style `change_diff`. New administrative commands should later use F009 while historical F008 rows remain unchanged.

**Rationale**: These records have different consumers and retention/privacy lifecycles. Allowlisting prevents sensitive values from being written and only then hidden at presentation time. Receipt/event/audit correlation still gives an authorized reviewer a complete trace.

**Alternatives considered**:

- Store one large generic evidence record — rejected because archival or redaction policy for one concern would weaken another.
- Log the full request and redact on display — rejected because the leak already exists in storage, logs, backups, and support tools.
- Claim an externally tamper-evident hash chain — rejected as outside the approved threat model and F009 scope.

## 7. Supabase Exposure, Functions, and Authorization

**Decision**: Put F009 evidence tables in a non-exposed schema. Grant no direct access to `anon` or `authenticated`; use RLS/privileges as defense in depth. Expose only narrow service functions with execution revoked from `PUBLIC`, `anon`, and `authenticated` and granted to the server role. Prefer invoker behavior; if a definer function becomes necessary, it must live outside exposed schemas where possible, use an empty/pinned search path, qualify every relation, validate `auth.uid()`/trusted context internally, and receive an explicit security review.

The service role stays only in the trusted Edge Function environment. Because it can bypass RLS, every transaction/query function rechecks verified actor, current membership, target scope, and action grants inside the owning transaction. Receipt and audit reads authorize before lookup/disclosure and again for every page, count, search, or export chunk.

**Rationale**: Current Supabase guidance requires both privileges and RLS, warns that public functions are executable by default, and notes that security-definer functions can bypass RLS. A 2026 breaking change also stops automatic Data API exposure for new public tables; the design must use explicit grants and not depend on implicit exposure behavior.

**Alternatives considered**:

- Direct client access to receipt/audit tables — rejected because operation existence and audit counts are sensitive.
- `TO authenticated` without a scope predicate — rejected as authentication without authorization.
- Owner/Admin role alone implies audit/export/service access — rejected because F009 requires separate current grants and support is not a workspace Owner.

## 8. Audit Query and Export Shape

**Decision**: Provide allowlisted `audit.get`, `audit.list`, `audit.count`, and `audit.export` operations over stable metadata only. Filters are limited to commit position/time range, actor, operation, exact target, receipt, and exact correlation references; sort is fixed and pages are bounded with opaque continuation tokens. Export requires a separate grant and a consistent permitted snapshot. No arbitrary predicate, raw SQL, or unrestricted full-text surface is exposed.

**Rationale**: Fixed contracts remain indexable, testable, and non-leaking. Page tokens are continuation locators, never bearer authority. English and Arabic labels may differ, but stable IDs, revisions, timestamps, and evidence meaning remain unchanged.

**Alternatives considered**:

- Generic search over raw summaries — rejected because it can expose private content and makes authorization/count behavior difficult to prove.
- Preauthorize once at export start — rejected because permission loss during long pagination/export must stop later disclosure.

## 9. Retention and Archival

**Decision**: Version retention by evidence class. Direct receipt lookup lasts at least through the approved retry and supported offline window; the minimal operation claim and finance/source uniqueness survive rich receipt archival. Audit/archive and backups follow separately approved legal-hold and deletion policies. Until those values are approved, no purge job or production duration is enabled or claimed.

Archive only after a manifest/checksum/reconciliation step. Keep a safe online locator/disposition so an archived operation cannot appear unused. Backup expiry is independent of online receipt retention.

**Rationale**: This meets the safe minimum without inventing jurisdiction or operations policy. Separating a rich receipt from its permanent claim lets the product minimize directly queryable data without reopening duplicate effects.

**Alternatives considered**:

- Hardcode a conventional number of days — rejected because Q-06/Q-13 and the F009 entry gate assign this decision to product/operations/legal review.
- Delete the operation claim with the receipt — rejected because it frees the identity and can permit duplicate financial/source effects.

## 10. Service Audit Access

**Decision**: Keep service/operator audit access disabled by default. The schema and contract may represent a future grant, but no production grant is created until policy approval. A valid grant names the operator, workspace/resource scope, allowed action, purpose, approver, start/expiry, and reauthentication evidence; every successful service access appends its own access audit record and never impersonates Owner.

**Rationale**: It supports later F140 diagnostics without granting silent platform access today. Absent, expired, wrong-purpose, or overly broad grants disclose no rows or counts.

**Alternatives considered**:

- Give platform operators permanent global read — rejected as a least-privilege and support-abuse violation.
- Reuse workspace Owner role — rejected because platform support is not a workspace member/Owner.

## 11. Recovery, Migration, and Write Readiness

**Decision**: Maintain a per-workspace authoritative-write readiness state: `verification_required`, `ready`, or `blocked`. New/migrated/restored workspaces cannot accept authoritative commands until checks reconcile operation claims, receipts, events, audit entries, progress watermark, supported versions, archive manifests, and domain-owned effect references. Any mismatch remains blocked with a redacted recovery reason.

Use additive migrations and roll forward. Existing F008 audit history is preserved. A restored environment never replays stale outbox commands or regresses progress; later external effects are reconciled separately.

**Rationale**: A restored business row without its receipt/audit/event can duplicate effects or make history unauditable. Explicit readiness avoids false empty/healthy states.

**Alternatives considered**:

- Resume writes immediately after the database starts — rejected because storage availability is not evidence consistency.
- Repair by deleting unmatched evidence — rejected because it destroys the very authority chain recovery must preserve.

## 12. Verification Architecture

**Decision**: Use layered deterministic verification: pure canonical-intent/projection fixtures, actual PostgreSQL transaction/concurrency/failpoint integration tests, API/auth negative-scope tests, event-consumer compatibility tests, recovery/migration readiness tests, and UI localization/accessibility tests only for user-visible states that are enabled. Keep SQLite doubles for fast pure tests, not as authoritative evidence for locks, RLS, transaction rollback, or restore behavior.

**Rationale**: F009's core risks are transactional and concurrent. End-to-end-only tests hide failure location, while in-memory tests cannot prove durable uniqueness. Evidence records exact build/schema/policy/protocol versions, environment, fixture, command, injected failure, invariant snapshots, redacted artifact hash, and reviewer/date.

**Alternatives considered**:

- Treat code inspection or screenshots as proof — rejected because they do not exercise concurrency, rollback, authorization, or recovery.
- Use live customer data — rejected; isolated synthetic local/staging fixtures are sufficient and safer.

## Current Compatibility Notes (20 October 2026)

- Supabase's changelog reports that Deno 2.1-compatible Edge Functions are deployed across regions; the exact runtime used by a delivery must still be recorded.
- Supabase's 2026 Data API exposure change means new tables must not rely on automatic public-schema grants. F009 deliberately uses a non-exposed schema and explicit privileges.
- Supabase guidance requires revoking default function execution and tightly constraining any security-definer function.
- PostgreSQL documents that sequence changes are visible immediately and are not rolled back, confirming that a sequence is unsuitable for F009's semantic progress watermark.
- PostgreSQL serialization failures require whole-transaction retry; any automatic retry must reuse the same operation identity and canonical intent.

Primary references: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change), [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), and [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## Remaining Product and Operations Gates

No unresolved technical questions remain. These policy decisions remain explicit blockers for production enablement rather than missing planning data:

- receipt/audit/archive/backup/legal-hold durations and supported retry/offline windows;
- service audit access policy;
- broader role/capability matrix (Q-05);
- production region, cost, capacity, and RPO/RTO (Q-02/Q-16).
