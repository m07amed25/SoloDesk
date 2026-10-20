# Contract: Authoritative Command Gateway

**Version**: F009 gateway specialization v1
**Base contract**: F003 protocol v1, `F003-bounds-v1`, `F003-intent-v1`
**Authority**: [F009 specification](../spec.md), FR-001–FR-010

## Purpose

This contract specializes the existing F003 command envelope for production authoritative operations. It does not create a generic renderer method, caller-selected channel, dynamic SQL surface, or second gateway schema.

## Command Request

The request is the existing closed F003 envelope:

| Field              | Rule                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `protocolVersion`  | Literal `1`                                                           |
| `payloadVersion`   | Registered operation-supported version; initial `1`                   |
| `boundsProfile`    | Literal `F003-bounds-v1`                                              |
| `kind`             | Literal `command`                                                     |
| `operation`        | Registered closed operation name, maximum 64 ASCII characters         |
| `requestId`        | Tagged request identity unique to this transport attempt              |
| `workspaceId`      | Tagged workspace identity; claim only until trusted resolution        |
| `deviceId`         | Present exactly when the operation definition requires device binding |
| `operationId`      | Tagged stable operation identity, reused for identical retries        |
| `expectedRevision` | Canonical nonnegative revision text exactly when required             |
| `occurredAt`       | Optional canonical client occurrence evidence only when supported     |
| `payload`          | Closed operation-owned validated data                                 |

Actor, role/grants, tokens, secrets, raw paths, SQL, arbitrary URLs, and server policy decisions are never accepted as authority fields.

## Processing Contract

1. Decode raw bytes with duplicate-key, depth, size, Unicode, numeric, version, and unknown-field bounds before ordinary object mapping can lose evidence.
2. Validate the registered closed F003 request and payload.
3. Build trusted actor/session/workspace context from verified credentials and current service state.
4. Authorize before receipt lookup or resource-existence disclosure.
5. Recompute canonical intent and the versioned digest from the verified context.
6. Check the operation claim under scope `(workspace, verified actor, operation, operationId)`:
   - same digest/profile: reauthorize and return the original terminal result;
   - different digest/profile: reject with no effect and no prior-result disclosure;
   - no claim: enter the owning transaction.
7. Inside one transaction, check workspace write readiness, current membership/action/resource scope, actual target workspace/kind, domain invariants, and expected revision immediately before effect.
8. Commit the domain effect, terminal operation claim, receipt, accepted event/progress, and audit entry together or roll back all of them.
9. Return the outer result correlated to the current `requestId`; an embedded receipt retains its original accepting request/correlation.

The server dispatcher is allowlisted by registered operation/version and invokes a bounded handler. Caller data cannot select a table, function, policy, or arbitrary action.

## Result Contract

The outer result uses an existing F003 status:

| Status                    | Meaning                                                                | Required/forbidden evidence                                                                                     |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `authoritative_committed` | Synchronous authoritative effect committed                             | Receipt, committed revision when applicable, commit instant, progress token; never provider-delivery completion |
| `job_accepted`            | Authoritative job was durably accepted                                 | Receipt/job reference and acceptance state; never sent/delivered/settled completion                             |
| `conflict`                | Non-application is proven because current revision/invariant conflicts | `REVISION_CONFLICT`, certainty `not_applied`; only authorized current revision/recovery reference               |
| `rejected`                | Non-application is proven                                              | Safe public error only; no receipt, event, progress, committed revision, or partial-success metadata            |
| `outcome_unknown`         | Dispatch/commit cannot be proven either way                            | `OUTCOME_UNKNOWN`, certainty `unknown`, recovery `reconcile_operation`, original operation reference            |

HTTP status is transport metadata and cannot change body certainty. A timeout, cancellation, malformed response, or transport 5xx after possible dispatch becomes client-side `outcome_unknown`, never an invented rejection.

## Error Mapping

- Structural/version failures before dispatch: `rejected` with `VALIDATION`, `SCHEMA_UNSUPPORTED`, or `UPGRADE_REQUIRED`, certainty `not_applied`.
- Missing/expired authentication: `AUTH_REQUIRED` or `SESSION_REVOKED` without resource detail.
- Missing grant/foreign or hidden target: operation policy chooses a consistent `FORBIDDEN` or `RESOURCE_UNAVAILABLE` shape that does not distinguish missing from inaccessible.
- Stale revision: `conflict` with `REVISION_CONFLICT` and authorized recovery metadata only.
- Changed-intent operation reuse under protocol v1: `rejected` with `VALIDATION`, fixed `invalid_format` issue on `operationId`, certainty `not_applied`. A distinct future code requires a reviewed error-catalogue version.
- Storage/provider/service failures: certainty follows observed transaction evidence; code alone does not imply applied or not applied.

## Authorization and Disclosure

- Current authorization is checked for first execution, replay, reconciliation, and every returned private field.
- A valid tagged ID does not establish actual kind, workspace, ownership, or access.
- Revoked actors cannot inspect old receipts merely because they created the operation.
- Cross-workspace, inaccessible, and missing operation/resource lookups disclose no actor, target, payload, prior outcome, row, count, or timing distinction.
- The renderer receives only named application use cases through existing narrow boundaries; it never receives a generic gateway or server credential.

## Compatibility Rules

- Unknown request/payload field or version fails closed before execution.
- New fields require a new closed schema version and compatibility fixtures; optional insertion is not silently compatible.
- F008 prefixed string IDs must pass through an explicit boundary adapter and actual-resource resolution before becoming F003 tagged identities.
- Automatic database serialization/deadlock retry reuses the exact operation identity and intent.

## Required Fixtures

- Same operation and intent with a new request ID returns the original receipt.
- Payload, expected revision, target, semantic occurrence time, policy version, verified actor scope, or required device change causes collision.
- Revocation between admission and commit denies the effect.
- Concurrent same-revision operations produce at most one accepted result.
- Failure at effect/claim/receipt/event/audit/progress boundary leaves no accepted partial state.
- Foreign target and nonexistent target have the same safe disclosure shape.
