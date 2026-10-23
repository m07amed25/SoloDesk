---
description: "Task list for F013 Member Invitations"
---

# Tasks: F013 — Member Invitations

**Input**: Design documents from `/specs/013-member-invitations/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/), completed F009 receipt/evidence behavior, F010 hosted sign-in and verified-session behavior, F011 security policy, F012 active-workspace behavior, and the Q-02/Q-05/Q-08/Q-13 gates named below

**Authorization**: This file is a documentation artifact. It does not authorize F013 implementation, migration application, provider/sender configuration, delivery to real recipients, hosted deployment, production policy selection, merge, or release.

**Tests**: Test tasks are included because every user story defines an independent test and F013 requires database constraints, transaction failpoints, concurrency/replay, tenant isolation, secret scans, provider truth, English/Arabic, accessibility, hosted-browser, and packaged-native evidence.

**Organization**: Tasks are grouped by user story. Each story has an independently runnable synthetic slice after the shared foundation; the recommended sequence avoids concurrent edits to the migration, command gateway, coordinator, bridge, hosted route, status list, and localization files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on another incomplete task in the phase
- **[Story]**: Maps to the five user stories in `spec.md`
- Every checklist item includes an exact file path

## Path Conventions

- Desktop main/preload/renderer: `app/main/`, `app/preload/`, `app/renderer/`, `app/shared/`
- Hosted identity/invitation surface: `web/auth/`, `vite.auth.config.mts`
- Shared localization: `packages/localization/src/shell/`
- Service migration/functions: `supabase/migrations/`, `supabase/functions/`
- Verification: `tooling/f013/`, `tests/f013/`, `tests/verification/desktop/`, `verification/`
- Evidence and operating notes: `docs/features/F013.md`, `docs/qa/F013.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish explicit entry gates and a fixed fail-on-empty verification surface without implementing the feature, adding a dependency, or inventing production policy.

- [x] T001 Record the F013 implementation entry decision in `docs/features/F013.md`: verify the F009 receipt/evidence, F010 hosted sign-in/session, F011 security-policy, and F012 active-workspace prerequisites; record current authorization; require Q-05 inviter/offer approval, Q-08 expiry/resend and identity-change policy, Q-02 sender/domain/provider/quota/abuse/callback readiness, and Q-13 PII/provider-reference retention; keep production offers and public delivery disabled and mark dependent implementation blocked instead of inventing values
- [x] T002 [P] Add fixed scripts `test:f013`, `test:f013:contracts`, `test:f013:service`, `test:f013:acceptance`, `test:f013:delivery`, `test:f013:security`, and `test:f013:ui` to `package.json`, each selecting a fixed suite through `node tooling/f013/verify.mjs`
- [x] T003 [P] Create the fail-on-empty suite runner in `tooling/f013/verify.mjs`, following `tooling/f012/verify.mjs` and rejecting unknown suite IDs, missing files, zero selected tests, and omitted required evidence
- [x] T004 [P] Register F013 suites, FR-001–FR-028, A-01–A-23, required test files, and required database/synthetic-provider/hosted/native/accessibility evidence in `verification/suites.v1.json` so missing coverage cannot report success

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the closed contracts, private schema, legacy hardening, privilege boundary, secret handling, fixtures, and redaction checks used by every story.

**⚠️ CRITICAL**: No user-story implementation starts until T001 passes and the contract, migration, privilege, legacy-path, and secret-handling checks in this phase pass.

