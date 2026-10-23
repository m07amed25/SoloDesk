---
description: "Task list for F010 Browser Sign-in and Native Enrollment"
---

# Tasks: F010 — Browser Sign-in and Native Enrollment

**Input**: Design documents from `/specs/010-browser-sign-in-enrollment/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md), [contracts/](contracts/), F004/F006/F007/F009 implementation evidence, and the Q-02/Q-07/Q-08/F029 gates named below

**Authorization**: This file is a documentation artifact. It does not authorize implementation, provider provisioning, public registration, hosted deployment, callback registration, or release.

**Tests**: Test tasks are included because every user story defines an independent test and the feature requires security, replay, recovery, isolation, English/Arabic, accessibility, and three-target native evidence.

**Organization**: Tasks are grouped by user story. Each story can be exercised independently with synthetic trusted fixtures after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on another incomplete task in the same phase
- **[Story]**: Maps to the five user stories in `spec.md`
- Every checklist item includes an exact file path

## Path Conventions

- Desktop main/preload/renderer: `app/main/`, `app/preload/`, `app/renderer/`, `app/shared/`
- Pure contracts/localization: `packages/contracts/`, `packages/localization/`
- Hosted sign-in surface: `web/auth/`
- Service migrations/functions: `supabase/migrations/`, `supabase/functions/`
- Verification: `tooling/f010/`, `tests/f010/`, `tests/verification/desktop/`, `verification/`
- Evidence and operating notes: `docs/features/F010.md`, `docs/qa/F010.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish explicit entry gates and the smallest verification/build surface without adding dependencies.

- [X] T001 Record the implementation entry decision in `docs/features/F010.md`: approved sandbox method, expected issuer/audience, hosted origin, callback transport/destination, attempt/bounds/rate/retention policy, Q-02/Q-07/Q-08 disposition, and F029 packaged-proof status; mark implementation blocked instead of inventing any missing value
- [X] T002 [P] Add fixed F010 scripts (`test:f010`, `test:f010:attempts`, `test:f010:enrollment`, `test:f010:isolation`, `test:f010:recovery`, `test:f010:ui`) to `package.json` using `node tooling/f010/verify.mjs <fixed-suite-id>` and no new dependency
- [X] T003 [P] Create the fail-on-empty F010 coordinator in `tooling/f010/verify.mjs`, following the existing F007/F009 runner pattern and refusing unknown suite IDs or zero discovered tests
- [X] T004 [P] Enroll the fixed F010 suites and expected artifacts in `verification/suites.v1.json` so the F002 harness cannot report success when F010 tests/evidence are absent

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the versioned trust boundary, configuration, protected identity store, fixtures, and redaction rules required by every story.

**⚠️ CRITICAL**: No user-story implementation starts until this phase passes focused contract tests.

