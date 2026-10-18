# F004 Contract — Links, Asset Origin and Navigation

**Status**: Phase 1 design; OS protocol registration and protected routes are not implemented.  
**Owner**: F004 link ingress and trusted-window navigation. **Requirements**: FR-011–FR-015, FR-020.  
**Related**: [ownership/lifecycle](ownership-and-lifecycle.md), [bridge](desktop-bridge.md), [research](../research.md).

## Separate protocols

- **Internal release content**: Proposed solodesk-app://ui/index.html is a trusted asset origin, never an OS deep link. Register it as standard and secure before ready; register an asset-only handler separately for each profile's in-memory session after ready. Serve only GET/HEAD, the exact ui host and canonical built renderer files under the reviewed bundle root. Reject traversal, encoded separators, symlinks leaving root, unexpected host, method or missing asset. Do not set bypassCSP. A restrictive release CSP and navigation denial remain active.
- **Operating-system link**: Proposed solodesk://open/... is untrusted ingress to a parser, never a renderer document origin or native command. F004 validates the grammar and home route; F029 owns final packaged OS registration and F010 owns auth callback shape/identity.
- **Development content**: Exact Forge loopback dev-server origin only, with a development-only CSP allowance. No remote network origin is trusted merely because it is HTTPS.

The two schemes must never be interchangeable. A solodesk-app URL arriving through OS activation is denied; a solodesk link must never be loaded as executable renderer content.

## Version 1 deep-link grammar

The bounded production F004 form is exactly solodesk://open/home with no credentials, port, query or fragment. It chooses the known default profile through app-owned context, then focuses or creates that view. Profile selection for synthetic A/B tests is an out-of-band validated activation fixture, not an arbitrary path or filesystem selector.

A future protected-record grammar may be tested synthetically as solodesk://open/record/<canonical-record-id>?workspace=<canonical-workspace-id>, but production F004 returns unavailable before any protected lookup because sign-in/workspace/resource authority is not implemented. F010/F012/F014 must register a real route and current checks before enabling it. A future auth callback uses a different explicitly reviewed path and is rejected in F004 production.

| Rule               | Version 1 behavior                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw size           | At most 2048 UTF-8 bytes before parsing, with a stricter fixed route grammar.                                                                                                                       |
| Character set      | ASCII URI syntax for enabled paths and UUID-style identifiers; reject controls, whitespace, backslash, invalid percent encoding, encoded path separators, double decoding and noncanonical aliases. |
| Scheme/host        | Exact solodesk scheme and open host after canonical parse; no userinfo, explicit port, alternate host or scheme.                                                                                    |
| Path/query         | Closed route table. Home is exact /home with no query. Synthetic record route has exactly one canonical workspace query field and one path ID.                                                      |
| Fragment           | Always absent.                                                                                                                                                                                      |
| Duplicate delivery | One delivered intent handled once within a bounded in-flight activation identity. A later deliberate user open can create a new intent.                                                             |
| Failure            | Deny safely without revealing target identity, executing a command, creating another owner or discarding unrelated existing window state.                                                           |

Check raw syntax before a URL parser can normalize traversal. Parsing is pure and has no filesystem/network/native side effects. Every entry path uses the same parser: first-instance startup input, second-instance additionalData, and macOS open-url. Register macOS open-url and second-instance listeners before ready. The second process sends only closed bounded additionalData; do not rely on unstable argv order for authority. Platform-specific argv scanning is an untrusted fallback with exact scheme and count rules.

## Decision and activation contract

1. Parse/limit raw input; reject invalid and unsupported forms before any navigation.
2. Resolve the requested local profile only from the app-owned known catalogue; no profile path is accepted.
3. Wait for the matching ProfileOwner/window to become ready; concurrent requests join one creation.
4. For protected routes, obtain current signed-in actor, workspace, lease and resource/action permission from later trusted owners. Recheck at use, not only receipt. In F004 production, this stage always denies/unavailable.
5. Route to an enabled destination in that profile's trusted view, then focus/restore that window only. An unsupported route gets a safe English/Arabic recovery message.
6. Record a redacted decision reason/diagnostic identity, not the full link or protected identifier, in ordinary diagnostics.

No link intent is a command receipt, idempotent financial operation or durable offline queue. On app shutdown, pending intent is either handled with a recorded result or denied/interrupted; it is not silently replayed on restart.

## Navigation and external opening

The trusted window refuses unplanned top-level navigation, subframe navigation and new windows; redirects are checked, not presumed safe because the starting URL was allowed. Programmatic main-process loads are from the known trusted asset/dev origin only. No remote executable page loads inside the application view.

A future external-opening request takes a static approved purpose key, not a URL. Main maps the key to a reviewed absolute HTTPS URL and checks exact scheme, host, port and intended path before calling the OS opener after an explicit user action. The F004 production purpose catalogue is empty, so every request is denied. No file, javascript, data, custom handler or renderer-supplied redirect target is passed to the OS. Once opened in the system browser, that website is not a trusted SoloDesk renderer and any return link re-enters the untrusted link parser.

## Negative fixtures and evidence

Test at-limit/beyond-limit raw length, unknown scheme/host/route, uppercase aliases if not canonical, userinfo, port, query duplication, fragment, dot segment, percent-encoded slash/backslash, malformed percent triplet, control characters, nested URL, invalid UUID, foreign workspace, signed-out/revoked context, duplicate delivery and late context change. Run the same fixture corpus through cold-start and running-instance admission, plus macOS open-url handling. Built-app tests inspect that no disallowed destination opened, no privileged handler ran and no second profile owner appeared. Packaged OS registration and signed installer behavior remain F029 evidence.
