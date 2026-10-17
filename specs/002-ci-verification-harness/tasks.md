# Tasks: F002 — Automated CI and Verification Harness

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts](contracts/verification-cli.md) and [quickstart.md](quickstart.md).
**Created**: 2026-10-17
**Status**: Implementation in progress. Checked tasks record completed execution; unchecked tasks remain pending.
**Prerequisites**: Actual inspected F001 merge into main and authorization for F002 implementation before executing implementation tasks. This task-generation request authorizes documentation only. Branch creation, package installation, PR publication, remote settings, merge and release require their applicable existing or later authorization; these tasks do not grant it.
**Tests**: Explicitly required by F002 FR-004–FR-006, FR-028–FR-029 and A-01–A-27. Write independent expected fixtures before the corresponding implementation and observe missing-behavior failure; do not count test creation as a passed test. Real hosted/native QA remains separate from synthetic classification.
**Organization**: Setup → shared foundation → five user stories in spec priority order → integrated evidence and owner review. One primary F002 branch/PR, with fixes in that same open PR.

## Format and Path Conventions

Every task uses `- [ ] T### [P?] [US#?] description with exact file paths`. `[P]` identifies explicitly independent file ownership within its named batch after preceding prerequisites, not permission to start an agent or another feature PR. Setup/foundation/final tasks have no story label. All paths are repository-relative; run from the verified SoloDesk root. Implementation paths are proposed future files, not claims they exist.

Sources defining exact behavior: [CLI](contracts/verification-cli.md), [workflow and selection](contracts/workflow-and-selection.md), [evidence and gate](contracts/evidence-and-gate.md), [security and limits](contracts/security-and-limits.md), [enforcement adoption](contracts/enforcement-adoption.md). A task references these contracts rather than reopening product Q-01–Q-16. A required unavailable check remains a blocker; never check a delivery task merely because its gap was documented.

## Phase 1: Setup — Preserve and Prepare the Existing Repository

**Goal**: Establish actual implementation entry conditions and reproducible tool identities without replacing the application or creating business-feature scaffolding.

- [x] T001 Inspect the trusted F002 implementation authorization, actual F001 merge event and current main/base; record sources and unresolved entry blockers in `docs/qa/F002.md`, keeping dependent implementation blocked if F001 is unmerged or authorization is absent (FR-001).
- [x] T002 Inventory and hash existing tracked/untracked work, especially `tooling/start.mjs` and `tooling/start.test.mjs`, and record preservation/base/one-primary-PR ownership in `docs/qa/F002.md`; create the proposed F002 branch only after T001 and applicable authorization, without staging unrelated edits.
- [x] T003 Verify Node 24.21.0/npm 11.19.0 and the existing lock; resolve compatible exact Oxlint/SPDX-parser package versions, Gitleaks/actionlint releases/checksums, action commit SHAs and native runner images into `verification/toolchain.v1.json`, quoting/enforcing “Unresolved/floating action identities, unsigned assumptions about binaries, unverified checksums or unsupported required platforms block their dependent execution.”
- [x] T004 Prepare only the planned tooling/test/schema directories, exclude owned `.verification/` scratch in `.gitignore`, and record approved future command/configuration paths in `docs/features/F002.md`; leave `app/`, cloud/database infrastructure and release/signing untouched.
- [x] T005 Add only the authorized exact-pinned Oxlint/SPDX-parser development dependencies and runtime metadata to `package.json` and `package-lock.json`, then verify their engine/platform integrity against T003 without upgrading the existing app stack, approving all install scripts or suppressing TypeScript compatibility findings.

**Checkpoint**: Entry authorization, merged prerequisite, preservation inventory and runnable exact tool identities exist. Missing capabilities stop dependent implementation, not independent documentation.

## Phase 2: Foundational — Shared Records, Context and Safe Output

**Goal**: Build the bounded common transport and execution boundaries needed by every story. This phase blocks story implementation.

### Independent Contract Tests Before Implementation

- [x] T006 [P] Add hand-authored positive/negative record-family, duplicate-key/ID, dangling-reference, status/count and version fixtures in `tests/verification/unit/records.test.mjs`; enforce “Each entity has a unique `id`; cross-record references require both family and identity.” and reject unknown security-sensitive fields without rewriting input.
- [x] T007 [P] Add actual temporary-repository context/path tests in `tests/verification/integration/context.test.mjs` for exact head/base/tested identities, dirty/new files, rename/deletion, missing ancestry, Unicode, traversal and symlink escape; local data must never impersonate a hosted run.

### Shared Implementation