- [x] T005 Define versioned exact-key F013 commands/results/events, bounds, operation digests, `InvitationLifecycle`, `DeliveryOutcome`, `MembershipOutcome`, `SafeAction`, `SafeInvitationSummary`, cursor schema, reason/action codes, policy/list/create/resend/revoke/reconcile inputs, and hosted review/accept result schemas in `app/shared/invitation-contracts.ts`; reject unknown fields/enums and exclude actor, workspace, membership authority, capability lists, expiry overrides, tokens, URLs, recipient bindings, provider payloads, raw errors, paths, keys, and hidden counts
- [x] T006 Remove the reachable F008 token-bearing invitation DTO and prevent role-enum drift in `app/shared/cloud-contracts.ts` and `app/shared/workspace-contracts.ts`: F013 accepts only an approved opaque `offerRef`, never caller-composed capabilities or an unapproved role; preserve existing membership compatibility until Q-05/F014 supplies the canonical production matrix, and make the legacy raw `invitationToken` impossible to return
- [x] T007 Add private `invitation_policies` to `supabase/migrations/20261023000013_f013_member_invitations.sql` with the field constraints verbatim: `policy_id` is "Primary key, immutable"; `workspace_id` is "FK to workspace; indexed"; `revision` is "Positive, monotonic within workspace"; `offer_ref` is "Opaque stable reference, not a caller-defined grant list"; `role_ref` is "Canonical approved role identity"; `scope_ref` is "Canonical approved scope identity"; `inviter_rule_ref` is "Approved authority rule reference"; `expiry_policy_ref` is "Approved Q-08 policy reference"; `enabled` is "Defaults false unless approved configuration enables it"; `effective_at` / `retired_at` are "Database-governed validity window"; `created_at` is "Database-generated"; enforce unique `(workspace_id, revision, offer_ref)`, the enabled lookup index, immutable used revisions, and no enabled production row without T001 approval
- [x] T008 Add private `workspace_invitations` to `supabase/migrations/20261023000013_f013_member_invitations.sql` with the field constraints verbatim: `invitation_id` is "Primary key, immutable"; `workspace_id` is "FK to workspace; indexed"; `recipient_binding_key` is "Domain-separated canonical key for uniqueness; never shown"; `recipient_issuer` / `recipient_subject` are "Both present for a known stable identity or both absent"; `recipient_claim_digest` is "Present only for an unresolved approved verified claim"; `recipient_label_ciphertext` is "Optional delivery/display value; not authority and retained per Q-13"; `offer_ref` is "Snapshot reference presented to users"; `role_ref` / `scope_ref` are "Approved access identities, not display labels"; `policy_id` / `policy_revision` are "Creation policy snapshot; acceptance revalidates current allowance"; `inviter_issuer` / `inviter_subject` are "Stable creating actor identity"; `status` is exactly `pending | accepted | revoked | expired | superseded`; `revision` "Starts at 1; compare-and-change token for administration"; `current_generation_id` "Points to the one current generation while pending"; `accepted_membership_id` is "Present only after acceptance"; `created_at` / `expires_at` are "Database time and configured expiry"; `terminal_at` / `terminal_reason` are "Required for terminal state"; enforce exactly one binding form, lifecycle consistency, cursor/expiry indexes, and partial unique `(workspace_id, recipient_binding_key)` for pending rows
- [x] T009 Add private `invitation_generations` to `supabase/migrations/20261023000013_f013_member_invitations.sql` with the field constraints verbatim: `generation_id` is "Primary key"; `invitation_id` is "FK; indexed"; `generation_number` is "Positive and monotonic per invitation"; `selector` is "Unique bounded lookup value; not sufficient to accept"; `secret_digest` is "Domain-separated digest of random secret"; `status` is exactly `current | consumed | superseded | revoked | expired`; `created_at` / `expires_at` are "Database time and approved policy"; `terminal_at` is "Required unless current"; `consumed_by_issuer` / `consumed_by_subject` are "Present only for consumed generation"; `operation_id` "Correlates create/resend receipt"; enforce unique selector, unique `(invitation_id, generation_number)`, one partial-unique current generation, consistent terminal/consumer fields, expiry not beyond invitation authority, and constant-time digest comparison after selector lookup
- [x] T010 Add private `invitation_delivery_attempts` and `invitation_redemption_attempts` to `supabase/migrations/20261023000013_f013_member_invitations.sql` with the field constraints verbatim: delivery `delivery_attempt_id` is "Primary key"; `invitation_id` / `generation_id` are "FKs; both indexed and checked to match"; `attempt_number` is "Positive; one immediate attempt per generation in F013"; `channel` is "Initially approved email/synthetic channel only"; `provider_ref_digest` is "Safe correlation, never the provider payload"; `status` is exactly `queued | provider_accepted | delivered | delayed | failed | bounced | rate_limited | unknown`; `safe_reason_code` is "Allowlisted operational category"; delivery timestamps are "Authoritative event times" and `provider_event_at` is "Only for verified callback evidence"; redemption `redemption_id` is "Primary key"; `invitation_id` / `generation_id` are "FKs; indexed"; `continuation_digest` is "Unique; raw continuation exists only in HttpOnly cookie"; `status` is exactly `awaiting_identity | reviewed | accepted | denied | expired`; `verified_issuer` / `verified_subject` are "Set only from live F010 session"; `created_at` / `expires_at` are "Short server-defined window, no longer than generation authority"; `terminal_at` / `safe_reason_code` are "Redacted outcome"; enforce unique attempt/continuation, monotonic terminal states, callback indexes, and no raw payload/secret storage
- [x] T011 Extend `public.workspace_memberships` and harden legacy data in `supabase/migrations/20261023000013_f013_member_invitations.sql` with the field constraints verbatim: `account_issuer` is "Non-null for newly accepted F013 memberships; backfilled only from trusted configured issuer"; `accepted_invitation_id` is "Unique provenance link for invitation-created memberships"; `accepted_generation_id` is "Unique; must belong to accepted invitation"; `accepted_policy_id` / `accepted_policy_revision` are "Offer provenance reviewed at acceptance"; `accepted_role_ref` / `accepted_scope_ref` are "Immutable accepted snapshot; current membership changes remain F014"; treat existing `user_id` as the stable account subject under the configured single-issuer invariant, enforce unique active `(workspace_id, account_issuer, user_id)`, all-null/all-present provenance, restrictive deletion, and no invitation-history cascade; invalidate/clear legacy raw tokens, classify legacy `status='invited'` rows as non-authoritative terminal compatibility evidence, never auto-promote them, and preserve active memberships
- [x] T012 Harden functions, evidence, RLS, indexes, and grants in `supabase/migrations/20261023000013_f013_member_invitations.sql`: keep private relations outside Data API exposure; set restricted functions to fixed empty `search_path` with fully qualified relations and least-privilege owners; revoke `PUBLIC`/`anon` and direct `authenticated` invitation/membership mutation; grant only named bounded entry points; use database time and deterministic invitation→generation→membership lock order; reuse F009 operation receipts/redacted evidence; and disable every legacy F008 invitation execution path before any F013 policy can be enabled
- [x] T013 [P] Create main-only bounded Supabase administration calls, current F010 session/enrolled-device admission, F012 workspace-generation derivation, safe response mapping, and online-only behavior in `app/main/invitations/invitation-service.ts`, returning no raw provider/database/Auth error or hidden tenant fact
- [x] T014 Create the per-profile `InvitationCoordinator` in `app/main/invitations/coordinator.ts`: serialize invitation mutations, retain original operation IDs across unknown outcomes, derive the current F012 workspace envelope, reject stale workspace/profile generations, refresh after focus/commands, and expose only renderer-safe state without an offline outbox, second session owner, event bus, search/count cache, or Realtime subscription
- [x] T015 [P] Implement selector/256-bit-secret creation, domain-separated digesting, constant-time verification helpers, fragment URL assembly, and the feature-local one-attempt delivery interface in `supabase/functions/_shared/invitation-delivery.ts` using platform cryptography only; raw secrets/continuations exist only in bounded trusted memory and the module must not log, persist, return to desktop, or expose them to analytics
- [x] T016 [P] Create synthetic policies, accounts, devices, workspaces, identities/claims, invitations, generations, deliveries, redemption attempts, memberships, legacy rows, provider events, exact/max/max+1 bounds, all closed states, and distinctive prohibited-data canaries in `tests/f013/fixtures/invitation-fixtures.mjs`, with production offers/public delivery disabled
- [x] T017 [P] Add closed-schema and semantic-digest tests in `tests/f013/unit/invitation-contracts.test.mjs` for exact keys/enums/versions/bounds, UUIDs/cursors, Unicode/control input, stable identity versus display values, operation reuse, safe failures/actions, plain-data copies, and zero token/URL/binding/provider/raw-error/authority/count leakage
- [x] T018 Add real PostgreSQL/Supabase schema and privilege tests in `tests/f013/service/invitation-schema.test.mjs` for every constraint/index/FK/query plan, one pending binding/current generation/active membership, consistent lifecycle/provenance, legacy invalidation, fixed search paths, grants, private-relation denial, direct self-grant denial, RLS recursion safety, and redacted append-only evidence
- [x] T019 Extend `tooling/verification/security.mjs` with F013 canary scanning across source/built hosted, renderer and preload bundles, database/log/receipt/audit/provider fixtures, browser URL/history/storage/cache/referrer, diagnostics/analytics/crash/support/export artifacts, screenshots/videos, notifications, and CI reports; fail on raw invitation/continuation/Auth secrets, full secret URLs, recipient values outside approved encrypted fixtures, provider payloads, customer data, or hidden tenant aggregates

