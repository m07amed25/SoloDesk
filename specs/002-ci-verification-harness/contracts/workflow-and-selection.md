# F002 Hosted Workflow and Check Selection Contract

**Status**: Proposed orchestration, not an installed workflow or required remote check.
**Related**: [CLI](verification-cli.md), [gate](evidence-and-gate.md), [limits](security-and-limits.md), [adoption](enforcement-adoption.md).

## Workflow Identity and Events

- File `.github/workflows/verify.yml`; display name `SoloDesk Verify`.
- `pull_request` targeting main, with opened/synchronize/reopened/ready-for-review types; drafts also receive verification. No workflow-level path filters. Default-branch `push` exercises the merged baseline independently of owner consent.
- No `pull_request_target`, privileged follow-on artifact execution, deployment, signing or auto-merge. Merge queue is not configured; adding it requires a reviewed `merge_group` context/event contract before adoption.
- Stable aggregate check name `F002 / automated-readiness`; verify the exact observed provider name/application identity before requiring it. Internal job IDs are `context`, `baseline`, `security`, `desktop`, `aggregate`.
- Concurrency keys include workflow identity + repository + PR number, or a separate main-push identity; cancel superseded runs within that group. Never let a PR group cancel unrelated proposals/default-branch runs.
- Full run cancellation may prevent aggregation from finishing. Canceled/absent required results remain blocked, with explicit provider reason rather than a fabricated final success.

## Job Graph

| Job              | Expected check display name    | Needs / responsibility                                                                                                                        |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `context`        | `F002 / context`               | Resolve exact context, base policy, changed-file inventory and selection; no candidate package execution in policy evaluation                 |
| `baseline`       | `F002 / baseline`              | Context; clean script-restricted setup, all mandatory baseline checks and safe reports                                                        |
| `security`       | `F002 / security`              | Context; scanners/workflow syntax/audit/license reports under declared trust and network limits                                               |
| `desktop` matrix | `F002 / desktop (<target-id>)` | Context; selected target, clean setup + reviewed Electron download + build + real smoke + safe report/cleanup                                 |
| `aggregate`      | `F002 / automated-readiness`   | Explicit `needs` of all jobs above, `if: always()`, two-minute timeout; validate complete selected obligations, provider outcomes and reports |

No required producer uses `continue-on-error`. Failure capture may continue a cleanup/reporting step, but the actual failed check remains failed and the producer's final outcome must reflect it. Aggregate validates every individual baseline/security result; a successful final upload cannot erase an earlier failure.

Desktop matrix uses `fail-fast: false` and `max-parallel: 2`. Preserve an independent report/artifact identity for every target, never a single ambiguous matrix output. F002 selects all three initial targets because it adds native test machinery. Other changes use the reviewed rules below; native execution on only one target does not satisfy the others.

## Immutable Execution Context

PR checkout targets the event's exact merge/tested SHA. Preserve proposal head, event base, tested SHA, raw provider head SHA and actual `git rev-parse HEAD` separately. The event payload is data; never interpolate titles/branches/paths into shell code. A changed current PR base/head invalidates currentness before merge even if earlier checks remain green.

Use bounded Git argument-array operations with NUL-separated path output, complete fetch ancestry and both sides of rename detection. Missing merge refs, ambiguous history, conflicts, incomplete pagination/inventory or unknown contexts block rather than silently select fewer checks. Pushes record before/after identities; no PR approval is inferred from push success.

For ordinary PRs, read the minimum policy and standalone evaluator from the exact base SHA in an isolated checkout, with no candidate packages/imports or persisted credentials. Candidate enrollment may add obligations; it cannot remove or weaken the base minimum. Changed base evaluator/policy/CLI/workflow files force expanded tests and agent review. If base policy exists but is unreadable/invalid, stop; do not silently fall back to candidate policy.

Initial F002 bootstrap has no base evaluator/policy. Its reviewed candidate files are explicitly marked `bootstrap-candidate`, frozen for actual hosted trials and inspected independently by the agent against provider metadata. This is an adoption exception in provenance, not an assertion of immutable enforcement or permission to bypass owner approval. The actual merged F002 establishes the reviewed default-branch baseline for subsequent phases.

## Selection Table

Mandatory baseline applies to every relevant PR: typecheck, lint, build, launcher, governance-policy/tests, documentation, verification-unit/integration. Security baseline applies to every PR: secrets, dependency risk, licenses and workflow-syntax, including valid scans with zero changed dependencies. These are never waived by “docs only.”

| Changed subject                                                             | Additional required coverage                                                   | Reason / handling                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Product docs, root plan, requirements/decisions or feature docs only        | No desktop unless another rule matches                                         | Keep baseline/security and category-specific unchanged-runtime reasons              |
| `app/**`, Vite/Forge configuration, renderer styles or platform launch code | Desktop on every affected declared target; later interactive suite obligations | Actual shell/runtime boundaries or rendering can change                             |
| Manifest/lock, runtime/toolchain identities or install policy               | All declared desktop targets and compatibility/security checks                 | Native binaries and install behavior may differ by platform                         |
| Verification policy/schemas/evaluator/workflow/runner/harness/tests         | Policy/gate/trust negative tests plus all declared desktop targets             | The verifier can alter coverage/results itself                                      |
| CI-only prose guide                                                         | Baseline/security, no native execution if all runtime policy is unchanged      | Exact changed subject and reason recorded                                           |
| Later enrolled domain/finance/sync/auth/UI/document/provider/release files  | Owning real suites and applicable specialist/manual/native categories          | Suites and prerequisites must be delivered with the feature, not blank placeholders |
| New/renamed/deleted/unclassified root or binary/configuration subject       | Conservative full existing coverage plus explicit review, or blocked selection | Unknown means possible impact, never no impact                                      |

Directory rules are inputs to a versioned policy, not a complete immutable list of all future files. A scope declaration cannot downgrade actual changed paths. Future enrollment validates phase IDs against root cards and local FR/A/SC against their owning spec; it never treats F002-local FRs as globally unique IDs.

## Provider Result Transport

Hosted job conclusions come from `needs.*.result` and, for per-target detail/currentness, authenticated read-only run/attempt/job API observations. Aggregate's dependency list must enumerate all possible producers and test omission detection. If context fails and dependent jobs skip, aggregate still blocks using that failed prerequisite.

Allowed skipped jobs exist only for policy-unselected risk checks and have an explicit not-applicable record. A selected job with skip/cancel/timeout or missing target report is blocking even if another matrix job succeeded. Results from a different attempt/PR/commit cannot be substituted.

Read-only metadata jobs need only contents/actions/pull-requests read as necessary. Producer jobs do not receive metadata credentials in their environment. No privileged consumer executes downloaded artifacts. Check/app identity confirms provider association but not immutable workflow truth; actual workflow diff/blob review remains mandatory when CI changes.

## Actual QA Required

Within the one future F002 primary PR, capture independent hosted runs for clean success, injected applicable failure, required-evidence omission and repaired success. Demonstrate supersession and a separate unrelated control run, fork/untrusted privilege boundaries and all selected native targets. Controlled experiments precede final repaired-head QA/owner review; no extra primary feature PR or automatic external message is implied.
