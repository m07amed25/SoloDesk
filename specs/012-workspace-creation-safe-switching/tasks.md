---
description: "Task list for F012 Workspace Creation and Safe Switching"
---

# Tasks: F012 — Workspace Creation and Safe Switching

**Input**: Design documents from `/specs/012-workspace-creation-safe-switching/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/), completed F010 verified-account/enrollment behavior, F005 shell accessibility, F006/F007 protected persistence, F008 tenant isolation, F009 intent/evidence behavior, and the Q-01/Q-02/Q-03/Q-06/Q-07/Q-08 gates named below

**Authorization**: This file is a documentation artifact. It does not authorize F012 implementation, provider provisioning, production policy selection, hosted deployment, customer-data activation, merge, or release.

**Tests**: Test tasks are included because every user story defines an independent test and F012 requires transaction, retry, tenant-isolation, crash/restart, revocation, English/Arabic, accessibility, and native evidence.

**Organization**: Tasks are grouped by user story. Each story has an independently runnable synthetic slice after the shared foundation; the recommended sequence avoids concurrent edits to the same coordinator, bridge, shell, and localization files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on another incomplete task in the phase
- **[Story]**: Maps to the five user stories in `spec.md`
- Every checklist item includes an exact file path

## Path Conventions

- Desktop main/preload/renderer: `app/main/`, `app/preload/`, `app/renderer/`, `app/shared/`
- Shared localization: `packages/localization/`
- Service migration/RPC surface: `supabase/migrations/`
- Verification: `tooling/f012/`, `tests/f012/`, `tests/verification/desktop/`, `verification/`
- Evidence and operating notes: `docs/features/F012.md`, `docs/qa/F012.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish explicit entry gates and a fixed fail-on-empty verification surface without adding a dependency or selecting an unresolved production policy.

- [x] T001 Record the F012 implementation entry decision in `docs/features/F012.md`: verify F010 hosted/UI/native evidence, F005/F006/F007/F008/F009 prerequisites, approved synthetic-versus-production creation policy, Q-01/Q-02/Q-03/Q-06/Q-07/Q-08 disposition, protected-store native proof, and current authorization; mark dependent implementation blocked instead of inventing any missing value
- [x] T002 [P] Add fixed scripts `test:f012`, `test:f012:contracts`, `test:f012:service`, `test:f012:switching`, `test:f012:security`, and `test:f012:ui` to `package.json`, each selecting a fixed suite through `node tooling/f012/verify.mjs`
- [x] T003 [P] Create the fail-on-empty suite runner in `tooling/f012/verify.mjs`, following the existing F010/F011 runner pattern and rejecting unknown suite IDs, missing files, or zero selected tests
- [x] T004 [P] Register F012 suites, FR-001–FR-026, A-01–A-22, required test files, and required evidence artifacts in `verification/suites.v1.json` so absent coverage cannot report success

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the closed contracts, durable records, schema, protected opening modes, fixtures, and redaction boundary used by every story.

**⚠️ CRITICAL**: No user-story implementation starts until T001 passes and the contract, migration, persistence-mode, and redaction checks in this phase pass.