**Checkpoint**: Contracts, private schema, legacy invalidation, privileges, crypto boundary, fixtures, and secret scans fail closed; story work can begin.

---

## Phase 3: User Story 1 — Invite a Specific Member with Explicit Access (Priority: P1) 🎯 MVP Demo

**Goal**: Let a currently authorized administrator create one recipient-bound pending invitation with an approved visible offer and configured expiry, without creating membership.

**Independent Test**: From a workspace with one owner, create a valid English, Arabic, and mixed-direction invitation; verify one pending invitation/current generation/queued delivery attempt, zero membership, safe duplicate/reconciliation behavior, rejected invalid/unauthorized offers, and no membership from a matching contact record.

### Tests for User Story 1 — write first and confirm failure

- [x] T020 [P] [US1] Add create/policy contract tests in `tests/f013/unit/invitation-create.test.mjs` for bounded recipient input, approved opaque offers only, stable identity/claim binding, configured expiry, policy revision, exact semantic digest, Arabic/Latin/emoji/combining presentation, max/max+1/control input, unknown fields, and no caller actor/workspace/role/scope/expiry/token authority
- [x] T021 [P] [US1] Add authoritative create transaction tests in `tests/f013/service/invitation-create-atomicity.test.mjs` for current session/enrolled device/active workspace/inviter authority, one invitation/generation/queued delivery/receipt/evidence and zero membership, plus rollback after operation claim, invitation insert, generation insert, delivery insert, receipt, and evidence
- [x] T022 [P] [US1] Add create concurrency/reconciliation tests in `tests/f013/service/invitation-create-reconciliation.test.mjs` for same/different operation IDs, changed digests, 32-way same-recipient races, matching existing pending invitation, lost response, restart, committed/not-committed/still-processing outcomes, foreign operation lookup, and prohibition on automatic replacement intents
- [x] T023 [P] [US1] Add identity/contact separation tests in `tests/f013/integration/invitation-recipient-binding.test.mjs` for known `(issuer, subject)`, approved unresolved verified claim, case/Unicode/alias presentation, existing member, removed prior member, same client/lead/billing/imported/notification address, lost inviter authority, disabled offer, stale workspace generation, offline state, and zero contact-derived membership
- [x] T024 [P] [US1] Add invitation dialog tests in `tests/f013/ui/invite-member-dialog.test.mjs` for explicit workspace/recipient/role/scope/expiry/consequence, approved choices only, safe field/action errors, retained non-secret form fields, duplicate and unknown reconciliation, online-required behavior, no false send/delivery/membership claim, keyboard/focus/status behavior, and bidi-isolated identifiers

### Implementation for User Story 1

