# Implementation Plan: F002 — Automated CI and Verification Harness

**Branch**: `feat/f002-automated-ci-and-verification-harness` (proposed implementation branch) | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ci-verification-harness/spec.md`

**Status**: Phase 0 research and Phase 1 design complete; documentation only. No F002 implementation, hosted verification, enforcement activation or tasks generation performed.

**Path resolution**: `setup-plan.sh --json` selected this feature and returned `BRANCH=002-ci-verification-harness`, the active feature identifier. Actual checkout remains `feat/f001-delivery-governance-and-pr-standards`; it was not renamed/switched. Spec Kit's identifier is not a created Git branch.

## Summary

Deliver reproducible locked setup and baseline checks, meaningful unit/integration runners, a real desktop-shell smoke and one always-evaluated automated-readiness gate. Use Node-built-in tooling, the existing Playwright/Electron installation, compatible syntax lint, conservative risk selection and versioned safe reports. Hosted execution records provider-owned outcomes independently of contributor-authored evidence. Current CI success, actual agent QA, trusted owner approval, merge and release remain separate stages.

F002 refines NFR-008, NFR-014 and NFR-015 and depends on actual merged F001 delivery. Preparing this plan is allowed before merge; implementation starts only after inspecting that outcome and receiving implementation authorization. Current source records still describe F001 as pending merge. Separately authorized remote protection is prepared here without assuming activation or strong immutable-workflow enforcement.

The detailed design is in [research](research.md), [data model](data-model.md), [CLI](contracts/verification-cli.md), [workflow and selection](contracts/workflow-and-selection.md), [evidence and gate](contracts/evidence-and-gate.md), [security and limits](contracts/security-and-limits.md), [enforcement adoption](contracts/enforcement-adoption.md) and [validation guide](quickstart.md).

## Technical Context

**Language/Version**: Node.js ESM `.mjs` for verification code, Node 24.21.0/npm 11.19.0 initial engineering baseline; existing TypeScript 7.0.2 remains the application/configuration compiler. YAML only for Actions orchestration; UTF-8 JSON for inert policy/reports.

**Primary Dependencies**: Existing Electron 44.8.0, Forge 8.0.1, Vite 8.3.4, React 19.3.1, Tailwind/shadcn and Playwright 1.64.1. Proposed additions: exact-pinned compatible Oxlint and SPDX-expression parser, verified pinned Gitleaks/actionlint CLI binaries, and pinned checkout/setup-node/upload/download-artifact actions. No provider app/service or test-framework migration. Exact new pins/checksums must be verified and committed during authorized implementation; no floating identity is runnable policy.

**Storage**: Repository-reviewed policy/toolchain/enrollment JSON; temporary owned verification directories; bounded hosted safe artifacts; compact durable `docs/qa/F002.md` and F002 sidecar. No customer database/schema, cloud provisioning, product-data migration or new retention policy. F001 version-1 evidence remains unchanged.

**Testing**: Node test runner with independent truth-table fixtures and CLI subprocess integration; existing F001 policy tests and launcher tests; Playwright real built-Electron smoke; Oxlint/tsc/build; local-reference/ID integrity; Gitleaks/npm-audit/license inventory/actionlint. Zero-test required suites fail. Native acceptance and real hosted failure/repair remain execution obligations.

**Target Platform**: Fast checks on an exact recorded Linux hosted image; initial desktop validation on explicit Linux x64, Windows x64 and macOS arm64 images, selected and recorded in implementation policy. Verify current labels exist before use and record actual image release. These test targets do not settle Q-11 minimum OS/CPU/packaging support. No self-hosted or paid runners.

**Project Type**: Verification CLI/library and GitHub Actions platform feature inside the existing Electron repository; no public application API/UI.

**Performance Goals**: Finite engineering bounds in [security-and-limits](contracts/security-and-limits.md), including 45-minute local coordinator, 15/10/20/2-minute baseline/security/desktop/aggregate jobs and 50-minute hosted execution-duration readiness limit. Capture actual durations, runner resources and input/test counts. No product benchmark is inferred from these limits; NFR-008 product budgets remain in the owning features.

**Constraints**: Preserve renderer sandbox and current stack; no uncontrolled install scripts, arbitrary evidence-command execution, privileged PR triggers, protected credentials in contribution jobs, cache/result reuse as proof, automatic purchases/settings changes/merge, or silent not-applicable decisions. Use exact head/base/tested identities, safe bounded output, zero automatic retries initially and one primary feature PR. No AI product capability.

**Scale/Scope**: Five user stories, 30 FRs, 27 acceptance scenarios, 11 success criteria; one workflow, five job types, three initial native validation targets, one primary PR. Future suite enrollment is bounded by policy, not an invented workload/team/service guarantee.

## Constitution Check

_GATE: Passed for documentation design before Phase 0 and re-evaluated after Phase 1. Implementation/adoption conditions remain distinct from planning compliance._

| Principle                             | Pre-research check                                                    | Post-design result / required future evidence                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Authorized scope and traceability | Planning authorized; stable F002/NFR IDs and F001 dependency retained | PASS: only planning docs and root link changed; implementation authorization and actual F001 merge remain entry gates                                                |
| II — Platform and trust boundaries    | Existing Electron/React/TypeScript/Tailwind/shadcn preserved          | PASS: tooling stays outside renderer; smoke preserves sandbox, no preload/IPC or app redesign; actual protected launch remains required                              |
| III — Durable offline/cloud authority | No product persistence/sync change                                    | PASS: enrollment preserves later offline/retry/revocation obligations; no cloud/offline test claim from a runner                                                     |
| IV — Exact financial evidence         | No financial policy/data implementation                               | PASS: later finance suites require independent fixtures and concurrency/conservation; no fake domain suite or issuance                                               |
| V — Fail-closed security              | Untrusted execution and artifact leakage are direct risks             | PASS: least privileges, verified tools, no protected secrets, inert bounded reports; actual isolation/sentinel tests required                                        |
| VI — Bilingual/accessibility          | Customer UI unchanged                                                 | PASS: Unicode records and readable IDs; later interactive coverage requires English/Arabic/RTL and manual/fluent evidence; shell smoke is not translation acceptance |
| VII — Recoverable evolution           | F001 records must remain readable                                     | PASS: separate F002 schema family, unknown versions fail, bounded cleanup and compatible policy repair; no customer migration                                        |
| VIII — Evidence before completion     | Planned work cannot count as tested                                   | PASS: provider outcome cross-check, explicit currentness/trust limits, actual hosted/native QA and owner approval before merge; no release claim                     |

No constitutional deviation is proposed. F001 merge/access/tool pins/native availability/remote activation are implementation or adoption gates, not violations waived by this plan. A future sandbox workaround, privileged PR execution, unsupported compatibility or missing required evidence must stop dependent work and trigger design repair.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-verification-harness/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── verification-cli.md
    ├── workflow-and-selection.md
    ├── evidence-and-gate.md
    ├── security-and-limits.md
    └── enforcement-adoption.md
```