- [x] T005 Define versioned closed F012 commands, results, events, `WorkspaceState`, `WorkspaceSummary`, reason/action codes, exact-key validators, bounds, canonical lowercase UUIDv4 rules, and immutable `WorkspaceContextEnvelope` `{ profileReference, profileGeneration, workspaceId, selectionGeneration }` in `app/shared/workspace-contracts.ts`; preserve F010's rejection of renderer-supplied account, session, role, membership, profile path, token, key, SQL, or filesystem authority
- [x] T006 Define the workspace/profile schema changes in `supabase/migrations/20261021000012_f012_workspace_creation.sql` with the `data-model.md` constraints verbatim: `id` is "Immutable bare lowercase UUIDv4 text for every new production workspace. Existing legacy synthetic IDs remain readable compatibility data. Never derived from a name or clock."; `display_name` is "Required editable Unicode display identity; trim leading/trailing whitespace for admission without changing internal text; 1–120 Unicode scalars, bounded UTF-8, no controls. Not unique and never authority."; `legal_name` is "Optional truthful legal/seller name; absence is not replaced with the display name. Existing values are preserved."; `trade_name` is "Optional bounded business/trade name."; `default_timezone` is "Required IANA timezone accepted by the active creation policy and server catalogue."; `default_currency` is "Required uppercase three-letter currency identity accepted by the active policy. It does not select exponent, rounding, tax, numbering, or legal support."; `default_locale` is "`en` or `ar`; a workspace default, not the user's personal UI-locale authority."; `profile_version` is "Positive version of the workspace-profile representation, initially `1`."; `creation_policy_version` is "Exact server policy version that admitted the starting configuration."; `readiness_state` is "`setup_incomplete` or `ready`. F012-created workspaces start `setup_incomplete` unless an explicitly approved later policy proves all required profile gates."; `status` is "Existing `active | suspended | closing | archived`. Creation produces `active`; a status never grants membership."; and `created_at`, `updated_at` are "Authoritative service instants."
- [x] T007 Extend membership compatibility in `supabase/migrations/20261021000012_f012_workspace_creation.sql` with the field constraints verbatim: `workspace_id` is an "Immutable reference to Workspace."; `user_id` is a "Supabase verified account UUID text derived by the service, never accepted as creation authority from the caller."; `role` is an "Existing closed role; F012 creates only `owner`."; `status` is an "Existing membership lifecycle; F012 creates only `active` and consumes current active rows."; `granted_by` is the "Creator's verified account reference for the initial row."; `created_at`, `updated_at` are "Authoritative service instants and authority-change evidence."; enforce one active Owner row for the creator and add/verify the `user_id,status`-leading chooser index without changing existing workspace IDs or relationships
- [x] T008 Add the versioned creation-policy relation/configuration in `supabase/migrations/20261021000012_f012_workspace_creation.sql` with the field constraints verbatim: `version` is a "Stable opaque policy version included in the request digest."; `enabled` means "When false/absent, creation returns `workspace_creation_unavailable`."; `locales` is "Exactly the approved set; F012 requires English and Arabic support."; `currency_codes` is "Explicit approved codes for this deployment. No implicit global market support."; `timezone_catalogue` is a "Declared IANA catalogue/version or server lookup rule."; `required_profile_fields` is a "Closed subset of `display_name | legal_name | trade_name`; never arbitrary field names."; `bounds_profile` is the "Exact F012 field/encoded-size profile."; keep the labeled `XTS`/`UTC` policy test-only and make absent production policy fail closed
- [x] T009 Add the private account-scoped creation-intent/result relation in `supabase/migrations/20261021000012_f012_workspace_creation.sql` with the field constraints verbatim: `issuer_id`, `subject_id` are the "Verified F010 account binding."; `intent_id` is a "Client-generated UUIDv4; unique with account and operation kind."; `operation_type` is "Constant `workspace.create`."; `request_digest` is a "SHA-256 canonical digest of semantic fields excluding retry/correlation transport values."; `payload_version`, `creation_policy_version` are "Closed compatibility versions."; `device_enrollment_id` is an "Enrolled device proof matched to the verified account."; `status` is "`submitted | committed | proven_not_created | rejected | outcome_unknown`. Server rows normally settle inside one transaction; `outcome_unknown` is primarily the client's observation until reconciliation."; `workspace_id` is the "Resulting stable Workspace ID only when committed."; `receipt_id` is a "Stable UUIDv4 safe result/evidence reference only when committed."; `safe_error_code` is a "Closed non-secret rejection/recovery code."; `created_at`, `finalized_at` are "Authoritative service instants."; enforce the unique `(issuer_id, subject_id, operation_type, intent_id)` claim, exact-digest retry, changed-digest rejection, and no token/key/customer/queued/raw-error fields
- [x] T010 Harden tenant evidence, RLS, functions, indexes, and grants in `supabase/migrations/20261021000012_f012_workspace_creation.sql`: enforce immutable workspace IDs; backfill `display_name = coalesce(nullif(trade_name,''), legal_name)` before requiring it; permit truthful null `legal_name`; retain append-only `workspace_created` evidence with only workspace ID, verified actor, target kind/ID, correlation/receipt, authoritative time, policy/profile versions, and redacted admitted-default identifiers; set exposed functions to `search_path=''`, fully qualify relations, revoke `PUBLIC`/`anon`, grant only the minimum `authenticated` RPC execution, and deny direct workspace/membership/intent mutation
- [x] T011 Add `ActiveWorkspaceSelection` and sealed-record validation to `app/main/identity/protected-identity-store.ts` with the field constraints verbatim: `format_version` is "Local record format, initially `1`; unknown versions lock with upgrade/recovery guidance."; `profile_reference`, `profile_generation` are the "Exact F010 protected profile binding."; `issuer_id`, `subject_id` are the "Exact verified account binding."; `selection_generation` is a "Positive monotonic safe integer. Every transition advances it before source teardown."; `state` is exactly `none | current | switching | locked`; `current_workspace_id` is "Present only for `current`, or retained as source during a bounded `switching` recovery record."; `target_workspace_id` is "Present only during `switching`; never considered current before commit."; `attempt_id`, `correlation_id` are "UUIDv4 references for a transition; no payload."; `pending_work_decision` is "`not_required | saved_to_source | discarded`; never contains edit content."; `safe_reason_code` is a "Closed recovery reason for `locked`/failed transition."; `updated_at` is a "Local observation instant, not authority or conflict order."; persist atomically and ignore mismatched account/profile records without disclosure
- [x] T012 Split local persistence in `app/main/persistence/persistence-service.ts`: retain `openWorkspaceStore()` compatibility, add `initializeAuthorizedWorkspace(workspaceId, receiptId)` that may create only for the exact newly committed workspace, add `openRetainedWorkspace(workspaceId)` that returns unavailable/recovery for `uninitialized` without creating files, and keep `closeWorkspaceStore(workspaceId)` draining/checkpointing, zeroing the key, locking protection, and preserving bytes/outbox; enforce the partition constraints verbatim: account/profile/workspace binding is "Manifest, key envelope, physical path, and every entity/outbox row must match the trusted context."; availability is "`uninitialized | opening | ready | recovery_required | closed`; F012 adds intent-specific distinction between authorized initialization and retained-only open."; durable work is "Saved-local, queued, conflicted, staged, rejected, and outcome-unknown items retain original workspace ID across switches."; open behavior is "`initializeAuthorizedWorkspace` may create only after an authoritative create result for that exact workspace. `openRetainedWorkspace` must reject `uninitialized` and every unreadable/mismatched state without creating/replacing data."
- [x] T013 [P] Define main-only `WorkspaceCreationPolicy`, account-scoped command result, current-session/enrolled-device admission, safe service-error mapping, and bounded Supabase RPC adapter in `app/main/workspaces/workspace-service.ts`; derive actor/session/membership authority from F010 transport and expose no raw provider/database error or hidden tenant detail
- [x] T014 Create the single per-profile `WorkspaceCoordinator` state owner in `app/main/workspaces/coordinator.ts`: serialize create/switch/restart attempts, own the current workspace and monotonic generation, depend on the existing identity owner/persistence service, expose only renderer-safe state, and reject stale profile/selection generations without introducing a second session owner or event bus
- [x] T015 [P] Create synthetic policy/account/device/workspace/membership/selection/partition/pending-work fixtures in `tests/f012/fixtures/workspace-fixtures.mjs` for accounts A/B, duplicate English/Arabic names, all closed states, exact/max/max+1 bounds, valid/stale generations, missing/locked/corrupt/future-schema partitions, every durable-work status, and distinctive prohibited-data canaries
- [x] T016 [P] Add contract tests in `tests/f012/unit/workspace-contracts.test.mjs` for exact keys/enums/versions, UUIDv4 versus legacy fixture compatibility, Unicode-scalar/UTF-8/control bounds, canonical digest semantics, plain-data copies, reason/action closure, generation envelopes, unknown-field rejection, and absence of tokens, subjects, paths, keys, payloads, customer content, hidden tenant metadata, and mutable ambient workspace authority
- [x] T017 Add real PostgreSQL/Supabase schema and privilege tests in `tests/f012/service/workspace-schema.test.mjs` for backfill compatibility, nullable truthful legal name, constraints, immutable IDs, intent uniqueness/digest equality, indexes/query plans, RLS recursion safety, helper hardening, RPC grants, private-relation denial, direct self-grant denial, and append-only redacted evidence
- [x] T018 Extend `tooling/verification/security.mjs` with F012 canary scanning across source/built renderer and preload, bridge DTOs/events, logs, local selection/manifest/database/evidence, service results, analytics/crash/support/export fixtures, screenshots/videos, notifications, and CI artifacts; fail on credentials, protection material, raw errors, hidden tenants, customer content, queued/staged payloads, or paths

