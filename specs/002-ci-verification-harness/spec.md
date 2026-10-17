# Feature Specification: F002 — Automated CI and Verification Harness

**Feature Branch**: `feat/f002-automated-ci-and-verification-harness` (proposed implementation identity; no branch created by specification)

**Created**: 2026-10-17

**Status**: Draft — requirements quality reviewed; ready for technical planning; implementation not authorized by this request

**Input**: User description: "Build a full specs for F002 in plan.md"

**Feature / Milestone**: F002 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: Actual merged F001 delivery, not merely its specification or passing local checks. Repository records currently describe F001 as awaiting final user approval and merge; recheck actual outcomes before dependent implementation.

**Parent requirements**: NFR-008 (bounded, measured verification), NFR-014 (traceability and evidence), NFR-015 (platform/UI and renderer-boundary verification). Security, privacy, recovery, accessibility and native-platform checks support the relevant constitutional principles without claiming those future product capabilities are implemented.

**Authority**: [root F002 card](../../plan.md#f002), [common delivery contract](../../plan.md#4-mandatory-contents-of-every-feature-pr), [requirements](../../docs/product/requirements.md), [constitution v1.0.0](../../.specify/memory/constitution.md), [delivery governance](../../docs/development/delivery-governance.md), [decision register](../../docs/planning/decisions.md), [verification strategy](../../docs/quality/test-strategy.md), [acceptance](../../docs/quality/acceptance.md) and [F001 local-validation contract](../001-delivery-governance/contracts/local-validation.md).

F002 gives contributors reproducible verification and gives the owner an honest, current account of what ran, what failed and what still needs review. It supplies a reusable foundation for later features; it does not substitute test scaffolding for implemented product behavior or approve a merge.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reproduce the Required Checks (Priority: P1)

As a contributor, I can run the same declared checks from a clean local checkout and in hosted verification, so I can identify and repair a regression before requesting review.

**Why this priority**: Later phases need a dependable baseline rather than machine-specific results or an undocumented collection of commands.

**Independent Test**: Run the declared baseline on a clean synthetic checkout, then introduce one known defect for each check category. Compare local and hosted outcomes for equivalent environments and inspect the named failures.

**Acceptance Scenarios**:

1. **A-01 — Clean baseline**: **Given** a clean checkout and the declared runtime, **When** the contributor runs baseline verification, **Then** dependency installation honors the committed dependency record without changing it, and type, lint, build, documentation, governance and existing regression checks report individual results.
2. **A-02 — Dependency mismatch**: **Given** inconsistent dependency declarations and their committed resolution record, **When** setup runs, **Then** it fails visibly before dependent checks, and no updated dependency record or reused successful result conceals the mismatch.
3. **A-03 — Known defect**: **Given** separately introduced type, lint, compilation, broken-reference and launcher-regression defects, **When** each affected check runs, **Then** that check reports failure and a contributor can identify the affected subject and recovery action.
4. **A-04 — Meaningful runners**: **Given** the reusable unit and integration runners, **When** known passing and failing assertions execute, **Then** both runners distinguish the outcomes, report test counts, and reject a required suite that discovers no tests.
5. **A-05 — Local/hosted agreement**: **Given** the same revision, check selection and equivalent declared environments, **When** checks run locally and remotely, **Then** applicability and pass/fail classifications agree, with environment-specific differences explicitly identified rather than silently ignored.

---

### User Story 2 - Receive an Honest Aggregate Result (Priority: P1)

As the owner or reviewing contributor, I receive one stable automated-readiness result for every relevant proposal revision, even when its changes are documentation only or another check cannot finish.

**Why this priority**: A skipped check or missing evidence must not become a misleading green result or an indefinitely pending gate caused by change filtering.

**Independent Test**: Exercise an isolated set of check outcomes and a real F002 proposal using controlled failing and repaired revisions. Verify the aggregate against every required-result state, change category and evidence defect.

**Acceptance Scenarios**:

1. **A-06 — All applicable checks pass**: **Given** all required automated checks passed and their required evidence is valid for the current context, **When** aggregation finishes, **Then** it reports automated readiness and lists separately whether agent QA and owner approval are still pending.
2. **A-07 — Required result missing or unsuccessful**: **Given** one required result is failed, missing, canceled, timed out, unavailable, stale or unexpectedly skipped, **When** aggregation evaluates the proposal, **Then** automated readiness is blocked and names that result; success from unrelated checks cannot override it.
3. **A-08 — Documentation-only proposal**: **Given** only documentation changes, **When** verification starts, **Then** the mandatory baseline, including documentation/governance checks, and aggregation execute, and each omitted risk-triggered category has an explicit policy-supported reason.
4. **A-09 — Evidence omission or forgery**: **Given** absent required evidence, a broken artifact reference, a mismatched revision, duplicate/conflicting results or an editable declaration that an unrun check passed, **When** aggregation validates the records, **Then** it blocks readiness and distinguishes the specific defect from a real executed failure.
5. **A-10 — Risk and selection changes**: **Given** a verification-policy, dependency, native-runtime or otherwise unclassified change, **When** checks are selected, **Then** relevant broader checks are required or selection is blocked for review; an unrecognized path or a contributor's unsupported waiver cannot silently reduce coverage.
6. **A-11 — New revision or base**: **Given** an earlier successful run, **When** the proposal head or comparison base changes, **Then** old evidence is retained as history but cannot establish current readiness without the governance-required impact assessment and repeated affected checks.

---

### User Story 3 - Exercise the Real Desktop and Extend Coverage (Priority: P1)

As a feature contributor, I can test the real desktop shell and add independently meaningful suites for later features without replacing the verification foundation or mistaking browser-only checks for desktop proof.

**Why this priority**: F003 and subsequent phases need a working test foundation; future financial, authorization, Arabic and recovery behavior must remain honest coverage gaps until implemented and exercised.

**Independent Test**: Start the existing application in an isolated desktop test environment, observe the welcome shell and exit cleanly. Inject launch failure and cleanup failure. Verify suite enrollment and platform applicability with synthetic future-feature declarations.

**Acceptance Scenarios**:

1. **A-12 — Desktop smoke**: **Given** an available declared desktop test environment, **When** the harness launches the real application, **Then** it observes the welcome shell, captures safe diagnostics, shuts down owned processes and reports the actual OS/runtime tested.
2. **A-13 — Launch or cleanup failure**: **Given** a launch error, missing display/native prerequisite, timeout or leftover owned process, **When** the harness ends, **Then** it reports failure or unavailable as appropriate, performs bounded cleanup and cannot claim a successful desktop test.
3. **A-14 — Coverage grows with the feature**: **Given** a later authorized feature adds a suite and its applicable categories, **When** verification discovers/selects it, **Then** its actual tests contribute to readiness, while missing required coverage blocks rather than being replaced by an empty placeholder suite.
4. **A-15 — Platform scope**: **Given** a change affecting native behavior, **When** its verification scope is selected, **Then** each affected Windows, macOS and Linux target has an executed result or an explicit blocking gap; one OS result is never copied to another.
5. **A-16 — Bilingual and specialist scope**: **Given** a later change affecting user interaction, finance, permissions, sync or rendered documents, **When** its evidence is evaluated, **Then** applicable bilingual/RTL/accessibility and specialist scenarios are required; the unchanged welcome-shell smoke cannot satisfy them.

---

### User Story 4 - Verify Untrusted Contributions Safely and Within Budget (Priority: P1)

As the repository owner, I can accept verification from untrusted contributions without exposing protected credentials, customer data or administrative actions, and I can bound resource consumption.

**Why this priority**: Verification executes contribution-controlled content. Its privileges, logs, artifacts and resource limits are part of the safety boundary.

**Independent Test**: Use synthetic secret sentinels, hostile contribution fixtures, conflicting cache contexts and superseded/timeout runs. Inspect accessible privileges, records and cleanup without real credentials or paid resources.

**Acceptance Scenarios**:

1. **A-17 — Untrusted contribution**: **Given** a fork or otherwise untrusted proposal, **When** its checks execute, **Then** protected credentials and privileged write/signing/deployment actions are unavailable, and reports remain distinguishable from trusted operational evidence.
2. **A-18 — Diagnostic privacy**: **Given** a synthetic sensitive value in failure output or an oversized artifact, **When** evidence is collected, **Then** unsafe content is excluded/redacted, collection respects configured bounds, and loss of required safe evidence remains visible rather than becoming a pass.
3. **A-19 — Superseded run**: **Given** two revisions of the same proposal, **When** the newer run supersedes the older one, **Then** the older run stops within the declared cancellation bound, unrelated proposals continue, and only current-context results contribute to readiness.
4. **A-20 — Exhaustion and outage**: **Given** a stuck job, exhausted allowance, unavailable runner or hosted-service outage, **When** configured bounds are reached, **Then** work terminates or reports unavailable, no paid capacity is purchased automatically, and readiness remains blocked unless a separately permitted equivalent result is actually executed and reviewed.
5. **A-21 — Dependency/cache integrity**: **Given** a changed dependency record, incompatible native environment or cache from a different trust context, **When** setup attempts reuse, **Then** it rejects incompatible/untrusted reuse and still performs current verification; a cache hit cannot count as a passed check.
6. **A-22 — Security findings**: **Given** a detected credential exposure, dependency/license concern or unsafe verification permission, **When** results are summarized, **Then** the finding, severity, responsible reviewer and required action are recorded, with blocking risks preventing readiness and no silent acceptance.

---

### User Story 5 - Review Evidence and Adopt Enforcement Without Losing Owner Control (Priority: P2)

As the owner, I can understand the current result and recovery path, compare configured enforcement with documented policy, and give final approval only after actual agent QA of the concrete proposal.

**Why this priority**: Working automation must become an understandable delivery contract without turning green checks, editable evidence or remote configuration into human consent.

**Independent Test**: Review the F002 primary proposal's safe evidence, exercise its failure-to-repair journey, and compare proposed enforcement with inspected service settings. Classify pending, forged, withdrawn and stale owner decisions without changing remote settings during specification.

**Acceptance Scenarios**:

1. **A-23 — Reviewable pack**: **Given** a completed verification attempt, **When** the owner opens its summary, **Then** phase/requirement/scenario IDs, actual revision/base, environment, selected checks, commands, counts, observed results, safe artifacts, limitations and next actions are available without reading chat history.
2. **A-24 — Separate human stages**: **Given** green automated checks but missing agent QA or current explicit owner approval, **When** delivery status is assessed, **Then** only the completed stage advances; no approval, merge, release or independent human review is inferred.
3. **A-25 — Enforcement adoption**: **Given** separately authorized remote enforcement work, **When** an operator prepares activation, **Then** current permissions/settings and available check identities are inspected, the concrete proposed changes and recovery are reviewable, and activation cannot require a nonexistent check or weaken an existing mandatory constraint.
4. **A-26 — Real failure-to-repair journey**: **Given** the one primary F002 proposal, **When** a controlled applicable-check failure and a controlled evidence omission are each introduced and then repaired, **Then** actual hosted outcomes demonstrate blocking followed by recovery on the current repaired revision, with all experimental revisions and final QA traceable.
5. **A-27 — Unavailable protection or rollback**: **Given** unavailable remote enforcement or a harmful verification configuration, **When** recovery is assessed, **Then** the precise gap and last valid policy are documented, automated-readiness claims remain separate from remotely enforced protection, and restoration does not waive required checks or user approval.

### Edge Cases

- A required suite runs zero tests, filters out all relevant cases, silently quarantines failures or becomes flaky: block until meaningful coverage runs; preserve every attempt and the unresolved defect.
- A failed check succeeds only on retry: retain the failure and investigate; a declared rerun policy cannot erase a blocking intermittent defect.
- A deleted, renamed, new or unusually named file is unclassified: select conservative coverage or block for review; do not infer no impact from absent path matching.
- A proposal edits the selection policy, evidence validator or gate itself: broaden policy/negative testing and require agent review of the change; self-authored evidence cannot establish its own trust.
- A merge conflict, stale comparison base, duplicate check identity or result from another proposal appears: report ambiguous/stale context and block current readiness.
- Verification cannot start because the host is unavailable: the absence of a result is a gap; eventual timeout/cancellation must not be presented as a test failure caused by product behavior or as success.
- A contributor lacks a native OS, display, installed dependency or network access: permitted local checks still run, required unavailable checks remain visible, and no native support claim follows from the available environment.
- A result artifact expires before review: retain its summary/history, but regenerate or restore required review evidence; an expired link cannot support a current required claim.
- A test runner crashes after producing partial results: preserve safe partial diagnostics and block; partial successes cannot satisfy the required suite.
- Host artifact collection fails after tests pass: distinguish executed test results from missing required evidence and block the aggregate where evidence is mandatory.
- The F002 draft has green checks while its controlled negative experiments or agent QA remain incomplete: automated success does not establish feature completion.
- An owner-decision transcription is committed after review: reassess the changed context under F001; do not create a self-referential approval loop or transfer approval from an old revision automatically.
- A clean-install/native compatibility issue exposes a preexisting dependency problem: record and bound the necessary repair in F002, or explicitly split scope before implementation; do not silently replace the stack or expand into later product work.

## Requirements _(mandatory)_

### Functional Requirements

FR identifiers are local to F002. They refine the stable parent requirements without replacing or renumbering them. “Required” means selected by the reviewed applicability policy for the current phase, change and environment; it does not mean every future suite exists today.

- **FR-001**: F002 MUST retain its phase, P01 milestone, NFR-008/NFR-014/NFR-015 links, F001 prerequisite and one-primary-proposal identity. Implementation readiness MUST require inspected actual F001 merge and the applicable entry decisions; specification quality alone cannot satisfy either.
- **FR-002**: Verification MUST publish reproducible local entry points and equivalent hosted execution for declared check categories, naming the runtime, environment prerequisites, configuration and recovery for unavailable prerequisites.
- **FR-003**: Clean dependency setup MUST honor committed versions/resolution records, fail on inconsistency without rewriting them, and detect incompatible dependency/native-environment reuse. Optimization MUST NOT skip current checks or accept untrusted cache content.
- **FR-004**: The baseline MUST execute type validation, lint, build, documentation/requirement-reference integrity, F001 governance validation and the existing launcher regressions. The new lint category MUST have meaningful enforced rules; an absent command cannot be reported as a pass.
- **FR-005**: Reusable unit and integration runners MUST execute independently observable assertions, expose counts/results, detect deliberately failing cases and fail when a required suite contains zero tests. F002 MUST include real harness-contract tests, not invented future domain coverage.
- **FR-006**: A desktop harness MUST launch the real existing application, observe its welcome state, collect safe failure evidence and close its owned processes. Browser-only rendering and successful compilation MUST NOT be labeled desktop end-to-end proof.
- **FR-007**: Later authorized features MUST be able to enroll domain, storage, boundary, sync, UI/localization, document, provider and release suites with stable scenario IDs and applicability records. F002 MUST distinguish an available runner from an implemented and executed feature suite.
- **FR-008**: A reviewed applicability policy MUST declare mandatory baseline checks, risk-triggered categories and individually justified omissions. Dependency, verification-policy and native-boundary changes MUST receive their relevant broader checks. Unclassified changes MUST use conservative coverage or block for review.
- **FR-009**: Every relevant proposal revision, including documentation-only changes, MUST receive a stable uniquely identified aggregate result. Change filtering MUST NOT suppress the only required aggregate; it MUST assess unsuccessful prerequisites and conclude when those outcomes are available.
- **FR-010**: The aggregate MUST pass only when all selected required automated results and required producer evidence are valid for the current context. Failed, missing, unavailable, canceled, timed-out, stale, conflicting or unexpectedly skipped results MUST prevent success. Policy-justified not-applicable results MUST remain individually visible.
- **FR-011**: Results MUST distinguish passed, failed, not run, unavailable, stale and justified not applicable, and retain cancellation, timeout, unexpected skip or malformed-record reasons. Missing tools and collection errors MUST NOT be disguised as product-test failures or successful execution.
- **FR-012**: Evidence MUST identify phase/requirements/scenarios, actual head/base and executed subject, environment/runtime, command or procedure, counts where relevant, expected/observed outcome, result, date, reviewer/producer, artifacts and defects. Unsupported evidence versions, missing mandatory fields, duplicate/conflicting results and broken required references MUST block readiness.
- **FR-013**: Automated results MUST be associated with actual execution identity/context; contributor-editable assertions MUST NOT replace missing trusted run results. Validation MUST state its limits: record structure does not authenticate human consent, prove arbitrary prose true or replace agent QA.
- **FR-014**: A new head/base or changed reviewed subject MUST invalidate affected results until repeated checks or a governance-permitted, documented no-impact assessment associates unchanged evidence with the current context. Prior observed identities/results MUST remain history, never be relabeled as newly executed.
- **FR-015**: Automated readiness, completed agent QA, current owner approval, merge and release MUST remain separate states. The aggregate MUST NOT require future owner approval to report automated success, or infer it from success. Final merge readiness MUST require all F001 conditions and any mandatory remote constraints.
- **FR-016**: Required native verification MUST name actual OS/architecture/runtime targets and report each separately. Risk selection MUST cover every affected declared target; missing required targets block that claim. Hosting availability MUST NOT silently define the product support matrix or close Q-11.
- **FR-017**: Applicable future interactive changes MUST carry English/Arabic/RTL/accessibility evidence, including required manual/fluent review; finance, permission, sync, migration and document changes MUST carry their specialist cases. An unchanged-shell check or placeholder suite MUST NOT waive those categories.
- **FR-018**: Contribution verification MUST use minimum privileges, isolate untrusted execution from protected credentials and privileged write/signing/deployment operations, and use reviewed fixed external execution dependencies. Untrusted execution MUST NOT gain privilege through a different event, artifact, cache or follow-on consumer.
- **FR-019**: Fixtures and artifacts MUST use synthetic/redacted data. Evidence collection MUST exclude credentials/customer content, constrain unsafe file references/content, and visibly report when required safe evidence could not be retained. Tests MUST prove isolation using synthetic sentinels rather than real secrets.
- **FR-020**: Verification MUST include credential-exposure, dependency-risk and license checks with recorded tool coverage/limitations. Findings MUST receive explicit severity, responsible reviewer and disposition; blocking findings cannot be silently waived or hidden by a successful build.
- **FR-021**: F002 MUST declare finite run/job/desktop-cleanup timeouts, cancellation bounds, parallelism and per-run artifact size/retention limits before implementation adoption. Limits MUST be reviewable, enforced and included in evidence; exceeding them MUST stop bounded work and surface the gap without purchasing resources automatically.
- **FR-022**: Newer runs MUST supersede older runs for the same proposal while preserving run history and allowing unrelated proposals to continue. Superseded results MUST NOT satisfy current readiness; shared resources and owned processes MUST be cleaned up within declared bounds.
- **FR-023**: Failed checks MUST provide the failing subject, safe diagnostic, reproduction path and concrete next action. Reruns MUST preserve attempt history and require a declared policy; unresolved flakiness MUST remain a defect rather than be hidden through retries.
- **FR-024**: Local verification MUST remain usable when hosted checks are unavailable, within its declared prerequisites. Equivalent local evidence MUST only replace a hosted requirement where the governance policy permits it and real execution/review establishes equivalence; it MUST NOT impersonate a required remote result or remove existing protection.
- **FR-025**: Separately authorized remote enforcement adoption MUST inspect current permissions/settings, verify actual available check identities and prepare concrete activation/recovery records. Adoption MUST preserve existing mandatory constraints, keep ordinary direct updates/force-push/deletion restricted under the adopted policy, and avoid a required check that cannot report.
- **FR-026**: Remote policy MUST keep automated checks, resolved-review requirements and final owner authorization distinct. Independent human review MUST NOT be invented when unavailable or misrepresented by agent/author approval. No automated merge, release, privileged service change or bypass is implied by F002.
- **FR-027**: F002 delivery MUST include feature guidance, observed QA, applicability/enrollment instructions, current-check inventory, limits, failure recovery, and compatible rollback/forward-repair guidance. Necessary source/contract changes MUST retain F001 evidence compatibility or declare versioning/migration explicitly.
- **FR-028**: Agent QA MUST exercise the actual one primary F002 proposal through controlled applicable-check failure, missing-evidence failure and repaired success, plus cancellation and secret-isolation cases. Synthetic validator tests alone MUST NOT be reported as real hosted operation.
- **FR-029**: Automated gate tests MUST independently cover successful aggregation and every unsuccessful required-result state, documentation-only selection, stale context, evidence defects, unsafe trust reuse, empty suites and coverage-policy changes. Expected classifications MUST not be generated solely by the same logic being tested.
- **FR-030**: F002 MUST remain incomplete until delivered scope, current applicable checks, real agent QA, complete safe evidence, merged prerequisites, no blocking defects and current explicit user approval satisfy the common exit gate, followed by actual merge. Later phases and all release claims MUST remain unclaimed by specification or harness creation.

### Key Entities _(include if feature involves data)_

These are verification/review records, not customer business records or a new application database.

- **Verification Policy**: Versioned baseline categories, risk rules, applicability reasons, trusted result sources, resource limits and permitted equivalence/rerun rules; governed by review rather than a proposal's unchecked declaration.
- **Verification Context**: Phase, primary proposal, actual head/base, changed/reviewed subjects, policy version, environment and trust classification; shared by selection, execution and aggregation.
- **Check Definition / Applicability Decision**: Stable identity, purpose, required conditions, expected evidence and per-context selected/not-applicable/blocked reason, linked to requirements/scenarios.
- **Verification Run / Attempt**: Context, producer identity, selected checks, start/end, supersession relationship, limits, observed outcomes and cleanup status; retries retain separate attempt history.
- **Check Result**: Check/scenario identity, status and reason, executed context, test counts, expected/observed outcome, diagnostic/artifact references and findings.
- **Evidence Artifact / Summary**: Safe content reference, producing attempt/context, size/retention/expiry, review availability and collection status. An artifact's existence is not proof of the claimed behavior.
- **Finding / Review Decision**: Affected rule, severity, owner, remediation, accepted limitation where permitted, actual agent QA or trusted human-decision reference and current/stale/withdrawn state.
- **Enforcement Adoption Record**: Inspected current settings/access, proposed settings, verified check identities, authority, observed activation, verification and recovery; absent activation remains a documented gap.

### Scope and Authority Boundaries

**Included in F002 delivery**: Reproducible locked setup; type/lint/build and existing regressions; documentation/governance integrity; meaningful unit/integration runners and desktop smoke; suite selection/enrollment; always-evaluated aggregation; safe current evidence; credential/dependency/license checks; bounded resource use; supersession and failure recovery; real proposal QA; and preparation for separately authorized remote enforcement adoption.

**Remote enforcement**: The root plan assigns enforcement to F002. Specification can define it now. Changing repository settings requires its own actual authorization and current-service inspection; no activation, available plan entitlement or authenticated approval integration is claimed here. Lack of enforcement must be explicit rather than concealed behind local validation.

**Excluded from this request**: Application/tooling/CI implementation, dependencies or installations, branches/commits/pull requests, new hosted settings, purchases, provisioning, deployment, messages, adoption of a new workflow system, automatic planning/task-generation commands or phase completion.

**Excluded from F002 feature scope**: F003 domain primitives; F004 trust-boundary implementation; F005 bilingual application shell; F006 encryption proof; product/cloud/sync/finance/portal features; legal/financial policy resolution; signing/release pipelines and full production native certification. F002 supplies verification extension points and applies existing policy; it does not deliver these later behaviors.

**Roles**: Contributors prepare and repair checks/evidence; automated producers execute and report within their trust scope; the reviewing agent exercises actual integrated behavior; the owner gives final approval and authorizes service/policy changes; available specialist/native/fluent reviewers supply required evidence. Delivery roles do not create product permissions or a new independent-review staffing requirement.

**State and recovery contract**: Within an attempt, checks are selected, run and concluded with explicit outcomes; the aggregate reports automated ready or blocked with reasons. Supersession cancels older work, and repaired revisions produce new results without erasing history. Missing required input defaults to blocked. F001's feature lifecycle remains authoritative; failed/blocked overlays preserve the last valid state. Repair and re-verification precede renewed QA/approval. Recovery never turns disabled checks, removed protection or old approval into readiness.

**Data/security/locale impact**: F002 stores only verification metadata and safe artifacts under declared limits; it introduces no business schema, customer migration, retention decision, new financial policy or customer-facing translation workflow. Verification records must safely handle Unicode/Arabic identifiers. English/Arabic product, accessibility, encryption and permission obligations remain mandatory for the later relevant features.

### Acceptance and Constitution Traceability

| Requirements                  | Acceptance scenarios  | Expected evidence / constitutional concern                                                                            |
| ----------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| FR-001, FR-025–FR-028, FR-030 | A-23–A-27             | Actual prerequisite, one primary proposal, inspected enforcement, recovery and separate owner decision; I/VIII        |
| FR-002–FR-005                 | A-01–A-05, A-21       | Clean setup, meaningful positive/negative runner results and local/hosted comparison; II/VIII                         |
| FR-006–FR-008, FR-016–FR-017  | A-10, A-12–A-16       | Actual desktop smoke, selection tests, platform/applicability gaps and future-suite enrollment; II/III/IV/VI/VII/VIII |
| FR-009–FR-015, FR-029         | A-06–A-11, A-24, A-26 | Independently expected gate classifications, evidence provenance and invalidation; I/V/VIII                           |
| FR-018–FR-024                 | A-17–A-22, A-27       | Safe trust boundaries, sentinels, scans, enforced bounds, cancellation and outage/retry recovery; V/VII/VIII          |

Constitutional principles III, IV, VI and VII constrain future suite applicability and prohibit false product claims here. F002 does not exercise product offline edits, financial issuance, Arabic workflows or customer-data migration merely by testing the verification harness. The principles' actual runtime gates remain with their owning features.

## Success Criteria _(mandatory)_

### Measurable Outcomes

These are future F002 acceptance targets, not results of writing this specification.

- **SC-001**: A contributor completes two independent clean verification runs from the documented procedure without undocumented machine-specific steps; equivalent local and hosted contexts produce identical applicability and pass/fail classifications for the baseline and each injected defect.
- **SC-002**: All 27 acceptance scenarios have traceable expected/observed outcomes. Every required-result state and evidence-defect case in A-07/A-09 blocks automated readiness; there are zero false successful classifications in the controlled negative set.
- **SC-003**: In the one primary F002 review proposal, the owner can inspect actual blocked results for an applicable-check failure and evidence omission, then inspect current successful automated results after both repairs, with all earlier attempts retained.
- **SC-004**: Every relevant reviewed revision, including a documentation-only revision, has an aggregate outcome or an explicit unavailable-service gap. Zero required checks disappear through selection, and zero omitted categories lack an individual policy-supported reason.
- **SC-005**: Each declared affected desktop target is represented by an actual result or an explicit blocking gap. Every executed smoke observes the real welcome shell and either completes cleanup within its declared limit or reports a failure; zero results imply support for an untested target.
- **SC-006**: The controlled trust/privacy cases expose zero protected synthetic sentinels to untrusted execution or shared artifacts, enable zero privileged side effects, and reject all incompatible/untrusted reuse cases. Detected scan limitations and findings remain visible to the owner.
- **SC-007**: Every cancellation, timeout and artifact-budget trial meets its declared finite bound or reports a blocking defect; no trial silently adds paid capacity, and cancellation of one proposal leaves the unrelated control proposal running.
- **SC-008**: For every result required at review, the owner can retrieve its current context, selected check, actual outcome, limitation and recovery action from the summary and available safe evidence. Zero expired/missing required artifacts or old-context results are presented as current proof.
- **SC-009**: A contributor can enroll and execute one synthetic later-feature suite with a meaningful passing and failing case using the published instructions. Missing/empty coverage is rejected, and no enrollment claims an unimplemented business feature passed.
- **SC-010**: All five delivery-decision cases are classified correctly: automated success with agent QA pending; completed QA with owner decision pending; unverified editable approval; withdrawn/stale approval; and current explicit owner authorization with every other gate satisfied. Only the final case can be merge-ready.
- **SC-011**: The reviewed F002 pack records exact finite resource limits, observed use and enforcement coverage; it separately identifies every proposed, activated or unavailable enforcement rule, with zero claimed settings changes unsupported by inspected outcomes.

## Assumptions

- **Source of scope**: “F002 in plan.md” selects the existing automated CI and verification card, not a request to overwrite the root programme plan or implement it. This invocation creates one feature specification, its quality checklist and active-feature pointer, plus a discoverable link from that card.
- **Naming and workflow**: Sequential numbering resolves to `specs/002-ci-verification-harness`. The root plan's proposed `feat/f002-automated-ci-and-verification-harness` branch remains independent of that directory. No branch switch is needed for documentation. The active-feature pointer selects F002 for downstream commands without changing F001 artifacts.
- **Observed baseline**: The current repository has a welcome shell, launcher tests and F001 governance tooling. Its package manifest declares type/build/launcher entry points; it does not establish a complete generalized lint/CI/desktop-test foundation. Existing test-library dependencies are not proof that a desktop runner is working. No F002 runtime verification is claimed by this spec.
- **Prerequisite**: F001 is required to merge before F002 implementation starts. Current documentation may lag an actual merge; only an inspected real outcome satisfies the prerequisite. Preparing this specification does not require pretending F001 has merged.
- **Applicability**: Mandatory baseline checks apply to the whole current verification contract; expensive native/specialist suites are selected by reviewed risk rules. Future suites become required when their owning feature and affected behavior exist. “Planned” is never a successful result.
- **Policies still open**: Q-01–Q-16 remain unchanged. Q-11 blocks final supported native-target commitments; Q-02 and Q-16 block production capacity/service promises. Identity, encryption, offline duration and financial choices stay with their owning features; F002 may use synthetic fixtures without resolving them.
- **Entry decisions**: Current hosted-verification settings/access, available runner/check identities and finite artifact/runtime budgets must be inspected and recorded before adoption. Exact numeric limits and runner versions are technical-planning decisions, not invented product guarantees. Unavailable access blocks only dependent hosted/enforcement claims, not independent documentation.
- **Cost**: Prefer the existing low-cost service direction within verified available limits. This specification makes no pricing, quota or entitlement claim and authorizes no paid runner, visibility change or subscription.
- **Evidence compatibility**: Reuse F001's result vocabulary, traceability and current-review rules. Its local validator and evidence format are baseline contracts, not proof of authenticated hosted results or human approval. A generalized change must preserve compatibility or document a reviewed version transition.
- **Approval and experimental revisions**: Controlled hosted success/failure experiments belong to the same future primary F002 proposal and synthetic context. They precede final agent QA and owner review; the final repaired revision must be frozen and its current evidence reviewed. No additional feature proposal, auto-merge or external communication is implied.
- **Recovery**: Preserve the last valid policy and evidence history. Repair or restore a known compatible verification revision, reassess changed contexts, then repeat affected checks/QA. If remote constraints prevent recovery, disclose the blocker instead of removing safeguards or treating local results as remote enforcement.