- [X] T005 Define closed version-1 identity commands, results, events, validators, and renderer-safe DTOs in `app/shared/identity-contracts.ts`; include lifecycle exactly `locked | signing_in | enrolling | enrolled | sign_in_required | protection_unavailable | recovery_required`, expose no URL/path/token/code/verifier/state/nonce/device ID/workspace/role field, reject unknown keys, and reuse F003 `plainData`, bounds, IDs, and `PublicError`
- [X] T006 Define `LocalAccountProfile` and `ProtectedSessionBinding` in `app/shared/identity-contracts.ts` with data-model field constraints verbatim: profile `profile_id` is "App-generated stable opaque ID; not a renderer/provider path component", `issuer_id / subject_id` are "Optional until first verified binding; immutable once bound", `protection_binding_id` is "Opaque F006/F007 reference", `profile_generation` is "Positive monotonic value; incremented before sign-out/switch teardown", `compatibility_version` is "Supported local profile format", `lifecycle` is exactly `locked | signing_in | enrolling | enrolled | sign_in_required | protection_unavailable | recovery_required`, `last_transition_at` is "Local observation instant", and recovery/work status are optional safe classifications with no record data/count; session `binding_id` is opaque UUID, profile/account fields must match, `credential_reference` is "Opaque protected-store handle; never credential bytes", `session_generation` is positive monotonic, `status` is exactly `pending_commit | current | sign_in_required | invalidated | unavailable`, `protected_write_status` is exactly `not_started | committed | outcome_unknown | failed`, times/reason are optional, and only one current binding exists per profile generation
- [X] T007 [P] Implement approved identity configuration parsing in `app/main/identity/config.ts`: require exact HTTPS hosted origin/path, issuer, audience/client, callback destination profile, S256 support, bounds/lifetimes/rates, public publishable key only, and disabled public registration unless T001 records approval; fail startup closed on missing/unknown production values
- [X] T008 [P] Implement the main-only protected identity store in `app/main/identity/protected-identity-store.ts` by extending the F006 `ProtectionOwner` boundary: version attempt/session/profile records, derive all paths internally, preserve bytes on open/version/key failure, and never use renderer storage, ordinary workspace tables, plaintext fallback, or empty replacement
- [X] T009 [P] Define redacted identity evidence types/projectors in `packages/contracts/src/identity-evidence.ts` with data-model fields exactly: `evidence_id / schema_version` are "Stable UUID and supported version", `event_type` is a "Closed sign-in, enrollment, reconciliation, sign-out, or switch event", `outcome / safe_reason_code` are closed safe values, profile/device/attempt/intent/account references are optional safe or policy-approved pseudonymous references, `authoritative_at / local_observed_at` have distinguished time sources, and `correlation_id / diagnostic_id` are safe bounded references; unknown/sensitive fields abort or use an approved minimal projection and never fall back to raw serialization
- [X] T010 [P] Create synthetic identity/provider/profile fixtures in `tests/f010/fixtures/identity-fixtures.mjs` for accounts A/B, current/expired/superseded attempts, valid/invalid issuer/audience/nonce, protected-store states, service outcomes, Arabic/English labels, and distinctive prohibited-secret markers
- [X] T011 [P] Add foundational contract tests in `tests/f010/unit/identity-contracts.test.mjs` for exact keys, enum closure, version rejection, byte/field bounds, non-plain input, safe DTOs, and absence of every prohibited secret/authority field
- [X] T012 Add the F010 secret/evidence scan to `tooling/verification/security.mjs`, covering renderer/preload/built assets, URLs retained after completion, logs, local/service evidence, analytics/crash/support/export fixtures, and markers for passwords, codes, verifiers, raw state/nonce, tokens, cookies, raw callbacks, provider errors, service-role keys, and profile paths

**Checkpoint**: Shared contracts, protected storage, configuration, fixtures, verification enrollment, and redaction fail closed; story work can begin.

---

## Phase 3: User Story 1 — Sign In Through a Trusted Browser Flow (Priority: P1) 🎯 MVP

**Goal**: Start one system-browser authorization-code/PKCE attempt, accept exactly one matching inert return, and produce a verified account without exposing secrets or granting workspace authority.

**Independent Test**: Complete one configured sandbox sign-in and deliver valid, malformed, replayed, expired, superseded, cross-profile, wrong-issuer/audience and account-substitution returns. Exactly one current return yields the expected verified `(issuer, subject)`; all others have zero session, enrollment, navigation, command, workspace, cache, or protected-data effect.

### Tests for User Story 1

- [X] T013 [P] [US1] Add PKCE/attempt lifecycle unit tests in `tests/f010/unit/auth-attempts.test.mjs` covering S256-only generation, distinct high-entropy verifier/state/nonce, one pending attempt per profile generation, atomic supersession, cancellation, expiry, terminal immutability, and compare-and-set one-time consumption
- [X] T014 [P] [US1] Add callback grammar/property tests in `tests/f010/unit/auth-callback.test.mjs` covering `code` xor safe `error`, optional configured response issuer, duplicate/unknown/empty fields, fragments, control characters, malformed/ambiguous encoding, nested destinations, exact maximum bytes and maximum+1, wrong route/audience/profile/generation/state, and no-live-attempt denial
- [X] T015 [P] [US1] Add trusted exchange tests in `tests/f010/integration/session-owner.test.mjs` for signature/JWKS/algorithm, exact issuer, audience/authorized party, expiry/issued-at/skew, response issuer, nonce, one-time code/destination, `(issuer, subject)` identity, provider/network/cancel outcomes, protected storage, and zero workspace/cache creation
- [X] T016 [P] [US1] Add Electron ingress/browser-launch tests in `tests/f010/integration/browser-handoff.test.mjs` for exact hosted HTTPS allowlist, renderer-supplied URL denial, cold start, second instance, macOS `open-url`, loopback single request/close, and separation from ordinary F004 routes

### Implementation for User Story 1

