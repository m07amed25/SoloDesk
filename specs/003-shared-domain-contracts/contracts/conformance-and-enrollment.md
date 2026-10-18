# F003 Conformance and Verification Enrollment

**Requirements**: FR-031–FR-034; all acceptance scenarios. This is the future implementation contract. None of the F003 scripts, suites or files described below exists merely because it is named here. Existing F002 commands are distinguished in [quickstart](../quickstart.md).

## Suite Definitions

Enroll these additive definitions in `verification/suites.v1.json`, with feature `F003`, linked NFR-001/NFR-015/PLT-008, `kind: tests`, `group: baseline`, `executable: $NODE`, exact explicit argv/entry_files and independently meaningful passing/negative cases. The proposed minima below are floors, not a replacement for complete coverage.

| Suite ID              | Future entry                                                                                       | Proposed minimum complete tests | Primary scope                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `F003:unit`           | `tests/f003/unit/contracts.test.mjs`, `primitives.test.mjs`, `dates.test.mjs`, `versions.test.mjs` | 48                              | A-01–A-14, A-18–A-20; raw/text/object bounds, independent arithmetic/date values  |
| `F003:adapters`       | `tests/f003/integration/adapters.test.mjs`, `intent.test.mjs`, `repair.test.mjs`                   | 12                              | A-04, A-13–A-22, A-28, A-30, A-32; two independently implemented doubles          |
| `F003:errors`         | `tests/f003/unit/errors.test.mjs`, `localization.test.mjs`                                         | 30                              | A-23–A-27; every one of 17 codes and 13 issue keys plus negative/parameter cases  |
| `F003:source-quality` | `tests/f003/integration/source-quality.test.mjs`                                                   | 3                               | Shared typecheck, package lint and prohibited-dependency/API checks; A-29         |
| `F003:runtime`        | `tests/f003/integration/runtime.test.mjs`                                                          | 3                               | Same nonempty standalone fixture pack in Node, Electron and Deno; A-05, A-28–A-29 |

Test argv begins `--test --test-timeout=30000 --test-reporter=tap`, followed by the exact owned entry list. Runtime wrapper uses a specifically declared longer per-test timeout up to 60,000 ms, with suite deadline no more than 300,000 ms. No glob-only enrollment, shell interpolation, empty success, test skip or flaky automatic retries. If implementation needs different floors, revise the reviewed manifest/design with rationale before adoption; never reduce existing F002 minima or disguise a smaller executed set.

Add future scripts `test:f003:unit`, `test:f003:adapters`, `test:f003:errors`, `test:f003:source-quality` and `test:f003:runtime` dispatching each fixed manifest suite through the existing runner. `test:f003` invokes a fixed sequential feature coordinator and fails on any nonpassed/empty suite. Existing `test:unit` and `test:integration` continue to run only their named F002 suites; their success does not imply F003 coverage.

## Source Quality and Trusted Policy Floors

Expand root TypeScript include to shared `.ts`/`.mts` sources while preserving the existing `typecheck` command. Add `tsconfig.shared.json` for ES2022, no emit, strict/erasable syntax, explicit source imports and `types: []`. DOM/Node ambient declarations must not be imported into pure code; standard UTF-8 encoding/decoding is injected through a minimal platform-neutral codec port, implemented with standard runtime TextEncoder/TextDecoder outside the pure core. Small metadata numbers remain safe integers; authoritative numeric values cannot flow through `number` constructors.

The separate source-quality suite runs locked TypeScript and locked Oxlint over `packages/`, `tests/f003/` and `tooling/f003/` using fixed args, and checks pure-source imports/exports for prohibited runtime dependencies and privileged capabilities. A negative fixture demonstrates each check catches an actual violation; a regex-only dependency scan cannot replace module-resolution/type/runtime evidence.

Do not modify existing lint argv positions: F002's base-manifest floor rejects such changes. Additive checks cover the new paths instead. `validateEnrollment` verifies metadata; it does not make the runner execute a suite. Complete both metadata validation and manifest selection/runner/aggregate tests.

All baseline/security manifest entries become mandatory in current selection. Specialist placeholders remain explicit product gaps; do not repurpose them as F003 results. `packages/`, new tooling/config and manifest changes are currently unclassified/native-impact changes, so existing Linux x64, Windows x64 and macOS arm64 desktop checks remain selected. Do not narrow inherited policy to avoid runtime work. Existing shell smoke proves only the shell, not shared-code conformance.