- [x] T008 Define `schema/verification/policy-v1.schema.json`, `schema/verification/toolchain-v1.schema.json`, `schema/verification/suites-v1.schema.json`, `schema/verification/context-v1.schema.json`, `schema/verification/selection-v1.schema.json`, `schema/verification/run-v1.schema.json`, `schema/verification/provider-v1.schema.json`, `schema/verification/report-v1.schema.json`, `schema/verification/summary-v1.schema.json`, `schema/verification/review-v1.schema.json` and `schema/verification/adoption-v1.schema.json` with all model fields and exact `schema: "solodesk.verification.<kind>"` / `schema_version: 1`; enforce “Timestamps are UTC ISO-8601, durations/bytes/counts are nonnegative safe integers, SHA values are observed full Git object identities rather than examples, and digests identify their framing/version.”
- [x] T009 Implement bounded inert parsing/reference/schema validation in `tooling/verification/records.mjs` for all eleven families, including “Unknown kinds/versions, duplicate JSON keys, malformed types and unknown security-sensitive fields fail closed with a repair message.”; preserve F001's six result enums and reject F002 records mislabeled as F001 envelopes.
- [x] T010 Implement local/hosted context collection in `tooling/verification/context.mjs` using fixed argument-array Git calls, complete changed-path inventories and exact source identity; enforce “`local`, `hosted-pr` or `hosted-push`; local cannot impersonate hosted” and “`clean` or local reviewed changed/new-file inventory and content digest; hosted execution requires clean checkout,” keeping proposal head/base/tested/raw-provider SHA separate.
- [x] T011 Implement owned-directory allocation, atomic report writes, safe artifact manifests and sanitized diagnostics in `tooling/verification/artifacts.mjs`; enforce “Only allowlisted files inside the owned scratch root are collected; traversal, absolute/out-of-root/symlink targets, active markup/executables and unsafe encodings are rejected.” and bind every artifact to its producer/context/digest/bytes/expiry.
- [x] T012 Create shared limits and baseline policy structure in `verification/policy.v1.json` using the exact security contract bounds: 2 MiB/file, 32 MiB cumulative input, 512 definitions, 2,048 records, 45-minute local coordinator, 15/10/20/2-minute jobs, 50-minute hosted execution duration, 30/60-second desktop launch/case, 10/20-second cleanup, six-minute acknowledged cancellation and seven-day artifacts; distinguish execution duration from owner-review freshness.
- [x] T013 Add `context`, `validate`, help and strict argument/exit dispatch in `tooling/verification/cli.mjs`; return 0/1/2 as contracted, reject unknown/conflicting/unsafe options and unsupported modes, expose no approval/merge/skip-required/record-command-execution option, and allocate inspect output only inside a fresh owned directory.
- [x] T014 Run T006–T007 against the actual shared implementation and capture expected/observed outcomes in `docs/qa/F002.md`; verify F001 `tooling/check-governance.mjs` and its version-1 envelope remain unchanged, and record failures without claiming future stories or hosted runs passed.

**Checkpoint**: Common records/context/output are independently tested and fail closed. Shared safety is present before any workflow can upload evidence.

## Phase 3: User Story 1 — Reproduce the Required Checks (Priority: P1) — First Demonstrable Slice

**Goal**: A contributor runs meaningful baseline checks from a clean checkout and identifies a real introduced regression.
**Independent Test**: Execute baseline checks on two isolated clean contexts, introduce each A-02–A-04 defect separately and verify correct named outcomes/counts. Actual local/hosted agreement is integrated in T079; this checkpoint alone does not claim hosted parity or full F002 readiness.

### Tests First

- [x] T015 [P] [US1] Add clean-setup/dependency-mismatch/hash-preservation fixtures in `tests/verification/integration/setup.test.mjs`, covering manifest/lock inconsistency, incompatible binary identity and forbidden lifecycle execution without real credentials (A-01–A-02).
- [x] T016 [P] [US1] Add CLI/runner fixtures in `tests/verification/integration/runner.test.mjs` for passing/failing assertions, zero discovered files, zero executed tests, missing/truncated completion summary, crash and required skipped/TODO cases; counts must come from actual child execution, not expected fixture generation (A-03–A-04).
- [x] T017 [P] [US1] Add local Markdown/anchor/owning-ID integrity fixtures in `tests/verification/unit/documentation.test.mjs` for broken files/anchors, unsupported relevant syntax, duplicate local IDs, safe external-reference classification and Unicode; never fetch external URLs or treat future code paths as existing linked artifacts (A-03).

### Implementation and Verification

- [x] T018 [US1] Implement restricted clean setup and exact binary checks in `tooling/verification/setup.mjs`: run `npm ci --ignore-scripts --no-audit --no-fund`, compare manifest/lock hashes, preserve required platform optional packages, run the existing reviewed Electron installer only for desktop, and leave unused database rebuilds disabled.
- [x] T019 [US1] Implement reviewed-command execution and result counts in `tooling/verification/run-suite.mjs` with `shell: false`, explicit enrolled entry files, bounded subprocesses and owned cleanup; enforce “Execution states: `prepared → running → completed`; terminal alternatives `failed`, `canceled`, `timed-out`, `superseded`, `unavailable`.” and preserve attempts with zero automatic retries.
- [x] T020 [P] [US1] Implement generalized local reference/owning-ID validation in `tooling/verification/documentation.mjs` against T017, preserving the F001 checker interface, safe path limits and the distinction between feature-local FR/A/SC IDs and global product/phase IDs.
- [x] T021 [P] [US1] Configure `.oxlintrc.json` with verified supported JS/TS/TSX/MTS correctness rules, warnings as errors and no fix mode; prove debugger/unreachable/control-flow/React misuse failures where supported, narrowly exclude only reviewed intentional defect fixtures, and retain tsc as type authority.
- [x] T022 [US1] Enroll exact baseline command IDs/entry files/expected counts/required artifacts in `verification/suites.v1.json`, including typecheck/lint/build/launcher/governance-policy/governance-tests/documentation/verification-unit/verification-integration; enforce “No shell strings or commands can be loaded from a report. Fixture trees are excluded from discovery.” and “An enabled required suite must have real entry files and positive/negative tests.”
- [x] T023 [US1] Extend `tooling/verification/cli.mjs` and `package.json` with scoped baseline `run`/`verify`, lint/unit/integration/docs commands using the common runner; map unit/integration npm wrappers to fixed leaf-runner entry points so enrollment never recursively invokes verify or its own test wrapper; until selection/aggregation is implemented, explicitly report full readiness not evaluated and return unavailable for unsupported groups rather than install no-op passing stubs.
- [x] T024 [US1] Emit complete baseline check reports through `tooling/verification/records.mjs` and `tooling/verification/run-suite.mjs`, enforcing “Status vocabulary remains F001-compatible: `passed`, `failed`, `not run`, `unavailable`, `stale`, `not applicable`.” and “Passing tests require independently observed nonzero counts and no required skips/TODO/failures.”; distinguish non-test file/input counts, preserve the launcher isolation setting and exercise F001 policy/tests without passing it a F002 envelope.
- [x] T025 [US1] Execute each actual controlled type/lint/build/broken-reference/launcher/unit/integration negative and repaired positive path from T015–T017, recording counts, command/tool identities and safe observed outputs in `docs/qa/F002.md`; confirm failures name the defect and next action (A-01–A-04).
- [x] T026 [US1] Repeat clean baseline setup/execution in a second independent disposable checkout with the same declared context/environment and compare outcomes, hashes and counts in `docs/qa/F002.md`; retain environment differences as explicit findings rather than relabeling one run (SC-001).
- [x] T027 [US1] Document runnable baseline commands, prerequisites, defect reproduction and scoped-versus-full-readiness semantics in `docs/features/F002.md` and reconcile the implemented procedure with `specs/002-ci-verification-harness/quickstart.md` (FR-002–FR-005).

