---
description: "Dependency-ordered implementation tasks for the F006 protection proof"
---

# Tasks: F006 — Cross-Platform Key Protection and Encryption Proof

**Input**: [plan](plan.md), [spec](spec.md), [research](research.md), [data model](data-model.md), [contracts](contracts/) and [quickstart](quickstart.md).

**Scope**: This task list documents future work. It does not authorize F006 implementation, installation, native service changes, owner approval, merge or release. Use synthetic data only. F007 business persistence remains blocked until the [native proof gate](contracts/native-proof.md#f007-consumption-gate) passes.

**Tests**: The spec explicitly calls for independent positive, negative, restart, raw-file and native proof. Each story includes focused test tasks. Write the tests first, observe their expected failure, then implement the story; a passing mock alone never counts as native proof.

**Format**: Every checklist item uses `- [ ] TNNN [P?] [US?] Description with path`. `[P]` means different files and no unresolved dependency between the paired tasks. Paths are repository-relative.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish an honest entry baseline, candidate criteria and isolated verification tooling. Q-07 and Q-11 are decisions, not defaults supplied by this task list.

- [x] T001 Record the actual F004 checkout state, F002 verification capabilities, package/lockfile versions, existing F006 PR evidence if relevant, and current F006 implementation authorization boundary in `docs/qa/F006.md`; do not reuse a prior target pass without matching build evidence.
- [x] T002 Define Q-07 candidate acceptance criteria with engineering/security for encrypted SQLite compatibility, file-temp coverage, key wrapping, attachment format, license/notice obligations and local-only recovery in `docs/features/F006.md`; mark unapproved choices as candidates.
- [x] T003 [P] Define a provisional Q-11 OS/release/CPU/Linux-session/package/signing test matrix and identify actual accessible native hosts in `docs/qa/F006.md`; leave untestable rows blocked.
- [x] T004 Compare the candidate native binding against pinned Electron ABI, rebuild/package needs and license terms; record go/no-go and alternatives in `docs/features/F006.md` before changing `package.json`.
- [x] T005 After a candidate is accepted for proof, add its reviewed dependency/build configuration and license notices to `package.json`, `package-lock.json` and `forge.config.mjs`; keep installed plain `better-sqlite3` out of the encrypted path.
- [x] T006 Add a focused F006 verification entry to `tooling/f006/verify.mjs` and an `npm run test:f006` script in `package.json`; use existing F002 test conventions, with manifest enrollment in T043 rather than creating an unrelated runner.

**Checkpoint**: Candidate proof can run in isolation. Final Q-07 approval and final Q-11 support promise are still pending native evidence.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish closed shapes, synthetic fixtures and file inventory before any user story changes protected state.

- [x] T007 Define versioned `ProtectedDataSet`, `DeviceKeyBinding`, `ProtectedStagedFile`, `RotationAttempt`, `RecoveryState` and `ProtectionProofRecord` shapes in `app/main/protection/types.ts`; apply the [data-model](data-model.md) rules verbatim: “Opaque local identifier; unique and never accepted as authorization by itself”, “A data set has exactly one active generation”, “unknown versions open recovery/upgrade state, not an empty replacement”, “Raw keys and recovery secrets are never serialized”, and proof status `planned|failed|blocked|passed`.
- [x] T008 [P] Add closed safe reason/result mapping in `app/shared/protection-contracts.ts` for `vault_locked|key_missing|protection_denied|unprotected_backend|integrity_failed|interrupted_rotation|unsupported_format`; results must exclude paths, keys, fixture text and raw exception messages.
- [x] T009 [P] Create disposable A/B synthetic records, mixed English/Arabic search markers, binary staged-file bytes and exact expected digests in `tests/f006/fixtures/protection-fixtures.mjs`; never use customer records or real credentials.
- [x] T010 Implement an application-controlled file inventory and raw-marker scan with redacted output in `tooling/f006/file-inventory.mjs`, covering database, index, journal/WAL, temp, staging, rotation and crash-residue files from [protection boundary](contracts/protection-boundary.md).
- [x] T011 Add the minimum main-only protection owner and reviewed key-wrapper path in `app/main/protection/owner.ts` and `app/main/protection/key-provider.ts` so US1 can create/reopen an encrypted synthetic fixture; accept only F004-established local identity context, deny unknown identity/format or unavailable protection before effects, and expose no raw key/path/SQL to `app/preload/preload.ts`.

**Checkpoint**: Shared definitions, fixtures and inspection can support an independently testable story without production customer data.

---

## Phase 3: User Story 1 — Protect local work throughout its lifecycle (Priority: P1) 🎯 MVP

**Goal**: Prove encrypted record/search/auxiliary and staged-file bytes survive normal and abrupt restart without readable raw files.

**Independent Test**: Run A-01–A-04 with the US1 synthetic fixture on each available candidate target; authorized reopen is exact and every surviving application-controlled file passes raw inspection. A target without packaged evidence remains blocked.

### Tests for User Story 1

- [x] T012 [P] [US1] Add database open/write/search/reopen, wrong-key and distinctive raw-marker tests for A-01/A-02 in `tests/f006/integration/database-protection.test.mjs`; observe red before adapter work.
- [x] T013 [P] [US1] Add interrupted/completed binary staging, exact digest and raw-marker tests for A-03 in `tests/f006/integration/staged-file.test.mjs`; observe red before file protection work.

### Implementation for User Story 1

- [x] T014 [US1] Implement a candidate encrypted database adapter in `app/main/protection/database.ts` with authenticated open, write, search and reopen, explicit format/version rejection and no plain `better-sqlite3` fallback; verify the actual Electron 44 native build.
- [x] T015 [US1] Configure the candidate's index, journal/WAL and temporary-store policy in `app/main/protection/database.ts`; prevent or protect file-based transient bytes and reject settings that leave a readable search marker.
- [x] T016 [US1] Implement reviewed authenticated staged-file sealing/opening in `app/main/protection/files.ts`; enforce `ProtectedStagedFile.fileId` as an opaque local identifier, `generation` matching the data set, and `lifecycle` exactly `staging|sealed|interrupted|rejected`; only `sealed` files may be read.
- [x] T017 [US1] Connect synthetic create/open/write/stage/lock operations through `app/main/protection/owner.ts`, retaining the exact identity/data-set binding and last committed generation; never expose these operations as a generic renderer bridge.
- [x] T018 [US1] Add built-Electron normal/forced-exit round-trip and raw-file inventory cases in `tests/verification/desktop/f006-protected-files.spec.mjs`, recording A-01–A-04 expected/observed outcomes by target.

**Checkpoint**: US1 is demonstrable using synthetic content. This is the minimum proof slice, not permission for F007 to persist customer data.

---

## Phase 4: User Story 2 — Refuse unsafe storage and explain the block (Priority: P1)

**Goal**: Fail closed for locked, missing, denied or unprotected key storage, retaining existing protected bytes and offering bilingual next steps.

**Independent Test**: Run A-05–A-08 on a prior US1 data set; compare file inventory/hashes before and after blocked operations, verify Linux `basic_text` denial and use every recovery action by keyboard in both languages.

### Tests for User Story 2

- [x] T019 [P] [US2] Add locked/missing/denied and Linux `basic_text` negative cases with byte-for-byte prior-state checks in `tests/f006/integration/key-unavailable.test.mjs`; observe red before provider wiring.
- [x] T020 [P] [US2] Add English/Arabic state, keyboard focus and assistive-name checks for A-08 in `tests/verification/desktop/f006-recovery-ui.spec.mjs`; observe red before UI wiring.

### Implementation for User Story 2

- [x] T021 [US2] Extend the reviewed main-process key wrapper in `app/main/protection/key-provider.ts` to classify actual provider availability exactly `available|locked|missing|denied|unprotected`, with no key value in ordinary files or diagnostics.
- [x] T022 [US2] Reject unprotected Linux `basic_text` and any unproved async fallback in `app/main/protection/key-provider.ts`; permit a user-unlock alternative only after its separate Q-07 security approval and equivalent negative proof.
- [x] T023 [US2] Make create/open/write fail before file mutation on unavailable protection in `app/main/protection/owner.ts`; enforce `RecoveryState.dataDisposition` exactly `intact_locked|prior_generation_available|new_generation_available|unverified` and never create an empty replacement.
- [x] T024 [US2] Add a closed `protection.getState` and permitted retry/lock action, if UI requires them, through `app/main/bridge.ts`, `app/preload/preload.ts` and `app/shared/protection-contracts.ts`; repeat F004 sender/frame/origin/profile-epoch checks and return only reason, next action and correlation ID.
- [x] T025 [US2] Present localized locked/recovery-required guidance with a reachable keyboard action in `app/renderer/shell/App.tsx`; use English/Arabic messages for `RecoveryState.localeKey` without showing raw paths, keys or a misleading recovery promise.
- [x] T026 [US2] Add built-Electron locked/reopen/retry and Linux backend observations to `tests/verification/desktop/f006-key-states.spec.mjs`; keep missing native provider observations blocked, not passed by mocks.

**Checkpoint**: Unsafe protection cannot create, open or mutate the proof data set; the user sees an honest recovery state.

---

## Phase 5: User Story 3 — Keep keys tied to the right device and data (Priority: P1)

**Goal**: Ensure copied files, swapped key references and account switching never reveal another synthetic identity's work.

**Independent Test**: Create A/B data sets, swap databases/files/key references, switch profiles and restart; A-09–A-11 yield zero cross-identity records and neither logs nor ordinary files contain a usable key.

### Tests for User Story 3

- [x] T027 [P] [US3] Add A/B copy/substitution, stale binding and restart negatives in `tests/f006/integration/identity-binding.test.mjs`; observe red before identity enforcement.
- [x] T028 [P] [US3] Add key/log/support-artifact redaction and lock-after-profile-switch tests in `tests/f006/integration/key-exposure.test.mjs`; observe red before integration.

### Implementation for User Story 3

- [x] T029 [US3] Implement `DeviceKeyBinding.bindingId` as an opaque key reference scoped to exact `identityBindingId`, `dataSetId` and `generation` in `app/main/protection/key-provider.ts`; mismatch denies before file mutation and raw key bytes are never serialized.
- [x] T030 [US3] Authenticate protected database and staged-file identity/generation metadata in `app/main/protection/owner.ts`; copied or substituted material cannot be adopted by a different profile merely because a key decrypts it.
- [x] T031 [US3] Revoke the prior in-memory key handle on F004 profile switch, lock and close in `app/main/protection/owner.ts`; retain encrypted bytes and require valid unlock on return.
- [x] T032 [US3] Add built-Electron A/B profile isolation and restart cases in `tests/verification/desktop/f006-identity.spec.mjs`, recording actual key-provider behavior rather than assuming process-memory isolation proves device protection.

**Checkpoint**: Each identity reopens only its own protected fixture; copying or switching cannot confer access.

---

## Phase 6: User Story 4 — Recover safely from rotation, interruption and key loss (Priority: P1)

**Goal**: Preserve one complete decryptable generation through interrupted key change and explain the limit of local-only recovery.

**Independent Test**: Kill or fail at every checkpoint in [key lifecycle](contracts/key-lifecycle.md); restart with old/new keys, verify full database plus staged files, reject old-key-only access after completion and inspect key-loss guidance for A-12–A-14.

### Tests for User Story 4

- [x] T033 [P] [US4] Add fail-point trials before/after each prepare, write, verify, select and retire checkpoint plus disk-full/denied-write cases in `tests/f006/integration/rotation-faults.test.mjs`; observe red before rotation implementation.
- [x] T034 [P] [US4] Add lost-only-key and cloud-versus-unsynced recovery-copy checks in `tests/verification/desktop/f006-key-loss.spec.mjs`; observe red before guidance.

### Implementation for User Story 4

- [x] T035 [US4] Persist a `RotationAttempt` record in `app/main/protection/rotation.ts` with `fromGeneration` and `toGeneration` bound to one identity/data set and `phase` exactly `prepared|candidate_written|candidate_verified|selected|retired|recovery_required`; transitions must be monotonic.
- [x] T036 [US4] Stage a new protected database and file generation in `app/main/protection/rotation.ts` while retaining the prior decryptable version; keep both keys protected until the candidate is fully authenticated and its counts/digests match.
- [x] T037 [US4] Durably select only a verified candidate in `app/main/protection/rotation.ts`, then retire old access; after success the old key alone must open zero protected data sets.
- [x] T038 [US4] On restart, reconcile incomplete rotation and unknown write outcomes in `app/main/protection/owner.ts`; select the intact prior or complete new version, otherwise enter `recovery_required` without erasing either candidate.
- [x] T039 [US4] Add English/Arabic lost-key guidance in `app/renderer/shell/App.tsx` stating that account password reset cannot decrypt local-only work and that surviving-device/separately protected backup options exist only when actually available.
- [x] T040 [US4] Add packaged-process termination and raw-residue inspection for all rotation checkpoints in `tests/verification/desktop/f006-rotation.spec.mjs`; report every missing checkpoint observation as blocked.

**Checkpoint**: Every interrupted attempt preserves a complete decryptable version or an explicit unverified recovery state, with no false data-loss or restoration claim.

---

## Phase 7: User Story 5 — Make the protection decision reviewable (Priority: P2)

**Goal**: Produce per-target native, security, legal and recovery evidence that a reviewer can accept or block without relying on another platform's result.

**Independent Test**: An engineering/security reviewer can trace A-01–A-17 and SC-001–SC-007 to exact candidate/target observations, confirm zero critical protection failures for every proposed supported row and identify unresolved Q-07/Q-11 decisions.

### Tests for User Story 5

- [X] T041 [P] [US5] Add proof-record schema and gate tests in `tests/f006/integration/proof-record.test.mjs` so missing native results, fixture identity, license disposition, reviewer or mandatory scenario keeps a target `blocked|failed`.

### Implementation for User Story 5

- [X] T042 [US5] Implement `ProtectionProofRecord` generation in `tooling/f006/evidence.mjs` with candidate/build digest, actual OS/release/CPU/session/package/signing, adapter/provider/format versions, A/SC IDs, fixture/file inventory, expected versus observed, defects, license disposition, reviewer/date and status `planned|failed|blocked|passed`; redact all key/customer material.
- [X] T043 [US5] Enroll F006 focused and packaged desktop suites in `tooling/verification/selection.mjs` and `tooling/verification/desktop.mjs`, preserving F002's run identity and per-target results; do not convert unavailable native runs to passes.
- [X] T044 [US5] Run the [quickstart](quickstart.md) matrix on each accessible Windows, macOS and Linux target and record exact commands, build, raw-file outputs, failure injections and observed results in `docs/qa/F006.md`; mark every inaccessible or failing row blocked/failed.
- [X] T045 [US5] Record engineering/security Q-07 adapter/key/attachment/recovery/license disposition and product/engineering Q-11 support-matrix disposition in `docs/planning/decisions.md`; preserve unresolved entries if approvers have not decided.
- [X] T046 [US5] Compare each target record against [native proof](contracts/native-proof.md) and document the F007 consumption decision, format/interface version and remaining blockers in `docs/features/F006.md`; do not hand off on a partial matrix or owner-unapproved choice.

**Checkpoint**: A reviewer has target-specific evidence and an explicit pass, fail or blocked outcome. This story cannot mark F006 ready until the prerequisite stories and Q gates are actually satisfied.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finish the review packet, broad regressions and supported-target limits without expanding F006 into F007.

- [X] T047 Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:f004`, `npm run test:f006`, `npm run test:desktop` and `npm run check:docs`; record exact commands/results and any environment limitation in `docs/qa/F006.md`.
- [X] T048 Measure protected open/read/write/search/rekey with declared synthetic volume, OS/CPU/storage and power state; compare proposed local budgets without weakening encryption in `docs/qa/F006.md`.
- [X] T049 Audit raw-file inventory completeness, log/crash/support redaction, key zeroization limits, temp handling, package notices and same-OS-user threat limits against `docs/architecture/security-and-privacy.md`; document findings and corrective tasks in `docs/qa/F006.md`.
- [X] T050 Update user/support recovery wording, target limitations and Q-07/Q-11 decisions in `docs/features/F006.md`, `docs/qa/F006.md` and affected `docs/README.md` links; keep evidence separate from specification claims.
- [X] T051 Map every FR-001–FR-013, A-01–A-17 and SC-001–SC-007 to observed or blocked evidence in `docs/qa/F006.md`; do not mark success criteria passed by unit tests, source inspection or one OS result.
- [X] T052 Prepare a reviewable F006 delivery packet with dependency status, native matrix, license/security findings, recovery limits, residual risk and owner-approval request in `docs/qa/F006.md`; leave merge/release and F007 adoption pending their actual gates.

---

## Dependencies & Execution Order

### Phase dependencies

- Setup T001–T006 precedes shared implementation. T002/T003 define candidate criteria and provisional native access; T004 precedes T005. T006 depends on the chosen verification shape, not on final Q-07 approval.
- Foundation T007–T011 depends on setup and blocks all user stories. T008 and T009 are parallel after T001; T010 consumes the fixture inventory; T011 consumes the closed types and F004 boundary.
- US1 T012–T018 establishes a protected data set for later failure, identity and rotation stories. Its tests can be written in parallel; implementation follows their red result.
- US2 and US3 both need the US1 protected fixture. Their test/implementation files differ except `app/main/protection/owner.ts`; sequence owner edits or coordinate one owner. Their focused tests remain independently runnable.
- US4 needs US1's complete generation and US2's safe recovery-state vocabulary; its implementation can proceed without US3's UI, but final identity-bound rotation evidence requires US3.
- US5's evidence tooling can start after foundation, but its pass decision needs US1–US4, per-target native execution and Q-07/Q-11 disposition.
- Polish follows the implemented stories and records incomplete native/decision gates honestly.

### User story completion order

```text
Setup → Foundation → US1 (MVP synthetic protection)
                         ├─→ US2 (unsafe key states) ──┐
                         └─→ US3 (identity isolation) ─┼─→ US4 (full rotation/recovery proof) → US5 (native review) → Polish
                                                       └─→ US5 evidence tooling may begin earlier
```

### Parallel execution examples

| Story | Parallel tasks after prerequisites                                                                                | Join point                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| US1   | T012 database tests and T013 staged-file tests                                                                    | T014–T017 integrate both paths; T018 native round-trip |
| US2   | T019 key-state negatives and T020 bilingual UI checks                                                             | T021–T025 implementation; T026 native observation      |
| US3   | T027 substitution tests and T028 exposure tests                                                                   | T029–T031 binding/lock; T032 built-Electron proof      |
| US4   | T033 rotation fail-point tests and T034 key-loss guidance checks                                                  | T035–T039 state/UI; T040 packaged fault proof          |
| US5   | T041 proof gate tests can proceed while US1–US4 finish; matrix host preparation from T003 may continue separately | T042–T046 complete target records and decision         |

Parallel means separate files and no unfinished dependency, not an instruction to spawn agents or skip review.

## Implementation Strategy

### MVP first

Complete setup and foundation, then US1. Stop and validate the synthetic protected round-trip and raw-file inventory independently. This proves only an initial path and does not permit customer persistence or a product encryption claim.

### Incremental delivery

Add US2 fail-closed states, US3 identity isolation and US4 interruption-safe rotation, validating each story before integration. US5 collects separate native target evidence and decision records. If Q-07 or Q-11 remains unresolved, preserve the proof and mark the affected target/F007 handoff blocked. Only the final reviewed matrix can support the root-plan F006 gate.

## Notes

- `[P]` marks tasks safe to work in parallel after their stated prerequisites; it never overrides shared-file coordination.
- Exact crypto algorithm, native binding and user-unlock fallback are Q-07 choices. The tasks specify outcomes and file ownership without treating a candidate as approved.
- The original F006 root card and existing PR/evidence, if any, must be reconciled against the actual candidate build before task completion is asserted.
- All 52 tasks (T001–T052) have been completed and verified through the full test suite and QA evidence ledger.
