# F004 Phase 0 Research — Secure Electron Lifecycle and Preload Bridge

**Date**: 2026-10-18  
**Scope**: Planning only; no runtime control, native test, package, branch or PR is created here.  
**Inputs**: [F004 specification](spec.md), installed [package manifest](../../package.json), current [main process](../../app/main/main.ts), F003 [commands](../003-shared-domain-contracts/contracts/commands-and-results.md), [decision register](../../docs/planning/decisions.md), [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security/), [Electron app API](https://www.electronjs.org/docs/latest/api/app).

## Observed baseline and dependency

- The checked-out main process has one window, sandbox/context isolation enabled, Node integration disabled, popup/navigation/permission denial and macOS activation. It has no preload, IPC handlers, explicit single-instance owner, profile registry, link ingress, external opener or shutdown coordinator. Forge/Vite builds one main and one renderer target. The current renderer is a welcome shell.
- F002 already has a built-app Playwright desktop runner, isolated userData/sessionData wrapper, security checks and VS Code Snap launcher cleanup. The test config currently names only the shell and F003 desktop cases.
- F003 provides exact plain-data bounds, versioned domain request/result contracts, public error shapes and paired English/Arabic messages. Its registered conformance operations are test-only; its request envelope requires a workspace and therefore cannot be used as a generic unauthenticated desktop dispatcher. Its recorded owner approval and merge remain pending in F003 QA. Implementation entry must verify the actual merged prerequisite and approved version.
- The F004 root card previously linked PR #2 as if it implemented F004. [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) is the merged F002 verification-harness PR. The F004 card has been corrected to distinguish proposed work from observed source.
- The local Electron skill references security/preload example files absent from this checkout; available basic examples are insufficient for the security contract. The current [official Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security/) and installed Electron 44.8.0 source are the primary technical references.

## R-01 — Process and profile ownership

**Decision**: Acquire one app-wide Electron single-instance lock before any profile work. A main-process profile-owner registry maps canonical, app-known profile IDs to one in-flight/ready/closing context each. The one process may own multiple profiles, each with a separate window, non-shared session/partition and authority context. A second process transfers a bounded activation intent to the first and exits. The registry serializes simultaneous opens per profile and routes focus/link intents to the matching context only. F004 can demonstrate a default profile and two isolated synthetic test profiles; persistent account/profile catalogue belongs to F010/F012.

**Rationale**: Electron's [single-instance API](https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata) is an application-instance lock; additionalData carries an intent, not a lock namespace. The installed [Electron 44.8.0 source](https://raw.githubusercontent.com/electron/electron/v44.8.0/shell/browser/api/electron_api_app.cc) uses the user-data directory for the native lock, and macOS Finder routes protocol opens to the existing app process. A global owner with logical profile contexts can meet both same-profile exclusivity and simultaneous distinct-profile acceptance on all three platforms.

**Alternatives considered**: One OS process per profile using separate userData paths would require early path selection, platform-specific registration and additional macOS routing; it is not selected for F004. One global window that switches profiles would not demonstrate concurrent distinct-profile isolation and increases stale subscription risk.

**Verification**: 100 concurrent launch trials per declared host; independent profile A/B focus and window/session isolation; owner crash/relaunch; bounded second-instance transfer; zero profile jobs in losing process. Test the actual Electron lock, not a mocked flag.

## R-02 — Trusted renderer document

**Decision**: Keep sandbox, context isolation and Node-disabled renderer. For production, serve only packaged renderer assets from a separate internal secure standard protocol origin (proposed solodesk-app://ui). Register the scheme before ready; handle requests in each profile's separate session after ready, restricting method, host, canonical path and asset root. Do not enable bypassCSP, broad file access or remote executable content. Development uses the exact Forge loopback dev-server origin with a development-only CSP exception. The deep-link scheme is separate from the internal asset scheme.

**Rationale**: Electron [security guidance](https://www.electronjs.org/docs/latest/tutorial/security/#18-avoid-usage-of-the-file-protocol-and-prefer-usage-of-custom-protocols) recommends a custom protocol because file URLs have unusual privileges. The [protocol API](https://www.electronjs.org/docs/latest/api/protocol) requires early scheme registration and per-session handling when using separate partitions. A known internal origin also makes sender checks and CSP clearer.

**Alternatives considered**: Retain loadFile with exact canonical document URL and observed origin as a transitional fallback; this preserves current tooling but retains file-protocol risk and is not the target. Remote hosted renderer is excluded by the constitution. Experimental protocol.registerSource is avoided for this plan; a reviewed bounded handler is the stable design until runtime compatibility is proven.

**Verification**: Packaged asset paths inside/outside root, encoded traversal, method/host mismatches, dev/release CSP inspection, no remote script/navigation, and each profile session's protocol availability.

## R-03 — Narrow preload and handler admission

**Decision**: Add a separately built sandbox-compatible preload at an absolute built path. Expose named, versioned F004 methods only: read a safe window state, request minimize/restore/close, and subscribe/unsubscribe to bounded lifecycle/link-decision events. Add an approved external-destination action only when a static purpose/destination catalogue entry exists; production F004 catalogue defaults empty. No ipcRenderer, event object, raw channel, filesystem path, SQL, shell or arbitrary URL passes through the bridge.

At every main handler, check the expected window/webContents, live top-level senderFrame, exact trusted origin/document identity, active profile context, method-specific payload/version bounds, current action authority and shutdown state before effect. Recheck authority after any asynchronous gap immediately before effect. Return F003-compatible stable redacted categories and localize through the existing paired catalogue or a bounded F004 message mapping. Subscription delivery is keyed to window/profile/context epoch and disposed on navigation, close, profile switch or authority loss.

**Rationale**: [Electron IPC guidance](https://www.electronjs.org/docs/latest/tutorial/ipc) and [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge) support per-method wrappers. The [security guide](https://www.electronjs.org/docs/latest/tutorial/security/#17-validate-the-sender-of-all-ipc-messages) requires sender validation and notes that subframes can send IPC; the origin is more reliable than URL alone for origin checks. F003's closed/finite validation rules are reusable, while its tenant command registry is not a desktop escape hatch.

**Alternatives considered**: A generic invoke(channel,payload) bridge or renderer-supplied permissions are rejected. A single wide desktop.execute command would conceal capability review. Exposing F003 fixture operations in production is rejected. A return of raw exception text is rejected.

**Verification**: Successful named action plus unknown/oversized/version/field negatives; forged webContents/frame/origin/stale window; asynchronous authority change; subscription disposal and zero cross-profile delivery; browser-visible errors contain no synthetic secrets or paths.

## R-04 — Link and external-navigation boundary

**Decision**: Use one pure bounded link-intent parser for initial process arguments, validated second-instance additionalData and macOS open-url. Register listeners before ready. The F004 production route table contains only an unprivileged home/activation destination; protected record routes use synthetic test policy until F010/F012/F014 supply current sign-in, workspace and resource authority. Reserve auth callback shape but reject it until F010/F029. Link intents never encode executable actions and are not durable commands. The profile registry routes them; a small in-flight identity prevents duplicate handling, and every target is rechecked at use.

Keep window-open denial and navigation/redirect denial at the webContents boundary. Open external content only from an explicit user purpose that maps to an approved HTTPS destination catalogue; never pass a renderer URL to shell.openExternal. The F004 production catalogue may remain empty until a real destination is approved.

**Rationale**: Electron [deep-link guidance](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app) distinguishes macOS open-url from Windows/Linux first/second-instance handling. Electron [security guidance](https://www.electronjs.org/docs/latest/tutorial/security/#15-do-not-use-shellopenexternal-with-untrusted-content) warns that untrusted openExternal input can execute host commands. Current main already denies popups/navigation; preserve and extend rather than relaxing it.

**Alternatives considered**: Trust argv ordering, arbitrary route strings, URL redirects or webview navigation: rejected. Registering OS callback with the developer launch as release proof: rejected; packaged registration and signing feasibility remain F029.

**Verification**: Cold/running/macOS simulated ingress with same parser; percent-encoding, control characters, length, duplicate, traversal, userinfo, port, fragment, nested URL, wrong-workspace and unsupported-route fixtures; no privileged effect from any rejected input. Native packaged callback evidence remains separate.

## R-05 — Window, exit and recovery boundary

**Decision**: Define explicit owner states starting, ready, draining, closed and failed. Native close policy for F004: closing the last window exits on Windows/Linux; macOS keeps the app owner running per platform convention and recreates a window on activation. Explicit Quit drains in-flight F004 work under a bounded timeout, rejects new privileged requests, disposes subscriptions and returns an interrupted/unknown outcome where completion is not proven. An unexpected crash or failed startup presents recovery guidance and never fabricates protected-data success. No tray/timer continuation is enabled in F004.

**Rationale**: This extends current window-all-closed/activate behavior without selecting Q-04's timer/tray policy. Electron [app lifecycle](https://www.electronjs.org/docs/latest/api/app) exposes before-quit, window-all-closed, activate and second-instance events. Future timer/outbox/migration owners must supply durable checkpoints and real recovery; F004 provides a safe signal boundary only.

**Alternatives considered**: Silent background work after last-window close or an unbounded quit wait: rejected. Treating renderer crash as empty new profile: rejected.

**Verification**: Minimize/restore/close/quit/activate, in-flight synthetic job, forced process termination, failed asset/preload load and relaunch; document OS differences. Do not assert durable business recovery from synthetic lifecycle tests.

## R-06 — Verification and native matrix

**Decision**: Extend the existing F002 verification harness rather than creating a parallel gate. Add focused parser/registry/handler unit and integration tests, built-Electron Playwright security/window/link cases, baseline/security suite enrollment, and redacted evidence in docs/qa/F004.md. Use the existing Linux x64, Windows x64 and macOS arm64 hosted smoke targets as a provisional evidence matrix, with exact OS builds recorded. Q-11 still owns the published supported OS/CPU/package matrix; a missing target is not a pass. Include VS Code Snap integrated-terminal startup regression and actual launch controls. F005 owns complete shell localization; F004 still supplies paired safe errors and focused Arabic keyboard review.

**Rationale**: The [current test strategy](../../docs/quality/test-strategy.md) and root F004 card require actual native observations, security negatives and Snap startup. F002 already produces build-bound evidence and refuses inferred native results.

**Alternatives considered**: Linux-only inference, source-only review or a new disconnected verification pipeline: rejected.

**Verification**: 23 scenario and 21 requirement mapping with observed evidence or explicit blockers; recorded build/hash, OS/CPU/display, locale, expected/observed, defects, reviewer and date. No checkbox is passed from this plan.

## Resolved planning questions and remaining owner gates

| Topic                                    | Planning resolution                                                                              | Later gate                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Single-instance versus multiple profiles | One OS process with one lock and profile-owner registry                                          | Real multi-profile account catalogue in F010/F012                 |
| Renderer origin                          | Internal bundled-asset-only custom protocol in release; exact loopback origin in development     | Packaged protocol/signing evidence in F029                        |
| Desktop action envelope                  | F004-specific closed version 1, reusing F003 bounds/errors rather than tenant command dispatcher | F003 merged/approved contract compatibility before implementation |
| External destinations                    | Default deny; explicit approved purpose catalogue                                                | Actual host approvals with owning feature                         |
| Protected deep links                     | Parser and synthetic authority now; production protected routes disabled                         | F010/F012/F014 current identity/access                            |
| Close/tray/timer                         | Baseline native close/quit behavior; no hidden timer                                             | Q-04 and F036/F037                                                |
| Native support                           | Provisional QA evidence matrix, not a support promise                                            | Q-11 before distribution                                          |
| Customer persistence                     | None added in F004                                                                               | F006/F007 encryption and migration proof                          |

All technical questions needed for this bounded plan have a documented resolution. The open Q decisions are explicit downstream feature/release gates, not silently settled here.