**Checkpoint**: US1 delivers an independently demonstrable local baseline. Security/native/aggregate/human stages remain outstanding until their actual results exist; this slice is not merge-ready F002.

## Phase 4: User Story 2 — Receive an Honest Aggregate Result (Priority: P1)

**Goal**: A stable fail-closed aggregate classifies current required outcomes, missing evidence and justified omissions correctly.
**Independent Test**: Run actual CLI aggregation over hand-authored synthetic producer observations/reports; only the complete current set passes. Documentation-only selection still includes mandatory baseline/security. Real hosted failure/repair is performed in US5 after producers are implemented.

### Tests First

- [x] T028 [P] [US2] Add independent selection truth tables in `tests/verification/unit/selection.test.mjs` for docs-only, dependency/native/policy changes, unclassified/renamed/deleted paths, invalid base policy and candidate downgrades; include explicit risk reasons and later missing-suite gaps (A-08, A-10).
- [x] T029 [P] [US2] Add hand-authored gate truth tables in `tests/verification/unit/aggregate.test.mjs` for all required-result states, conflicting/duplicate records, missing/expired artifacts, zero counts, matrix gaps, wrong head/base/attempt and successful automation with human decisions pending (A-06–A-11).
- [x] T030 [P] [US2] Add inert provider-response fixtures in `tests/verification/integration/provider.test.mjs` for exact run/attempt/workflow/job association, pagination/error bounds and raw provider SHA differing from tested merge SHA; fixture data must not authenticate owner consent or count as a live hosted run.
- [x] T031 [P] [US2] Add workflow-contract tests in `tests/verification/unit/workflow.test.mjs` for explicit producer dependencies, docs-only event eligibility, required skip/failure propagation, stable unique aggregate identity and no `continue-on-error` success masking; these tests must fail before the real workflow exists.

### Implementation and Verification

- [x] T032 [US2] Implement base-policy plus additive-candidate selection in `tooling/verification/selection.mjs` with complete bounded inventory and bootstrap authority labeling; enforce “Required baseline definitions cannot be unselected. Contradictory/duplicate decisions block.” and preserve “Unknown future behavior requiring a nonexistent suite is a gap, not an automatic not-applicable decision.”
- [x] T033 [US2] Implement authenticated read-only run/attempt/job/current-PR reconciliation in `tooling/verification/inspect-provider.mjs`, retaining raw provider/head/base/tested identities and actual workflow/blob association; enforce “Pagination and API errors are bounded and visible.”, reject ambiguity and never execute downloaded artifacts or post approvals/statuses.
- [x] T034 [US2] Implement the complete gate algorithm in `tooling/verification/aggregate.mjs` using policy obligations, provider-owned conclusions and separately validated reports/artifacts; enforce “A report with successful counts from a failed/canceled provider job remains blocking.” and “Agent QA/owner approval may be pending in a structurally valid automated summary.”
- [x] T035 [US2] Complete mandatory/risk/target definitions in `verification/policy.v1.json` from the selection contract; enforce “Nonempty unique definitions; baseline cannot be waived by candidate additions” and keep declared Linux x64/Windows x64/macOS arm64 validation targets distinct from product support commitments.
- [x] T036 [US2] Add `select`, `aggregate`, `inspect` and full/scoped `verify` dispatch to `tooling/verification/cli.mjs`, with exact 0/1/2 semantics and supported selection/run/provider schema families; `verify --profile all` cannot exit 0 while a required native/security result is outstanding, while scoped completion is clearly labeled.
- [x] T037 [US2] Create `.github/workflows/verify.yml` with unfiltered relevant PR/default-main push events, context/baseline/security/desktop/aggregate jobs and `F002 / automated-readiness`; enumerate all producers in `needs`, use bounded `if: always()` aggregation, safe event handling and no required producer error waiver.
- [x] T038 [US2] Bind workflow reports/metadata to exact provider run/attempt/job and tested context in `.github/workflows/verify.yml`, loading the standalone base evaluator where present and explicit reviewed bootstrap candidate otherwise; groups not implemented yet must fail unavailable, and absent evidence cannot become a passing placeholder.
- [x] T039 [US2] Exercise real CLI positive/negative aggregation over synthetic repositories/records in `tests/verification/integration/aggregate-cli.test.mjs`, including omission of an entire required producer and a stale comparison base; verify JSON/text agreement and diagnostic repair actions (A-06–A-11).
- [x] T040 [US2] Add regression assertions in `tests/verification/unit/aggregate.test.mjs` that editable approval, agent-only decision, stale/withdrawn owner decision and green checks never produce merge authority, and that automated success does not circularly depend on future agent QA or final owner approval (FR-013–FR-015).
- [x] T041 [US2] Run the US2 contract suites and document observed classifications, bootstrap trust limits, currentness and artifact failures in `docs/qa/F002.md`; update contributor aggregate guidance in `docs/features/F002.md` without claiming synthetic cases are actual hosted outcomes.

