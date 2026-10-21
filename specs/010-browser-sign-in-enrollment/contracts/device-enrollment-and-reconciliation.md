# Device Enrollment and Reconciliation Contract

## Scope

Defines the first online device enrollment after verified identity and the fence that makes the local profile ready. Trace: FR-010–FR-013, FR-021; A-06–A-09, A-14.

## Trusted command

The bounded `device.enroll` handler may share the existing command-gateway deployment and F009 transaction utilities, but it uses a verified-account context rather than workspace membership. The service derives `(issuer, subject)` from the verified session. It never trusts caller account, owner, workspace, role, profile path, device ID, or protection status.

Input is a versioned enrollment intent containing: intent/operation ID, installation-context reference, bounded platform/architecture/app version, bounded device label, protection-proof reference, request/correlation ID, and canonical payload digest. Main binds local profile/generation into its durable reconciliation record; only safe service-required fields cross the network.

## Preconditions

- Current network and verified provider session.
- Supported client/app/protocol versions.
- Approved protection path is currently usable and yields a valid non-secret proof reference.
- Intent ID and canonical digest are new or exactly match the stored claim.
- Rate/abuse checks pass without revealing another account/profile/device.

## Transaction and idempotency

One database transaction:

1. authenticates the account and claims `(issuer, subject, operation_type, enrollment_intent_id, request_digest)`;
2. locks/looks up the approved installation uniqueness key;
3. creates or returns exactly one device enrollment;
4. appends one immutable enrollment receipt and one redacted security evidence record; and
5. commits all records together.

Identical retries return the original result. Reuse with a changed digest/account/installation context is rejected. Mutable device label is never the uniqueness key. The exact installation uniqueness rule is a security/Q-08 gate and must be approved before migration.

## Reconciliation

`getEnrollmentResult(intent_id)` returns `enrolled`, `not_enrolled`, `outcome_unknown`, or a safe terminal rejection for the currently verified account. It leaks no result for another account. `outcome_unknown` retains the original intent and forbids a replacement until lookup proves the original result or a safe not-enrolled state.

## Local commit and readiness fence

After service confirmation, main stages the protected credential reference and immutable profile/account binding, validates them, and records the authoritative enrollment reference. Only then may the intent become `locally_committed` and the profile become `enrolled`.

```text
service confirmed + protected session committed + profile binding committed
+ protection usable + current generation = enrolled
```

Every other combination remains locked/recoverable. If service committed but local commit failed, retry/restart reuses the same result. If local staging exists but service outcome is unknown, it grants no access and is either completed after reconciliation or safely discarded without touching prior encrypted work.

F010 exposes no device list, revoke, rotate, remote-wipe, workspace, or offline-lease operation.
