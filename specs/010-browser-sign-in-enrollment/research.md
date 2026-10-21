# Phase 0 Research: F010 Browser Sign-in and Native Enrollment

**Date**: 2026-10-20  
**Scope**: Planning research only. No provider, hosted environment, callback registration, database migration, or application code was changed.

## 1. Native authorization flow

**Decision**: Treat Electron as a public native OAuth client. Use Authorization Code with PKCE S256 in the OS default browser. Generate a fresh high-entropy verifier for every attempt; distribute no reusable client secret.

**Rationale**: [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html) requires external user-agents and PKCE for public native clients. [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) requires PKCE for public clients and recommends only challenge methods that do not expose the verifier; S256 is the current method. This also matches PLT-002 and keeps credentials outside Electron.

**Alternatives considered**:

- Embedded webview: rejected because it exposes credentials/cookies to the app boundary and violates FR-002.
- Implicit flow: rejected because tokens return through the browser redirect and PKCE cannot protect it.
- Embedded shared client secret: rejected because a distributed desktop app cannot keep it confidential.

## 2. Attempt proof and identity-result validation

**Decision**: Keep PKCE verifier, unpredictable `state`, and OIDC `nonce` distinct and bound to one attempt, profile generation, configured issuer/audience, and exact return destination. Validate response issuer where supported, token signature/JWKS and allowed algorithm, exact issuer, audience/authorized party, expiry/issued time with bounded skew, nonce, and stable `(issuer, subject)` account identity before authority changes.

**Rationale**: PKCE protects code possession, `state` correlates the callback to SoloDesk's local attempt, and `nonce` binds the OIDC authentication result. F010's profile/generation rule is stronger than relying on PKCE alone. OIDC account identity must not use a mutable email as its primary key. See [OIDC Core ID Token validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation) and [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html).

**Alternatives considered**:

- PKCE alone: standards-permitted in some deployments, but insufficient for the specified profile/generation correlation and OIDC replay defense.
- Email as account ID: rejected because it is mutable and may not be present or verified uniformly.
- Trusting decoded JWT fields without signature/issuer/audience verification: rejected; the current F008 synthetic parser is test scaffolding, not an F010 identity verifier.

## 3. Hosted flow ownership

**Decision**: For the smallest implementation, the desktop main process owns the PKCE verifier/state/nonce and exchange. The separate hosted English/Arabic entry/status surface is stateless with respect to reusable secrets: it validates a bounded configured start request and continues to the selected identity provider without storing the verifier or returning tokens. If the selected provider cannot support this ownership model, stop at the Q-08 gate rather than silently moving the verifier to the browser.