**Checkpoint**: US2's classifier and CLI are independently testable. The workflow remains non-ready while any actual security/native producer is unavailable; live green/blocked journeys are not inferred from synthetic tests.

## Phase 5: User Story 3 — Exercise the Real Desktop and Extend Coverage (Priority: P1)

**Goal**: Verify actual built-shell behavior safely and enroll meaningful future suites with honest per-target coverage.
**Independent Test**: Launch the real built main/renderer through the test-only isolation bootstrap, exercise shell interaction/preferences, then verify owned cleanup; separately demonstrate passing/failing suite enrollment and blocked native gaps.

### Tests First

- [x] T042 [P] [US3] Write the real shell assertions in `tests/verification/desktop/shell.spec.mjs` for heading/ready label/disclosure/disclaimer, existing sandbox/context-isolation/Node preferences, absent renderer require and crash/page errors; require actual built-entry identity and owned app paths (A-12).
- [x] T043 [P] [US3] Add suite-enrollment contract tests in `tests/verification/unit/enrollment.test.mjs` for namespaced feature/scenario IDs, explicit real entry files, positive/negative assertions, empty/missing suites and later bilingual/finance/auth/sync/document obligations; no placeholder future-feature pass (A-14–A-16).
- [x] T044 [P] [US3] Add child-process cleanup/desktop-environment integration fixtures in `tests/verification/integration/desktop-cleanup.test.mjs` for launch failure, missing display/sandbox, timeout, wrong profile, crash and leftover owned descendant; retain a separate unrelated process that must survive (A-13).

### Implementation and Verification

- [x] T045 [US3] Implement `tooling/verification/electron-bootstrap.cjs` to pre-create/validate owned userData/sessionData paths, set both synchronously before readiness and require only the fixed unchanged `.vite/build/main.js`; never add product preload/IPC, accept an arbitrary executable path or isolate profiles only after firstWindow.
- [x] T046 [US3] Complete `tests/verification/desktop/shell.spec.mjs` against installed Playwright/Electron with explicit `chromiumSandbox: true`, sanitized allowlisted environment and the bootstrap; assert actual paths/built-code identity, interaction/runtime state and safe screenshots without mocking app behavior or disabling CSP/sandbox.
- [x] T047 [US3] Extend `tooling/verification/run-suite.mjs` with owned desktop PID/tree tracking, signal/finally close, ten-second graceful/twenty-second total cleanup and leftover detection; missing sandbox/display is blocking unavailable, and cleanup cannot terminate unrelated Electron instances or delete home profiles.
- [x] T048 [US3] Configure `playwright.config.mjs` for desktop-only explicit discovery, one worker, zero retries, thirty-second launch/sixty-second case plus cleanup; wire the existing runtime through `package.json` without browser download, a Forge server or installer/release machinery.
- [x] T049 [US3] Extend `verification/suites.v1.json` and `tooling/verification/selection.mjs` with `desktop:<target-id>` and future suite enrollment, preserving “Future suite IDs are unique and namespaced by their owning feature.” and a category-specific reason for every unselected specialist/native obligation.
- [x] T050 [US3] Integrate selected independent Linux x64/Windows x64/macOS arm64 jobs in `.github/workflows/verify.yml` with exact reviewed images, clean build/runtime setup, `fail-fast: false`, matrix parallelism two and per-target evidence; the aggregate must reject missing/ambiguous last-writer matrix outputs.
- [x] T051 [US3] Execute the real smoke and A-13 failure/cleanup cases in an actually available local native environment, recording exact scope/results and the inventory of other required targets in `docs/qa/F002.md`; this task proves only its executed local scope, while full selected-target acceptance remains blocked and explicitly owned by T080 after primary-PR publication.
- [x] T052 [US3] Run T043 enrollment negatives and document new-suite ownership, actual native scope, bootstrap/profile behavior and unimplemented specialist categories in `docs/features/F002.md`; reconcile `specs/002-ci-verification-harness/quickstart.md` with actual desktop entry points (FR-006–FR-008, FR-016–FR-017).

**Checkpoint**: Real desktop behavior and cleanup are proven only on recorded environments. Implementation/local checkpoint completion allows the real CI integration trial to proceed; full US3 acceptance still requires every selected target in T080. No shell smoke claims F004, Arabic, encryption, signing or full product support.

## Phase 6: User Story 4 — Verify Untrusted Contributions Safely and Within Budget (Priority: P1)

**Goal**: Isolate contribution execution, collect safe bounded evidence and report failures/outages without buying resources or masking risks.
**Independent Test**: Run hostile synthetic sentinel/artifact/cache/subprocess/scanner fixtures, verify no privileged side effects, and enforce every declared finite bound. Actual hosted supersession/fork trials follow in US5.

### Tests First

