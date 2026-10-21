---
description: "Task list for F011 MFA and Account Recovery"
---

# Tasks: F011 — MFA and Account Recovery

**Input**: Design documents from `/specs/011-mfa-account-recovery/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/), completed F010 hosted/native implementation and evidence, and the Q-02/Q-07/Q-08/F029 gates named below

**Authorization**: This file is a documentation artifact. It does not authorize implementation, provider provisioning, sender/domain setup, hosted deployment, public recovery, support access, or release.

**Tests**: Test tasks are included because every user story defines an independent test and F011 requires replay, concurrency, recovery, privacy, English/Arabic, accessibility, and three-target native evidence.

**Organization**: Tasks are grouped by user story. Each story has an independently runnable synthetic test slice after the shared foundation, while the recommended implementation order minimizes edits to the same identity files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on another incomplete task in the phase
- **[Story]**: Maps to the five user stories in `spec.md`
- Every checklist item includes an exact file path

## Path Conventions

- Desktop main/preload/renderer: `app/main/`, `app/preload/`, `app/renderer/`, `app/shared/`
- Shared contracts/localization: `packages/contracts/`, `packages/localization/`
- Hosted identity surface: `web/auth/` (must first exist through F010)
- Service migrations/functions: `supabase/migrations/`, `supabase/functions/`
- Verification: `tooling/f011/`, `tests/f011/`, `tests/verification/desktop/`, `verification/`
- Evidence and operating notes: `docs/features/F011.md`, `docs/qa/F011.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the entry gates and fixed verification surface without adding a dependency or selecting an open production policy.

- [X] T001 Record the implementation entry decision in `docs/features/F011.md`: verify the F010 hosted surface and UI/native callback evidence exist; record exact SDK/Auth/project capability identity, synthetic-project owner, redirect allowlist, policy version, Q-08 approval for TOTP/experimental recovery codes/reauthentication/session consequences/limits/escalation, Q-02 sender/domain/cost readiness, Q-07 local-key limits, and F029 native callback status; mark all later tasks blocked instead of inventing any missing value
- [X] T002 [P] Add fixed scripts `test:f011`, `test:f011:policy`, `test:f011:mfa`, `test:f011:recovery`, `test:f011:security`, `test:f011:reconciliation`, `test:f011:boundary`, `test:f011:privacy`, and `test:f011:ui` to `package.json`, each selecting a fixed suite through `node tooling/f011/verify.mjs`
- [X] T003 [P] Create the fail-on-empty fixed-suite runner in `tooling/f011/verify.mjs`, following the existing F010 runner and rejecting unknown suite IDs, missing files, or zero selected tests
- [X] T004 [P] Register the F011 suites, FR-001–FR-028, A-01–A-25, required test files, and required evidence artifacts in `verification/suites.v1.json` so missing coverage cannot report success
- [X] T005 Implement the isolated provider capability probe in `tooling/f011/capability-probe.mjs`: record pinned SDK/Auth/project/config/time, TOTP enroll/challenge/verify/list/unenroll, AAL transitions, recovery-code generate/status/verify/regenerate/unenroll, one-time consumption, old-set invalidation, session/sign-out effects, acknowledgment timing, and rate-limit boundary; redact all secret values and fail closed on absent/ambiguous behavior
- [X] T006 [P] Add probe self-tests in `tests/f011/unit/capability-probe.test.mjs` for missing configuration, unsupported/partial capability, ambiguous outcome, redaction, exact version capture, rate-limit observations, and refusal to treat SDK types or documentation as runtime proof

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the closed policy, state, persistence, reconciliation, protected handoff, fixtures, and secret boundary required by every story.

**⚠️ CRITICAL**: Do not start this phase unless T001 records every implementation gate as satisfied and T005 produces an approved redacted probe result. No story work starts until this phase passes.

