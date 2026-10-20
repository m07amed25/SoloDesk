# Tasks: F009 — Authoritative Command Receipts and Audit

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Generated**: 2026-10-20

**Authorization**: Planning and documentation only. These tasks do not authorize implementation, provisioning, deployment, PR mutation, merge, or release. The authorization boundary from `plan.md` and `AGENT.md` applies to every task.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project directory scaffolding, dependency verification, and build configuration for F009 development

- [x] T001 Create F009 source directory structure per plan.md: `packages/contracts/src/authoritative-commands.ts`, `packages/contracts/src/audit-evidence.ts`, `supabase/functions/_shared/authoritative-command.ts`, `supabase/functions/_shared/audit-projectors.ts`, `supabase/functions/_shared/evidence-authorization.ts`, `supabase/functions/command-gateway/index.ts`, `tooling/f009/seed-fixtures.mjs`, `tooling/f009/verify.mjs`, `tooling/f009/evidence.mjs`
- [x] T002 Create F009 test directory structure per plan.md: `tests/f009/unit/`, `tests/f009/integration/`, `tests/f009/authorization/`, `tests/f009/events/`, `tests/f009/ui/`
- [x] T003 [P] Verify existing F003 contract primitives in `packages/contracts/src/envelopes.ts` and `packages/contracts/src/intent.ts` export the required tagged UUIDv4, canonical intent, `F003-bounds-v1`, `F003-intent-v1`, closed request/result/event envelopes, and public error catalogue
- [ ] T004 [P] Verify existing F008 authenticated command gateway and tenant authorization are importable and their TypeScript types are compatible with F009 trusted context construction
- [x] T005 [P] Add `test:f009`, `test:f009:intent`, `test:f009:atomicity`, `test:f009:authorization`, `test:f009:audit`, `test:f009:events`, `test:f009:recovery`, and `test:f009:ui` npm script aliases in `package.json` per quickstart.md §3

