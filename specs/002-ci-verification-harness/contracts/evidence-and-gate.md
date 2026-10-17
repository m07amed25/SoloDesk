# F002 Evidence and Automated Gate Contract

**Status**: Proposed version-1 verification records; no observed F002 results.
**Related**: [model](../data-model.md), [CLI](verification-cli.md), [workflow](workflow-and-selection.md), [F001 compatibility](../../001-delivery-governance/contracts/evidence-record.md).

## Three Separate Sources

1. **Reviewed policy/selection** defines the complete required check/target/artifact set. Candidate changes cannot erase the base minimum. Bootstrap is labeled explicitly.
2. **Provider-owned observations** identify actual run/attempt/job conclusions and context. Local outcomes are labeled local and never impersonate remote checks.
3. **Check reports/artifacts** contain actual counts, diagnostics, expected/observed behavior and safe evidence. They are inert assertions that must agree with the first two sources; their own `passed` field cannot override them.

The aggregate reads these only through bounded validated records. It never runs their command strings, fetches supplied URLs or authenticates owner approval from editable text. Provider metadata proves run association, not the truth of arbitrary candidate test code. Agent inspection of changed workflow/tests remains an independent delivery gate.

## Mandatory Evidence Per Check

Every selected check has its context/run/check/target/producer identity, source/tool versions, actual procedure, start/end, expected/observed outcome, status/reason and required safe artifacts. Test suites additionally record discovered/executed/passed/failed/skipped/TODO counts. Empty execution or missing count evidence fails required test suites; non-test checks report actual files/dependencies/inputs rather than fabricated assertion counts.

The final F002 QA pack maps A-01–A-27 and SC-001–SC-011 to actual observations and records FR-001–FR-030 coverage. Automated producer summaries require only their declared automated scenarios, not future agent/owner completion. Agent observations and owner decisions are separately sourced after checks finish; CI does not need an owner approval inside its own artifact.

A real hosted trial needs provider run URL/ID/attempt, PR head/base/tested identity, workflow path/id/ref/blob inspection, actual job identities, safe available artifacts and independent expected result. A synthetic provider fixture must be labeled synthetic and cannot satisfy that trial.

## Result Normalization

| Observed source                                                  | Record status / detail                                               | Required-check effect                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Successful execution, expected counts and all required artifacts | `passed`                                                             | Eligible only with current matching producer/context          |
| Assertion/tool/cleanup failure                                   | `failed`, precise reason                                             | Blocked                                                       |
| Not started or unexpectedly skipped                              | `not run`, missing/skip reason                                       | Blocked                                                       |
| Missing tool/display/access/network/runner                       | `unavailable`, named prerequisite                                    | Blocked                                                       |
| Canceled/timed out/superseded                                    | `not run` if incomplete, or preserve actual failure; reason retained | Blocked for current required context                          |
| Old head/base/policy/subject                                     | `stale`, old/new contexts                                            | Blocked unless permitted unchanged-subject assessment applies |
| Policy-unselected category with specific reason                  | `not applicable`                                                     | Visible omission; never counted passed                        |
| Malformed/unsupported/duplicate/conflicting record               | Validation finding                                                   | Blocked; do not repair data silently                          |

Canceled attempts can retain valid historic partial outcomes, but they do not satisfy the current aggregate. Required skipped/TODO tests are not cured by a positive total test count. A zero-diff dependency scan may be a genuine success only when the full declared inventory was actually checked and coverage is recorded.

## Gate Decision Procedure

1. Validate context/policy/enrollment/selection versions, field bounds, unique IDs and reference integrity; resolve actual current reviewed context and policy authority.
2. Enumerate every expected required check and target from reviewed selection; reject missing obligations, duplicated/conflicting results, unknown producer mappings or reduced candidate minima.
3. Match provider run/attempt/job outcomes and the actual tested subject. Preserve raw provider SHA fields; reject ambiguity rather than assume head equals merge subject. A failed prerequisite cannot become approved not applicable.
4. For each selected required check, require successful producer conclusion, passing valid report, meaningful test/input counts, successful required cleanup and available safe artifacts of matching identity/digest/size.
5. Validate scanner dispositions, expiry, blocking findings, artifact totals and enforced resource limits. Missing/truncated required evidence remains blocking.
6. Require per-target results for every selected native environment, not a last matrix output or one OS report relabeled for others.
7. Emit one safe summary: `automated_ready: true` only if steps 1–6 have zero blocking findings. Otherwise list stable finding codes, affected rules and next actions.
8. Separately display agent QA and owner decision as pending/complete/unverified/stale/withdrawn when actual sources are known. Never infer merge/release/independent-review authority or require owner consent merely to produce an automated verdict.

There is no success fallback for an unreadable report, API failure or early producer cancellation. Whole-workflow cancellation/service outage may leave no aggregate; current remote readiness is then missing/blocked, not an invented successful local result.

## Currentness, Digests and Report Circularity

The execution record binds exact head/base/tested commit and policy/toolchain/selection digests; hosted checkout is clean. Content digests use documented canonical UTF-8 field ordering for JSON manifests and SHA-256 raw-byte hashing for artifact files; preserve the algorithm/framing identifier. Verification test fixtures independently calculate expected values.

Final hosted summary/artifact digests are written after producer results, outside the source revision they describe. They do not attempt to contain their own final hash. Repository QA transcribes or links observed runs; committing it changes the PR head and requires documented impact assessment plus repeated affected checks/current final review. Unchanged production subjects may retain prior evidence only under F001's explicit carry-forward rules; prior SHAs are never rewritten as if rerun.

For automated CI context, strict matching is the default. The aggregate does not accept candidate-authored carry-forward of a failed/missing job. Human review may associate an unchanged historic subject for the delivery pack, with actual old/new identities, reviewer/date and reason, without claiming a fresh hosted pass.

## Compatibility and Trust

F001's `check-governance` CLI and envelope remain unchanged and are exercised as baseline regression. The F002 schema family is validated separately. Any later compatibility change requires versioning/migration documentation and old/new negative tests; unknown versions fail without modifying input.

Same GitHub Actions app/check name is not proof of an immutable workflow. Changing the gate, selection or producer definitions requires actual reviewed diff, expanded negative fixtures, independently inspected provider context and current owner approval before merge. No automatic signing/approval controller is included.

## Failure Taxonomy and Recovery

Stable diagnostics should include codes for context-stale/ambiguous, policy-invalid/downgrade, required-missing/skipped, producer-unsuccessful, suite-empty/incomplete, artifact-missing/unsafe/expired/oversize, duplicate-result, unsupported-version, scanner-unavailable/finding, cleanup-failed, budget-exceeded and owner-source-unverified (notice, never automatic consent).

Recovery names the actual dependency to repair, preserves old attempts and reruns affected checks. Removing the check, shortening the selection set or attaching an unrelated artifact is not recovery. Local equivalent evidence may be used only where established policy allows and must not fabricate an Actions result or bypass required protection.
