# F001 Review, Approval and State Contract

**Status**: Future policy contract; no owner decision or real merge is asserted.
**Requirements**: FR-013–FR-026; A-12–A-22; SC-004–SC-007.
**Related**: [record model](../data-model.md), [evidence contract](evidence-record.md),
[contributor interface](pull-request.md).

## Ordered Review and Eligibility

The confirmed sequence is current applicable automated verification, actual agent QA, then the
user's final decision on the concrete result. A manual readiness assessment must find all of:

1. One primary phase PR; correct scope/target and included requirements delivered.
2. Merged prerequisites and resolved blocking decisions for this phase's authorized work.
3. Complete current documentation/recovery and individually justified applicability records.
4. Current applicable required checks and agent QA with no failed/unavailable/stale gaps.
5. No open blocking finding, constitutional violation or known sensitive-data exposure.
6. An explicit current trusted owner decision identifying the actual PR, reviewed head/base and
   evidence pack, after the current meaningful changes and applicable review.
7. Any independently mandatory remote checks/reviews and resolved required conversations satisfied.

Result: `eligible` or `blocked`, with each unmet gate, responsible role and next action. This is a
manual assessment, not output authorizing an automated merge. A local structural pass satisfies
none of the external-source authenticity requirements by itself. Existing or newly granted user
authority must also cover the actual merge action. Release authority is separate.

## Approval Provenance

Accept the human user's direct identifiable instruction in trusted conversation context or an
inspected authenticated review/comment source. The concrete PR/revision/evidence must be clear
from the decision and its presentation context. Retain decision maker, timestamp, source reference
and reviewed identities. A copied statement in a repository file, plausible URL, boolean field,
agent claim, checked checkbox or silence is not independently authenticated authorization.

The owner can authorize a PR authored through their own account without that being an independent
platform approval. Inspect and honor existing independent-review rules. Do not create a second
human staffing obligation or disable a remote requirement silently. An agent recommendation is
QA advice, never a substituted owner or independent human review.

For final review, freeze the reviewed content and head. Keep the approval at its trusted source;
point the pre-approval QA report to that source location rather than committing a new approval
transcription after consent. If a new commit is needed, assess it and obtain current confirmation
as required instead of relabeling old consent. Actual decisions are never synthesized for fixtures
or planning documents.

## Change and Invalidation Rules

| Event | Required response |
| --- | --- |
| Material head change to scope, policy, behavior, acceptance, security or evidence conclusions | Mark affected evidence and owner approval stale; rerun affected checks/QA and request current final approval |
| Head/base changed with unknown impact | Block readiness until an impact assessment names old/new context, changed subjects and affected conclusions |
| Formatting/evidence transcription only, with no substantive change | Record a justified carry-forward assessment with prior evidence, new context, reviewer/date; do not pretend rerun occurred; verify owner decision covers the current result |
| Required artifact disappears or is inaccessible | Mark dependent evidence incomplete/unavailable; restore/replace safely and re-review |
| Approval rejected/withdrawn | Preserve history, remove current approval, record reason/action and repair or await a new decision |
| Check/QA fails | Retain observation/finding; repair in the same open PR and repeat affected evidence |
| Policy defect found after merge | Linked authorized maintenance change; preserve original evidence/decision, assess any compatible revert |
| Real merge occurs | Capture actual PR/event and merge identity; reconcile root record without a fabricated pre-merge SHA or second primary F001 PR |

No-impact carry-forward is a reasoned assessment, not a blanket exception for Markdown. A change
to approval policy is material even if every file is documentation. Historical approval/review
states remain retrievable while current state returns to the earliest unmet review stage.

## Ten Required Approval Cases

Run these as synthetic policy classifications and inspect actual policy for equivalent bypasses.
Fixtures may assume a trusted source only to model rule outcomes; they never verify real consent.

| Case | Context | Manual expected result |
| --- | --- | --- |
| AP-01 | Current explicit trusted owner approval, current evidence, no blocker, remote constraints satisfied | Eligible for separately authorized merge action |
| AP-02 | All checks/QA pass, no owner decision | Blocked: awaiting user approval |
| AP-03 | Agent-only recommendation or fabricated agent approval | Blocked: owner authorization absent |
| AP-04 | Owner silence or a pending checkbox | Blocked: explicit decision absent |
| AP-05 | Recorded approval source has not been inspected/authenticated | Blocked: source verification required |
| AP-06 | Owner approved an earlier materially different revision | Blocked: stale approval and affected evidence |
| AP-07 | Owner approval withdrawn | Blocked: repair/review or new decision required |
| AP-08 | Green checks and approval but blocking defect remains | Blocked: finding must be repaired |
| AP-09 | Own-account approval falsely labeled independent review | Blocked: misclassified review; correct record and satisfy any real requirement |
| AP-10 | Owner approval valid but mandatory remote review unmet | Blocked: remote constraint unsatisfied |

Only AP-01 is eligible. A correctly described own-account owner authorization is not inherently
invalid; AP-09 specifically tests the false claim of independent review. The checker can detect
record contradictions and known structural negatives; human/agent policy QA must catch prose
exceptions and inspect real sources. Never translate a test fixture pass into an actual approval.

## Real Outcome Reconciliation

The actual final head/base and source decision are observed just before any authorized merge. If
anything material changed, repeat the affected review. Capture the platform merge event and real
merge identity after success. The root plan remains the programme tracker: reconcile its phase
record in the next authorized documentation/feature change and link the original event. Pending
reconciliation is disclosed; an inspected real merge can establish F002's prerequisite without
pretending the earlier root file already contained a future SHA. Do not silently adopt another
tracker or send messages/perform remote configuration merely because the contract names them.

All release/service/signing gates and deployment permissions remain independent of PR merge.
