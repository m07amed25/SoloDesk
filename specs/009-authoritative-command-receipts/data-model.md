# Data Model: F009 — Authoritative Command Receipts and Audit

**Date**: 2026-10-20
**Feature**: [F009 specification](spec.md)
**Status**: Phase 1 design; additive schema proposal, not an applied migration

## 1. Model Boundaries

F009 stores authoritative command evidence in a non-exposed PostgreSQL schema, shown here as `private`. The existing Supabase Data API schemas remain `public` and `storage`; no F009 table receives direct `anon` or `authenticated` privileges. Narrow transaction/query functions are the only service entry points and recheck verified actor, current membership, resource scope, action grant, revision, and workspace write-readiness.

All identifiers use the F003 tagged UUIDv4 value model at contract boundaries. Database columns store the canonical UUID value plus explicit semantic context; no prefixed F008 test string is cast directly into a tagged F003 object. Revisions and internal progress positions are nonnegative `bigint`, serialized as canonical decimal strings or opaque progress tokens.

## 2. Entity Relationships

```text
workspace_tenants
├── 1:1 workspace_command_progress
├── 1:1 authoritative_write_state
├── 1:N command_operations
│   └── 0:1 command_receipts
│       ├── 1:1 accepted_events
│       └── 1:1 command_audit_entries
├── 1:N audit_access_grants
└── 1:N audit_access_events

command_operations ── scoped to verified actor + operation kind + operation ID
accepted_events ───── ordered by workspace progress position
domain effect ─────── correlated by receipt/operation through an operation-owned target reference
```

A committed or job-accepted operation has exactly one receipt, one authoritative correlation event, and one accepted-command audit entry. A proven rejection/conflict/non-application has a permanent minimal operation claim but no receipt/event/accepted-command audit record. Security telemetry for malformed or denied attempts is separate from the workspace audit trail.

## 3. `command_operations` — Permanent Operation Claim

Purpose: binds one verified command intent to one durable disposition and prevents changed-intent or archived-receipt reuse.

| Field                | Type / bounds                     | Rule                                                                      |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `workspace_id`       | canonical workspace UUID          | Existing workspace; immutable                                             |
| `actor_id`           | canonical actor UUID              | Verified actor at admission; stable non-reassignable reference            |
| `operation_type`     | ASCII text, 1–64                  | Registered operation only                                                 |
| `operation_id`       | canonical operation UUID          | Stable across retries                                                     |
| `protocol_version`   | small integer                     | Initial value `1`                                                         |
| `payload_version`    | small integer                     | Registered supported version                                              |
| `intent_profile`     | bounded text                      | Initial `F003-intent-v1`                                                  |
| `digest_profile`     | bounded text                      | Initial `sha256-v1`                                                       |
| `intent_digest`      | 32 bytes                          | Recomputed by trusted boundary; never accepted from client                |
| `required_device_id` | canonical device UUID, optional   | Present only when operation semantics bind a device                       |
| `expected_revision`  | nonnegative bigint, optional      | Required/omitted according to operation registry                          |
| `target_kind`        | closed bounded text, optional     | Non-secret resolved target type                                           |
| `target_id`          | canonical resource UUID, optional | Stored only after scoped resolution                                       |
| `disposition`        | closed enum                       | `committed`, `job_accepted`, `rejected`, `conflict`, `proven_not_applied` |
| `safe_error_code`    | closed F003 code, optional        | Only for non-accepted terminal outcomes                                   |
| `result_locator`     | canonical receipt ID, optional    | Required only for accepted dispositions                                   |
| `created_at`         | authoritative instant             | First durable claim instant                                               |
| `finalized_at`       | authoritative instant             | Terminal disposition instant                                              |
| `retention_class`    | policy key/version                | Does not itself authorize purge                                           |
| `archived_at`        | instant, optional                 | Rich result archived; claim remains active                                |

**Primary/unique identity**: `(workspace_id, actor_id, operation_type, operation_id)`.

**Constraints**:

- Digest/profile and identity fields are immutable.
- Accepted dispositions require a receipt locator; rejected/conflict/proven-not-applied forbid one.
- Raw/canonical request payload, token, credential, unrestricted diagnostic map, and document content are not stored.
- A minimal claim is not deleted merely because a rich receipt is archived.
- Current authorization is checked before returning any existing disposition.

**Indexes**:

- Primary unique scope above for replay/reconciliation.
- `(workspace_id, target_kind, target_id, finalized_at desc)` for recovery/correlation checks.
- Partial index on `(workspace_id, disposition)` for non-accepted recovery review if measured query plans require it.