- [X] T007 Define versioned `IdentitySecurityPolicy` and `SessionConsequence` contracts and closed validators in `app/shared/identity-security-contracts.ts`; preserve every policy rule verbatim: `policy_version` is an "Immutable identifier included in operations/evidence"; `factor_requirement` is `unavailable`, `optional`, or `required`; `factor_types` says "F011 baseline is exactly `totp`"; `recovery_method` is "`provider_recovery_codes` only after capability approval"; `reauth_purposes` is "Supported sensitive operation purposes"; `attempt_policy_ref` is "Approved provider/service limit profile; no secret thresholds in client input"; `session_consequence_profile` is "Approved expected sign-out/reauth behavior"; `primary_recovery_profile` is "Approved password or equivalent provider recovery path"; `manual_escalation_profile` is "Present only after verified Q-08 support procedure"; `effective_at` is "Authoritative activation instant"; consequence values are exactly those in `data-model.md`, with `workspace_authority = must_revalidate` and only a closed renderer next action
- [X] T008 [P] Define the trusted `ProviderSecurityProjection` in `app/main/identity/account-security.ts` with the data-model constraints verbatim: issuer/subject "Must match F010's verified account"; session "Must be live for the account"; AAL is `aal1` or `aal2` and other values fail; factor summaries contain "Non-secret factor ID/type/status/friendly name/timestamps only"; recovery status is exactly `unsupported | not_generated | available | exhausted | unknown`; provider time is "Used only within bounded freshness rules"; capability version is the "Exact probed SDK/server/project capability identity"; prohibit every secret/raw field listed in `data-model.md`
- [X] T009 Implement `AccountSecurityState` and `IdentitySecurityOperation` in `supabase/migrations/20261021000011_f011_identity_security.sql` with every field rule from `data-model.md` verbatim: state account identity is "Derived from verified session; never caller-selected"; generation "Starts at 1 and increases on each accepted security-changing operation"; policy is "Approved policy used for the current state"; setup says "See lifecycle below" and uses exactly the nine listed lifecycle values; recovery handoff is exactly `not_required | not_generated | ack_pending | acknowledged | rotation_unknown`; factor reference is "Safe opaque reference only; no secret or display payload"; capability is "Capability proven for the accepted state"; last operation is "Latest accepted F011 operation"; consequence is "Safe aggregate, not a session/token list"; update time is "Server authoritative"; operation ID is "Created once by trusted main/hosted coordination"; operation account is "Foreign key to `AccountSecurityState`; derived server-side"; purpose is "Closed values below" and uses exactly the ten listed purposes; expected generation "Must equal current generation when claimed"; digest "Reuses F009 canonical idempotency convention"; policy is "Policy used to admit the operation"; status says "Lifecycle below"; provider effect is exactly `not_started | not_observed | observed_applied | observed_not_applied | unknown`; provider reference is "Optional opaque factor/recovery reference only"; session consequence is "Actual safe provider consequence after reconciliation"; reason is "Closed application reason, never raw provider text"; operation times are "Server authoritative; `expires_at > created_at`"; completed time is "Required only for terminal accepted/rejected/cancelled status"; also enforce the exact retry, changed-input, generation, acknowledgment, unknown-effect, short-transaction, index, private-schema, RLS, and revoke invariants stated below those tables
- [X] T010 Extend the append-only evidence schema in `supabase/migrations/20261021000011_f011_identity_security.sql`: add nullable identity-operation linkage with event-family linkage checks/partial uniqueness, closed F011 event/consequence fields, policy/capability/generation/reason/times/diagnostic metadata, preserve legacy F010 rows and immutability, and prohibit every secret, digest-derived guessing hint, public recovery identifier, network/path/customer field, or unrestricted metadata value listed in `data-model.md`
- [X] T011 [P] Extend `app/main/identity/protected-identity-store.ts` with `ProtectedSecurityHandoff` using the data-model constraints verbatim: unsupported `format_version` is rejected without replacement; profile reference matches the F010 protected profile; profile/session generations are late-result fences; operation/purpose match one admitted operation; expected generation matches before apply; destination is closed, never an arbitrary URL; lifecycle is exactly `pending | returned | reconcile_required | terminal safe state`; lifetime is bounded; every prohibited code/seed/password/token/cookie/provider/account-identifier/URL field is absent
- [X] T012 Implement the four closed service messages and short transaction/reconciliation rules in `supabase/functions/_shared/account-security.ts` and register only `identity.security.getState`, `identity.security.begin`, `identity.security.observe`, and `identity.security.acknowledgeRecoveryCodes` in `supabase/functions/command-gateway/index.ts`; derive account/live session/AAL/provider state server-side, keep provider calls outside locks, validate exact generation/policy/digest, and commit state plus evidence once
- [X] T013 [P] Extend approved identity configuration parsing in `app/main/identity/config.ts` for one versioned policy, exact capability identity, allowlisted hosted security purposes/destinations, bounded lifetimes, and named sign-out scope; fail closed on missing, unsupported, contradictory, stale, sandbox-as-production, or unapproved values
- [X] T014 [P] Extend the closed redacted evidence types/projectors in `packages/contracts/src/identity-evidence.ts` with only the `IdentitySecurityEvidence` allowlist from `data-model.md`; reject unknown fields and never fall back to raw provider payload/error serialization
- [X] T015 [P] Create synthetic policy/provider/session/factor/recovery/operation/profile fixtures in `tests/f011/fixtures/security-fixtures.mjs` for accounts A/B, every closed state, valid/stale generations, exact/max+1 bounds, English/Arabic labels, missing local key, and distinctive prohibited-secret canaries
- [X] T016 [P] Add policy/contract tests in `tests/f011/unit/identity-security-contracts.test.mjs` for exact keys, enums, bounds/max+1, versions, plain-data copies, missing/contradictory policy, unsupported factor/capability, secret-shaped fields, arbitrary URL/action/account/session/provider authority, and F010 contract/denylist compatibility
- [X] T017 Add real PostgreSQL migration/privilege tests in `tests/f011/service/account-security-schema.test.mjs` for constraints, exact retry versus changed digest/account/purpose/generation, row-lock races, indexes, RLS/revokes, short transactions, immutable F010/F011 evidence, and denial through `PUBLIC`, `anon`, and `authenticated`
- [X] T018 Extend `tooling/verification/security.mjs` with F011 canary scanning across source/built renderer and preload, hosted returns, URLs after completion, logs, database/evidence, analytics/crash/support/export fixtures, screenshots/videos, notifications, and CI artifacts; permit a secret only in the provider-owned live hosted entry/display surface

