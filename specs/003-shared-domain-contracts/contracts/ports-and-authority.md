# F003 Ports and Authority Contract

**Requirements**: FR-007–FR-010, FR-029–FR-031. These are proposed application-facing capabilities, not live IPC methods, cloud endpoints or an implementation of current permissions. [Message shapes](commands-and-results.md) and [intent rules](compatibility-and-intent.md) apply.

## Dependency Direction and Public Surface

`domain` owns exact primitives/IDs/date rules; `contracts` depends on domain and owns codecs/envelopes/errors/port types; `localization` depends only on public error shapes and owns English/Arabic definitions. Shared modules import neither UI nor native/storage/network/provider implementations. Future application services compose these contracts; F003 needs no production application package.

Public constructors and decoders accept `unknown` and return typed values or bounded validation results. Branded/static types supplement runtime tags; they never replace runtime validation. Successful decoding yields `ValidatedRequest`, not `AuthorizedCommand`. No library export accepts arbitrary paths, SQL, shell, raw IPC channels, unrestricted URLs or dynamically executable callback source.

## Trusted Context

`TrustedContext` holds verified actor/workspace IDs, verified device where required, authenticated session observation and a current authority observation identifier. It is created only by a trusted composition boundary. It is not serialized in ordinary request payloads and cannot be constructed by treating a supplied actor/role list as trusted. F003's context factory is fixture-only in tests; later auth/native boundaries own actual provenance and currentness.

Do not turn a set of capability strings into a permanent permission grant. Every sensitive action requires a current authorization call immediately before effect; permissions can change between validation and replay. Identity/access ports can return denied, revoked, expired, unavailable or permitted with bounded permitted metadata. No cached role field overrides that response.

## Capability Catalogue

| Capability               | Input                                                                           | Output / owner obligation                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `resolveResource`        | Trusted workspace/actor context, typed scoped reference, required resource kind | Current permitted identity/revision or RESOURCE_UNAVAILABLE; establish real tenant/kind/existence; no private body by default   |
| `authorizeAction`        | Trusted context, named registered action, resolved typed resource context       | Current permitted/denied/revoked/expired/unavailable observation; no arbitrary query or role mutation                           |
| `findOperationReceipt`   | Current trusted scope and tagged operation identity/kind                        | Permitted receipt and canonical intent or absent/unavailable; deny before private receipt disclosure                            |
| `resolveOperationStatus` | Same current scope and existing operation identity                              | Original known outcome or explicit unknown/unavailable; not a request to repeat effects                                         |
| `saveLocalChange`        | Validated eligible named change, versioned intent and local context             | Future adapter returns local_saved only after atomic data/outbox commit; F003 defines type/fixture obligations only             |
| `commitAuthorizedChange` | Currently authorized named command, expected revision and intent identity       | Future transactional adapter returns committed/conflict/rejected/unknown with real receipt; no generic raw-data transaction API |
| `lookupTimeZone`         | Bounded declared zone label                                                     | Recognized canonical label from declared catalogue or unavailable/invalid; no host-dependent implicit default                   |

The additional `utf8Codec` capability accepts bounded byte arrays or validated Unicode text and provides standard fatal UTF-8 decode/encode with declared byte counts. It exposes no I/O, filesystem, network or ambient globals to pure code. Runtime adapters supply standard TextEncoder/TextDecoder implementations; core byte-count checks remain mandatory.

These are library port type families, not privileged methods exposed to an untrusted renderer. Each later use case narrows the named command/resource/output types and wires only its necessary capabilities. F003 does not implement storage, enrollment, network calls, grants, key handling or real commit functions.

## Invocation and Failure Ordering

Run structural validation before resolution/effects. Reject explicit tenant mismatch without probing the other tenant. Actual ownership resolution and current action authorization remain mandatory for well-formed claims. Recheck authority before a new effect. Receipt/status resolution follows [intent processing order](compatibility-and-intent.md), including current access before disclosure and identical committed retry before stale-revision rejection.

Unavailable authority is denied for effect; it is not assumed permitted. Timeout/cancellation after potential dispatch produces uncertain outcome until reconciled. Safe diagnostics carry codes/correlation only; missing/private resources share the same public category, with no hidden counts, names or actual owning tenant ID.

## Independent Adapter Doubles

Plan two test-only in-memory implementations:

- A keyed receipt/resource map with explicit per-scope effect counters and separately mutable permission observations.
- An append-only synthetic operation journal whose lookup derives receipts from recorded intent/results, with independent reference/revision/effect handling.

Both may share public validators/primitive constructors; they must not share receipt lookup/commit/effect code or derive expected answers from production code. Fixtures supply two tenants, mismatched tags, valid opaque foreign IDs, revoked actors, project/action denial, existing receipts, changed intent, response loss and conflicts.

Assertions check no effect before authority, no unauthorized receipt disclosure, one effect on identical replay, zero second effects on changed reuse, correct unknown/known transitions and equal canonical output between doubles. These are contract semantics; real concurrent transaction/tenant enforcement, receipts and encryption remain later owning-feature evidence.
