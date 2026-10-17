# F002 Validation Quickstart

**Status**: Future implementation validation guide. Only the existing-baseline commands below exist today. Planning did not install tools, run the proposed workflow, validate native targets or change service settings.

**Read first**: [plan](plan.md), [CLI contract](contracts/verification-cli.md), [workflow/selection](contracts/workflow-and-selection.md), [evidence/gate](contracts/evidence-and-gate.md), [security/limits](contracts/security-and-limits.md), [adoption](contracts/enforcement-adoption.md).

## Prerequisites and Entry Gate

Before F002 implementation, inspect actual F001 merge into main and obtain authorization for implementation. Preserve unrelated working changes and use the one proposed F002 feature branch. Verify Node 24.21.0/npm 11.19.0 or a deliberately reviewed replacement, complete locked dependencies, exact new tool/action/CLI pins, observed runner images and finite budgets. Current hosted access/settings are inspected at delivery rather than assumed from F001.

Native smoke needs an installed locked Electron binary, a functioning sandbox and a display (Xvfb on headless Linux); Windows/macOS need real native environments. Only synthetic data/test profiles are allowed. No browser download, signing key, production credential, paid runner or customer database is needed. Scanner network or provider metadata outages remain visible unavailable results.

## Existing Baseline Available Now

From repository root, with dependencies already available:

```bash
node --version
npm --version
node tooling/check-governance.mjs
node --test tooling/check-governance.test.mjs
npm run test:launcher
npm run typecheck
npm run build
```

These commands inspect/run existing narrow governance and shell checks. Their success is not F002 CI, native-matrix, encryption, bilingual or product evidence. The current governance checker is F001-specific; do not feed it a future F002 envelope or call exit 0 owner approval.

## Clean Setup After Authorized Implementation

