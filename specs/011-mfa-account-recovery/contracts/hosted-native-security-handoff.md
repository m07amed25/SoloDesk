# Hosted/Native Security Handoff Contract

## Scope

Defines F011's allowlisted hosted purposes, protected local operation metadata, named Electron surface, renderer-safe state, and profile/session generation fencing. It extends F010 without changing F010's v1 contracts. Trace: FR-002–FR-005, FR-008, FR-011–FR-013, FR-016–FR-020, FR-025–FR-028; A-02–A-05, A-07–A-08, A-11–A-18, A-21, A-23–A-25.

## Hosted purposes

Main may open only configured HTTPS destinations for these closed purposes:

- `factor_enroll`
- `mfa_challenge`
- `recovery_codes_acknowledge`
- `recovery_codes_regenerate`
- `lost_factor_recover`
- `primary_credential_recover`
- `factor_disable`
- `factor_replace`
- `primary_credential_change`
- `recovery_identity_change`

Renderer supplies only the named purpose/action. Main derives the destination, current profile/session generations, account-security operation, policy, locale, and safe return destination. No caller supplies a URL, redirect, issuer, provider, account identifier, session, factor ID, or arbitrary purpose.

Secret entry and one-time display remain hosted. The hosted surface may handle provider session material under F010's approved model, but passwords, TOTP values/seeds, recovery codes, tokens, cookies, and raw provider errors never return through the native callback or Electron bridge.

## Return grammar and meaning

F011 reuses F010's exact inert callback parser and destination/attempt admission. The logical F011 result adds only bounded references already known to main:

```text
security_return := operation_reference + purpose + result_hint
result_hint := completed | cancelled | failed | reconcile
```

The hint starts reconciliation; it does not prove provider or service state. Duplicate/unknown fields, arbitrary query/fragment data, nested URLs, raw codes, account/factor identifiers, provider messages, and secret-shaped fields are rejected. Replay or a result for another profile/session/security generation has no effect.

If the chosen F010 callback transport cannot safely bind F011 operation returns, F029 must prove an exact replacement before packaged release. The allowlist is never broadened as a workaround.

## Protected local handoff

Main stages one `ProtectedSecurityHandoff` from `../data-model.md` before browser launch. It contains only profile/session generations, operation/purpose, expected security generation, destination ID, expiry, and safe lifecycle. The existing protected identity store owns atomic write/no-empty-replacement behavior.

On restart, main validates the record against current profile/session protection and then reconciles online. Unreadable, mismatched, expired, unsupported, or cross-profile records enter a safe locked/recovery state and preserve prior protected bytes. They never generate an empty account profile or reassign local work.

## Named renderer surface

The separate F011 versioned facade exposes only:

- `identitySecurity.getState()`
- `identitySecurity.start(action)` where `action` is the closed safe action set
- `identitySecurity.cancel()`
- `identitySecurity.acknowledgeRecoveryCodes()`
- `identitySecurity.retryReconciliation()`
- `identitySecurity.onStateChanged(listener)` returning an unsubscribe function

Existing F004 sender/frame/origin/document/profile-generation admission applies to every call and event. Payloads reject unknown keys and have explicit string/list/byte limits. F010's `identity-contracts.ts` secret-shaped field-name rejection remains unchanged; F011 uses `identity-security-contracts.ts` and must be at least as strict.

No method accepts or returns a password, code, token, seed/QR, raw callback/provider payload, URL, issuer, subject, session ID, factor ID, account identifier, SQL, path, shell input, arbitrary operation name, workspace, role, or provider policy override.

## Renderer-safe state

The v1 DTO contains only:

- protocol version and one closed lifecycle;
- safe policy status: unavailable/optional/required;
- product readiness: not configured/setup required/in progress/recovery codes pending/ready/reset required/reconciliation required/upgrade required;
- factor category and bounded user label when safe, never secret/provider internals;
- aggregate recovery status with no code/count guessing detail beyond approved provider-safe wording;
- closed current/other-session consequence classes;
- local protection consequence class;
- localized heading/message/warning/action keys plus safe parameters;
- diagnostic reference; and
- flags for online requirement, retained encrypted data, and pending reconciliation.

Main and preload both validate plain-data copies. Events are bounded and late events from old profile/session/security generations are dropped. Provider exceptions and service payloads are mapped before crossing preload.

## Lifecycle

```text
unavailable | factor_not_configured | factor_setup_required
    -> reauthentication_required
    -> browser_open
    -> provider_in_progress
    -> reconciliation_required
    -> recovery_codes_pending
    -> ready
```

Terminal or recoverable branches include `cancelled`, `expired`, `rate_limited`, `sign_in_required`, `protection_unavailable`, `local_recovery_required`, `upgrade_required`, and `contact_support`. No branch synthesizes success from a callback hint or local cache.

## Teardown and account isolation

Sign-out/account switch/security revocation order:

1. increment the relevant local profile/session authority generation;
2. cancel or detach the pending hosted operation and reject late returns;
3. stop provider/service calls and subscriptions;
4. close account-bound security views and dispose renderer DTOs;
5. invalidate the F010 session according to explicit scope and lock local keys/persistence; and
6. retain encrypted prior-profile bytes under the original binding unless a separate deletion workflow is explicitly authorized.

Cloud recovery for account A never attaches profile B, selects a workspace, restores membership, opens an unreadable cache, or exposes whether another local profile exists.

## UI boundary

Use one native `AccountSecurityPanel` with existing house buttons/dialog/status primitives. It displays safe readiness, session/local-data consequences, and named actions; it does not duplicate hosted secret forms. Starting a hosted flow announces that the browser opened and focuses the waiting/cancel region. Return focuses the result heading or first safe recovery action.
