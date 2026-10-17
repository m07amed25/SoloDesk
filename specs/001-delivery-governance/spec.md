# Feature Specification: F001 — Delivery Governance and PR Standards

**Feature Branch**: `feat/f001-delivery-governance-and-pr-standards` (proposed by the root plan;
not created by this specification)

**Created**: 2026-10-17

**Status**: Draft — specification complete and reviewed for requirements quality; F001 delivery,
verification, user approval, merge and release remain pending.

**Input**: User description: "Build a full specs for F001 in plan.md"

**Feature identity**: F001; milestone P00 — Product and development governance;
parent requirement NFR-014; no prerequisite feature phases.

**Source authority**: [F001 phase contract](../../plan.md#f001) and sections 1–5 of the
[root plan](../../plan.md), [requirements](../../docs/product/requirements.md),
[constitution v1.0.0](../../.specify/memory/constitution.md),
[product brief](../../PRODUCT.md), [decision register](../../docs/planning/decisions.md),
[agent entry point](../../AGENTS.md), [agent guide](../../AGENT.md) and
[documentation index](../../docs/README.md).

F001 gives contributors, reviewing agents and the project owner one consistent way to define a
bounded change, demonstrate its result and decide whether it may merge. It reduces ambiguous
scope, missing evidence and premature completion claims. The present request creates specification
artifacts only. It does not implement these standards, open a pull request or approve a merge.

The constitution was drafted earlier in this conversation and is currently an uncommitted
working change. It is an existing input to preserve and review, not proof that the complete F001
phase has passed. Older source descriptions calling it a placeholder must be reconciled during
F001 delivery. Specification directory numbering identifies this Spec Kit artifact independently
of the F001 phase identity and proposed implementation branch.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Find the governing scope and rules (Priority: P1)

As a contributor, I want to identify the applicable product principles, authorized work and
unresolved decisions before starting a change, so that I do not accidentally implement a proposal
or replace an existing product choice.

**Why this priority**: All later work depends on knowing what is authorized and which rules govern
it. This journey is useful even before a pull request exists.

**Independent Test**: Give a contributor the repository entry point and sample confirmed,
recommended and unresolved decisions. Verify that the contributor can identify the controlling
sources, permitted work and blocked dependent actions without changing the application.

**Acceptance Scenarios**:

1. **A-01 — Given** the agent entry point and constitution, **When** a contributor identifies the
   scope of F001, **Then** they find the product principles, NFR-014, governance deliverables and
   documentation-only authorization, with links to their sources.
2. **A-02 — Given** a recommendation and an unresolved decision, **When** a contributor prepares
   dependent work, **Then** neither is labeled a confirmed choice; the blocked action and decision
   owner are recorded while unrelated authorized work can continue.
3. **A-03 — Given** an older document calling the constitution a placeholder and an existing
   constitution draft, **When** a contributor reviews the baseline, **Then** they record the
   discrepancy, preserve the draft and other working changes, and do not claim F001 is complete.
4. **A-04 — Given** a proposed change to a confirmed principle, **When** it is reviewed, **Then**
   the proposal records rationale, affected requirements, compatibility and verification impact,
   required owner decision, version change and amendment date without silently changing policy.

### User Story 2 - Prepare one bounded, reviewable feature proposal (Priority: P1)

As a contributor, I want a standard delivery identity and description for one feature, so that the
reviewer can understand its problem, resulting behavior, boundaries and dependencies in one place.

**Why this priority**: A consistent proposal prevents scope from being fragmented across unrelated
pull requests and makes the owner's review concrete.

**Independent Test**: Prepare a synthetic F001 change proposal using the proposed conventions,
without publishing it. A reviewer must be able to identify every required field and detect an
oversized or incorrectly split proposal.

**Acceptance Scenarios**:

1. **A-05 — Given** F001 as the selected phase, **When** a contributor prepares its delivery,
   **Then** it has one phase identity, one proposed feature branch, one primary pull request
   targeting `main`, and links to NFR-014 and its no-prerequisite status.
2. **A-06 — Given** a prepared proposal, **When** a reviewer reads it, **Then** they can identify
   the problem/result, included/excluded scope, changed documentation, evidence, relevant impacts,
   recovery plan, limitations and approval status without reconstructing a chat history.
3. **A-07 — Given** a phase too large for one reviewable outcome, **When** the contributor proposes
   splitting it, **Then** new phase identities, dependencies and coverage are agreed before
   implementation; multiple primary pull requests cannot silently share the original phase ID.
4. **A-08 — Given** failed verification on an open feature pull request, **When** a fix is prepared,
   **Then** the fix and repeated evidence stay in that same primary pull request. A later defect
   after merge uses a linked maintenance phase and does not rewrite the merged record.

### User Story 3 - Judge evidence and identify incomplete work (Priority: P1)

As a reviewing agent, I want consistent evidence and applicability records, so that I can tell
what was actually checked, what failed and what remains unverified.

**Why this priority**: A standard description alone cannot establish correctness. Evidence must
prevent planned, skipped and unavailable work from being mistaken for successful verification.

**Independent Test**: Review synthetic complete, missing, failed, stale and unavailable evidence
packs for a documentation-only feature. Verify that only a complete current pack reaches the
appropriate review state and that every rejection identifies the missing evidence or repair.

**Acceptance Scenarios**:

1. **A-09 — Given** a governance-only change, **When** automated verification and agent QA are
   recorded, **Then** policy links, phase/requirement references, approval-bypass cases and policy
   consistency have actual results, while unrelated product journeys have individual reasons for
   inapplicability rather than fabricated passes.
2. **A-10 — Given** a pack containing only planned scenarios, old shell evidence or an unavailable
   future check, **When** it is reviewed, **Then** the applicable result remains not run,
   unavailable or stale; the phase cannot claim that verification passed.
3. **A-11 — Given** executed verification, **When** evidence is recorded, **Then** the exact
   revision, comparison baseline, environment, fixtures, steps/commands, expected and observed
   outcomes, artifacts, defects, reviewer and date can be traced without exposing secrets.
4. **A-12 — Given** a missing policy reference or a route that allows merge without owner approval,
   **When** automated consistency checks and agent review evaluate the policy, **Then** the finding
   blocks completion and names the repair; a broad waiver cannot convert it to a pass.
5. **A-13 — Given** a real documentation review, **When** the reviewing agent records QA,
   **Then** observations describe the policy actually inspected and the positive/negative cases
   exercised. The report does not imply that product workflows or native targets were exercised.

### User Story 4 - Give final approval for the current result (Priority: P1)

As the project owner, I want to review the concrete change and its latest evidence before deciding
whether it may merge, so that passing checks never substitute for my final decision.

**Why this priority**: The owner has already required automated tests plus agent QA followed by
user approval. This is the decisive authorization boundary for every feature pull request.

**Independent Test**: Evaluate review cases with green checks but no approval, approval supplied
by an agent, stale approval, a valid current owner decision and an own-account author. Determine
merge eligibility without performing a merge or requiring a second human reviewer to exist.

**Acceptance Scenarios**:

1. **A-14 — Given** passing automated checks and agent QA but no owner decision, **When** merge
   readiness is evaluated, **Then** the phase stays awaiting user approval and must not merge.
2. **A-15 — Given** a concrete current pull request, complete applicable evidence and no blocking
   defect, **When** the user explicitly approves that identified result, **Then** the record binds
   the decision to the pull request and reviewed revision and can advance to approved.
3. **A-16 — Given** an agent recommendation, a checked approval box, silence, or approval for an
   earlier revision, **When** final approval is evaluated, **Then** none counts as a current
   explicit human decision. The record identifies the actual approving user and source evidence.
4. **A-17 — Given** an approved revision, **When** a material change alters scope, policy, behavior,
   acceptance or evidence, **Then** affected verification and approval become stale, historical
   evidence remains available and the current result returns through review before merge.
5. **A-18 — Given** the pull request author uses the owner's account, **When** approval is recorded,
   **Then** owner QA/merge authorization is recorded honestly and is not labeled an independent
   platform review. Any separately configured unmet review requirement remains a blocker.

### User Story 5 - Track outcome, recovery and next-phase handoff (Priority: P2)

As a maintainer, I want accurate phase states and recovery guidance, so that I can resume failed
work safely and distinguish a specified feature from a merged or released result.

**Why this priority**: This closes the delivery record and lets F002 consume an agreed governance
contract without pretending its automation already exists.

**Independent Test**: Walk a synthetic phase record through success, failure, blocked review,
material-change invalidation and merge/release handoff. Every advance must have the required
current evidence, and every pause must identify a next action.

**Acceptance Scenarios**:

1. **A-19 — Given** a new phase record, **When** it advances through preparation, building,
   verification and review, **Then** each transition has evidence and failed/blocked work records
   a reason, responsible role and next action without destroying prior results.
2. **A-20 — Given** current owner approval and satisfied merge conditions, **When** a merge is
   actually performed under its authorized scope, **Then** the record includes the real pull
   request reference and merge identity; release remains a separate pending decision and action.
3. **A-21 — Given** F002 verification tooling is not delivered, **When** F001 evidence is reviewed,
   **Then** actual available local checks are reported honestly and automation/enforcement needs
   are handed off to F002. No future check is represented as running or installed.
4. **A-22 — Given** a base revision, policy or evidence correction that affects prior conclusions,
   **When** readiness is reassessed, **Then** affected checks/review repeat, unrelated working
   changes remain intact and recovery preserves the last valid policy and audit history.

### Edge Cases

- A source file still says the constitution is a placeholder: identify and reconcile the stale
  description during delivery; do not discard the newer draft or treat the phase as merged.
- A single phase accumulates separate model, interface and test proposals: consolidate before
  merge or agree new feature identities before implementation; no silent multi-PR exception.
- An applicable check fails, times out, loses its artifact or cannot run because of quota/access:
  record the actual status and next action. Missing required evidence remains a blocker.
- A category is genuinely irrelevant to a governance-only change: record the subject-specific
  reason; inapplicable does not mean passed and cannot waive documentation or approval checks.
- A policy reference is broken, an ID is unknown/retired or the same ID is reused: block completion
  until the reference is repaired or its explicit retirement/replacement is documented.
- The author and owner share an account, or no independent human reviewer is available: preserve
  automated checks, agent QA and owner approval; do not invent an independent review identity.
- A draft contains green checks but unresolved blocking findings: do not advance to approval or
  merge readiness. Nonblocking limitations must state their scope and owner disposition.
- A revision changes after approval or its comparison baseline changes: assess impact, repeat
  affected verification and obtain current final approval before merge. Pure formatting can
  retain unaffected evidence only with a documented no-impact explanation and traceable revision.
- A review artifact contains a token, customer data or a confidential path: exclude/redact it from
  the shared evidence, record the incident through the applicable security process and replace
  the evidence with a usable safe artifact; do not approve a known exposed-secret pack.
- Work is performed without connectivity: local documentation can be reviewed, but unavailable
  remote checks, publication, approval records and merge outcomes cannot be claimed completed.
- A rejected or withdrawn approval exists: keep its history, record the requested change or reason
  and require a new explicit approval after the current review conditions are satisfied.
- Existing remote protections differ from the documented policy: report observed constraints at
  delivery time; do not bypass them or silently reconfigure the service from a specification.

## Requirements _(mandatory)_

### Functional Requirements

The following FR identifiers are local to this F001 specification and refine NFR-014. They do not
replace or renumber the project's stable requirements.

- **FR-001**: Governance MUST identify F001, milestone P00, NFR-014, the absence of prerequisite
  feature phases and the distinction between specification readiness and delivered phase status.
- **FR-002**: Contributor guidance MUST link the governing entry point, constitution, product,
  decisions and phase contract, preserving confirmed/recommended/open distinctions and blocking
  only the work dependent on unresolved decisions.
- **FR-003**: F001 delivery MUST review and retain concrete constitutional principles covering
  authorized scope, platform/trust boundaries, cloud/offline authority, exact immutable finance,
  security, bilingual accessibility, recovery and evidence. It MUST preserve existing valid
  documentation and working changes and reconcile stale descriptions of the constitution.
- **FR-004**: The amendment policy MUST identify who authorizes a product-policy change and require
  rationale, impact, version/date and compatibility/verification consequences. Initial adoption
  and amendments MUST use the constitution's version/date rules; temporary amendment-review
  comments MUST be removed before the constitution is committed.
- **FR-005**: Each feature/platform phase MUST have one implementation branch and one primary pull
  request targeting `main`. The conventions MUST be `feat/f###-short-slug` and title
  `[F###] <feature outcome>`; F001's proposed identity is stated above. These conventions MUST NOT
  be interpreted as branches or pull requests already created by specification work.
- **FR-006**: Work MUST start only after its prerequisite phases have merged and its blocking
  decisions are resolved. Independent concurrent phases require separate file ownership and an
  agreed integration plan. Oversized work MUST be split into agreed new IDs and updated
  dependencies/coverage before implementation.
- **FR-007**: The reusable pull request description MUST capture problem/result, phase and
  requirement IDs, prerequisites, included/excluded scope, changed docs, verification results and
  artifacts, relevant data/security/financial impacts, recovery, limitations and approval state.
- **FR-008**: Every delivered phase MUST supply feature guidance and a QA report in the same
  primary pull request, linked to the affected owning specifications and decisions. F001's
  required future deliverables are `docs/features/F001.md`, `docs/qa/F001.md`, the reviewed
  constitution and reusable PR description convention; this specification does not create them.
- **FR-009**: QA evidence MUST record the exact reviewed revision and comparison baseline,
  environment, synthetic fixtures or reviewed documents, steps/commands, expected/observed results,
  dated reviewer identity, redacted artifacts, defects and the approval record.
- **FR-010**: Each verification result MUST distinguish passed, failed, not run, unavailable,
  stale and not applicable. A plan, created test, successful build, old shell check or skipped
  required check MUST NOT count as evidence that a different behavior passed.
- **FR-011**: Applicable verification categories MUST be chosen from documentation/reference
  consistency, existing regression, domain/contracts, permissions/privacy, offline/retry/recovery,
  bilingual/accessibility, artifacts, native platforms, migrations and release/security concerns.
  An inapplicable category MUST name the unchanged subject and reason; no blanket waiver is valid.
- **FR-012**: F001 MUST have automated results for policy links, valid phase/requirement references
  and absence of undocumented approval bypass. Before F002 exists, available local checks MUST
  be recorded without claiming a remote enforcement workflow is installed or required checks ran.
- **FR-013**: Agent QA MUST inspect the actual policy artifacts and exercise the governance
  positive/negative cases, recording findings and recovery actions. Reviewing policy prose MUST
  NOT be reported as executing product, bilingual UI or native runtime workflows.
- **FR-014**: Missing required evidence, unresolved blocking defects, constitutional violations
  or a route around final user approval MUST block completion/merge readiness. Findings MUST
  identify affected requirements, severity, responsible role and a concrete next action.
- **FR-015**: Final merge authorization MUST come explicitly from the user after reviewing the
  concrete current pull request and applicable evidence. It MUST identify the approving user,
  date, approved pull request/revision and trusted source of that decision. Agent advice, copied
  text, checked boxes, silence and green checks MUST NOT substitute for user authorization.
- **FR-016**: Owner approval and any platform-required independent human review MUST be recorded
  separately. An own-account author's approval MUST NOT be labeled independent review. Existing
  mandatory remote constraints MUST remain satisfied; agents MUST NOT invent reviewers or bypass
  protection to accommodate staffing.
- **FR-017**: Material changes after checks, QA or approval MUST invalidate affected evidence and
  current approval until repeated review. Historical records MUST remain traceable. A changed
  comparison baseline MUST trigger an impact assessment and repeat any affected checks; a
  no-impact decision MUST include its rationale and current revision association.
- **FR-018**: Phase tracking MUST distinguish planned, decision-ready, building, PR open/draft,
  automated checks passed, agent QA passed, awaiting user approval, approved, merged and released.
  Failed/blocked work MUST identify reason, responsible role, last valid state and next action.
  No phase may advance on unsupported assertions.
- **FR-019**: Fixes before merge MUST remain in the same primary feature pull request. Defects
  after merge MUST use a linked maintenance phase/change, preserving the original delivery and
  approval history.
- **FR-020**: Merge readiness MUST require included requirements delivered, applicable current
  checks and QA passed, documentation/recovery complete, prerequisites merged, no blocking defect,
  current user approval and any mandatory remote requirements satisfied. Recommended squash
  merge MUST NOT create an auto-merge entitlement or authorize an actual merge by itself.
- **FR-021**: A completed merge MUST record the real pull request reference and merge identity in
  the root plan or an explicitly adopted tracker. Release/deployment MUST remain separate and
  require the applicable release gates and existing or newly granted user authorization.
- **FR-022**: Review records MUST explain how to recover from failed checks, policy defects or
  rejected approval, including repeat-review requirements and preservation of the prior valid
  policy. Recovery MUST NOT discard unrelated work, falsify history or undo merged work silently.
- **FR-023**: Governance MUST define remote PR-only/protection enforcement as a proposed policy
  requiring delivery-time inspection and authorized configuration. It MUST hand off automated
  verification/enforcement to F002 without claiming current service settings or available checks
  have been verified by this specification.
- **FR-024**: Evidence MUST use synthetic or redacted data and exclude credentials/customer
  content. Paid tooling, account/service changes, external publication and messages MUST NOT be
  implied by policy documentation. Cost/access failures MUST remain visible verification gaps.
- **FR-025**: F001 MUST document why product state machines, stored business data, runtime
  permissions, financial calculations and application-language/native journeys are unaffected by
  the governance-only change, while preserving their mandatory gates for later relevant phases.
- **FR-026**: F001 MUST remain planned/pending in delivery tracking until its actual artifacts,
  checks, agent QA and final user approval are recorded and the primary pull request merges.
  This specification and its checked quality checklist MUST NOT satisfy that exit gate.

### Key Entities _(include if feature involves data)_

These are review records and relationships, not a request for new application data storage.

- **Feature Phase**: Stable F-ID, milestone, parent requirements, outcome, boundaries,
  prerequisites, blocking decisions, responsible roles and current delivery state.
- **Change Proposal**: One primary pull request for a phase, its branch/target, problem/result,
  included/excluded scope, relevant impacts, recovery guidance and current reviewed revision.
- **Evidence Record**: Phase/scenario IDs, revision/baseline, environment, fixtures, procedure,
  expected/observed outcome, result status, safe artifact reference, reviewer/date and findings.
- **Review Finding**: Affected rule/scenario, severity, observed problem, owner, next action,
  disposition and verification that closes it. A blocking finding prevents readiness.
- **Approval Record**: Human decision maker, date, decision/source, phase/pull request/revision,
  applicable evidence and validity status. Rejected, withdrawn and stale decisions remain history.
- **Governance Decision**: Confirmed/recommended/open classification, responsible decision maker,
  rationale, affected principles/requirements, approval and version/date/compatibility impacts.

### Scope and Authority Boundaries

**Included in F001 delivery**: Concrete project principles; branch/pull-request identity rules;
reusable proposal and evidence conventions; feature/QA guidance; current-check and agent-review
policy; final user approval; phase transitions; traceability; failed/stale-review recovery; and
policy consistency verification. These govern repository delivery rather than customer workflows.

**Excluded from this specification request**: Creating implementation branches, commits, pull
requests, feature guidance/QA reports or a PR template; changing the constitution or other existing
source documents; checking phase delivery complete; changing remote settings; and running an
implementation/planning command automatically.

**Excluded from F001's feature scope**: F002's automated verification harness and remote check
machinery; application features, screens, data contracts or migrations; cloud/encryption/sync
implementation; full navigation/localization design; all P00 milestone decision resolution;
production provisioning, paid services, external communications and release deployment.

**Roles**: The contributor prepares the bounded change and repairs findings. The reviewing agent
records actual QA and recommends readiness. The user/project owner gives final merge approval and
authorizes product-policy changes. A separately available human reviewer only supplies an
independent review when required by an agreed or existing remote rule; no new staffing condition
is introduced. These are delivery roles, not application workspace permissions.

**Operational limits**: Local document preparation remains possible offline; remote outcomes must
wait for actual access. F001 creates no customer-facing UI, localized runtime messages, privileged
commands, new financial policy, data retention window or business state machine. Product-level
permission, English/Arabic/RTL, security, exact finance and recovery requirements remain intact.

### Delivery States and Acceptance Traceability

The root plan's lifecycle is preserved:
`planned → decision-ready → building → PR open/draft → automated checks passed → agent QA passed
→ awaiting user approval → approved → merged → released`.

This is an evidence-backed delivery sequence, not a promise of automatic transitions. Failed or
blocked overlays preserve the last valid state. A material change removes current readiness and
requires affected checks/QA followed by current final approval. Merged is recorded only after an
actual merge; released is recorded only after an actual authorized rollout and release proof.
Specification quality status is separate from every phase-delivery state above.

| Requirement group             | Acceptance scenarios                          | Expected evidence                                                                       |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| FR-001–FR-004                 | A-01–A-04                                     | Source/authority audit, baseline preservation and amendment example                     |
| FR-005–FR-008, FR-019         | A-05–A-08                                     | Complete proposal plus split/fix/maintenance counterexamples                            |
| FR-009–FR-014, FR-024–FR-025  | A-09–A-13; exposure/quota edge cases          | Current safe evidence pack, applicability records, policy checks and agent observations |
| FR-015–FR-017, FR-020         | A-14–A-18, A-22; withdrawn-approval edge case | Current/absent/forged/stale approvals and explicit merge eligibility decisions          |
| FR-018, FR-021–FR-023, FR-026 | A-19–A-22                                     | Phase history, blocked recovery, real-result requirements and F002 handoff              |

## Success Criteria _(mandatory)_

### Measurable Outcomes

These are future acceptance targets for F001 delivery, not outcomes achieved by writing this spec.

- **SC-001**: A contributor and the owner can each identify the governing scope, source decisions,
  NFR-014, phase dependencies and final approval authority from the linked policy records, with
  no unresolved contradictory instruction about who may authorize merge.
- **SC-002**: Every required proposal and evidence field in FR-007–FR-009 is present or has an
  individual justified applicability explanation in the reviewed F001 delivery pack; every
  required document reference and phase/requirement identifier resolves correctly.
- **SC-003**: All 22 acceptance scenarios have recorded expected/observed outcomes in the F001
  governance review; zero applicable failed, missing, unavailable or stale results are labeled
  passed or hidden by a blanket waiver.
- **SC-004**: All ten approval/readiness cases are classified correctly: current explicit owner
  approval with otherwise satisfied gates; missing approval; agent-only approval; silence;
  unchecked source of approval; stale revision; withdrawn approval; blocking defect despite green
  checks; own-account approval mislabeled independent; and an unmet mandatory remote review.
  Only the first case is merge-eligible.
- **SC-005**: A material-change review demonstrates that affected evidence and approval become
  stale and are renewed before readiness; the previous decisions remain retrievable, with zero
  unsupported advances to merged or released.
- **SC-006**: The owner can make an explicit approve/request-changes decision from the concrete
  proposal and evidence summary without needing the conversation history, and the recorded
  decision identifies the reviewed result and any remaining limitations.
- **SC-007**: The accepted F001 delivery records exactly one primary feature pull request and,
  after actual merge, one merge identity; it preserves existing valid product choices, stable
  requirements and unrelated work, and leaves F002 tooling and all business features unclaimed.

## Assumptions

- **Existing choices**: The root plan's one-feature/one-branch/one-PR convention and automated
  tests → agent QA → final user approval sequence are already confirmed inputs. This feature
  defines their reviewable operation rather than asking the owner to choose them again.
- **Current baseline**: The constitution draft is reusable input requiring review and eventual
  commit; this invocation preserves it. No F001 implementation PR, merge or approval is inferred
  from that draft or this specification.
- **Naming**: The phase-specific branch spelling comes from the user-referenced root plan.
  Specification storage is `specs/001-delivery-governance`; its `001` prefix does not create a
  branch, rename a phase or replace the root programme plan. Downstream planning is F001-specific.
- **Merge method**: Squash merge remains a recommendation from the root plan. The required outcome
  is one traceable primary pull request, preserved evidence and current owner authorization;
  F001 does not silently configure a repository merge method.
- **Staffing**: Agent QA and owner approval suffice for the documented staffing model. Independent
  human review is not invented as a new prerequisite, and any existing mandatory service rule
  must still be inspected and satisfied at authorized delivery time.
- **Verification availability**: F001 may rely on available local checks before F002. A required
  check that cannot run remains a documented blocker unless the established policy permits
  equivalent evidence that is actually executed and reviewed; unavailable remote evidence never
  becomes a pass by assumption.
- **Applicability**: Governance artifacts use repository documentation; they do not introduce
  customer-visible application behavior. Product-only categories can be inapplicable to F001
  with individual explanations, without weakening their requirements for later features.
- **Open decisions**: Q-01–Q-16 remain tracked by their existing owners. None needs an invented
  answer to specify F001's review policy; dependent features remain gated by the relevant answer.
- **Dependencies and handoff**: There are no prerequisite feature phases. Existing sources and
  access to the current repository are inputs. F002 depends on actual merged F001 delivery and
  consumes the agreed governance/evidence contract. This spec does not unblock F002 by itself.
- **Preservation and adoption**: Source inconsistencies are recorded for the F001 delivery work;
  this invocation does not migrate the project workflow or rewrite root documents. The only new
  artifacts are this specification, its requirements-quality checklist and the active feature
  pointer required by the selected specification workflow.