## 4. `command_receipts` — Public Authoritative Evidence

Purpose: immutable, safe projection of an accepted synchronous effect or accepted background job.

| Field                       | Type / bounds                   | Rule                                                       |
| --------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `workspace_id`              | workspace UUID                  | Composite reference to operation claim                     |
| `receipt_id`                | receipt UUID                    | Primary public identity                                    |
| `actor_id`                  | actor UUID                      | Same verified actor as operation claim                     |
| `operation_type`            | bounded text                    | Same claim scope                                           |
| `operation_id`              | operation UUID                  | Same claim scope                                           |
| `receipt_version`           | small integer                   | Initial value `1`                                          |
| `operation_payload_version` | small integer                   | Accepted payload schema version                            |
| `result_status`             | closed enum                     | `authoritative_committed` or `job_accepted`                |
| `target_kind` / `target_id` | scoped target reference         | Required for operation-defined effects                     |
| `prior_revision`            | bigint, optional                | Present when operation changes an existing revision        |
| `committed_revision`        | bigint, optional                | Required when a revised target commits                     |
| `service_received_at`       | authoritative instant           | First accepted attempt arrival                             |
| `committed_at`              | authoritative instant           | Database commit evidence instant                           |
| `accepting_request_id`      | request UUID                    | Original attempt correlation, not rewritten on replay      |
| `correlation_id`            | bounded stable correlation UUID | Safe diagnostic correlation only                           |
| `event_id`                  | event UUID                      | Unique accepted event reference                            |
| `progress_position`         | bigint                          | Composite reference to workspace event order               |
| `retention_class`           | policy key/version              | Separates lookup/archive policy from permanent claim       |
| `archived_at`               | instant, optional               | Projection moved to approved archive; locator remains safe |

**Constraints**:

- One receipt per operation claim and one claim per receipt.
- Receipt/event/audit correlation fields cannot change after insertion.
- No UPDATE/DELETE privilege for ordinary roles; reject triggers provide defense in depth.
- Receipt omits raw intent, canonical bytes, secret values, generic payload, and provider-completion claims.

**Indexes**:

- Unique `(workspace_id, receipt_id)`.
- Unique `(workspace_id, actor_id, operation_type, operation_id)`.
- `(workspace_id, committed_at desc, receipt_id)` for authorized recent lookup.

## 5. `workspace_command_progress` — Transactional Workspace Watermark

Purpose: assigns deterministic accepted-event continuation order without nontransactional sequences.

| Field           | Type                  | Rule                                                                        |
| --------------- | --------------------- | --------------------------------------------------------------------------- |
| `workspace_id`  | workspace UUID        | Primary key                                                                 |
| `last_position` | nonnegative bigint    | Starts at zero; locked/incremented only inside accepted command transaction |
| `updated_at`    | authoritative instant | Same transaction as event insertion                                         |

The transaction locks the workspace row, calculates `last_position + 1`, inserts the event at that position, and updates the watermark. Rollback restores the prior value. Public contracts encode an opaque progress token; clients cannot use the integer as time, revision, money, or a cross-workspace locator.

## 6. `accepted_events` — Authoritative Correlation Event

Purpose: exposes one ordered, closed, non-secret correlation event for every accepted command.

| Field                                    | Type / bounds                          | Rule                                                         |
| ---------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `workspace_id`                           | workspace UUID                         | Tenant/order boundary                                        |
| `progress_position`                      | positive bigint                        | Unique within workspace; allocated transactionally           |
| `event_id`                               | event UUID                             | Unique public identity                                       |
| `event_version`                          | small integer                          | Initial value `1`                                            |
| `event_kind`                             | registered text, 1–64                  | Operation-owned closed kind                                  |
| `entity_kind` / `entity_id`              | scoped target reference                | Must match actual target/workspace                           |
| `accepted_revision`                      | nonnegative bigint                     | Result revision                                              |
| `operation_type` / `operation_id`        | operation reference                    | Original accepted command                                    |
| `receipt_id`                             | receipt UUID                           | Exactly one receipt                                          |
| `audit_entry_id`                         | audit UUID                             | Exactly one accepted-command audit entry                     |
| `actor_id`                               | actor UUID, optional public projection | Included only when permitted                                 |
| `committed_at`                           | authoritative instant                  | Same accepted transaction                                    |
| `occurred_at`                            | bounded client evidence, optional      | Descriptive only; never ordering authority                   |
| `projection_kind` / `projection_version` | closed schema identity                 | Operation-owned minimal event projection                     |
| `projection`                             | bounded structured data                | No tokens, secrets, raw payload, or unrelated private fields |

