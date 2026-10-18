# Tasks: F004 — Secure Electron Lifecycle and Preload Bridge

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/) and [quickstart.md](quickstart.md).

**Scope**: This is an implementation task list for a later, separately authorized F004 delivery. Creating this document does not authorize app changes, native QA, a branch/PR, merge or release. Preserve existing working tree changes when implementation is authorized.

**Prerequisite**: Confirm the actual merged and approved F003 contract/bounds version before consuming it. Q-04 (background/timer policy), Q-11 (final platform/package matrix), F010/F029 callbacks and later protected routes remain open gates; the fail-closed F004 baseline below does not settle them.

**Tests**: The F004 specification explicitly requires automated security, race, restart, link and lifecycle evidence. In every story phase, write the listed tests and observe the relevant failures before implementing the story. Record real results; a planned task is not passed evidence.

**Format**: Each checkbox has a sequential ID, optional `[P]` for independent files with no unfinished dependency, a `[USn]` label only inside a story phase, and an exact repository-relative path. Tasks within a phase otherwise execute top to bottom.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the dependency and verification entry point without changing business behavior.

- [x] T001 Record the actual F003 merge/approval state, supported contract and bounds version, current main commit/lockfile, and any entry blocker in `docs/qa/F004.md`; stop dependent implementation if the approved F003 base is absent.
- [x] T002 Add focused F004 unit/integration command wiring to `package.json` and `tooling/f004/verify.mjs`, using the existing Node 24/F002 verification conventions rather than a second test framework.
- [x] T003 [P] Create deterministic default-profile and synthetic A/B profile, trusted-frame, authority, clock and in-flight-work fixtures in `tests/f004/fixtures/desktop.mjs`; never treat fixture profile identity as a workspace grant.
- [x] T004 [P] Add a dedicated sandbox-compatible preload bundle target to `forge.config.mjs` and `vite.preload.config.mts`, with an absolute runtime preload path and no additional native/package dependency.

**Checkpoint**: F003 compatibility and the focused test/build entry points are known. Do not proceed past a failed prerequisite gate.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the closed desktop vocabulary and trusted release document before any story wiring.

- [x] T005 [P] Write failing version-1 envelope, response-alternative, malformed plain-data, at-limit/beyond-limit F003-bounds-v1, unknown-field and unsupported-version tests in `tests/f004/unit/desktop-contracts.test.mjs`; require “Version 1 rejects unknown fields and unsupported versions before native effect.”
- [x] T006 [P] Write failing trusted-asset tests for exact `solodesk-app://ui` release origin, GET/HEAD only, canonical bundle-root containment, symlink/traversal/encoded-separator denial, per-session registration and exact loopback development origin in `tests/f004/integration/trusted-assets.test.mjs`.
- [x] T007 Implement immutable closed request/result/event/link types, copied bounded validators, safe F003-compatible public error categories and paired English/Arabic recovery text in `app/shared/desktop-contracts.ts`; `ActionInvocation` keeps “fixed method, version, requestId, closed payload, sender/window/profile/context epoch, admission result, effect state”, and requestId remains correlation only.
- [x] T008 Implement the tested asset-only standard/secure protocol policy and restrictive release/development CSP in `app/main/windows.ts` and `vite.config.mts`; preserve sandbox, context isolation, disabled Node integration and default-deny permissions while loading only the reviewed bundle or exact Forge loopback origin.

**Checkpoint**: T005–T006 are observed red before T007–T008, then pass; the internal asset scheme never accepts an OS deep link as executable content. Every story depends on this foundation.

---

## Phase 3: User Story 1 — Keep One Owner for a Local Profile (P1, MVP)

**Goal**: One app process owns a known profile context; concurrent launches join one profile owner, and A/B contexts stay separate.

**Independent test**: Launch the same profile simultaneously and reopen after exit/crash; open synthetic A/B profiles and verify one app lock, one owner/window/session per profile, one activation per delivered intent and no cross-profile focus or job. Covers A-01–A-04, FR-001–FR-003 and SC-001.

### Tests (write first; observe failure)

- [x] T009 [P] [US1] Write failing app-lock and atomic registry tests for 100 same-profile races, lock-loser zero work, distinct A/B activation, stale-lock-free restart and context-epoch invalidation in `tests/f004/unit/profiles.test.mjs`.
- [x] T010 [P] [US1] Write failing built-Electron two-process, simultaneous-launch, crash/restart and A/B isolation cases in `tests/verification/desktop/f004-ownership.spec.mjs`; inspect actual process/window/job observations rather than only registry mocks.

### Implementation

