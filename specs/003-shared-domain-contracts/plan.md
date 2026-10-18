# Implementation Plan: F003 — Shared Typed Commands and Domain Primitives

**Branch**: proposed `feat/f003-shared-typed-commands-and-domain-primitives` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-shared-domain-contracts/spec.md`.

**Status**: Phase 0 research and Phase 1 design complete for review; documentation only. No F003 implementation, dependencies, branch, PR, runtime test, bound/version approval or release is claimed.

**Setup result**: The active feature pointer selected this directory. `setup-plan.sh --json` resolved the correct spec/plan paths and returned `BRANCH=003-shared-domain-contracts` as its directory-name fallback. Actual Git branch inspection returned `main`; no switch was made. The proposed feature branch above follows the repository's explicit naming policy.

**Local prerequisite inspection**: Current local head is `c96d9b1600de9900d18ee032a7c5b082cd9d6573` (merged F002 security follow-up PR #3). `git show` identifies F002 merge `196555cc8fd05e9f8c5a5cf1d59dd38634440218`, and `git merge-base --is-ancestor` confirms it is an ancestor of this checkout. This verifies local prerequisite ancestry; current remote settings, retained F002 fork/control evidence and feature approval were not reverified or changed.

## Summary

F003 establishes shared versioned requests/results, runtime-tagged IDs, exact money/decimal/rational/seconds/date values, bounded validation, bilingual safe errors and narrow adapter-facing contracts. It supports NFR-001, NFR-015 and PLT-008 without implementing real business commands, privileged bridges, storage, auth, synchronization or financial calculation policy.

Use three small private TypeScript source modules under `packages/`, bounded BigInt-backed exact arithmetic with string wire values, a closed operation registry with duplicate-aware input decoding, explicit protocol/payload/event version 1, proposed `F003-bounds-v1`, and paired error definitions. Two independently written synthetic adapters demonstrate scope/revision/receipt semantics. One pure fixture bundle runs in Node, actual locked Electron and proposed Deno 2.9.7. Add actual F003 verification enrollment rather than assuming current shell checks cover new code.

All exact numerical limits and version identifiers are concrete proposals in this plan. Their adoption must be recorded through the existing F003 entry review; the user has requested planning, not implementation approval. Research questions are resolved; existing product decisions remain open with their owning features.

## Technical Context

**Language/Version**: Installed manifest/lock foundation: TypeScript 7.0.2, ES2022 ESM, Node 24.21.0 and npm 11.19.0 observed locally. Shared code uses erasable strict TypeScript and explicit relative `.ts` imports; no enums, parameter properties, platform aliases or ambient Node authority.

**Primary Dependencies**: Native BigInt and standard bounded plain-data operations; installed Vite 8.3.4 for a standalone ES2022 fixture bundle; installed Oxlint 1.88.0 and Node test runner for verification. Locked Electron 44.8.0 supplies the desktop runtime probe; React/Tailwind/shadcn/Forge remain the existing application stack and are not imported by shared rules. No new runtime package, schema framework, decimal library or package manager is selected.

**Storage**: No production database, filesystem persistence, schema or migration. Two test-only in-memory receipt/resource implementations; safe owned verification scratch/artifacts under existing F002 rules. Durable storage, encryption and real receipts are later-feature work.

**Testing**: Fixed Node `node:test`/strict-assert entry files, independent exact-value and canonical-byte fixtures, bounded generated arithmetic/invalid-input cases with recorded seeds, two adapter doubles, paired-language catalogue checks, static/type dependency checks and runtime conformance. Existing F002 baseline/security/desktop checks remain intact and applicable. No financial policy fixture is considered approved by generated mathematics.

**Target Platform**: Pure shared modules for desktop and future service consumers. Verify identical fixture bundle in Node, locked Electron embedded runtime and pinned proposed Deno 2.9.7 with no external permissions. Repeat Electron conformance on existing selected Linux x64, Windows x64 and macOS arm64 verification targets; these targets do not close Q-11 or certify supported distribution. Deno is not installed locally and no runtime execution/setup is claimed by this planning task.

**Project Type**: Foundational internal TypeScript library/contracts within the existing Electron application repository. No new UI, backend service, portal or publishable SDK.

**Performance Goals**: Proposed measured engineering targets: p95 ≤50 ms to decode/validate a maximum allowed envelope over 200 runs, p95 ≤5 ms per worst-case admitted primitive operation over 1,000 samples, and runtime-suite completion within 300 seconds. Record actual hardware/OS/power/runtime/input and work counters; targets are not observed results or product SLAs.

**Constraints**: 256 KiB envelopes, finite container/value/text/error bounds, ≤38-digit input exact values, decimal scale≤18, ≤128-digit intermediates and ≤1,024 GCD steps. Closed exact supported-version lists, canonical text numerics, no binary-float authority, no secret/private diagnostics, current trusted tenant/action checks, and no arbitrary privileged APIs. [Full profile](contracts/primitives-and-bounds.md) supplies units and boundary semantics. All eight constitutional principles remain binding.

**Scale/Scope**: One feature/primary PR; six stories, 32 acceptance scenarios, 34 requirements and ten success criteria. Three private modules, six contract documents, two synthetic adapters and five additive verification suites. No user/tenant/service capacity, financial market or timer-entry maximum is established.

## Constitution Check

Gate review applies to the authorized planning work first, then to the proposed implementation. No exception is requested. An unexecuted implementation gate is not a planning violation if its responsibility and blocking consequence remain explicit.

| Principle                         | Before Phase 0                                                                | After Phase 1 design / future implementation gate                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Scope and traceability        | PASS: only active F003 planning; parent IDs and existing decisions retained   | PASS: artifacts/FR/A/SC traceability, one proposed PR and no implementation authority inferred; entry review records adoption                        |
| II — Platform and trust           | PASS: installed stack retained; shared rules independent of UI/native/storage | PASS: tagged IDs, closed validation, pure modules, narrow trusted ports; actual F004 sender/preload enforcement remains deferred                     |
| III — Offline/cloud authority     | PASS: offline semantics specified without durable-save claims                 | PASS: stages/receipt intent/unknown outcomes explicit; later local/outbox/service adapters still must prove durability and current authorization     |
| IV — Exact immutable finance      | PASS: exact values required; Q-03 remains open                                | PASS: bounded checked BigInt core, no rounding/FX/tax/minimum policy; no invoice/posting/source ownership implementation or mutable accepted history |
| V — Fail-closed security          | PASS: no credentials/customer data/privileged services                        | PASS: current trusted resolution, public privacy/error bounds and no arbitrary ports; fake adapters cannot certify auth/encryption                   |
| VI — English/Arabic/accessibility | PASS: paired error meaning required                                           | PASS: complete draft catalogue and inert bidi-aware test review; future fluent/native/UI evidence explicitly required, never claimed here            |
| VII — Compatible recovery         | PASS: no data migrations authorized                                           | PASS: version allowlists, original pending intent preserved, supported-reader repair/backout tests; real encrypted migrations/retention deferred     |
| VIII — Evidence before completion | PASS: specs/plans separate from runtime results                               | PASS: real suite enrollment/independent fixtures, current QA and owner decision gates; no skipped/native/fluent result represented as pass           |

**Planning gate result**: PASS before research and PASS after design. No unresolved technical clarification or unjustified violation. **Implementation entry remains conditional** on actual F002 prerequisite review, no blocking inherited defect, existing authorization for the proposed implementation, and reviewed bounds/version adoption. The root plan records F002 merged but remaining fork/control evidence unexecuted; planning does not independently reverify remote outcomes or close those gaps.

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-domain-contracts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── commands-and-results.md
    ├── primitives-and-bounds.md
    ├── compatibility-and-intent.md
    ├── ports-and-authority.md
    ├── errors-and-localization.md
    └── conformance-and-enrollment.md
```

