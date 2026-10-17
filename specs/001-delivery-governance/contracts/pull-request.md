# F001 Contributor and Pull Request Contract

**Status**: Future F001 delivery contract; no PR/template is created by planning.
**Requirements**: FR-001–FR-008, FR-019–FR-023, FR-026.
**Related**: [record model](../data-model.md), [review policy](review-policy.md).

## Identity and Scope

One phase has one implementation branch and one primary PR targeting `main`. F001 uses proposed
branch `feat/f001-delivery-governance-and-pr-standards` and title
`[F001] Delivery governance and PR standards`. F001 has no prerequisite feature phases and owns
NFR-014. Feature-local FR/A identifiers reference [the F001 specification](../spec.md).

The description leads with the concrete problem and resulting behavior. Fixes before merge remain
in this PR. Oversized phases are split into agreed new F-IDs before implementation. Later defects
use linked maintenance work rather than a second primary F001 PR or rewritten history.

## Required Description Sections

| Section | Required contents / validation |
| --- | --- |
| Problem and result | What is wrong/ambiguous today; behavior after the change; no conversational history needed |
| Identity and prerequisites | F-ID, milestone, stable/local requirements, prerequisite merge evidence or F001's none |
| Included and excluded scope | Bounded governance deliverables; explicit F002/product/service exclusions |
| Documentation and source authority | Constitution/guide/template/feature/QA references; affected source corrections |
| Verification | Exact reviewed head/base, commands/scenarios, honest results and safe artifact links |
| Agent QA | Actual inspected policy, acceptance/negative cases, observed outcomes and open findings |
| Impacts and applicability | Data/schema, API/IPC, security/privacy, financial, bilingual/accessibility and native effects, each with individual explanation |
| Recovery and compatibility | Repair/carry-forward/review invalidation, compatible backout and preservation of prior policy |
| Limits and rollout | Disabled/deferred capability, market/provider/remote constraints and separate release status |
| Owner decision | Pending/current/stale/rejected status, trusted source location and reviewed identity; no checkbox-as-approval |

Missing required information is a finding, not a blank field to interpret optimistically. A
subject that is not affected must name that subject and why; it cannot waive governance proof.
Do not include raw credentials, real customer content or machine environment dumps.

## Artifact Relationships

- `.github/pull_request_template.md`: future prompts for the sections above. Use its prepared body
  manually for F001 before default-branch adoption; no separate template PR is needed.
- `docs/development/delivery-governance.md`: canonical contributor/reviewer operational rules,
  subordinate to constitution and confirmed root-plan decisions.
- `docs/features/F001.md`: delivered behavior, included/excluded scope, roles/states,
  acceptance references, source authority and known limits; not a copy of the entire programme.
- `docs/qa/F001.md`: readable observed results and evidence/source links, including unresolved
  approval and separately observed merge/release outcomes.
- `docs/qa/F001.evidence.json`: machine-readable structure supporting that report; never an
  independent authority for human consent.

These paths are future deliverables expressed as code text rather than links to nonexistent files.
The actual PR must resolve its documentation links before claiming completeness.

## First-PR and Outcome Bootstrap

Open one reviewable PR only when authorized; use Draft while QA is incomplete where available.
Populate real PR references before final review. Freeze the reviewed tree before asking for final
approval. Keep the actual decision externally attributable to that head/base/evidence; do not add
an approval transcription commit merely to fill an approval field. The QA document may point to
the PR discussion as the live source and report its own pre-approval state honestly.

A future merge SHA cannot be written in the reviewed pre-merge tree. Capture the actual event,
then reconcile root-plan outcome fields in the next authorized documentation/feature change,
linking the original F001 PR; do not invent the identity or create a second primary F001 PR.
Until reconciliation, describe the root status as lagging and use inspected merge-event evidence
for prerequisite assessment. This is not adoption of a replacement programme tracker.

A PR merge is not release. Actual deployment needs its separately applicable authority and gates.
Existing remote checks/reviews remain constraints; this contract changes no repository settings.
