# Phase 0 Research: F011 MFA and Account Recovery

**Date**: 2026-10-21
**Scope**: Resolve implementation-shaping choices for [the F011 specification](spec.md) without selecting the still-open production identity policy or authorizing implementation.

## 1. Provider MFA baseline

**Decision**: Use the already installed Supabase Auth adapter for one TOTP factor in the smallest F011 release. Treat provider enrollment, challenge, verification, factor listing, unenrollment, and Authenticator Assurance Level (AAL) as provider-owned state. Keep the application contract provider-neutral enough to reject or replace the adapter later.

**Rationale**: Supabase Auth currently supports TOTP enrollment/challenge/verification, exposes `aal1`/`aal2`, and requires `aal2` to unenroll a verified factor. The repository already selects Supabase first, installs `@supabase/supabase-js`, and implements a trusted F010 session adapter. One TOTP factor satisfies the specification without adding SMS cost/abuse, passkey beta risk, or a second identity provider.

**Alternatives considered**:

- Phone MFA: rejected for the first slice because it adds a sender, country, cost, delivery, SIM-swap, and abuse policy that Q-08 has not approved.
- Passkeys: rejected for F011 because current support is beta and the feature explicitly requires recovery codes for the configured MFA flow.
- Multiple active factors: supported by the provider but deferred; one factor plus recovery codes is the bounded requirement.
- A custom TOTP implementation: rejected because factor secret custody and verification belong with the selected identity provider.