`tasks.md` belongs to a later `$speckit-tasks` invocation and is not created by this planning command.

### Source Code (repository root)

The following is the proposed implementation layout; new files are not created by this plan.

```text
.github/
├── pull_request_template.md                 # Existing F001; preserve authority contract
└── workflows/verify.yml                     # New unprivileged workflow
.oxlintrc.json                               # New meaningful syntax/correctness lint
verification/
├── policy.v1.json                           # Baseline, risks, limits, approved tool identities
├── suites.v1.json                           # Explicit reviewed suite enrollment
├── toolchain.v1.json                        # Exact runtime/package/action/CLI pins + checksums
└── scanner-dispositions.v1.json             # Findings/expiry/owner; no silent suppression
schema/verification/
├── policy-v1.schema.json
├── toolchain-v1.schema.json
├── suites-v1.schema.json
├── context-v1.schema.json
├── selection-v1.schema.json
├── run-v1.schema.json
├── provider-v1.schema.json
├── report-v1.schema.json
├── summary-v1.schema.json
├── review-v1.schema.json
└── adoption-v1.schema.json
# Schemas document transport; bounded built-in validation enforces required invariants.
tooling/
├── start.mjs / start.test.mjs                # Existing; preserve unrelated working changes
├── check-governance.mjs / .test.mjs          # Existing F001 interface unchanged
└── verification/
    ├── cli.mjs                              # Public command/exit contract
    ├── context.mjs                          # Actual Git/provider identities and changed paths
    ├── selection.mjs                        # Conservative baseline + risk/enrollment decisions
    ├── run-suite.mjs                        # Bounded subprocesses/counts/cleanup
    ├── records.mjs                          # Inert validation, paths, statuses and compatibility
    ├── documentation.mjs                    # Local references and owning ID definitions
    ├── security.mjs                         # Pinned scanners + audit/license inventory adapters
    ├── electron-bootstrap.cjs               # Test-only profile isolation, then real built entry
    ├── artifacts.mjs                        # Allowlist, bounds, redaction and atomic reporting
    ├── aggregate.mjs                        # Fail-closed policy/result/evidence evaluation
    └── inspect-provider.mjs                 # Read-only exact run/job/context reconciliation
tests/verification/
├── unit/*.test.mjs                          # Selection/gate/record invariants
├── integration/*.test.mjs                   # Real CLI/temp synthetic repos and failures
├── desktop/shell.spec.mjs                   # Real built-Electron path
└── fixtures/                               # Inert synthetic cases; never auto-discovered tests
playwright.config.mjs                       # Desktop-only config, one worker, zero retries
package.json / package-lock.json            # Deliberate tooling/script additions only
.gitignore                                 # Exclude owned verification scratch/artifacts
docs/features/F002.md                       # Future feature/usage and enrollment guidance
docs/qa/F002.md + F002.evidence.json         # Future observed QA; no fabricated result pack
```

