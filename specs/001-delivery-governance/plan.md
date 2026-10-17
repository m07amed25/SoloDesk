# Implementation Plan: F001 — Delivery Governance and PR Standards

**Branch**: `feat/f001-delivery-governance-and-pr-standards` (future implementation branch)
| **Date**: 2026-10-17 | **Spec**: [F001 specification](spec.md)

**Input**: Feature specification from `specs/001-delivery-governance/spec.md`.
**Status**: Phase 0 research and Phase 1 design complete; implementation, feature QA, owner
approval and merge remain pending. No implementation branch or pull request has been created.

Setup reports feature-context `BRANCH=001-delivery-governance`; the actual Git branch remains
`main`. The directory/context name does not override the root plan's proposed phase branch.
This feature plan complements the [root programme plan](../../plan.md#f001).

## Summary

Deliver NFR-014 for F001 through a reviewed constitution, one canonical delivery guide, one PR
body convention, feature/QA records and a dependency-free local governance checker with meaningful
negative fixtures. Preserve the existing eight principles and confirmed review sequence:
automated verification, agent QA, then the user's explicit final approval of the current result.

Use Markdown plus a small JSON evidence record and Node 24 built-ins. The checker validates bounded
references, records and readiness defects; trusted approval-source inspection remains a human/
agent review responsibility. Nothing in local output authorizes merge. F002 receives the check
interfaces and policy; it owns CI, the aggregate gate and remote enforcement implementation.

This invocation writes only feature planning documents. It does not create future delivery files,
change application code or packages, rewrite the constitution/root plan, configure GitHub, publish,
merge or release. See [research](research.md) for decisions and alternatives.

## Technical Context

**Language/Version**: Markdown and JSON for governance records; future local checker uses ESM
JavaScript on the existing Node `>=24 <25` requirement. Observed Node is `v24.21.0`.

**Primary Dependencies**: Existing Node built-ins (`fs`, `path`, `crypto`, `node:test`,
`node:assert/strict`) and Git for revision inspection. No new packages, services or framework.
Installed application dependencies remain untouched and are not F001 design dependencies.

**Storage**: Versioned text/JSON in repository docs; redacted artifacts referenced from QA.
Actual owner decisions remain in a trusted identifiable message/review source bound to the current
head/base/evidence. No business database, secret store, application state or new tracking service.

**Testing**: Future focused `node:test` fixtures for policy/reference/evidence diagnostics,
manual review of all A-01–A-22 and SC-004's ten approval cases, plus existing launcher/type/build
regressions at delivery. No configured lint/format/governance script is assumed to exist today.

**Target Platform**: Repository contributors using Node 24 and Git on supported development OSs;
planning inspection is Linux only. Tooling must use portable paths and avoid OS-specific commands.
No new claim of Windows/macOS/native application verification.

**Project Type**: Internal delivery-governance documents and a local read-only validation CLI
within the existing desktop repository; no new customer interface or network service.

**Performance Goals**: Bounded local document/fixture traversal, no network or installed-skill
crawl. Outcomes are completeness and correct blocked/eligible review classification in SC-001–007;
no product latency or throughput budget is invented for this documentation feature.

**Constraints**: One feature branch/primary PR targeting `main`; no dependency reinstallation,
remote mutation, secret-bearing evidence or undocumented approval bypass. Preserve working changes
and exact evidence identity. Material changes invalidate affected checks/QA and final approval.

**Scale/Scope**: F001 only; 26 local FRs, 22 acceptance scenarios, seven measurable outcomes,
eight constitutional principles and ten approval cases. Reference existing F001–F151 IDs without
implementing their features. Keep validator scope explicit; broader scanning belongs to F002.

## Constitution Check

Gate results below mean the planning/design complies; they are not passed F001 implementation
or product-release evidence. Pre-research review found no unresolved violation. Post-design
review rechecked the record, CLI, approval and handoff contracts against the same rules.

| Principle / gate | Before research | After design | Design evidence |
| --- | --- | --- | --- |
| I. Authorized scope and traceable decisions | PASS | PASS | Planning files only; NFR-014 and every FR mapped; original sources preserved |
| II. Platform and trust boundaries | PASS | PASS | No renderer/native/backend change; local read-only checker and no new dependency |
| III. Offline work/cloud authority | PASS | PASS | Documentation usable locally; unavailable remote events never claimed complete |
| IV. Exact immutable finance | PASS | PASS | No financial policy/storage changes; future finance gates preserved |
| V. Security/least privilege | PASS | PASS | Redacted fixtures; bounded paths; no remote credentials, code execution from records or trusted-approval inference |
| VI. English/Arabic/accessibility | PASS | PASS | No application strings/UI changed; individual applicability reasons preserve future bilingual gates |
| VII. Recovery/compatibility | PASS | PASS | Versioned record contract, preserved history, no migrations; explicit repair/carry-forward policy |
| VIII. Evidence before completion | PASS | PASS | Current revision/base, honest statuses, real owner source, separate merge/release records |
| Governance and decision ownership | PASS | PASS | No amendment or open-Q answer invented; one-primary-PR and final owner approval retained |

A later implementation departure must re-evaluate these gates. No planning blocker requires a new
user answer. Remote access/settings and real approvals are delivery-time inputs, not fabricated
planning values. See [record model](data-model.md) and [review contract](contracts/review-policy.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-delivery-governance/
├── spec.md                        # Existing bounded behavior specification
├── checklists/requirements.md      # Existing specification-quality review
├── plan.md                        # This feature plan
├── research.md                    # Resolved decisions, alternatives and references
├── data-model.md                  # Review records, relationships and state rules
├── quickstart.md                   # Current inspection and future acceptance guide
└── contracts/
    ├── pull-request.md            # Contributor/owner proposal interface
    ├── evidence-record.md         # Version-1 evidence envelope and applicability
    ├── review-policy.md           # Trusted approval, transitions and ten-case matrix
    └── local-validation.md        # Future CLI input/output and failure contract
```

`tasks.md` is a later `$speckit-tasks` output and is not created by this planning command.

### Source Code (repository root)

The following tree is proposed future F001 implementation scope, not files created now:

```text
.github/pull_request_template.md           # One reusable PR body, no CI workflow
.specify/memory/constitution.md             # Review existing draft; remove temporary report
AGENT.md                                   # Correct stale observations; link governance
AGENTS.md                                  # Correct stale placeholder instruction narrowly
plan.md                                    # Source-status/feature links, pending outcome records
README.md                                  # Link delivery guide where contribution flow lives
docs/README.md                             # Add governance/feature/QA documentation links
docs/development/delivery-governance.md     # Canonical operational delivery policy
docs/features/F001.md                      # F001 delivered behavior and boundaries
docs/qa/F001.md                            # Human-readable observed QA and decision-source link
docs/qa/F001.evidence.json                  # Compact structured evidence, not authority
tooling/check-governance.mjs                # Bounded local advisory validation
tooling/check-governance.test.mjs           # Positive/negative contract tests
tooling/fixtures/governance/                # Synthetic records and temporary-tree fixtures
```

**Structure Decision**: Extend existing `tooling/*.mjs` conventions and documented feature/QA
paths. No application-source, package/lockfile, migration or CI-workflow change is needed.
Reference source registers; do not copy the 151-phase programme or create a separate tracker.
The operational guide is subordinate to the constitution and confirmed root-plan rules.

## Complexity Tracking

No constitutional violation or exception is proposed. A compact evidence sidecar and bounded
checker are sufficient; no framework, database, generic rules engine or remote approval service.

## Phase 0 — Research Outcome

[Research decisions R-01–R-10](research.md) resolve context identity, validation approach,
reference scope, record format, trust/provenance, freshness, PR-template bootstrap, F002 handoff
and stale-document reconciliation. Research agents performed read-only analysis only. Current
GitHub behavior is supported by primary references in that artifact; current remote repository
settings remain unobserved. There are no unresolved design clarifications.

## Phase 1 — Design Outcome

- [Data model](data-model.md): Phase, proposal, evidence, findings, decisions, approvals and
  transitions as review records; status/freshness and preservation constraints.
- [PR contract](contracts/pull-request.md): required description sections, one-primary-PR naming,
  F001 template bootstrap and future feature/QA document relationships.
- [Evidence contract](contracts/evidence-record.md): record version, field completeness,
  category applicability, artifacts and revision/approval-record boundaries.
- [Review contract](contracts/review-policy.md): sequence, eligibility predicate, trusted source,
  own-account handling, stale review, recovery and the ten required decision cases.
- [Local validation contract](contracts/local-validation.md): explicit files, bounded CLI,
  exit statuses, safe diagnostics, reference syntax and limits of automated conclusions.
- [Quickstart](quickstart.md): available inspection commands, proposed future tool commands,
  scenario execution and owner-review/merge reconciliation boundaries.

These contracts describe contributor/reviewer and CLI interfaces rather than customer APIs.
Post-design constitution re-evaluation passed with no exceptions.

## Future Implementation Sequence

These work packages guide later task generation; they are not executed tasks or a second feature.
All work belongs to one F001 branch/primary PR once implementation is authorized.

| Package | Work and deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| W1 Baseline and source authority | Inspect working tree, latest `main`, proposed branch and constitution draft; identify stale observations and remote constraints without changing them | Authorized implementation | Preservation record; no invented dependency/approval |
| W2 Policy and document interfaces | Adopt delivery guide, PR template, feature guidance and QA/evidence conventions; review constitution and correct stale references narrowly | W1 | Source consistency and A-01–A-08 observations |
| W3 Local validation | Implement checker/record validation against contracts and independently expected fixture failures | W2 | Policy/link/ID/status checks and negative fixture results |
| W4 Integrated evidence and QA | Run local suites and existing regressions; review actual policy and all scenario/approval cases; redacted findings and applicability records | W2, W3 | A-01–A-22 and SC-001–007 coverage; no blocking finding |
| W5 Concrete owner review | Open/update one complete PR when authorized; freeze reviewed content, head/base and evidence; present current results and risks | W4 | Actual trusted user decision; no source authenticity inferred by checker |
| W6 Merge reconciliation and handoff | Only after current approval and all applicable constraints, merge when authorized, capture actual event and hand contracts to F002 | W5 | Actual URL/merge identity; root-status reconciliation; release still separate |

Do not pre-open an empty PR or push unrelated changes. Record fixes in the same open PR. Use new
agreed phase identities before implementing an oversized split; after merge, use a linked
maintenance change. Recheck prerequisites/authority at execution rather than treating W1–W6 as
permission granted by this plan.

## Requirement and Verification Coverage

| Requirements | Stories/scenarios | Planned verification and artifact |
| --- | --- | --- |
| FR-001–FR-004 | US1; A-01–A-04 | Source/link/ID tests, amendment example and constitution/preservation audit |
| FR-005–FR-008, FR-019 | US2; A-05–A-08 | Proposal/template records, one-primary-PR/split/maintenance cases |
| FR-009–FR-014 | US3; A-09–A-13 | Evidence schema/status tests, missing-reference/artifact cases, actual policy review |
| FR-015–FR-017, FR-020 | US4; A-14–A-18, A-22 | Ten-case approval matrix, source inspection and stale/baseline-change cases |
| FR-018, FR-021–FR-023, FR-026 | US5; A-19–A-22 | State/history/recovery cases, real outcome boundaries and F002 handoff |
| FR-024–FR-025 | US3/US5 plus exposure/offline/quota edges | Safe artifacts, bounded inputs and per-category applicability reasons |

Seven SC outcomes remain future acceptance targets. Synthetic merge/release cases prove policy
classification, not a real merge or release. Actual event evidence is recorded only when it occurs.
Shell tests/type/build remain shell regression evidence, not proof of native or product features.
No performance/native/bilingual execution claim is created by planning review.

## Risks, Recovery and Adoption

| Risk | Mitigation / recovery |
| --- | --- |
| Self-reported approval passes structural checks | Mandatory trusted-source inspection; tool never emits merge authorization |
| Evidence/approval commits change the reviewed head | Freeze content; bind source externally; use explicit no-impact assessment or re-review |
| Stale source text contradicts constitution | Correct observed passages during W2 without resetting scope or principles |
| Unsupported Markdown yields false confidence | Report unsupported relevant syntax; narrow manual review or F002 parser improvement |
| Remote access/quotas unavailable | Keep actual blocked/unavailable state; preserve local work, do not invent pass or bypass rules |
| First PR depends on its own unmerged template | Use prepared body manually for F001; normal template adoption follows merge |
| Root plan cannot contain its own future merge SHA | Capture real PR merge event, then reconcile the root record in the next authorized change; never fabricate it or add a second primary F001 PR |

Before merge, repair in the same PR and repeat affected evidence/owner review. After merge, a
policy defect uses a linked maintenance change; a revert requires compatibility/scope review and
must not discard unrelated work. There is no application migration or data rollback. Keep prior
policy and findings traceable. A source/provenance uncertainty blocks only dependent readiness.

## F002 Handoff and Completion Boundary

F002 can reuse the CLI contract, fixtures, evidence states and manual-review boundaries after
F001 actually merges. It owns CI installation, generalized repository scanning, aggregate gate
semantics, required-check naming, cancellation, artifact/quota controls, provider-backed provenance
integration and authorized remote enforcement. No assumption about these existing is made here.

This command ends after design. Next workflow is `$speckit-tasks` if requested; neither task
generation nor implementation runs automatically. Pre/post extension checks found no
`.specify/extensions.yml`, so no planning hooks were registered. F001 stays pending in the root
programme; planning readiness does not grant owner merge approval or release authority.