**Checkpoint**: Contracts, schema, selection record, explicit initialize/open modes, fixtures, and redaction fail closed; story work can begin.

---

## Phase 3: User Story 1 — Create a Workspace with Truthful Defaults (Priority: P1) 🎯 MVP Demo

**Goal**: Let one verified, enrolled account create exactly one isolated workspace and active Owner membership with truthful, editable starting defaults and explicit incomplete readiness.

**Independent Test**: From an enrolled account with no membership, create a workspace with valid English, Arabic, and mixed-direction profile values; verify one immutable workspace, one active Owner membership, one redacted evidence effect, stable retry/reconciliation IDs, and no false success or empty tenant after invalid, interrupted, or outcome-unknown attempts.

### Tests for User Story 1 — write first and confirm failure

- [x] T019 [P] [US1] Add creation request/digest tests in `tests/f012/unit/workspace-creation.test.mjs` for exact semantic coverage, policy/profile/device versions, UUIDv4 intents, display-name trim without internal normalization, Arabic/Latin/emoji/combining text, max/max+1/control input, removed options, stale policy, changed-intent reuse, and locale/display changes that cannot alter stable IDs
- [x] T020 [P] [US1] Add authoritative transaction tests in `tests/f012/service/workspace-creation-atomicity.test.mjs` for current non-anonymous session/enrolled device, simultaneous identical submissions, one UUID/Owner/intent/audit result, changed digest/account/device rejection, and rollback after intent claim, workspace insert, membership insert, audit insert, and result finalization
- [x] T021 [P] [US1] Add retry/reconciliation tests in `tests/f012/service/workspace-creation-reconciliation.test.mjs` for lost response, restart, concurrent original request, committed, proven-not-created, safe rejection, still-unknown, foreign-account lookup, and prohibition on display-name matching or automatic replacement intents
- [x] T022 [P] [US1] Add creation-to-local activation tests in `tests/f012/integration/workspace-creation-activation.test.mjs` for exact receipt initialization, one local namespace, protection/storage failure after cloud commit, restart/reconcile before retry, preserved unexpected bytes, and a locked recoverable state that never reports the committed cloud workspace as uncreated
- [x] T023 [P] [US1] Add creation form/UI tests in `tests/f012/ui/workspace-creation.test.mjs` for approved options only, field-level safe errors, preservation of valid non-secret input, disabled/absent policy, unknown outcome, incomplete readiness wording, keyboard/focus/status behavior, and no compliance/team/issuance-readiness claim

### Implementation for User Story 1