- [x] T053 [P] [US4] Add scanner/disposition fixtures in `tests/verification/unit/security.test.mjs` for secret detection/redaction, audit severities/network outage, unknown/conflicting SPDX metadata, scanner checksum/version failure and scoped/expired suppressions; use synthetic values only (A-17–A-18, A-22).
- [x] T054 [P] [US4] Add artifact-boundary fixtures in `tests/verification/unit/artifacts.test.mjs` for unsafe encodings/active content/traversal/symlink, secret-bearing URLs, wrong digest/context, oversize/truncation/expiry and partial atomic writes; required collection loss stays visible (A-18).
- [x] T055 [P] [US4] Add deadline/cancellation/cache integration fixtures in `tests/verification/integration/limits.test.mjs` for all fixed bounds, unsupported cross-trust reuse, manual attempt history and an unrelated process/run control; verify execution duration, not time since a completed run, controls the fifty-minute budget (A-19–A-21).
- [x] T056 [P] [US4] Add workflow privilege/pinning/trust fixtures in `tests/verification/unit/workflow-security.test.mjs` to reject privileged PR triggers, producer write/OIDC/deploy/secrets exposure, persisted checkout credentials, floating actions and candidate artifact execution by metadata consumers (FR-018).

### Implementation and Verification

- [x] T057 [US4] Implement pinned Gitleaks/actionlint, all-dependency npm-audit and bounded license-inventory/SPDX adapters in `tooling/verification/security.mjs`, preserving actual tool/source/version/input counts, redacted outcomes and unavailable states; never run audit fix, raw-output publication or an unpinned missing-tool install.
- [x] T058 [US4] Complete safe manifest/redaction/collection/expiry enforcement in `tooling/verification/artifacts.mjs`: two-MiB logs, five-MiB screenshots, twenty-five-MiB generic job cap and one-hundred-MiB run cap, with actual reserved allocations and seven-day retention; enforce “Required artifact expiry/access loss blocks current evidence, even if the historic test result remains true.”
- [x] T059 [US4] Enforce local/job/suite/case/cleanup deadlines, bounded output and cancellation/attempt history in `tooling/verification/run-suite.mjs`; retain “Retries create a new attempt; zero automatic retries initially.” and reject over-budget completed or overdue incomplete hosted execution without imposing an owner-review TTL.
- [x] T060 [US4] Disable cross-run cache restores/saves and reject unsupported reuse in `tooling/verification/setup.mjs`; prove fresh per-target installs do not reuse node_modules/native/.vite/report/evidence content, and retain any later caching as a separately reviewed optimization with independent trust keys (A-21).
- [x] T061 [US4] Harden `.github/workflows/verify.yml` with pinned actions, `contents: read` producers, nonpersisted credentials, isolated read-only metadata permissions and allowlisted prevalidated uploads; enable proposal-keyed supersession and separate main-push groups, never exposing metadata tokens to candidate subprocesses.
- [x] T062 [US4] Complete tool/scanner/disposition/limit policies in `verification/policy.v1.json` and `verification/scanner-dispositions.v1.json`; enforce 10/10/20-per-native/10-combined MiB allocation limits within the run cap, explicit finding owner/reason/expiry and no waiver for credential exposure, privilege bypass or other constitutional blockers.
- [x] T063 [US4] Enroll secrets/dependencies/licenses/workflow-syntax and wire `check:security` through `verification/suites.v1.json`, `tooling/verification/cli.mjs` and `package.json`; include development dependencies and visible triage for every severity without inventing legal compatibility or paid-service entitlement.
- [x] T064 [US4] Execute all US4 fixtures against actual adapters/runner/collector and record safe expected/observed outcomes in `docs/qa/F002.md`, including scanner outage, timeout, oversize, expired evidence and unresolved flaky behavior; a failure may not disappear through a retry (A-18–A-22).
- [x] T065 [US4] Exercise synthetic untrusted child execution with no protected credentials, sentinel-safe output and denied privileged behavior through `tests/verification/integration/trust.test.mjs`; record genuine local isolation limits in `docs/qa/F002.md`, leaving live hosted/fork proof explicitly to T078.
- [x] T066 [US4] Document budgets, scanner coverage/triage, least privilege, zero-cache/retry policy and concrete outage/cleanup recovery in `docs/features/F002.md` and `specs/002-ci-verification-harness/quickstart.md`; no service availability, native certification or protection claim follows from local fixtures.

**Checkpoint**: US4's portable trust and bounds contracts are exercised. Hosted isolation/cancellation and all required external scanner results remain actual final evidence obligations.

## Phase 7: User Story 5 — Review Evidence and Adopt Enforcement Without Losing Owner Control (Priority: P2)

**Goal**: Demonstrate the one real primary PR's failure-to-repair journey and prepare current owner-review/enforcement evidence without automatic approval or remote mutation.
**Independent Test**: Inspect the actual primary PR/provider contexts through success/failure/evidence-omission/repair, confirm all native/security/check evidence, and classify pending/stale/withdrawn/unverified owner decisions separately from automated readiness. Adoption preparation must remain distinguishable from activated protection.

### Tests First

- [x] T067 [P] [US5] Add adoption-record contract fixtures in `tests/verification/unit/adoption.test.mjs` for absent authorization, unknown required-check identity, stronger existing constraints, unsupported settings, prepared-versus-active state and compatible recovery without service writes (A-25, A-27).
- [x] T068 [P] [US5] Add review/evidence-lifecycle integration fixtures in `tests/verification/integration/review.test.mjs` covering the five SC-010 decision cases, changed context/carry-forward, current safe artifact access and separate F001/F002 record compatibility (A-23–A-24).

### Implementation and Actual Agent QA

