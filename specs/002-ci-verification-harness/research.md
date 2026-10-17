# F002 Research and Design Decisions

**Date**: 2026-10-17
**Status**: Planning research complete; choices below are proposed engineering decisions for F002, not implemented results, remote configuration or new confirmed product decisions.
**Inputs**: [specification](spec.md), [constitution](../../.specify/memory/constitution.md), [existing setup](../../docs/development/setup.md), [F001 interface](../001-delivery-governance/contracts/local-validation.md).

The selected skill dispatched two read-only research agents: hosted CI/trust/enforcement and local runners/desktop/lint. Their findings were reconciled against local files and primary documentation. No installation, product execution, remote change or hosted trial occurred during research.

## R-01 — Preserve the Existing Toolchain and Resolve New Tools Deliberately

**Decision**: Use Node 24.21.0 and npm 11.19.0 as the initial measured tooling pair, with the repository's Node 24 constraint. Preserve locked Electron 44.8.0, TypeScript 7.0.2, Vite 8.3.4 and Playwright 1.64.1. Add only Oxlint and an SPDX-expression parser as proposed development dependencies; record exact compatible versions and lock integrity during authorized implementation. Record action commit SHAs and external CLI release/checksum identities in a toolchain manifest; refuse unresolved tool identities at execution.

**Rationale**: These versions come from the actual runtime/package lock, not assumed latest releases. New package versions must be verified against the implementation-time registry and native platform requirements before installation; selecting a tool here is not claiming that its binary is already available.

**Alternatives considered**: Toolchain upgrade, another test framework, or unpinned `npx` downloads. Rejected as unnecessary scope and weaker reproducibility.

**Research closure**: Tool choices and pinning rules are settled. Filling verified binary/package identities is a mechanical implementation prerequisite, not an unresolved product choice. Failure to find compatible versions blocks the dependent check and requires a revised design, not an automatic stack replacement.

## R-02 — Locked, Script-Restricted Dependency Setup

**Decision**: Run `npm ci --ignore-scripts --no-audit --no-fund`, verify manifest/lock hashes before and after, then explicitly run the reviewed Electron installer through the existing `npm run setup:electron` only for desktop jobs. No arbitrary lifecycle scripts, root extension hooks, package downloads through unpinned commands, or unused database-native rebuilds. Native optional packages required by Vite/Oxlint must resolve under the target OS rather than be omitted.

**Rationale**: `npm ci` rejects manifest/lock inconsistency and does not rewrite them; disabling lifecycle scripts narrows setup execution. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) documents both behaviors. Electron's installer is a declared binary in the actual lock and is described by [Electron installation](https://www.electronjs.org/docs/latest/tutorial/installation).

**Alternatives considered**: Ordinary install, blanket script approval, or disabling all native optional packages. Rejected because they respectively change resolution, expand execution or break legitimate build/linter binaries.

**Limits**: Subsequent application/test commands deliberately execute candidate code inside unprivileged disposable environments. Script restriction is not a sandbox. The current shell does not load better-sqlite3; this setup proves no database ABI or encryption capability.

## R-03 — Node Runners and Syntax Lint Compatible With TypeScript 7

**Decision**: Use Node's built-in test runner for verification unit/integration tests and existing launcher/governance regressions. Keep `tsc --noEmit` as type authority. Select Oxlint for JS/TS/TSX correctness rules, including useful React rules; enforce warnings as errors and test deliberately invalid fixtures. Do not add type-aware lint in F002.

