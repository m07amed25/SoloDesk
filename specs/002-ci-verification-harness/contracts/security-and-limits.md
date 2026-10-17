# F002 Security, Resource and Cleanup Contract

**Status**: Proposed finite engineering defaults; not measured service guarantees or approved production budgets.
**Related**: [research](../research.md), [workflow](workflow-and-selection.md), [gate](evidence-and-gate.md).

## Execution Trust

Use disposable standard hosted runners for untrusted contribution execution. No self-hosted runner, signing/production/provider credential, privileged environment, write token, OIDC grant or deployment action is supplied. Checkout disables credential persistence. Test subprocesses receive only explicitly needed nonsecret environment; no inherited token, `NODE_OPTIONS`, `ELECTRON_RUN_AS_NODE` or broad environment dump. Candidate code is still executable untrusted code; install-script restrictions do not provide isolation by themselves.

Baseline/security/desktop jobs use `contents: read` only. Metadata aggregation/inspection can add `actions: read` and `pull-requests: read` solely for provider observation; those credentials never enter candidate test subprocesses. Its standalone reviewed base evaluator uses Node built-ins, fixed paths and validated metadata; it does not import candidate dependencies, restore candidate-written caches or execute artifacts. Initial bootstrap's candidate-controlled evaluator has an explicit trust limitation and independent agent review.

Pin action full commit SHAs and external CLI binary release/checksum identities. Verify current sources/engines/platform packages and exact lock resolution before installation. No unpinned marketplace command, remote script pipe, candidate-derived shell interpolation, arbitrary record-command execution or privileged follow-on trigger.

Initially disable cross-run caches entirely: no `node_modules`, compiled native modules, `.vite`, results, reports, test profiles or writable package cache is shared between trust contexts. Every target performs clean script-restricted setup and current verification. If cache optimization is added later, it requires reviewed exact OS/architecture/runtime/lock/tool/trust identities, integrity checks and poisoning-negative cases before adoption; a hit never proves a passed check. Unsupported cache requests fail rather than silently reuse unknown content.

## Setup and Tool Integrity

1. Observe exact Node/npm and manifest/lock hashes.
2. Run `npm ci --ignore-scripts --no-audit --no-fund`; verify unchanged records. Keep platform optional binaries required by build/lint tools.
3. Desktop jobs alone explicitly invoke the locked reviewed Electron installer. Verify expected version/platform/checksum and actual executable path.
4. Do not rebuild/load the unused database adapter or claim encrypted storage. Newly needed lifecycle/native behavior belongs to its owning authorized feature and reviewed policy.
5. Missing, incompatible, unreadable or wrong-checksum tools fail before their result can be called passed. Do not repair by downloading “latest” or disabling protection.

## Scanner Boundaries

| Check                    | Required coverage / disposition                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets                  | Pinned Gitleaks CLI, reviewed config from base where available, tracked candidate tree and applicable changed history; full redaction and synthetic sentinel fixtures; zero unexplained findings            |
| Dependency risk          | `npm audit --json` including development dependencies, exact lock/context and registry/source/time; all severities visible; no `audit fix`; unavailable registry is not a clean scan                        |
| Licenses                 | Bounded complete locked dependency inventory, valid SPDX expressions or explicit unknown/missing metadata findings, reviewed changes/dispositions; declared metadata is not a legal certification           |
| Workflow syntax/security | Pinned actionlint plus explicit policy checks for forbidden triggers, excessive permissions, unpinned actions, credential persistence and unsafe artifact/cache consumers; agent diff review still required |

Raw scanner output is captured inside owned bounded scratch with no console echo and sanitized before sharing. Only safe finding code/package identifier/severity/location/action is published. Tool/parser/collection errors are preserved as failures/unavailable. Secret matches are never printed. Synthetic sentinel exceptions are limited to named reviewed fixture files and known expected values; they cannot suppress arbitrary matches elsewhere.

Credential exposure or unsafe privilege is blocking. High/critical dependency findings block until remediation or an individually reviewed allowed mitigation; other severities also require explicit triage before final delivery readiness. Missing/conflicting/unknown license metadata blocks pending responsible review. Dispositions name exact finding/package/version/scope, rationale, owner, evidence and expiry; expired/broadened suppressions fail. No record can waive a constitutional blocker or automatically grant legal approval.

## Initial Finite Bounds