**Checkpoint**: Directory structure exists, dependencies are verified, and test aliases are configured. Build/lint/typecheck pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions, canonical intent machinery, and database schema that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define closed F009 operation type registry and bounded operation name type (ASCII, 1–64 characters) in `packages/contracts/src/authoritative-commands.ts` per gateway contract §Command Request and data-model.md §3 `operation_type` constraint
- [x] T007 Define closed `CommandDisposition` enum: `committed`, `job_accepted`, `rejected`, `conflict`, `proven_not_applied` in `packages/contracts/src/authoritative-commands.ts` per data-model.md §3 `disposition` field
- [x] T008 Define closed `ResultStatus` enum: `authoritative_committed`, `job_accepted` in `packages/contracts/src/authoritative-commands.ts` per data-model.md §4 `result_status` field and receipts contract §Receipt Projection
- [x] T009 [P] Define `OperationClaim` type with all fields from data-model.md §3: `workspace_id` (canonical workspace UUID), `actor_id` (canonical actor UUID), `operation_type` (ASCII 1–64), `operation_id` (canonical operation UUID), `protocol_version` (small integer, initial `1`), `payload_version` (small integer), `intent_profile` (bounded text, initial `F003-intent-v1`), `digest_profile` (bounded text, initial `sha256-v1`), `intent_digest` (32 bytes), `required_device_id` (optional canonical device UUID), `expected_revision` (optional nonnegative bigint), `target_kind` (optional closed bounded text), `target_id` (optional canonical resource UUID), `disposition`, `safe_error_code` (optional closed F003 code), `result_locator` (optional canonical receipt ID), `created_at` (authoritative instant), `finalized_at` (authoritative instant), `retention_class` (policy key/version), `archived_at` (optional instant) in `packages/contracts/src/authoritative-commands.ts`
- [x] T010 [P] Define `AuthoritativeReceipt` type with all fields from data-model.md §4: `workspace_id`, `receipt_id` (receipt UUID), `actor_id`, `operation_type`, `operation_id`, `receipt_version` (small integer, initial `1`), `operation_payload_version` (small integer), `result_status`, `target_kind`/`target_id` (scoped target reference), `prior_revision` (optional bigint), `committed_revision` (optional bigint, required when revised target commits), `service_received_at` (authoritative instant), `committed_at` (authoritative instant), `accepting_request_id` (request UUID), `correlation_id` (bounded stable correlation UUID), `event_id` (event UUID), `progress_position` (bigint), `retention_class`, `archived_at` (optional instant) in `packages/contracts/src/authoritative-commands.ts`
- [x] T011 [P] Define `AcceptedEvent` type with all fields from data-model.md §6: `workspace_id`, `progress_position` (positive bigint, unique within workspace), `event_id` (event UUID), `event_version` (small integer, initial `1`), `event_kind` (registered text 1–64), `entity_kind`/`entity_id` (scoped target reference), `accepted_revision` (nonnegative bigint), `operation_type`/`operation_id`, `receipt_id`, `audit_entry_id` (audit UUID), `actor_id` (optional), `committed_at` (authoritative instant), `occurred_at` (optional bounded client evidence), `projection_kind`/`projection_version` (closed schema identity), `projection` (bounded structured data, no tokens/secrets/raw payload) in `packages/contracts/src/audit-evidence.ts`
- [x] T012 [P] Define `CommandAuditEntry` type with all fields from data-model.md §7: `workspace_id`, `audit_entry_id` (audit UUID), `audit_version` (small integer, initial `1`), `actor_kind` (closed enum: `member` or `service_operator`), `actor_id` (stable actor/operator UUID), `operation_type`/`payload_version`/`operation_id`, `target_kind`/`target_id`, `prior_revision`/`committed_revision` (optional bigint), `occurred_at` (optional bounded client evidence), `service_received_at`/`committed_at` (authoritative instants), `reason_code` (optional closed value), `safe_reason_note` (optional tightly bounded text, stored only when operation explicitly permits), `accepting_request_id`/`correlation_id`, `receipt_id`/`event_id`/`progress_position`, `summary_kind`/`summary_version` (closed projector schema), `summary` (bounded structured projection, no generic raw diff fallback), `retention_class` in `packages/contracts/src/audit-evidence.ts`
- [x] T013 [P] Define `AuditAccessGrant` type with all fields from data-model.md §8: `grant_id` (grant UUID), `workspace_id`, `subject_kind` (closed enum: `member` or `service_operator`), `subject_id` (actor/operator UUID), `action` (closed enum: `audit_read`, `audit_search`, `audit_export`), `resource_kind`/`resource_id` (optional scope), `purpose_code` (approved closed value, required for service operator), `granted_by` (authorized approver UUID, cannot be subject for service self-grant), `starts_at`/`expires_at` (authoritative instants, service grants require bounded future expiry), `revoked_at` (optional instant), `policy_version` in `packages/contracts/src/audit-evidence.ts`
- [x] T014 [P] Define `WorkspaceCommandProgress` type from data-model.md §5: `workspace_id` (workspace UUID, primary key), `last_position` (nonnegative bigint, starts at zero), `updated_at` (authoritative instant) in `packages/contracts/src/authoritative-commands.ts`
- [x] T015 [P] Define `AuthoritativeWriteState` type from data-model.md §10: `workspace_id` (workspace UUID, primary key), `state` (closed enum: `verification_required`, `ready`, `blocked`), `verified_schema_version` (bounded version, required for `ready`), `verified_progress_position` (bigint), `last_verified_at` (optional authoritative instant, required for `ready`), `verification_manifest_digest` (optional algorithm-tagged digest), `safe_block_reason` (optional closed reason code, no customer content or raw diagnostics) in `packages/contracts/src/authoritative-commands.ts`
- [ ] T016 Define F009 result status mapping and error mapping types per gateway contract §Result Contract and §Error Mapping: `authoritative_committed`, `job_accepted`, `conflict`, `rejected`, `outcome_unknown` statuses with required/forbidden evidence fields; error codes `VALIDATION`, `SCHEMA_UNSUPPORTED`, `UPGRADE_REQUIRED`, `AUTH_REQUIRED`, `SESSION_REVOKED`, `FORBIDDEN`, `RESOURCE_UNAVAILABLE`, `REVISION_CONFLICT`, `OUTCOME_UNKNOWN` in `packages/contracts/src/authoritative-commands.ts`
- [x] T017 Define reconciliation query/result types per receipts contract §Reconciliation Query: `command.reconcile` operation with `originalOperation` and `originalOperationId` payload; result outcomes `committed`, `job_accepted`, `rejected`, `conflict`, `proven_not_applied`, `still_unknown` in `packages/contracts/src/authoritative-commands.ts`
- [x] T018 Define audit query operation types per audit contract §Query Operations: `audit.get`, `audit.list`, `audit.count`, `audit.export` with allowed metadata filters (commit position/time range, exact actor, operation, target kind/reference, receipt, correlation reference), fixed chronological sort, bounded page size, opaque continuation tokens in `packages/contracts/src/audit-evidence.ts`
- [ ] T019 Generate additive F009 PostgreSQL migration using Supabase CLI (do not manually name the migration file) creating the `private` schema and all evidence tables per data-model.md: `command_operations` (§3 with primary unique key `(workspace_id, actor_id, operation_type, operation_id)`, immutable digest/profile/identity fields, accepted dispositions require receipt locator, rejected/conflict/proven-not-applied forbid one), `command_receipts` (§4 with unique `(workspace_id, receipt_id)`, unique `(workspace_id, actor_id, operation_type, operation_id)`, no UPDATE/DELETE privilege for ordinary roles), `workspace_command_progress` (§5 with `workspace_id` primary key, `last_position` nonnegative bigint starting at zero), `accepted_events` (§6 with primary key `(workspace_id, progress_position)`, unique `(workspace_id, event_id)`, unique `(workspace_id, receipt_id)`), `command_audit_entries` (§7 with unique `(workspace_id, audit_entry_id)`, unique `(workspace_id, receipt_id)`), `audit_access_grants` (§8), `audit_access_events` (§9 append-only), `authoritative_write_state` (§10 with `workspace_id` primary key) in `supabase/migrations/`
- [ ] T020 Add indexes per data-model.md: `command_operations` — `(workspace_id, target_kind, target_id, finalized_at desc)` and partial index on `(workspace_id, disposition)` for non-accepted; `command_receipts` — `(workspace_id, committed_at desc, receipt_id)`; `accepted_events` — `(workspace_id, entity_kind, entity_id, accepted_revision)`; `command_audit_entries` — `(workspace_id, committed_at desc, audit_entry_id)`, `(workspace_id, actor_id, committed_at desc)`, `(workspace_id, operation_type, committed_at desc)`, `(workspace_id, target_kind, target_id, committed_at desc)` in the same migration file
- [x] T021 Configure table privileges in migration: revoke all from `PUBLIC`, `anon`, and `authenticated` on all `private` schema evidence tables; enable RLS as defense in depth; add reject triggers on `command_receipts`, `command_audit_entries`, `accepted_events` for UPDATE/DELETE by ordinary roles per data-model.md §4/§7 constraints and §14 authorization
- [ ] T022 Create restricted PostgreSQL transaction function `private.execute_authoritative_command(...)` with execution revoked from `PUBLIC`/`anon`/`authenticated`, granted only to the server role, using pinned/empty search path and qualified relations per plan.md §Rollout step 3 and data-model.md §13 lock order: (1) check/lock `authoritative_write_state`, (2) resolve verified actor/membership/grant, (3) claim/lock operation scope, (4) resolve/lock target rows in stable ID order, (5) apply guarded revision changes, (6) lock/update `workspace_command_progress`, (7) insert receipt/event/audit, (8) finalize operation claim
- [ ] T023 Create restricted PostgreSQL query functions for receipt reconciliation (`private.reconcile_operation(...)`) and audit queries (`private.audit_get(...)`, `private.audit_list(...)`, `private.audit_count(...)`) with execution revoked from `PUBLIC`/`anon`/`authenticated`, granted only to server role, per audit contract and receipts contract query shapes