- [X] T017 [US1] Implement `SignInAttempt` in `app/main/identity/auth-attempts.ts` with data-model field constraints verbatim: `attempt_id` is "Opaque UUID; unique", profile/generation are the app-owned local profile and positive generation captured at start, `protocol_version` is supported positive, `identity_method` is a closed configured method key, issuer/audience are exact configured references, state/nonce are non-reversible comparison/evidence values while raw values remain protected, challenge is `S256` plus safe reference while verifier is excluded, destination is a closed configuration key not arbitrary URL, times form a bounded window, `status` is exactly `pending | cancelled | expired | consumed | rejected | superseded`, and terminal metadata is optional/safe; enforce one pending attempt per profile generation, immutable terminal states, and `pending -> consumed | cancelled | expired | rejected | superseded`
- [X] T018 [US1] Implement attempt proof handling in `app/main/identity/auth-attempts.ts`: generate fresh PKCE verifier/challenge with S256 plus independent state and OIDC nonce, store raw proof only in memory or T008 protected storage, compare exact values in constant time where practical, invalidate superseded/cancelled proof, and never downgrade to `plain`
- [X] T019 [US1] Extend `app/main/links.ts` with a separate exact identity-return parser and intent type that applies raw size/character/field/duplicate/fragment/nested-destination bounds before lookup, cannot route or invoke commands, and leaves `solodesk://open/home` plus protected-record denials unchanged
- [X] T020 [US1] Implement system-browser handoff in `app/main/identity/browser-handoff.ts`: construct the start URL only from T007 trusted configuration and generated encoded parameters, revalidate exact HTTPS origin/path immediately before `shell.openExternal`, and manage an ephemeral loopback-IP listener only when that approved transport profile is selected
- [X] T021 [US1] Implement `VerifiedAccount` and main-only exchange/session validation in `app/main/identity/session-owner.ts` with data-model field constraints verbatim: `issuer_id / subject_id` are "Composite stable identity; unique", `verification_status` is `verified` for an accepted result, `display_name / display_identifier` are "Optional bounded allowlisted values; non-authoritative", `session_status` is exactly `current | sign_in_required | rejected | ended`, `verified_at` is the authoritative identity-result instant, and `diagnostic_id` is optional safe correlation; never use email as identity or ID token as API bearer
- [X] T022 [US1] Implement a main-only Supabase/provider adapter in `app/main/identity/provider-adapter.ts` using the installed client or built-in fetch/crypto, custom protected PKCE/session storage, exact redirect reuse, one-time `exchangeCodeForSession` semantics, pinned issuer/audience validation, and no renderer/browser-cookie/service-role secret handling
- [X] T023 [US1] Wire current-profile identity ownership into `app/main/main.ts`: route auth returns before ordinary links through one parser, bind every attempt/exchange to the current `ProfileOwners` epoch/generation, reject unknown profiles, and emit only the safe verified/waiting/error state
- [X] T024 [US1] Add named `identity.getState`, `identity.startSignIn`, `identity.cancelSignIn`, and identity state subscription handlers to `app/main/bridge.ts` plus the frozen safe facade in `app/preload/preload.ts`, reusing F004 sender/frame/origin/document/generation admission and unsubscribe disposal

**Checkpoint**: US1 independently reaches a safe verified-account state through the system browser; it does not enroll a device or create/open a workspace.

---

## Phase 4: User Story 2 — Enroll the First Device Safely (Priority: P1)

**Goal**: Bind one verified account, one service-recognized device and one protected local profile atomically enough that partial cloud/local failure never grants readiness or crosses account data.

**Independent Test**: With a synthetic verified account, enroll once on a clean protected profile, restart, then repeat with unavailable protection, account B against account A's profile, concurrent retries, and failpoints before/after service commit. Observe one device/profile binding or a locked recoverable state, never a duplicate or partial ready enrollment.

### Tests for User Story 2

- [X] T025 [P] [US2] Add migration/constraint tests in `tests/f010/service/enrollment-schema.test.mjs` for account-scoped intent digest equality, unique accepted intent/result, immutable receipt/evidence links, derived account ownership, forbidden raw secrets/roles/workspaces/paths, and the approved installation uniqueness rule
- [X] T026 [P] [US2] Add enrollment transaction and concurrency tests in `tests/f010/service/enrollment-atomicity.test.mjs` for identical retries, changed digest/account/installation context, simultaneous submissions, rollback at every statement, one enrollment/receipt/evidence commit, and no workspace-scoped placeholder claim
- [X] T027 [P] [US2] Add local readiness failpoint tests in `tests/f010/integration/enrollment-readiness.test.mjs` for protection denial, protected credential failure, profile-binding failure, service-confirmed/local-failed, local-staged/response-lost, account mismatch, restart continuity, and the exact atomic readiness invariant
- [X] T028 [P] [US2] Add first-enrollment bridge/UI integration tests in `tests/f010/integration/first-enrollment.test.mjs` verifying renderer cannot supply account/device owner/profile path/workspace/role, safe device labels are non-authoritative, and successful enrollment exposes only the narrow enrolled-account result

