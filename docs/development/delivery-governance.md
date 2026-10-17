# Delivery governance

F001 implements NFR-014 under the [constitution](../../.specify/memory/constitution.md),
[root phase plan](../../plan.md#f001), [product brief](../../PRODUCT.md) and
[decision register](../planning/decisions.md). Read [AGENTS.md](../../AGENTS.md) and
[AGENT.md](../../AGENT.md) before project work.

## Scope and sources

The user authorized F001 governance implementation. Business features, cloud provisioning,
new dependencies, CI enforcement and deployment remain outside F001. A plan, skill or checkbox
cannot expand authorization. Honor existing authority without asking for it repeatedly.
Confirmed decisions are user choices; recommendations are proposals; open decisions name their
owner and blocked action. Do not promote a recommendation or resolve Q-01–Q-16 by assumption.
Keep stable requirement/phase IDs, current source links and explicit retirement/replacement.

## Principles and amendments

Preserve the constitution's scope, desktop boundaries, durable offline/cloud authority, exact
immutable finance, fail-closed security, English/Arabic accessibility, recoverability and evidence
rules. No model feature, plaintext fallback, offline invoice issuance or silent approval bypass.
An amendment records rationale, affected rules/requirements, owner authorization, compatibility,
migration/verification consequences and version/date. Follow semantic versioning; retain original
ratification date. Remove temporary Sync Impact Reports before committing an amendment.

## One bounded feature proposal

Each phase uses `feat/f###-short-slug` and one primary PR titled `[F###] <feature outcome>`
targeting `main`. F001 uses `feat/f001-delivery-governance-and-pr-standards`. Start only after
prerequisites merge and blocking decisions resolve. Independent work requires agreed integration
and separate file ownership. Split oversized scope into agreed new IDs before implementation.
Keep model/UI/test fixes together in the same open feature PR. Later defects use linked
maintenance work, retaining the original delivery history.

Use [the PR template](../../.github/pull_request_template.md), with problem/result, identity and
prerequisites, scope, docs/source authority, current verification, agent QA, individual impacts,
recovery, limits/rollout and the actual owner-decision source. For F001, use its body manually
before default-branch template adoption. The template prompts information; it grants no authority.

## Delivery records

Every phase includes feature guidance at `docs/features/F###.md` and observed QA at
`docs/qa/F###.md`. F001 adds a version-1 [JSON evidence sidecar](../qa/F001.evidence.json)
following the [record model](../../specs/001-delivery-governance/data-model.md).
No new application database or customer retention policy is introduced.

## Evidence, QA and current review

Record actual head/base and a reproducible `F001-review-v1` digest of the declared policy and all
changed non-evidence F001 files, including tooling/tests/fixtures. The two QA containers are
explicitly excluded from their own digest; their substantive claims still require review. Include
uncommitted/new files and inventory unrelated changes. Keep original measured identities and
traceable carry-forward assessments; never rewrite an old SHA as if a test reran.

Results are passed, failed, not run, unavailable, stale or individually justified not applicable.
A missing required result/artifact is a blocker. Local save/record existence, a plan, skipped check
or old shell result is not executed feature evidence. Scope each product/native/Arabic/finance
category separately; governance, approval, redaction and existing regressions remain applicable.
Use synthetic fixtures and redacted artifacts; do not include credentials/customer data.

Run policy/tests, then shell regressions and actual agent QA; collect outcomes before the final
evidence-pack validation. An incomplete early pack is not a successful gate. The validator catches
known malformed records and references, but cannot prove the meaning of arbitrary policy prose.
Agent QA must inspect the actual policy, exercise positive/negative cases and record observations.

## Final user decision

Current applicable automated results → actual agent QA → explicit user final approval.
Present the concrete PR/head/base/evidence, scope, limitations and recovery before asking for the
final decision. A checkbox, silence, copied approval text, green checks or agent advice is not
human consent. The local checker always says owner-source verification is required; it cannot
approve, merge or authenticate a plausible reference from an editable file.

Use an identifiable direct human instruction or inspected authenticated review source. Keep owner
authorization separate from any mandatory independent platform review. An own-account author is
not an independent reviewer. Do not invent staffing or disable existing required reviews.
Freeze the reviewed head before asking for final approval. Keep the actual decision at its trusted
source; the QA report can point to the PR discussion. Committing an approval transcription changes
the head and requires context assessment/current confirmation rather than an approval loop.
Material changes invalidate affected checks/QA and final approval. Changed head/base with unknown
impact blocks readiness; formatting-only carry-forward needs old/new context, unchanged subjects,
reviewer/date and an actual reason. Rejected/withdrawn decisions remain history and require repair
or a new explicit decision. A JSON field cannot declare its own source verified.

## Lifecycle, recovery and outcome records

Track planned → decision-ready → building → PR open/draft → automated checks passed → agent QA
passed → awaiting user approval → approved → merged → released. A failed/blocked overlay retains
last valid state, owner, reason and next action. Transition records identify from/to, actual actor,
time, source, snapshot and evidence. Invalidations preserve history and return to the earliest
unmet review stage. A rejected/withdrawn decision cannot keep a current approved state.

A merge requires delivered included scope, current checks/QA/docs/recovery, merged prerequisites,
no blocking finding, explicit current owner approval and applicable remote constraints. Repair
before merge in the same PR; post-merge defects use linked maintenance and compatible backout.
Local validation is advisory and never changes phase state or merges. A synthetic merge case proves
the record rule, not an actual merge. Release/deployment is separately authorized and evidenced.

After an authorized merge, inspect its actual event and merge identity. Reconcile root plan status
in the next authorized documentation/feature change, linking the original PR, without inventing
an advance SHA, replacing the tracker or creating a second primary F001 PR. Disclose lagging root
status; an inspected actual merge establishes a prerequisite independently of that bookkeeping.
F002 later owns generalized scanning, CI runners/aggregate enforcement, quota/artifact controls,
authenticated provider integration and authorized remote protection. F001 does not install them.

## Local commands and content sealing

From the repository root with Node 24:

```bash
node --test tooling/check-governance.test.mjs
node tooling/check-governance.mjs
npm run test:launcher
npm run typecheck
npm run build
node tooling/check-governance.mjs --evidence docs/qa/F001.evidence.json --format json
```

Exit 0 means the requested local checks passed; 1 identifies governance findings; 2 identifies
invalid input, unsafe bounds, unsupported versions or missing tool context. No command authenticates
human consent, fetches external links, executes recorded procedures or modifies remote settings.

For a measured **uncommitted** snapshot with approval still **pending**, an explicitly reviewed
carry-forward record can use `new_head: "content-bound"`. This permits committing the exact reviewed
bytes without a self-referential SHA loop. The tool checks the actual current head, unchanged
comparison base, ancestor relationship, full changed-file coverage, canonical digest, reviewer,
time, reason and retained evidence references. The result reports the actual current head.
A changed digest/base, an unreviewed file, missing assessment or claimed owner approval cannot use
this sealing rule. Final owner review always identifies the actual published head/base separately.
Exact old/new revisions remain required for all other carry-forward assessments. This is content
association of pre-approval evidence, never a new test run or transfer of human authorization.