`tasks.md` is a later `$speckit-tasks` output and is not generated by this invocation. Feature guidance and observed QA files are future implementation deliverables, not fabricated here.

### Source Code (repository root)

The following is a concrete future layout, not files created by planning:

```text
packages/
├── domain/
│   ├── package.json                 # private ESM marker, no independent dependencies
│   └── src/
│       ├── ids.ts
│       ├── integers.ts
│       ├── decimals.ts
│       ├── rationals.ts
│       ├── money.ts
│       ├── seconds.ts
│       └── dates.ts
├── contracts/
│   ├── package.json
│   └── src/
│       ├── bounds.ts
│       ├── validation.ts
│       ├── codec.ts
│       ├── registry.ts
│       ├── envelopes.ts
│       ├── errors.ts
│       ├── intent.ts
│       ├── versions.ts
│       └── ports.ts
└── localization/
    ├── package.json
    └── src/
        ├── en.ts
        ├── ar.ts
        └── errors.ts
tests/f003/
├── fixtures/                       # independent literal/seeded expected values and bytes
├── unit/                           # contracts, primitives, dates, versions, errors, localization
├── integration/                    # adapters, intent, repair, source-quality, runtime
├── doubles/                        # independent map and journal implementations
└── runtime/                        # standalone pure conformance entry and fixtures
tooling/f003/
├── build.mjs                       # fixed standalone bundle and owned scratch
├── runtime-probe.mjs               # fixed Node/Electron/Deno coordinator
└── verify.mjs                      # fixed F003-suite coordinator
tsconfig.shared.json                # pure shared sources, no Node/DOM ambient authority
verification/suites.v1.json          # existing manifest, additive F003 entries only
app/main/ and app/renderer/          # existing shell retained
```