**Checkpoint**: Foundation ready — all contract types defined, database migration prepared, restricted functions created. User story implementation can begin.

---

## Phase 3: User Story 1 — Commit a Command Exactly Once (Priority: P1) 🎯 MVP

**Goal**: An authorized member submits a consequential command and receives an authoritative receipt; retries, delayed responses, and repeated clicks cannot create a second effect (A-01, A-02, A-03, A-04, A-23)

**Independent Test**: Submit one valid command, lose its response, retry with the same operation identity. Verify exactly one business effect, one receipt, one event, one audit record, and the original receipt returned.

### Implementation for User Story 1

- [x] T024 [US1] Implement canonical intent recomputation in `supabase/functions/_shared/authoritative-command.ts`: reuse F003 `request()`, `intent()`, `canonical()` to build canonical intent from verified context; hash UTF-8 canonical bytes with Web Crypto SHA-256; store `intent_profile = F003-intent-v1`, `digest_profile = sha256-v1`, and 32-byte digest per research.md §3; never accept client digest; never persist raw canonical payload
- [ ] T025 [US1] Implement operation claim lifecycle in the restricted transaction function `private.execute_authoritative_command(...)`: scope `(workspace_id, actor_id, operation_type, operation_id)` uniqueness; first admitted command establishes digest inside owning transaction; equal intent returns original terminal result after current authorization; changed intent rejects without disclosure per receipts contract §Replay Matrix and data-model.md §3 constraints
- [ ] T026 [US1] Implement atomic commit path in `private.execute_authoritative_command(...)`: domain effect, terminal claim (disposition `committed` or `job_accepted`), receipt (all data-model.md §4 fields), accepted event (§6 fields with transactionally allocated `last_position + 1`), and audit entry (§7 fields with operation-owned allowlisted summary) commit together; any required-part failure rolls back all parts per FR-007, A-04
- [ ] T027 [US1] Implement receipt immutability enforcement: identical replay with new request ID returns outer response correlated to new attempt but embeds the semantic original receipt unchanged (same receipt_id, target, revisions, timestamps, accepting correlation) per receipts contract §Receipt Projection; prevent receipt rewrite on replay
- [ ] T028 [US1] Implement changed-intent collision rejection in `private.execute_authoritative_command(...)`: when operation identity is already bound, any authority-relevant or payload field change (target, expected revision, payload value, omission vs null, reason/policy version, occurrence evidence, verified actor scope, required device binding) rejects as `VALIDATION` on `operationId` with certainty `not_applied`, no prior-result disclosure per gateway contract §Error Mapping and A-03
- [ ] T029 [US1] Implement audit projector framework in `supabase/functions/_shared/audit-projectors.ts`: each registered operation defines a bounded allowlisted projector that runs before commit; unknown/sensitive fields yield an approved minimal summary or abort the entire transaction; no generic raw diff fallback per data-model.md §7 constraints and audit contract §Projection and Redaction Rules
- [x] T030 [US1] Implement receipt archival boundary behavior: archival moves rich receipt to `archived_at` state while minimal claim and finance/source uniqueness remain active; same operation/intent after archival returns safe retained outcome or forces reconciliation, never treats identity as unused per FR-017, A-23, receipts contract §Retention and Archival
- [ ] T031 [US1] Implement Edge Function admission in `supabase/functions/command-gateway/index.ts`: decode raw bytes with duplicate-key/depth/size/Unicode/numeric/version/unknown-field bounds per gateway contract §Processing Contract step 1; validate closed F003 request and payload; build trusted actor/session/workspace context from verified credentials; authorize before receipt lookup or resource-existence disclosure; invoke restricted transaction function
- [ ] T032 [US1] Implement result mapping in `supabase/functions/command-gateway/index.ts`: map terminal transaction outcomes to outer F003 result statuses (`authoritative_committed`, `job_accepted`, `conflict`, `rejected`, `outcome_unknown`) per gateway contract §Result Contract with required/forbidden evidence fields; HTTP status is transport metadata and cannot change body certainty