**Rationale**: Existing tests are `.mjs` and need no framework migration. [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html) supports isolated tests/reporting. Current [typescript-eslint supported dependency versions](https://typescript-eslint.io/users/dependency-versions/) do not cover the locked TypeScript 7 line. [Oxlint usage](https://oxc.rs/docs/guide/usage/linter) and [rules](https://oxc.rs/docs/guide/usage/linter/rules.html) provide a syntax-based alternative without downgrading TypeScript.

**Alternatives considered**: Vitest, unsupported typescript-eslint with suppressed warnings, or Babel-based TS linting. Rejected for added machinery or unsupported compatibility. Oxlint's native binaries require actual clean-platform validation before adoption.

**Limits**: Minimum enabled rules catch debugger statements, unreachable code, invalid control flow and React hook misuse where supported; exact rule names are verified against the pinned release. F001's suite keeps its current ordinary isolated runner. The launcher's existing isolation setting is preserved and justified rather than blindly applied to all suites.

## R-04 — Built Application Desktop Smoke

**Decision**: Reuse Playwright's existing Electron automation export. Build first, launch the actual `.vite/build/main.js` through a test-owned main bootstrap with the locked Electron executable and `chromiumSandbox: true`, sanitized minimal environment and isolated temporary user-data/session-data directories. Do not start a dev server, download browsers, package installers, inject a preload or add product IPC. Linux uses an available Xvfb display; Windows/macOS execute separate native jobs.

**Rationale**: The test bootstrap pre-creates and validates owned directories, sets Electron userData/sessionData paths synchronously before readiness, then imports the unchanged built entry; it does not replace app behavior. [Electron app path APIs](https://www.electronjs.org/docs/latest/api/app#appsetpathname-path) define the ordering. The built main already loads `.vite/renderer/main_window/index.html`. [Playwright Electron](https://playwright.dev/docs/api/class-electron) exposes application/window/process control; its launch sandbox option must be set explicitly. Smoke observes the real heading, shell-ready label, planned-features disclosure and collapse/expand behavior, plus existing sandbox/context-isolation/Node-integration settings and absence of renderer `require`.

**Alternatives considered**: Browser-only tests, Forge dev-server orchestration, disabling the sandbox, or screenshot-only checks. Rejected because they fail to prove the intended desktop path or add avoidable startup complexity.

**Limits**: Electron automation remains experimental. A real launch proving this configuration is required; incompatible sandbox/debugging/display behavior blocks the desktop result. No `--no-sandbox`, GPU-disable fallback or fabricated native pass is allowed. Missing capability requires repair/revised harness design. This is shell evidence, not F004 delivery or OS certification.

## R-05 — One Workflow With Explicit Aggregation

**Decision**: `.github/workflows/verify.yml`, display name `SoloDesk Verify`, runs on PRs targeting main and pushes to main without workflow-level path filters. Jobs are context, baseline, security, selected desktop matrix and aggregate. `F002 / automated-readiness` is the stable aggregate check. Its bounded job uses `if: always()` and enumerated `needs`; matrix target reports remain individual evidence. A required workflow prevented from starting remains missing/blocked, not a success.

**Rationale**: GitHub distinguishes skipped workflows, skipped jobs and failed dependencies. [Required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) supports explicit dependency aggregation. The aggregate compares every selected required producer to provider-owned conclusions, not merely successful report JSON.

**Alternatives considered**: Per-path required workflows, one enormous opaque job, or several unsynchronized aggregates. Rejected because they create pending checks, obscure failures or permit ambiguous readiness.

## R-06 — Record Head, Base and Tested Revision Separately

**Decision**: A PR context includes event head SHA, base SHA and the actual tested merge SHA; push context records its actual commit and comparison baseline separately. Provider run ID/attempt, workflow identity and job identities bind hosted results. Refresh comparison context before review. A base move requires new current evidence, normally after updating the PR branch; use strict up-to-date required checks if enforcement is adopted. Merge queues are excluded until an explicit design adds their event/context contract.

**Rationale**: [Actions events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request) defines PR merge-ref execution. A test-merge result must not be falsely described as testing only the head or as a release artifact.

**Alternatives considered**: Recording only `GITHUB_SHA` or relabeling old runs after base movement. Rejected because they lose the subject/base relationship.

## R-07 — Provenance Has a Defined Limit

**Decision**: Provider-owned job conclusions establish that the hosted jobs ran; report data supplies counts/diagnostics and cannot override them. An operator/agent reads authenticated run/job metadata and inspects the workflow blob at the tested revision. The aggregate evaluator and minimum selection policy come from the exact reviewed base revision when available; candidate changes may add coverage but cannot remove base obligations. F002's first PR explicitly uses a reviewed, frozen bootstrap candidate because no F002 policy exists on main yet.

**Rationale**: A PR can edit its own workflow. An expected check name or GitHub Actions app identity alone cannot authenticate an immutable workflow or the truth of tests. [Actions security guidance](https://docs.github.com/en/actions/reference/security/secure-use) and [status-check rules](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) require care about execution and check identity.

**Alternatives considered**: A privileged `pull_request_target` test run, a new signing/GitHub App service, or automatic privileged `workflow_run` artifact consumption. Rejected for scope/privilege expansion. F002 installs none of them.

**Limits**: Self-modified CI always requires actual diff review, expanded negative tests and final owner decision. The bootstrap does not claim tamper-proof protection. If stronger independently controlled enforcement is later required, it is a separately designed/authorized prerequisite, not an invented capability of the same candidate workflow.

## R-08 — Conservative Applicability Without Future Fake Suites

**Decision**: All PRs run type/lint/build, launcher, governance, documentation and verification unit/integration checks plus security. Desktop is required for app, build, runtime, dependency, launch/harness and verification-policy changes. F002 enrolls Linux x64, Windows x64 and macOS arm64 validation targets; these are test environments, not product minimums. Initial F002 harness changes exercise all three. Documentation-only changes may omit risk-triggered desktop work with explicit reasons. Unknown paths fail selection for review or conservatively select all presently available categories.

**Rationale**: NFR-014 needs complete coverage accounting; Q-11 still owns support decisions. Future finance/sync/permission/Arabic suites enroll only with their implemented features and must not pass by discovery of zero tests.

**Alternatives considered**: Label-controlled waivers, empty future suites or treating every change as docs-only unless a path matches. Rejected because they can silently drop obligations.

## R-09 — Scanners With Visible Coverage and No Automatic Repair

**Decision**: Use a verified pinned Gitleaks CLI for tracked-tree/changed-history secret scanning, `npm audit --json` for all locked dependencies, and a built-in inventory reader plus pinned SPDX parser for license expressions. Validate workflow syntax with a pinned actionlint CLI. Preserve sanitized reports and tool/source versions. Missing scanners/network produce unavailable results. Never run audit fix or automatically alter dependencies/licenses.

**Rationale**: [Gitleaks](https://github.com/gitleaks/gitleaks) documents redacted reporting; [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/) provides vulnerability data but not general code correctness or complete security assurance; [actionlint](https://github.com/rhysd/actionlint) checks workflow expressions/structure.

**Alternatives considered**: A paid marketplace scanner, implicit registry install, or a home-grown secret regex as sole protection. Rejected as unnecessary cost, unreviewed execution or insufficient coverage.

**Disposition policy**: Credential exposure/unsafe privileges are blocking. High/critical advisories block pending mitigation and reviewer disposition; other advisories still need explicit triage before final readiness. Unknown, missing, conflicting or materially changed licenses block pending review; no automatic legal-compatibility claim or new approved-license list. Fixed-version suppressions require reason, owner and expiry; they cannot waive constitutional blockers. Never publish raw scanner payloads or package scripts as executable instructions.

## R-10 — Finite Initial Engineering Budgets

**Decision**: Adopt the proposed numerical defaults in [limits and security contract](contracts/security-and-limits.md): 45-minute local coordinator and a 50-minute hosted execution-duration readiness limit, 15-minute baseline, 10-minute security, 20-minute desktop jobs, 2-minute aggregation; desktop parallelism 2 and one active run per proposal; 30-second launch, 60-second desktop case and 10-second graceful/20-second total cleanup. Safe artifacts cap at 25 MiB per job and 100 MiB per run, 7-day retention; repository QA keeps compact durable summaries. Defaults need implementation measurements and owner review of service settings before adoption.

**Rationale**: These are finite safeguards for verification, not product performance/service promises. [Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) supports supersession. Cancellation handling must also account for [GitHub cancellation behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation); an entire canceled run need not finish its aggregate. GitHub provides job timeouts rather than a top-level workflow timeout: the local coordinator enforces its own 45-minute deadline, hosted jobs enforce individual limits, and aggregation/read-only inspection reject a hosted execution exceeding 50 minutes or an incomplete attempt past that deadline; later review of a completed in-budget run uses context/artifact currentness, not a 50-minute approval TTL. The cancellation target is six minutes after provider acknowledgement; no promise covers a provider that cannot accept the request.

**Alternatives considered**: Unlimited waits, indefinite artifacts, or new paid runners. Rejected. Hosting quotas/availability must be inspected at delivery; no free-capacity entitlement is inferred.

## R-11 — F001 Compatibility and Separate Human Approval

**Decision**: Keep F001 CLI/version-1 envelope and six-state vocabulary unchanged. F002 introduces its own versioned run/evidence family and separately links current agent/owner review. No automated pass asserts merge authority. F002-specific records are validated by the new verifier, not passed into a checker that hardcodes F001. Review/approval sources remain governed by F001.

**Rationale**: Existing [F001 evidence](../001-delivery-governance/contracts/evidence-record.md) is an implemented governance boundary. No self-referential final-SHA/owner-approval field is added to CI evidence. Agent and owner review happen after producer results; the automated gate cannot depend on future owner consent.

**Alternatives considered**: Silently changing F001's schema, treating CI as independent human approval or requiring approval inside its own digest. Rejected for compatibility, authority and circularity.

## R-12 — Adopt Remote Enforcement Only After a Working Check Exists

**Decision**: Include read-only inspection and a concrete activation/backout record. After separately authorized activation, require PR-only main updates, the exact verified aggregate check, strict current-base validation and resolved conversations; restrict ordinary force pushes/deletion and preserve stronger existing rules. No independent reviewer is invented. Verify actual settings and behavior before claiming enforcement.

**Rationale**: [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) describes service controls; availability is plan/context dependent and must be inspected. F002's one primary PR can deliver the workflow and documentation first; separately authorized activation follows working published check identities. It requires no second primary feature PR.

**Alternatives considered**: Protecting a nonexistent check, automatically changing repository settings or disabling constraints for owner staffing. Rejected. If activation is not authorized/available, report prepared/unavailable enforcement, not enforced protection. Any explicitly included enforcement requirement remains incomplete until its real authorized outcome.

## Research Closure and Remaining Delivery Gates

All technical unknowns have a chosen design or an explicit fail-closed delivery check: lint compatibility, install strategy, desktop launch, context/provenance, applicability, scanners, limits, evidence compatibility and adoption sequence. No unresolved clarification placeholder remains.

The actual F001 merge, F002 implementation authorization, current hosted settings/access, verified new tool pins, real native execution, measured limits and any remote activation remain future execution/adoption gates. They are not undocumented answers to Q-01–Q-16, completed tests or reasons to stop independent documentation.