- [x] T025 [US1] Implement restricted `GetInvitationPolicy`, `CreateInvitation`, and `ReconcileInvitationOperation` database functions in `supabase/migrations/20261023000013_f013_member_invitations.sql`: derive live identity/workspace/device/membership authority, validate enabled policy and recipient binding, claim F009 operation/digest, use database time, atomically create or return one pending invitation/current generation/queued delivery/receipt/redacted evidence, create no membership, and return only closed safe results
- [x] T026 [US1] Replace the legacy `Math.random()`/raw-token path with bounded create/reconcile routing in `supabase/functions/command-gateway/invitation-handler.ts` and remove the reachable invite path from `supabase/functions/command-gateway/membership-handler.ts`; mint the secret only after admission, commit before one delivery attempt, and never return it through the command response
- [x] T027 [US1] Implement policy/create/reconcile methods and original-operation recovery in `app/main/invitations/invitation-service.ts`, mapping invalid input, online-required, not-authorized, policy-unavailable, already-member, already-pending, rate-limited, unknown, and unavailable outcomes to the exact safe contract
- [x] T028 [US1] Implement create orchestration in `app/main/invitations/coordinator.ts`: capture the current F012 envelope, preserve one operation ID through retries, reconcile before a replacement action, refresh only the active workspace after a known result, and never queue offline or infer success from cached/list state
- [x] T029 [US1] Expose only `invitation.getPolicy`, `invitation.create`, and `invitation.reconcile` through `app/main/bridge.ts`, `app/preload/preload.ts`, `app/renderer/env.d.ts`, and `app/renderer/lib/bridge.ts`, reusing sender/frame/origin/document/profile/workspace-generation admission and accepting no renderer-supplied identity, authority, expiry, delivery status, secret, URL, SQL, or generic command
- [x] T030 [US1] Implement `InviteMemberDialog` in `app/renderer/components/workspaces/InviteMemberDialog.tsx` and mount it from `app/renderer/shell/App.tsx`; use existing `Dialog`, `Button`, and `BdiText`, show the current workspace and approved offer/expiry/consequence, preserve safe input, reconcile unknown results, and claim only invitation creation—not dispatch, delivery, acceptance, or membership

**Checkpoint**: US1 independently creates one safe synthetic pending invitation with no membership. This is the smallest demo slice, not an end-to-end usable invitation release.

---

## Phase 4: User Story 2 — Accept Once as the Intended Identity (Priority: P1)

**Goal**: Let only the intended live verified account review the current offer and atomically accept it once into exactly one active membership.

**Independent Test**: Open one current synthetic link signed out, as the intended account, as another account, expired/revoked/superseded/consumed, and concurrently from 32 sessions; verify neutral disclosure until identity matches, one membership plus consumption, safe retry/reconciliation, and no secret residue.

### Tests for User Story 2 — write first and confirm failure

- [x] T031 [P] [US2] Add fragment exchange and secret-hygiene tests in `tests/f013/integration/invitation-fragment-exchange.test.mjs` for bounded/malformed/guessed/current/expired selectors and secrets, constant-time digest verification, immediate history replacement, no URL/referrer/DOM/log/telemetry/storage/cache/desktop exposure, short Secure/HttpOnly/SameSite continuation, expiry, and neutral public responses
- [x] T032 [P] [US2] Add verified-recipient review tests in `tests/f013/integration/invitation-review-identity.test.mjs` for signed-out flow, F010 sign-in/MFA/recovery enforcement, exact `(issuer, subject)` match, approved verified-claim resolution, wrong account, changed primary address/alias policy, stale offer/inviter/workspace, safe intended-recipient terminal guidance, and zero hidden workspace/recipient/membership detail otherwise
- [x] T033 [P] [US2] Add acceptance atomicity tests in `tests/f013/service/invitation-acceptance-atomicity.test.mjs` for invitation→generation→membership lock order, database time, current policy and identity revalidation, one active membership with complete invitation/generation/policy/role/scope provenance, invitation/generation/redemption consumption, F009 receipt/evidence, and rollback after every mutation boundary
- [x] T034 [P] [US2] Add acceptance concurrency/reconciliation tests in `tests/f013/service/invitation-acceptance-concurrency.test.mjs` for 32 sessions, same/different operation IDs, lost response/restart, pre-existing exact membership, conflicting membership, and acceptance races against resend/revoke/expiry; assert one matching membership or no membership and no broadened access
- [x] T035 [P] [US2] Add hosted review/accept UI tests in `tests/f013/ui/hosted-invitation-redemption.test.mjs` for safe signed-out/wrong-account/unavailable states, explicit workspace/inviter/role/scope/expiry/consequence review, confirm/cancel, unknown/replayed success, cookie clearing, fixed return routes, no automatic desktop switch, and no token or hidden detail in rendered output

### Implementation for User Story 2

- [x] T036 [US2] Implement restricted `ExchangeInvitationSecret`, `ReviewInvitation`, `AcceptInvitation`, and acceptance reconciliation functions in `supabase/migrations/20261023000013_f013_member_invitations.sql`: create only digest-backed short redemption attempts, derive live F010 identity, lock invitation→generation→membership, use database time, revalidate binding/workspace/policy, atomically insert-or-return one active membership and consume authority/receipt/evidence, and collapse public failures to neutral safe results
- [x] T037 [US2] Implement same-origin exchange/review/accept handling in `supabase/functions/invitation-redemption/index.ts` with bounded bodies, HTTPS/origin/CSRF/callback allowlists, private/no-store responses, Secure/HttpOnly/SameSite continuation cookies, F010 session verification, rate limits, history-safe response shapes, and zero secret/provider/database/Auth logging
- [x] T038 [US2] Extend the F010 hosted surface in `web/auth/invitation.tsx` with fragment exchange, sign-in handoff, matching-recipient review, explicit confirmation, retry/reconcile, safe terminal guidance, history cleanup, and no local/session storage, analytics, clipboard, arbitrary redirect, desktop token handoff, or workspace auto-switch
- [x] T039 [US2] Route the invitation journey through `web/auth/App.tsx` and `web/auth/main.tsx`, add its fixed path/build inputs to `vite.auth.config.mts`, and configure CSP/referrer/cache/service-worker exclusions in `web/auth/index.html` so third-party scripts and routine navigation cannot observe the secret or private review
- [x] T040 [US2] Integrate accepted membership discovery with the existing authoritative workspace refresh in `app/main/workspaces/workspace-service.ts` and `app/main/workspaces/coordinator.ts`; expose the new workspace only after current F012 authority refresh and require explicit safe switching rather than accepting a hosted success message as desktop authority