### Implementation for User Story 2

- [X] T029 [US2] Implement `EnrollmentIntent` in `supabase/migrations/20261020000009_device_enrollment.sql` with data-model field constraints verbatim: intent ID is a "Stable operation UUID reused across identical retries", issuer/subject are derived from verified session and never caller authority, profile/generation are safe local references bound into the digest, installation context is app-owned/stable, device context is a canonical trusted digest, label is bounded/non-authoritative, platform/architecture/version are bounded evidence, protection proof is opaque, request digest/schema version detect changed intent, status is exactly `prepared | submitted | outcome_unknown | service_confirmed | locally_committed | reconciled_not_enrolled | rejected | recovery_required`, result references are optional, times become server instants once submitted, and error/diagnostic are optional safe metadata
- [X] T030 [US2] Add `DeviceEnrollment` and immutable account-scoped receipt/evidence tables to `supabase/migrations/20261020000009_device_enrollment.sql` with data-model field constraints verbatim: enrollment/device IDs are stable service identities, issuer/subject derive from verified service session, installation context is a stable approved service reference, originating intent/digest are unique authoritative correlation, device label is bounded display-only, platform/architecture/app version are enrollment evidence, protected-key proof is opaque, status is exactly `enrolled | rejected`, enrolled/last-contact are authoritative instants, and receipt/evidence links are immutable; prohibit raw key, credential, role, workspace and caller-supplied owner
- [X] T031 [US2] Implement database privileges, constraints and transaction function in `supabase/migrations/20261020000009_device_enrollment.sql`: one result per accepted intent, exact-digest replay, changed-intent rejection, approved installation uniqueness, append-only receipt/evidence, server timestamps, and rollback of every partial effect
- [X] T032 [US2] Implement verified pre-workspace account context in `supabase/functions/_shared/identity-auth.ts`: cryptographically validate the selected provider session and derive `(issuer, subject)` without using F008's synthetic JWT decoder, caller account, workspace header, role, or membership
- [X] T033 [US2] Register the bounded `device.enroll` and `device.enrollmentResult` handlers in `supabase/functions/command-gateway/index.ts`, sharing F009 canonical digest/transaction/error utilities while using T032 account context, version/bounds/rate checks, and safe non-enumerating outcomes
- [X] T034 [US2] Implement local enrollment coordination in `app/main/identity/enrollment.ts`: derive current account/profile/generation and installation context internally, create one durable intent ID/digest, require current online authority and usable T008 protection, call/reconcile T033, and retain the original intent across unknown outcomes
- [X] T035 [US2] Implement the readiness fence in `app/main/identity/enrollment.ts` and `app/main/identity/protected-identity-store.ts`: transition to `enrolled` iff verified account equals immutable profile binding, authoritative device enrollment is confirmed, protected session and profile binding commits succeed, protection is usable, and every component has the current generation; every false/unknown term remains locked/protection-unavailable/recovery-required
- [X] T036 [US2] Add `identity.confirmEnrollment` and `identity.retryReconciliation` handlers/events to `app/main/bridge.ts` and `app/preload/preload.ts`, accepting only an optional bounded safe device label and exposing no raw service/provider/protection data

**Checkpoint**: US2 independently proves one protected first-device enrollment from a synthetic verified-account fixture and restores the same binding after restart.

---

## Phase 5: User Story 3 — Recover from Interruptions Without Guessing (Priority: P2)

**Goal**: Resolve cancellation, expiry, process/network loss and unknown enrollment outcomes into truthful retry/reconciliation states without duplicate enrollment or destructive reset.

**Independent Test**: Interrupt before authentication, after hosted authentication, during exchange, during enrollment, after service commit and before local commit. Restart/retry converges on the original result or a proven not-enrolled state, retains existing encrypted data, and never fabricates success or a new device identity.

### Tests for User Story 3

