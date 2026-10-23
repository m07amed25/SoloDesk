# Quickstart Validation Guide: F013 — Member Invitations

This is the implementation-time validation/run guide. It does not claim that F013 exists, that a provider is configured, or that any command below currently passes.

## 1. Prerequisites and Safety Gates

Before F013 acceptance:

- use Node.js 24 and the committed npm lockfile;
- have F003–F012 dependencies built, including the F010 hosted `web/auth/` surface and F012 active-workspace context;
- run an isolated local Supabase/PostgreSQL stack with the generated F013 migration;
- use synthetic accounts, enrolled devices, workspaces, recipients, policies, and provider sinks—never customer data or real recipients;
- keep production offers disabled until Q-05 approves inviter/offer rules;
- keep production expiry/resend and identity-change behavior disabled until Q-08 approval;
- keep public delivery disabled until Q-02 and sender/domain/quota/callback/abuse evidence are approved;
- record build/commit, schema/protocol/policy/provider fixture versions, OS/browser/database baseline, expected and observed results, redacted artifacts, and defects; and
- never present local/synthetic evidence as hosted, real-provider, native, owner-approval, merge, or release readiness.

Authoritative design is in [research](research.md), [data model](data-model.md), [administration contract](contracts/authoritative-invitation-administration.md), [hosted redemption contract](contracts/hosted-invitation-redemption.md), and [delivery/evidence/UI contract](contracts/delivery-status-evidence-and-ui.md).

## 2. Planned Focused Commands

```bash
npm run test:f013
npm run test:f013:contracts
npm run test:f013:service
npm run test:f013:acceptance
npm run test:f013:delivery
npm run test:f013:security
npm run test:f013:ui
```

Expected: the aggregate reads a fixed verification manifest and fails when any required registered suite or fixture is absent. These commands are future implementation deliverables, not current evidence.

## 3. Closed Contracts and Context Derivation

Run `npm run test:f013:contracts` and cover:

- exact named Electron methods: policy, cursor list, create, resend, revoke, and reconcile;
- exact request/response/state/reason/action allowlists and every max/max+1 boundary;
- rejection of unknown keys, nested objects, controls, malformed Unicode, invalid UUIDs/cursors, and unsafe errors;
- main/server derivation of actor, session, device, active workspace, workspace generation, policy, expiry, time, and capabilities;
- semantic digest equality and changed-input rejection for each operation ID;
- canonical role/offer references with no competing F008 role enum; and
- DTO scans proving zero token, raw binding, provider payload, secret URL, subject, capability list, or hidden count.

Expected: locale/display formatting does not affect authority, and renderer-supplied authority fields are impossible or rejected.

## 4. Migration and Privilege Matrix

Apply the generated migration to representative F008–F012 fixtures and verify:

1. private policy, invitation, generation, delivery, and redemption relations plus all FK/partial indexes exist;
2. direct `anon` and ordinary `authenticated` invitation/membership mutation is denied;
3. restricted functions use fixed search paths, least-privilege owners, and explicit execute grants;
4. existing active memberships remain active and tenant-isolated;
5. legacy raw tokens are unusable/cleared as policy allows, and legacy invited rows are terminal non-authoritative evidence;
6. no legacy row auto-promotes to an F013 invitation or active membership; and
7. orphan, duplicate, inconsistent-state, plaintext-secret, privilege, and cross-tenant scans are clean.

Run actual-role SQL/pgTAP checks and Supabase security/performance advisors. Expected: no untriaged privilege, RLS, missing-index, or unbounded-plan finding.

## 5. Authoritative Creation and Reconciliation

Run `npm run test:f013:service` against real local PostgreSQL/Supabase.

- Create an invitation with an approved synthetic offer as a current authorized owner.
- Repeat and race the same operation from two windows/devices; simulate timeout and response loss after commit.
- Race different operation IDs for the same workspace/recipient binding.
- Exercise missing/malformed/max+1 recipient, existing member, disabled/stale offer, lost inviter authority, wrong workspace generation, expired session, unenrolled device, and offline state.
- Create/edit a client, lead, billing, and imported contact with the same address.