**Checkpoint**: US2 independently accepts a seeded current invitation exactly once as the intended verified identity. US1+US2 form the minimum end-to-end invitation value slice.

---

## Phase 5: User Story 3 — Resend or Revoke a Pending Invitation (Priority: P1)

**Goal**: Let an authorized administrator rotate a pending invitation's acceptance generation or revoke every outstanding path while preserving truthful delivery and membership state.

**Independent Test**: Resend a pending invitation twice, fail/timeout delivery, retain old links, race resend/revoke/accept/expiry, and verify one current generation, all older links invalid, explicit delivery failure, terminal revocation, stale-action safety, and no membership deletion.

### Tests for User Story 3 — write first and confirm failure

- [x] T041 [P] [US3] Add resend rotation tests in `tests/f013/service/invitation-resend.test.mjs` for current authority and `expectedRevision`, prior-generation supersession before new dispatch, monotonic generation number, approved resend expiry, one queued attempt, operation replay/lost response, provider failure/unknown, and permanent invalidity of every older secret
- [x] T042 [P] [US3] Add revoke and transition-race tests in `tests/f013/service/invitation-revoke-races.test.mjs` for all-generation invalidation, stale revisions, accepted/expired/superseded/revoked state, 32-way resend/revoke/accept/expiry races, deterministic terminal outcome, zero partial authority, and preservation of an acceptance-winning membership
- [x] T043 [P] [US3] Add delivery adapter tests in `tests/f013/unit/invitation-delivery.test.mjs` for one bounded post-commit attempt, provider-accepted/failed/rate-limited/throw/timeout outcomes, synthetic sink labeling, no automatic retry, and zero recipient/URL/secret/template/header/raw-response logging or persistence
- [x] T044 [P] [US3] Add provider callback tests in `tests/f013/integration/invitation-delivery-callback.test.mjs` for valid signature/freshness, invalid/stale/replayed/oversized/unknown events, deduplication, permitted monotonic provider-accepted/delivered/delayed/failed/bounced/rate-limited/unknown transitions, raw-payload rejection, and inability to accept or mutate membership
- [x] T045 [P] [US3] Add resend/revoke administration UI tests in `tests/f013/ui/invitation-actions.test.mjs` for current available actions, safe recipient/workspace/consequence confirmation, stale-state refresh, unknown reconciliation, failed/unknown delivery guidance, keyboard/focus/status behavior, and no claim that resend means delivered or accepted

### Implementation for User Story 3

- [x] T046 [US3] Implement restricted `ResendInvitation` and `RevokeInvitation` functions in `supabase/migrations/20261023000013_f013_member_invitations.sql`: claim F009 operations, derive current authority, lock invitation then generations, compare revision, supersede current authority before inserting one new generation/expiry/queued attempt, terminalize all authority on revoke, preserve accepted membership, and return closed safe current state on stale/terminal requests
- [x] T047 [US3] Add bounded resend/revoke routing to `supabase/functions/command-gateway/invitation-handler.ts`, mint and dispatch only the newly committed generation, keep every old generation invalid after provider failure, and return the committed invitation result separately from delivery outcome
- [x] T048 [US3] Implement the single immediate provider/synthetic dispatch and safe outcome update in `supabase/functions/_shared/invitation-delivery.ts`, with timeouts becoming `unknown`, provider references reduced to safe digests, and no queue, worker, automatic retry, or delivery-to-acceptance inference
- [x] T049 [US3] Implement signed/deduplicated status callbacks in `supabase/functions/invitation-delivery-status/index.ts`, bounded before parsing and enabled only for an approved provider contract; reject invalid events without changing invitation or membership authority and store no raw payload
- [x] T050 [US3] Add resend/revoke/reconcile methods to `app/main/invitations/invitation-service.ts`, `app/main/invitations/coordinator.ts`, `app/main/bridge.ts`, `app/preload/preload.ts`, `app/renderer/env.d.ts`, and `app/renderer/lib/bridge.ts`; require the active workspace envelope, invitation ID, expected revision, and original operation ID only, with no offline queue or stale overwrite
- [x] T051 [US3] Implement safe resend/revoke confirmations and failed/unknown delivery recovery actions in `app/renderer/components/workspaces/InvitationStatusList.tsx`, using server-provided `availableActions`, explicit generation-invalidating consequences, reconciliation before replacement, and predictable focus after current-state refresh

**Checkpoint**: US3 independently rotates or revokes a seeded pending invitation without reviving old links, overstating delivery, or changing an accepted membership.

---

## Phase 6: User Story 4 — Review Invitation Status Without Leaking Workspace Data (Priority: P2)

**Goal**: Show authorized administrators bounded, truthful invitation/delivery/membership status and redacted evidence while disclosing nothing to unauthorized or cross-workspace callers.

**Independent Test**: List pending, failed-delivery, accepted, expired, superseded, and revoked fixtures as authorized and unauthorized users; verify stable cursor paging, separate status dimensions, correct actions, redacted evidence, and zero record/recipient/workspace/membership/aggregate leakage.

### Tests for User Story 4 — write first and confirm failure

