# F003 Logical Data Model

**Status**: Phase 1 design, 2026-10-18. These are in-memory values, serializable contracts and test records, not database tables or migrations. [Specification](spec.md), [commands](contracts/commands-and-results.md), [primitives](contracts/primitives-and-bounds.md), [intent](contracts/compatibility-and-intent.md), [errors](contracts/errors-and-localization.md) and [ports](contracts/ports-and-authority.md) define exact validation.

## Entity and Value Catalogue

| Entity/value | Fields and relationships | Validation / ownership |
| --- | --- | --- |
| ContractDefinition | Owner F-ID; named operation; kind; accepted protocol/payload versions; bounds profile; payload/result validators; required contexts/ref kinds; intent projection | Fixed registry entries, closed fields; F003 provides common registry types and test-only echo/record definitions |
| SupportedVersionRecord | Contract/operation identity, protocol/payload/event versions, bounds/intent version, compatibility fixtures, consumer identity | Explicit allowlist, initial 1; no inferred future support |
| BoundsProfile | Version plus byte/depth/node/string/collection/numeric/work/date/error limits | Proposed F003-bounds-v1 must be approved for adoption; immutable interpretation by version |
| TaggedId | Closed `kind`, canonical lowercase UUIDv4 `value` | Runtime tag and grammar; generation outside pure core; no display number or authority |
| ScopedReference | Resource kind, tagged resource ID, tagged workspace ID | Kind/tag/workspace consistency, then trusted actual resolution; cannot establish access from syntax |
| CommandEnvelope | Versions/profile; kind/operation; request/workspace/device IDs; operation ID; applicable expectedRevision/occurredAt; payload | Write operation ID required; actor excluded; null/absence explicitly declared; fresh validated value |
| QueryEnvelope | Same relevant versions/scope/correlation, closed query payload | No write operation ID or mutation/receipt claim |
| TrustedContext | Verified actor/workspace/device, session observation, current authority observation reference | Trusted nonwire value, created by actual future boundary; fixture factories are test-only |
| Decimal | BigInt coefficient and small integer scale internally; strings plus scale externally | ≤38 supplied digits, scale≤18, unique zero/trailing-zero normalization; no binary float |
| Rational | BigInt numerator/positive denominator internally; canonical strings externally | Reduced gcd, zero 0/1; supplied/reduced bounds; bounded arithmetic iterations |
| Money / SignedAdjustment | Integer minor units, currency, exponent, profile version; explicit signed kind when applicable | Same profile/currency for operations; precision not implicit; ordinary values nonnegative |
| Duration | Nonnegative exact source seconds | Signed-64-bit technical ceiling; no timer/billing policy; integer text externally |
| CalendarDate / Instant | Gregorian date or canonical UTC millisecond instant; optional original zone/offset context | Distinct semantic types; strict valid dates/ranges; no inferred local timezone or commit ordering |
| EntityRevision / ProgressToken | Nonnegative exact revision counter or separate bounded opaque cursor | Server owns accepted revision/order; cursors never interpreted as money, time or schema version |
| CanonicalIntent | Intent format; verified receipt scope; semantic versions/context/revision/policy/payload/occurrence fields; canonical bytes | Immutable after validation; array/string meaning preserved; correlation excluded; no raw-body comparison |
| OperationReceipt | Scope tuple, operation identity, original canonical intent, stage-specific result, observation identity | Synthetic doubles only in F003; future durable uniqueness/retention/financial constraints belong to adapters |
| ResultEnvelope | Versions, operation/workspace/correlation, original operation ID where applicable, closed status alternative and stage data | Metadata must agree with stage; unknown is not rejected/success; query data separate from command receipts |
| AcceptedEvent | Versions, kind, scope/entity/revision, operation, permitted verified actor, service commit instant, progress token, minimal payload | Supported only; actual application/progress atomicity belongs to F018; no unknown-event acknowledgment |
| PublicError / FieldIssue | Code/key, allowlisted params, diagnostic, recovery, outcome certainty, bounded issues/truncation; schema-owned field path | Complete paired en/ar catalogue, no secret/private/raw exceptions; bounded inert text |
| AdapterCapability | Named responsibility, typed input/output, trusted context/authority/revision obligations | Pure port type; no arbitrary query/path/execute API; production effects later |
| ConformanceFixture / Observation | Fixture/version/scenario, input, independent expected output, consumer/runtime, observed output/count/result, work/timing and safe artifact | Actual execution evidence separate from static fixture; no zero/skipped/unknown success |
| CompatibilityChangeRecord | Old/new versions, consumer/pending-data effects, fixtures, rollout/backout/forward repair, reviewer/approval references | Preserve original intent/accepted history; does not create a product-data migration |