**Checkpoint**: User Story 1 is functional — a command commits exactly once, replays return original receipt, changed intent is rejected, atomic failure leaves no partial state.

---

## Phase 4: User Story 2 — Reject Stale or Unauthorized Intent (Priority: P1)

**Goal**: Every authoritative command is evaluated against current membership, current grants, actual target workspace, and expected revision; stale devices or forged identifiers cannot exercise old authority (A-05–A-09)

**Independent Test**: Exercise a command using a revoked actor, cross-workspace target, missing grant, and stale revision. Verify every attempt is denied without effect or information leak.

### Implementation for User Story 2

- [ ] T033 [US2] Implement verified authority derivation in `supabase/functions/_shared/evidence-authorization.ts`: derive actor only from verified credentials and current workspace/resource/action grants; caller-supplied actor, role, or workspace claims must not grant authority per FR-002, A-05
- [ ] T034 [US2] Implement revocation-before-execution check in `private.execute_authoritative_command(...)`: re-evaluate current membership and grants at execution time inside the transaction; reject with no effect and no exposure of inaccessible records if revoked between admission and commit per A-06
- [x] T035 [US2] Implement cross-workspace target rejection: validate that every referenced target actually belongs to the claimed workspace; reject without confirming whether the foreign target exists per A-07; missing and inaccessible resources/operations use the same safe public shape per gateway contract §Authorization and Disclosure
- [ ] T036 [US2] Implement revision conflict handling in `private.execute_authoritative_command(...)`: guarded revision predicate ensures stale expected revision produces `conflict` with `REVISION_CONFLICT`, certainty `not_applied`, and only the current revision or authorized recovery reference per FR-006, A-08
- [ ] T037 [US2] Implement concurrent submission serialization: two authorized commands competing for the same expected revision produce at most one commit; every other attempt receives non-success outcome without partial effect per A-09; serialization/deadlock retry reuses same operation identity and intent per data-model.md §13