**Rationale**: A verifier created in browser storage cannot safely be used by Electron to redeem the same code. Main ownership permits one protected storage adapter and one trusted exchange boundary. The installed `@supabase/supabase-js` exposes PKCE code exchange, but its exact storage/overlapping-flow/provider behavior must be proven with a custom non-renderer adapter. [Supabase's PKCE guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow) documents same-browser verifier requirements and one-time code exchange.

**Alternatives considered**:

- Hosted/browser owns the full PKCE flow: rejected for the baseline because it would require a new backend-brokered one-time native grant to avoid returning tokens.
- Custom backend authorization server that exchanges provider code and issues a second code: deferred; materially more security-critical code and justified only if the selected provider forces it.
- Renderer Supabase client: rejected because current renderer-side browser/cookie storage conflicts with FR-014.

## 4. Callback transport and grammar

**Decision**: Keep the behavioral contract transport-neutral. Use loopback IP (`127.0.0.1` or `[::1]`) on an OS-assigned ephemeral port as the first sandbox baseline if the selected provider permits RFC 8252 variable ports; open the listener only for the attempt, accept one bounded request, and close it. Prefer claimed HTTPS only where F029 proves OS/domain association; keep a reverse-domain private scheme as a packaged fallback. Every transport carries the same exact inert grammar and PKCE/state/nonce controls.

**Rationale**: [RFC 8252 sections 7–8](https://www.rfc-editor.org/rfc/rfc8252.html) defines claimed HTTPS, loopback IP, and private-use schemes, recommends IP literals rather than `localhost`, and requires PKCE because interception remains possible. Electron has platform-specific cold/running-instance protocol delivery; packaged registration is not currently configured and belongs to F029.

**Alternatives considered**:

- Assume `solodesk://` on all targets: rejected because scheme collision/registration and packaged behavior are unproved.
- Fixed local port: rejected because it creates avoidable conflicts and is not the native-app recommendation.
- Wildcard redirect matching or callback-controlled destination: rejected by [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) exact-match/open-redirect guidance.

## 5. Callback parsing and one-time consumption

**Decision**: Parse the callback as inert identity-return input before ordinary deep-link routing. Accept one exact transport/path and a small allowlist (`code` xor safe `error`, `state`, and response `iss` where configured). Reject fragments, duplicate/unknown fields, ambiguous encoding, nested destinations, over-bound input, wrong profile/generation/audience/destination, expired/cancelled/superseded attempts, and any result without one live attempt. Atomically change `pending` to `consumed` before authority effects.

**Rationale**: Exact matching and no open redirect are OAuth BCP requirements. F004 already centralizes cold-start, second-instance, and macOS `open-url` input; extending that closed ingress once avoids inconsistent parsers. Compare-and-set consumption provides one effect under concurrent delivery.

**Alternatives considered**:

- Treat callback as a general `solodesk://open/...` route: rejected because identity input could gain navigation/command semantics.
- Ignore unknown parameters: rejected because duplicates/ambiguity are explicit F010 attack cases.
- Deduplicate only in memory: rejected because a valid bounded restart path and concurrent delivery need durable protected state or explicit cancellation.

## 6. Attempt concurrency and restart

**Decision**: Permit only one active attempt per profile generation. Starting another attempt atomically supersedes the first and deletes/invalidates its protected proof. A still-live attempt may survive restart only when its complete secret material is stored under the approved protected F006/F007 path; otherwise startup cancels it and offers a new attempt.

**Rationale**: Supabase's stable PKCE storage can overwrite earlier verifier state when flows overlap. Serialization exactly matches the spec's “latest explicitly active attempt” rule and reduces state surface. Restart behavior stays truthful rather than accepting a callback whose verifier or generation cannot be proved.

**Alternatives considered**:

- Multiple concurrent flows with flow IDs: rejected as unnecessary scope and dependent on provider-specific experimental behavior.
- Always persist attempt secrets: rejected until protected storage is proven available.
- Accept a callback after losing attempt material: rejected as fail-open.

## 7. Session and credential storage

**Decision**: Keep verifier, state, nonce, code, refresh/access tokens, cookies, and unrestricted provider errors out of renderer state, localStorage, callback retention, ordinary SQLite fields, logs, analytics, crash/support artifacts, exports, and audit. Use a main-only protected storage adapter and opaque credential reference. Require provider refresh-token rotation or sender-constraining before release; use short-lived audience-restricted access tokens.

**Rationale**: Constitution Principle V and FR-014 require fail-closed secret isolation. [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) requires replay defenses for public-client refresh tokens. [Supabase API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys) distinguishes publishable client keys from server-only elevated keys; service-role/secret keys never enter the desktop.

**Alternatives considered**:

- Renderer `localStorage` or cookies: rejected.
- Ordinary encrypted workspace tables: rejected because authentication precedes a workspace and session material needs a narrower lifecycle.
- Service-role key in the desktop: rejected because it bypasses tenant controls and is not a client credential.

## 8. Verified identity versus product authority

**Decision**: Authentication yields only a `VerifiedAccount` with safe display fields and session status. It creates no workspace, membership, role, offline lease, cache, or business command authority. F010 ends at an enrolled account awaiting F012 onboarding.

**Rationale**: This directly preserves FR-009/FR-025 and Constitution Principle III. It prevents “no workspace yet” from being misrepresented as an empty tenant and keeps later authorization checks independent from identity proof.

**Alternatives considered**:

- Auto-create a personal workspace: rejected as F012 scope and an unauthorized business effect.
- Reuse the F009 workspace command claim with a placeholder workspace: rejected because it fabricates tenant authority.

## 9. Enrollment idempotency and readiness

**Decision**: Reuse F009's canonical digest, immutable receipt, transactional evidence, and reconciliation pattern, but create an account-scoped enrollment intent/result because no workspace exists. Derive account identity from the verified session; derive installation context in trusted native code. Identical retries reuse one intent and result, changed-payload reuse is rejected, and outcome-unknown retries reconcile before replacement.

**Rationale**: A single database transaction can enforce one device enrollment, one receipt, and one redacted evidence event. A separate protected local commit is still required, so readiness is a fence rather than a single service response.

**Alternatives considered**:

- Reuse workspace-scoped F009 tables unchanged: rejected.
- Generate a new device ID on every retry: rejected because lost responses would create duplicates.
- Treat successful server response as local readiness: rejected because protected credential/profile writes can still fail.

## 10. Atomic local readiness and recovery

**Decision**: `enrolled` is true only when the verified account matches the immutable profile binding, the authoritative enrollment is confirmed, the protected session write and profile/account binding are committed, protection is usable, and all evidence belongs to the current generation. Any partial or unknown combination remains locked, protection-unavailable, or recovery-required.

**Rationale**: This is the smallest rule that covers service-accepted/local-failed, local-staged/response-lost, restart, wrong-account, sign-out race, and no-empty-replacement scenarios.

**Alternatives considered**:

- Distributed all-or-nothing transaction across cloud and device: not available.
- Best-effort cleanup after partial failure: rejected because deletion can destroy recoverable data and cannot undo a committed device row.
- “Ready then repair later”: rejected as a protected-data exposure risk.

## 11. Renderer and external-launch boundary

**Decision**: Main constructs the authorization URL from static trusted configuration plus generated encoded parameters, validates exact HTTPS origin/path, and then calls Electron `shell.openExternal`. Preload exposes only named identity operations/status subscriptions; callback URL, verifier, tokens, filesystem paths, arbitrary URL opening, and generic IPC never cross to renderer.

**Rationale**: Electron explicitly warns against `shell.openExternal` with untrusted input in its [security checklist](https://www.electronjs.org/docs/latest/tutorial/security#15-do-not-use-shellopenexternal-with-untrusted-content). F004 already supplies sender/frame/origin/profile-epoch checks and subscription disposal.

**Alternatives considered**:

- Renderer constructs or opens provider URLs: rejected.
- Generic `auth.invoke`/raw event payload: rejected because it broadens the trust surface.
- Rebuild the IPC framework: rejected; existing F004 patterns are sufficient.

## 12. Product and deployment decisions intentionally left open

**Decision**: Preserve, rather than guess, the following release gates: production sign-in method/public registration/MFA/recovery and session policy (Q-08); hosted region/budget/limits (Q-02); protected credential adapter approval (Q-07/F006); final callback transport, client IDs, domains, association files, package registration and signing (F029); exact attempt/bounds/rate/retention policy; installation identity uniqueness; and fluent Arabic/native assistive-technology acceptance.

**Rationale**: The logical contracts can be designed and locally tested with a pre-provisioned sandbox identity. These choices affect product policy, infrastructure, packaging, or evidence and are not safe technical defaults.

**Alternatives considered**:

- Promote a sandbox method/configuration to production: rejected.
- Add multiple providers “for flexibility”: rejected under Ponytail/YAGNI.
- Block all planning until every deployment value is known: rejected because the invariant design and validation contract are independently useful.