**Structure Decision**: Keep root dependency/toolchain ownership and application configs. Use source-module private ESM markers, not a workspace/publishing migration. Domain imports only its pure values; contracts imports domain; localization imports public error types. Test/tooling composition may import F002 helpers and standard runtime codecs; those dependencies cannot flow into shared modules. Cross-package relative imports are explicit and checked. A narrow UTF-8 codec port injects standard runtime encoding/decoding without exposing ambient Node/DOM APIs to the pure core.

Root `tsconfig.json` must include shared sources. Existing typecheck argv stays fixed; an additive F003 quality suite checks the isolated shared config and lint paths. Existing lint argv cannot be widened under F002's base-manifest floor. Full enrollment obligations are in [conformance](contracts/conformance-and-enrollment.md).

## Phase 0 — Research Output

[research.md](research.md) closes 12 design decisions with rationale, alternatives and primary-source references. The research agents inspected exact arithmetic/resource bounds and protocol/enrollment behavior. The selected approach avoids new runtime dependencies, real infrastructure, hosted-provider assumptions and unresolved financial policy.

Key decisions are exact textual boundary values backed by bounded BigInt; explicit constructors versus strict canonical wire admission; duplicate-aware bounded parsing; runtime kind tags plus trusted resource resolution; semantic intent equality instead of raw request equality; stage-specific results; all 17 project error codes and 13 issue keys with paired messages; and additive real F003 suites. Proposed Deno compatibility is independent from any future hosted runtime.

## Phase 1 — Design Output

| Artifact                                                          | Review purpose                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [data-model.md](data-model.md)                                    | Fields, relationships, readonly values, result transitions, privacy and absence of customer schema/migrations |
| [commands/results](contracts/commands-and-results.md)             | Decoder pipeline, tagged IDs, request/result/event shapes and synthetic-only registry                         |
| [primitives/bounds](contracts/primitives-and-bounds.md)           | Concrete proposed limits, exact arithmetic/normalization, dates and independent expectations                  |
| [compatibility/intent](contracts/compatibility-and-intent.md)     | Initial supported versions, intent canonical bytes, retry processing order and compatible repair              |
| [ports/authority](contracts/ports-and-authority.md)               | Trusted context, current reference/grant resolution, narrow effect obligations and two independent doubles    |
| [errors/localization](contracts/errors-and-localization.md)       | 17 public codes, 13 field keys, paired draft messages, safe parameters, fallback and recovery                 |
| [conformance/enrollment](contracts/conformance-and-enrollment.md) | Actual F002 integration, future check identities, runtime probes, resource budgets and evidence               |
| [quickstart.md](quickstart.md)                                    | Existing runnable documentation checks and future authorized setup/validation/QA procedures                   |