**Structure Decision**: Extend existing `tooling/` and `.github/` and retain application paths. Use small pure record/selection/aggregate modules and bounded adapters for subprocess/provider/scanner/filesystem behavior. Do not add a business-domain monorepo or backend scaffolding. Each named module has a contract owner below; files may be combined only if command/validation boundaries and reviewability are preserved.

## Phase 0 — Research Outcome

[Research R-01–R-12](research.md) resolves the toolchain, install restrictions, lint compatibility, runner, desktop launch, workflow graph, head/base/tested context, provenance limitations, applicability, scanners, budgets, compatibility and enforcement sequence. No research placeholder remains.

The verified research gap around TypeScript linting is resolved with Oxlint plus existing tsc. The workflow bootstrap trust limitation is documented and requires independent workflow/provider inspection. Actual clean-install/native compatibility and current remote facts must be measured during delivery; documentation cannot close them.

## Phase 1 — Design and Interfaces

### Processing and Ownership

1. **Context** resolves repository root, exact tested/head/base identities and changed paths using argument-array Git operations. Hosted context records provider event/run/attempt and independent job metadata. Local context records dirty/new files and cannot pretend to be a hosted result.
2. **Selection** loads reviewed base policy and candidate additions, validates enrollment, computes mandatory baseline and risk-selected checks, and emits per-category reasons. Unknown/malformed policy blocks. First F002 uses declared reviewed bootstrap candidate policy; no pretend base file.
3. **Execution** invokes only command definitions from reviewed enrollment, never strings supplied by result records. Each runner owns its process tree and scratch area, measures counts and atomically writes final results. Integration fixtures prove failures and bounded cleanup.
4. **Evidence** validates paths, sizes, state vocabulary and exact contexts. Safe reports explicitly retain missing/truncated/unavailable evidence. F001 policy validation is one named check; its exit 0 cannot approve F002 or accept F002's new envelope.
5. **Aggregation** loads selected expected checks, provider-owned conclusions and required safe reports. It rejects missing/unexpected/duplicate contexts, empty suites, stale evidence, mandatory skipped jobs and expired required artifacts. It exposes `automated_ready` plus reasons; human stages remain separate.
6. **Inspection** reads provider metadata under read-only authority and compares current PR/head/base/workflow/job/attempt/artifacts at review. It cannot execute downloaded reports, post approval, merge or modify service settings.

### Workflow and Native Scope

The context, baseline and security jobs always run for relevant PRs, including documentation-only changes. Selected native jobs use independent clean installs/builds, `fail-fast: false`, matrix parallelism 2 and per-target reports; aggregation never treats matrix-output last-writer behavior as proof of all platforms. `aggregate` has explicit dependencies and `always()` with a short timeout. Cancellation of the entire run may prevent a final verdict; the missing/canceled current run remains non-ready.

Hosted producer jobs need `contents: read` only, checkout credentials are not persisted, and protected secrets/write/OIDC/deployment privileges are absent. Aggregate/inspection may receive `actions: read` and `pull-requests: read` for metadata only; no candidate dependency installation, imports or shell execution occurs in the metadata evaluator. Base evaluator runs as standalone Node built-ins from an isolated checkout; both checkouts disable credential persistence. During bootstrap, that evaluator is a visibly candidate-controlled reviewed artifact.

Policy/tooling changes expand coverage and mandate actual diff review even if the automated gate passes. This foundation does not claim cryptographic truth of test assertions or immutable PR workflow provenance. No privileged PR-triggered execution or new service app is introduced.

### Coverage and Integration Design

| Spec requirements | Planned component / contract                                       | Acceptance coverage                     |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------- |
| FR-001            | Entry/adoption record, F001 read-only merge inspection             | A-23–A-27                               |
| FR-002–FR-005     | Locked setup, lint/type/build, Node suites, CLI                    | A-01–A-05                               |
| FR-006            | Playwright built-Electron fixture and owned cleanup                | A-12–A-13                               |
| FR-007–FR-008     | Versioned suite enrollment and base-policy selection               | A-10, A-14–A-16                         |
| FR-009–FR-011     | Always-evaluated aggregate and explicit outcomes                   | A-06–A-10                               |
| FR-012–FR-014     | Versioned records, provider identity and currentness               | A-09, A-11, A-23                        |
| FR-015            | Separate automated/human/merge lifecycle summaries                 | A-06, A-24                              |
| FR-016–FR-017     | Native matrix and future specialist applicability                  | A-15–A-16                               |
| FR-018–FR-020     | Trust isolation, artifact safety, scanners/dispositions            | A-17–A-18, A-21–A-22                    |
| FR-021–FR-024     | Enforced bounds, supersession, outage/rerun recovery               | A-13, A-19–A-21, A-27                   |
| FR-025–FR-026     | Read-only adoption inspection and separately authorized activation | A-24–A-25, A-27                         |
| FR-027–FR-030     | Feature/QA guidance, independent gate tests, primary-PR trial      | A-23–A-27 and complete A-01–A-27 review |

