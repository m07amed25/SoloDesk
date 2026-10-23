# Contract: Delivery Status, Evidence, and UI

**Consumers**: Trusted delivery adapter, verified provider callback handler, F009 evidence projection, native invitation administration UI, hosted invitation UI, localization and verification suites.

## Truth Model

These facts are independent and must never be collapsed:

| Fact                    | Source of truth                                   | It does not prove                                    |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Invitation created      | Committed invitation/generation/receipt           | Dispatch, delivery, identity, acceptance, membership |
| Dispatch attempted      | Delivery-attempt record                           | Provider acceptance or human receipt                 |
| Provider accepted       | Synchronous provider evidence                     | Inbox delivery, reading, identity, acceptance        |
| Delivered               | Verified provider event with sufficient semantics | Human reading, identity, acceptance                  |
| Link exchanged/reviewed | Private redemption evidence                       | Acceptance or membership                             |
| Invitation accepted     | Atomic acceptance receipt + consumed generation   | Current membership forever                           |
| Membership active       | Current membership authority                      | Current invitation deliverability                    |

If evidence is insufficient, the status is `unknown`; the UI never upgrades it optimistically.

## Delivery Adapter

The implementation provides one feature-local adapter, not a generic messaging framework:

```ts
type InvitationDispatch = {
  deliveryAttemptId: string;
  recipientDeliveryValue: string;
  locale: "en" | "ar";
  secretUrl: string;
  templateData: {
    workspaceLabel: string;
    inviterLabel?: string;
    roleLabelKey: string;
    scopeLabelKey: string;
    expiryText: string;
  };
};

type InvitationDispatchResult =
  | { outcome: "provider_accepted"; providerRef: string }
  | { outcome: "failed" | "rate_limited" | "unknown"; safeReasonCode: string };
```

- Inputs exist only in trusted server memory and are bounded before provider use.
- The adapter receives a committed attempt ID and performs one time-bounded dispatch.
- Provider reference is immediately transformed into the minimum digest/correlation form needed for callback verification.
- Logs include allowlisted attempt/correlation IDs and safe outcome only—never recipient value, URL, secret, template body, headers, or raw response.
- A timeout becomes `unknown`, not an assumed failure or success. F013 does not retry automatically.
- Synthetic delivery writes to an isolated test sink that asserts secret handling and is visibly non-production.

## Provider Callback

A callback endpoint is enabled only when the selected provider's signed-event contract is approved.

1. Read a strictly bounded request body.
2. Verify signature and freshness against server-held credentials before parsing operational content.
3. Deduplicate by the minimum provider event reference/digest.
4. Resolve only the recorded delivery attempt; ignore foreign/unknown references with a neutral response.
5. Apply a permitted monotonic transition and record safe evidence.
6. Persist no raw payload, recipient, message body, secret URL, or unrestricted error.

Unsigned, stale, replayed, oversized, unknown, or contradictory callbacks change no invitation or membership authority. Callback compromise cannot accept an invitation.

## Administrator Projection

The native list uses `SafeInvitationSummary` from the administration contract. It presents:

- safe recipient label;
- role and scope label;
- authoritative expiry;
- invitation lifecycle;
- latest delivery outcome and safe reason/action where permitted;
- separate membership outcome;
- only currently allowed resend/revoke/refresh actions.

It does not present raw email where a safer masked label meets the task, any token or URL, generation selector, provider identifier/payload, hidden account match, capability list, customer data, total hidden count, or unrestricted audit detail.

Status refresh occurs when the view opens, regains focus, or completes/reconciles a command. F013 adds no push subscription. Cached non-secret status may be displayed as stale/offline, but actions remain disabled until current online authority is restored.

## UI State Contract

| UI state                                | Meaning                                             | Allowed primary action                   |
| --------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `submitting`                            | Local request in flight; no authority claim         | Wait/cancel before dispatch only         |
| `outcome_unknown`                       | Response missing; commit may exist                  | Reconcile original operation             |
| `pending + queued/provider_accepted`    | Invitation exists; delivery not proven              | Refresh or revoke                        |
| `pending + failed/rate_limited/unknown` | Invitation exists; delivery unresolved              | Explicit resend when authorized          |
| `pending + delivered`                   | Provider-supported delivery evidence                | Wait, resend if policy allows, or revoke |
| `accepted + active`                     | Invitation consumed and membership currently active | No F013 membership mutation              |
| `expired/revoked/superseded`            | Acceptance authority is terminal                    | Request/create an authorized replacement |