## Relationships

A contract definition selects exactly one bounded request shape and its permitted result alternatives for each supported version. A request refers to one workspace and zero or more typed resources, whose declared scope must agree; actual ownership is resolved separately. A command becomes a canonical intent only after structural admission and verified actor context. Receipt scope combines that workspace/actor/operation kind with operation ID; multiple request correlation IDs may resolve the same intent/receipt.

Money references a precision/profile interpretation; equal integer units under different profiles cannot be compared as though identical. Decimal/rational values can represent rates/quantities but do not choose financial policy. Entity revision, payload version, profile version, commit instant and progress token have independent roles.

A result references the original request/operation and carries only stage-valid metadata. An event describes accepted data under service authority; successful parsing does not commit it. Errors reference stable localization keys, safe parameters and recovery semantics. A conformance observation links a fixture to an actual consumer/run; it cannot authenticate a human approval or prove durable security.

## State Transitions

| Current state | Event | Permitted result / invariant |
| --- | --- | --- |
| Raw input | Byte/token/shape/version validation fails | Bounded rejected structural result; no effect or content leak |
| Raw input | All structural rules pass | Immutable validated request; still not authorized |
| Validated request | Trusted authority/resource check denies/unavailable | Rejected or safely unavailable before effect; preserve eligible original intent |
| Validated authorized command | Future local atomic save acknowledged | local_saved; no service commit data |
| local_saved | Future outbox enqueue acknowledged | queued with same local intent/receipt |
| Authorized command / queued | Actual service receipt confirms commit | authoritative_committed with original operation identity |
| Authorized command | Background job accepted | job_accepted; no delivery/completion inference |
| Authorized command | Revision/source condition no longer valid | conflict or rejected; no silent overwrite |
| Any dispatched attempt | Reply lost, uncertain timeout/cancel | outcome_unknown; preserve intent and reconcile existing operation |
| outcome_unknown | Current permitted receipt/status lookup resolves | Original known state or still unknown; never invent fresh-operation retry |
| Receipt exists | Identical intent submitted with current access | Same permitted original receipt; no second synthetic effect |
| Receipt exists | Changed intent reuses key | Rejected reuse; original unchanged, zero additional effects |
| Pending versioned input/event | Unsupported reader/version | Halt processing; retain protected original; progress not advanced |
| Compatible consumer revision | Checked repair/backout | Preserve interpretation and identity; otherwise require forward transition |

These model obligations, not implemented persistence. No `local_saved` fixture is evidence of actual disk durability, no `committed` double proves server transactions, and no context object proves real authentication.

## Immutability, Validation and Privacy

Constructors copy validated input and expose readonly/frozen value semantics; nested validated values cannot be mutated later to change receipt equality. Boundary input does not hold shared mutable references into canonical intent. Validate original supplied length/magnitude before normalization, then canonical/output limits. Bound recursive work/error generation and exact arithmetic counters.

No raw token, full customer document, unrestricted path, private resource body or raw native error enters ordinary shared records. Diagnostic content is a safe reference. Test data use synthetic workspace/actor/secret sentinels; public missing/private outcomes remain indistinguishable in protected detail.

## Storage and Migration Impact

None in this planning request or foundational value model. Future adapters independently implement protected local/cloud persistence, receipt retention, migrations, outbox atomicity and backup/recovery. If they persist these contracts, they must record schema/bounds/intent versions and original bytes, declare compatibility before adoption, and never rewrite old pending or accepted facts silently. Q-03/Q-06/Q-07/Q-13 remain unchanged.