**Checkpoint**: User Story 2 is functional — all unauthorized, revoked, cross-workspace, stale-revision, and concurrent-revision attempts are rejected without effect or information leakage.

---

## Phase 5: User Story 3 — Resolve an Unknown Outcome Safely (Priority: P2)

**Goal**: A member whose connection failed can check the original operation and recover confidently without duplicating work or money movement (A-10–A-13)

**Independent Test**: Interrupt communication, reconcile using the same operation identity. Verify resolution to original receipt or proven not-applied; never a second effect.

### Implementation for User Story 3

- [ ] T038 [US3] Implement `outcome_unknown` client/transport state handling: `outcome_unknown` is a client/transport observation, not a server terminal status; result includes `OUTCOME_UNKNOWN` code, certainty `unknown`, recovery `reconcile_operation`, and original operation reference per FR-009, A-10; dispatch/commit uncertainty after possible dispatch is never an invented rejection per gateway contract §Result Contract
- [ ] T039 [US3] Implement `command.reconcile` operation in the command gateway: register closed F003 query operation with `originalOperation` and `originalOperationId` payload; actor from verified current credentials; apply current authorization before lookup per receipts contract §Reconciliation Query
- [ ] T040 [US3] Implement reconciliation outcomes in `private.reconcile_operation(...)`: return `committed` (original receipt), `job_accepted` (original receipt), `rejected` (original safe rejection after auth), `conflict` (original safe conflict after auth), `proven_not_applied` (fence proves non-application), `still_unknown` (cannot prove either way) per receipts contract §Reconciliation Query
- [ ] T041 [US3] Implement atomic non-application fence in `private.reconcile_operation(...)`: acquire same operation-scope uniqueness/lock as original transaction; establish terminal `proven_not_applied` claim with original digest; if original transaction is in-flight, fence waits until it commits or rolls back then returns that result; null lookup alone never proves non-application per receipts contract §Atomic Non-Application Fence and research.md §4
- [ ] T042 [US3] Implement unauthorized reconciliation rejection in `private.reconcile_operation(...)`: unauthorized, revoked, foreign-workspace, inaccessible, and missing lookups share safe unavailable response revealing no operation existence or outcome per FR-005, A-13