- [x] T024 [US1] Implement `GetWorkspaceBootstrap`, `CreateWorkspace`, and `ReconcileWorkspaceCreation` RPCs in `supabase/migrations/20261021000012_f012_workspace_creation.sql`: derive current account/session/device, validate the active policy and closed fields, recompute the digest, claim account+operation+intent, atomically insert one active `setup_incomplete` workspace, one active Owner membership, one redacted audit event, and one stable result, then return identical committed retries or closed safe failures
- [x] T025 [US1] Implement bootstrap/create/reconcile calls in `app/main/workspaces/workspace-service.ts`, retaining the original intent across `outcome_unknown`, returning only bounded `WorkspaceSummary`/membership/receipt fields, and mapping invalid, stale-policy, auth, device, unavailable, changed-intent, unknown, service, and upgrade outcomes to one safe action
- [x] T026 [US1] Implement creation and post-commit activation in `app/main/workspaces/coordinator.ts`: reconcile before any retry, advance generation into a neutral non-interactive state, call `initializeAuthorizedWorkspace` only with the exact committed workspace/receipt, persist `current` on success, and persist locked/recovery while retaining the authoritative cloud result on local failure
- [x] T027 [US1] Expose only `workspace.getState`, `workspace.refresh`, `workspace.create`, `workspace.reconcileCreation`, and bounded state subscription through `app/main/bridge.ts`, `app/preload/preload.ts`, and `app/renderer/env.d.ts`, reusing existing sender/frame/origin/document/profile-epoch admission and accepting no actor/session/device-owner/readiness/path/token/key override
- [x] T028 [US1] Implement `WorkspaceCreateDialog` in `app/renderer/components/workspaces/WorkspaceCreateDialog.tsx` and mount it through `app/renderer/shell/App.tsx`; use existing `Dialog`, `Button`, and `BdiText`, preserve safe input, show `setup_incomplete` honestly, reconcile unknown results before enabling a new attempt, and add the necessary typed English/Arabic keys to `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts`

**Checkpoint**: US1 independently creates and activates one synthetic workspace with truthful defaults and one-effect reconciliation. It is an MVP demo, not the complete F012 isolation slice.

---

## Phase 4: User Story 2 — Switch Workspaces Without Losing or Redirecting Work (Priority: P1)

**Goal**: Switch deliberately between current memberships while unsaved memory is resolved and every durable item, action, event, and protected byte remains attached to its source workspace.

**Independent Test**: With A current and B selectable, exercise stay, discard, and eligible save-to-A for one unsaved edit while A also has saved-local, queued, conflicted, staged, rejected, and outcome-unknown work; verify B receives none of A's content/signals and no A-generation action can affect B.

### Tests for User Story 2 — write first and confirm failure

- [x] T029 [P] [US2] Add chooser/current-authority tests in `tests/f012/service/selectable-workspaces.test.mjs` for only active current memberships, fresh target recheck, member/non-member/revoked/suspended/closed/guessed equivalence, safe summary allowlist, duplicate-name discriminators, no hidden names/counts/status/data, and `user_id,status` index usage
- [x] T030 [P] [US2] Add pending-edit tests in `tests/f012/unit/pending-work.test.mjs` for bounded editor registration captured to the source envelope, stay/focus, selected discard, eligible save-to-source before main switch, failed/stale save, registry cleanup on generation unmount, and no rebinding/copying to the target
- [x] T031 [P] [US2] Add atomic-switch failpoint tests in `tests/f012/integration/workspace-switching.test.mjs` at generation advance, source event detach, source close/checkpoint, target authority check, retained open, selection-record write, adapter attach, and target publish; every interruption must reopen freshly authorized/readable A or lock, never expose mixed A/B state
- [x] T032 [P] [US2] Add generation-fencing tests in `tests/f012/integration/generation-fencing.test.mjs` for delayed dialogs, saves, service/persistence results, events, timers, notification actions, links, two-window target races, superseded completions, same-workspace later generations, and zero stale effect or silent reactivation
- [x] T033 [P] [US2] Add durable-work isolation tests in `tests/f012/integration/workspace-isolation.test.mjs` for saved-local, queued, conflicted, staged, rejected, and outcome-unknown rows; assert original workspace IDs survive close/switch/restart/retry and no A record, field, count, badge, notice, search result, recent item, payload, staged item, or live update appears under B

### Implementation for User Story 2