- [X] T037 [P] [US3] Add interruption/restart tests in `tests/f010/integration/interruption-recovery.test.mjs` for cancellation, expiry, app close before return, valid protected attempt after restart, missing attempt proof, callback at launch/second instance, network loss at each boundary, and no false empty workspace
- [X] T038 [P] [US3] Add unknown-enrollment reconciliation tests in `tests/f010/service/enrollment-reconciliation.test.mjs` for committed, proven-not-enrolled, still-unknown, safe rejection, unauthorized/foreign-account lookup, concurrent original request, and prohibition on replacement intent before a terminal result
- [X] T039 [P] [US3] Add corrupt/incompatible/session-rejected recovery tests in `tests/f010/integration/profile-recovery.test.mjs` verifying protected bytes remain unchanged, no replacement profile is created, online authority stops, and safe next actions distinguish unlock, sign in again, reconcile, upgrade and support

### Implementation for User Story 3

- [X] T040 [US3] Implement durable attempt restart reconciliation in `app/main/identity/auth-attempts.ts`: reopen only complete, supported, unexpired protected proof for the same profile/generation/destination; otherwise terminally cancel/expire it and offer a deliberate new attempt without accepting the pending callback
- [X] T041 [US3] Implement authoritative enrollment-result lookup in `supabase/functions/command-gateway/index.ts` and `supabase/migrations/20261020000009_device_enrollment.sql`: return `enrolled | not_enrolled | outcome_unknown | safe rejection` only after current account authorization; null lookup alone never proves non-enrollment while the original transaction may be in flight
- [X] T042 [US3] Implement reconciliation state transitions in `app/main/identity/enrollment.ts`: `submitted -> outcome_unknown -> service_confirmed | reconciled_not_enrolled | rejected | recovery_required`, reuse the original intent/digest, and create no replacement until a terminal result permits it
- [X] T043 [US3] Integrate identity/profile failures with `app/main/persistence/recovery-state.ts`: map missing/locked/unprotected credentials, corrupt or unsupported profile, session rejection and partial enrollment to explicit locked/sign-in-required/protection-unavailable/recovery-required states while preserving prior encrypted data and outbox bytes
- [X] T044 [US3] Add generation-aware startup recovery composition to `app/main/main.ts`: restore only the matching protected account/profile/session, perform required online validation, resume the original enrollment reconciliation, and never open a workspace store merely because authentication succeeded
- [X] T045 [US3] Implement safe recovery action/message mapping in `packages/localization/src/shell/types.ts`, `packages/localization/src/shell/en.ts`, and `packages/localization/src/shell/ar.ts` for retry, cancel, unlock protection, sign in again, choose isolated profile, reconcile, upgrade and contact support without copying provider text

**Checkpoint**: US3 independently resolves all specified interruptions to a truthful terminal or still-recovering state with no duplicate enrollment or data replacement.

---

## Phase 6: User Story 4 — Sign Out or Change Accounts Without Data Crossover (Priority: P2)

**Goal**: End online authority and switch accounts only through generation-first teardown and separate immutable profile bindings, retaining encrypted unsynchronized work without exposing it.

**Independent Test**: Enroll A, seed distinguishable encrypted pending data, sign out, enroll B in another profile, race late callbacks/refresh/enrollment responses, then return to A. B sees zero A state and A reopens only after A is verified and protection succeeds.

### Tests for User Story 4

- [X] T046 [P] [US4] Add sign-out generation-race tests in `tests/f010/integration/sign-out-races.test.mjs` covering callback, token refresh and enrollment completion in flight; assert generation increment happens first, late work cannot restore authority, reusable credentials are invalidated, and encrypted local work is retained
- [X] T047 [P] [US4] Add A/B profile-isolation tests in `tests/f010/integration/account-isolation.test.mjs` asserting account B observes zero A records, fields, labels, counts, searches, notifications, outbox operations, windows, subscriptions, keys, callbacks or diagnostic identity and cannot relabel/replace/merge A's profile
- [X] T048 [P] [US4] Add retained-work and return-to-account tests in `tests/f010/integration/account-return.test.mjs` verifying sign-out guidance distinguishes retention from deletion and A's unchanged protected profile reopens only after matching `(issuer, subject)`, supported format and usable protection

### Implementation for User Story 4