Use a clean disposable checkout of the exact revision. The following future delivery procedure performs dependency/runtime downloads; it is not executed by planning:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:electron
```

Expected: manifest and lock hashes unchanged, actual Node/npm/Electron identities match the reviewed toolchain, platform optional build/lint binaries resolve, and unused native database install/rebuild scripts remain disabled. `setup:electron` is required only for desktop execution; fast baseline jobs need not download its runtime. A missing native binary/checksum mismatch is an error, not permission to use latest or approve all scripts.

Configure verified Gitleaks/actionlint binaries at reviewed fixed paths before scanner execution. Dependency/license scans report their full declared coverage and source/version; no automated dependency repair occurs.

## Local Reproducibility — A-01–A-05

After F002 command implementation, inspect the actual verified comparison base and set the task-specific variable below to that full identity. The replacement text deliberately is not a valid SHA; the verifier must reject it if not replaced.

```bash
F002_BASE_SHA='REPLACE_WITH_VERIFIED_BASE_SHA'
npm run lint
npm run test:unit
npm run test:integration
npm run check:docs
npm run check:security
npm run verify -- --profile baseline --base "$F002_BASE_SHA"
```

Expected: meaningful results for every baseline/security definition, independently observed test/input counts and safe context-bound reports. The baseline profile reports its scoped completion separately from outstanding required desktop targets; it cannot claim full automated readiness. Repeat on a second independent clean checkout/context and compare with hosted execution at the same declared subject/environment.

Use isolated fixture repositories to introduce dependency mismatch, known lint/type/build/broken-reference/launcher defects and empty unit/integration suites. Each affected check must fail for that reason. Restore only owned fixtures; never break working customer data or unrelated changes. Unit/integration fixtures containing deliberate defects remain outside ordinary lint/test discovery, with bounded declared exceptions.

## Desktop Smoke — A-12–A-16

After build and reviewed runtime setup:

```bash
npm run build
npm run test:desktop
```

On Linux with a supported headless display installation:

```bash
xvfb-run -a npm run test:desktop
```

Expected: real built SoloDesk main/renderer opens; heading and “Desktop shell ready” are observed; planned features expand/collapse with correct `aria-expanded`/visibility; unimplemented-feature disclaimer remains. The automation verifies existing actual runtime sandbox/context-isolation/Node-integration preferences and absence of renderer `require`, then exits and removes its owned profile within bounds. This remains baseline shell evidence, not F004 delivery.

Inject launch error, missing display, deadline and leftover-owned-process cases using the harness's reviewed fixtures. They must block with exact failure/unavailable/cleanup reasons. Do not disable the sandbox, bypass CSP or kill unrelated Electron processes. Execute selected Windows/macOS/Linux jobs separately and record actual OS/CPU/image/runtime; a Linux screenshot is not native controls/signing/support certification.

## Aggregate and Evidence Negatives — A-06–A-11

Run the unit/integration gate fixture groups through their enrolled entry points. Independently expected cases include every required-result state, missing producer/evidence, duplicate/conflicting ID, wrong attempt/head/base/tested target, expired/unsafe artifact, skipped required suite, zero counts, policy downgrade and unknown changed path. Expect blocking summaries and nonzero full-aggregate exits. The one complete current expected set passes automated readiness with agent QA/owner approval still pending.

Fixtures validate classification only; they do not prove live provider outcomes. After the workflow exists, use future read-only inspection with the actual observed integer run/attempt/PR identities:

```bash
node tooling/verification/cli.mjs inspect --run-id REPLACE_WITH_RUN_ID --attempt REPLACE_WITH_ATTEMPT --pr REPLACE_WITH_PR_NUMBER --out .verification/inspection-F002/provider-observation.json
```

The final path must be inside a fresh verifier-owned scratch allocation; `inspect` must exclusively allocate/validate `inspection-F002` before writing and reject an existing directory owned by a different run. Use `--help` for the implementation's validated path conventions. Expected output compares actual current proposal head/base, recorded tested merge subject, workflow and job identities; ambiguous/raw provider SHA differences remain explicit. Provider credentials are supplied only through approved authentication for this separate read-only invocation, never as command arguments or record data.

## Trust, Bounds and Outage — A-17–A-22

Use reviewed synthetic sentinel fixtures and a fork/untrusted execution context. Verify protected credentials/write/signing/deployment actions are unavailable and tokens are not passed into candidate subprocesses. Inspect allowlisted safe artifacts; attempt traversal/symlink/oversize/raw-sensitive output and confirm rejection/redaction with visible evidence gaps.

Initial cache reuse is disabled; unsupported or poisoned-cache requests must be rejected. Confirm two clean setups never reuse compiled/native/results/report content across contexts. Simulate scanner network failure, quota exhaustion, timeout and resource-bound breaches without buying capacity. Each required unavailable/failed result blocks.

Run two revisions of the same primary proposal and observe cancellation of the older after provider acknowledgement within the declared bound. An unrelated existing control proposal/run must continue; do not create a second primary F002 proposal. Record actual durations/owned-process cleanup and any provider inability to accept cancellation. Zero automatic retries; manual retries retain every attempt and unresolved flakiness.

## Actual Primary-PR Journey — A-23–A-27

After separately authorized publication of the one primary F002 proposal:

1. Record clean current hosted/native outcomes and safe evidence for the exact proposal/head/base/tested context.
2. Introduce a controlled failing applicable assertion in that same proposal; verify the actual hosted aggregate blocks, then repair it.
3. Introduce a controlled missing mandatory producer report/artifact; verify the actual hosted aggregate blocks, then repair it.
4. Inspect current provider run/attempt/jobs/workflow blob and artifact associations for final repaired success. Complete actual agent QA, cancellation/isolation trials and all required target observations.
5. Prepare `docs/features/F002.md`, `docs/qa/F002.md` and the separately versioned sidecar. Map all 27 acceptance scenarios and 11 outcomes; distinguish real/synthetic/not-run/unavailable and preserve failed history.
6. Freeze the final review context and present the concrete primary PR with actual findings/limits/recovery. Await explicit current final user approval; green checks and agent QA do not merge it.
7. Inspect actual merge only after authorization and all existing mandatory constraints. Prepare/activate/verify remote enforcement solely under the [adoption contract](contracts/enforcement-adoption.md) and separate authorization. Report prepared versus active versus unavailable precisely.

If transcription of QA evidence changes the head/base, apply F001 impact/currentness rules and repeat affected checks/QA; never relabel old observed SHAs. Required agent/owner sources stay separate from the automated evidence producer to avoid circular approval/digest requirements.

## Acceptance Record and Recovery

Record commands/procedures, safe expected/observed outputs, counts, exact identities, environment/tool versions, reviewer/date, elapsed/bytes, artifact availability and defects per [data model](data-model.md). Actual provider/native results cannot be replaced by a synthetic record or old baseline check.

On failure, preserve evidence, identify the failed dependency/subject and repair in the same open feature PR. Re-run affected checks and current agent/owner review. Only delete owned generated scratch. After merge, use linked maintenance work; no silent history rewrite, disabled protection or release promise. A required remote result that cannot run remains blocked unless the established policy genuinely permits separately executed equivalent evidence without bypassing service constraints.
