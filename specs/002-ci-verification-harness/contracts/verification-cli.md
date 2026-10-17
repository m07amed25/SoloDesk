# F002 Contributor Verification CLI Contract

**Status**: Proposed interfaces; commands marked future are not implemented by planning.
**Authority**: [model](../data-model.md), [workflow](workflow-and-selection.md), [gate](evidence-and-gate.md).

## Command Surface

From repository root, future `node tooling/verification/cli.mjs <command>` exposes:

| Command     | Inputs                                                                                                                      | Output / side effects                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `context`   | `--mode` local, hosted-pr or hosted-push; `--base <sha>` for local comparison; `--out <owned-relative-path>`                | Actual Git/environment/provider context; writes only owned scratch output                            |
| `select`    | `--context <path>`, `--policy <path>`, `--suites <path>`, `--out <path>`                                                    | Validated per-check/target applicability; no tests run                                               |
| `run`       | `--context <path>`, `--selection <path>`, `--group` baseline, security or desktop; optional `--target <id>`                 | Executes reviewed enrolled commands; safe reports/counts/cleanup, never report-supplied commands     |
| `aggregate` | `--context <path>`, `--selection <path>`, `--reports <owned-dir>`, optional `--provider <observation-path>`, `--out <path>` | Current automated-readiness summary; no approval or service mutation                                 |
| `inspect`   | `--run-id <integer>`, `--attempt <integer>`, `--pr <integer>` where applicable, `--out <path>`                              | Read-only provider observation, context/currentness comparison; token value never an argument/output |
| `validate`  | `--record <path>`                                                                                                           | Supported-family/version/structure/reference diagnostics; no execution or fetching URLs              |
| `verify`    | `--profile` baseline, desktop or all; `--base <sha>` for local comparison                                                   | Local context → selection → selected execution → aggregate, bounded by 45 minutes                    |

`--format json|text` controls safe diagnostics; default text. `--help` lists exact options without executing checks. Unknown/missing/duplicate/conflicting options, invalid enum values, unsafe paths and unsupported schemas fail before mutation. No `--skip-required`, `--assume-approved`, `--accept-old`, arbitrary `--command` or unbounded wildcard suite option.

Default owned workspace: `.verification/<local-run-id>/` with results/selection/context/artifacts/summary; ignored by Git during implementation. Reports refer to root-relative portable paths. The implementation must validate ownership/symlinks before creating or deleting anything. No absolute user-selected output directory, customer home profile or overwrite of repository source.

## Future npm Entry Points

| Entry point                                         | Purpose                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run lint`                                      | Pinned Oxlint on app/tooling/tests/configuration, no fix mode, warnings fail       |
| `npm run test:unit`                                 | Bounded explicitly enrolled verification unit suites                               |
| `npm run test:integration`                          | Bounded actual CLI/subprocess/temp-repository suites                               |
| `npm run test:desktop`                              | Existing Playwright Electron runtime, built shell, one worker, no browser download |
| `npm run check:docs`                                | Generalized supported local Markdown/anchor/owning-ID integrity                    |
| `npm run check:security`                            | Declared Gitleaks/audit/license/actionlint inputs and sanitized outcomes           |
| `npm run verify -- --profile baseline --base <sha>` | Local baseline without asserting an unexecuted required desktop result             |
| `npm run verify -- --profile all --base <sha>`      | All selected locally available checks; required unavailable targets remain gaps    |

Existing `npm run typecheck`, `npm run build`, `npm run test:launcher`, `npm run setup:electron` and F001 governance commands remain valid. Proposed npm wrappers delegate to the same suite/report logic used by hosted jobs. The baseline profile can return successful baseline execution while its summary still marks full automated readiness false if another required target/group is outstanding; output/exit semantics must make that distinction explicit.

## Exit and Output Semantics

| Exit | Meaning                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Requested command/category completed and its applicable contract passed; `verify --profile all` or `aggregate` requires automated readiness |
| `1`  | Observed failed check or blocking readiness/evidence finding                                                                                |
| `2`  | Invalid invocation, malformed/unsupported/unsafe input, missing tool/environment, provider outage or coordinator infrastructure failure     |

A scope-limited `run --group baseline` can exit 0 while selected desktop checks are still pending; it must state `scope_complete: baseline`, `automated_ready: false|not evaluated`. `verify --profile baseline` has the same scoped result and explicitly states `full_verification: incomplete` when other selected requirements remain. `verify --profile all`/`aggregate` cannot exit 0 in that case.

JSON contains schema/version, command, context/run references, requested scope, outcome, `automated_ready` when evaluated, finding codes and safe next actions. Diagnostics never echo raw record values, tokens, arbitrary command strings, stack/environment dumps or URL queries. Text and JSON classify the same result.

## Runner Contract

Only reviewed command IDs map to fixed argument arrays and bounded subprocesses (`shell: false`). Node suites enumerate entry files separately from fixtures and parse actual completion/count results. Required zero discovery, zero executed tests, missing summary, required skipped/TODO tests, crash or timeout blocks. A child exit 0 alone is insufficient.

Every child has a deadline, owned PID/tree and `finally` cleanup. Signal handling forwards cancellation and cleans only owned descendants. Parent cleanup failure is independently blocking. Temporary synthetic repositories never point to customer paths, and fixture text/records are not executable inputs.

Build/lint/type/scanner adapters publish real tool exit/count semantics. Input counts such as scanned files/dependencies are distinct from test assertion counts. Failed safe collection cannot be marked not applicable.

## Local / Hosted Separation

Local `inspect` requires read-only provider access in its own invocation and cannot convert an uncommitted local result into a hosted check. Hosted aggregate obtains producer outcomes from the workflow/provider context, not `--provider` supplied by a candidate file with claimed authority; the argument is transport whose source is verified by the hosted wrapper and later inspection.

No command posts comments/checks/approvals, merges, deploys, changes protections, installs missing packages, fetches artifact URLs from records or executes recorded procedures. Setup/tool installation and authorized remote activation are separate reviewed operations. Local-only use requires no service credentials, except explicitly requested metadata/scanner network steps, which must declare their unavailable state.

## Required Contract Verification

Independently test every exit class, malformed/duplicate JSON fields, unsafe/symlink paths, empty suites, failing child, timeout/cancellation/cleanup, Unicode identifiers, partial/missing reports, mixed revision/target contexts and absence of network/record-command execution in offline validation modes. Hosted API metadata tests use inert fixtures; actual provider inspection remains required at delivery.
