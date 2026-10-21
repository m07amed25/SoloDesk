# Trusted Identity and Session Contract

## Scope

Defines code exchange, identity validation, protected session ownership, restart validation, and sign-out. It establishes identity only—not workspace or offline authority. Trace: FR-005, FR-008, FR-009, FR-014–FR-018; A-02, A-04, A-10, A-12, A-15, A-16.

## Exchange boundary

The main-process session owner (or an explicitly selected first-party broker) exclusively owns exchange. The baseline keeps PKCE ownership in main. Exchange sends the one-time code, matching protected verifier, identical redirect destination, and configured public client identity over TLS. Renderer, hosted UI scripts, logs, and ordinary persistence never receive these values.

The result is accepted only after:

- provider discovery/keys are pinned to the approved issuer configuration;
- signature and allowed algorithm validate;
- exact issuer, audience and authorized party validate;
- expiry/issued-at and bounded skew validate against trusted time;
- response issuer, state and OIDC nonce match when configured/supported;
- the code is one-time and belongs to this client/destination/attempt; and
- `(issuer, subject)` is present as the stable verified account identity.

An ID token is identity evidence, not an API bearer. APIs independently validate access-token issuer/audience/expiry and current authorization.

## Safe verified-account projection

Renderer receives a versioned DTO with only lifecycle status, optional bounded display name/identifier, current profile ID as a safe opaque reference, and safe next actions. Email/display data is non-authoritative. No workspace, role, membership, lease, token lifetime details, or hidden-account existence is projected.

## Protected session

Reusable credentials are stored only through the approved F006-protected main-process adapter. Ordinary metadata stores an opaque credential reference and the model in `../data-model.md`. Refresh tokens must be rotated or sender-constrained by the selected provider policy before release. Secret replacement is staged and verified before the prior valid reference is retired.

On restart, main opens the profile/protected binding, checks account/profile/generation/format match, and validates/refreshes online as policy requires. `enrolled` is never inferred from the presence of a token alone. Missing, rejected, revoked, mismatched, unreadable, or unsupported state enters `sign_in_required`, `protection_unavailable`, or `recovery_required` without creating an empty workspace/profile.

## Sign-out and late-result fence

Sign-out increments profile/session generation before asynchronous teardown; cancels attempts; stops online authority/subscriptions/requests; invalidates or removes reusable credentials according to the approved provider policy; and locks keys/persistence. A late callback, refresh, or enrollment response from an older generation cannot restore authority.

The user is told whether encrypted local data is retained. Sign-out does not delete, upload, transfer, relabel, or reassign unsynchronized work. Local-data deletion is a separate explicit later workflow.

## Configured method gate

F010 enables one pre-approved sandbox method. Public registration/email verification stays disabled until sender/domain/delivery/abuse/support readiness is proven. Additional providers, MFA and recovery remain Q-08/F011 scope.
