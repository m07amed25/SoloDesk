# F003 Research and Decisions

**Date**: 2026-10-18. **Status**: design decisions and proposed entry profile; no implementation or owner approval claimed. Read [specification](spec.md) and [plan](plan.md). Two research agents reviewed primitives/bounds and protocol/verification integration; the specifying agent consolidated their findings.

## Research Closure

| Planning unknown                               | Resolution                                                                                           | Authoritative design                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Shared code layout and dependency direction    | Three small private source modules; no workspace migration or new runtime dependency                 | R-01, R-02                                                   |
| Exact numbers and bounded computation          | Checked BigInt-backed integers/decimals/ratios; exact strings at boundaries                          | R-03, [primitives](contracts/primitives-and-bounds.md)       |
| Finite input/numeric bounds                    | Concrete proposed F003-bounds-v1 profile with approval before adoption                               | R-04, [bounds](contracts/primitives-and-bounds.md)           |
| Runtime validation and ambiguous serialization | Closed registry-driven runtime validators plus bounded duplicate-aware text decoder                  | R-05, [messages](contracts/commands-and-results.md)          |
| Versions, intent identity and compatibility    | Protocol/payload version 1; explicit allowlist; canonical semantic intent, no automatic downgrade    | R-06, [evolution](contracts/compatibility-and-intent.md)     |
| ID kinds and trusted authority                 | Runtime tags plus opaque UUIDv4 values; ownership/current grants resolved separately                 | R-07, [ports](contracts/ports-and-authority.md)              |
| Bilingual errors and parameter privacy         | Closed paired catalogue with typed safe parameters and explicit recovery discriminants               | R-08, [errors](contracts/errors-and-localization.md)         |
| Service/desktop portability                    | Same pure bundle in Node, locked Electron and proposed Deno 2.9.7 fixture runtime                    | R-09, [conformance](contracts/conformance-and-enrollment.md) |
| Actual F002 enrollment                         | Add fixed mandatory F003 baseline suites; preserve existing argv floors                              | R-10, [enrollment](contracts/conformance-and-enrollment.md)  |
| Dates, repair and approval                     | Pure explicit Gregorian/UTC rules; preserve original pending intent; separate planning from adoption | R-11, R-12                                                   |

No unresolved technical design question remains. Approval of the proposed bounds/version profile and authorization for implementation are future entry conditions, not unanswered research questions. Q-01–Q-16 retain their existing status.

## R-01 — Repository Integration Without a Tooling Migration

**Decision**: Plan `packages/domain/`, `packages/contracts/` and `packages/localization/` as private source modules with explicit relative imports. Add local module markers where required; retain the single root dependency lock and current Forge/Vite application. Do not create a monorepo manager or publish packages.

**Rationale**: The inspected tree has no shared packages. Root `tsconfig.json` includes only Vite/app files, and current lint argv includes only app/tooling/verification paths. Both need explicit future coverage. The proposed layout matches [repository architecture](../../docs/architecture/project-structure.md) while leaving actual adapters and application services to later owners.

**Alternatives considered**: A new workspace manager adds unrelated build/release scope; placing everything under renderer couples trusted consumers to UI; a fourth application package is premature for contracts plus synthetic doubles.

## R-02 — Erasable TypeScript and Runtime Validation

**Decision**: Use installed TypeScript 7.0.2, ES2022 ESM, strict typing, explicit `.ts` relative source imports, type-only imports and erasable syntax. A dedicated shared-code typecheck config uses ES2022 plus narrowly needed standard APIs, `types: []`, no Node/DOM ambient authority, `allowImportingTsExtensions`, `noEmit`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. Pure code uses injected ports rather than process/environment APIs.