- [X] T049 [US4] Implement immutable local account binding and isolated profile selection in `app/main/identity/profile-registry.ts`: app-generated opaque `profile_id`, unique `(issuer_id, subject_id)` binding, internally derived path/protection reference, no rebinding, no caller-supplied path, and no empty replacement after read/open failure
- [X] T050 [US4] Implement sign-out sequencing in `app/main/identity/session-owner.ts`: increment profile/session generation, cancel attempts, stop requests/subscriptions, invalidate/remove reusable provider credentials per approved policy, zero/lock keys and in-memory state, and return retained-work classification without deleting/uploading/transferring/reassigning data
- [X] T051 [US4] Implement account-switch teardown orchestration in `app/main/main.ts`: complete T050, close account-bound windows and active `PersistenceService`, dispose notifications/views/keys, then activate/create a separate profile only after the new account is verified; reject every older-generation response
- [X] T052 [US4] Add `identity.signOut` and `identity.confirmAccountSwitch` handlers to `app/main/bridge.ts` and `app/preload/preload.ts` with no account/profile argument, current caller/generation admission, explicit retained-work confirmation, and safe accepted/rejected/outcome-unknown results
- [X] T053 [US4] Implement signed-out/account-switch presentation in `app/renderer/components/identity/AuthDialog.tsx`: explain retained encrypted work versus deletion, require explicit confirmation before switching, show no other-account counts/content, and expose only named non-pointer actions

**Checkpoint**: US4 independently proves sign-out and A/B switching without cross-account observation, rebinding, data loss, or late-response authority restoration.

---

## Phase 7: User Story 5 — Complete the Flow in English or Arabic (Priority: P2)

**Goal**: Deliver equivalent hosted/native sign-in, enrollment and recovery in English and Arabic with correct RTL/bidi, keyboard, focus, announcement, zoom and non-color status behavior.

**Independent Test**: Exercise success, cancel, invalid return, offline/provider unavailable, protection unavailable, unknown enrollment, sign-out and account switch in both languages using keyboard and screen reader; all meanings/actions match and mixed-direction identifiers remain readable.

### Tests for User Story 5

- [ ] T054 [P] [US5] Add typed localization parity tests in `tests/f010/ui/localization-parity.test.mjs` for every F010 state, error, action, hosted instruction and parameter schema; fail on missing English/Arabic keys or raw provider/error text
- [ ] T055 [P] [US5] Add renderer accessibility tests in `tests/f010/ui/native-accessibility.test.mjs` for browser-open notice, keyboard-only actions, visible focus, focus return, polite/assertive announcements, zoom/reflow, contrast, reduced motion, and text/semantic status rather than color alone
- [ ] T056 [P] [US5] Add RTL/bidi tests in `tests/f010/ui/rtl-bidi.test.mjs` for email-like identifiers, device labels, diagnostic IDs, versions and URLs using isolation without modifying stored values, including long Arabic/Latin/emoji labels and mirrored logical layout
- [ ] T057 [P] [US5] Add hosted-surface tests in `tests/f010/ui/hosted-auth.test.mjs` for English/Arabic parity, keyboard/focus/announcement behavior, exact configured continuation, no verifier/token/cookie disclosure to desktop, no arbitrary redirect, and truthful provider-controlled limitations

### Implementation for User Story 5

- [ ] T058 [P] [US5] Add the complete typed F010 English strings and parameter schemas to `packages/localization/src/shell/en.ts` for locked, waiting, cancel/expire, invalid return, verified, enrolling, enrolled, offline/provider unavailable, protection unavailable, unknown/recovery, sign-out, retained work and account switch states/actions
- [ ] T059 [P] [US5] Add meaning-equivalent Arabic strings with the identical typed key/parameter schema to `packages/localization/src/shell/ar.ts`; do not translate stable IDs or copy unrestricted provider text and mark fluent review as pending until observed
- [ ] T060 [US5] Implement the accessible native state UI in `app/renderer/shell/SignInEnrollmentView.tsx` using existing shadcn/Tailwind/Button/BdiText/localization patterns, logical RTL properties, deterministic focus targets, live regions, visible focus, non-color status and reduced-motion-safe behavior
- [ ] T061 [US5] Mount the F010 view and route closed safe state/actions through `app/renderer/shell/App.tsx` and `app/renderer/env.d.ts` without importing Supabase/auth libraries or exposing raw transport/session data to renderer
- [ ] T062 [US5] Implement the minimal separately built hosted entry/status surface in `web/auth/index.html`, `web/auth/main.tsx`, `web/auth/App.tsx`, and `web/auth/styles.css`: validate one configured start purpose, keep verifier/session ownership in main, provide English/Arabic accessible instructions, and continue only to the fixed provider destination
- [ ] T063 [US5] Add the hosted surface build/typecheck entry in `vite.auth.config.mts` and `package.json`, keeping hosted assets separate from Electron bundles and adding no framework/dependency beyond the installed React/Vite/Tailwind stack

**Checkpoint**: US5 independently renders and operates every F010 state in English and Arabic; automated checks pass and manual fluent-Arabic/native-AT evidence is ready to collect.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integrate verification, collect honest evidence, run regressions, and document unresolved release gates.