Controls are derived from current server `availableActions`, not inferred solely from labels. A stale mutation returns current state and moves focus to the status explanation.

## Evidence Projection

Allowlisted event families:

- `invitation.create_requested`, `created`, `creation_denied`, `reconciled`;
- `invitation.delivery_queued`, `provider_accepted`, `delivered`, `delayed`, `failed`, `bounced`, `rate_limited`, `unknown`;
- `invitation.resent`, `generation_superseded`, `revoked`, `expired`;
- `invitation.exchange_denied`, `reviewed`, `acceptance_denied`, `accepted`, `acceptance_reconciled`.

Each durable evidence record may include:

- authoritative time, event schema version, operation/correlation ID;
- actor stable reference where authenticated and permitted;
- workspace, invitation, generation, delivery-attempt, membership safe references;
- recipient binding safe reference, offer/role/scope and policy revision;
- allowlisted outcome/reason/action code.

Each record excludes:

- raw invitation/continuation/Auth secrets, full secret URL, cookie or authorization header;
- raw delivery address unless separately approved and encrypted for an operational need;
- provider payload/body/header, unrestricted provider/database/Auth errors;
- workspace customer records or unrelated tenant/member data;
- translated free text as authoritative evidence.

Evidence access reuses F009's permitted reviewer boundary. F013 does not add public evidence, recipient enumeration, export, global search, or cross-workspace aggregation.

## Localization Contract

- Every lifecycle, delivery, membership, error, action, confirmation, and consequence uses a closed shared message key present in English and Arabic.
- Authoritative codes/references remain locale-independent; localization never changes input digests or identity.
- Dates are formatted from authoritative timestamps with the viewer's locale/timezone, while the exact instant remains available accessibly.
- Recipient references and mixed-direction workspace labels use the repository bidi utilities/components.
- Message interpolation accepts only named, bounded, escaped presentation values. A provider/database error is never a translation parameter.
- Email templates and hosted/native surfaces receive fluent bilingual review before production approval; automated key parity alone is insufficient.

## Accessibility Contract

- Dialogs have descriptive titles, consequences, initial focus, focus trap, Escape/cancel behavior where safe, and focus restoration.
- Validation is associated with the field and summarized after submission without erasing input.
- Outcome-unknown, failed delivery, resend invalidation, revocation, and acceptance consequences are conveyed in text, not color/icon alone.
- Live regions announce one concise committed result; delivery polling/refresh does not create repeated noise.
- Resend and revoke confirmations identify the safe recipient, workspace, and consequence. Destructive revocation uses explicit wording but no inaccessible type-to-confirm burden.
- Tables/lists preserve logical order in RTL, expose status names to assistive technology, and reflow without horizontal task loss at 200% zoom.
- All actions work with keyboard and visible focus; reduced motion removes nonessential transitions.

## Safe Diagnostics and Support

Diagnostics may contain build/schema versions, safe correlation IDs, coarse reason codes, and feature enablement. They omit recipient values, invitation IDs that grant lookup, tokens, URLs, provider references, workspace/customer labels, and hidden counts. Support instructions ask for a safe correlation ID, never the invitation link.

## Verification Obligations

- Synthetic adapter tests cover accepted, failed, rate-limited, timeout/unknown, and throw paths after database commit.
- Callback tests cover valid signature, invalid signature, replay, stale event, unknown reference, contradictory order, and oversize body.
- Secret-canary scans cover logs, database, receipts, audit, UI snapshots, browser storage/history, diagnostics, exports, and test reports.
- UI tests cover open/focus/command refresh, stale revision, offline disabled actions, outcome reconciliation, and zero hidden counts/search.
- English/Arabic screenshots and semantic assertions cover all lifecycle/delivery combinations, mixed direction, keyboard, screen reader, contrast, reduced motion, and 200% zoom.
- Real-provider evidence, if later authorized, is labeled separately from synthetic tests and does not by itself prove human receipt or acceptance.
