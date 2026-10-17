# F001 Validation Quickstart

**Status**: Implemented local validation guide. Commands below are available; actual observed
results are in [F001 QA](../../docs/qa/F001.md). Owner approval, merge and release remain pending.

**Read first**: [specification](spec.md), [plan](plan.md), [PR interface](contracts/pull-request.md),
[evidence record](contracts/evidence-record.md), [review rules](contracts/review-policy.md) and
[local CLI contract](contracts/local-validation.md). Field definitions live in [the model](data-model.md).

## 1. Prerequisites and Current Inspection

Use an existing SoloDesk checkout with Node 24, Git and the repository's existing locked dependencies
for shell regressions. Run commands from the repository root. Do not reinstall packages, initialize
a new project, create an implementation branch or change remote settings merely to read this plan.
If dependencies/tooling are missing, report unavailable checks and follow the existing development
setup only within the applicable authorized scope.

Available read-only inspection commands:

```bash
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git diff --check
node --version
.specify/scripts/bash/check-prerequisites.sh --paths-only --json
```

Expected now: the active feature resolves to `specs/001-delivery-governance` and its `spec.md` and
`plan.md`. The actual implementation branch is `feat/f001-delivery-governance-and-pr-standards`;
feature-context BRANCH may be `001-delivery-governance` because specification storage is separate. Earlier uncommitted
constitution/specification artifacts must be preserved. `git diff --check` alone does not inspect
untracked files, prove link correctness or establish feature acceptance.

Planning artifacts should contain no unfilled template slots or unresolved design questions;
linked local sources and contract files must exist. The root programme/spec/constitution remain
unchanged by planning. The implementation adds `tasks.md`, QA records, checker and PR template.

## 2. Implementation Setup Boundary

The user authorized F001 implementation. Inspect the latest `main`,
preserve unrelated working changes and use the one proposed F001 branch/primary PR. Follow W1–W4
in [the plan](plan.md), then validate the actual delivered policy and tool files.

Before running the future commands, require these implementation artifacts to exist:
`tooling/check-governance.mjs`, `tooling/check-governance.test.mjs`, the synthetic fixtures,
operational guide, PR template, `docs/features/F001.md`, `docs/qa/F001.md` and its evidence sidecar.
These are prerequisites, not files produced by this planning invocation.

Do not invent a lint, formatter, CI run, authenticated approval check or remote protection setting.
F002 owns their later enforcement/integration where applicable. Missing applicable F001 artifacts
are a concrete readiness failure to repair in the same primary PR.

## 3. Local Verification Commands

The implemented governance interface:

```bash
node tooling/check-governance.mjs
node --test tooling/check-governance.test.mjs
```

Expected: bounded policy/reference validation; positive and independently expected negative
fixtures behave as contracted; complete current evidence has honest states and no blocking
structural findings. Exit 0 means local documentary checks passed, with an explicit notice that
owner-source authenticity/authorization and remote constraints are outside the checker's authority.
It does not mean merge eligible. Missing artifacts, stale/failed required evidence, unsafe input or
unknown schema version produce the [contracted nonzero exit and repair diagnostic](contracts/local-validation.md).

Run the existing shell regressions required by the root minimum delivery contract:

```bash
npm run test:launcher
npm run typecheck
npm run build
```

Expected: actual exit/result captured for the current context. These prove their narrow shell/
configuration subjects only. They do not establish F001 approval, native OS support, encryption,
Arabic UI, financial correctness or service readiness. Build outputs are generated/ignored
artifacts, not new deliverables. Record a real unavailable/failure state if any command cannot run;
do not substitute earlier setup results for current execution.

## 4. Capture Current Evidence Without a Revision Loop