**Checkpoint**: Closed contracts, private schema, exact-operation reconciliation, protected handoff, fixtures, and secret scanning fail closed without a custom factor/recovery subsystem.

---

## Phase 3: User Story 1 — Enroll a Configured Additional Factor (Priority: P1) 🎯 MVP Demo

**Goal**: Reauthenticate, enroll and verify one approved TOTP factor, show one provider-owned recovery-code set once, and become product-ready only after explicit acknowledgment.

**Independent Test**: With one synthetic verified F010 account and approved sandbox policy, complete enrollment/acknowledgment, then repeat cancellation, invalid proof, expiry, duplicate/concurrent completion, response loss, and restart. Only one verified-and-acknowledged flow becomes `ready`; no code crosses native boundaries or can be redisplayed.

### Tests for User Story 1 — write first and confirm failure

- [X] T019 [P] [US1] Add provider-adapter tests in `tests/f011/unit/provider-security-adapter.test.mjs` for recent proof, one TOTP factor, enroll/challenge/verify/list, AAL/live-session checks, recovery-code generate/status, provider-active versus product-pending state, unsupported capability, and sanitized failures
- [X] T020 [P] [US1] Add service tests in `tests/f011/service/factor-enrollment.test.mjs` for expected generation/digest admission, provider observation, duplicate/concurrent accept, one generation increment, `recovery_codes_pending`, stale acknowledgment denial, acknowledgment-to-`ready` without another increment, and one evidence effect
- [X] T021 [P] [US1] Add restart/failure tests in `tests/f011/integration/factor-enrollment.test.mjs` for cancel/expiry/invalid proof, close or response loss before/after verification/generation/acknowledgment, two windows/devices, protected-handoff corruption, and no empty-profile replacement
- [X] T022 [P] [US1] Add hosted/native UI tests in `tests/f011/ui/factor-enrollment.test.mjs` for required/optional policy, browser-context announcement, one-time code display confined to hosted UI, explicit save acknowledgment, pending-versus-ready wording, focus recovery, and no secret in DTO/IPC/log output

### Implementation for User Story 1