- [x] T069 [US5] Complete Finding/ReviewRecord and delivery-pack validation in `tooling/verification/records.mjs`, enforcing “Status: open, mitigated-awaiting-verification, closed or individually accepted limitation where policy allows.” and “Exposure, privilege bypass, data-loss and other constitutional blockers cannot be accepted away by JSON.”; all agent/owner/independent-review sources remain distinct.
- [x] T070 [US5] Extend `tooling/verification/inspect-provider.mjs` and `schema/verification/adoption-v1.schema.json` for bounded read-only repository/settings/check-identity inspection; enforce “States: prepared, blocked, authorized, activated, verified or reverted.” and “Authorization and verified activation require actual sources/outcomes; a plan or HTTP payload does not satisfy them.”
- [x] T071 [US5] Complete proposal-ready feature guidance and the exact failure/native/enrollment/recovery contract in `docs/features/F002.md`, update affected usage/verification/governance links in `docs/development/setup.md` and `docs/quality/test-strategy.md`, and preserve confirmed/recommended/open product decisions.
- [x] T072 [US5] Prepare a truthfully incomplete observed QA skeleton in `docs/qa/F002.md` and the F002-specific `docs/qa/F002.evidence.json`, with producer/manual/owner stages separate, scenario/outcome maps and actual current sources; missing runs/evidence stay missing and cannot yield a successful final pack.
- [x] T073 [US5] Under actual publication authorization, open or reuse the one primary `[F002] Automated CI and verification harness` PR targeting main; record its real URL, published head/base and pending owner decision in `docs/qa/F002.md`, with actual complete scope and no second primary proposal or fabricated PR identity.
- [x] T074 [US5] Introduce a controlled failing applicable assertion in the same primary PR, inspect actual provider job/aggregate blocking and preserve its run/attempt/artifacts in `docs/qa/F002.md`, then repair the assertion; synthetic outcome fixtures do not satisfy this task (A-26).
- [x] T075 [US5] Introduce a controlled missing mandatory producer report/artifact in that same PR, inspect actual provider/aggregate evidence blocking and preserve the run in `docs/qa/F002.md`, then repair collection without waiving the evidence rule (A-09, A-26).
- [ ] T076 [US5] Inspect actual final repaired hosted success through `tooling/verification/cli.mjs inspect`, recording exact run/attempt/jobs/workflow blob, proposal head/base/tested merge subject and safely available artifacts in `docs/qa/F002.evidence.json`; self-modified CI needs independent actual diff review despite green checks (A-06, A-11, A-26).
- [ ] T077 [US5] Demonstrate same-proposal supersession and an unrelated existing proposal/default-branch control run, recording actual provider acknowledgement/cancellation duration, owned cleanup and unaffected control in `docs/qa/F002.md`; missing control/access remains an unexecuted blocker, not a fabricated run (A-19).
- [ ] T078 [US5] Demonstrate actual hosted fork/untrusted privilege isolation and safe synthetic sentinels under the implemented workflow, recording reviewed credentials/permission/artifact observations in `docs/qa/F002.md`; do not expose real secrets, grant fork write privileges or claim local fixtures prove hosted isolation (A-17–A-18).
- [x] T079 [US5] Compare two independently executed clean local baseline contexts with actual equivalent hosted outcomes and policy selection in `docs/qa/F002.md`; explicitly scope OS/environment differences and record exact preserved identities without reusing a pass from a different subject (A-05, SC-001).
- [ ] T080 [US5] Collect actual passing results for all selected Linux x64/Windows x64/macOS arm64 targets, meaningful later-suite enrollment demonstration and live scanner/limit observations in `docs/qa/F002.evidence.json`; required unavailable native/provider/scanner evidence keeps the corresponding acceptance and this task incomplete (A-12–A-22).
- [x] T081 [US5] Perform actual reviewing-agent QA of the final repaired workflow/tooling/evidence against A-01–A-27 and SC-001–SC-011; record each observed result, synthetic/live distinction, blocker/owner/next action and exact reviewed revision/base in `docs/qa/F002.md`, then repair findings and repeat affected checks before readiness.
- [x] T082 [US5] Prepare the concrete inspected before/proposed protection, real check identity, access/availability limitations and compatible backout record in `docs/qa/F002.evidence.json` and `docs/features/F002.md`; exercise prepared/unavailable/recovery classifications without changing settings, and disclose active-enforcement/tamper-proof claims as unachieved until actually evidenced (A-25, A-27).

**Checkpoint**: The actual primary proposal is reviewable with current automated and agent QA evidence. Owner approval, merge and any separately authorized remote activation remain distinct future actions.

## Phase 8: Polish and Cross-Cutting Evidence — Complete the Concrete Review

**Goal**: Finalize current verification/evidence before seeking owner authorization, then record only real authorized outcomes.

