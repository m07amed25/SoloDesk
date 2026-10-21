# Native Profile and Renderer Boundary Contract

## Scope

Defines the narrow F010 preload surface and native account/profile isolation. It inherits F004 sender/frame/origin/document/profile-generation admission and subscription disposal. Trace: FR-002, FR-007, FR-013–FR-020, FR-025; A-01, A-07, A-08, A-10, A-15–A-19.

## Named renderer surface

Version 1 exposes only:

- `identity.getState()`
- `identity.startSignIn()`
- `identity.cancelSignIn()`
- `identity.confirmEnrollment(safeDeviceLabel?)`
- `identity.retryReconciliation()`
- `identity.signOut()`
- `identity.confirmAccountSwitch()`
- `identity.onStateChanged(listener)` returning an unsubscribe function

Every invocation uses the existing closed request/response envelope and current caller admission. Payloads reject unknown keys and apply versioned bounds. No method accepts a URL, provider, issuer, account ID, role, workspace, path, SQL, shell command, callback, token, code, verifier, state, nonce, device ID, or arbitrary operation name.

## Renderer-safe state

The state DTO contains only: protocol version; one closed lifecycle value; safe profile reference; optional bounded display fields; optional safe device label; protection/session/enrollment status classes; diagnostic ID; localized message/action keys; and flags for retained local work whose wording reveals no record/count/content.

Events are bounded, plain-data copies. Main/preload validate again before delivery. No raw provider exception, network response, audit payload, or secret-derived value is exposed.

## Ownership and teardown

Main owns one identity/session/enrollment coordinator per current profile generation. It derives the profile from the admitted window; renderer cannot choose another profile. On sign-out/switch, main orders teardown as:

1. increment generation and cancel attempt;
2. stop online requests/subscriptions and reject late responses;
3. close account-bound windows/views and active workspace store;
4. invalidate protected session, zero/lock keys, and dispose in-memory DTOs;
5. retain encrypted prior profile bytes under their original binding; and
6. activate/create another isolated profile only after its account is verified.

No window, count, notification, outbox item, key, search result, or callback attempt from account A can enter account B's context. An account mismatch never relabels an existing profile.

## Downstream result

The only handoff to later features is a main-owned enrolled-account capability containing safe profile/account/device references and current generation. It does not expose credentials and does not assert workspace membership or permission. F012+ must independently establish workspace authority.
