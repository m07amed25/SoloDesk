# F003 Validation Quickstart

**Status**: Implemented verification commands, 2026-10-18. Actual results and remaining delivery gates are in [QA](../../docs/qa/F003.md). The pure packages and synthetic conformance are implemented; fluent Arabic approval, final owner approval, merge and release remain separate.

**Read first**: [plan](plan.md), [data model](data-model.md), [primitives/bounds](contracts/primitives-and-bounds.md), [messages](contracts/commands-and-results.md), [intent/evolution](contracts/compatibility-and-intent.md), [authority](contracts/ports-and-authority.md), [errors](contracts/errors-and-localization.md) and [enrollment](contracts/conformance-and-enrollment.md).

## 1. Existing Documentation Validation

From the repository root using the existing Node/dependency installation:

```bash
node --version
npm --version
npm run check:docs
node tooling/check-governance.mjs
git diff --check
```

Expected: current Node/npm are recorded; documentation links/IDs/anchors and governance policy are valid; no whitespace defects. These commands do not prove F003 arithmetic, decoding, authorization, Arabic messages, runtime conformance or owner approval. Do not report future suite success from a documentation pass.

## 2. Implementation Entry and Setup

Before changing source, inspect actual F002 merge/current inherited defects, establish implementation authority, preserve unrelated working edits and use the one proposed F003 feature branch. Record the reviewed bounds/version/runtime proposal and approved adoption state; technical proposals here do not close Q-03, Q-04, Q-05, Q-06, Q-07 or Q-11.

Use a disposable clean checkout of the exact reviewed revision, with locked Node 24.21.0/npm 11.19.0 or a reviewed explicit replacement. The existing clean setup procedure is:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:electron
npm run setup:f003
```

Setup performs explicit downloads. Verify unchanged manifest/lock, expected locked Electron version and no approval of unused native database scripts. `setup:f003` provisions Deno 2.9.7 on Linux x64 from the pinned official archive and verifies archive/binary SHA-256. Other setup targets fail explicitly. Node/Deno baseline runs on Linux; embedded Electron probes run on every selected native target. A missing/mismatched runtime blocks its conformance claim; never download latest during tests or substitute a real cloud deployment.

The runtime toolchain record retains exact executable identity/version/asset digest and supported consumer list. No production keys, customer data, signing credentials, service account or paid runner is needed. Test fixtures and synthetic workspace IDs stay isolated.

## 3. Required Suites

Use the fixed scripts and manifest definitions described in [enrollment](contracts/conformance-and-enrollment.md):

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:f003:source-quality
npm run test:f003:unit
npm run test:f003:adapters
npm run test:f003:errors
npm run test:f003:runtime
npm run test:f003
npm run check:docs
```

The coordinator runs all five F003 suites and fails missing, empty, skipped or incomplete results. Existing unit/integration wrappers retain their F002 scope. Floors are 48 unit, 13 adapter/performance, 30 catalogue, three source-quality and three runtime tests; current counts are recorded in QA.

Run real verification against the actual inspected full comparison SHA, not an arbitrary branch label:

```bash
F003_BASE_SHA='c96d9b1600de9900d18ee032a7c5b082cd9d6573'
npm run verify -- --profile baseline --base "$F003_BASE_SHA"
```

Expected: baseline includes the fixed F003 checks and reports exact counts/outcomes/context. Baseline scope completion is separate from full readiness/native targets, agent QA, fluent review and owner approval. Existing security checks remain required; network/scanner failures are visible unavailable results, not waivers.

## 4. Exact Values and Input Boundaries — A-01–A-12

Use the committed independent fixture pack, with input/expected values visible to the reviewer:

- Round-trip complete requests/results with Arabic text, exact values, ID kinds and stage metadata. Unknown operation/field/type/null/default/version errors must fail before synthetic effect.
- Confirm 0.1+0.2 gives exactly 0.3; 1/8 converts exactly to 0.125; 1/3 remains rational and finite conversion returns nonrepresentable.
- Confirm 9,007,199,254,740,993+1 gives 9,007,199,254,740,994; numeric `number` money input fails.
- Check synthetic 0/2/3-place profiles, 123 minor units→1.23 at exponent 2, unlike currencies/profiles, negative ordinary amounts and signed adjustments.
- Check 59+61→120 seconds, fractional/negative seconds rejected, maximum and maximum+1, independent constructor/intermediate/output overflow cases and reducible 39-digit inputs.
- Check leap date validity, date-only across timezone differences, UTC instants, unqualified/overprecise/leap-second timestamps and original-offset metadata.
- Review normalized `١٢٣٫٤٥`/`123.45` equivalence at the declared input adapter and explicit ambiguity handling for `1,234`; shared wire receivers never guess localized numeric syntax.

Exercise each profile dimension at/beyond its ceiling while other constraints permit the at-limit input: 262,144 bytes, depth 16, 4,096 nodes, 64 members, 1,000 array elements, 4,096 Unicode scalars, 32 issues, operand/scale/range/intermediate/work bounds. Include malformed UTF-8, escaped duplicate names, lone surrogates, unsafe object properties and diagnostic expansion. Confirm bounded work counters and no echo of rejected raw content.

