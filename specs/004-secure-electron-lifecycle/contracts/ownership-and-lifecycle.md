# F004 Contract — Ownership, Windows and Lifecycle

**Status**: Phase 1 design; no F004 runtime owner exists in the checked-out baseline.  
**Owner**: F004 main process. **Requirements**: FR-001–FR-003, FR-016–FR-021.  
**Related**: [data model](../data-model.md), [bridge](desktop-bridge.md), [links/navigation](links-and-navigation.md).

## App-wide lock and logical profile owners

Acquire app.requestSingleInstanceLock before app readiness, window creation, profile work or any later timer/outbox/migration work. If denied, the contender sends only versioned bounded activation additionalData and exits without a profile context. The primary app registers second-instance before ready; macOS open-url is also registered before ready. Initial argv and all transferred data are untrusted, bounded inputs.

The lock is app-wide. A profileId inside additionalData is routing data, not an independent lock. The primary process owns an in-memory map of canonical app-known profile IDs to ProfileOwner entries. For one profile, all concurrent opens join one in-flight creation and produce one context/window; for different known profiles, distinct contexts/windows can coexist. A rejected/unknown profile never maps to a filesystem path or another profile's window. The app may own several logical profiles even though there is only one OS process.

Use a default profile in production F004 and synthetic A/B catalogue entries in tests. F010/F012 later own real account-linked profile discovery; F004 does not invent a persistent identity registry or workspace permission.

## Activation admission

| Source                       | Data allowed                                                                                                             | Safety rule                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Primary initial launch       | At most one F004 application link plus a known profile selector when explicitly supplied by trusted application workflow | Parse before profile work; unknown switches/links never become commands.                                       |
| Secondary instance           | Closed version 1 additionalData with known profile candidate and optional bounded link intent                            | One transferred activation; secondary exits after lock denial. Ignore untrusted workingDirectory as authority. |
| macOS open-url               | One bounded URI from the OS event                                                                                        | Same parser/route authority as all other sources; queue until app ready.                                       |
| Native dock/taskbar activate | No link; chosen known profile context                                                                                    | Restore/focus matching window or open the default. No cross-profile surprise.                                  |

Engineering v1 resource bounds: raw link <=2048 UTF-8 bytes; transferred JSON <=4096 UTF-8 bytes; at most 32 pending activation intents while starting; startup wait <=30 seconds before a safe unavailable result. These limits are denial/recovery bounds, not user-facing performance guarantees. Test at and beyond each bound, including a full queue. The primary records only safe receipt/denial categories; it does not log raw links.

## Profile and window separation

Each ProfileOwner has one window identity, one isolated nonpersistent Electron session, a context epoch and its own subscriptions/pending intents. The internal asset protocol is registered for each session. The current window's webContents and live top-level frame are recorded when trusted content loads. Recreating a window advances the epoch; old callers, callbacks and link decisions are invalid. A profile change never reuses another profile's session or current workspace authority.

The current shell has no customer persistence. Session storage/cookies for F004 should be unavailable or cleared; no persistent partition is used to simulate protected offline storage. Later F006/F007 define encrypted local state. BrowserWindow native controls and document loading remain available under the sandboxed preferences and restrictive navigation policy.

## State machine and close policy

| State    | Allowed next states                      | Admission rule                                                                    |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| starting | ready, failed, draining                  | Queue bounded activation only; no privileged renderer request.                    |
| ready    | draining, failed                         | Accept registered current-context actions and valid profile activation.           |
| draining | closed, failed                           | Reject new actions/link effects; complete or explicitly interrupt in-flight work. |
| failed   | closed or a new process epoch after exit | Show safe recovery; no empty protected state.                                     |
| closed   | new process epoch after fresh lock       | No old frame, subscription or request remains valid.                              |

Window states are opening, visible, minimized, closing and closed. Minimize/restore affects only the caller's profile window. On Windows/Linux, closing the last window begins normal quit/drain. On macOS, closing the last window leaves the app process ready but with no visible window; dock activation recreates the requested/default window. Explicit Quit on all platforms begins drain. F004 creates no tray and no hidden timer/background job. Q-04 and F036/F037 must decide and prove a future changed policy before enabling one.

## Shutdown and failure contract

- Begin drain once. Stop admitting new privileged requests, cancel/dispose event subscriptions, and notify later registered owners that quit is requested. An in-flight F004 synthetic operation may finish within a provisional five-second engineering drain budget; otherwise report interrupted or outcome_unknown according to observed certainty. Never label a possible effect not_applied solely because a response was lost.
- If a future owner has durable work, it must expose its own checkpoint/receipt/recovery contract. F004 cannot persist or certify a timer, migration or outbox on its behalf. The owner must be able to veto unsafe exit under its approved policy; that policy is not invented here.
- Explicit quit must not loop in before-quit handling. Guard the first interception, finalize state, then let the terminal quit proceed. Unexpected process kill cannot run cleanup; a subsequent launch must see a new epoch and let owning features inspect their protected state.
- Renderer crash, preload/asset failure and startup failure move to failed state with safe English/Arabic recovery guidance. Do not silently create an empty replacement profile or relax sandbox to make the window appear.
- Redacted diagnostics may include build, event kind, error code and opaque correlation ID, but never raw link, local path, token or protected content.

## Required proof and limitations

Prove same-profile and distinct-profile launch races with actual processes, not only registry unit tests. Inject interrupted startup, renderer crash and synthetic in-flight work; verify state/owner transitions, no duplicate jobs and no fabricated save. Test native minimize/restore/close/reopen/keyboard/focus on each declared Windows, macOS and Linux target, including Snap integrated-terminal startup where supported. Record exact build, OS/CPU/display, locale, expected/observed, defects and reviewer. A Linux result does not establish Windows/macOS support, and F004 lifecycle proof does not establish encrypted persistence or timer recovery.