[Data model](data-model.md) supplies fields, relationships, versioning and transitions. Contracts define public contributor CLI and provider/evidence interfaces; these are external interfaces of the platform feature even though it creates no customer API. [Quickstart](quickstart.md) defines actual future validation steps without implementation bodies.

## Implementation Sequence for Later Task Generation

This is ordered design guidance; it is not `tasks.md`, implemented work or an implementation authorization.

1. Inspect actual F001 merge and current base/settings; inventory existing changes; create the one F002 branch only when authorized. Verify new tool pins and runtime/image access; do not stage unrelated launcher edits.
2. Define bounded context/policy/result schemas and pure validation/selection/aggregation behavior using independent negative fixtures; prove missing behavior before implementing its runner.
3. Add clean setup, meaningful lint, generalized documentation references, existing regressions and unit/integration wrappers. Preserve F001 CLI/record compatibility and prove local outcome/count behavior.
4. Add real sandboxed desktop launch/interaction/cleanup and selected three-target validation. Repair environmental prerequisites without disabling the sandbox; record target gaps.
5. Add bounded redacted scanners and license/disposition checks; verify safe artifacts, zero-test/timeout/crash/cleanup paths and synthetic trust sentinels.
6. Add the unprivileged workflow, provider context/metadata reconciliation, matrix evidence and aggregate; exercise canceled, missing, skipped, stale and conflicting producer cases.
7. Within the same primary PR, demonstrate actual hosted success, applicable failure, evidence omission, repair, supersession and isolation. Record actual workflow/provider/native observations and safe artifacts; complete agent QA after the final repair.
8. Publish feature/QA/enrollment/recovery guidance and final current evidence. Seek final user approval of the concrete PR; merge only with all existing constraints satisfied. If remote activation is included and separately authorized, adopt observed working checks in the documented safe order; report exact prepared/active/unavailable state.

## Validation, Adoption and Recovery

The acceptance set is A-01–A-27 with SC-001–SC-011. Unit fixtures independently define result-state and selection expectations; subprocess integration observes real exit codes/files/counts; desktop smoke observes actual application behavior. Actual provider/native/privilege evidence cannot be replaced by these fixtures. `quickstart.md` names current commands separately from future proposed commands.

Manual reruns retain run/attempt identities; zero automatic retries initially. Unresolved flaky behavior blocks readiness. Failed installation/scanner/display/network/settings capability yields explicit failure or unavailable, never no-op success. Safe collection failure blocks required evidence even when tests passed.

Recovery restores a reviewed compatible verification revision or applies a forward fix in the same open PR. Preserve failed history and F001 contracts; discard only owned generated scratch. Re-run affected checks and agent QA and renew owner review after material changes. After merge, use linked maintenance work; no history rewrite, protection bypass or silent rollback. Signing/release and product compatibility remain separate gates.

## Completion of This Planning Invocation

Generated research, data-model, five interface contracts and quickstart; resolved active feature without switching branches. Pre/post constitution reviews apply to design quality only. Validate local links/anchors, requirement coverage, artifact/command/limit consistency and existing governance policy; inspect documentation diffs and preserve preexisting launcher edits. Do not run/install future commands merely to fill an evidence pack.

Planning validation completed on 2026-10-17: all nine generated design artifacts were reviewed; all 49 local links/anchors resolved; 13 Markdown tables have consistent columns; FR-001–FR-030 map to components/scenarios; all 11 record families have assigned schema/validation ownership; no unresolved template/research markers remain. Read-only research follow-up caught and repaired the scoped CLI exit wording, table enums, record-family omissions, desktop profile bootstrap and execution-duration semantics. Existing governance policy validation passed with zero findings and `git diff --check` passed. Manifest/lock/main and preexisting launcher-edit hashes remained unchanged. These checks validate documentation, not future F002 runtime scenarios.

Post-design hook check found `.specify/extensions.yml` absent, so no before/after hooks required execution. Next workflow is `$speckit-tasks` if requested; planning stops after Phase 1 design.

## Complexity Tracking

No constitutional violations or exception requests. Provider metadata reconciliation, per-target reports and a separate result schema are necessary for currentness, honest native evidence and F001 compatibility; none introduces a customer subsystem or privileged service.