Capture the actual observed head/base and reviewed policy paths. Record the reviewed content digest
and explicit evidence-container exclusions, following [the model's snapshot rules](data-model.md).
Assign the top-level `pack_id` and `snapshot.id`, resolving every cross-reference. Include all
changed non-evidence F001 files, especially checker/tests/fixtures and new files, not just prose.
Verify the canonical SHA-256 framing and reject missing subjects or mismatched digest values.
For each command/document review, record inputs, independent expectation, actual observation,
result, environment, safe artifacts and reviewer/date. Keep all prior findings and superseded results.

If writing the report/sidecar creates a new commit, record the actual originally measured revision
and a current-context carry-forward assessment for unaffected subjects. Re-run checks whose input
changed. Do not silently edit a tested SHA to imply execution on a different commit. Any substantive
policy/evidence-conclusion change requires affected checks/QA and current final owner confirmation.

After collecting the regression results and all required governance observations in sections 5–6,
run the final evidence-pack gate before owner review:

```bash
node tooling/check-governance.mjs --evidence docs/qa/F001.evidence.json --format json
```

This final gate runs after its evidence producers. Incomplete packs remain blocked; an early
diagnostic is not a successful final gate or a reason to prevent gathering the missing evidence.

Review report content and sidecar together: neither a valid JSON envelope nor a green command
proves that a claimed human source exists or is authentic. Keep pending approval explicitly pending.

## 5. Execute All Governance Journeys

Use safe synthetic proposals and records plus inspection of the actual delivered policy. Record
the 22 scenario outcomes individually in QA; the table groups setup only, not evidence results.

| Scenarios | Exercise | Expected result |
| --- | --- | --- |
| A-01–A-04 | Follow source links; classify confirmed/recommended/open inputs; preserve the existing draft; review a synthetic amendment | Correct scope/NFR-014, no silent policy choice, stale-source repair and traceable amendment requirements |
| A-05–A-08 | Prepare complete/oversized/split proposals; repair a failed open-PR case; classify a post-merge defect | One primary PR, complete description, split before implementation and linked maintenance after merge |
| A-09–A-13 | Inspect actual policy; feed missing/broken/stale/failed/unavailable evidence; check individual applicability and safe artifacts | Required failures block readiness; no fabricated product execution; expected/observed policy results recorded |
| A-14–A-18 | Evaluate all ten AP cases, own-account handling and current source/revision requirements | Only AP-01 eligible in the synthetic policy context; no agent/silence/checkbox approval substitution |
| A-19–A-22 | Walk lifecycle, blocked/failed overlays, changed base, material change and F002 handoff; demonstrate outcome classification | History retained, affected readiness invalidated, actual events distinguished from synthetic demonstrations |

Also inspect the specification's edge cases: missing/retired/reused references, unsupported syntax,
quota/access failure, private evidence, offline work, withdrawn approval and mismatched remote rules.
For local negative tests, use only synthetic temporary roots/records. Do not damage live policy
files, embed a live secret, perform a real unsafe merge or revoke real access to prove a failure.

Scenario A-20's synthetic demonstration verifies the rule for recording real outcomes. It does
not create a real merge. Its actual outcome record is completed only after an authorized real
merge. SC-007's actual merge identity is likewise not prefilled during review.

## 6. Evaluate the Ten Approval Cases and Seven Outcomes

Follow AP-01–AP-10 in [the review contract](contracts/review-policy.md). Record case-specific
expected/observed classification, blocked reason and next action. Source authentication is a
fixture assumption only in synthetic tests; actual owner consent must be observed in trusted
current context. Both automatic fixture results and actual agent policy review are required.

For SC-001–SC-007, verify source comprehensibility, field/link completeness, all 22 scenario
records, ten correct approval classifications, material-change recovery, owner decision quality
and the one-primary-PR outcome. Do not mark the real owner decision or merge event passed before
it occurs. A policy can pass classification tests while its real phase remains awaiting approval.

Product-specific categories get individual unchanged-subject reasons per the evidence contract.
Governance links/IDs, approval/review logic, redaction and required shell regressions remain actual
subjects; they cannot all be waived as "documentation only."

## 7. Present the Concrete Result and Record the Actual Decision

When PR publication is authorized, prepare one complete current PR; use the template's body
manually for F001 before default-branch adoption. Include source authority, scope, latest results,
agent findings, limits and recovery. Freeze the reviewed tree and identify its head/base/evidence.

Present the actual result for the user's final approval. Observe a trusted explicit decision;
record its source separately from any independent platform review. The actual decision may remain
in its identifiable source, with the QA report pointing to the PR discussion. Do not create a
new head just to transcribe consent. If the head/base or evidence changes materially, repeat the
affected review before relying on consent for merge.

Inspect applicable real remote constraints before an authorized merge; do not assume them from
planning research or a local JSON field. Do not send messages, configure settings, purchase
services or merge merely because this guide contains the step.

## 8. Merge Reconciliation, Recovery and F002 Handoff

After current approval and satisfied gates, perform a merge only within authorized scope. Capture
the actual PR merge event and identity. Reconcile root `plan.md` status in the next authorized
change, preserving the single primary F001 PR and linking the real event. Until reconciled,
disclose stale root status rather than invent a future SHA or silently adopt another tracker.
Release/deployment remains separate and unperformed unless independently authorized.

Failed checks or review before merge are repaired in the same PR and retain their observations.
Rejected/withdrawn approval returns to repair/awaiting-owner state. Post-merge policy defects use
linked maintenance work and safe backout review; never overwrite original results or discard
unrelated files. No application migration is involved.

Give F002 the agreed CLI, evidence states, fixtures, approval-source boundary and current limitations.
F002 begins only after actual merged F001 prerequisites; this planning artifact cannot satisfy them.