- [x] T011 [US1] Implement `AppOwner` lock and process epoch in `app/main/profiles.ts`: “Exactly one active OS process owns the app lock”; lock denial transfers bounded activation and starts zero profile contexts, windows or jobs.
- [x] T012 [US1] Implement `ProfileDescriptor` and atomic `ProfileOwner` registry in `app/main/profiles.ts`: “Use a canonical app-known opaque ID, bounded in length and grammar”; accept only the app-owned default or test-only synthetic A/B catalogue, join concurrent opens through one in-flight entry, and never derive paths or workspace authority from profile text.
- [x] T013 [US1] Implement `TrustedWindow` and `ProfileSession` creation/disposal in `app/main/windows.ts`: “Zero or one primary F004 view per ProfileOwner” and “One isolated in-memory session per profile view; no persistent Chromium customer cache/cookies are introduced”; bind exact webContents/mainFrame/origin/document and advance context epoch on recreation.
- [x] T014 [US1] Wire `app.requestSingleInstanceLock`, early `second-instance` listener, bounded version-1 additionalData transfer, primary startup and A/B owner activation into `app/main/main.ts`; acquire the lock before `app.whenReady`, window creation or profile work, and exit a losing contender without profile work.
- [x] T015 [US1] Admit only known profile activation, restore/focus that profile's current view once, and route concurrent requests through the in-flight owner in `app/main/profiles.ts`; invalidate stale window references when a profile closes.
- [x] T016 [US1] Run `tests/f004/unit/profiles.test.mjs` and `tests/verification/desktop/f004-ownership.spec.mjs`, then record candidate build, process counts, A-01–A-04 outcomes and failures in `docs/qa/F004.md`; unresolved native targets remain unverified.

**Checkpoint**: The owner/profile story passes on the available built Electron host without relying on sign-in, business data or a persistent profile catalogue.

---

## Phase 4: User Story 2 — Use Safe Desktop Actions (P1)

**Goal**: A frozen named preload facade permits only current-window actions and safely scoped events; malformed or forged requests have zero native effect.

**Independent test**: Use a synthetic trusted view/current authority, then bad shapes, versions, origins, frames, stale epochs and revoked contexts; inspect public facade and verify subscriptions stop. Covers A-05–A-10, FR-004–FR-010 and SC-002–SC-003.

### Tests (write first; observe failure)

- [x] T017 [P] [US2] Write failing contract tests for exactly `window.getState`, `window.minimize`, `window.restore`, `window.requestClose`, `lifecycle.onState` and `links.onDecision`, closed version-1 envelopes, safe result alternatives and disabled `external.openApproved` in `tests/f004/unit/bridge-contracts.test.mjs`.
- [x] T018 [P] [US2] Write failing handler tests for sender webContents, live top-level frame, exact origin/document, current profile/context epoch, synthetic authority recheck before effect, redacted failures, and subscription invalidation on unsubscribe/navigation/close/switch/revocation in `tests/f004/integration/bridge.test.mjs`.
- [x] T019 [P] [US2] Write failing built-preload hostile-content tests for absent Node/raw IPC/SQL/file/shell/secrets/fetch facade, forged subframe/origin, oversized/unexpected payloads and zero effect in `tests/verification/desktop/f004-bridge.spec.mjs`.

### Implementation

- [x] T020 [US2] Expose the frozen purpose-specific facade and private transport in `app/preload/preload.ts`; reject unknown response keys, mismatched requestId and unsupported version, strip native event objects, and return unsubscribe functions without exposing raw channels or arbitrary callbacks.
- [x] T021 [US2] Register only reviewed window handlers and a disabled external-purpose handler in `app/main/bridge.ts`; enforce ready state → registered method → copied bounded plain-data/version validation → exact sender/mainFrame/origin/document → current profile/epoch → current authority → effect, with an authority recheck after any async gap.
- [x] T022 [US2] Implement `EventSubscription` admission and delivery in `app/main/bridge.ts`: “Disposed on unsubscribe, navigation, window close, profile change or authority loss”; scope every bounded event to current profile/window/epoch and emit no stale callbacks.
- [x] T023 [US2] Map validation, upgrade, forbidden, unavailable and uncertain native outcomes to bounded F003-compatible public results in `app/main/bridge.ts`; never return throw text, paths, tokens, protected identifiers or a false `not_applied` claim after an uncertain effect.
- [x] T024 [US2] Add the typed read-only `window.solodesk` declaration in `app/renderer/env.d.ts` and connect current-window controls/state to the existing shell in `app/renderer/shell/App.tsx` with safe English/Arabic guidance and keyboard access.
- [x] T025 [US2] Run `tests/f004/unit/bridge-contracts.test.mjs`, `tests/f004/integration/bridge.test.mjs` and `tests/verification/desktop/f004-bridge.spec.mjs`; record A-05–A-10, zero-effect negatives, public-surface inspection and any remaining gaps in `docs/qa/F004.md`.