- [x] T083 Run all applicable final baseline, security, native, documentation and independent gate regression checks against the final reviewed subject; store actual command/count/context/results in `docs/qa/F002.md` before final pack validation, and preserve any failed/unavailable/stale obligations.
- [x] T084 Check affected spec/contract/feature/usage/coverage links and phase/local/global requirement IDs, reconcile necessary guidance in `docs/planning/coverage.md` and `docs/development/delivery-governance.md`, and record unchanged customer-data/API/finance/locale/support scope in `docs/features/F002.md` without weakening later product gates.
- [ ] T085 Finalize `docs/qa/F002.md` and `docs/qa/F002.evidence.json` only after their producers complete; map all 30 FRs, 27 acceptance scenarios and 11 success outcomes to actual current observations/safe artifacts, retain failures/attempt history and state pending trusted owner approval explicitly.
- [ ] T086 Validate the complete F002 pack through `tooling/verification/cli.mjs validate`, aggregate/provider inspection and actual artifact access; record the observed final validation in `docs/qa/F002.md`, then assess any QA-transcription head/base changes and repeat affected checks/QA without relabeling old evidence or creating a self-hash loop.
- [ ] T087 Freeze and present the concrete current primary PR/head/base/evidence/recovery to the user; record only an actual explicit current final owner decision and trusted source in `docs/qa/F002.md`, leaving awaiting-approval incomplete while absent/stale/withdrawn and keeping any independent platform review separate.
- [ ] T088 Only after current owner merge authorization and all applicable delivery/remote constraints, perform the authorized merge or inspect an actual owner-performed merge; record the real merge identity/source in `docs/qa/F002.evidence.json`, never infer merge from checks or a plan.
- [x] T089 Reconcile the explicitly authorized enforcement scope in `docs/features/F002.md` and `docs/qa/F002.evidence.json`: if activation is separately authorized and included, apply the concrete reviewed settings only after working check identities exist and inspect/verify actual outcome/recovery; otherwise record prepared/unactivated and keep any included activation requirement pending without bypassing existing constraints.
- [x] T090 Reconcile actual F002 PR/merge/enforcement status and any lagging F001 prerequisite record in root `plan.md` from inspected events, keeping release separate and retaining the one-primary-PR history; perform any post-merge repository transcription in the next authorized documentation change, without inventing an advance SHA or another primary F002 PR.
- [x] T091 Verify unrelated launcher/application/manifest changes were preserved as scoped, run final safe-document/whitespace checks and provide the owner a self-contained result/limits/recovery summary citing `docs/features/F002.md` and `docs/qa/F002.md`; any post-merge transcription follows the next authorized documentation change, not a rewrite of the merged PR; do not declare product features, supported distribution or release from CI delivery.

**Checkpoint**: Every included delivery requirement has actual current evidence and real owner/merge authority. If publication, native access, approval or included enforcement is unavailable, retain explicit blockers and unchecked dependent tasks.

## Dependencies and Execution Order

### Phase and Story Graph

```text
Implementation entry gate / actual F001 merge
  → Phase 1 setup (T001–T005)
  → Phase 2 shared foundation (T006–T014)
  → US1 local baseline (T015–T027)
  → US2 selection/aggregate/workflow (T028–T041)
      ├→ US3 real desktop/enrollment integration (T042–T052)
      └→ US4 trust/security/bounds integration (T053–T066)
  → US5 actual primary-PR QA/adoption preparation (T067–T082), including outstanding hosted/native acceptance
  → final producers → complete evidence validation → owner decision
  → actual authorized merge → separately authorized included enforcement
```

The listed default order is dependency-correct. US2/US3/US4 test and independent leaf-module work can overlap after US1 only with agreed separate file ownership; completing US3 enrollment/native workflow and US4 workflow hardening depends on the US2 selector and workflow (T032/T037–T038); edits to shared CLI/policy/enrollment/workflow/runner/QA files serialize as below. US2's live workflow cannot pass fully until US3/US4 producers exist; US2's standalone classifier is tested with explicitly synthetic inputs. No story-level independence claim removes that actual integration dependency.

### Task Prerequisites and Shared-File Ownership

- T001 precedes all implementation; T002 precedes branch/tool changes; T003 precedes T005. T006/T007 form the first independent test batch after setup; T008–T014 integrate sequentially.
- US1 test batch T015/T016/T017 precedes implementation. T018/T019 complete before independent leaf implementation T020/T021. T022–T027 integrate sequentially; T025/T026 require actual implemented commands.
- US2 test batch T028/T029/T030/T031 precedes implementation. T032–T038 integrate in listed order; T039/T040 require implemented selection/gate/CLI. T031 exercises actual workflow only after T037–T038; no test creation is a passed result.
- US3 test batch T042/T043/T044 precedes implementation. T045 precedes T046; T047 precedes final cleanup acceptance; T048/T049 precede T050, and T051 needs all implemented native prerequisites. Native gaps block required completion.
- US4 test batch T053/T054/T055/T056 precedes implementation. T057–T063 serialize changes to shared artifacts/runner/setup/workflow/policy/enrollment/CLI. T064/T065 require those implementations.
- US5 test batch T067/T068 may be authored together after the US1–US4 local/contract checkpoints with separate ownership; US5 live trials require runnable US1–US4 implementations and their local/contract checks plus publication authority; hosted/native acceptance is completed inside US5, not required before creating the PR that supplies those environments. Completing US5 requires all selected actual platform/provider results. T069–T073 precede real trials; T074/T075 failure experiments precede T076 repair/currentness. T077–T080 supply observations before T081 QA and T082 adoption preparation.
- T083 gathers final producer results before T085/T086 validate the full pack. T084 documentation changes precede final context freeze; any later material change invalidates affected checks/QA/approval. T087 never precedes a concrete current review pack; T088 waits for actual current authorization, and T089 respects its separate adoption authority. T090/T091 reconcile inspected outcomes only.
- `tooling/verification/cli.mjs`, `run-suite.mjs`, `records.mjs`, `artifacts.mjs`, `selection.mjs`, `.github/workflows/verify.yml`, `verification/*.json`, `package.json`, `docs/features/F002.md` and QA files have one editor at a time. Do not infer parallel permission from distinct task labels when paths overlap.

### Explicit Parallel Examples

After each batch's stated prerequisites, the following tasks own different files and may execute concurrently. These examples are scheduling guidance, not agent creation/publication authorization.

