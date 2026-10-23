# Phase 0 Research: F013 — Member Invitations

**Date**: 2026-10-23
**Status**: Complete for planning; production policy and provider choices remain explicit release gates.

## Inputs Reviewed

- F013 specification, repository constitution, product plan, architecture contracts, data model, security/privacy guidance, UX/localization guidance, and F009–F012 artifacts.
- Existing F008 invitation scaffold in the workspace migration, command gateway, and cloud DTOs.
- Current identity and workspace contracts, including the stable `(issuer, subject)` account identity and F012 active-workspace generation.
- Supabase guidance for [Auth email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [user administration](https://supabase.com/docs/guides/auth/users), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), and [database functions](https://supabase.com/docs/guides/database/functions).

## Decision 1: Invitations Are Not Memberships

**Decision**: Store pending invitations in private server-only relations. Insert into `public.workspace_memberships` only during successful acceptance, and only as an active membership.

**Rationale**: A pending offer is bearer-sensitive, revocable, and recipient-bound; membership is durable authorization. Keeping them separate makes creation, delivery, acceptance, and membership truth independently testable and prevents an `invited` membership row from being mistaken for access.

**Alternatives rejected**:

- Reuse `workspace_memberships.status = 'invited'`: mixes an offer with authorization and preserves the unsafe F008 raw-token design.
- Create an inactive membership before acceptance: still leaks membership semantics into a pre-authorization state and complicates RLS.

## Decision 2: Bind to Verified Identity, Not an Address String

**Decision**: Recipient binding has two forms:

1. If the recipient already has a known verified account, bind immediately to its stable `(issuer, subject)` identity.
2. Otherwise bind to a canonical identifier claim allowed by the approved identity policy. At review and acceptance, resolve that claim against a live verified Auth record and persist the resulting stable identity.

The initial implementation assumes F010's one configured issuer and stores issuer explicitly in invitation acceptance and membership provenance. Supporting multiple issuers is a later schema/policy change, not an alias guess.

**Rationale**: Address presentation, case, Unicode, aliases, and later primary-address changes cannot safely define authorization. A stable identity does. The unresolved Q-08 policy determines which verified identifiers may bind and how verified identity changes are handled.

**Alternatives rejected**:

- Lowercase-email equality alone: insufficient for provider aliases, Unicode, and address changes.
- Link possession alone: converts a forwarded or stolen link into tenant authorization.
- Provider-specific alias heuristics: non-portable and can bind the wrong account.

## Decision 3: Use a Random Single-Use Secret and Store Only Its Digest

**Decision**: For each acceptance generation, the trusted server creates an independent selector and at least 256 bits of cryptographically secure random secret material. It stores the selector and a domain-separated digest, never the raw secret. The delivered URL carries `selector.secret` in its fragment. The hosted surface exchanges and clears the fragment immediately.

**Rationale**: Random opaque secrets need no custom signing scheme or key rotation protocol, and digest-only storage limits damage from a database read. URL fragments are not sent in the initial HTTP request, reducing routine proxy/server-log exposure. A selector permits bounded lookup without scanning token digests.

**Alternatives rejected**:

- F008's `Math.random()` token and plaintext storage: predictable and reusable after storage disclosure.
- A custom signed JWT: adds key lifecycle and claim-validation complexity without removing the need for server-side revocation and single-use state.
- Query-string secrets: more likely to enter request logs, referrers, and analytics.

## Decision 4: Use a Short-Lived Redemption Continuation Across Sign-In

**Decision**: A successful fragment exchange creates a private, short-lived redemption-attempt record and sets a random digest-backed continuation cookie with `Secure`, `HttpOnly`, and an approved `SameSite` policy. The browser clears the fragment before navigation or analytics. Review and acceptance use the continuation plus the current F010 session; neither raw invitation secret nor continuation is available to application JavaScript after exchange.

**Rationale**: A recipient may need to sign in after opening the link. The continuation preserves the attempt without putting invitation authority into Electron, local storage, browser history, or user-visible URLs.

**Alternatives rejected**:

- Keep the secret in React state or local storage: exposes reusable authority to scripts and diagnostics.
- Put the token through Electron deep-link handling: expands the desktop trust boundary and contradicts the planned hosted F010 flow.
- Require the recipient to reopen email after sign-in: simpler internally but unreliable and creates additional exposure/copying paths.

## Decision 5: Treat Supabase Auth Invitation Email as Identity Bootstrap Only

**Decision**: Do not use `inviteUserByEmail()` as workspace invitation authority. If future approved identity onboarding uses it, that remains a separate F010 identity-bootstrap action. Workspace invitation state, identity matching, resend, revocation, and acceptance remain F013 authority.

**Rationale**: Supabase documents the call as an admin/server operation and describes different behavior for new versus existing users. It does not model workspace-specific offer state or safely replace acceptance policy. Auth admin credentials also must remain server-side.

**Alternatives rejected**:

- Equate an Auth invite with workspace acceptance: cannot express workspace, offer revision, revocation, or exactly-once membership creation.
- Call Auth admin APIs from desktop: exposes privileged credentials and bypasses the project's server authority boundary.

## Decision 6: One Pending Invitation and One Current Generation

**Decision**: Enforce at the database level:

- at most one pending invitation per `(workspace, recipient binding)`;
- at most one current generation per invitation;
- at most one active membership per `(workspace, issuer, subject)`;
- immutable invitation and generation identifiers.

Resend locks the invitation, terminalizes the current generation, creates exactly one new current generation, and applies the approved Q-08 expiry policy. Changed access or recipient correction is an explicit authorized replacement, never an implicit parallel path.

**Rationale**: Partial unique indexes turn important race assumptions into invariants. Stable invitation identity preserves history while generation rotation invalidates older links.

**Alternatives rejected**:

- Multiple valid links per invitation: makes revoke/resend and user messaging ambiguous.
- Application-only duplicate checks: race-prone.
- Reuse the same secret on resend: delayed mail could revive an older acceptance path.

## Decision 7: Acceptance Is One Locked Database Transaction

**Decision**: The restricted acceptance function uses database time and locks records in a consistent order: invitation, current generation, then matching membership key. It revalidates current session identity, workspace state, invitation lifecycle/expiry, generation, recipient binding, offer policy/revision, and current inviter/workspace conditions. It then inserts or returns the one matching membership, consumes the generation and invitation, and writes receipt/evidence in the same transaction.

**Rationale**: A transaction and deterministic lock order prevent partial membership/consumption outcomes and reduce deadlock risk. F009 operation receipts make retries and lost responses converge on the original result.

**Alternatives rejected**:

- Client-side check then insert/update: susceptible to replay and time-of-check/time-of-use races.
- Separate membership and invitation commits: can grant access without consuming the invitation or consume without membership.
- Device time for expiry: caller-controlled and inconsistent.

## Decision 8: Delivery Happens After Commit and Has Independent Truth

**Decision**: Creation/resend commits invitation state and a queued delivery-attempt record before provider dispatch. A trusted function then performs one bounded immediate dispatch and records `provider_accepted`, `delivered` only with sufficient provider evidence, `delayed`, `failed`, `bounced`, `rate_limited`, or `unknown`. Failed dispatch does not roll back invitation state or reactivate an old generation. An administrator explicitly resends.

**Rationale**: External provider calls cannot participate reliably in the database transaction. One immediate attempt plus explicit resend is the smallest complete design and avoids inventing a generic F030 queue/worker.

**Alternatives rejected**:

- Provider call inside the transaction: extends locks and still cannot guarantee atomicity with an external service.
- Automatic retry worker now: adds unrequested operational infrastructure, retry policy, and duplicate-delivery risk.
- Treat provider acceptance as recipient delivery or acceptance: overstates evidence.

## Decision 9: Native Administration Uses Narrow Named Commands

**Decision**: The desktop exposes only `getPolicy`, cursor `list`, `create`, `resend`, `revoke`, and `reconcile` invitation operations. Main derives account/session/device, active F012 workspace and workspace generation. The renderer provides bounded form data, `offerRef`, operation ID, invitation ID, expected revision, and cursor where applicable.

**Rationale**: Named bounded methods preserve the existing Electron admission pattern and keep authority-bearing context outside renderer control.

**Alternatives rejected**:

- Generic RPC/SQL bridge: broadens renderer authority.
- Realtime/search/count/detail/token APIs: not required for the core workflow and increase disclosure surface.
- Offline outbox: invitations are online authority changes and must fail as online-required.

## Decision 10: Explicit Grants and Private Relations Enforce the Boundary

**Decision**: Private invitation relations are not exposed through the Data API. Restricted database functions use fixed `search_path`, least-privilege ownership, explicit execute grants, fully qualified names, and caller/session validation. Direct `anon` and `authenticated` mutation of membership and invitation authority is revoked. Public membership reads retain existing tenant RLS with required indexes; acceptance is never authorized by RLS alone.

**Rationale**: Supabase's RLS guidance requires deliberate grants and policies; privileged functions need an especially narrow contract. Tests must exercise the actual database roles, not only service-role behavior.

**Alternatives rejected**:

- Public invitation tables with client RLS: exposes more schema and increases enumeration mistakes.
- Service-role-only application logic without restricted functions: leaves atomicity and privilege boundaries harder to prove.
- Rely on default grants: defaults and platform behavior can change; authority should be explicit.

## Decision 11: Preserve Existing Evidence and Harden the Legacy Scaffold

**Decision**: Reuse F009 receipts and redacted audit/event conventions. The migration invalidates legacy raw invitation tokens, prevents legacy `invited` rows from granting authority or auto-converting, and preserves redacted terminal compatibility evidence. Existing active memberships remain untouched. The F008 invite handler and token-bearing DTOs become unreachable before F013 is enabled.

**Rationale**: This removes unsafe authority without deleting accepted access or audit history. Rollback disables new entry points but never restores plaintext token authority.

**Alternatives rejected**:

- Convert legacy invited rows automatically: their identity, entropy, policy, and delivery provenance are not trustworthy enough.
- Drop all legacy rows: destroys potentially relevant operational evidence.
- Leave both paths active during rollout: creates two authorities and bypass opportunities.

## Decision 12: Policy and Provider Choices Remain Gates

**Decision**: Production has no enabled invitation offer or public delivery until:

- Q-05 approves assignable offers and inviter authority;
- Q-08 approves expiry/resend and identity-change/alias policies;
- Q-02 plus sender, domain, quota, callback, and abuse evidence approves public delivery;
- Q-13 supplies retention rules for identifiers and provider references.

Tests use clearly labeled synthetic policies and recipients.

**Rationale**: A planning artifact must not turn unresolved business or operational policy into accidental production behavior. Supabase's default SMTP is documented as unsuitable for production and restricted/rate-limited, so it cannot support a readiness claim.

**Alternatives rejected**:

- Invent provisional production defaults: violates the project decision process.
- Treat local provider simulation as delivery readiness: confuses deterministic test evidence with external operations.

## Resolved Unknowns

| Unknown | Resolution |
| --- | --- |
| Invitation authority storage | Private invitation and generation records; memberships only after acceptance |
| Recipient identity | Stable verified `(issuer, subject)` where known; approved verified claim resolved live otherwise |
| Token form | CSPRNG selector + 256-bit secret; domain-separated digest only at rest |
| Sign-in handoff | Short-lived digest-backed HttpOnly continuation on hosted F010 surface |
| Resend behavior | Rotate generation, invalidate old authority first, apply approved configured expiry |
| Concurrency | Partial unique constraints, deterministic row locks, F009 idempotent receipts |
| Delivery | One immediate post-commit attempt; explicit resend; provider truth stays separate |
| Desktop API | Six named bounded operations; all authority context derived in main/server |
| Legacy F008 data | Invalidate tokens; preserve redacted terminal compatibility evidence; never auto-promote |
| Production configuration | Fail closed until Q-02/Q-05/Q-08/Q-13 evidence exists |

No design unknown remains that prevents task generation. The unresolved items are named implementation/release gates, not details an implementer may guess.