- [ ] T064 [P] Add native Electron acceptance specs in `tests/verification/desktop/f010-browser-return.spec.mjs`, `tests/verification/desktop/f010-enrollment.spec.mjs`, and `tests/verification/desktop/f010-isolation.spec.mjs` for callback cold/running/replay, first enrollment/restart/faults, sign-out/A-B isolation, secret surfaces and safe cleanup
- [ ] T065 [P] Add F010 evidence collection in `tooling/f010/evidence.mjs` recording scenario/FR/SC IDs, commit/build, OS/CPU/session/package/signature, browser, locale/AT, provider/config digest, protected adapter, fixture, command, expected/observed result, redacted artifact checksum, defect/reviewer/date and explicit blockers
- [ ] T066 [P] Update `docs/features/F010.md` with implemented boundaries, configuration/rollback/recovery guidance, disabled public-registration/MFA/workspace/device-admin scope, and links to observed evidence without promoting Q-02/Q-07/Q-08/F029 recommendations to approvals
- [ ] T067 [P] Create `docs/qa/F010.md` with separate tables for automated local/service results, real hosted sandbox result, Windows/macOS/Linux packaged observations, English/Arabic/accessibility review, SC-001–SC-010 disposition, defects and unrun blockers
- [ ] T068 Run focused F010 validation from `specs/010-browser-sign-in-enrollment/quickstart.md`: `npm run test:f010`, all five focused scripts, `npm run check:security`, and verify prohibited-marker scans are empty outside intentional fixtures
- [ ] T069 Run prerequisite/regression suites from `specs/010-browser-sign-in-enrollment/quickstart.md`: `npm run test:f003`, `npm run test:f004`, `npm run test:f006`, `npm run test:f007`, `npm run test:f008`, `npm run test:f009`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run check:docs`
- [ ] T070 Run real sandbox and declared native-target journeys from `specs/010-browser-sign-in-enrollment/quickstart.md`, record SC-006/SC-009 measurements and fluent-Arabic/native-screen-reader review in `docs/qa/F010.md`, and leave every inaccessible host/provider/package/reviewer as blocked rather than inferred
- [ ] T071 Re-run the F010 constitution and scope review in `docs/features/F010.md`: prove no renderer secret/client, generic IPC/openExternal, fabricated workspace/lease, plaintext fallback, empty replacement, public registration, MFA/recovery, device administration, sync or business command entered the change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001 may block implementation when required decisions/evidence are absent, while T002–T004 can prepare the local harness.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundation; provides the verified-account fixture/flow used by the full journey.
- **US2 (Phase 4)**: Depends on Foundation and consumes a verified-account fixture; full integration depends on US1, but transaction/readiness tests run independently.
- **US3 (Phase 5)**: Depends on Foundation; uses synthetic attempts/intents for independent tests and integrates with US1/US2 for the full journey.
- **US4 (Phase 6)**: Depends on Foundation; uses seeded protected profiles/sessions independently and integrates with US1/US2 for real switching.
- **US5 (Phase 7)**: Depends on Foundation; renders fixture states independently, then integrates all completed story states.
- **Polish (Phase 8)**: Depends on every story included in the delivery candidate.

### User Story Completion Order

```text
Setup -> Foundation -> US1 (browser identity) -> US2 (first enrollment)
                                  |                    |
                                  +------> US3 <-------+
                                  +------> US4 <-------+