- [X] T023 [US1] Extend `app/main/identity/provider-adapter.ts` with typed trusted TOTP enroll/challenge/verify/list and recovery-code generate/status observations, deriving the current verified account/live session/AAL and mapping raw provider output to `ProviderSecurityProjection` without exposing secrets or raw errors
- [X] T024 [US1] Add allowlisted enrollment, verification, one-time recovery-code display, and acknowledgment purposes to `web/auth/security.ts` and route them through the existing F010 hosted `web/auth/App.tsx`; keep secrets/provider sessions hosted and emit only the inert `operation_reference + purpose + result_hint` return grammar
- [X] T025 [US1] Implement factor-enrollment and recovery-code-acknowledgment outcomes in `supabase/functions/_shared/account-security.ts`: independently observe provider state, set `recovery_codes_pending` after verified factor, set `ready` only after matching acknowledgment, converge identical retries, and preserve prior security state on cancel/failure/stale generation
- [X] T026 [US1] Implement `AccountSecurityCoordinator` and bounded service calls in `app/main/identity/account-security.ts` and `app/main/identity/account-security-service.ts`, compose them into `app/main/identity/coordinator.ts`, stage/reconcile T011 handoffs, and drop late profile/session/security-generation results
- [X] T027 [US1] Expose only `identitySecurity.getState`, `identitySecurity.start`, `identitySecurity.cancel`, `identitySecurity.acknowledgeRecoveryCodes`, `identitySecurity.retryReconciliation`, and `identitySecurity.onStateChanged` through `app/main/bridge.ts`, `app/preload/preload.ts`, and `app/renderer/env.d.ts`, then add the safe enrollment/readiness UI in `app/renderer/components/identity/AccountSecurityPanel.tsx` with matching English/Arabic keys in `packages/localization/src/shell/en.ts` and `packages/localization/src/shell/ar.ts`; accept no secret, URL, account, factor, session, workspace, role, or policy override field

**Checkpoint**: US1 independently proves verified enrollment plus one-time recovery-code acknowledgment. It is an MVP demo only; US2 and US3 remain required for a complete F011 security/recovery slice.

---

## Phase 4: User Story 2 — Complete an MFA Challenge Safely (Priority: P1)

**Goal**: Bind one valid factor proof to the exact sign-in or reauthentication attempt while invalid, replayed, stale, revoked, rate-limited, and offline attempts grant nothing.

**Independent Test**: Challenge one active-factor account for sign-in and reauthentication; one valid response advances only its originating attempt, while wrong/expired/replayed/cross-account/cross-purpose/rate-limited/revoked/offline responses yield zero authority.

### Tests for User Story 2 — write first and confirm failure

- [X] T028 [P] [US2] Add challenge binding tests in `tests/f011/unit/mfa-challenge.test.mjs` for account/factor/originating-attempt/purpose/expiry/live-session/security-generation binding, one-time completion, malformed/invalid/replayed/cross-account/cross-purpose proof, and no reusable grant
- [X] T029 [P] [US2] Add online-authority tests in `tests/f011/integration/mfa-challenge.test.mjs` for revoked session, generation change during proof, provider/service outage, device-clock skew, callback replay, profile switch, exact safe next actions, and refusal to use cached/local success
- [X] T030 [P] [US2] Add abuse-boundary tests in `tests/f011/integration/mfa-abuse.test.mjs` for the approved provider threshold, threshold+1, concurrency, backoff, neutral unauthenticated behavior, and an available recovery route without a second application rate-limit store

### Implementation for User Story 2

- [X] T031 [US2] Add the purpose-bound hosted challenge flow to `web/auth/security.ts`, binding provider proof to the admitted operation/account/purpose/attempt and returning no proof value or provider detail to native code
- [X] T032 [US2] Extend `app/main/identity/provider-adapter.ts` and `app/main/identity/account-security.ts` to observe sufficient current AAL/live session for the exact challenge, advance only the originating attempt, discard stale generations/callbacks, and map outages/revocation/limits to closed safe outcomes
- [X] T033 [US2] Add challenge/waiting/expiry/rate-limit/recovery states to `app/renderer/components/identity/AccountSecurityPanel.tsx` and their typed English/Arabic messages in `packages/localization/src/shell/en.ts` and `packages/localization/src/shell/ar.ts`, with one safe next action and no account/factor enumeration