- [x] T034 [US2] Implement `ListSelectableWorkspaces` and `CheckWorkspaceSelectability` RPCs in `supabase/migrations/20261021000012_f012_workspace_creation.sql` and calls in `app/main/workspaces/workspace-service.ts`; derive the current session/account, join only current active memberships/selectable tenants, return bounded summaries with deterministic opaque-ID discriminators, and use one non-enumerating `workspace_unavailable` result for missing/foreign/revoked/closed targets
- [x] T035 [US2] Implement the switch protocol in `app/main/workspaces/coordinator.ts`: validate caller/generation/target, serialize attempts, advance and persist generation before quiescence, publish neutral state, invalidate source commands/events, close A, recheck B online, use `openRetainedWorkspace`, persist/publish B only after every check, and otherwise reauthorize/reopen A or enter the locked chooser
- [x] T036 [US2] Implement `WorkspaceProvider` and its bounded in-memory before-leave registry in `app/renderer/contexts/WorkspaceContext.tsx`; each registration captures an editor key, source `WorkspaceContextEnvelope`, save eligibility, and save/discard/focus callbacks with no authority, while save completion is verified against the captured source before calling main
- [x] T037 [US2] Expose `workspace.switch({targetWorkspaceId, expectedSelectionGeneration})` through `app/main/bridge.ts`, `app/preload/preload.ts`, `app/renderer/env.d.ts`, and `app/renderer/lib/bridge.ts`; main derives source/account/profile and rejects stale context, unknown keys, noncanonical IDs, and renderer-supplied authority
- [x] T038 [US2] Implement `WorkspaceSwitcher` and `PendingWorkspaceSwitchDialog` in `app/renderer/components/workspaces/WorkspaceSwitcher.tsx` and `app/renderer/components/workspaces/PendingWorkspaceSwitchDialog.tsx`, showing explicit source/target/discriminator, stay/discard/eligible-save choices, neutral switching/locked states, and no non-current tenant content
- [x] T039 [US2] Mount `WorkspaceProvider` in `app/renderer/shell/App.tsx`, key the workspace-bound subtree by `selectionGeneration`, dispose source caches before target render, connect only the current generation's adapters, and add the US2 state/action/error keys with English/Arabic parity in `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts`

**Checkpoint**: US2 independently proves one atomic switch, preserved source work, and zero cross-workspace or stale-generation effect.

---

## Phase 5: User Story 3 — Restart or Work Offline Without Tenant Crossover (Priority: P2)

**Goal**: Restore at most one matching retained workspace after restart and fail closed for offline, revoked, uncached, unreadable, incompatible, wrong-account, or wrong-profile states.

**Independent Test**: Seed distinct A/B partitions and selection records, restart online and offline, and exercise absent, expired, revoked, missing-key, corrupt, future-schema, wrong-binding, and crash-during-switch cases; exactly one permitted matching context or the locked chooser appears, never a borrowed or fabricated empty tenant.

### Tests for User Story 3 — write first and confirm failure

- [x] T040 [P] [US3] Add retained-partition mode tests in `tests/f012/integration/retained-partition.test.mjs` for explicit post-create initialization, retained-only open, authorized-but-never-retained target, missing envelope/key/manifest/database, locked secret store, corruption, future schema, wrong account/profile/workspace binding, unchanged unexpected bytes, and no empty replacement or borrowed key/data
- [x] T041 [P] [US3] Add restart/crash recovery tests in `tests/f012/integration/workspace-restart.test.mjs` for `none | current | switching | locked`, account/profile/format/generation mismatch, crashes at every switch boundary, online source/target rechecks, source-versus-target convergence, and exactly one current context or locked chooser
- [x] T042 [P] [US3] Add offline/revocation tests in `tests/f012/integration/workspace-revocation.test.mjs` for no approved F016 lease, expired/absent/uncertain authority, reconnect, current membership removal, stopped reads/events/submissions, rejected queued replay, preserved A-owned recoverable work, and no cached-role resurrection

### Implementation for User Story 3

- [x] T043 [US3] Implement selection-record restore and crash convergence in `app/main/workspaces/coordinator.ts`: load only after F010 profile/session/protection restore, ignore mismatched bindings without disclosure, recheck online authority, use retained-only open, inspect only safe source/target references from `switching`, and converge to one proven current workspace or locked chooser
- [x] T044 [US3] Implement fail-closed offline and current-authority refresh behavior in `app/main/workspaces/coordinator.ts` and `app/main/workspaces/workspace-service.ts`: return `online_required` until F016 supplies an approved matching lease, advance generation on reported membership removal, stop new reads/events/submissions, close the active context, and preserve local work without exposing, deleting, uploading, moving, or relabeling it
- [x] T045 [US3] Compose one `WorkspaceCoordinator` beneath the current `IdentityCoordinator` owner in `app/main/identity/coordinator.ts` and `app/main/main.ts`; initialize it only for the matching enrolled profile/account, restore after identity protection, and dispose/advance authority before sign-out/account/profile teardown so remembered selection never grants later access
- [x] T046 [US3] Map missing, locked, unreadable, incompatible, uninitialized, wrong-binding, online-required, revoked, and recovery-required outcomes to closed renderer state in `app/main/persistence/recovery-state.ts` and English/Arabic next actions in `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts`, without revealing paths, keys, hidden tenant existence, or unsupported recovery/export actions
- [x] T047 [US3] Add locked/online-required/retry/unlock/choose-another presentation to `app/renderer/components/workspaces/WorkspaceSwitcher.tsx`, preserving current safe summaries only where authorized and never initializing, replacing, or falling back to another workspace from UI state

**Checkpoint**: US3 independently proves restart/offline/revocation convergence with no empty replacement, authority broadening, or tenant crossover.

---

## Phase 6: User Story 4 — Confirm the Current Workspace Before Consequential Actions (Priority: P2)

**Goal**: Keep current and target workspace identity unambiguous for switching, links, notifications, searches, recent items, and representative consequential confirmations.

**Independent Test**: Use two authorized workspaces with identical names and open current/other/guessed workspace entry points plus a representative business/share/export/admin confirmation; verify the discriminator and target are explicit, cross-workspace entry requires a safe switch, and no non-current signals appear.

