# Contract: Accepted Events and Progress

**Version**: F009 accepted-event v1
**Base contract**: F003 event envelope v1
**Authority**: [F009 specification](../spec.md), FR-015–FR-016 and A-19–A-22

## Purpose and Boundary

F009 emits one authoritative correlation event per accepted command and assigns a total continuation order within the workspace. F018 later owns event pull pagination, local application, local cursor atomicity, permission invalidation, resnapshot, and event-retention behavior.

## Event Projection

The closed event contains:

- `protocolVersion: 1`, `eventVersion: 1`, and `boundsProfile: F003-bounds-v1`;
- `eventId` and registered `eventKind`;
- `workspaceId` and target `ScopedReference`;
- canonical accepted entity revision;
- original `operation` and `operationId`;
- `receiptId` and `auditEntryId`;
- permitted stable actor reference when the projection allows it;
- authoritative `committedAt`;
- opaque `progressToken`;
- optional supported client `occurredAt` evidence;
- closed `projectionKind`, `projectionVersion`, and minimal non-secret payload.

No event contains secrets, session material, raw command payload, unrestricted text/content, generic diagnostics, or unrelated private fields.

## Ordering and Atomicity

- Ordering is scoped to one workspace.
- The internal progress position is allocated by locking/updating the workspace progress row in the same transaction as effect, claim, receipt, audit, and event.
- A rolled-back command publishes no event/token and leaves the visible progress watermark unchanged.
- Client occurrence time never determines accepted order.
- The public token is opaque and must not be parsed as a timestamp, revision, money value, schema version, or global tenant volume.
- Exactly one correlation event exists per accepted command. Later domain fan-out events require separately registered contracts and cannot replace this evidence event.

## Consumer Compatibility

On an unsupported event kind, version, bounds profile, or unknown field in a closed projection, a consumer must:

1. preserve the protected unprocessed event;
2. stop before applying its effect;
3. leave local progress unchanged;
4. surface `UPGRADE_REQUIRED` or `SCHEMA_UNSUPPORTED` with upgrade/recovery guidance.

An accepted event's schema validity is not authority by itself; the consumer still validates workspace, current permission projection, correlation, and ordering under F018.

## Correlation Invariants

For every accepted event:

- workspace agrees with operation claim, receipt, audit, and actual target;
- operation identity and type agree with the receipt and audit entry;
- accepted revision agrees with the committed domain result;
- `receiptId` and `auditEntryId` resolve exactly once;
- commit instant and progress position agree with the authoritative transaction;
- no two accepted events share the same workspace position, receipt, or operation correlation.

## Required Fixtures

- Future/old/reordered client times still produce service commit order.
- Concurrent accepted commands receive unique workspace positions.
- Failure after progress calculation but before commit leaves no visible event or watermark advance.
- Unsupported v2/kind/field stops a v1 consumer without application or progress change.
- Receipt/event/audit/target revision mismatch blocks recovery readiness.
- Cross-workspace event/reference combinations are rejected.