| Scope      | Parallel batch            | Prerequisite / reason                                                                                           |
| ---------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Foundation | T006 and T007             | Setup complete; independent unit-record versus temp-repository context test files                               |
| US1        | T015, T016 and T017       | Foundation complete; separate setup, runner and documentation test files                                        |
| US1        | T020 and T021             | T018/T019 complete and corresponding tests written; docs module versus lint config                              |
| US2        | T028, T029, T030 and T031 | US1 complete; separate selection, aggregate, provider and workflow contract files                               |
| US3        | T042, T043 and T044       | Foundation/US1 available; distinct desktop, enrollment and cleanup tests; shared integration remains serialized |
| US4        | T053, T054, T055 and T056 | Foundation/US1 available; distinct scanner, artifact, limit and workflow-trust test files                       |
| US5        | T067 and T068             | US1–US4 local/contract checkpoints complete; adoption fixtures versus review CLI fixtures                       |

There are 20 `[P]` tasks across seven explicit batches. Shared production files, evidence packs and final lifecycle actions are intentionally not marked parallel.

## Requirements and Acceptance Coverage

| Requirement group | Implementing / verification tasks                                     | Scenarios / outcomes                                 |
| ----------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| FR-001            | T001–T005, T070, T088–T090                                            | A-23–A-27; SC-010–SC-011                             |
| FR-002–FR-005     | T015–T027, T079                                                       | A-01–A-05; SC-001, SC-009                            |
| FR-006            | T042, T044–T048, T051, T080                                           | A-12–A-13; SC-005                                    |
| FR-007–FR-008     | T022, T028, T032, T035, T043, T049                                    | A-08, A-10, A-14–A-16; SC-004, SC-009                |
| FR-009–FR-011     | T029, T031, T034–T039, T074–T076                                      | A-06–A-10; SC-002–SC-004                             |
| FR-012–FR-014     | T006–T014, T030, T033–T034, T039, T068–T070, T076, T085–T086          | A-09, A-11, A-23; SC-008                             |
| FR-015            | T034, T036, T040, T068–T069, T087–T088                                | A-06, A-24; SC-010                                   |
| FR-016–FR-017     | T043, T049–T052, T080                                                 | A-15–A-16; SC-005, SC-009                            |
| FR-018–FR-020     | T053–T058, T060–T065, T078                                            | A-17–A-18, A-21–A-22; SC-006                         |
| FR-021–FR-024     | T012, T019, T044, T047, T055, T059–T060, T062, T064, T066, T077, T082 | A-13, A-19–A-21, A-27; SC-007, SC-011                |
| FR-025–FR-026     | T067–T070, T082, T087–T090                                            | A-24–A-25, A-27; SC-010–SC-011                       |
| FR-027–FR-030     | T027, T041, T052, T066–T091                                           | All A-01–A-27 and SC-001–SC-011 in final actual pack |

### Model and Interface Ownership

Policy/toolchain/suite identity is initialized by T003/T008/T012 and completed by T022/T035/T049/T062. Context is T007/T010; applicability is T028/T032; run/attempt/report is T016/T019/T024; artifact manifest is T011/T054/T058; provider observation is T030/T033/T070/T076; aggregate summary is T029/T034; finding/review is T068/T069/T081/T087; enforcement adoption is T067/T070/T082/T089. Every family has schema coverage in T008 and bounded parser coverage in T006/T009.

CLI contract tests are T016/T039; workflow/selection contract tests are T028/T031; evidence/gate tests are T006/T029/T068; security/limits tests are T053–T056; adoption tests are T067. Actual user/provider/native observations remain T025–T026/T051/T064–T065/T074–T082; synthetic contracts do not replace them.

## Implementation Strategy

### MVP First

The first useful demonstration is setup + foundation + US1: a reproducible meaningful local baseline and named defect recovery. Validate it without treating it as a delivered F002 merge or remotely enforced gate. No partial feature PR merge is implied; all included F002 stories remain in the one primary proposal.

### Incremental Delivery

Add US2's independently exercised fail-closed gate, US3's real native shell/enrollment, then US4's scanners/trust/bounds. Keep actual live readiness blocked until all selected producers/evidence exist. Complete US5's actual primary-PR failure/omission/repair, native/fork/supersession/currentness review; only then prepare final current owner review. Do not defer security, native evidence or honest missing-result behavior to a post-merge cleanup phase.

### Conditional External Actions and Recovery

Publication, authentic provider/native access, final approval/merge and remote enforcement activation are real gates with actual trusted sources. If included scope requires an unavailable action, leave its task and dependent completion unchecked with responsible role/reason/next action. If only enforcement preparation is authorized, complete that documentation and report activation unperformed; do not manufacture active settings or expand scope.

Before merge, repair in the same open PR and repeat affected checks/QA/owner review; after merge, use linked maintenance and preserve history. Restore a compatible reviewed verifier or forward repair; never remove protection, claim local results impersonate remote checks or erase failed attempts. Release/deployment and all business-feature work remain separately scoped.

## Notes

- The 91 tasks were generated unchecked. Execution updates record only completed work; future commands/results/settings remain unclaimed until observed.
- The five user stories retain spec priorities: US1–US4 P1 and US5 P2. Dependencies are explicit rather than hidden behind broad parallel labels.
- Applicable tests must observe independently expected failure before the implementation repair; collect actual producer outputs before final evidence-pack validation.
- Every task has a concrete file path; schema/report fields and security-sensitive constraints come from the linked model/contracts, with verbatim boundary/enum constraints quoted in their owning tasks.
- Task generation stops here. `$speckit-analyze` is the next consistency-review workflow when requested; implementation authorization/prerequisites remain unchanged.

- Generation validation completed on 2026-10-18: 91 sequential unchecked tasks; story counts US1 13, US2 14, US3 11, US4 14, US5 16 plus 23 shared tasks; 20 parallel tasks in seven batches. Checklist/label/path and requirement/scenario/outcome coverage checks passed; task/checklist local links and table columns resolved; existing governance policy and whitespace checks passed. These are documentation results, not implementation or future acceptance execution.