Post-design constitution review passes as recorded above. No new customer persistence, real command endpoint or interface implementation is implied by a contract document.

## Implementation Sequence for Later Task Generation

These are ordered work packages within one future F003 PR, not permission to execute them now or separate PRs.

1. **Entry and contract adoption**: Reinspect actual F002 merge and inherited evidence/defects, preserve unrelated changes, confirm authorized scope, record approved/proposed state of bounds/version/runtime profile, and select the one branch. Publish the reviewed contract catalogue/version interpretation before consumers depend on it.
2. **Shared coverage foundation**: Add private source module/config skeletons and isolated type checks, explicit meaningful F003 suite entries/wrappers, safe fixture allocation and failure reporting. Prove type/lint/empty/missing-suite negatives are caught; retain F002 floor. No no-op passing stubs.
3. **Exact primitives and identities**: Implement tagged IDs, exact integer/decimal/rational/money/second/date constructors and checked operations. Author independent expected values before/alongside code, including input/intermediate/output limits, unit/sign/precision incompatibility, normalization and date boundaries.
4. **Closed transport contracts**: Implement bounded UTF-8/token/duplicate-aware decoding, schema-owned validators, immutable values, registry/catalogue, request/result/event alternatives and supported-version handling. Verify no silent dropping, no canonical drift and no illegal result metadata. Codec review is a security-sensitive gate.
5. **Authority and retry conformance**: Define narrow port types, semantic intent projection/canonical bytes, current-access processing order and two independent synthetic adapter mechanisms. Exercise stale grants, actual foreign references, same/different intent, response loss, cancellation certainty, revision conflict and compatible repair.
6. **Bilingual public failures**: Implement the paired catalogue, parameter validation, bounded diagnostics and safe fallback. Review inert English/Arabic synthetic messages and mixed IDs; record fluent Arabic review status separately. No production screen is needed.
7. **Runtime and integrated evidence**: Build/execute common conformance bundle in Node/Electron/Deno, repeat selected native Electron probes and existing shell smoke, enforce runtime/version/count/work bounds, run controlled failures through real F002 aggregation, and repair current proposal defects. No real service calls/credentials/customer data.
8. **Feature guidance and owner review**: Write F003 feature/QA guidance, linked contracts/coverage/compatibility/runbook updates, actual automated/agent/fluent/native outcomes and unresolved limits. Freeze current reviewed head/base and present the one concrete primary PR for final user approval. Merge/release require their own existing gates and actual authorization/outcomes.

After shared coverage/primitives are settled, error catalogue drafting and primitive/codec fixture authoring can proceed independently with separate file ownership. Integrate all through the same feature branch/PR. Do not split foundation/model/UI/tests into separate phase PRs or use concurrency to bypass prerequisites.

## Verification and Requirement Coverage

| Requirement group | Acceptance                              | Main planned proof                                                                                           | Success criteria      |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| FR-001–FR-006     | A-01–A-05, A-18–A-19, A-28–A-29         | Closed registry/round-trip, all raw/object bounds, invalid/duplicate/unsupported cases, pure runtime bytes   | SC-001–SC-005, SC-010 |
| FR-007–FR-010     | A-04, A-13–A-17                         | Runtime kind substitutions, two-tenant actual lookup, revoked/action denial, private receipt/error negatives | SC-002, SC-004        |
| FR-011–FR-017     | A-06–A-12                               | Literal independent mathematics, 0/2/3 profiles, overflow/intermediate work/date/locale fixtures             | SC-003–SC-005         |
| FR-018–FR-024     | A-18–A-22, A-30, A-32                   | Exact version lists, canonical intent goldens, same receipt/changed reuse, unknown and repair transitions    | SC-006, SC-009        |
| FR-025–FR-028     | A-23–A-27                               | 17-code/13-key catalogue, parameter parity, bounded redaction/fallback, inert bidi and fluent review         | SC-007–SC-008         |
| FR-029–FR-031     | A-28–A-30                               | Module/type dependency review, independent adapters and three actual runtime consumers                       | SC-004, SC-010        |
| FR-032–FR-034     | A-03, A-19, A-21, A-23, A-28, A-31–A-32 | Current docs/entry/version records, real aggregate failure/repair, actual QA, repair and separate approval   | SC-001, SC-009–SC-010 |