**Constraints and indexes**:

- Primary key `(workspace_id, progress_position)`.
- Unique `(workspace_id, event_id)`, `(workspace_id, receipt_id)`, and operation correlation.
- Index `(workspace_id, entity_kind, entity_id, accepted_revision)` for repair/correlation.
- Unknown event kind/version is preserved and blocks consumer advancement; F018 owns pull/apply behavior.

## 7. `command_audit_entries` — Append-Only Redacted Audit Evidence

Purpose: explain an accepted command using an operation-specific allowlisted summary.

| Field                                                 | Type / bounds                          | Rule                                             |
| ----------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `workspace_id`                                        | workspace UUID                         | Tenant boundary                                  |
| `audit_entry_id`                                      | audit UUID                             | Stable identity                                  |
| `audit_version`                                       | small integer                          | Initial value `1`                                |
| `actor_kind`                                          | closed enum                            | `member` or approved `service_operator`          |
| `actor_id`                                            | stable actor/operator UUID             | Never reassigned after account removal           |
| `operation_type` / `payload_version` / `operation_id` | operation reference                    | Closed registered operation                      |
| `target_kind` / `target_id`                           | scoped target                          | Must match receipt/event                         |
| `prior_revision` / `committed_revision`               | bigint, optional                       | Operation-defined                                |
| `occurred_at`                                         | bounded client evidence, optional      | Descriptive only                                 |
| `service_received_at` / `committed_at`                | authoritative instants                 | Required                                         |
| `reason_code`                                         | closed operation-owned value, optional | Required for operations that demand a reason     |
| `safe_reason_note`                                    | tightly bounded text, optional         | Stored only when operation explicitly permits it |
| `accepting_request_id` / `correlation_id`             | safe correlations                      | No diagnostic payload                            |
| `receipt_id` / `event_id` / `progress_position`       | evidence references                    | Must agree transactionally                       |
| `summary_kind` / `summary_version`                    | closed projector schema                | Identifies the allowlist used                    |
| `summary`                                             | bounded structured projection          | No generic raw diff fallback                     |
| `retention_class`                                     | policy key/version                     | Exact duration unresolved                        |

**Constraints**:

- Exactly one accepted-command entry per accepted receipt.
- Update/delete denied by privileges and reject triggers.
- Summary is created before commit by the registered operation projector. Unknown/sensitive fields yield an approved minimal summary or abort the whole command.
- F008 `tenant_audit_events` remains historical; it is not silently rewritten or treated as this contract.

**Indexes**:

- Unique `(workspace_id, audit_entry_id)`, `(workspace_id, receipt_id)`, and accepted operation correlation.
- `(workspace_id, committed_at desc, audit_entry_id)` for fixed chronological pagination.
- `(workspace_id, actor_id, committed_at desc)`, `(workspace_id, operation_type, committed_at desc)`, and `(workspace_id, target_kind, target_id, committed_at desc)` for allowlisted filters.

## 8. `audit_access_grants` — Separate Audit Authority

Purpose: represents explicit workspace-member or future service-operator permission to read, search, count, or export audit evidence.

| Field                           | Type / bounds            | Rule                                               |
| ------------------------------- | ------------------------ | -------------------------------------------------- |
| `grant_id`                      | grant UUID               | Stable identity                                    |
| `workspace_id`                  | workspace UUID           | Minimum tenant scope                               |
| `subject_kind`                  | closed enum              | `member` or `service_operator`                     |
| `subject_id`                    | actor/operator UUID      | Named subject; no anonymous support role           |
| `action`                        | closed enum              | `audit_read`, `audit_search`, `audit_export`       |
| `resource_kind` / `resource_id` | optional scope           | Cannot broaden beyond workspace                    |
| `purpose_code`                  | approved closed value    | Required for service operator; bounded for members |
| `granted_by`                    | authorized approver UUID | Cannot be the subject for service self-grant       |
| `starts_at` / `expires_at`      | authoritative instants   | Service grants require a bounded future expiry     |
| `revoked_at`                    | instant, optional        | Revocation takes effect on next page/chunk         |
| `policy_version`                | bounded value            | Identifies approved access policy                  |

Default state is no service-operator grants and service access disabled at configuration level. Schema presence is not production approval.

## 9. `audit_access_events` — Audit of Audit Access

Purpose: append evidence for successful service-operator access and export actions without pretending a read is a business mutation.

Fields: workspace, access-event ID/version, operator, grant, action, purpose, requested resource scope, result scope/count class (not hidden data), service instant, correlation, and redacted summary. It is append-only and separately retained. Ordinary member page views need not create one record each; exported evidence and service access do.