**Checkpoint**: US2 independently proves one purpose-bound challenge and zero authority from every invalid, stale, replayed, revoked, or offline case.

---

## Phase 5: User Story 3 — Recover Cloud Account Access (Priority: P1)

**Goal**: Recover one verified cloud identity through an unused provider recovery code or approved primary-credential flow while preserving the distinction between identity, sessions, workspace authority, local keys, and unsynchronized data.

**Independent Test**: Recover once by unused code and once by the approved credential flow; wrong/replayed/expired/changed/concurrent evidence has no effect, response loss reconciles once, and a missing local key leaves encrypted local bytes untouched and unavailable.

### Tests for User Story 3 — write first and confirm failure

- [X] T034 [P] [US3] Add recovery-code tests in `tests/f011/integration/recovery-code.test.mjs` for one-time matching use, replay/wrong-account/changed-character/whitespace/Arabic presentation/exhausted/concurrent denial, AAL2 upgrade, factor reset/re-enrollment state, regeneration invalidating all old unused codes, and no local/admin bypass
- [X] T035 [P] [US3] Add neutral primary-recovery tests in `tests/f011/integration/primary-recovery.test.mjs` for existing/absent/disabled/ineligible/rate-limited identifiers, identical visible status/wording/redirect/shape within approved timing tolerance, one-time exact-destination artifacts, passwordless equivalent, sender failure, and no delivery promise
- [X] T036 [P] [US3] Add interruption and local-boundary tests in `tests/f011/integration/recovery-reconciliation.test.mjs` for lost response/restart, concurrent password recovery and factor challenge, obsolete artifacts, revoked membership, account A/B isolation, current key present/missing, preserved encrypted bytes, no empty replacement, and no restored device/offline/workspace/business authority

### Implementation for User Story 3

- [X] T037 [US3] Add provider recovery-code verification/regeneration and PKCE primary-credential recovery purposes to `web/auth/security.ts`, keeping codes/credentials/artifacts hosted, using neutral request responses, and requiring current provider authority before factor reset or replacement
- [X] T038 [US3] Extend `app/main/identity/provider-adapter.ts` with typed recovery-code verify/regenerate/status and primary-recovery observations; require proven AAL/live-session/session consequences, reconcile unknown results before retry, and never use provider admin factor deletion as the ordinary recovery path
- [X] T039 [US3] Implement `lost_factor_recover`, `primary_credential_recover`, and recovery-code rotation transitions in `supabase/functions/_shared/account-security.ts`: consume/rotate only through observed provider state, advance generation once, invalidate stale operations/artifacts, persist actual safe session consequences, and block replacement while provider effect is unknown
- [X] T040 [US3] Extend `app/main/identity/account-security.ts` and `app/main/identity/protected-identity-store.ts` to resume the original operation after restart, revalidate account/profile/session/generation/local protection, return `local_unlock_required` or `local_recovery_required` for missing keys, and preserve unreadable encrypted bytes without relabeling or upload
- [X] T041 [US3] Add recovery, reconciliation, session-consequence, workspace-revalidation, and local-key limitation UI to `app/renderer/components/identity/AccountSecurityPanel.tsx` with matching keys in `packages/localization/src/shell/en.ts` and `packages/localization/src/shell/ar.ts`; never claim local-only work, membership, permissions, device approval, or remote data deletion was recovered

**Checkpoint**: US3 independently proves one cloud-identity recovery effect with truthful session/local-data consequences and no local-key or workspace-authority escalation.

---

## Phase 6: User Story 4 — Reauthenticate for Security Changes (Priority: P2)

**Goal**: Require fresh purpose-bound proof for factor, recovery-code, credential, email/recovery-identity changes and make older pending actions stale after any newer security generation.

**Independent Test**: Attempt every supported security change with fresh, stale, expired, recovery-limited, wrong-purpose, and concurrently revoked proof; only fresh sufficient proof commits one change and reports observed session consequences.

### Tests for User Story 4 — write first and confirm failure

