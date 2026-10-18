# F004 Data Model — In-Memory Desktop Boundary

**Status**: Phase 1 design, not a customer-data schema or implemented state.  
**Source**: [F004 specification](spec.md), [research decisions](research.md), [desktop bridge](contracts/desktop-bridge.md), [links/navigation](contracts/links-and-navigation.md) and [ownership/lifecycle](contracts/ownership-and-lifecycle.md).

F004 state lives in the trusted main process except for a bounded, copied, read-only result passed through preload. No business record, token, key, outbox, local database or persistent profile catalogue is added. A process may own several logical local profiles; each profile has exactly one owner context.

## Entities and relationships

| Entity              | Fields and rules                                                                                                      | Relationship/lifetime                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AppOwner            | lockHeld, processEpoch, state, startedAt, shutdownReason                                                              | Exactly one active OS process owns the app lock; only that process creates profile contexts and windows. Epoch changes on restart.                                                                                       |
| ProfileDescriptor   | profileId, display-safe label, enabled/known status                                                                   | App-owned catalogue entry, not created from arbitrary URL/path. Default profile exists; synthetic A/B entries are test-only until F010/F012 supply real account/profile management. Profile ID is not a workspace grant. |
| ProfileOwner        | profileId, ownerState, contextEpoch, windowRef, sessionRef, pendingActivations                                        | One per open profile in AppOwner registry. A map insertion/in-flight promise is atomic for concurrent opens; removal follows close/disposal.                                                                             |
| TrustedWindow       | windowId, profileId, webContents identity, mainFrame identity, trusted document origin/URL, state                     | Zero or one primary F004 view per ProfileOwner. Recreated view gets a new identity/epoch; an old view cannot invoke handlers.                                                                                            |
| ProfileSession      | profileId, nonpersistent partition identity, protocol registration state                                              | One isolated in-memory session per profile view; no persistent Chromium customer cache/cookies are introduced. Disposed when profile closes.                                                                             |
| ActionInvocation    | fixed method, version, requestId, closed payload, sender/window/profile/context epoch, admission result, effect state | Transient. Captured input is copied/validated before any effect. A request ID is for correlation, not authority or a durable financial receipt.                                                                          |
| EventSubscription   | subscriptionId, event family, profileId, window/context epoch, active flag, callback binding                          | Created only by a named preload method. Disposed on unsubscribe, navigation, window close, profile change or authority loss.                                                                                             |
| ActivationIntent    | source, profile candidate, optional LinkIntent, arrival sequence, bounded identity                                    | Untrusted input from first launch, second instance or macOS open-url. May focus/create the matching profile context only after validation. Never carries a native command.                                               |
| LinkIntent          | protocol version, route kind, bounded canonical identifiers, optional profile selector                                | Parsed from untrusted URI. Production F004 enables home only; protected resource route is fixture-only until current authority exists.                                                                                   |
| LinkDecision        | accepted/denied/unavailable, destination or safe error, checked context epoch                                         | Transient decision, re-evaluated when used. Does not contain inaccessible resource details.                                                                                                                              |
| ExternalDestination | purpose key, exact approved HTTPS origin/path policy, enabled state                                                   | Trusted static catalogue; initially empty in production. A renderer may select an enabled purpose, never supply arbitrary host/scheme/path.                                                                              |
| ShutdownAttempt     | reason, startedAt, deadline, outstanding synthetic work count, outcome                                                | Trusted process-level drain signal. It cannot assert an owning feature's durable save. Interrupted/unknown work remains that feature's later responsibility.                                                             |

## Identity and validation