**Sources**: [Supabase MFA guide](https://supabase.com/docs/guides/auth/auth-mfa), [TOTP guide](https://supabase.com/docs/guides/auth/auth-mfa/totp), [MFA API reference](https://supabase.com/docs/reference/javascript/auth-mfa).

## 2. Recovery-code ownership

**Decision**: Keep recovery codes provider-owned and use Supabase Auth's experimental recovery-code API only after an exact capability probe proves that the installed SDK, deployed Auth server, and managed project all support it, and Q-08 explicitly accepts the experimental dependency. SoloDesk stores only safe readiness/generation metadata and evidence; it never stores code plaintext or digests. If that gate fails, F011 implementation is blocked until the provider or specification changes.

**Rationale**: The current JavaScript reference documents experimental generation, status, verification, regeneration, and unenrollment operations, while the general MFA reference still says recovery codes are unsupported. The installed SDK contains the experimental surface, but documentation plus a type signature is not proof that the target project enables it. Using the provider capability is the smallest complete design and avoids creating a second authentication factor store, online-guessing protocol, cryptographic key lifecycle, and remote factor-reset saga inside SoloDesk.

**Selected baseline after the gate passes**:

- the provider chooses the code count, format, entropy, verification behavior, and storage;
- generation/regeneration occurs only from a current `aal2` session;
- plaintext is shown once on the separately hosted security surface and never crosses the Electron bridge;
- verification consumes one code and upgrades the current provider session from `aal1` to `aal2`;
- regeneration invalidates the prior set; SoloDesk records only aggregate readiness and acknowledgment state;
- the capability probe is repeated for the pinned production versions before release.

**Alternatives considered**:

- A custom recovery-code database: rejected because it duplicates a security-critical provider capability and adds a new secret/digest store, rate limiter, and reset protocol.
- Storing codes in the protected desktop profile: rejected because recovery must work after device loss and must not couple cloud recovery to one local key.
- Backup TOTP factor instead of codes: rejected because it contradicts the current F011 requirement; it remains a later Q-08 option.

**Sources**: [experimental generation](https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-generate), [experimental verification](https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-verify), [experimental status](https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-getstatus), [general MFA reference](https://supabase.com/docs/reference/javascript/auth-mfa).

## 3. Hosted surface versus Electron renderer

**Decision**: Extend F010's separately hosted bilingual identity surface for MFA enrollment/challenge, password recovery, recovery-code display/input, and sensitive reauthentication. Electron opens only allowlisted security purposes and receives an inert result hint; main reconciles authoritative state before updating the renderer.

**Rationale**: This keeps TOTP enrollment secrets, verification values, recovery codes, password reset material, provider errors, and provider session handling outside the unprivileged renderer. It also reuses the system-browser/PKCE/profile-generation boundary already required by F010. The native renderer needs only safe security status, session consequences, and named actions.

**Alternatives considered**:

- Use the Electron renderer as the Supabase MFA client: rejected because it broadens token and secret exposure and duplicates the hosted recovery surface.
- Embed a remote identity page in Electron: rejected by the constitution and F010 trust boundary.
- Build a second hosted application: rejected; F011 adds routes and server actions to the F010 hosted identity surface.

## 4. MFA enforcement and current session proof

**Decision**: Enforce required AAL and live-session status at trusted service/database boundaries for every F011 security operation. UI gating is advisory only. Extend F010's verified-session projection with bounded `aal`, `session_id`, and authentication-method evidence; never authorize from user metadata or renderer claims.

**Rationale**: Supabase encodes AAL in the access token, but JWT claims may remain usable until expiry after a sign-out or factor change. Sensitive operations must also prove that the `session_id` still exists for the authenticated user. Existing F010 database helpers already perform a live `auth.sessions` check; F011 strengthens and reuses that pattern rather than trusting its edge JWT verifier alone.

**Alternatives considered**:

- Check AAL only in React: rejected because it is bypassable.
- Check the signed JWT only: rejected because revoked access tokens may remain valid until expiry.
- Put authorization in user-editable metadata: rejected by the Supabase security contract.

**Sources**: [Supabase MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa), [user sessions](https://supabase.com/docs/guides/auth/sessions), [sign-out scopes](https://supabase.com/docs/guides/auth/signout).

## 5. Enrollment and recovery-code acknowledgment

**Decision**: Model provider factor verification and SoloDesk recovery readiness as a reconciled two-system workflow. Provider verification may activate the factor first; SoloDesk then creates one recovery-code set and waits for explicit acknowledgment. Until acknowledgment, the account security profile is `recovery_codes_pending`, not falsely `ready`.

**Rationale**: Supabase activates a factor when verification succeeds and logs out other sessions; it cannot join that change to a SoloDesk database transaction. A durable operation record makes every partial state explicit. If the code response is lost, plaintext is never re-shown; the user reauthenticates with the factor and deliberately rotates to a new set.

**Alternatives considered**:

- Mark setup complete immediately after provider verification: rejected because recovery-code handoff is part of the accepted setup.
- Store the plaintext response for redisplay: rejected by FR-005/FR-023.
- Attempt a distributed transaction with the provider: unavailable and misleading.

**Source**: [Supabase MFA enroll reference](https://supabase.com/docs/reference/javascript/auth-mfa-enroll).

## 6. Recovery-code factor reset

**Decision**: The hosted recovery surface submits a code directly to the provider's experimental verification operation for the current `aal1` session. Successful verification consumes the code and upgrades that session to `aal2`; the user may then use the provider's ordinary verified-factor unenrollment and enrollment operations. SoloDesk wraps the sensitive sequence in one purpose-bound operation and reconciles factor/AAL/session state before declaring recovery complete.

**Rationale**: This uses the recovery code for its intended provider-native purpose and avoids server-admin factor deletion. The durable SoloDesk operation is still needed because provider verification, factor replacement, recovery-code rotation, and app evidence cannot share a transaction, but SoloDesk never claims or authenticates the code itself.

**Alternatives considered**:

- App-verify the recovery code and mint equivalent authority: rejected because SoloDesk cannot mint a provider `aal2` session.
- Call ordinary unenroll at `aal1`: rejected by the provider contract.
- Use the provider admin factor-delete API as the normal recovery path: rejected because provider-native verification supplies the required `aal2` authority with less privileged code.
- Restore access through a support override: excluded until Q-08 defines verified manual escalation.

**Sources**: [experimental recovery verification](https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-verify), [MFA unenroll reference](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll).

## 7. Password and primary-credential recovery

**Decision**: Use the provider's PKCE password-recovery flow on the hosted identity surface when password sign-in is enabled. Return a neutral request result, keep reset links one-time and allowlisted, require the provider's secure password update/reauthentication behavior, and then apply the configured session policy. For passwordless methods, use the approved equivalent primary-credential recovery path rather than inventing a password.

**Rationale**: Supabase's reset request is neutral for absent accounts and its hosted recovery flow can update the verified user without exposing credentials to Electron. Production email delivery still needs a verified sender, rate/abuse limits, and support readiness.

**Alternatives considered**:

- Custom password reset storage: rejected because the provider already owns password hashing and reset validity.
- Native desktop password form: rejected by F010/F011's hosted credential boundary.
- Promise the built-in SMTP service for production: rejected because it is best-effort and heavily limited.

**Sources**: [password recovery](https://supabase.com/docs/guides/auth/passwords), [password security and reauthentication](https://supabase.com/docs/guides/auth/password-security), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 8. Sensitive reauthentication and session consequences

**Decision**: Require a current `aal2` session plus provider reauthentication where supported before factor removal/replacement, recovery-code rotation, password/email changes, or recovery-identity changes. Record actual provider consequences, refresh/downgrade current AAL after factor removal, and use explicit sign-out scope rather than library defaults.

**Rationale**: Provider behavior differs by operation: factor enrollment ends other sessions, admin deletion ends sessions, ordinary unenrollment requires AAL2, and sign-out scopes have different reach. The plan must not claim remote deletion or rely on a default scope that varies across client libraries.

**Alternatives considered**:

- A fixed “recent login” timestamp in the renderer: rejected because it is not authoritative.
- Always global sign-out: rejected as an unapproved policy; the selected scope is Q-08-controlled and shown to the user.
- Keep stale local sessions after a security-generation change: rejected; main invalidates its generation and revalidates before protected actions.

## 9. Abuse controls

**Decision**: Use provider rate limits and abuse controls for provider-owned password, MFA, and recovery-code endpoints. SoloDesk adds no second rate-limit store; its own authenticated security-operation handler accepts only low-frequency lifecycle updates and applies the existing command-gateway admission/idempotency boundary. Q-08 must verify the provider's recovery-code limits for the exact deployed capability.

**Rationale**: SoloDesk does not receive or verify recovery codes, so an app-owned online-guessing bucket would be redundant and could not protect the actual verification endpoint. Reusing the provider and existing gateway is smaller and keeps network/account data out of a new persistence surface.

**Alternatives considered**:

- A separate Postgres recovery-rate bucket: rejected because there is no app-managed recovery verifier to protect.
- In-memory edge limits: rejected because instances restart and scale independently.
- New cache/rate-limit vendor: unnecessary for the bounded feature.

**Source**: [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## 10. Server data and privilege boundary

**Decision**: Keep the small F011 account-security state, operation, and evidence extensions in the existing private schema, revoke `PUBLIC`/`anon`/`authenticated`, enable RLS as defense in depth, and expose only bounded authenticated lifecycle handlers through the existing command-gateway deployment. Provider MFA and recovery-code calls stay on the hosted Auth client; the handler derives the account and live session, checks expected security generation and request digest, and independently reconciles the provider result before calling private functions with narrowly held server authority.

**Rationale**: Security operations and safe readiness state are not general client data. Existing F009/F010 migrations already establish private tables, explicit revokes, current-session checks, and idempotent command patterns. Reuse avoids a second privileged service; provider ownership avoids storing recovery digests or failure counters at all.

**Alternatives considered**:

- Public tables with owner RLS: rejected because these records need no direct Data API exposure.
- A new microservice: rejected; the current Edge Function/command gateway is sufficient.
- Direct service-role calls from Electron or hosted JavaScript: prohibited.

## 11. Identifiers, schema types, and migrations

**Decision**: Reuse the project's current UUID and `(issuer_id, subject_id)` identity conventions, `timestamptz` for authoritative instants, `bigint` for monotonic security generations, text plus checks for closed states, explicit foreign keys/indexes, and short transactions. Reuse the existing hexadecimal request-digest convention where idempotency needs it. Create the implementation migration through the repository's imperative Supabase workflow; do not add an ID extension solely to change key style.

**Rationale**: Consistency with F010 reduces conversion and migration risk. The remaining rows are few and account-scoped, so UUID v4 locality is not a measured issue. Foreign-key and lookup indexes are still required, and external provider calls remain outside database transactions.

**Alternatives considered**:

- UUIDv7 extension: sound for high-volume new schemas but unjustified for this small extension.
- Database enum types: rejected because checked text is easier to extend compatibly in the existing migration style.
- Provider calls while holding row locks: rejected because it increases contention and cannot make the remote call atomic.

## 12. Native state and reconciliation

**Decision**: Add a narrow identity-security module composed inside the existing F010 identity coordinator. It stores only a sealed/profile-bound security attempt reference and safe outcome metadata, opens allowlisted hosted purposes, invalidates late results by local authority generation, and reconciles service/provider state before emitting a closed renderer-safe DTO. It never creates a second session owner or stores recovery codes/factor secrets.

**Rationale**: F010's coordinator, caller admission, preload, subscription disposal, protected store, and profile-generation fences are the established pattern. A separate F011 DTO keeps F010's version-1 state compatible and prevents MFA-specific states from turning its sign-in lifecycle into a generic state bag.

**Alternatives considered**:

- Add optional MFA fields to every F010 state: rejected because it weakens versioned validation and existing tests.
- Create a generic identity action executor: rejected because a closed small method surface is easier to audit.
- Persist no local attempt: rejected because restart/outcome-unknown recovery is a requirement.

## 13. Evidence, localization, and accessibility

**Decision**: Extend the existing append-only identity security evidence model with additive operation fields and new closed event types. Keep raw provider payloads, codes, digests, identifiers used for public recovery, and network data out of evidence. Use one typed English/Arabic key set across hosted and native surfaces, LTR isolation for codes/identifiers, semantic grouped inputs, paste support, predictable focus, and manual fluent-Arabic/native assistive-technology evidence.

**Rationale**: A second audit store would duplicate F010's identity evidence. Additive fields plus partial uniqueness preserve old enrollment rows and the immutability trigger. Security flows need an explainable event and response path without creating a secret trail.

**Alternatives considered**:

- Copy provider error text: rejected because it may be untranslated or disclose internals.
- One visible input per code character: rejected unless it remains one logical accessible input; visual boxes must not fragment reading order.
- Automated accessibility/localization checks alone: insufficient under the constitution.

## 14. Product and deployment gates intentionally left open

**Decision**: Complete the technical plan using a configured policy object, but do not treat the following as selected production values: mandatory-MFA population, alternate factors, exact code format/count and retry windows, support escalation proof, session invalidation scope, password/SSO methods, recovery delivery provider, region, sender, or service limits.

**Rationale**: These are Q-08/Q-02/product-security decisions, not technical ambiguities. The contracts accept only a versioned approved policy and fail closed when it is absent or inconsistent. Local/sandbox validation may use documented fixture values without turning them into production commitments.

**Alternatives considered**:

- Block all planning until Q-08 is finalized: unnecessary because the architecture and verification boundaries are stable.
- Bake provisional values into code contracts: rejected because that would silently close an open decision.

## Compatibility note (21 October 2026)

The current project uses `@supabase/supabase-js` 2.118.0. Supabase's current documentation confirms TOTP/phone MFA, AAL claims, up to ten factors, AAL2-only verified-factor unenrollment, password recovery, sign-out scopes, and endpoint rate limits. Its experimental JavaScript reference also exposes recovery-code operations, while the general MFA reference still calls recovery codes unsupported. Before implementation, prove the exact SDK/server/project combination in an isolated environment, record Q-08 acceptance, and re-check the Auth changelog. The October 2026 breaking-change feed identifies an upcoming removal of older TLS 1.2 cipher suites; supported SoloDesk runtimes must use modern TLS, but no other F011-specific API migration is currently identified.

## Research resolution

All implementation-shaping choices are resolved for Phase 1 design. Recovery-code capability/Q-08 acceptance, Q-02, sender readiness, and native release evidence remain explicit implementation or production gates rather than unresolved design placeholders. No custom recovery-code subsystem is a permitted fallback without a new specification and threat-model review.