- [x] T052 [P] [US4] Add cursor-list and status tests in `tests/f013/service/invitation-list.test.mjs` for stable `(created_at desc, invitation_id desc)` paging, bounded page size, opaque workspace-scoped expiring cursor, safe recipient/offer/expiry/lifecycle/latest-delivery/membership projection, no total count/search/raw detail, and intended index plans
- [x] T053 [P] [US4] Add tenant privacy and direct-access tests in `tests/f013/service/invitation-privacy.test.mjs` for ordinary `anon`/`authenticated`, non-admin member, foreign workspace, guessed invitation/cursor, lost authority, list/detail/search/count/evidence/direct DML/function execute, and zero recipient/invitation/workspace/membership/delivery/existence/aggregate disclosure
- [x] T054 [P] [US4] Add evidence/redaction tests in `tests/f013/integration/invitation-evidence.test.mjs` for create/delivery/resend/review/accept/expire/revoke/deny/reconcile events, actor/workspace/safe recipient/offer/policy/generation/correlation/time coverage, append-only ordering, permitted reviewer scope, and absence of secrets, URLs, raw addresses, provider payloads/errors, Auth data, and customer content
- [x] T055 [P] [US4] Add native status projection tests in `tests/f013/ui/invitation-status-list.test.mjs` for every lifecycle/delivery/membership combination, server-derived actions, open/focus/command/reconcile refresh, stale offline labeling with disabled mutation, no push/search/count/token/detail affordance, no hidden non-current workspace signals, and non-color semantic status

### Implementation for User Story 4

- [x] T056 [US4] Implement restricted `ListInvitations` with bounded stable cursor projection in `supabase/migrations/20261023000013_f013_member_invitations.sql`, deriving current workspace/admin authority, returning only safe fields/actions and current policy revision, expiring pending rows against database time, using the declared indexes, and returning no count/search/raw binding/token/provider detail
- [x] T057 [US4] Implement cursor list and focus/command refresh in `app/main/invitations/invitation-service.ts` and `app/main/invitations/coordinator.ts`, discarding results whose profile/workspace generation changed and representing cached offline status as stale/non-authoritative with all mutations disabled
- [x] T058 [US4] Expose only bounded `invitation.list` through `app/main/bridge.ts`, `app/preload/preload.ts`, `app/renderer/env.d.ts`, and `app/renderer/lib/bridge.ts`, validating page size/cursor and current envelope while providing no detail/search/count/evidence/token/provider/generic RPC surface
- [x] T059 [US4] Complete `app/renderer/components/workspaces/InvitationStatusList.tsx` and mount it in `app/renderer/shell/App.tsx` with cursor paging, separate invitation/delivery/membership labels, safe recipient/access/expiry, current allowed actions, open/focus/command refresh, stale offline state, and no inference from provider acceptance to delivery or membership
- [x] T060 [US4] Extend `supabase/functions/_shared/audit-projectors.ts` with allowlisted F013 event projections and reuse F009 evidence authorization in `supabase/functions/_shared/evidence-authorization.ts`; include only safe references/codes/times and add no public export, global search, cross-workspace aggregation, translated authoritative text, or unrestricted error

**Checkpoint**: US4 independently displays seeded invitation history to an authorized administrator and returns no record or aggregate information to every unauthorized context.

---

## Phase 7: User Story 5 — Invite and Join Accessibly in English or Arabic (Priority: P2)

**Goal**: Complete equivalent native, hosted, and invitation-message experiences in English and Arabic with correct RTL/bidi, keyboard, focus, announcements, contrast, reduced motion, and 200% zoom.

**Independent Test**: Complete valid, invalid, wrong-account, failed/unknown delivery, resend, revoke, expired, and accepted journeys in English and Arabic by keyboard and assistive technology at 200% zoom, including mixed Arabic/Latin recipient and workspace labels.

### Tests for User Story 5 — write first and confirm failure

- [x] T061 [P] [US5] Add typed localization parity tests in `tests/f013/ui/localization-parity.test.mjs` for every native/hosted/message heading, field, lifecycle, delivery, membership, consequence, warning, error, action, confirmation, announcement, and parameter schema; reject missing/extra keys, translated stable IDs, unsafe interpolation, raw provider/database/Auth text, and untranslated content
- [x] T062 [P] [US5] Add native accessibility/RTL tests in `tests/f013/ui/invitation-accessibility.test.mjs` for logical layout, bidi-isolated addresses/references/mixed labels with intact copy order, keyboard-only create/list/resend/revoke/reconcile, dialog focus trap/restore and status focus, restrained live regions, semantic/non-color status, contrast, reduced motion, and 200% zoom/reflow
- [x] T063 [P] [US5] Add hosted accessibility/RTL/security tests in `tests/f013/ui/hosted-invitation-accessibility.test.mjs` for sign-in/switch-account/review/confirm/retry/stop, review/error heading focus, safe announcements, bilingual parity, mixed-direction values, cookie/fragment privacy, contrast, reduced motion, and 200% reflow
- [x] T064 [P] [US5] Add packaged Electron invitation journeys in `tests/verification/desktop/f013-member-invitations.spec.mjs` for English/Arabic valid/invalid create, duplicate/unknown, status refresh, failed delivery, resend, revoke, accepted membership refresh, offline disablement, mixed direction, keyboard/focus/zoom, and secret-safe cleanup
- [x] T065 [P] [US5] Define the SC-011–SC-014 participant timing/comprehension protocol, English/Arabic split, sign-in/provider outage exclusions, state-distinction task, fluent review, native assistive-technology matrix, environment, expected/observed fields, privacy rules, and evidence template in `docs/qa/F013-usability-protocol.md`

### Implementation for User Story 5