**Rationale**: Static assertions do not perform runtime validation; use `unknown` at all public decoders and constructors. TypeScript documents that assertions are removed during compilation. Native Node type stripping does not replace type checking and has syntax/config limitations, so the plan runs both checking and execution. See [TypeScript assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions), [Node 24 TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html) and [Deno TypeScript](https://docs.deno.com/runtime/fundamentals/typescript/).

**Alternatives considered**: Relying on branded types alone cannot protect runtime input; transpiler-only checking misses type defects; broad Node ambient types would allow accidental platform imports in shared code.

## R-03 — Exact Numeric Core

**Decision**: Use bounded native BigInt for integer coefficients, ratios, money minor units, seconds and revisions internally; use exact decimal text externally. Decimal values carry coefficient/scale; ratios carry reduced numerator/positive denominator. Checked operations return explicit invalid/overflow/nonrepresentable outcomes. No monetary `number` overload or implicit rounding.

**Rationale**: Native BigInt avoids adding a dependency for a deliberately small exact arithmetic surface. Its native JSON serialization is not a suitable boundary format; the explicit codec emits strings. This is exact arithmetic, not cryptography, tax calculation or a replacement financial engine. See [ECMAScript BigInt](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-bigint-type) and [ECMAScript JSON serialization](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify).

**Alternatives considered**: Binary floating-point violates NFR-001; a decimal library is unnecessary for these operations and would still need project bounds/rounding policy; unrestricted arbitrary precision enables excessive work; globally patching BigInt serialization hides type meaning.

## R-04 — Proposed Finite Engineering Profile

**Decision**: Propose 256 KiB envelopes, depth 16, 4,096 total value nodes, 64 object members, 1,000 array elements, 4,096 Unicode scalars per string, 32 issues, 38-digit exact operands, scale 18, signed-64-bit nonnegative seconds/revisions, 128-digit scratch arithmetic and 1,024 Euclidean iterations. The [complete profile](contracts/primitives-and-bounds.md) defines units, exact ceilings and boundary tests.

**Rationale**: These finite ceilings allow values beyond floating-point safe integer precision while keeping worst-case parsing and arithmetic inspectable. They are engineering proposals, not supported customer scale, currency policy, timer-entry limits or approvals. Tests must show work remains within counters and measured performance budgets before adoption.

**Alternatives considered**: Provider maximums are unsuitable generic client limits; arbitrary unlimited precision is unsafe; narrowing to ordinary safe integers loses intended exactness. Lower future field limits may restrict particular features; raising shared limits requires a new profile and compatibility review.

## R-05 — Closed Shapes and Duplicate-Aware Decoding

**Decision**: Use small reusable handwritten validators driven by named contract definitions, with closed object keys and explicit null/omission rules. Decode raw UTF-8 JSON using a bounded duplicate-aware token reader before shape validation. In-process object validation accepts only own data properties/plain records and arrays, rejecting accessor/prototype/executable values; it is not a hostile-object execution sandbox. No generic user-supplied schemas or dynamic executable validators.

**Rationale**: Ordinary JSON parsing can erase duplicate-member evidence. RFC 8259 identifies duplicate-name interoperability problems and permits implementation bounds. A single limited decoder prevents an extra parsing stack while supporting the required byte/depth/node/duplicate guarantees. See [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html#section-4). The parser's small surface must receive explicit adversarial tests and review; no parser success establishes permission.

**Alternatives considered**: Parse-then-check cannot recover duplicate keys; regular-expression scanning cannot reliably parse escaped/nested strings; adopting a schema library alone does not solve raw byte/duplicate bounds; a general parser framework increases dependency and configuration scope. If a credible bounded decoder cannot be demonstrated, adoption is blocked rather than weakening duplicate detection.

## R-06 — Explicit Versions and Semantic Retry Intent

**Decision**: Initial protocol, payload and event versions are integer 1. Supported lists are exact; unknown versions/fields/events stop safely. A deterministic canonical intent encoder emits only validated named semantic fields; exact byte comparison in synthetic receipt doubles is authoritative. Future digest implementations are adapter-owned and must verify original canonical bytes as required by their collision/threat policy.

**Rationale**: RFC 8785 is useful background for interoperable canonicalization, but F003 selects a narrower profile with authoritative numbers as strings and fixed ASCII schema keys; it does not claim full RFC 8785 conformance. Exclude correlation/transport metadata while preserving workspace, trusted actor, operation kind/identity, applicable device, expected revision, policy references and canonical payload. See [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html).

**Alternatives considered**: Raw-message hashing treats key order/correlation as new intent; dropping revision/profile metadata permits changed-intent reuse; automatic latest-version conversion can rewrite pending work; adding hashing to the domain core introduces unnecessary platform/crypto coupling.

## R-07 — Tagged IDs and Real Authority Remain Distinct

**Decision**: Tagged runtime IDs use `{kind, value}` with canonical lowercase UUIDv4 text; resource references include their resource kind, ID and workspace. Trusted ports resolve actual kind/ownership/current authority. Missing and inaccessible resources share the public RESOURCE_UNAVAILABLE result.

**Rationale**: Compile-time brands alone cannot reject the wrong ID kind at runtime. Tags reject explicit misuse, while forged tags still require authoritative resolution. UUID values are opaque and do not grant access or establish commit ordering. The initial v4 allowlist is narrower than the general [UUID standard](https://www.rfc-editor.org/rfc/rfc9562.html); future UUID versions require explicit grammar/version compatibility decisions.

**Alternatives considered**: Prefix display IDs conflate labels and identity; time-ordered IDs cannot replace service revision authority; trusting claimed workspace tags enables tenant leakage; defining a real role matrix would incorrectly resolve Q-05.

## R-08 — Paired Safe Error Catalogue

**Decision**: Provide all 17 existing public error codes, bounded field-issue keys, `en`/`ar` messages with matching parameter names, explicit safe recovery kind and outcome certainty. Public parameters are allowlisted; raw exceptions and hidden resource details are rejected. Missing initial translations fail catalogue checks; unknown future codes get a generic reviewed fallback that forbids blind retry.

**Rationale**: [Existing project error/locale rules](../../docs/architecture/api-contracts.md) already define the categories. A dependency-free structured message selector is enough for fixed error messages; later UI owns full localization, plurals, bidi rendering and accessibility. Mixed identifiers need isolation at rendering, supported by [Unicode bidirectional guidance](https://www.unicode.org/reports/tr9/).

**Alternatives considered**: Returning translated server prose makes codes unstable and leaks internals; adding a full UI localization framework now expands scope; treating all service failures as safely retryable can duplicate effects.

## R-09 — Three Runtime Consumers, No Hosted Product Claim

**Decision**: Build one ES2022 pure conformance module with installed Vite, then execute its identical fixture set in local Node 24.21.0, locked Electron 44.8.0 in test-only run-as-Node mode and proposed Deno 2.9.7. Deno performs separate source checking and execution with no permissions, imports or runtime downloads during the test. Provision that exact fixture runtime only during later authorized setup, verifying official assets/checksums. Deno is absent locally at planning inspection.

**Rationale**: A browser shell smoke cannot prove the shared library runs in a service runtime. Deno 2.9.7 is an exact proposed compatibility probe, supported by its [official release](https://github.com/denoland/deno/releases/tag/v2.9.7); it is not a claim about a deployed edge-service runtime. [Deno security](https://docs.deno.com/runtime/fundamentals/security/) supports denying ambient external access. [Electron run-as-Node](https://www.electronjs.org/docs/latest/api/environment-variables#electron_run_as_node) is a test runtime probe, not lifecycle/preload evidence.

**Alternatives considered**: Latest-runtime downloads make results drift; Node-only tests miss service-runtime dependencies; using real cloud deployment needs unrelated credentials/provisioning; disabling desktop security for a smoke test is prohibited. F002's real shell/native matrix still runs as selected separately.

## R-10 — Additive F002 Enrollment

**Decision**: Enroll F003-specific unit, adapter, source-quality and runtime suites as fixed `$NODE` baseline test checks. Add explicit future wrappers because existing `test:unit`/`test:integration` only run F002's named suites. Keep existing check argv/minimum floors intact. Expand root typecheck include and add a separate shared typecheck; use an additive quality suite for package linting.

**Rationale**: Local inspection of `verification/suites.v1.json`, `tooling/verification/selection.mjs`, `enrollment.mjs` and `run-suite.mjs` shows baseline checks are mandatory, selection recognizes only baseline/security/desktop groups, and specialist placeholders do not enroll features. Base-manifest comparison rejects changing existing argv positions. New suites must have actual files, nonzero counts, stable feature IDs and separate expected assertions. Native/unknown source changes continue to select the three existing desktop targets.

**Alternatives considered**: Merely calling validateEnrollment does not execute/enforce a suite; putting F003 tests behind the specialist placeholders leaves them unrun; widening existing lint argv violates the reviewed floor; reporting empty or pending suites as passing defeats F002.

## R-11 — Dates and Time Meaning

**Decision**: Use explicit valid proleptic Gregorian `YYYY-MM-DD` dates and canonical UTC millisecond instants; validate fields mathematically before constructing or formatting. Retain optional original timezone metadata separately and inject its validation; no guessed local timezone or timer rounding. Reject leap seconds and submillisecond input in initial contracts with explicit precision/format errors.

**Rationale**: Separate calendar and instant semantics satisfy the project model without a date library or native Date rollover behavior. The initial profile is a constrained subset of [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html), not a claim of accepting every permitted timestamp form.

**Alternatives considered**: Parsing arbitrary locale text differs by runtime; treating a calendar date as midnight UTC changes work dates elsewhere; silently truncating submillisecond timestamps changes meaning; selecting work calendars would resolve Q-14 outside scope.

## R-12 — Compatible Adoption and Honest Completion

**Decision**: Keep proposals concrete but unapproved. Require an entry record for bounds/version adoption and current prerequisite review, use synthetic fixture operations only, and stop this invocation after Phase 1 design. Preserve old intent/version on failure; verify compatible backout or use forward repair.

**Rationale**: F003's [specification](spec.md) and [constitution](../../.specify/memory/constitution.md) require documentation, implementation, tests, agent QA, owner approval, merge and release to stay separate. No business API, stored schema, billing fixture approval or provider deployment follows from this plan.

**Alternatives considered**: Treating a planned limit as approved bypasses the root entry gate; mutating old queued work erases evidence; closing F002 fork/control gaps from a contract test would invent unrelated proof.