### Tests for User Story 4 — write first and confirm failure

- [x] T048 [P] [US4] Add deep-link and entry-point tests in `tests/f012/integration/workspace-entry-points.test.mjs` for current/other/malformed/guessed/foreign/revoked targets, exact workspace and record UUID retention, fresh membership checks before disclosure, explicit safe switch before route open, delayed link/notification actions, and generic denial with no existence/name/count/record leak
- [x] T049 [P] [US4] Add duplicate-name and consequential-context tests in `tests/f012/ui/workspace-context-cues.test.mjs` for stable safe discriminators in switcher/header/dialog/confirmation/link/search/recent/notification placeholders, current and target identity before commitment, no color-only distinction, and no use of display name as lookup or authority
- [x] T050 [P] [US4] Add cross-workspace projection tests in `tests/f012/integration/workspace-projections.test.mjs` proving every list/count/badge/recent/search/notice/subscription/background projection requires the exact current `WorkspaceContextEnvelope` and drops mismatches without rewriting them to the current workspace

### Implementation for User Story 4

- [x] T051 [US4] Extend `app/main/links.ts` with F012 workspace-bound link decisions: retain canonical workspace/record IDs, verify current membership before revealing content, route same-current context normally, require an explicit coordinator switch for another authorized workspace, and return one generic refusal for malformed/guessed/foreign/revoked/unavailable targets
- [x] T052 [US4] Add a reusable exact-context guard to `app/main/workspaces/coordinator.ts` and apply it to F012 request/result/event/entry-point delivery in `app/main/bridge.ts`; every effect must match profile reference/generation plus workspace ID/selection generation and stale work is rejected, dropped, or refreshed without changing its captured target
- [x] T053 [US4] Replace the header workspace placeholder in `app/renderer/components/shell/HeaderUtilities.tsx` with the current display name and safe discriminator from `WorkspaceProvider`, retaining persistent identification at 200% zoom and exposing no non-current count, notice, or private metadata
- [x] T054 [US4] Add explicit target workspace identity to representative consequential confirmation state in `app/renderer/contexts/WorkspaceContext.tsx` and render it with bidi isolation in `app/renderer/components/workspaces/PendingWorkspaceSwitchDialog.tsx`; refuse confirmation when its envelope becomes stale
- [x] T055 [US4] Route workspace-bound navigation through `app/renderer/shell/App.tsx` and `app/renderer/lib/bridge.ts` so a different target waits for successful safe switching before opening, while guessed/foreign targets show only the closed unavailable action and all non-current projections are cleared on generation change

**Checkpoint**: US4 independently proves visible, duplicate-safe context and safe entry-point routing with zero hidden cross-workspace signals.

---

## Phase 7: User Story 5 — Create and Switch Accessibly in English or Arabic (Priority: P2)

**Goal**: Deliver equivalent creation, switching, pending-work, failure, recovery, and context-cue meaning in English and Arabic with correct RTL/bidi, keyboard, focus, screen-reader, contrast, reduced-motion, and 200% zoom behavior.

**Independent Test**: Complete successful, invalid, interrupted, offline, duplicate-name, unsaved-edit, unavailable-workspace, and recovery paths in both languages using keyboard-only and native assistive technology at 200% zoom; meanings/actions match and mixed-direction values remain intact.

### Tests for User Story 5 — write first and confirm failure

- [x] T056 [P] [US5] Add typed localization parity tests in `tests/f012/ui/localization-parity.test.mjs` for every heading, field, lifecycle, readiness state, source/target label, warning, error, recovery action, confirmation, announcement, and parameter schema; reject missing/extra keys, raw provider/database text, and untranslated content
- [x] T057 [P] [US5] Add renderer accessibility/RTL tests in `tests/f012/ui/workspace-accessibility.test.mjs` for logical layout, bidi-isolated Arabic/Latin/emoji/combining names, currencies/discriminators/diagnostics with intact stored order, keyboard-only dialogs/switcher/recovery, focus trap/restore/target movement, restrained live regions, semantic status, non-color cues, contrast, reduced motion, and 200% zoom/reflow
- [x] T058 [P] [US5] Add packaged Electron journeys in `tests/verification/desktop/f012-workspaces.spec.mjs` for English/Arabic create, invalid/unknown creation, duplicate names, stay/discard/save, successful/failed switch, locked protection, online-required, restart, deep links, visible current context, and safe cleanup
- [x] T059 [P] [US5] Define the SC-008–SC-010 participant timing/comprehension protocol, language split, outage exclusions, duplicate-name task, environment, expected/observed fields, privacy rules, and evidence template in `docs/qa/F012-usability-protocol.md`

### Implementation for User Story 5