## 5. Scope, Retry and Recovery — A-13–A-22, A-28–A-32

Run identical scenario inputs against independently implemented map and journal doubles:

1. Use workspace A/B, verified actors and project/action contexts. Explicit tenant mismatch fails before lookup; an opaque B-owned ID claimed as A fails actual resolution; forged actor/tag/cached-role claims cannot authorize execution.
2. Missing and inaccessible resources produce safe equivalent public detail. Inspect effect counters and protected receipt lookups: no denied call reveals names/counts or increments effects.
3. Retry identical intent with a new request correlation ID: same receipt, one effect. Reuse its operation ID with changed payload/revision/profile/device-bound meaning: rejection, zero second effects. Retrying an already committed identical intent does not fail solely because its old expected revision has since advanced.
4. Revoke current access before replay or receipt disclosure: deny without restoring privilege from old client state. Changed revision on a new operation yields conflict without overwrite.
5. Simulate response loss and timeout/cancellation after possible dispatch. Preserve original intent and classify unknown; resolve the existing operation before any new effect. A known-before-dispatch cancellation may assert nonexecution only with evidence.
6. Submit unknown protocol/schema/event versions; stop before application/progress advance and preserve original pending fixture. Try compatible and incompatible repair/backout; retain original version/intent/operation identity or use explicit forward repair.

These doubles demonstrate conformance only. They do not prove real tenant isolation, transaction concurrency, durable receipts/outbox, encryption, financial uniqueness or backup recovery.

## 6. English/Arabic Error Review — A-23–A-27

Enumerate all 17 public codes and 13 issue keys. Verify complete English/Arabic definitions, identical parameter names, nonempty messages, safe field paths, correct recovery kinds and preserved valid inputs. Inject missing initial translation, unknown future code, invalid/extra parameter, synthetic secret/private field, raw exception and malicious markup. Missing initial entries fail; unknown codes use the safe fallback without blind retry or private text.

Run `node tooling/f003/error-preview.mjs` to generate the inert synthetic preview; serve only its printed owned directory on loopback. Review both directions with long Arabic/Latin text, combining marks and mixed diagnostic references; identifiers retain exact values and use rendering isolation. Preserve unknown outcome meaning in both languages. Record actual agent observations and fluent Arabic review separately; no automated comparison is fluent approval or full production accessibility proof.

## 7. Runtime, Native and Resource Proof

The fixed wrapper builds one owned ES2022 fixture module and runs its identical inventory in Node, actual Electron embedded runtime and pinned Deno, with no external I/O permissions. Record exact runtime/OS/architecture, nonzero fixture count, canonical outcomes and observed work/timing. Deno source checking and absence of Node/UI/native imports are separate required checks. Missing/version-mismatched runtime, permission request, stale bundle or child timeout fails visibly.

After reviewed setup, existing shell checks remain independently runnable:

```bash
npm run build
npm run test:desktop
```

On a supported Linux headless display:

```bash
xvfb-run -a npm run test:desktop
```

The existing shell smoke is not F003 conformance. The desktop harness also runs the fixed pure Electron fixture probe on each selected Linux x64, Windows x64 and macOS arm64 target while retaining the original shell assertions/check IDs. It introduces no generic production IPC method or security bypass. Record shell/native controls evidence and run-as-Node pure-runtime evidence separately.

Measure proposed decoding/arithmetic budgets on declared actual hardware with the prescribed sample counts. Excess resource use is a defect or requires reviewed engineering-budget revision; never loosen exactness, diagnostics/privacy or authority to meet a timing target. F002's outer timeout/cleanup/artifact limits still apply.

## 8. Proposal QA and Delivery

1. Run a controlled applicable F003 assertion failure and missing/empty suite in the same primary feature proposal; observe actual aggregation blocks. Repair and retain history. A metadata-only enrollment test is insufficient.
2. Verify missing Deno, illegal dependency and changed canonical intent are visible failures; restore only owned synthetic fixtures and rerun current checks.
3. Execute actual contract/authority/exactness/version/error/repair scenarios and native runtime probes; record all A-01–A-32, FR-001–FR-034 and SC-001–SC-010 with expected/observed evidence or explicit blockers.
4. Write `docs/features/F003.md`, `docs/qa/F003.md`, affected architecture/contract/coverage guidance and recovery notes. Record exact head/base, tool/OS/runtime, adopted bounds/schema/intent/message versions, fixture identities/counts, redacted artifacts, failed history, timing/work, defects, reviewer/date and remaining inherited limitations.
5. Freeze current review context and present the one primary PR with real automated/agent/native/fluent results and remaining limitations for the user's final approval. Green automation is not approval; subsequent material changes invalidate affected evidence/decision until repeated.
6. Record actual merge only after approval and all applicable constraints; release remains separate. Do not close future storage/sync/auth/finance/security/distribution gates from foundational contract tests.

## 9. Failure and Backout

Preserve original input/versioned intent and observed failures, identify the owning contract/adapter and repair the same open proposal. Rerun affected checks/QA and current review. Only clean owned scratch/processes under existing limits. If an old reader cannot interpret pending data, stop incompatible writes and use the compatibility contract's forward repair; never silently rewrite intent, recreate empty data, remove protection or claim a skipped result passed.