## 10. `authoritative_write_state` — Recovery and Migration Gate

Purpose: prevents authoritative writes while evidence integrity is unknown.

| Field                          | Type                              | Rule                                        |
| ------------------------------ | --------------------------------- | ------------------------------------------- |
| `workspace_id`                 | workspace UUID                    | Primary key                                 |
| `state`                        | closed enum                       | `verification_required`, `ready`, `blocked` |
| `verified_schema_version`      | bounded version                   | Required for `ready`                        |
| `verified_progress_position`   | bigint                            | Highest reconciled accepted position        |
| `last_verified_at`             | authoritative instant, optional   | Required for `ready`                        |
| `verification_manifest_digest` | algorithm-tagged digest, optional | Redacted evidence manifest                  |
| `safe_block_reason`            | closed reason code, optional      | No customer content or raw diagnostics      |

Every authoritative transaction locks/checks this row before operation handling. Migration/restore sets `verification_required`; mismatches set `blocked`; only a completed integrity verifier can set `ready`.

## 11. Command Lifecycle

```text
unseen operation
  ├─ malformed / unverified ───────────────> rejected without durable claim
  └─ verified + canonicalized
       ├─ existing claim + equal digest ───> reauthorize → original safe disposition
       ├─ existing claim + changed digest ─> collision rejection, no disclosure/effect
       └─ new claim transaction
            ├─ current auth/domain/revision denial
            │    └─ terminal rejected/conflict claim
            ├─ reconciliation fence
            │    └─ terminal proven_not_applied claim
            └─ accepted
                 └─ domain effect + claim + receipt + event + audit + progress commit
```

Transport timeout does not change a server disposition. The client shows `outcome_unknown` and reconciles the original operation. Only the atomic fence can turn absence into `proven_not_applied`.

## 12. Receipt and Access Lifecycles

```text
Receipt: active_lookup → archive_pending → archived_locator
Claim:   permanent_active ────────────────────────────────>

Audit grant: scheduled → active → expired
                         └──────→ revoked

Write state: verification_required → ready
                 └───────────────→ blocked → verification_required
```

- Archival never returns the operation identity to an unused state.
- Legal hold or unresolved retention policy prevents purge.
- Expired/revoked grants cannot authorize a later page/export chunk.
- Corrections create new linked commands/evidence; historical rows are not updated.

## 13. Transaction and Lock Order

To reduce deadlocks, registered handlers use a documented consistent order:

1. Check and lock workspace `authoritative_write_state`.
2. Resolve verified actor/current membership and action grant.
3. Claim or lock the operation scope.
4. Resolve and lock the target/domain rows in operation-defined stable ID order.
5. Apply guarded revision/domain changes.
6. Lock/update `workspace_command_progress`.
7. Insert receipt, accepted event, and audit entry.
8. Finalize the operation claim and return the closed projection.

Serialization/deadlock retries occur only around the entire transaction, with the same operation identity and canonical intent. Retry count/backoff is bounded and never changes outcome certainty.

## 14. Authorization and Privileges

- Evidence tables receive no `anon` or `authenticated` grants and are not exposed through the Data API.
- RLS is enabled as defense in depth where supported, but the server role's bypass capability is never treated as authorization.
- Public transaction/query functions revoke execute from `PUBLIC`, `anon`, and `authenticated`; only the trusted server role may invoke them.
- Receipt reconciliation authorizes before lookup. Missing, cross-workspace, revoked, and inaccessible operations share a non-disclosing public result.
- Audit list/count/search/export reauthorize current membership, audit action, workspace/resource scope, and page/export chunk.
- No Owner/Admin/ordinary role can insert, update, or delete receipts, events, audit entries, progress, service grants, or write-readiness directly.

## 15. Migration, Archival, and Recovery Rules

- Create schema/tables/indexes/functions additively using the repository's imperative migration workflow; generate the migration filename through the Supabase CLI during authorized implementation.
- Preserve F008 audit history; future administrative commands may dual-read old history while new accepted commands use F009 evidence.
- Do not enable authoritative writes until each workspace has initialized progress/readiness rows and passed correlation checks.
- Archive manifests identify schema/projection/policy versions, record counts, range, checksums, and safe locator mapping.
- Restore verification checks 1:1 accepted claim/receipt/event/audit relationships, progress watermark, unique positions, supported digest/event versions, and domain effect references.
- Any missing/orphaned/duplicate/misaligned evidence keeps the workspace blocked; no automatic deletion or stale outbox replay is permitted.
- Exact retention durations remain unset. Until approved, preservation is safer than deletion and is not a legal-compliance claim.