- [x] T060 [US5] Complete one typed F012 key/parameter schema and meaning-equivalent wording in `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts`; isolate stable values without normalization, preserve valid input, name one honest next action for each failure, and never translate IDs or expose hidden-tenant wording
- [x] T061 [US5] Complete semantic labels/descriptions/errors, initial/trapped/restored focus, target-heading focus, live announcements, logical RTL layout, bidi isolation, visible focus, contrast, reduced-motion behavior, and 200% reflow in `app/renderer/components/workspaces/WorkspaceCreateDialog.tsx`, `app/renderer/components/workspaces/WorkspaceSwitcher.tsx`, and `app/renderer/components/workspaces/PendingWorkspaceSwitchDialog.tsx`
- [x] T062 [US5] Complete provider-level context announcements and generation-keyed cleanup in `app/renderer/contexts/WorkspaceContext.tsx` and `app/renderer/shell/App.tsx`, ensuring the old workspace becomes non-interactive before the new workspace is announced and hidden tenant names are never sent to assistive technology
- [x] T063 [US5] Complete persistent accessible current-workspace presentation in `app/renderer/components/shell/HeaderUtilities.tsx`, using house `Button`, `Dialog`, `BdiText`, and logical Tailwind patterns with a non-pointer path for every create, switch, pending-work, retry, unlock, reconnect, and chooser action that is actually implemented

**Checkpoint**: US5 independently passes automated bilingual/accessibility checks and is ready for separate fluent-Arabic and native assistive-technology observation.

---

## Phase 8: Polish & Cross-Cutting Verification

**Purpose**: Prove the integrated slice, migration safety, rollback, and honest evidence without promoting synthetic/local results to production or release claims.

- [x] T064 [P] Add cross-layer failure injection in `tests/f012/integration/failure-injection.test.mjs` for policy load, request transport, transaction statements, lost responses, local initialization, selection-record write, source close, target authority/open, event delivery, restart, concurrent windows/devices, clock/locale changes, and original-intent/generation reconciliation
- [x] T065 [P] Add migration/rollback/re-enable tests in `tests/f012/integration/rollback.test.mjs` proving old F008/F009 rows remain readable, IDs/relationships remain unchanged, `display_name` backfills safely, absent policy disables creation, F012 UI/RPC grants can be disabled without dropping schema or deleting workspaces/memberships/intents/evidence/partitions, and compatible re-enable reconciles original state
- [x] T066 [P] Implement redacted evidence collection in `tooling/f012/evidence.mjs` with requirement/scenario/SC IDs, commit/build, schema/protocol/policy versions, OS/CPU/database/provider/fixture, command or manual journey, expected/observed result, artifact checksum, defects, reviewer/date, and separate local/hosted/native/usability/owner/merge/release statuses
- [x] T067 Run all focused F012 suites and F003–F011 regressions plus typecheck, lint, build, security, docs, and desktop checks from `specs/012-workspace-creation-safe-switching/quickstart.md`; record only observed commands/results and unresolved blockers in `docs/qa/F012.md`
- [x] T068 Run the real local PostgreSQL/Supabase privilege, RLS, concurrency, rollback, advisor, and query-plan matrix from `specs/012-workspace-creation-safe-switching/quickstart.md`, recording the exact synthetic policy and leaving hosted/provisioned readiness unclaimed in `docs/qa/F012.md`
- [x] T069 Execute the declared Windows, macOS, and Linux packaged journeys in English and Arabic, including fluent Arabic, NVDA/VoiceOver/Linux assistive technology, focus/zoom/contrast/reduced-motion, protection/restart/deep-link observations, and SC-008–SC-010 usability studies; append separate results to `docs/qa/F012.md` and leave inaccessible targets/reviewers as blockers
- [x] T070 Update implementation, configuration, protection, recovery, rollback, privacy, and support guidance in `docs/features/F012.md`, keeping synthetic policy, local database proof, hosted sandbox, packaged-native evidence, production enablement, customer-data readiness, owner approval, merge, and release as distinct statuses
- [x] T071 Update F012 traceability and current status in `docs/planning/coverage.md` and `plan.md` only from T067–T070 evidence; do not mark delivery complete for documentation, synthetic-only checks, missing native targets, unresolved Q-01/Q-02/Q-03/Q-06/Q-07/Q-08 gates, or blocking defects

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 is the implementation gate; T002–T004 may prepare the verification surface, but application/service work does not proceed on a failed gate
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story
- **US1 (Phase 3)**: Depends on Foundation and establishes authoritative creation plus explicit local initialization
- **US2 (Phase 4)**: Depends on Foundation; its switch tests use seeded retained workspaces independently, while the integrated journey reuses US1-created workspaces
- **US3 (Phase 5)**: Depends on US2's coordinator/generation boundary and retained-open behavior
- **US4 (Phase 6)**: Depends on US2's safe switch/context fencing; its link and UI tests can start with fixtures after Foundation
- **US5 (Phase 7)**: Depends on all user-visible states from US1–US4 for final parity, though fixtures allow tests and translation work to begin earlier
- **Polish (Phase 8)**: Depends on every story included in the delivery candidate; native/usability evidence additionally depends on declared environments and reviewers

### User Story Completion Order

```text
Setup -> Foundation -> US1 (create) -> US2 (safe switch) -> US3 (restart/offline)
                              |               |
                              +---------------> US4 (context/entry points)
US1 + US2 + US3 + US4 -----------------------> US5 (bilingual accessibility)
US1 + US2 + US3 + US4 + US5 ----------------> Polish/evidence
```