Foundation -------------------------------> US5 fixture UI
US1 + US2 + US3 + US4 + US5 -------------> Polish/evidence
```

- **US1 (P1)** is the MVP and has no story dependency after Foundation.
- **US2 (P1)** can implement/test service enrollment with a synthetic verified account, then connect to US1.
- **US3 (P2)** can test recovery with synthetic attempts/intents; full recovery consumes US1/US2 owners.
- **US4 (P2)** can test isolation with seeded protected profiles; real switch consumes US1/US2.
- **US5 (P2)** can build/test state rendering from fixtures while other stories progress; final parity covers their integrated states.

### Within Each User Story

- Write the listed tests first and confirm they fail for the missing behavior.
- Add closed models/validators before services and handlers.
- Complete trusted main/service behavior before preload/renderer integration.
- Run the independent test and checkpoint before starting the next priority.

### Parallel Opportunities

- Setup T002–T004 can run in parallel after T001 identifies configuration blockers.
- Foundation T007–T011 can run in parallel after T005–T006 settle shared shapes; T012 follows fixture markers.
- US1 test tasks T013–T016 can run in parallel; implementation converges at T023–T024.
- US2 test tasks T025–T028 can run in parallel; schema T029–T031 precedes handlers/coordinator T032–T036.
- US3 test tasks T037–T039 can run in parallel; service T041 and local T040/T043 can proceed in parallel before T042/T044 integration.
- US4 tests T046–T048 can run in parallel; profile registry T049 and UI T053 can proceed separately around teardown integration.
- US5 tests T054–T057 and translations T058–T059 can run in parallel; native and hosted UI implementations T060/T062 can proceed in parallel.
- Polish T064–T067 can run in parallel; executed validation T068–T071 remains ordered by available environments/evidence.

---

## Parallel Examples

### User Story 1

```text
Task: T013 — PKCE/attempt lifecycle tests in tests/f010/unit/auth-attempts.test.mjs
Task: T014 — callback grammar tests in tests/f010/unit/auth-callback.test.mjs
Task: T015 — trusted exchange tests in tests/f010/integration/session-owner.test.mjs
Task: T016 — Electron ingress tests in tests/f010/integration/browser-handoff.test.mjs
```

### User Story 2

```text
Task: T025 — enrollment schema tests in tests/f010/service/enrollment-schema.test.mjs
Task: T026 — transaction/concurrency tests in tests/f010/service/enrollment-atomicity.test.mjs
Task: T027 — local readiness tests in tests/f010/integration/enrollment-readiness.test.mjs
Task: T028 — bridge/UI enrollment tests in tests/f010/integration/first-enrollment.test.mjs
```

### User Stories 3–5

```text
Task: T037 — interruption/restart tests in tests/f010/integration/interruption-recovery.test.mjs
Task: T046 — sign-out race tests in tests/f010/integration/sign-out-races.test.mjs
Task: T054 — localization parity tests in tests/f010/ui/localization-parity.test.mjs
Task: T057 — hosted accessibility/redirect tests in tests/f010/ui/hosted-auth.test.mjs
```

---

## Implementation Strategy

### MVP First: User Story 1

1. Complete Setup and Foundation.
2. Complete US1 tests and implementation.
3. Run `npm run test:f010:attempts`, US1 integration suites, F004 regressions and secret scans.
4. Stop at a verified-account state; do not invent a device, workspace or offline authority.

### Incremental Delivery

1. US1: trusted browser sign-in and verified account.
2. US2: one protected first-device enrollment and restart continuity.
3. US3: interruption and unknown-outcome reconciliation.
4. US4: generation-safe sign-out and isolated account switching.
5. US5: complete English/Arabic accessible hosted/native presentation.
6. Polish: packaged/native/hosted evidence and release-gate review.

Each increment retains prior security checks. A missing provider, platform, protection or reviewer blocks only the dependent gate; it does not justify weakening the contract.

## Requirement Coverage

| Slice | Tasks | Requirements / acceptance |
| --- | --- | --- |
| Shared secret, evidence, bounds and renderer safety | T005–T012, T064–T071 | FR-014, FR-022–FR-024; A-03, A-05, A-06, A-09, A-13, A-20–A-22 |
| Trusted browser sign-in and verified identity | T013–T024 | FR-001–FR-009, FR-023; A-01–A-05 |
| Protected first-device enrollment | T025–T036 | FR-010–FR-016, FR-021, FR-025; A-06–A-10, A-14 |
| Interruption, restart and rejected session recovery | T037–T045 | FR-001, FR-006, FR-013, FR-015, FR-017, FR-020–FR-021; A-11–A-15 |
| Sign-out and isolated account switching | T046–T053 | FR-016, FR-018–FR-020, FR-025; A-16–A-19 |
| English/Arabic accessibility and hosted/native parity | T054–T063 | FR-024; A-20–A-22 |

SC-001–SC-010 are executed and reported by T064–T070; they are not inferred from implementation tasks.

## Notes

- `[P]` means different files/no incomplete dependency, not permission to ignore shared contract changes.
- Tests precede implementation because the feature specification explicitly requires adversarial and recovery evidence.
- Reuse F003/F004/F006/F007/F009 code and installed dependencies; do not add a generic auth framework, renderer auth client, placeholder workspace, second command gateway, or new encryption design.
- Exact numeric bounds, callback registration, production provider policy, installation uniqueness and retention must come from T001's approved decisions; missing values remain blockers.
- Commit after each task or coherent dependency group; never mark a task complete from code inspection alone.