Expected: one pending invitation, one current generation, one queued delivery attempt, zero membership, and one replayable receipt. Contacts grant nothing. Invalid/unauthorized/offline paths have zero effect and safe correction actions.

Inject failures after operation claim, invitation insert, generation insert, delivery insert, receipt, and evidence. Expected: each transaction fully commits or leaves no partial authority.

## 6. Resend, Revocation, and Stale Administration

With one pending invitation:

1. resend twice and retain both older synthetic links;
2. fail and time out the latest provider attempt;
3. race resend against resend, revoke, expiry, and acceptance;
4. submit stale revisions from a second administrator; and
5. retry/reconcile after each simulated lost response.

Expected: exactly one current generation; every older secret is unusable before new dispatch; provider failure never revives it; stale actions cannot overwrite newer state. Revocation terminalizes all generations and creates no/removes no membership. If acceptance wins, its one membership remains independent of later invitation history.

## 7. Fragment Exchange and Sign-In Handoff

Run `npm run test:f013:acceptance` with the hosted F010 surface.

- Open a current synthetic link signed out, signed in as intended recipient, and signed in as another account.
- Use malformed, guessed, expired, superseded, revoked, consumed, truncated, and oversized fragments.
- Inspect browser history, address bar, DOM, logs, telemetry, errors, referrers, storage, service-worker cache, and network traces.
- Exercise sign-in, MFA/recovery requirements, account switch, callback allowlist, continuation expiry, CSRF, and hostile device clock.

Expected: the fragment is exchanged once and removed immediately; only a short-lived Secure/HttpOnly continuation remains. Public/wrong-account paths expose no workspace, inviter, recipient, role, scope, membership, state, or aggregate detail. The invitation never bypasses F010/F011.

## 8. Atomic Acceptance and Identity Binding

For known stable identities and approved unresolved verified-claim fixtures:

- review as the intended live verified account and confirm the displayed workspace/access/expiry;
- race 32 acceptance requests across sessions and operation IDs;
- lose the response at every transaction boundary and retry/reconcile;
- change primary address, presentation case/Unicode, alias fixture, policy, inviter authority, workspace availability, or membership between review and commit;
- accept after another valid invitation already created the same membership; and
- race acceptance against resend/revoke/expiry.

Expected: exactly one active membership with the reviewed approved role/scope and stable `(issuer, subject)` provenance, plus one consumed invitation/generation. Otherwise no membership. No address string, alias heuristic, link possession, cached role, locale, or device time grants access.

## 9. Delivery Truth and Callback Verification

Run `npm run test:f013:delivery` with the synthetic adapter:

- provider accepted, delivered callback, delayed, failed, bounced, rate-limited, thrown error, and timeout/unknown;
- valid/invalid/stale/replayed/oversized callback signatures and unknown provider references;
- callback reordering and duplicate events; and
- provider failure after invitation commit.

Expected: delivery attempts remain independent of invitation and membership. Only sufficient verified provider evidence yields `delivered`; timeout stays `unknown`; no callback can accept an invitation. F013 makes one attempt per generation and requires explicit resend.

Real-provider evidence, if later authorized, must separately verify domain/sender, sandbox/production credentials, quotas, abuse behavior, callbacks, privacy terms, and observed outcomes without sending to unapproved recipients.

## 10. Privacy, Enumeration, and Secret Scans

Run `npm run test:f013:security` and verify:

- unauthorized/foreign list, cursor, detail, search, count, direct DML, function execute, and evidence attempts reveal zero records or aggregates;
- signed-out, wrong-account, guessed selector, and malformed token responses remain neutral;
- rate limits do not disclose account or workspace existence;
- logs, database, receipts, audit, diagnostics, analytics, crash output, browser history/storage/cache, snapshots, exports, support bundles, and test reports contain no raw secret/continuation/Auth credential/full URL; and
- support correlation and provider references are safe, bounded, and redacted.

Use seeded secret canaries and fail the suite on any match. Inspect timing/status/body differences for practical enumeration resistance.

## 11. Native Status and Workspace Integration

Run the native administration flow with pending/queued, provider-accepted, delivered, failed, unknown, accepted, expired, superseded, and revoked fixtures.