- [x] T066 [P] [US5] Add the complete typed F013 key/parameter schema and English wording to `packages/localization/src/shell/types.ts` and `packages/localization/src/shell/en.ts` for all invitation, delivery, hosted review, membership, error, action, confirmation, and announcement states, with bounded escaped interpolation and no hidden-tenant or provider wording
- [x] T067 [P] [US5] Add meaning-equivalent Arabic wording with the identical typed key/parameter schema to `packages/localization/src/shell/ar.ts`; preserve stable identifiers, use explicit access/expiry/consequence language, and keep fluent review pending until observed
- [x] T068 [US5] Complete semantic labels/descriptions/errors, initial/trapped/restored/status focus, live announcements, logical RTL, bidi isolation, visible focus, contrast, reduced motion, and 200% reflow in `app/renderer/components/workspaces/InviteMemberDialog.tsx` and `app/renderer/components/workspaces/InvitationStatusList.tsx`, reusing house `Dialog`, `Button`, and `BdiText`
- [x] T069 [US5] Complete equivalent hosted semantics, focus, announcements, logical RTL, bidi isolation, contrast, reduced motion, and reflow in `web/auth/invitation.tsx` and `web/auth/styles.css`, ensuring safe unavailable states reveal no hidden identity/workspace detail
- [x] T070 [US5] Add bounded English/Arabic invitation message templates to `supabase/functions/_shared/invitation-delivery.ts` with equivalent workspace/access/expiry/consequence meaning and safe escaped presentation values; keep sender/provider-specific presentation disabled until Q-02 approval and never include customer content or claim delivery/acceptance

**Checkpoint**: US5 provides equivalent accessible bilingual meaning across the complete implemented native/hosted/message slice; fluent and real-assistive-technology evidence remains separate.

---

## Phase 8: Polish & Cross-Cutting Verification

**Purpose**: Prove failure safety, migration/rollback, regressions, platform behavior, and evidence without converting synthetic success into a production claim.

- [x] T071 [P] Add cross-layer failure injection in `tests/f013/integration/invitation-failure-injection.test.mjs` for policy/session/workspace authority load, every create/resend/revoke/accept statement, provider dispatch/callback, lost responses, continuation expiry, focus refresh, process restart, concurrent windows/devices/sessions, clock/locale changes, and original-operation/current-generation reconciliation
- [x] T072 [P] Add migration/rollback/re-enable tests in `tests/f013/integration/invitation-rollback.test.mjs` proving active memberships and F009 evidence remain intact, legacy raw tokens stay invalid, legacy invited rows never gain authority, absent policy/provider disables entry, F013 grants/routes/dispatch can be disabled without dropping history or memberships, and compatible re-enable reconciles original operations
- [x] T073 [P] Implement redacted evidence collection in `tooling/f013/evidence.mjs` with requirement/scenario/SC IDs, commit/build, schema/protocol/policy/provider-fixture versions, OS/browser/database/locale/AT, command or manual journey, expected/observed result, artifact checksum, defects, reviewer/date, and separate database/synthetic-provider/hosted/native/accessibility/usability/real-provider/owner/merge/release statuses
- [x] T074 Run all focused F013 suites and F003–F012 regressions plus typecheck, lint, build, security, docs, and desktop checks from `specs/013-member-invitations/quickstart.md`; record only observed commands/results and unresolved blockers in `docs/qa/F013.md`
- [x] T075 Run the real local PostgreSQL/Supabase constraint, privilege, RLS, 32-way concurrency, failpoint, rollback, advisor, and query-plan matrix from `specs/013-member-invitations/quickstart.md`, recording the exact synthetic policy/provider and leaving hosted/real-provider readiness unclaimed in `docs/qa/F013.md`
- [x] T076 Execute the authorized hosted sandbox and Windows/macOS/Linux packaged journeys, fluent Arabic and NVDA/VoiceOver/Linux assistive-technology review, CSP/referrer/cache/cookie/CSRF observations, and SC-011–SC-014 usability protocol from `specs/013-member-invitations/quickstart.md`; append separate results to `docs/qa/F013.md` and leave every inaccessible host/provider/platform/reviewer as blocked rather than inferred
- [x] T077 Update implementation, configuration, legacy-hardening, identity binding, delivery truth, retention, recovery, rollback, privacy, and support guidance in `docs/features/F013.md`, keeping synthetic policy, local database proof, hosted sandbox, real provider, packaged native, customer-data readiness, owner approval, merge, and release as distinct statuses
- [x] T078 Update F013 traceability and current status in `docs/planning/coverage.md` and `plan.md` only from T074–T077 evidence; do not mark delivery complete for documentation, synthetic-only checks, absent F010 hosted capability, missing native/provider/reviewer targets, unresolved Q-02/Q-05/Q-08/Q-13 gates, or blocking defects

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No implementation dependency; T001 is the authorization/policy gate for all later work.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks every user story. T007–T012 share one migration and execute sequentially; T013, T015–T017 can proceed in parallel after T005–T006; T018–T019 validate the completed foundation.
- **US1 (Phase 3)**: Depends on Foundation. Produces invitations that later stories can consume.
- **US2 (Phase 4)**: Depends on Foundation and a completed F010 hosted sign-in surface. It is independently testable with seeded invitations; integrated end-to-end value follows US1.
- **US3 (Phase 5)**: Depends on Foundation. It is independently testable with a seeded pending invitation; integrated administration follows US1 and acceptance-race coverage integrates US2.
- **US4 (Phase 6)**: Depends on Foundation. It is independently testable with seeded history; complete operational history integrates US1–US3.
- **US5 (Phase 7)**: Test/schema work can begin after Foundation; completion depends on the native and hosted surfaces from US1–US4.
- **Phase 8 — Polish**: Depends on every story included in the intended delivery slice.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 -> US2
                    \-> US3
                    \-> US4