**Checkpoint**: The bridge is independently testable with synthetic current context; no production protected action or F003 fixture registry is exposed through IPC.

---

## Phase 5: User Story 3 — Follow Only Intended Links (P1)

**Goal**: Every ingress uses one bounded parser and route decision, with production home only, current-context denial for protected routes, and no unexpected navigation/external opening.

**Independent test**: Run the same allowed/hostile corpus at cold start, second launch and macOS `open-url`; verify home activation, safe protected-route denial, duplicate handling, no cross-profile access, no remote app content or unapproved OS opener. Covers A-11–A-15, FR-011–FR-015 and SC-004.

### Tests (write first; observe failure)

- [x] T026 [P] [US3] Write failing pure parser tests for exact `solodesk://open/home`, raw link limit “At most 2048 UTF-8 bytes before parsing”, canonical synthetic record IDs, unknown scheme/host/route, userinfo/port/query/fragment, controls, whitespace, dot segments, malformed/double encoding, encoded separators, nested URLs and duplicate query in `tests/f004/unit/links.test.mjs`.
- [x] T027 [P] [US3] Write failing decision tests for known profile lookup, signed-out/foreign/revoked synthetic authority, route availability, recheck at use, bounded in-flight duplicate identity, and empty production `ExternalDestination` catalogue in `tests/f004/integration/links.test.mjs`.
- [x] T028 [P] [US3] Write failing built-Electron tests for cold/second/macOS ingress fixture parity, navigation/redirect/subframe/new-window denial, OS-opener denial and asset/deep-link scheme separation in `tests/verification/desktop/f004-links.spec.mjs`.

### Implementation

- [x] T029 [US3] Implement pure `ActivationIntent`, `LinkIntent`, `LinkDecision` parsing and route decision in `app/main/links.ts`; accept production home only, keep synthetic protected record route fixture-only, deny unsupported/auth callback routes, and treat “A route never grants access” as an invariant.
- [x] T030 [US3] Add bounded startup, second-instance and macOS `open-url` ingress to `app/main/main.ts`: transferred JSON is at most 4096 UTF-8 bytes, at most 32 pending activation intents while starting, startup wait at most 30 seconds; register listeners before ready, apply one parser and safe denial, and never log a raw link.
- [x] T031 [US3] Route accepted home intents to the selected known profile's current trusted view in `app/main/links.ts`; recheck profile/context/authority at use, coalesce only the bounded in-flight delivery, and leave later deliberate opens possible.
- [x] T032 [US3] Enforce exact trusted document loads plus default-deny top-level/subframe navigation, redirects and new windows in `app/main/windows.ts`; keep production external-purpose catalogue empty, and permit no renderer-supplied URL, local-file, script or data scheme to reach `shell.openExternal`.
- [x] T033 [US3] Render safe accepted/denied/unavailable link feedback without protected identifiers in `app/renderer/shell/App.tsx`, preserving current shell context and English/Arabic keyboard usability.
- [x] T034 [US3] Run `tests/f004/unit/links.test.mjs`, `tests/f004/integration/links.test.mjs` and `tests/verification/desktop/f004-links.spec.mjs`; record A-11–A-15 including cold/running/macOS fixture equivalence and any OS-registration limitation in `docs/qa/F004.md`.

**Checkpoint**: Links are a navigation decision only; protected records, auth callbacks, arbitrary external destinations and packaged protocol registration remain disabled or owned by later features.

---

## Phase 6: User Story 4 — Close and Recover Predictably (P1)

**Goal**: Native controls and shutdown have explicit platform behavior and honest synthetic-work/failure outcomes without a hidden timer or fabricated protected-state recovery.

**Independent test**: Minimize, restore, close/reopen, quit and crash with synthetic in-flight work; check Windows/Linux last-window quit, macOS idle/dock reopen, terminal state, interruption and safe recovery. Covers A-16–A-19, FR-016–FR-019 and SC-005–SC-006.

### Tests (write first; observe failure)