Verify:

- status refresh on open, focus, command completion, and reconciliation;
- creation, delivery, review, acceptance, and active membership are displayed separately;
- offline cached status is marked stale and all mutations require online authority;
- no search, total count, realtime subscription, raw detail, token, or generic RPC exists;
- new membership appears only through F012's authoritative workspace refresh/switch flow; and
- invitation acceptance never silently switches workspace or leaks one workspace's state into another.

Expected: available actions come from current server state. Stale resend/revoke moves focus to current safe status and cannot restore old authority.

## 12. English, Arabic, and Accessibility

Run `npm run test:f013:ui` and hosted/native observations in both languages for valid, invalid, wrong-account, delivery-failed, unknown, resend, revoke, expired, and accepted flows.

Check:

- key/parameter parity and fluent meaning for recipient, workspace, role, scope, expiry, consequences, status, and next action;
- logical RTL layout and bidi isolation/copy order for addresses, references, and mixed Arabic/Latin names;
- keyboard-only operation, visible focus, dialog trap/restore, review heading/error focus, and restrained live announcements;
- semantic names/roles/status, non-color communication, contrast, reduced motion, and 200% zoom/reflow; and
- approved email templates as well as native and hosted surfaces.

Expected: no blocking parity, RTL/bidi, keyboard, screen-reader, focus, contrast, or zoom defect. Record fluent Arabic and NVDA/VoiceOver/Linux assistive-technology observations separately from automation.

## 13. Usability Outcomes

After functional and accessibility gates pass, run the approved study protocol separately in English and Arabic:

- SC-011: at least 90% create a correctly understood invitation in under two minutes, excluding provider time;
- SC-012: at least 90% of intended recipients accept and identify workspace/access in under two minutes, excluding sign-in/provider outage; and
- SC-013: at least 95% distinguish representative lifecycle/delivery/membership states and choose the safe next action.

Record participants, environment, timing method, exclusions, and observed result. Automated duration is not usability evidence.

## 14. Regression, Build, and Packaging

```bash
npm run test:f003 && npm run test:f004 && npm run test:unit
npm run test:f006 && npm run test:f007 && npm run test:f008
npm run test:f009 && npm run test:f010 && npm run test:f011 && npm run test:f012
npm run test:f013
npm run typecheck
npm run lint
npm run build
npm run check:security
npm run check:docs
npm run test:desktop
```

Expected: F013 does not weaken F003 identifiers/digests, F004 bridge/link admission, F005 accessibility, F006/F007 protection and persistence, F008 tenant isolation, F009 receipts/evidence, F010 identity/session, F011 security policy, or F012 workspace context/fencing.

Repeat critical no-secret, wrong-account, create/resend/revoke, status, focus, and workspace-refresh journeys in packaged Windows, macOS, and Linux builds plus the deployed hosted-browser environment. Source-mode success is not packaged/native/hosted evidence.

## 15. Rollout and Rollback Drill

1. Apply the additive migration with all production offers and provider dispatch disabled.
2. Confirm legacy raw tokens and handlers are unreachable before enabling any F013 route.
3. Enable one labeled synthetic policy/provider and complete create, failed delivery, resend, accept, and F012 refresh.
4. Disable F013 execute grants/routes/provider dispatch as rollback.
5. Verify accepted memberships, invitation history, receipts, evidence, and legacy invalidation remain intact.
6. Re-enable and reconcile original operation IDs without duplicate invitation or membership.

Expected: rollback does not drop data, delete members, restore plaintext tokens, or reopen an old generation. Public delivery remains off until all named gates have evidence.

## 16. Evidence Report

For each layer record:

- requirement, acceptance scenario, and success-criterion IDs;
- build/commit and schema/protocol/policy/provider fixture versions;
- exact command or manual journey and environment;
- expected and observed result;
- redacted artifact location;
- defects, disposition, reviewer, and date.

Keep database, synthetic delivery, hosted, packaged native, accessibility/assistive technology, usability, real-provider, owner approval, merge, and release evidence separate. A green local suite proves none of the later layers by itself.
