# F002 Enforcement Inspection and Adoption Contract

**Status**: Proposed read-only preparation and separately authorized activation; no service settings inspected or changed by this planning invocation.
**Authority**: [root delivery contract](../../../plan.md#5-github-setup-and-cost-aware-enforcement), [F001 approval rules](../../../docs/development/delivery-governance.md), [workflow](workflow-and-selection.md).

## Preparation and Truth of Claims

Before implementation/adoption, inspect actual F001 merge, repository identity/default branch/visibility, operator permissions, current Actions settings, forks/secrets policy, runner availability, artifact retention limits, rulesets/protection and existing required checks/reviews. Preserve observed source/time and a safe snapshot; do not rely on earlier F001 observations as current facts.

Preparation produces a concrete before/proposed/after record with check identities, activation prerequisites, expected behavior and compatible recovery. It does not authorize remote writes. The user request to make this plan authorizes documentation, not settings changes, publishing or merge.

Claims must distinguish:

- **Prepared**: Proposed workflow/policy/settings and backout are reviewable.
- **Working verification**: Actual current hosted checks/trials ran with safely available evidence.
- **Enforced**: Actual authorized settings activation was inspected and its scope/behavior verified.
- **Unavailable/blocked**: Missing access/entitlement/service/check identity or authorization; exact dependency remains visible.

Working CI with no protection cannot be advertised as PR-only remote enforcement. A configured required Actions check does not establish immutable workflow truth; candidate CI changes still require actual review.

## Proposed Configuration After Separate Authorization

1. Preserve stronger existing mandatory constraints. Target main and ordinary direct pushes/force pushes/deletion according to the adopted PR-only policy; inspect and document any administrative bypass roles rather than imply absolute protection.
2. Require the exact observed `F002 / automated-readiness` identity from its inspected expected provider, strict up-to-date status checks and resolved conversations, where the actual service supports the adopted configuration.
3. Retain final user approval as a separate trusted decision after current checks and agent QA. Agent review, owner-author self-review, green checks and a copied JSON reference do not satisfy independent human review.
4. Add a mandatory independent reviewer only under an existing applicable constraint or an explicitly adopted available-reviewer policy; do not invent staffing or disable an existing review requirement.
5. Keep signing/deployment/merge automation absent. No paid runner, visibility change or subscription purchase is part of activation.
6. Reinspect current settings and test their effect safely; record actual outcome and remaining administrative/immutable-workflow limitations. A proposed payload or successful config write alone is not behavioral proof.

## Safe Ordering and Single Primary PR

- Develop and exercise F002 in its one primary proposal under explicit bootstrap-candidate provenance. Do not require a check that does not yet report.
- Record real blocked applicable-check, missing-evidence and repaired-success runs; independently inspect workflow/content/run provenance and native coverage.
- Freeze the final reviewed context, complete agent QA and obtain explicit current owner merge approval. Respect every currently mandatory remote constraint.
- Actual merge establishes the default-branch base policy/workflow. It does not activate remote settings or release the product.
- After working check identities exist and activation is separately authorized, adopt the reviewed protection in the inspected safe order. Record actual settings verification. No second primary feature PR is needed to set repository controls.
- If activation is explicitly part of the authorized included F002 delivery, do not call that portion complete until verified. If only preparation is authorized, report preparation complete and enforcement unactivated; do not silently expand authorization or claim active guarantees.

## Read-Only Provider Interfaces

Use authenticated GitHub REST metadata with least read privileges and bounded pagination: repository identity, pull request current head/base, workflow run/attempt, jobs for that exact attempt, artifact metadata, rulesets/protection/settings and actual merge event. Store safe identifiers, conclusions and observed sources; never publish tokens or whole responses containing unnecessary personal data.

Run/attempt/workflow/job association must be independently reconciled. Preserve `proposal_head_sha`, `base_sha`, actual tested merge SHA and raw API head SHA separately. API outage/ambiguous mapping blocks the claim; arbitrary report URLs cannot supply authenticated evidence. Read-only inspection never posts statuses/comments, approves, merges or updates service settings.

## Recovery and No Bypass

If a check identity is renamed/missing, restore the reviewed working identity or repair its workflow and repeat verification before changing required-check configuration. If a proposed activation would lock out valid work, stop before activation and repair the concrete proposal. After activation, recovery requires current authorization, actual before/after records and preservation of required review semantics; no silent disabling of checks/protection.

A provider quota/outage or lost runner is a documented availability problem. Equivalent local evidence is permitted only under established governance and cannot counterfeit a remote required result. If an existing required protection blocks merge, satisfy it or obtain an explicitly authorized policy change; never infer permission from administrative access.

## Acceptance Evidence

A-25 requires actual inspected settings/access/check identity and a reviewable adoption/recovery proposal. A-27 exercises unavailability/recovery and honest enforcement state. A-24 remains the separate human-stage classification. Actual settings activation is evidence only when authorized and performed; synthetic tests of an adoption record do not prove that a repository is protected.