| Subject                                           | Proposed enforceable limit                              | Failure behavior                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Local coordinator                                 | 45 minutes total, including cleanup                     | Stop new work, cancel owned children, report timeout and cleanup                                             |
| Hosted context                                    | 5 minutes                                               | Missing context blocks dependent jobs/aggregate                                                              |
| Hosted baseline / security                        | 15 / 10 minutes                                         | Provider timeout remains blocking                                                                            |
| Hosted native job                                 | 20 minutes per target                                   | Preserve actual partial evidence; no substituted OS pass                                                     |
| Hosted aggregate                                  | 2 minutes                                               | Missing/timed-out gate remains blocked                                                                       |
| Hosted execution duration at readiness/inspection | 50 minutes from provider start to completion            | Over-budget completed or overdue incomplete attempts block; no approval TTL/top-level workflow-timeout claim |
| Unit/integration case / suite                     | 30 seconds per default case / 5 minutes per suite       | Extensions require individual reviewed definition, still within job limit                                    |
| Desktop launch / full case                        | 30 / 60 seconds, followed by cleanup                    | Actual unavailability/failure reported; no sandbox-disabling fallback                                        |
| Graceful / total owned cleanup                    | 10 / 20 seconds                                         | Escalate only owned process tree, then report leftover/cleanup defect                                        |
| Supersession cancellation target                  | 6 minutes from provider acknowledgement                 | Verify stop or record blocking defect; provider unable to accept request is unavailable                      |
| Parallelism                                       | 2 native matrix jobs, 2 suite workers; desktop worker 1 | Bound resource use; unrelated proposals retain their own groups                                              |
| Test retries                                      | 0 automatic retries                                     | Manual reruns are new observed attempts, old failure retained                                                |
| Input file / cumulative input                     | 2 MiB / 32 MiB                                          | Reject before uncontrolled parsing, exit 2                                                                   |
| Selected definitions / records                    | 512 / 2,048 per collection                              | Explicit oversize finding, no silent truncated coverage                                                      |
| Safe log / screenshot                             | 2 MiB / 5 MiB per file                                  | Truncate logs only with explicit marker; missing required content blocks evidence                            |
| Safe artifact per job / whole run                 | 25 MiB / 100 MiB                                        | Pre-upload enforce quotas; required over-limit evidence blocks                                               |
| Hosted artifact retention                         | 7 days                                                  | Expired required evidence must be regenerated/restored before review                                         |

GitHub exposes per-job timeouts, not an ordinary top-level workflow timeout. Per-job limits bound actual running work. The 50-minute execution-duration rule is evaluated by the gate/read-only inspection and cannot forcibly cancel a workflow that never starts or an unreachable provider; that absence remains a visible gap. Cancellation combines provider mechanics and bounded cleanup; it is not a guarantee about an unavailable service.

Reserve at most 10 MiB each for baseline/security, 20 MiB per selected desktop target and 10 MiB combined for context/aggregate, within the 100 MiB run cap. The generic 25 MiB per-job ceiling never overrides these allocations. Gate sums verified manifests across all producers; no upload occurs before that producer's quota/redaction validation. No videos, HAR, full browser traces, core dumps or build/dependency archives by default.

These numerical limits are engineering design choices for owner review/adoption and measurement. Changes require a policy revision and negative-bound tests; none changes Q-02/Q-11/Q-16 or authorizes paid capacity.

## Desktop Isolation and Cleanup

Build actual main/renderer outputs, use a normal user with functional sandbox/display prerequisites and launch Playwright Electron with `chromiumSandbox: true`. Preserve app `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` and current CSP. Sanitize the minimum environment through existing launcher cleanup logic while preserving legitimate display/OS paths.

Use one owned temporary user-data and session-data profile per attempt. A reviewed test-only main bootstrap pre-creates and validates those owned directories, calls app.setPath for both paths synchronously before readiness, then requires the fixed unchanged built main entry; it accepts no arbitrary executable path. Observe actual app paths and the built-entry identity and reject mismatch. No product source, preload or IPC is changed. Record Electron PID/tree at spawn. On success/error/cancellation, close through the automation handle in `finally`; after ten seconds escalate only confirmed owned descendants using platform-safe termination. After twenty seconds verify exit/profile cleanup or report an independent failure. Never kill an unrelated user's Electron process, delete a home profile or use arbitrary report-supplied cleanup paths.

Assertions include real shell heading/ready state, planned-feature expand/collapse and disclaimer, existing runtime preferences and absence of renderer `require`. Renderer startup errors/crash/leftover process fail. Linux Xvfb success is a Linux headless test, not proof of Wayland/native controls. Windows/macOS require separate actual executions. Experimental automation incompatibility is a real delivery blocker; do not bypass it with `--no-sandbox`.

## Artifact and Record Safety

Allowlist structured JSON summaries, bounded safe text and synthetic shell PNGs only. Resolve paths inside owned scratch after symlink checks; reject traversal, absolute external targets, active content and executable attachments. Parse duplicate keys/unknown versions explicitly. Atomic temp-write/rename prevents partial files being called complete; crash/collection failure remains visible.

Redaction rules cover sentinel credentials, credential-bearing URLs and sensitive environment fields. Do not claim generic redaction proves arbitrary customer data is safe; use only synthetic test data and review shared artifacts. Durable repository QA is compact and redacted. Hosted retention is not product backup or a customer retention policy.

## Outage and Recovery

Tool/network/quota/runner/display failure names the missing prerequisite and next action. Continue independent local checks where meaningful; never represent them as required remote checks or unseen native results. No runner purchase, visibility/subscription change or protection bypass occurs automatically. A compromised/scanner-leaking attempt is invalid; replace safe evidence after the incident/repair and renew affected QA/approval.