- [x] T035 [P] [US4] Write failing state-transition and five-second drain-budget tests for `AppOwner` starting/ready/draining/closed/failed, `TrustedWindow` opening/visible/minimized/closing/closed and `ShutdownAttempt` completion/interrupted/outcome_unknown in `tests/f004/unit/lifecycle.test.mjs`.
- [x] T036 [P] [US4] Write failing injected-work, startup/preload/asset failure, renderer-crash, subscription disposal and no-empty-profile-replacement tests in `tests/f004/integration/lifecycle.test.mjs`.
- [x] T037 [P] [US4] Write failing built-Electron native controls, keyboard/focus, explicit Quit, Windows/Linux last-window and macOS dock-reopen cases in `tests/verification/desktop/f004-lifecycle.spec.mjs`.

### Implementation

- [x] T038 [US4] Implement `ShutdownAttempt` and one-way app/window state transitions in `app/main/lifecycle.ts`: “Stop admitting new privileged requests, cancel/dispose event subscriptions, and notify later registered owners that quit is requested”; allow synthetic work at most a provisional five seconds, then report only observed completion, interruption or unknown certainty.
- [x] T039 [US4] Wire guarded `before-quit`, explicit Quit and platform last-window behavior in `app/main/main.ts`; Windows/Linux quit after the final window, macOS remains ready without a window and dock activation recreates the intended/default view, with no tray, timer or hidden job.
- [x] T040 [US4] Wire per-window minimize/restore/close/focus, frame epoch disposal and render-process-gone/load-failure signals in `app/main/windows.ts`; failure enters a safe recovery path without weakening sandbox or creating an empty protected-profile success.
- [x] T041 [US4] Show bilingual safe restart/interruption guidance and accessible focus after failure in `app/renderer/shell/App.tsx`; do not assert durable save or successful protected-state restoration.
- [x] T042 [US4] Run `tests/f004/unit/lifecycle.test.mjs`, `tests/f004/integration/lifecycle.test.mjs` and `tests/verification/desktop/f004-lifecycle.spec.mjs`; record A-16–A-19, platform-specific observed behavior and synthetic work certainty in `docs/qa/F004.md`.

**Checkpoint**: Current shell lifecycle is predictable; later durable work owners still define their own checkpoint/recovery policy under Q-04 and their feature contracts.

---

## Phase 7: User Story 5 — Review Native Evidence (P2)

**Goal**: A reviewer can trace observed F004 results and gaps for declared native targets, bilingual denials and Snap startup without treating tests as approval or release.

**Independent test**: Run the candidate on each declared Windows, macOS and Linux target, including supported Linux Snap integrated-terminal startup; inspect the evidence record for every FR/A/SC ID, build/environment, expected/observed outcome, defect, reviewer and date. Covers A-20–A-23, FR-020–FR-021 and SC-007–SC-008.

### Tests and evidence setup (write first; observe missing enrollment)

- [x] T043 [P] [US5] Add F004 desktop suites and explicit expected fixture/scenario mappings to `verification/suites.v1.json`, preserving the existing F002/F003 suite identifiers and target gates.
- [x] T044 [P] [US5] Enroll `tests/verification/desktop/f004-ownership.spec.mjs`, `f004-bridge.spec.mjs`, `f004-links.spec.mjs` and `f004-lifecycle.spec.mjs` in `playwright.config.mjs`, with built-app execution and existing verification evidence behavior.

### Verification and review

- [x] T045 [US5] Integrate focused F004 selection, deterministic native fixture setup and redacted result artifact capture with the existing runner in `tooling/verification/desktop.mjs` and `tooling/f004/verify.mjs`; avoid inferred passes for unavailable hosts.
- [x] T046 [US5] Update `.github/workflows/verify.yml` only as needed to run the enrolled F004 suites on the declared Linux x64, Windows x64 and macOS arm64 candidate matrix; retain existing F002/F003 gates and record runner limitations in `docs/qa/F004.md`.
- [ ] T047 [US5] Execute the F004 candidate on actual declared Windows, macOS and Linux hosts, including 100 same-profile simultaneous-launch trials per target, and record build/commit, OS/version/CPU/display, locale, fixture, expected/observed, safe artifact hash, defect, reviewer and date in `docs/qa/F004.md`; mark missing access unverified.
- [ ] T048 [US5] Execute Linux Snap integrated-terminal launch/second-launch regression where supported, inspect sandbox/navigation/usable-window behavior, and record environment and recovery guidance or an explicit blocker in `docs/qa/F004.md`.
- [ ] T049 [US5] Review representative denied action/link and failure flows in English and Arabic with keyboard and mixed-direction identifiers; obtain fluent Arabic reviewer evidence for language quality and record next-step comprehension, focus and defects in `docs/qa/F004.md`.
- [x] T050 [US5] Trace all FR-001–FR-021, A-01–A-23 and SC-001–SC-008 to observed tests/agent QA or explicit blockers in `docs/qa/F004.md`; keep implementation, automated verification, native QA, owner approval, merge and release as distinct statuses.

