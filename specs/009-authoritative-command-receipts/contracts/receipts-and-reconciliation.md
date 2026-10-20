# Contract: Receipts and Reconciliation

**Version**: F009 receipt/reconciliation v1
**Authority**: [F009 specification](../spec.md), FR-003–FR-010 and FR-017

## Concept Separation

- **Operation claim**: private permanent deduplication/equality record for a verified admitted intent and its terminal disposition.
- **Authoritative receipt**: immutable safe public evidence only for a committed effect or accepted job.
- **Outer response**: per-attempt transport correlation that may wrap the original receipt.
- **Reconciliation reference**: locator for the original operation, never bearer authority.

## Operation Claim Contract

Scope is `(workspaceId, verifiedActorId, operation, operationId)`. The claim stores protocol/payload/intent/digest profiles, a trusted digest, required device/expected revision/target metadata where safe, terminal disposition, safe error code for non-accepted outcomes, receipt locator for accepted outcomes, and authoritative instants.

Malformed input or a request without verified actor context does not bind a claim. A verified/canonicalized command that reaches a durable rejection, conflict, or proven-not-applied fence does bind the identity, so changed intent must use a new operation identity.

Raw request bytes, canonical payload, credentials, tokens, document bodies, and unrestricted diagnostics are not retained in the claim.

## Receipt Projection

`receiptVersion: 1` is a closed projection containing:

- `receiptId`, `workspaceId`, and permitted stable actor reference;
- `operation`, `operationPayloadVersion`, and `operationId`;
- `resultStatus`: `authoritative_committed` or `job_accepted`;
- operation-owned scoped target references;
- optional prior revision and required committed revision when the operation revises a target;
- `serviceReceivedAt` and `committedAt`;
- original accepting `requestId`/correlation identity;
- `eventId` and opaque `progressToken`;
- `retentionClass`.

The receipt excludes raw/canonical payload, token/secret/session material, unrestricted error/diagnostic data, unrelated private fields, and any claim that an external provider completed work.

An identical replay returns a response correlated to the new attempt but embeds the semantic original receipt unchanged. It does not rewrite the receipt identity, target, revisions, timestamps, or accepting correlation.

## Reconciliation Query

Register a closed F003 query operation `command.reconcile`:

```text
envelope.workspaceId = original workspace claim
payload = {
  originalOperation,
  originalOperationId
}
```

The actor comes from verified current credentials. An opaque reference may accompany the request but does not grant access.

The `query_result` contains one closed outcome:

| Outcome              | Meaning                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `committed`          | Original authoritative receipt is returned                                                           |
| `job_accepted`       | Original accepted-job receipt is returned                                                            |
| `rejected`           | Original safe rejection is returned after current authorization                                      |
| `conflict`           | Original safe conflict is returned after current authorization                                       |
| `proven_not_applied` | Atomic fence proves the original cannot later commit; a deliberate new operation identity is allowed |
| `still_unknown`      | Commit/non-application still cannot be proven; reconcile the same operation again                    |

Unauthorized, revoked, foreign-workspace, inaccessible, and missing lookups share a safe unavailable response and reveal no operation existence or outcome.

## Atomic Non-Application Fence

A simple missing-row read is insufficient because an original transaction may be in flight or delayed. To return `proven_not_applied`, reconciliation must acquire the same operation-scope uniqueness/lock and establish a terminal claim with the original digest. If an original transaction exists, the fence waits until it commits or rolls back and then returns that result. Once fenced, the old operation cannot commit later.

## Replay Matrix

| Existing state                 | Incoming intent        | Result                                                               |
| ------------------------------ | ---------------------- | -------------------------------------------------------------------- |
| No claim                       | Valid, authorized      | Execute owning transaction                                           |
| Accepted claim                 | Same digest/profile    | Reauthorize; return original receipt                                 |
| Rejected/conflict claim        | Same digest/profile    | Reauthorize; return original safe terminal result                    |
| Proven-not-applied claim       | Same digest/profile    | Return proven non-application; new attempt requires new operation ID |
| Any claim                      | Changed digest/profile | Fixed collision rejection; no prior detail                           |
| Possible in-flight transaction | Reconciliation         | Wait/fence; never infer from absence                                 |

## Retention and Archival

- Direct receipt lookup lasts at least through the approved retry and supported offline window.
- Exact periods remain unresolved and are not hardcoded or claimed.
- Archive requires manifest, checksum, version, range, and correlation reconciliation.
- A permanent minimal claim and finance/source uniqueness remain online or otherwise enforceable after rich receipt archival.
- Archived lookup returns a safe retained outcome/locator or forces reconciliation; it never treats the identity as unused.
- Legal hold and backup expiry are separate policies.

## Required Fixtures

- Lost response after commit resolves to original receipt and one effect.
- Pre-dispatch loss becomes proven not applied only after atomic fencing.
- Missing claim while a transaction is in flight never yields false non-application.
- Changed intent after accepted/rejected/archived result is rejected.
- Receipt archive does not free operation or protected source identity.
- Revoked/cross-tenant lookup leaks no receipt or existence detail.
