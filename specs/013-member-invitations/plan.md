# Implementation Plan: F013 — Member Invitations

**Branch**: `feat/f013-member-invitations` | **Date**: 2026-10-23 | **Spec**: [F013 feature specification](spec.md) | **PR**: [#18](https://github.com/m07amed25/SoloDesk/pull/18)

**Input**: Feature specification from `specs/013-member-invitations/spec.md`

**Status**: Phase 0 research and Phase 1 design only. This plan does not authorize implementation, provider configuration, message delivery to real recipients, deployment, or release.

## Summary

F013 adds online, recipient-bound workspace invitations with explicit approved access, authoritative expiry, single-use acceptance, resend invalidation, revocation, and delivery status separate from membership. An authorized member creates the offer in the active F012 workspace; a hosted browser flow exchanges the bearer secret before sign-in, verifies the intended identity online, and atomically creates one active membership while consuming the current invitation generation.

The smallest safe design replaces the inherited F008 invited-membership scaffold. Invitations, acceptance generations, delivery attempts, and short-lived redemption attempts live in private server storage; `workspace_memberships` receives only active accepted members. Raw invitation secrets are generated with platform cryptography, delivered once from server memory, and stored only as digests. F009 operation receipts/reconciliation, F010 identity/session authority, F012 active-workspace context, the planned `web/auth/` hosted surface, and existing Electron bridge admission are reused. No dependency, offline invitation outbox, generic job framework, Realtime subscription, search/count endpoint, or role editor is added.

## Technical Context

**Language/Version**: TypeScript 7.0.2; Node.js >=24 <25; Electron 44.8.0; PostgreSQL/Supabase migrations, restricted database functions, and Edge Functions for secret-bearing delivery/redemption boundaries.

**Primary Dependencies**: Existing Electron Forge/Vite, React 19.3.1, Tailwind CSS 4.3.3, shadcn/Base UI components, `@supabase/supabase-js` 2.118.0, F003 contracts, F004 bridge/link admission, F005 bilingual shell, F008 tenant isolation, F009 receipts/evidence, F010 verified sessions, F011 security policy, and F012 workspace context. No new package is selected or installed.

**Storage**: Private invitation policy, invitation, acceptance-generation, delivery-attempt, and short-lived redemption-attempt relations; existing authoritative command receipts/audit; additive accepted-invitation provenance on `public.workspace_memberships`. Raw tokens and provider payloads are never stored.

**Testing**: Existing Node test coordinators, local PostgreSQL/Supabase verification, Electron and hosted-browser Playwright harnesses, verification manifest, security scans, and English/Arabic UI tests. Focused suites cover closed contracts, database constraints/locks/grants, create/resend/revoke reconciliation, identity-bound acceptance, delivery truth, migration hardening, privacy, and accessibility.

**Target Platform**: Electron desktop on Windows, macOS, and Linux; one separately hosted bilingual identity/invitation surface; managed Supabase Auth/PostgreSQL/Edge authority. This plan provisions none of them.

**Project Type**: Cross-platform desktop application plus a small hosted authentication surface and managed backend.

**Performance Goals**: Meet SC-011–SC-013 usability outcomes; keep ordinary list/command feedback within the existing p95 <=1 second proposal on the declared baseline, excluding provider delivery and sign-in wait; support bounded pagination rather than unbounded invitation lists. Integrity goals are exactly one current invitation generation, at most one accepted membership, and zero secret or cross-tenant disclosure.

**Constraints**: Online-only administration and acceptance; current session and authority revalidated; one pending invitation per workspace and canonical recipient binding; database time governs expiry; provider delivery is not acceptance; renderer/preload/local storage receive no token, raw recipient binding, provider payload, or secret URL; English/Arabic, RTL/bidi, keyboard, focus, semantic announcements, contrast, and 200% zoom parity.

**Scale/Scope**: Low-frequency team onboarding for freelancers and small teams; cursor-bounded admin list; one immediate bounded delivery attempt per generation plus explicit resend. No unattended retry worker, cross-workspace aggregation, offline mutation, membership removal, grant editor, or F017/F018 synchronization behavior.

**Open implementation/release gates (fail closed, not guessed)**: Q-05 must supply enabled assignable offer profiles and inviter authority; Q-08 must supply expiry/resend, verified-identity change/alias, and abuse policies; Q-02 plus sender/domain/provider/quota evidence must enable public delivery. Q-13 governs eventual PII/provider-reference retention. The F010 `web/auth/` surface is still absent in the current tree and must be delivered before hosted acceptance. Synthetic policies/providers may be used only as labeled test fixtures.

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                                          | Pre-research gate                                                                                                                                                  | Post-design disposition                                                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Authorized scope and traceability**           | **PASS**: The request authorizes planning artifacts only; PLT-004 and FR-001–FR-028 are authoritative.                                                             | **PASS**: Only F013 design artifacts are added; scenarios, requirements, gates, migration impact, and excluded F014+ behavior remain explicit.                                                                       |
| **II. Desktop trust boundaries**                   | **PASS with obligation**: Inviter input cannot supply actor/workspace/expiry/capabilities/token authority; acceptance secrets cannot enter Electron.               | **PASS as design**: Main derives F012 context, preload exposes named bounded methods, and hosted redemption owns the bearer-secret path. No generic bridge or direct SQL is introduced.                              |
| **III. Durable offline work with cloud authority** | **PASS with boundary**: Membership authority must be online and exactly once; cached roles or offline outbox cannot invite or accept.                              | **PASS as design**: All mutations use current service authority and F009 receipts; offline attempts refuse safely; F017/F018 are not simulated.                                                                      |
| **IV. Exact, immutable financial evidence**        | **PASS with boundary**: A Finance label cannot imply approved finance powers or change financial records.                                                          | **PASS as design**: Access offers are opaque approved policy references; Q-05/F014 remain the authority and no financial mutation is introduced.                                                                     |
| **V. Fail-closed security**                        | **PASS with obligation**: Wrong identity, stale policy, old generation, guessed secret, direct DML, hidden counts, and provider failure must deny without leakage. | **PASS as design**: Private relations, digest-only secrets, restricted functions, active-session checks, row locks/constraints, neutral public errors, and secret/redaction tests are required.                      |
| **VI. English, Arabic and accessibility**          | **PASS with obligation**: Recipient/workspace/access/expiry meaning must not depend on language, direction, or pointer input.                                      | **PASS as design**: Native and hosted surfaces share closed localization schemas, bidi isolation, keyboard/focus/status behavior, 200% zoom checks, and fluent/native-AT evidence.                                   |
| **VII. Recoverable evolution**                     | **PASS with obligation**: Legacy raw-token/invited rows must lose authority without corrupting active memberships or evidence.                                     | **PASS as design**: An additive hardening migration invalidates legacy tokens, preserves redacted terminal evidence, keeps accepted memberships, and rolls back by disabling entry points rather than dropping data. |
| **VIII. Evidence before completion**               | **PASS with obligation**: Local tests cannot claim provider delivery, hosted readiness, native acceptance, or release.                                             | **PASS as design**: Quickstart separates database, synthetic delivery, hosted, native, accessibility, provider, owner-approval, and release evidence.                                                                |

**Gate Result**: The documentation design passes all constitutional gates with no exception. Implementation remains blocked by the explicit prerequisites and production policies above.

## Project Structure

### Documentation (this feature)

```text
specs/013-member-invitations/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── authoritative-invitation-administration.md
    ├── hosted-invitation-redemption.md
    └── delivery-status-evidence-and-ui.md
```

### Source Code Layout (proposed implementation; not created by this plan)

```text
app/
├── shared/invitation-contracts.ts
├── main/
│   ├── bridge.ts
│   └── invitations/
│       ├── coordinator.ts
│       └── invitation-service.ts
├── preload/preload.ts
└── renderer/
    ├── env.d.ts
    ├── lib/bridge.ts
    └── components/workspaces/
        ├── InviteMemberDialog.tsx
        └── InvitationStatusList.tsx
web/auth/
├── App.tsx
└── invitation.tsx
packages/localization/src/{en,ar}.ts
supabase/
├── functions/
│   ├── command-gateway/invitation-handler.ts
│   ├── invitation-redemption/index.ts
│   └── _shared/invitation-delivery.ts
└── migrations/YYYYMMDDHHMMSS_f013_member_invitations.sql
tooling/f013/{verify,evidence}.mjs
tests/f013/{unit,service,integration,ui,fixtures}/
tests/verification/desktop/f013-*.spec.mjs
verification/suites.v1.json
package.json
```

**Structure Decision**: Extend the existing workspace administration surface and planned F010 hosted auth build. One main coordinator derives current F012 context and delegates online commands; a separate hosted endpoint handles non-member review/acceptance. Private database state and restricted functions replace the F008 invited-membership/raw-token path. Existing command receipts, audit projectors, localization, and verification runners are extended rather than wrapped.

## Design and Implementation Sequence

1. **Prerequisite and legacy guard**: Confirm F009–F012 behavior and the F010 hosted surface. Inventory legacy `status='invited'`, raw token columns, direct membership grants/policies, `MembershipHandler.inviteMember`, DTO token fields, and conflicting role enums. Keep F013 disabled until the unsafe paths are unreachable.
2. **Canonical contracts and access policy**: Add one closed invitation contract with bounded DTOs, operation IDs/digests, revisions, lifecycle/delivery states, reason/action codes, and opaque `offerRef`. Consolidate the canonical role type; production offers remain disabled until Q-05 configures allowed inviter/offer pairs.
3. **Additive hardening migration**: Create private policy/invitation/generation/delivery/redemption tables, checks, foreign-key indexes, partial unique current/pending indexes, and restricted functions. Add accepted-invitation provenance to memberships. Invalidate legacy raw tokens, classify legacy invited rows as non-authoritative terminal compatibility records, revoke direct membership mutation, and preserve active memberships.
4. **Authoritative administration commands**: Reuse F009 claim/digest/receipt/reconciliation. Create validates the live session, enrolled device, F012 workspace context, active inviter membership, enabled policy, recipient binding, and assignable offer, then atomically inserts one pending invitation, current generation, queued delivery attempt, receipt, event, and redacted audit. Resend/revoke lock the invitation, require expected revision, and terminalize prior authority before returning.
5. **Secret minting and bounded delivery**: The trusted server generates a 256-bit random secret and selector, stores only a digest for the committed generation, and performs one provider dispatch outside the database transaction. No raw token returns to desktop or persistence. Failure/unknown remains a delivery state; explicit resend rotates generation. Add no automatic retry worker before a later approved operational need.
6. **Hosted redemption and identity binding**: The email link carries `selector.secret` in the URL fragment. The hosted page immediately exchanges and clears it, receiving a short-lived Secure/HttpOnly/SameSite continuation before F010 sign-in. Review returns safe details only to the matching verified identity. Acceptance locks invitation then generation then membership, rechecks database time/workspace/policy/identity, inserts or returns one active membership, consumes the generation, and records one receipt/evidence outcome atomically.
7. **Narrow native administration UI**: Expose only policy/list/create/resend/revoke/reconcile methods. Main supplies workspace/account/device/generation; renderer supplies bounded recipient input, `offerRef`, operation ID, invitation ID, and expected revision. Use cursor refresh on open/focus/command completion; do not add search, counts, push subscription, token detail, or general command execution.
8. **Delivery/evidence projection**: Keep creation, queued/provider-accepted/delivered/failed delivery, review, acceptance, and membership distinct. Accept only signed/deduplicated provider status evidence when supported. Project allowlisted invitation events and safe recipient labels; omit raw addresses where not needed, token material, provider payloads, customer data, and unrestricted errors.
9. **Bilingual accessible surfaces**: Extend native workspace administration and `web/auth/` with matching English/Arabic messages, logical RTL layout, bidi-isolated addresses/references, keyboard-only actions, predictable focus, non-color status, restrained announcements, and 200% zoom/reflow.
10. **Verification and rollback evidence**: Register fixed F013 suites for contract bounds, transaction failpoints, 32-way races, grants/RLS, identity mismatch, expiry, stale generations/policy, provider outcomes, secret canaries, legacy migration, and UI parity. Run F003–F012 regressions. Rollback disables F013 functions/routes/provider dispatch and preserves accepted memberships/evidence; it never restores legacy token authority.

## Interface, Data and Failure Summary

- [Authoritative invitation administration](contracts/authoritative-invitation-administration.md) defines policy/list/create/resend/revoke/reconcile commands, context derivation, idempotency, locks, and safe errors.
- [Hosted invitation redemption](contracts/hosted-invitation-redemption.md) defines fragment exchange, continuation, verified-recipient review, atomic acceptance, and neutral public behavior.
- [Delivery, evidence and UI](contracts/delivery-status-evidence-and-ui.md) defines provider truth, event redaction, native DTOs, localization, accessibility, and no-secret rules.
- [Data model](data-model.md) defines private records, membership provenance, indexes, relationships, invariants, state transitions, retention classes, and legacy migration.
- Unknown create/resend/revoke/accept outcomes reconcile the original operation; no replacement command is inferred from timeout.
- `wrong_account`, malformed, absent, foreign, or unauthorized public cases collapse to neutral `invitation_unavailable`; only the matching verified recipient may receive more specific terminal guidance.
- A committed invitation with failed delivery remains pending and visible to authorized administrators. A failed provider call never rolls back the invitation or revives a prior generation.

## Verification and Traceability

| Slice                         | Requirements                         | Acceptance | Planned evidence                                                                                                                                           |
| ----------------------------- | ------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create and access offer       | FR-001–FR-008, FR-020, FR-024–FR-028 | A-01–A-05  | Live authority, policy/recipient/offer bounds, duplicate/concurrent/lost-reply reconciliation, no pre-accept membership, contact separation, secret scan   |
| Hosted review and accept      | FR-009–FR-014, FR-020, FR-023–FR-028 | A-06–A-11  | Fragment exchange, signed-out/wrong-account neutrality, verified binding, authoritative expiry, stale policy, atomic membership+consume, concurrent replay |
| Resend, delivery and revoke   | FR-014–FR-020, FR-024–FR-027         | A-12–A-16  | Generation rotation, prior-token invalidation, outside-transaction provider failpoints, unknown delivery, revoke/accept/resend races                       |
| Status, privacy and evidence  | FR-021–FR-024, FR-026–FR-028         | A-17–A-20  | Cursor list, direct-DML denial, cross-tenant/aggregate zero leakage, distinct delivery/membership, redacted immutable evidence                             |
| Bilingual accessible behavior | FR-027–FR-028                        | A-21–A-23  | EN/AR key parity, mixed bidi, keyboard/focus/live regions, contrast, reduced motion, 200% zoom, fluent/native-AT review                                    |

Planned commands (future evidence, not results):

```bash
npm run test:f013
npm run test:f013:contracts
npm run test:f013:service
npm run test:f013:acceptance
npm run test:f013:delivery
npm run test:f013:security
npm run test:f013:ui
npm run test:f003 && npm run test:f004 && npm run test:unit
npm run test:f006 && npm run test:f007 && npm run test:f008
npm run test:f009 && npm run test:f010 && npm run test:f011 && npm run test:f012
npm run typecheck && npm run lint && npm run build
npm run check:security && npm run check:docs && npm run test:desktop
```

Database acceptance must use real local PostgreSQL/Supabase transaction and privilege boundaries. Hosted, synthetic provider, real provider, packaged native, usability, owner approval, merge, and release evidence stay separate.

## Migration, Rollout and Rollback

1. Use the existing imperative Supabase migration workflow and generate the migration filename through the CLI at implementation time. Add private relations, constraints, indexes, restricted functions, explicit grants, and membership provenance without dropping active data.
2. Revoke direct `anon`/`authenticated` membership mutation and disable/remove the legacy handler/DTO token path before enabling F013. Legacy invited rows and raw tokens are invalidated and recorded as redacted terminal compatibility evidence; they never auto-convert to valid invitations or memberships.
3. Deploy with no enabled production invitation policy or provider. Controlled fixtures may enable synthetic recipient, offer, expiry, and delivery profiles without public email or production claims.
4. Enable hosted redemption only after F010 browser/session prerequisites and secret/redaction tests pass. Enable real delivery only after Q-02/Q-05/Q-08 and sender/domain/quota/callback evidence pass.
5. Rollback revokes F013 execute grants/routes and disables provider dispatch while preserving invitation history, accepted memberships, receipts, and audit. Do not drop tables, delete accepted members, or restore plaintext/raw-token paths.

## Complexity Tracking

No constitutional violation or justified complexity exception is proposed. Separate invitation, generation, delivery, and redemption records are the minimum needed to keep bearer authority, provider truth, and membership distinct. The plan deliberately skips a new dependency, generic queue, automatic retry worker, Realtime subscription, search/count endpoint, and role editor.