## Runtime Conformance

Use the same independently expected pure fixture pack, exported by a standalone ES2022 module, in:

1. Locked Node 24.21.0; ordinary tests may import erasable TypeScript directly, while runtime comparison executes the common bundle.
2. Locked Electron 44.8.0 using its actual embedded runtime in test-only run-as-Node mode, via a fixed Node wrapper supplying the environment and executable. This does not exercise preload, lifecycle or a sandboxed renderer; F002's real shell smoke runs separately.
3. Proposed Deno 2.9.7, provisioned and checksum-verified during separately authorized setup. Run source checking separately; execute only local bundled code with no network/environment/write permissions and no runtime downloads.

Build through installed Vite with an explicit shared-fixture entry, target ES2022 and no app config/plugins. Allocate a unique owned scratch subtree under `.verification/` with F002 artifact/allocation helpers. No arbitrary output destination, candidate privileged code, globals, credentials or production adapters are needed. The fixture must not read/write/network; only the Node coordinator writes safe results/artifacts. Deno's entry/module loading is local; any extra permission demand is a portability defect rather than a reason to grant broad access.

Each consumer returns fixture pack/version, runtime name/observed version, exact count, passed/failed counts and canonical result digest/bytes. The coordinator checks all consumers executed the same nonzero fixture inventory and independently expected outputs; compare byte equality as well as statuses. Prevent nested child TAP from corrupting parent test counts. Missing runtime, wrong version, zero fixtures, crash, permission request, bundle import failure or timeout fails the required suite with an explicit reason.

The baseline runtime check covers local Node/Electron/Deno; the native review additionally repeats the common Electron fixture probe on each selected declared native target and records the actual embedded Node version. Integrate this probe into the existing desktop harness through a fixed test-only case/entry while preserving existing desktop argv/check IDs and shell expectations. It cannot add a generic execution bridge to the app. Run-as-Node probe and real shell smoke evidence are separately labeled.

## Meaningful Negative Trials

Use owned disposable synthetic fixtures to inject a malformed request, float amount, 39-digit reducible input, invalid denominator, unknown version, unsupported event, forged tenant/actor, revoked action, changed intent, lost response, excess issue payload, missing Arabic key and raw secret/markup parameter. Unit/integration expected values are literal reviewed fixtures or independent mathematics, never computed solely by the tested helpers.

At runner integration level prove that an enrolled F003 assertion failure, missing entry, empty suite, changed registry, prohibited import, missing Deno, stale bundle and unsupported version block the aggregate. Repair in the same future feature proposal and preserve the failed attempt history. Unavailable native/fluent evidence remains explicit; no local synthetic test can satisfy an unavailable hosted result or owner approval.

## Engineering Measurement and Evidence

Proposed validation budgets, to review with the entry profile: p95 bounded maximum-envelope decoding ≤50 ms over 200 runs, p95 one worst-case admitted primitive operation ≤5 ms over 1,000 samples, and each runtime suite ≤300 seconds under existing F002 resource bounds. Measure actual hardware/OS/power mode/runtime and input shape. These are engineering targets, not supported product/service promises; failure requires repair or a reviewed budget revision without weakening exactness/security.

F003 evidence records actual head/base, contract/intent/bounds/error/fixture versions, runtime/tool/OS identities, scenario IDs, executed counts, expected/observed results, failure injection, timings/work counters, safe artifacts, defects and reviewer/date. Agent QA exercises actual current serialization/denial/exactness/retry/error samples and compatibility recovery. Fluent Arabic review, final user approval, merge and release remain separate recorded outcomes.

Recovery preserves original versioned intent and failed evidence; repair/backout repeats affected suites and current QA. Owned generated scratch can be cleaned within F002 cleanup limits; no unrelated profile/process/files may be removed. No customer schema, credentials, hosted service, finance transaction or paid runner is part of this conformance plan.

Implementation observations and current command choices are recorded in [F003 QA](../../../docs/qa/F003.md). The runtime pack now has 53 fixed cases; the mandatory adapter floor is 13 after performance enrollment. This contract remains requirements authority; historical planning language is not an implementation-status claim.