- [X] T042 [P] [US4] Add sensitive-change tests in `tests/f011/integration/security-changes.test.mjs` for factor disable/replace, code regeneration, password/email/recovery-identity change, fresh versus stale/expired/wrong-purpose proof, recovery-limited sessions, and explicit sign-out scope
- [X] T043 [P] [US4] Add generation/concurrency tests in `tests/f011/service/security-change-atomicity.test.mjs` for two simultaneous changes, first accepted increment, second stale rejection, identical retry convergence, changed-digest rejection, provider-first/SoloDesk-stale divergence, and one state/evidence/consequence commit
- [X] T044 [P] [US4] Add evidence/notification privacy tests in `tests/f011/integration/security-evidence.test.mjs` for type/time/safe label/outcome/correlation/generation/consequence/next-action allowlists and zero code/credential/token/raw-provider/local-data leakage

### Implementation for User Story 4

- [X] T045 [US4] Add purpose-bound hosted reauthentication and supported sensitive-change flows to `web/auth/security.ts`, requiring current AAL plus provider reauthentication where supported and using explicit rather than default sign-out scope
- [X] T046 [US4] Extend `app/main/identity/provider-adapter.ts` and `supabase/functions/_shared/account-security.ts` for the exact factor/credential/recovery-identity change purposes, independently observe the provider effect, advance generation once, reject stale work, and record actual rather than assumed session consequences
- [X] T047 [US4] Extend `app/main/identity/account-security.ts` to invalidate late local work after security-generation/session changes, refresh or downgrade AAL after factor removal, reconcile provider-first effects, and emit only the closed `SessionConsequence`
- [X] T048 [US4] Add reauthentication, confirmation, stale-action, session-impact, and safe-notification states to `app/renderer/components/identity/AccountSecurityPanel.tsx` and English/Arabic localization files `packages/localization/src/shell/en.ts` and `packages/localization/src/shell/ar.ts`, naming consequences before confirmation without embedding privileged undo actions

**Checkpoint**: US4 independently proves that an unattended or stale session cannot weaken current account security and that every accepted change has one redacted evidence effect.

---

## Phase 7: User Story 5 — Recover in English or Arabic Accessibly (Priority: P2)

**Goal**: Complete every F011 state in English and Arabic with safe bidi rendering, keyboard and assistive-technology operation, visible focus, semantic announcements, contrast, reduced motion, and 200% zoom/reflow.

**Independent Test**: Complete enrollment, challenge, code recovery/rotation, primary recovery, reauthentication, failure, reconciliation, session consequence, and missing-local-key paths in both languages using keyboard-only and native screen readers at 200% zoom.

### Tests for User Story 5 — write first and confirm failure

- [X] T049 [P] [US5] Add typed localization parity tests in `tests/f011/ui/localization-parity.test.mjs` for every hosted/native heading, instruction, warning, lifecycle, error, consequence, action, notification, and parameter schema; reject missing/extra keys and raw provider text
- [X] T050 [P] [US5] Add hosted accessibility/bidi tests in `tests/f011/ui/hosted-security.test.mjs` for logical RTL, LTR-isolated codes/emails/diagnostics/times, one semantic paste-friendly code input, intact underlying value/order, copy/download/print guidance, keyboard/focus/live-region behavior, contrast, reduced motion, and 200% zoom
- [X] T051 [P] [US5] Add native keyboard/screen-reader/focus/reflow journeys in `tests/verification/desktop/f011-account-security.spec.mjs` for browser context switch, return/cancel focus, non-color status, dialog trap/restore, safe announcements, local-data consequences, and every critical English/Arabic path
- [X] T052 [P] [US5] Define the SC-009–SC-011 participant timing and comprehension protocol, exclusions, language split, declared target, expected/observed fields, and privacy-safe evidence template in `docs/qa/F011-usability-protocol.md`

### Implementation for User Story 5

- [X] T053 [US5] Complete one typed F011 key/parameter schema and equivalent wording in `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts`; isolate mixed-direction values without normalization and include one honest next action for every failure/outcome-unknown state
- [X] T054 [US5] Complete semantic/focus/live-region/dialog/zoom/reduced-motion behavior in `app/renderer/components/identity/AccountSecurityPanel.tsx`, reusing house `Button`, `Dialog`, and `BdiText` components and retaining a non-pointer path for every required action
- [X] T055 [US5] Complete equivalent hosted semantics, focus, bidi, zoom, and secret-safe status behavior in `web/auth/App.tsx` and `web/auth/styles.css`, keeping one logical code input and never reading or persisting plaintext codes beyond the legitimate live handoff

