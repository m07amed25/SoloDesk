# Contract: Authoritative Invitation Administration

**Consumers**: Electron renderer through preload/main, main invitation coordinator, command gateway, restricted database functions.
**Trust boundary**: The renderer proposes bounded intent. Main and server derive actor, session, enrolled device, active workspace, workspace generation, authority, policy, expiry, and timestamps.

## Contract Rules

- Administration is online-only and requires the current F010 session, enrolled device, and F012 active workspace context.
- Every mutation has a client-generated UUID `operationId`; its normalized semantic input has one digest. Reuse with a different digest is rejected.
- `resend` and `revoke` require the last observed positive `expectedRevision`.
- Renderer-supplied actor, workspace, membership, capabilities, expiry, token, delivery state, or timestamps are invalid input, not hints.
- All text, arrays, page sizes, and cursor values are bounded by the shared closed schema. Unknown fields and unknown enum values are rejected.
- Raw recipient bindings, invitation secrets, secret-bearing URLs, provider payloads, and unrestricted errors never cross this contract.

## Shared Safe Types

```ts
type InvitationLifecycle =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired"
  | "superseded";

type DeliveryOutcome =
  | "queued"
  | "provider_accepted"
  | "delivered"
  | "delayed"
  | "failed"
  | "bounced"
  | "rate_limited"
  | "unknown";

type MembershipOutcome = "not_created" | "active";

type SafeAction =
  | "correct_input"
  | "connect_and_retry"
  | "refresh"
  | "resend"
  | "contact_owner"
  | "none";
```

`SafeInvitationSummary` contains only:

- `invitationId`, `revision`, `recipientLabel`, `offerRef`;
- localized-safe role and scope label keys/parameters;
- `lifecycle`, `expiresAt`, latest `deliveryOutcome`, `membershipOutcome`;
- allowlisted `availableActions` and `updatedAt`.

The recipient label is presentation-only and bidi-isolated by the renderer. It cannot be sent back as invitation identity.

## `getPolicy()`

Returns the current workspace's enabled invitation choices and field bounds:

```ts
type GetInvitationPolicyResult =
  | {
      ok: true;
      policyRevision: number;
      recipientInput: { kind: "email"; maxLength: number };
      offers: Array<{
        offerRef: string;
        roleLabelKey: string;
        scopeLabelKey: string;
        consequenceLabelKey: string;
      }>;
      expiryLabelKey: string;
      canInvite: boolean;
    }
  | SafeInvitationFailure;
```

An empty offer list is valid and fail-closed. The desktop cannot compose a role or scope from arbitrary capability values.

## `list(input)`

```ts
type ListInvitationsInput = {
  cursor?: string;
  pageSize: number;
};

type ListInvitationsResult =
  | {
      ok: true;
      items: SafeInvitationSummary[];
      nextCursor?: string;
      policyRevision: number;
    }
  | SafeInvitationFailure;
```

- `pageSize` is positive and capped by the shared schema.
- Cursor is opaque, signed or otherwise integrity-protected by the authority, scoped to workspace and ordering, and expires.
- Ordering is stable `(created_at desc, invitation_id desc)`.
- No total count, cross-workspace list, free-text search, raw detail, or token lookup is available.

## `create(input)`

```ts
type CreateInvitationInput = {
  operationId: string;
  recipient: { kind: "email"; value: string };
  offerRef: string;
  policyRevision: number;
};

type CreateInvitationResult =
  | {
      ok: true;
      effect: "created" | "replayed";
      invitation: SafeInvitationSummary;
    }
  | SafeInvitationFailure;
```

The server:

1. claims/replays the F009 operation by semantic digest;
2. validates current session/device/workspace/inviter membership;
3. validates and canonicalizes the recipient under the approved identity policy;
4. resolves an existing verified stable identity when available without revealing that fact to unauthorized callers;
5. verifies the current enabled offer and inviter assignment rule;
6. under one transaction creates or returns one pending invitation, one current generation, one queued delivery attempt, receipt, and redacted evidence;
7. after commit dispatches the one secret-bearing message and records delivery truth.

No membership is created. A matching existing pending invitation returns safe current state rather than minting a parallel acceptance path. Changing access requires the approved explicit replacement path; it is not inferred by `create`.

## `resend(input)`

```ts
type ResendInvitationInput = {
  operationId: string;
  invitationId: string;
  expectedRevision: number;
};

type ResendInvitationResult =
  | {
      ok: true;
      effect: "resent" | "replayed";
      invitation: SafeInvitationSummary;
    }
  | SafeInvitationFailure;
```

The authority locks the invitation and current generation, revalidates inviter and offer policy, compares the revision, supersedes the old generation, creates one new current generation/expiry/queued attempt, increments revision, and commits before dispatch. Every earlier secret remains invalid even if the new dispatch fails. Accepted, revoked, expired, superseded, foreign, or stale invitations cannot be resent through this operation.

## `revoke(input)`

```ts
type RevokeInvitationInput = {
  operationId: string;
  invitationId: string;
  expectedRevision: number;
};

type RevokeInvitationResult =
  | {
      ok: true;
      effect: "revoked" | "replayed";
      invitation: SafeInvitationSummary;
    }
  | SafeInvitationFailure;
```

The authority locks the invitation and all non-terminal generations, revalidates current authority and revision, terminalizes them in one transaction, and records the receipt/evidence. Revocation after acceptance does not alter the membership and returns current terminal state.

## `reconcile(input)`

```ts
type ReconcileInvitationInput = { operationId: string };

type ReconcileInvitationResult =
  | {
      ok: true;
      outcome: "committed" | "not_committed" | "still_processing";
      invitation?: SafeInvitationSummary;
    }
  | SafeInvitationFailure;
```

Reconciliation returns only the caller/workspace-scoped result of the original operation. It never executes a replacement command. Unknown create/resend/revoke outcomes must reconcile before the UI enables a different mutation.

## Safe Failure Contract

```ts
type SafeInvitationFailure = {
  ok: false;
  code:
    | "invalid_input"
    | "online_required"
    | "not_authorized"
    | "policy_unavailable"
    | "recipient_already_member"
    | "invitation_already_pending"
    | "stale_state"
    | "rate_limited"
    | "outcome_unknown"
    | "temporarily_unavailable";
  action: SafeAction;
  correlationId?: string;
  field?: "recipient" | "offer";
};
```

- `field` appears only for locally correctable allowed fields.
- Foreign workspace, missing invitation, and lost authority collapse to `not_authorized` or `stale_state` without existence details.
- Database/provider/Auth messages and identifiers are logged only as allowlisted redacted evidence, never returned.
- Provider dispatch failure is normally a successful committed invitation with `deliveryOutcome = "failed" | "rate_limited" | "unknown"`, not a failed creation.

## Concurrency and Idempotency Guarantees

- Same operation ID + same semantic digest returns the recorded result.
- Same operation ID + different digest returns `invalid_input` and has no effect.
- Different concurrent create operations for the same workspace/recipient are serialized by the unique pending invariant; at most one current path exists.
- Resend/revoke compare `expectedRevision`; stale actions never overwrite a newer state.
- A response lost after commit reconciles to the committed result.

## Verification Obligations

- Closed schema/property tests reject extra fields, unbounded values, and renderer-supplied authority.
- Actual-role database tests prove direct invitation/membership DML is denied.
- Race and failpoint tests prove one pending invitation/current generation and no partial receipt/evidence.
- Cross-tenant/list/cursor tests reveal no records or aggregates.
- Electron bridge tests prove only these named methods are exposed and none accepts or returns a token/URL/provider payload.
