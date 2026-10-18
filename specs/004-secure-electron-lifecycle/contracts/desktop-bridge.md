# F004 Contract — Narrow Desktop Bridge

**Status**: Phase 1 design; no preload or production handler exists in the checked-out baseline.  
**Owner**: F004 main/preload boundary. **Requirements**: FR-004–FR-010, FR-015–FR-018.  
**Related**: [data model](../data-model.md), [F003 command/error semantics](../../003-shared-domain-contracts/contracts/commands-and-results.md), [F003 bounds](../../003-shared-domain-contracts/contracts/primitives-and-bounds.md).

## Public surface and dependency direction

The renderer sees a frozen, named facade only. Proposed version 1 methods are below; method names are reviewable contract names, not a generic dispatcher. Preload owns private transport channels, strips native event objects and exposes an unsubscribe function for subscriptions. Main owns validation and native effects; preload validation improves feedback but never replaces main admission. No F003 conformance operation is wired into production IPC.

| Method                | Input                                        | Result/effect                                                                                                           | Availability                                                   |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| window.getState       | Versioned empty payload                      | Safe current window state: visible/minimized/maximized/focused; no path, token or profile identity                      | F004                                                           |
| window.minimize       | Versioned empty payload                      | Minimize only the caller's current window                                                                               | F004                                                           |
| window.restore        | Versioned empty payload                      | Restore/focus only the caller's current window                                                                          | F004                                                           |
| window.requestClose   | Versioned empty payload                      | Acknowledges close request, then applies documented lifecycle policy; acknowledgment is not proof of completed shutdown | F004                                                           |
| lifecycle.onState     | Callback for closed lifecycle event family   | Bounded state event for the caller's current window/profile; returns unsubscribe                                        | F004                                                           |
| links.onDecision      | Callback for safe link-decision event family | Bounded accepted/denied/unavailable notice without protected data; returns unsubscribe                                  | F004                                                           |
| external.openApproved | Approved static purpose key only             | Native external open or safe denial; no caller URL                                                                      | Reserved, not enabled while F004 production catalogue is empty |

No facade member accepts a raw channel name, SQL, shell instruction, filesystem path, arbitrary URL, token, executable callback source or unbounded object. Window methods do not grant application-wide focus over another profile. Future domain use cases get separately registered methods after their own authorization.

## Version 1 request/result envelope

A request is a structured-cloned plain object with exactly version (integer 1), requestId (canonical tagged F003 request identity) and payload (method-specific closed object). F004 applies the F003-bounds-v1 maximum as an outer ceiling and stricter method limits; an empty payload has no keys. Do not serialize class instances, functions, proxies, native event objects or arbitrary BigInt. Main makes a fresh validated copy before effect.

A response contains exactly version, matching requestId, status and one alternative:

| Status          | Additional data                                                         | Meaning                                                                                                                      |
| --------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ok              | Method-specific closed safe data                                        | Observed read or completed simple native effect.                                                                             |
| accepted        | No completed-effect assertion; safe transition label                    | A close/drain request was accepted but the window/process may terminate before a reply.                                      |
| rejected        | F003-compatible PublicError with not_applied certainty only when proven | Validation, caller, permission or availability denial before effect.                                                         |
| outcome_unknown | Redacted PublicError with unknown certainty                             | Native effect may have occurred but completion/reply was lost; caller must observe current state rather than blindly repeat. |

Unknown response keys, mismatched requestId, unsupported version and unexpected alternative fields are rejected by the consumer. Request ID is per attempt correlation; it is not a durable operation receipt or authorization token. No local_saved/queued/authoritative_committed result is available through F004.

## Main admission order

1. Ensure AppOwner is ready, method is registered and the target ProfileOwner/window still exists.
2. Enforce F003-compatible outer byte/depth/node/string limits, version 1 and method-specific closed payload; fail without reading attacker-controlled accessors or retaining mutable input.
3. Compare event.sender to the exact current window webContents; require a live event.senderFrame equal to that webContents mainFrame. Check its origin against the exact internal release origin or known loopback development origin, and check main document identity plus the profile context epoch. Opaque/null/unexpected origins fail.
4. Resolve current trusted profile/actor/workspace authority appropriate to the method. In F004 production there is no authenticated domain context; protected actions remain disabled. Recheck immediately before an effect if asynchronous work intervenes.
5. Perform only the named effect on the caller's window/context, map the observed outcome, and return a bounded redacted result. No throw text crosses the boundary.

Sender/origin validation applies on every invocation, including harmless reads and subscription setup. Event delivery repeats current-context eligibility and sends only the declared event payload. Navigation, destroyed frame, close, profile switch, authority loss or unsubscribe invalidates the subscription; no stale callback receives further events.

## Safe public errors and localization

Use F003 public error shape and paired locale catalogue where applicable: VALIDATION for malformed input, UPGRADE_REQUIRED for unsupported version, FORBIDDEN for forged/stale caller, RESOURCE_UNAVAILABLE for an inaccessible or disabled destination, AUTH_REQUIRED for protected link without identity, SERVICE_UNAVAILABLE for a native capability failure, and OUTCOME_UNKNOWN only when an effect may have happened. The public diagnostic identity is safe and opaque. Never include raw stack traces, file paths, arbitrary URL text, environment variables, tokens, other profile IDs, private resource names or executable markup.

The renderer shows a bounded English/Arabic message and an actionable next step without changing the stored code. Mixed-direction diagnostic IDs are isolated for display. If the view itself is unavailable, a native error path gives a safe bilingual or locale-selected explanation; no untranslated exception is shown as a recovery instruction.

## Security and compatibility cases

- Reject unknown method names and renderer attempts to reach private transport channels or pass ipcRenderer itself.
- Reject wrong webContents, iframe, stale frame, changed origin/document, old context epoch and permission change between validation and effect.
- Reject payload at one byte beyond outer limit, unknown field, unsupported version, accessor/proxy, wrong request identity and malformed response correlation.
- One profile's subscription cannot receive another profile's lifecycle/link event; disposal is observable.
- Keep the release renderer sandboxed with context isolation and Node disabled. A development-only CSP allowance never appears in the built release document.
- A future version is explicitly allowlisted with compatibility fixtures; version 1 is not silently reinterpreted.
