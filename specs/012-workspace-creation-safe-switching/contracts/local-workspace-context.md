# Contract: Local Workspace Context and Safe Switching

## Ownership

One `WorkspaceCoordinator` exists per active F010 local profile in Electron main. It owns the current workspace ID, monotonic selection generation, protected selection record, active `PersistenceService` store, source teardown, target activation, and delivery of F012 state. It does not own identity sessions, editor contents, synchronization, invitations, or role policy.

The renderer owns only presentation and unsaved in-memory edit decisions. Preload exposes closed named operations; it never exposes raw IPC, path, SQL, token, key, or generic execute capability.

## Renderer-safe state

```text
WorkspaceState = {
  version: 1,
  lifecycle:
    "loading" | "no_workspace" | "ready" | "creating" |
    "reconciling" | "switching" | "locked" | "online_required",
  selectionGeneration,
  current?: WorkspaceSummary,
  target?: { workspaceId, displayName, discriminator },
  selectable: WorkspaceSummary[],
  creation?: { policy fields safe for UI },
  messageKey,
  actionKey,
  diagnosticId,
  nextActions
}
```

No state includes account subject, access/refresh token, filesystem path, database/key detail, raw membership row, queued payload, customer content, or hidden tenant metadata.

## Named methods and subscription

Minimum bridge surface:

- `workspace.getState()`
- `workspace.refresh()`
- `workspace.create(request)`
- `workspace.reconcileCreation(intentId)`
- `workspace.switch({targetWorkspaceId, expectedSelectionGeneration})`
- `workspace.onStateChanged(callback) -> unsubscribe`

Main supplies profile ID/epoch, current account, source workspace, and all protection/service handles. Requests use the existing caller/frame/origin/document/profile-epoch admission and F012-specific closed validators. A mismatched expected generation returns `stale_context` with no effect.

Workspace-bound methods added by later features must also include/capture immutable `{workspaceId,selectionGeneration}`; they cannot read a mutable global workspace at send time.

## Pending unsaved edits

The renderer's `WorkspaceProvider` maintains a bounded in-memory before-leave registry keyed by editor and captured WorkspaceContextEnvelope. When another workspace is selected:

1. no dirty registrations: invoke main switch;
2. `stay`: close the prompt, focus the source editor, do not call main;
3. `discard`: call source-bound discard callbacks, verify registrations cleared, then invoke main;
4. `save`: only for eligible editors, call source-bound save callbacks, wait for durable source confirmation, verify registrations cleared, then invoke main; and
5. any save failure/stale source leaves the user in the source context with recovery guidance.

Durably saved/queued/conflicted/staged/rejected/outcome-unknown work is not an unsaved registration and generally does not block switching. Its stored workspace ID never changes.

## Switch protocol

Given current A (optional) and requested B:

1. Renderer resolves unsaved memory and invokes `switch` with B and current generation.
2. Main validates caller, exact generation, canonical B, current F010 account/profile/protection, and B != A.
3. Coordinator serializes the attempt, advances generation, persists `switching(A?,B)`, publishes a neutral non-interactive state, and makes all earlier actions/events stale.
4. Stop accepting new interactive A commands; detach/invalidate A event callbacks and future subscription handles.
5. Close/checkpoint A's active local store. Durable A bytes/outbox remain in A's partition.
6. Online: call `CheckWorkspaceSelectability(B)`. Offline: require an F016-approved matching lease; until it exists return `online_required`/locked.
7. Open B with `openRetainedWorkspace`; only a just-authoritatively-created B may use `initializeAuthorizedWorkspace` with the matching creation receipt.
8. If B is ready, atomically persist `current(B,generation)`, clear A renderer caches by remounting the workspace subtree keyed by generation, attach only B adapters, publish ready, announce the context change, and move focus to the B heading/switcher result.
9. If B fails, recheck A. Reopen/persist/publish A only if it remains authorized and readable; otherwise persist/publish locked chooser. Never show A content beneath B identity or vice versa.

No step publishes B current before its service/local checks pass. Two concurrent attempts serialize; a superseded attempt sees another generation and can only return `stale_context`.

## Creation-to-local activation

After `CreateWorkspace` returns committed:

1. retain the authoritative result even if later local work fails;
2. advance selection generation and enter non-interactive activation;
3. call `initializeAuthorizedWorkspace(workspaceId, receiptId)` exactly once under the verified profile/protection owner;
4. on success persist/publish current workspace; and
5. on protection/storage failure persist locked/recovery state that says the cloud workspace exists but local protected data is unavailable.

Retry reconciles the original creation intent before any initialization. It never submits a second create because local initialization failed.

## Persistence modes

