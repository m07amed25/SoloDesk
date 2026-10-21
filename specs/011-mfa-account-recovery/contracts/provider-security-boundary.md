# Provider Security Boundary Contract

## Scope

Defines which F011 authentication responsibilities belong to the configured provider and which safe state SoloDesk may derive. Trace: FR-001–FR-011, FR-013, FR-017–FR-018, FR-022–FR-024; A-01–A-13, A-18–A-22.

## Capability gate

The Supabase adapter is usable for F011 only when an isolated probe records all of:

- exact `@supabase/supabase-js` version, Auth server/project version or capability identity, project configuration, and test time;
- TOTP enroll/challenge/verify/list/unenroll behavior and `aal1`/`aal2` transitions;
- experimental recovery-code generate/status/verify/regenerate/unenroll behavior, including one-time consumption and old-set invalidation;
- live-session and sign-out consequences for factor verification, removal, recovery, and credential change;
- provider rate/abuse behavior at and beyond approved boundaries; and
- Q-08 approval of this exact experimental dependency and production policy.

Documentation or SDK types alone do not pass the gate. A failed, missing, ambiguous, or incompatible probe blocks implementation/release. This contract does not authorize a custom recovery-code implementation as fallback.

## Provider-owned state

The provider exclusively owns:

- factor enrollment secrets, QR/TOTP seed material, challenge and verification values;
- verified factor records and authentication method history;
- recovery-code plaintext, digests, generation, remaining/consumed state, verification, regeneration, and unenrollment;
- passwords, primary recovery artifacts, email/identity verification, cookies, access/refresh tokens, and provider sessions; and
- provider endpoint abuse limits and security effects.

SoloDesk may consume only the safe projection in `../data-model.md`. It never persists or logs provider secrets/raw responses.

## Trusted session and authority checks

Before any protected product action or accepted security-state transition, the trusted boundary must derive and validate:

1. exact configured issuer and audience/client;
2. stable verified `(issuer_id, subject_id)` matching the F010 profile;
3. unexpired access authority and a live provider `session_id` for that account;
4. actual current and next AAL plus allowed authentication methods;
5. sufficient AAL/recent proof for the exact purpose;
6. supported provider capability/policy versions; and
7. current SoloDesk security generation.

Renderer state, hosted return fields, user metadata, a locally remembered success, or a signed-but-revoked JWT alone is insufficient. Loss of online authority returns a safe `online_required`, `sign_in_required`, or `reconciliation_required` result and grants nothing.

## Factor enrollment baseline

The first F011 release supports one configured TOTP factor:

1. A purpose-bound operation with expected security generation is admitted after recent approved reauthentication.
2. The hosted surface calls provider enrollment and displays the secret/QR only there.
3. Provider challenge/verify proves the pending factor for the same account and operation.
4. The trusted boundary independently observes the verified factor and resulting AAL/session consequences.
5. At `aal2`, the hosted surface generates one provider recovery-code set and shows it once.
6. The user acknowledges saving it; the service reconciles provider status and sets SoloDesk readiness to `ready`.

Duplicate, concurrent, expired, superseded, wrong-account, wrong-purpose, or stale-generation completion has no additional SoloDesk effect.

### Provider activation versus SoloDesk readiness

Provider factor verification may make that factor usable immediately and may end other sessions before SoloDesk receives recovery-code acknowledgment. SoloDesk must represent the interim state as `recovery_codes_pending`, not fully recoverable or product-ready.

If A-05/FR-005 are interpreted to require the provider itself to withhold all authentication authority until acknowledgment, this provider flow cannot satisfy the requirement. Q-08 must explicitly accept the provider-active/product-not-ready interpretation, or implementation must stop for a specification/provider change. The UI and evidence must never imply atomic provider activation and application acknowledgment.

## MFA challenge

A challenge is valid only for its verified account, provider factor, originating sign-in/reauth attempt, purpose, expiry, live session where applicable, and current security generation. Provider verification advances only that attempt. Proof values are never copied into SoloDesk operations.

Missing, malformed, wrong, expired, already consumed, superseded, replayed, cross-account, cross-purpose, rate-limited, or revoked-session proof produces no product authority. Provider safe retry/recovery behavior is preserved without revealing account existence or factor detail.

## Recovery-code use and rotation

- The hosted provider client submits a recovery code directly to provider verification for the intended account/session.
- Successful verification consumes that code once and must produce provider `aal2` before a factor reset/replacement step proceeds.
- SoloDesk observes the AAL/factor/recovery result; it never treats an inert hosted return as proof.
- Regeneration requires current `aal2`, replaces the provider set, and makes all old unused codes invalid according to the proven capability.
- Plaintext is shown only in the provider generation/regeneration response on the hosted page. A lost response is never redisplayed; after reconciliation and reauthentication, the user may deliberately regenerate again.
- Exhausted, invalid, unsupported, or unavailable recovery codes offer only an approved provider recovery or Q-08 support path. There is no silent factor deletion or support bypass.

## Session consequences

The adapter records and communicates observed consequences, not assumed policy:

- factor verification may promote the current session to `aal2` and end other sessions;
- factor removal/replacement or primary credential recovery may downgrade, end, or require reauthentication for sessions;
- explicit sign-out uses a named scope; library defaults are not relied upon; and
- provider token revocation may not instantly erase a previously issued access token, so protected service operations also validate live session/security generation.

Ending a provider session does not remotely erase downloaded data. Every result uses the closed `SessionConsequence` projection and names the next action.

## Prohibited shortcuts

- No application-generated TOTP or recovery codes.
- No recovery-code plaintext/digest/pepper database.
- No provider service/admin factor deletion as the ordinary lost-factor flow.
- No client-supplied AAL, account, session, factor status, or provider result as authority.
- No offline/cached MFA success.
- No broad service-role credential in Electron, renderer, or hosted browser JavaScript.
- No multiple-factor/passkey/remembered-device framework in F011.
