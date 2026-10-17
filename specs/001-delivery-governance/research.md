# F001 Research and Design Decisions

**Date**: 2026-10-17
**Status**: Planning research complete; no F001 implementation or remote configuration performed.
**Inputs**: [specification](spec.md), [constitution](../../.specify/memory/constitution.md),
[root delivery policy and F001](../../plan.md#f001), [requirements](../../docs/product/requirements.md),
[product](../../PRODUCT.md), [decisions](../../docs/planning/decisions.md),
[documentation index](../../docs/README.md) and [current package manifest](../../package.json).

The selected planning skill requested research agents. Two read-only research passes examined
local validation and approval/provenance contracts. Findings were reconciled against the source
requirements. No blocking product question remains for this bounded design; existing Q-01–Q-16
remain open for their dependent features. No remote repository settings were inspected or changed.

## R-01 — Preserve the existing programme and active feature

**Decision**: Plan only F001 in `specs/001-delivery-governance`. Keep the root `plan.md` as programme
and phase authority. Preserve the existing constitution/specification working changes.

**Rationale**: The user now explicitly selected feature-level Spec Kit planning. That authorizes
this artifact set without replacing the root programme or beginning implementation. Setup resolves
`BRANCH=001-delivery-governance` from feature identity; the actual Git branch is `main`. The future
implementation branch remains `feat/f001-delivery-governance-and-pr-standards` from the root plan.

**Alternatives considered**: Reinitialize Spec Kit, rename phases, create a branch, or rewrite the
root plan now. All add unnecessary scope or conflict with the planning-only request.

## R-02 — Use a narrow dependency-free local checker

**Decision**: During future implementation, add `tooling/check-governance.mjs`, its focused
`node:test` suite and safe fixtures under `tooling/fixtures/governance/`. Use Node 24 built-ins,
following existing `.mjs` launcher tooling. No package or lockfile changes are required.

**Rationale**: The manifest requires Node `>=24 <25`; observed runtime is `v24.21.0`. Existing
commands are `npm run typecheck`, `npm run build` and `npm run test:launcher`; no lint, formatting
or governance command is currently configured. F001 needs local policy checks; F002 owns the
shared runners, broader documentation integrity, CI and aggregate remote check machinery.

**Alternatives considered**: Install a Markdown/schema framework or create CI first. Both expand
F001 without a demonstrated need. A prose-only review would miss F001's automated-check requirement.

## R-03 — Bound document and reference inspection

**Decision**: Check a declared governance document set and its explicit links/IDs; do not crawl
installed skills, node_modules, the home directory or the entire product roadmap transitively.
Use [the validation contract](contracts/local-validation.md) for supported link and anchor syntax.

**Rationale**: Existing documents include machine-specific skill paths and illustrative future
paths. Local reference validity, external-reference presence and future-artifact declarations
have different meanings. Missing supported links/anchors must fail; unsupported relevant syntax
must be reported rather than silently treated as valid.

**Alternatives considered**: Regex-match every file/path mentioned in prose or recursively scan
all skills. Both confuse examples/future deliverables with real dependencies and create noise.
A generalized parser can be considered in F002 when needed.

## R-04 — Store review records as documents with a compact evidence sidecar

**Decision**: Keep feature guidance and human-readable QA at `docs/features/F001.md` and
`docs/qa/F001.md`. Add a version-1 JSON sidecar `docs/qa/F001.evidence.json` during implementation
for explicit evidence fields and diagnostic input; retain the Markdown QA report as the readable
summary. See [record model](data-model.md) and [evidence contract](contracts/evidence-record.md).

**Rationale**: Node can validate a small JSON envelope without a new parser or application data
store. The sidecar makes honest result states and coverage testable. It references artifacts rather
than duplicating logs. Human approval provenance cannot be established by any self-reported field.

**Alternatives considered**: Parse unconstrained prose/YAML, introduce database tables, or add a
separate tracking service. Those add ambiguity or unnecessary infrastructure.

## R-05 — Keep validation, source verification and merge authority separate

**Decision**: The local checker reports structural/documentary findings only. It does not approve,
merge, query authenticated providers, validate a human identity from a string, or emit a
`merge_authorized` result. Actual owner authorization is checked against a direct identifiable
human instruction or inspected authenticated review source at review time.

**Rationale**: FR-015 prohibits copied text, green checks and agent advice as approval. A complete
record can still be forged. Synthetic fixtures may assume a trusted source solely to test the
policy's expected outcome; they cannot authorize a real change.

**Alternatives considered**: Accept `approved: true`, invent a cryptographic approval system,
require a second human, or implement remote enforcement now. These either violate the confirmed
workflow or belong to a separately authorized future scope.

## R-06 — Avoid approval and evidence commit cycles

**Decision**: Freeze the reviewed head, base and evidence references before requesting final
approval. Keep the actual decision in its trusted external source without adding a new commit
merely to transcribe approval. The QA document can reference the PR discussion and state that the
current decision lives there. Record measured revision/content digests and explicit carry-forward
assessments for evidence-only updates; never rewrite an old tested SHA as if checks ran on a new one.

**Rationale**: Committing an approval record changes the commit it claims to approve. Material
changes invalidate approval; no-impact evidence housekeeping can retain unaffected results only
with the assessment allowed by FR-017. If approval is recorded by a new commit, assess the new head
and obtain current confirmation before merge rather than pretending the old approval covers it.

**Alternatives considered**: Endless approve/commit loops or a blanket exception for any
"documentation-only" edit. Neither preserves trustworthy current review.

## R-07 — Retain the confirmed review sequence and independent platform constraints

**Decision**: Applicable automated results → actual agent QA → explicit user final approval.
Record owner authorization separately from any independent human review required remotely.

**Rationale**: GitHub documents that PR authors cannot approve their own pull requests. Therefore
own-account owner authorization must not be presented as an independent platform approval.
Existing mandatory review rules still apply; no new staffing requirement is introduced.
[GitHub approval rules](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews).

GitHub review invalidation options depend on configured branch protections, including changes to
the reviewed diff or merge base. F001's explicit material-change/baseline assessment remains
necessary regardless of those settings.
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

**Alternatives considered**: Treat platform check color as authority, or automatically disable
review constraints for an own-account author. Both violate the specification.

## R-08 — Adopt one future PR template and bootstrap F001 manually

**Decision**: Plan one `.github/pull_request_template.md` containing the contract's required
sections, pending approval status and evidence links. Before adoption, use its content manually
for F001's primary PR body. Template checkboxes are prompts, never approval evidence.

**Rationale**: GitHub supports PR templates in root, `docs/` or `.github/`, and their normal
availability requires the template to be on the default branch. The first PR must not depend on
its unmerged template being automatically offered.
[GitHub PR templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository).

**Alternatives considered**: Multiple template choices or waiting for a separate template PR.
Neither fits the one-primary-PR F001 delivery rule.

## R-09 — Separate F001 evidence from F002 enforcement

**Decision**: F001 supplies a local checker, documented interfaces and manual review policy.
F002 later integrates validated checks into CI and authorized remote enforcement. Do not configure
rulesets, check names, billing, visibility or runners in this planning run.

**Rationale**: GitHub's status semantics can accept skipped/neutral conclusions and path filtering
can leave required checks pending. F002 must implement explicit applicability and failure behavior;
F001's evidence statuses must not flatten those cases into passed.
[GitHub required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

**Alternatives considered**: An F001 all-purpose aggregate workflow or claims about currently
installed protections. Neither is supported by this feature's scope or current inspection.

## R-10 — Reconcile stale guidance without changing product policy

**Decision**: Future F001 delivery will update stale constitution observations in `AGENT.md`,
`AGENTS.md` and root `plan.md`, link the new governance guide and record actual pending/merged
states. It will review the constitution draft, remove its temporary Sync Impact Report before
commit and preserve its applicable principles/version unless an actual amendment requires change.

**Rationale**: The draft exists, while those source descriptions still call it a placeholder.
Mechanical status corrections are distinct from new product decisions. Real merge identity is
unknown until merge; record it from the actual event and reconcile the root plan in the next
already-authorized documentation/feature change rather than pre-inventing it or opening a second
primary F001 PR. Do not adopt a replacement tracker silently.

**Alternatives considered**: Regenerate the constitution, mark F001 complete now, or claim a future
merge SHA. All misstate the baseline or violate preservation/evidence requirements.

## Resolved Planning Unknowns and Deferred Execution Inputs

All feature-design unknowns are resolved above. Real PR identity, remote protection settings,
current review provenance, merge identity and release evidence are execution inputs to observe
when those actions are authorized. Their absence does not block design and is never filled with
fake values. Open product Q decisions are unchanged. Official platform references above were
checked during research on 2026-10-17 and must be revisited if the relevant behavior changes.