US1 + US2 + US3 + US4 -> US5 -> Polish
```

US2, US3, and US4 use seeded fixtures to remain independently testable after Foundation. The arrows show the recommended integrated delivery order, not a requirement to fabricate earlier story completion.

### Within Each User Story

- Write the story tests first and confirm they fail for the intended missing behavior.
- Complete database constraints/functions before service or endpoint integration.
- Complete service/endpoint behavior before bridge and UI integration.
- Reconcile unknown outcomes before issuing a replacement operation.
- Finish the independent test and checkpoint before moving to the next priority.

---

## Parallel Examples

### User Story 1

```text
Task: T020 — create/policy contract tests in tests/f013/unit/invitation-create.test.mjs
Task: T021 — create atomicity tests in tests/f013/service/invitation-create-atomicity.test.mjs
Task: T022 — create reconciliation tests in tests/f013/service/invitation-create-reconciliation.test.mjs
Task: T023 — recipient/contact separation tests in tests/f013/integration/invitation-recipient-binding.test.mjs
Task: T024 — invite dialog tests in tests/f013/ui/invite-member-dialog.test.mjs
```

### User Story 2

```text
Task: T031 — fragment exchange tests in tests/f013/integration/invitation-fragment-exchange.test.mjs
Task: T032 — verified-recipient review tests in tests/f013/integration/invitation-review-identity.test.mjs
Task: T033 — acceptance atomicity tests in tests/f013/service/invitation-acceptance-atomicity.test.mjs
Task: T034 — acceptance concurrency tests in tests/f013/service/invitation-acceptance-concurrency.test.mjs
Task: T035 — hosted review UI tests in tests/f013/ui/hosted-invitation-redemption.test.mjs
```

### User Story 3

```text
Task: T041 — resend rotation tests in tests/f013/service/invitation-resend.test.mjs
Task: T042 — revoke/race tests in tests/f013/service/invitation-revoke-races.test.mjs
Task: T043 — delivery adapter tests in tests/f013/unit/invitation-delivery.test.mjs
Task: T044 — callback tests in tests/f013/integration/invitation-delivery-callback.test.mjs
Task: T045 — administration action UI tests in tests/f013/ui/invitation-actions.test.mjs
```

### User Story 4

```text
Task: T052 — cursor/status tests in tests/f013/service/invitation-list.test.mjs
Task: T053 — privacy tests in tests/f013/service/invitation-privacy.test.mjs
Task: T054 — evidence tests in tests/f013/integration/invitation-evidence.test.mjs
Task: T055 — native list UI tests in tests/f013/ui/invitation-status-list.test.mjs
```

### User Story 5

```text
Task: T061 — localization parity tests in tests/f013/ui/localization-parity.test.mjs
Task: T062 — native accessibility tests in tests/f013/ui/invitation-accessibility.test.mjs
Task: T063 — hosted accessibility tests in tests/f013/ui/hosted-invitation-accessibility.test.mjs
Task: T064 — packaged Electron journey in tests/verification/desktop/f013-member-invitations.spec.mjs
Task: T065 — usability protocol in docs/qa/F013-usability-protocol.md
Task: T066 — English localization in packages/localization/src/shell/types.ts and packages/localization/src/shell/en.ts
Task: T067 — Arabic localization in packages/localization/src/shell/ar.ts
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and stop if authorization or any prerequisite/policy gate is absent.
2. Complete Phase 2 and prove legacy invalidation, private privileges, and secret handling.
3. Complete US1 and validate it independently as a pending-invitation demo with zero membership.
4. Complete US2 for the minimum usable end-to-end invitation slice: create, review, accept once, and discover membership through F012.
5. Do not enable production offers or public delivery from synthetic/local success.

### Incremental Delivery

1. Setup + Foundation → closed secure substrate.
2. US1 → safe recipient-bound invitation creation.
3. US2 → intended-identity review and exactly-once acceptance.
4. US3 → resend rotation, delivery truth, and revocation.
5. US4 → bounded administrative status and redacted evidence.
6. US5 → complete bilingual accessible parity.
7. Polish → observed database, hosted, native, provider, usability, and governance evidence.

### Parallel Team Strategy

After Foundation, separate contributors may prepare story tests and fixture-driven implementations for US2–US4 in parallel, but shared edits to `supabase/migrations/20261023000013_f013_member_invitations.sql`, `app/main/invitations/coordinator.ts`, bridge files, `InvitationStatusList.tsx`, hosted routing, and localization must follow task order or be serialized. US5 completes only after the surfaces it audits exist.

---

## Traceability Summary

| Slice                      | Requirements                         | Acceptance | Primary tasks |
| -------------------------- | ------------------------------------ | ---------- | ------------- |
| Create and explicit access | FR-001–FR-008, FR-020, FR-024–FR-028 | A-01–A-05  | T020–T030     |
| Hosted review and accept   | FR-009–FR-014, FR-020, FR-023–FR-028 | A-06–A-11  | T031–T040     |
| Resend, delivery, revoke   | FR-014–FR-020, FR-024–FR-027         | A-12–A-16  | T041–T051     |
| Status, privacy, evidence  | FR-021–FR-024, FR-026–FR-028         | A-17–A-20  | T052–T060     |
| Bilingual accessibility    | FR-027–FR-028                        | A-21–A-23  | T061–T070     |
| Cross-cutting proof        | SC-001–SC-014, Constitution I–VIII   | All        | T071–T078     |

## Notes

- `[P]` means different files and no dependency on another incomplete task in the same phase; it does not authorize unsynchronized edits to shared files.
- Every story test uses synthetic recipients/policies/providers unless a later approved task explicitly records otherwise.
- F013 adds no dependency, generic queue, automatic retry worker, Realtime subscription, search/count/detail endpoint, role editor, offline mutation, or membership-removal action.
- Stop at any checkpoint when an entry gate, secret scan, privilege test, atomicity test, identity match, accessibility check, or provider/native evidence target fails.