**Checkpoint**: User Story 3 is functional — outcome-unknown results direct to reconciliation; committed operations return original receipt; non-applied operations are proven only through atomic fence.

---

## Phase 6: User Story 4 — Review a Trustworthy Audit Trail (Priority: P2)

**Goal**: An authorized workspace auditor can review a chronological, redacted history of accepted commands with full traceability (A-14–A-18, A-24)

**Independent Test**: Execute accepted and denied commands with sensitive fields, then review as auditor, contributor, and cross-workspace user. Verify complete traceability for auditor and zero mutation or disclosure for others.

### Implementation for User Story 4

- [ ] T043 [US4] Implement `audit.get` query in `private.audit_get(...)`: require `audit_read` grant within current scope; return one closed permitted entry or safe unavailable result per audit contract §Query Operations
- [ ] T044 [US4] Implement `audit.list` query in `private.audit_list(...)`: require `audit_read` (plus `audit_search` for metadata filters); return bounded fixed-order page with opaque continuation token; allowed filters limited to commit position/time range, exact actor, operation, target kind/reference, receipt, correlation reference; sort is fixed chronological with stable ID tie-breaker per audit contract §Query Operations
- [ ] T045 [US4] Implement `audit.count` query in `private.audit_count(...)`: require same grant/scope as matching list; return authorized count only; hidden rows contribute nothing per audit contract §Query Operations
- [ ] T046 [US4] Implement per-page/chunk reauthorization: every page, count, search, export chunk, and download recheck current membership, action grant, workspace scope, and resource scope; permission loss during pagination stops later disclosure per audit contract and A-17
- [ ] T047 [US4] Implement append-only audit enforcement: Owner/Admin/ordinary role UPDATE/DELETE attempts on audit entries and receipts fail via privileges and reject triggers; corrections represented only by linked new commands and entries per FR-012, A-16
- [x] T048 [US4] Implement removed-actor attribution preservation: stable non-reassignable actor reference retained after account removal/pseudonymization; never falsely attributes action to another person per FR-011, A-18
- [ ] T049 [US4] Implement audit export operation (`audit.export`): separate `audit_export` grant required; consistent permitted snapshot request; acceptance is not delivery completion (job_accepted pattern); export reauthorizes every chunk per audit contract §Query Operations, A-17
- [ ] T050 [US4] Implement temporary service audit access scaffold in `supabase/functions/_shared/evidence-authorization.ts`: default disabled; schema represents future grant per data-model.md §8; named operator with approved/unexpired/minimum-scope grant can access only granted scope; access itself is audited in `audit_access_events` per data-model.md §9; absent/expired/broader access denied without Owner impersonation per A-24; production enablement blocked until policy gate approved
- [ ] T051 [US4] Implement audit-of-access evidence in `private` schema: successful service access and audit exports append access event with safe operator/grant/action/purpose/scope/correlation/timing metadata; does not copy viewed content; ordinary member page views need not create records per data-model.md §9

**Checkpoint**: User Story 4 is functional — authorized auditors can trace complete command history; redaction prevents secret/private leakage; append-only enforcement prevents evidence tampering.