- **US1 (P1)**: No dependency on another story after Foundation; independently proves one-effect workspace creation and truthful defaults
- **US2 (P1)**: Uses seeded workspaces after Foundation for independent testing; integrated activation can consume US1
- **US3 (P2)**: Requires the US2 coordinator/generation/open-retained protocol to test restart and revocation honestly
- **US4 (P2)**: Requires the US2 context fence for integrated routing; duplicate-name/context-cue tests can use fixtures independently
- **US5 (P2)**: Covers the complete visible state set from US1–US4

### Within Each User Story

- Write the listed story tests first and confirm they fail for the intended missing behavior
- Define/validate closed data before service/main transitions, then expose the minimum bridge and renderer surface
- Recheck service authority before local activation; protected local success never grants service membership
- Complete the independent test and checkpoint before moving to the next recommended story
- Record evidence only after executing the exact command or observation

### Parallel Opportunities

- Setup tasks T002–T004 touch different files and can run in parallel after T001 identifies blockers
- Foundation T013, T015, and T016 touch separate files; migration tasks T006–T010 remain sequential because they share one file
- Tests marked `[P]` within every user story can be written in parallel before implementation
- US4 fixture-based tests T048–T050 can begin after Foundation while US3 implementation proceeds, but shared coordinator/bridge integration remains ordered
- Polish T064–T066 can proceed in parallel after the stories; executed validation/evidence tasks T067–T071 remain ordered by available environments and recorded results
- Do not edit the shared migration, coordinator, bridge, `App.tsx`, `HeaderUtilities.tsx`, or localization files concurrently without explicit ownership

---

## Parallel Examples

### User Story 1

```text
Task T019: Creation contract/digest tests in tests/f012/unit/workspace-creation.test.mjs
Task T020: Authoritative transaction tests in tests/f012/service/workspace-creation-atomicity.test.mjs
Task T021: Retry/reconciliation tests in tests/f012/service/workspace-creation-reconciliation.test.mjs
Task T022: Creation-to-local activation tests in tests/f012/integration/workspace-creation-activation.test.mjs
Task T023: Creation form/UI tests in tests/f012/ui/workspace-creation.test.mjs
```

### User Story 2

```text
Task T029: Selectable-membership/privacy tests in tests/f012/service/selectable-workspaces.test.mjs
Task T030: Pending unsaved-edit tests in tests/f012/unit/pending-work.test.mjs
Task T031: Atomic switch failpoints in tests/f012/integration/workspace-switching.test.mjs
Task T032: Generation fencing races in tests/f012/integration/generation-fencing.test.mjs
Task T033: Durable-work isolation in tests/f012/integration/workspace-isolation.test.mjs
```

### User Story 3

```text
Task T040: Retained-partition mode tests in tests/f012/integration/retained-partition.test.mjs
Task T041: Restart/crash convergence tests in tests/f012/integration/workspace-restart.test.mjs
Task T042: Offline/revocation tests in tests/f012/integration/workspace-revocation.test.mjs
```

### User Story 4

```text
Task T048: Deep-link/entry-point tests in tests/f012/integration/workspace-entry-points.test.mjs
Task T049: Duplicate-name/context-cue tests in tests/f012/ui/workspace-context-cues.test.mjs
Task T050: Projection envelope tests in tests/f012/integration/workspace-projections.test.mjs
```

### User Story 5

```text
Task T056: Localization parity tests in tests/f012/ui/localization-parity.test.mjs
Task T057: Renderer accessibility/RTL tests in tests/f012/ui/workspace-accessibility.test.mjs
Task T058: Packaged Electron journeys in tests/verification/desktop/f012-workspaces.spec.mjs
Task T059: Usability protocol in docs/qa/F012-usability-protocol.md
```

---

## Implementation Strategy

### MVP Demo (User Story 1 Only)

1. Pass Phase 1 entry gates
2. Complete Phase 2 Foundation
3. Complete Phase 3 US1
4. Stop and validate creation contracts, the real local transaction boundary, retry/reconciliation, and post-create protected initialization
5. Demo only with the labeled synthetic policy; do not call this complete F012 because safe switching remains absent

### Smallest Complete F012 Slice

1. Complete Setup + Foundation
2. Add US1 authoritative creation
3. Add US2 atomic safe switching and generation fencing
4. Stop and validate both P1 checkpoints before adding restart/entry-point breadth

### Incremental Delivery

1. US1 establishes the tenant and truthful defaults
2. US2 makes multiple memberships safe to use and completes the core F012 isolation slice
3. US3 adds restart/offline/revocation convergence
4. US4 adds human-visible context and safe entry-point routing
5. US5 proves bilingual accessible parity across the final state set
6. Polish records observed evidence and rollback behavior without implying provisioning, customer-data readiness, merge, or release

---

## Notes

- `[P]` means different files and no dependency on another incomplete task in that phase
- `[USn]` maps each task to its user story for traceability
- T001 is a real stop gate; a task list does not authorize implementation or close Q-01/Q-02/Q-03/Q-06/Q-07/Q-08
- Production creation has no inferred timezone/currency/legal defaults; absent approved policy means `workspace_creation_unavailable`
- Offline selection remains `online_required` until F016 supplies an approved bounded authorization lease
- No task adds invitations, grant editing, device administration, sync/Realtime, workspace settings/closure, cross-workspace aggregates, a generic command bus, a second session owner, or a new dependency
- Commit after each task or coherent dependent group; record evidence only after commands or observations actually run