| Operation | Allowed input | Behavior on absent namespace |
| --- | --- | --- |
| `initializeAuthorizedWorkspace` | Exact newly committed workspace + creation receipt + current account/profile | Create encrypted directory/key/database atomically; failure preserves cloud result and any unexpected bytes. |
| `openRetainedWorkspace` | Current-authorized or approved-offline workspace expected to exist locally | Return unavailable/recovery; create nothing. |
| `closeWorkspaceStore` | Current source only | Drain active transaction, checkpoint/close, zero key, lock protection, preserve bytes/outbox. |

Read/corruption/key/schema failure never creates an empty replacement. Path/account/profile/workspace manifest mismatch is `recovery_required`, not a fresh workspace.

## Restart protocol

1. Load and validate the sealed selection record only after F010 profile/session/protection restore.
2. Reject/ignore it without disclosure if profile generation, issuer, subject, format, or binding differs.
3. For `current`, recheck membership online and open retained partition; without online authority, require the later approved offline lease.
4. For `switching`, inspect only safe source/target references, recheck both, and converge to one readable authorized context or locked chooser.
5. For `locked`, show its safe recovery action; never auto-create a partition or fall back to another account/workspace.

## Context fencing

Every workspace-bound request, response, callback, timer, dialog, notification action, link, search result, count, badge, recent item, and background status captures a WorkspaceContextEnvelope. Before effect or delivery, main/renderer verifies exact current workspace and generation. Mismatch means reject/drop/refresh; it never rewrites the captured workspace to current.

The workspace-root renderer subtree uses `key=selectionGeneration`; source caches/state are disposed before target content renders. Account-level switcher data stays separate and contains only authorized summaries.

## Entry points and deep links

- Parsed links retain their exact workspace UUID and record UUID.
- Main verifies current membership before revealing record content.
- Same current workspace + generation may route normally.
- Different authorized workspace requires an explicit safe switch; only after commit may the record route open.
- Guessed, malformed, revoked, unavailable, or hidden targets return a generic denial/unavailable decision.
- Delayed link/notification actions captured in A cannot reactivate A after B is current without a new explicit switch.

## Membership removal and connectivity

When current service authority reports removal/unavailability:

- advance generation and stop new workspace reads/actions/event delivery/submissions;
- close the active context and enter locked chooser;
- do not delete, upload, move, relabel, or expose locally recoverable source work; and
- show only permitted recovery/export guidance owned by later policy.

Cached membership or remembered selection cannot restore access. F012 defines no production offline duration; offline selection is `online_required` until F016 provides a valid lease contract.

## Accessible bilingual UI

- Header always exposes the current display name plus discriminator where needed; consequential confirmations repeat the target workspace.
- Duplicate names are distinguishable without relying on color or name uniqueness.
- Use logical CSS and root direction; render names/currency/opaque discriminator through bidi isolation without changing stored characters.
- Switch/create dialogs have semantic labels/descriptions/errors, initial focus, focus trap, Escape/cancel where safe, and restore/move focus predictably.
- `switching`, `ready`, `locked`, error, and recovery changes use restrained `aria-live` announcements; hidden tenant names are never announced.
- Every action is keyboard available; visible focus, contrast, reduced motion, and 200% zoom/reflow are required in English and Arabic.
- Valid non-secret form values survive validation/service failure. Raw database/provider text is never translated or displayed.

## Safe reason/action catalogue

| Reason | Safe action(s) |
| --- | --- |
| `pending_work_decision` | `stay | save_to_source | discard` |
| `stale_context` | `refresh_workspace` |
| `online_required` | `reconnect | choose_another_workspace` |
| `workspace_unavailable` | `choose_another_workspace | refresh` |
| `protection_locked` | `unlock | retry` |
| `local_partition_missing` | `choose_another_workspace | approved_recovery` |
| `local_partition_unreadable` | `retry | approved_recovery` |
| `upgrade_required` | `upgrade` |
| `outcome_unknown` | `reconcile_creation` |
| `recovery_required` | `retry | contact_support | approved_export` |

Actions not yet implemented by their owner remain absent/disabled rather than simulated.

## Redacted switch evidence

Evidence may contain account/workspace opaque references, source/target IDs when the actor is permitted to know both, attempt/correlation ID, generation, outcome, safe reason, authoritative/service check instant, and local observation instant. It excludes workspace/customer names unless explicitly necessary, record content, queued/staged payloads, credentials, keys, paths, raw errors, and hidden tenant identifiers.

## Traceability

- Pending work, source preservation, atomic switch: FR-011–FR-017; A-07–A-11; SC-003–SC-005, SC-009, SC-011.
- Restart/offline/protection/revocation: FR-018–FR-021; A-12–A-15; SC-006–SC-007, SC-011.
- Visible context/entry points/no signals: FR-008–FR-010, FR-014–FR-015, FR-022–FR-024, FR-026; A-06, A-16–A-19; SC-003, SC-005, SC-010–SC-011.
- Accessibility/localization: FR-025–FR-026; A-20–A-22; SC-012.