---

## Phase 7: User Story 5 — Continue from an Ordered Accepted Event (Priority: P3)

**Goal**: An authorized synchronization consumer can continue from the authoritative progress position returned with accepted commands; later changes are read in commit order (A-19–A-22, A-25)

**Independent Test**: Accept several commands with reordered client times, inspect events and progress. Verify service commit order is stable, every event points to its original operation/receipt, and audit failure advances neither state nor progress.

### Implementation for User Story 5

- [ ] T052 [US5] Implement authoritative event ordering verification: multiple accepted commands with disagreeing client clocks receive unique authoritative commit positions independent of client wall-clock order per FR-015, A-19; progress position allocated from locked `workspace_command_progress` row per data-model.md §5
- [ ] T053 [US5] Implement receipt-event correlation verification: every accepted event's workspace, operation, target revision, receipt, and audit correlation agree with committed command per A-20; correlation invariants from events contract §Correlation Invariants enforced
- [ ] T054 [US5] Implement no-cursor-gap-on-rollback verification: command whose required evidence cannot be committed publishes no event, does not advance progress watermark per A-21; progress row locked inside same transaction and restored on rollback per data-model.md §5
- [ ] T055 [US5] Implement unsupported event consumer behavior: consumer encountering unsupported event kind, version, bounds profile, or unknown closed-projection field must (1) preserve unprocessed event, (2) stop before applying, (3) leave local progress unchanged, (4) surface `UPGRADE_REQUIRED` or `SCHEMA_UNSUPPORTED` per FR-016, A-22, events contract §Consumer Compatibility
- [ ] T056 [US5] Implement recovery integrity mismatch detection: restored/migrated environment with missing/inconsistent business effect, receipt, audit entry, event, or progress position keeps authoritative writes unavailable via `authoritative_write_state` (`verification_required` or `blocked`) until reconciled per FR-019, A-25, data-model.md §10