**Checkpoint**: US5 independently passes automated parity/semantics checks and is ready for separate fluent-Arabic and native assistive-technology observation.

---

## Phase 8: Polish & Cross-Cutting Verification

**Purpose**: Prove the integrated slice, document only observed evidence, and preserve reversible rollback without changing provider security state.

- [X] T056 [P] Add failure injection across protected staging, browser launch, provider effect, inert return, trusted observation, database commit, protected final state, and renderer event delivery in `tests/f011/integration/failure-injection.test.mjs`; cover restart, second instance, policy/capability change, timeout, response loss, clock skew, and original-operation reconciliation
- [X] T057 [P] Add rollback/re-enable tests in `tests/f011/integration/rollback.test.mjs` proving feature entry points can be disabled without deleting/changing factors, codes, sessions, encrypted profiles, operation/evidence rows, or F010 behavior, and compatible re-enable reconciles before exposing actions
- [X] T058 Run the approved capability probe, all focused suites, F003–F010 regressions, typecheck, lint, build, security/docs checks, and desktop suite; record only observed commands/results, exact build/policy/capability versions, defects, blockers, and SC-001–SC-013 dispositions in `docs/qa/F011.md`
- [X] T059 Execute the approved hosted/native acceptance matrix on declared Windows, macOS, and Linux targets in English and Arabic, including fluent review, native assistive technology, SC-009–SC-011 timing/comprehension, callback/signature evidence, and sender/provider limits; append separate target observations to `docs/qa/F011.md` and leave unavailable targets as blockers
- [X] T060 Update implementation/operations/rollback/secret-redaction/support guidance in `docs/features/F011.md`, keeping provider capability, local/service automation, hosted sandbox, packaged-native evidence, production enablement, and public support/release approval as distinct statuses
- [X] T061 Update F011 traceability and current status in `docs/planning/coverage.md` and `plan.md` only from T058–T060 evidence; do not mark the root exit gate complete for documentation, synthetic-only checks, missing targets, unresolved Q-08/Q-02/Q-07/F029 gates, or blocking defects

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 is the hard gate; T002–T006 may prepare verification/probe tooling, but no application/service implementation proceeds on a failed gate
- **Foundational (Phase 2)**: Depends on a passed T001 decision and approved T005 probe; blocks every user story
- **US1 (Phase 3)**: Depends on Foundation and establishes the shared hosted/native enrollment path
- **US2 (Phase 4)**: Independently testable after Foundation; recommended after US1 because it extends the same provider, hosted, coordinator, panel, and localization files
- **US3 (Phase 5)**: Independently testable after Foundation; recommended after US1/US2 because it reuses their AAL/challenge and shared recovery surface
- **US4 (Phase 6)**: Depends on the US2 current-proof boundary and US3 generation/session-consequence behavior
- **US5 (Phase 7)**: Depends on every user-visible state from US1–US4
- **Polish (Phase 8)**: Depends on all desired stories; T059 additionally requires approved external sandbox/native targets and T061 depends on the recorded evidence

### User Story Dependencies

- **US1 (P1)**: No dependency on another story; proves factor enrollment and recovery-code acknowledgment
- **US2 (P1)**: No behavioral dependency on another story beyond Foundation; uses an active-factor fixture and proves challenge isolation
- **US3 (P1)**: No behavioral dependency on another story beyond Foundation; uses active-factor/recovery fixtures and proves cloud/local separation
- **US4 (P2)**: Uses the challenge and recovery generation/session rules established by US2/US3
- **US5 (P2)**: Covers the complete UI state set from US1–US4

### Within Each User Story

- Write the listed story tests first and confirm they fail for the intended missing behavior
- Hosted/provider effect precedes trusted observation; trusted observation precedes the short state/evidence commit
- Service state and reconciliation precede native renderer success state
- Localization and accessibility are part of each user-visible implementation, with US5 providing complete cross-flow verification
- Finish the story checkpoint before moving to the next story in the recommended sequence