**Checkpoint**: Evidence is complete only for actually observed targets; any missing native host, Arabic review or security failure blocks delivery approval.

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Consolidate the F004 contract, recovery and delivery record after all desired stories pass.

- [x] T051 [P] Document the delivered bridge methods, profile ownership, home-link policy, disabled protected/external routes and compatibility boundary in `docs/features/F004.md` and `docs/architecture/api-contracts.md`.
- [x] T052 [P] Update trusted origin/CSP, navigation, sandbox, diagnostic redaction and incident guidance in `docs/architecture/security-and-privacy.md` and `docs/operations/release-and-support.md` without claiming encryption or authentication delivered by F004.
- [x] T053 Check the implemented code and docs against F004 `specs/004-secure-electron-lifecycle/spec.md`, `plan.md`, `data-model.md` and all three `contracts/` files; record any deliberate contract revision or unresolved discrepancy in `docs/qa/F004.md` before review.
- [ ] T054 Run the commands and focused/manual scenarios in `specs/004-secure-electron-lifecycle/quickstart.md`, plus the repository typecheck, lint, build, launcher, desktop, security, docs and baseline verification gates; record exact commands, artifacts, failures and repairs in `docs/qa/F004.md`.
- [ ] T055 Prepare the F004 review packet and final status in `docs/qa/F004.md`, including remaining Q-04/Q-11 and F003/native/Arabic blockers, compatibility/recovery notes, traceability and separate owner-approval/merge/release fields; seek final owner approval only after the concrete candidate is reviewable.

---

## Dependencies and Execution Order

1. **Setup T001–T004** precedes Foundation. T001 is a hard F003 entry gate. T003 and T004 can be prepared independently after the gate.
2. **Foundation T005–T008** blocks every story. T005 and T006 are independent failing-test work; T007 depends on T005, and T008 depends on T006 and the setup build target.
3. **US1 T009–T016** starts after Foundation. It is the first functional increment and provides real profile/window identities for later built-app acceptance.
4. **US2 T017–T025** and **US3 T026–T034** may start pure/injected tests after Foundation; built-app completion depends on US1. Their bridge and link implementations touch distinct primary files but both integrate through current windows; serialize changes to `app/main/windows.ts` and `app/renderer/shell/App.tsx`.
5. **US4 T035–T042** may start state/injection tests after Foundation, but native close/quit integration depends on US1 and bridge subscription disposal from US2. Serialize shared edits to `app/main/main.ts`, `app/main/windows.ts` and `app/renderer/shell/App.tsx`.
6. **US5 T043–T050** consumes the candidate from US1–US4. Enrollment can be prepared early in independent files; observed native evidence and final traceability depend on all P1 stories.
7. **Polish T051–T055** follows the selected story set. T051 and T052 touch different documentation paths and can proceed together; validation and review packet follow their completion.

## Parallel Examples

| Story | Independent tasks after stated prerequisite                                                      | Join point                                   |
| ----- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| US1   | T009 profile registry tests and T010 process QA tests after Foundation                           | T011–T015 implementation, then T016 evidence |
| US2   | T017 facade contract, T018 handler integration and T019 hostile built-app tests after Foundation | T020–T024 implementation, then T025 evidence |
| US3   | T026 pure parser, T027 decision and T028 built-app ingress tests after Foundation                | T029–T033 implementation, then T034 evidence |
| US4   | T035 state, T036 injected failure and T037 native controls tests after Foundation                | T038–T041 implementation, then T042 evidence |
| US5   | T043 suite manifest and T044 Playwright enrollment after US1–US4 test filenames are fixed        | T045–T050 observed evidence                  |

`[P]` denotes file-level independence at that point in the graph, not permission to skip failing-test gates or to edit shared integration files concurrently.

## Implementation Strategy

1. **MVP**: With separate implementation authorization and the F003 gate satisfied, complete Setup, Foundation and US1. Validate its one-owner and A/B isolation evidence on the available host. This is an internal increment, not F004 delivery or release approval.
2. **Security boundary**: Complete US2, then US3; run each independent synthetic/negative suite before relying on integrated built-app behavior. Keep production protected actions/routes and external catalogue disabled.
3. **Lifecycle**: Complete US4, then the actual native/Arabic evidence and documentation in US5 and Polish. Do not convert unavailable targets or unapproved Q-04/Q-11 choices into passes.
4. **Delivery**: Repair any security/native finding in the same candidate, rerun affected and required baseline checks, and present the complete evidence packet for final owner approval before merge. Merge and release remain separate later actions.