**Checkpoint**: User Story 5 is functional — events are ordered by service commit, correlation invariants hold, rollback leaves no gap, unsupported versions stop safely, recovery mismatches block writes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T057 [P] Implement seed fixture script `tooling/f009/seed-fixtures.mjs` per quickstart.md §2: two workspaces, authorized/revoked members, one revisioned synthetic target, audit grants, progress watermark, ready write-state; service access disabled by default; synthetic fixtures only
- [ ] T058 [P] Implement verification script `tooling/f009/verify.mjs`: validate claim/receipt/audit/event/progress 1:1 correlations, unique positions, supported digest/event versions, domain effect references, and archive manifest integrity per data-model.md §15
- [ ] T059 [P] Implement evidence collection script `tooling/f009/evidence.mjs` per quickstart.md §15: record scenario/FR/SC identifiers, git/build identity, OS/CPU/locale/DB/runtime versions, fixture seed, command, failpoint/barrier config, expected vs observed, invariant snapshots, redacted artifact path/checksum, pass/fail/defects/reviewer/date
- [ ] T060 [P] Implement English/Arabic localization for all user-visible F009 states (receipt, conflict, rejection, outcome-unknown, reconciliation, audit-review) with equivalent meaning, full RTL-safe presentation, keyboard access, semantic focus behavior per FR-020; stable IDs/revisions/timestamps/amounts preserved exactly across locale switching
- [ ] T061 [P] Implement mixed-direction identifier isolation in audit export for English/Arabic: localized labels and layout must not alter stable IDs, instants, revisions, or evidence meaning per audit contract §Query Operations and edge case
- [ ] T062 Run repository-wide regression checks per quickstart.md §14: `npm run lint`, `npm run typecheck`, `npm run check:docs`, `npm run test:f003`, `npm run test:f008`, `npm run check:security`
- [ ] T063 Run full F009 validation suite: `npm run test:f009` covering all 10 quickstart scenarios (intent, atomicity/first-commit, atomicity/failpoints, atomicity/lost-response, atomicity/reconcile-fence, atomicity/concurrent-replay, atomicity/revision-race, authorization, audit, events, recovery/archival, recovery/migration, recovery/restore)
- [ ] T064 Verify no synthetic secret/private markers appear in database projections, API/query responses, exports, logs, or generated evidence artifacts per quickstart.md §9 marker scan
- [x] T065 Record unrun UI test status (`test:f009:ui`) as explicit blocker for enabling user-visible F009 states if no UI is enabled per quickstart.md §3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 [US1] (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 [US2] (Phase 4)**: Depends on Foundational (Phase 2); may share transaction function with US1 but is independently testable
- **User Story 3 [US3] (Phase 5)**: Depends on Foundational (Phase 2); uses operation claim from US1 but reconciliation is independently testable
- **User Story 4 [US4] (Phase 6)**: Depends on Foundational (Phase 2); reads audit entries created by US1 but audit queries are independently testable
- **User Story 5 [US5] (Phase 7)**: Depends on Foundational (Phase 2); reads events created by US1 but ordering/consumer behavior is independently testable
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — core transaction, receipt, and audit path
- **US2 (P1)**: Can start after Phase 2 — authorization checks integrate into same transaction but verify independently
- **US3 (P2)**: Can start after Phase 2 — reconciliation reuses operation claim mechanics; independently testable with synthetic claims
- **US4 (P2)**: Can start after Phase 2 — audit queries operate on existing evidence rows; independently testable with seeded data
- **US5 (P3)**: Can start after Phase 2 — event ordering and consumer behavior are independently testable with seeded events

### Within Each User Story

- Contract types before service functions
- Database functions before Edge Function adapters
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005)
- All Foundational type definition tasks marked [P] can run in parallel (T009–T015)
- Once Foundational phase completes, US1 and US2 can start concurrently (both P1)
- US3 and US4 can start concurrently after Foundational (both P2)
- US5 (P3) can start after Foundational independent of other stories
- Polish tasks marked [P] can run in parallel (T057–T061)

---

## Parallel Example: User Story 1

```bash
# Foundational type definitions can run in parallel:
Task: "Define OperationClaim type in packages/contracts/src/authoritative-commands.ts"
Task: "Define AuthoritativeReceipt type in packages/contracts/src/authoritative-commands.ts"
Task: "Define AcceptedEvent type in packages/contracts/src/audit-evidence.ts"
Task: "Define CommandAuditEntry type in packages/contracts/src/audit-evidence.ts"
Task: "Define AuditAccessGrant type in packages/contracts/src/audit-evidence.ts"
Task: "Define WorkspaceCommandProgress type in packages/contracts/src/authoritative-commands.ts"
Task: "Define AuthoritativeWriteState type in packages/contracts/src/authoritative-commands.ts"
```

---

## Verification correction (20 October 2026)

Unchecked tasks may have partial synthetic scaffolding; their full production acceptance has not been met. See [observed QA](../../docs/qa/F009.md). Passing dictionary tests do not establish rendered UI acceptance.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Commit a Command Exactly Once
4. **STOP and VALIDATE**: Run `npm run test:f009:intent` and `npm run test:f009:atomicity`
5. A single command commits exactly once with atomic evidence — deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently (authorization matrix) → Deploy/Demo
4. Add User Story 3 → Test independently (reconciliation) → Deploy/Demo
5. Add User Story 4 → Test independently (audit queries) → Deploy/Demo
6. Add User Story 5 → Test independently (event ordering) → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (commit + receipt) and User Story 2 (authorization)
   - Developer B: User Story 3 (reconciliation) and User Story 5 (events)
   - Developer C: User Story 4 (audit trail)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [USn] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Authorization: these tasks describe documentation/planning scope; implementation requires explicit user authorization
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Production retention durations, service audit access, and region/budget/RPO/RTO remain unapproved policy gates