The test set is nonempty and independently expected. Bounded generated tests retain seeds and independent algebraic properties; they cannot approve financial policy or replace literal examples. Every selected required check or environment has actual evidence or a blocking gap. All native/Arabic/security/finance/sync categories are separately scoped; synthetic conformance never claims complete future product behavior.

## Risks, Adoption and Backout

| Risk                                           | Concrete mitigation / blocking consequence                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Incorrect exact arithmetic or unbounded growth | Preflight/input/output/work ceilings, independent literal and property fixtures; any silent rounding or overflow blocks adoption                                               |
| Decoder ambiguity/duplicate escape/parser bug  | One bounded token path, decoded-key duplicate tests, malformed corpus, own-property rules and explicit review; inability to prove safety blocks rather than weakens validation |
| Tags mistaken for authentication               | Trusted resource/current-action ports, negative resolver tests and distinct validated/authorized types; no actual permission claim from fixtures                               |
| Retry changes an accepted effect               | Versioned semantic intent including revision/policy/occurrence, current access before receipt, identical receipt before stale-revision rejection; unknown reconciles           |
| New code invisible to verification             | Add shared include/isolated config and fixed mandatory F003 checks; validate actual aggregation, not enrollment metadata alone                                                 |
| Runtime probe confused with native security    | Same pure bundle plus separately labeled real shell smoke/native targets; no IPC, sandbox or signing certification inferred                                                    |
| Draft Arabic assumed approved                  | Automated parity plus actual fluent review/agent observations; missing fluent evidence remains explicit                                                                        |
| New bounds/version treated as confirmed policy | Entry record distinguishes proposal/adoption, technical ceilings from Q policies and no real market/profile promise                                                            |
| Backout loses pending data                     | Keep original contract/intent, verify supported readers; otherwise stop writes and use forward repair; no silent queued-data rewrite                                           |

No database migration is needed for F003 itself. Consumer adoption is gated by the reviewed catalogue, compatible supported version and current tests. Backout may remove unused new library wiring if no pending consumer requires it; after persistence exists, later owners must use compatibility/forward repair rules. Restore only owned generated artifacts; never remove customer data or change remote policy/protection as recovery.

## Planning Validation and Next Phase

This invocation runs documentation/governance consistency, local link/anchor/ID/traceability checks and whitespace checks only. It does not execute the future conformance suites, install Deno, approve the proposed limits or produce F003 runtime QA. Before/after hook checks find `.specify/extensions.yml` absent; no hooks dispatch.

Observed documentation validation: repository checker inspected 103 Markdown files and 1,539 local references with zero findings; the focused feature/root-plan check inspected 13 files and 687 references with zero findings. Governance policy validation and `git diff --check` passed. Structural review verified all 12 feature artifacts, six contracts, full 34-requirement traceability, all 32 scenario/ten success-criterion references, mandatory template order, no unresolved clarification/template markers, the active F003 pointer and absence of generated tasks. These are planning checks, not runtime feature acceptance.

Planning-phase handoff was `$speckit-tasks` for dependency-ordered executable work, followed by consistency analysis as requested. Task generation must retain the entry gate, concrete proposals, all 34 requirements, actual F002 enrollment and owner-review separation. The planning invocation ended after Phase 1 design.

Task-generation follow-up (2026-10-18): [tasks.md](tasks.md) now contains 104 unchecked tasks across setup, foundation, six user stories and cross-cutting delivery. All 34 requirements/32 scenarios/ten outcomes are mapped; 22 model field/constraint entries are quoted in their tasks. Ten dependency-ready parallel batches contain 20 tasks. Next workflow is `$speckit-analyze` when requested; no implementation/runtime setup, PR, owner approval or merge was executed by task generation.

## Complexity Tracking

No constitutional violations or exception requests. Three private modules, one limited decoder and independent conformance doubles are the minimum selected separation for exact rules, portable boundary validation and user-safe errors. A workspace migration, new runtime dependency, cloud service, production screen or generalized execution framework would add unrelated scope and is excluded.