### Parallel Opportunities

- Setup tasks T002–T004 and T006 touch separate files
- Foundational model/config/evidence/fixture tasks T008, T011, and T013–T016 can proceed in parallel after the gate; T010 follows T009 because both edit the same migration
- Tests marked `[P]` within each story can be authored in parallel before implementation
- T056 and T057 can run in parallel after all stories; evidence execution T058 follows their inclusion
- Different stories should not edit the shared provider/hosted/coordinator/panel/localization files concurrently without explicit ownership; the recommended sequential merge order is US1 → US2 → US3 → US4 → US5

---

## Parallel Examples

### User Story 1

```text
Task T019: Provider enrollment/recovery-status adapter tests in tests/f011/unit/provider-security-adapter.test.mjs
Task T020: Enrollment state/idempotency tests in tests/f011/service/factor-enrollment.test.mjs
Task T021: Restart/failure tests in tests/f011/integration/factor-enrollment.test.mjs
Task T022: Hosted/native enrollment UI tests in tests/f011/ui/factor-enrollment.test.mjs
```

### User Story 2

```text
Task T028: Purpose-bound challenge tests in tests/f011/unit/mfa-challenge.test.mjs
Task T029: Online authority/revocation tests in tests/f011/integration/mfa-challenge.test.mjs
Task T030: Provider abuse-boundary tests in tests/f011/integration/mfa-abuse.test.mjs
```

### User Story 3

```text
Task T034: Recovery-code lifecycle tests in tests/f011/integration/recovery-code.test.mjs
Task T035: Neutral primary-recovery tests in tests/f011/integration/primary-recovery.test.mjs
Task T036: Reconciliation/local-key boundary tests in tests/f011/integration/recovery-reconciliation.test.mjs
```

### User Story 4

```text
Task T042: Sensitive-change tests in tests/f011/integration/security-changes.test.mjs
Task T043: Generation/concurrency tests in tests/f011/service/security-change-atomicity.test.mjs
Task T044: Evidence/notification privacy tests in tests/f011/integration/security-evidence.test.mjs
```

### User Story 5

```text
Task T049: Localization parity tests in tests/f011/ui/localization-parity.test.mjs
Task T050: Hosted accessibility/bidi tests in tests/f011/ui/hosted-security.test.mjs
Task T051: Native desktop accessibility journeys in tests/verification/desktop/f011-account-security.spec.mjs
Task T052: Usability/comprehension protocol in docs/qa/F011-usability-protocol.md
```

---

## Implementation Strategy

### MVP Demo (User Story 1)

1. Pass Phase 1 entry/capability gates
2. Complete Phase 2 Foundation
3. Complete Phase 3 US1
4. Stop and validate `npm run test:f011:policy`, `npm run test:f011:mfa`, and the one-time secret scan
5. Demo only in the approved synthetic sandbox; do not call this a complete recovery or production-ready release

### Smallest Complete F011 Slice

1. Complete Setup + Foundation
2. Add US1 enrollment/acknowledgment
3. Add US2 purpose-bound challenge
4. Add US3 cloud account recovery and local-key boundary
5. Stop and validate every P1 checkpoint before adding P2 security-change breadth

### Incremental Delivery

1. P1 stories US1–US3 establish the complete core factor/challenge/recovery loop
2. US4 adds the supported sensitive-change protections
3. US5 proves bilingual accessible parity across the final state set
4. Polish records evidence and rollback behavior without implying provisioning, public recovery, or release approval

---

## Notes

- `[P]` means different files and no dependency on another incomplete task in that phase
- `[USn]` maps each task to its user story for traceability
- T001 is a real stop gate: the currently absent `web/auth/` prerequisite must not be recreated ad hoc inside F011
- Provider-owned recovery codes are the only planned baseline; capability failure blocks implementation rather than authorizing custom recovery crypto/storage
- No task authorizes multiple factors, passkeys, remembered devices, workspace-specific MFA, a support bypass, a second rate-limit store, a microservice, or a generic identity-action executor
- Commit after each task or coherent dependent group; record evidence only after commands or observations actually run