- **Profile identity**: Use a canonical app-known opaque ID, bounded in length and grammar. Do not derive a filesystem path, session partition, workspace grant or actor from untrusted text without an app-owned lookup. Test fixture IDs are separate from real account IDs.
- **Window identity**: A handler accepts only the exact current webContents and live top-level frame recorded for its profile; expected origin and main document identity must match. The profile context epoch changes on window recreation or authority switch. A stale sender or subscription is rejected.
- **Request identity**: A bounded canonical request ID correlates one action attempt and its response. It is not an idempotency or server receipt. Version 1 rejects unknown fields and unsupported versions before native effect.
- **Link identity**: Canonical URL parsing occurs once, followed by a closed route grammar; noncanonical aliases, credentials, unexpected ports/fragments, encoded separators and excessive input are denied. The route never grants access.
- **Authority**: App owner/profile context prove local routing only. Current signed-in actor, workspace, lease and resource permission are absent in F004 production; therefore protected routes/actions are disabled. Synthetic authority doubles can prove denial/recheck order.

## State transitions

### AppOwner

| From           | Event                                       | To             | Required action                                                                   |
| -------------- | ------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| unowned        | lock acquired                               | starting       | Register early ingress; create no profile job before lock.                        |
| unowned        | lock denied                                 | secondary_exit | Transfer bounded activation via native mechanism; exit without windows/jobs.      |
| starting       | trusted assets/registry ready               | ready          | Open the default or validated requested profile.                                  |
| starting/ready | fatal startup or renderer failure           | failed         | Report safe recovery; do not fabricate empty protected state.                     |
| ready          | explicit Quit or eligible last-window close | draining       | Refuse new privileged actions; dispose subscriptions; settle/mark in-flight work. |
| draining       | completed or bounded interruption           | closed         | Release owner only after terminal state.                                          |
| failed         | process exit/relaunch                       | unowned        | A new process can acquire the native lock; prior epoch is invalid.                |

macOS last-window close ordinarily leaves AppOwner ready with no visible window; activate restores the intended profile view. Windows/Linux last-window close enters draining. No tray or hidden timer state is introduced.

### ProfileOwner and TrustedWindow

| From              | Event                                 | To                | Required action                                                                            |
| ----------------- | ------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| absent            | known profile activation              | opening           | Insert in-flight owner once; parallel requests join/serialize.                             |
| opening           | window/document ready                 | visible           | Route only this profile's pending intent; focus/restore.                                   |
| visible           | minimize                              | minimized         | Keep same owner/context; no new profile job.                                               |
| minimized         | activation                            | visible           | Restore then focus the matching window.                                                    |
| visible/minimized | close                                 | closing           | Invalidate frame/context epoch and subscriptions before disposal.                          |
| closing           | macOS activate or later valid request | opening           | Create fresh view identity under same app owner; no stale caller accepted.                 |
| any active        | authority change/navigation/failure   | blocked or failed | Deny protected action; clear subscriptions and preserve later-feature data responsibility. |

### Action and link outcomes

- Admission order: app owner ready → method registered → bounded plain-data/version validation → current window/webContents/mainFrame/origin/document → profile/context epoch → current feature authority → effect. An asynchronous gap requires authority recheck before effect.
- Rejection before effect is known not-applied. A native effect whose completion cannot be established returns unknown/interrupted; never claim not-applied just because the reply is lost.
- Link order: raw bound → URI grammar → route catalogue → profile lookup → identity/workspace/resource authority when applicable → destination availability → navigation. The final checks recur at use.
- Duplicate link deliveries are coalesced only within a bounded in-flight identity/window, without treating arbitrary matching URLs as a durable idempotency record. A later intentional re-open remains possible.

## Invariants

1. One app lock holder; one ProfileOwner per known profile; losing processes start zero profile work.
2. A/B windows, sessions, subscriptions and activation targets never cross. Profile identity alone never grants a workspace read.
3. Every privileged invocation is tied to a live trusted top-level document and current profile epoch. Static typing or a valid payload does not grant authority.
4. All unrecognized methods, versions, fields, routes, schemes, external purposes and origins deny before effect.
5. No renderer-controlled path, SQL, shell command, raw URL, token or native event object crosses the bridge.
6. Shutdown does not invent a durable save or hidden timer; failed startup does not invent an empty protected profile.
7. F004 adds no persisted customer data or migration. Later owners version and recover their own durable state.
