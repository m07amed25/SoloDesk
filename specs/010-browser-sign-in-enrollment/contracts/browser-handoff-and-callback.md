# Browser Handoff and Callback Contract

## Scope

Defines F010's system-browser launch and inert native return. It extends F004's closed activation boundary; it does not turn identity returns into navigation or general deep links. Trace: FR-001–FR-007, FR-023; A-01–A-05, A-11, A-13.

## Start and cancel

`identity.startSignIn()` is a named renderer request with no URL, issuer, account, profile path, or arbitrary provider payload. Main derives the current profile/generation and configured method; checks network and approved protection when restart continuity is requested; creates PKCE S256 verifier/challenge, state and nonce; persists only approved protected attempt material; and constructs the authorization URL from static environment configuration.

Before `shell.openExternal`, main requires exact configured HTTPS origin/path and an allowlisted query schema. One pending attempt is allowed per profile generation. A new start atomically supersedes the prior attempt. `identity.cancelSignIn()` terminally cancels the matching current attempt and clears its protected proof.

## Transport profile

The callback transport is a deployment profile with exact `transport`, `destination_id`, scheme/origin, path, application audience, maximum raw bytes, allowed fields, and attempt lifetime. The sandbox candidate is an ephemeral loopback IP listener if the provider supports variable ports. Claimed HTTPS or private-use schemes require separate F029 packaged proof. `localhost`, wildcard destinations, user-controlled `return_to`, and general forwarding are forbidden.

## Return grammar

After transport decoding, the logical query is exactly one of:

```text
success := code + state + optional response_issuer
failure := error_code + state + optional response_issuer
```

- `code`, `state`, and `response_issuer` are opaque bounded ASCII values; raw values never reach renderer/log/evidence.
- `error_code` maps from a small configured provider allowlist to a safe internal result.
- Success and failure fields are mutually exclusive.
- No fragment is accepted.
- Duplicate, unknown, empty-required, malformed, non-canonical, oversized, nested-URL/destination, control-character, or ambiguous-encoding input is rejected before lookup or exchange.

Exact numeric bounds are versioned security configuration approved with the selected provider; tests cover the maximum and maximum+1. A missing approved value is a deployment block, not an unlimited default.

## Admission and consumption order

1. Apply raw transport and byte bounds before URL/query expansion.
2. Match exact transport destination, route, and application audience.
3. Parse the closed grammar once; reject ambiguity.
4. Locate exactly one `pending` attempt without revealing other profiles/accounts.
5. Check current profile, generation, method, issuer configuration, destination, state, expiry, cancellation, and supersession.
6. Atomically compare-and-set `pending -> consumed` for exchange ownership. Concurrent/duplicate delivery fails with no additional effect.
7. Exchange through the trusted identity boundary. A pre-exchange validation failure is `not_applied`; loss after exchange begins may be `outcome_unknown` and must reconcile session state before retry.

Cold start, `second-instance`, macOS `open-url`, and loopback delivery all invoke this same parser/admission path. A return with no live attempt is rejected before account or local data access.

## Safe outcomes

Renderer may receive only: `waiting`, `cancelled`, `expired`, `invalid_return`, `network_unavailable`, `provider_unavailable`, `verified`, or `reconciliation_required`, each with a diagnostic ID and named next action. No outcome contains the callback, code, state, nonce, issuer internals, or proof of another profile's existence.
