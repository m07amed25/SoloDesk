# Data Model: F013 — Member Invitations

**Status**: Logical Phase 1 design. Names and types guide implementation; the generated Supabase migration remains the authoritative executable artifact.

## Modeling Rules

- Invitations, bearer generations, delivery attempts, and redemption attempts are private server-side data.
- A pending invitation is not a membership. `workspace_memberships` contains only accepted authority.
- UUID primary keys use the repository's existing generation convention. Timestamps are `timestamptz` and authority comparisons use database time.
- Stable account authority uses `(issuer, subject)`. Display addresses and labels are non-authoritative.
- Raw invitation and continuation secrets, provider payloads, message bodies, and customer content are never stored.
- State columns use closed checks or database enums selected consistently with the surrounding migration style.
- Foreign keys used in joins and locks receive explicit indexes. Unique and partial indexes enforce race-sensitive invariants.
- Private relations receive no direct `anon` or `authenticated` access. Restricted functions have explicit grants and fixed search paths.

## Relationship Overview

```text
workspace
  ├── invitation_policy (configured offer/expiry authority)
  ├── workspace_invitation (one intended recipient and offer)
  │     ├── invitation_generation (one current bearer authority)
  │     │     ├── invitation_delivery_attempt
  │     │     └── invitation_redemption_attempt
  │     └── accepted workspace_membership (zero or one provenance link)
  └── existing F009 command receipts / redacted evidence
```

## Private Entity: `invitation_policies`

One enabled policy revision authorizes which inviter can offer which role/scope and how expiry is calculated. F013 consumes this configuration; Q-05/F014 and Q-08 define its production contents.

| Field                         | Logical type | Rules                                                    |
| ----------------------------- | ------------ | -------------------------------------------------------- |
| `policy_id`                   | UUID         | Primary key, immutable                                   |
| `workspace_id`                | UUID         | FK to workspace; indexed                                 |
| `revision`                    | bigint       | Positive, monotonic within workspace                     |
| `offer_ref`                   | bounded text | Opaque stable reference, not a caller-defined grant list |
| `role_ref`                    | bounded text | Canonical approved role identity                         |
| `scope_ref`                   | bounded text | Canonical approved scope identity                        |
| `inviter_rule_ref`            | bounded text | Approved authority rule reference                        |
| `expiry_policy_ref`           | bounded text | Approved Q-08 policy reference                           |
| `enabled`                     | boolean      | Defaults false unless approved configuration enables it  |
| `effective_at` / `retired_at` | timestamptz  | Database-governed validity window                        |
| `created_at`                  | timestamptz  | Database-generated                                       |

**Constraints and indexes**:

- Unique `(workspace_id, revision, offer_ref)`.
- Partial lookup index on `(workspace_id, offer_ref)` where enabled and not retired.
- Policy rows are immutable after use except a bounded enabled/retired transition; a new revision represents changed grants or expiry behavior.

## Private Entity: `workspace_invitations`

The stable offer and lifecycle record. Recipient bindings use either an existing stable identity or a claim resolved later, never both as independent authorities.

| Field                                    | Logical type                  | Rules                                                                |
| ---------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `invitation_id`                          | UUID                          | Primary key, immutable                                               |
| `workspace_id`                           | UUID                          | FK to workspace; indexed                                             |
| `recipient_binding_key`                  | fixed digest/binary           | Domain-separated canonical key for uniqueness; never shown           |
| `recipient_issuer` / `recipient_subject` | bounded text, nullable pair   | Both present for a known stable identity or both absent              |
| `recipient_claim_digest`                 | fixed digest/binary, nullable | Present only for an unresolved approved verified claim               |
| `recipient_label_ciphertext`             | encrypted bounded value       | Optional delivery/display value; not authority and retained per Q-13 |
| `offer_ref`                              | bounded text                  | Snapshot reference presented to users                                |
| `role_ref` / `scope_ref`                 | bounded text                  | Approved access identities, not display labels                       |
| `policy_id` / `policy_revision`          | UUID / bigint                 | Creation policy snapshot; acceptance revalidates current allowance   |
| `inviter_issuer` / `inviter_subject`     | bounded text pair             | Stable creating actor identity                                       |
| `status`                                 | closed text                   | `pending`, `accepted`, `revoked`, `expired`, `superseded`            |
| `revision`                               | bigint                        | Starts at 1; compare-and-change token for administration             |
| `current_generation_id`                  | UUID, nullable                | Points to the one current generation while pending                   |
| `accepted_membership_id`                 | UUID, nullable                | Present only after acceptance                                        |
| `created_at` / `expires_at`              | timestamptz                   | Database time and configured expiry                                  |
| `terminal_at` / `terminal_reason`        | timestamptz / closed text     | Required for terminal state                                          |

**Constraints and indexes**:

- Exactly one binding form: stable identity pair or claim digest.
- `expires_at > created_at`.
- Pending requires a non-null current generation and no membership/terminal time.
- Accepted requires membership, terminal time, and no current generation.
- Other terminal states require terminal time, no membership, and no current generation.
- Partial unique `(workspace_id, recipient_binding_key)` where `status = 'pending'`.
- Index `(workspace_id, created_at desc, invitation_id desc)` for cursor lists.
- Index `(workspace_id, status, expires_at)` for bounded status/expiry maintenance.
- No public count, search, or direct detail access is derived from these indexes.

## Private Entity: `invitation_generations`

One single-use acceptance authority. A resend creates another row and never rewrites secret identity on the old row.

| Field                                        | Logical type                | Rules                                                     |
| -------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| `generation_id`                              | UUID                        | Primary key                                               |
| `invitation_id`                              | UUID                        | FK; indexed                                               |
| `generation_number`                          | integer                     | Positive and monotonic per invitation                     |
| `selector`                                   | fixed random identifier     | Unique bounded lookup value; not sufficient to accept     |
| `secret_digest`                              | fixed digest/binary         | Domain-separated digest of random secret                  |
| `status`                                     | closed text                 | `current`, `consumed`, `superseded`, `revoked`, `expired` |
| `created_at` / `expires_at`                  | timestamptz                 | Database time and approved policy                         |
| `terminal_at`                                | timestamptz, nullable       | Required unless current                                   |
| `consumed_by_issuer` / `consumed_by_subject` | bounded text pair, nullable | Present only for consumed generation                      |
| `operation_id`                               | UUID                        | Correlates create/resend receipt                          |

**Constraints and indexes**:

- Unique `(invitation_id, generation_number)` and unique `selector`.
- Partial unique `(invitation_id)` where `status = 'current'`.
- `expires_at > created_at`; current has no terminal/consumer; consumed has both consumer values and terminal time.
- Digests use constant-time comparison after selector lookup.
- Generation expiry cannot exceed the invitation's approved current expiry.

## Private Entity: `invitation_delivery_attempts`

One provider dispatch attempt for one generation. This table does not establish human receipt or membership.

| Field                                       | Logical type                  | Rules                                                                                                 |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `delivery_attempt_id`                       | UUID                          | Primary key                                                                                           |
| `invitation_id` / `generation_id`           | UUIDs                         | FKs; both indexed and checked to match                                                                |
| `attempt_number`                            | integer                       | Positive; one immediate attempt per generation in F013                                                |
| `channel`                                   | closed text                   | Initially approved email/synthetic channel only                                                       |
| `provider_ref_digest`                       | fixed digest/binary, nullable | Safe correlation, never the provider payload                                                          |
| `status`                                    | closed text                   | `queued`, `provider_accepted`, `delivered`, `delayed`, `failed`, `bounced`, `rate_limited`, `unknown` |
| `safe_reason_code`                          | closed text, nullable         | Allowlisted operational category                                                                      |
| `queued_at` / `attempted_at` / `updated_at` | timestamptz                   | Authoritative event times                                                                             |
| `provider_event_at`                         | timestamptz, nullable         | Only for verified callback evidence                                                                   |

**Constraints and indexes**:

- Unique `(generation_id, attempt_number)`; initial design uses attempt 1 only.
- Delivery transitions are monotonic under a verified event/deduplication rule. `delivered` requires sufficient provider evidence.
- Index `(generation_id, updated_at desc)` and callback lookup index on provider digest when non-null.
- Provider event IDs/signatures used for deduplication live in the minimum private verification fields required by the selected provider; raw payloads are rejected from persistence.

## Private Entity: `invitation_redemption_attempts`

Short-lived bridge between fragment exchange and the F010 signed-in hosted session.

| Field                                  | Logical type                        | Rules                                                            |
| -------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `redemption_id`                        | UUID                                | Primary key                                                      |
| `invitation_id` / `generation_id`      | UUIDs                               | FKs; indexed                                                     |
| `continuation_digest`                  | fixed digest/binary                 | Unique; raw continuation exists only in HttpOnly cookie          |
| `status`                               | closed text                         | `awaiting_identity`, `reviewed`, `accepted`, `denied`, `expired` |
| `verified_issuer` / `verified_subject` | bounded text pair, nullable         | Set only from live F010 session                                  |
| `created_at` / `expires_at`            | timestamptz                         | Short server-defined window, no longer than generation authority |
| `terminal_at` / `safe_reason_code`     | timestamptz / closed text, nullable | Redacted outcome                                                 |

**Constraints and indexes**:

- Unique `continuation_digest`.
- `expires_at > created_at` and `expires_at <= generation.expires_at`.
- Terminal states cannot return to an active state; successful acceptance consumes the attempt.
- Routine cleanup may delete expired attempts after the minimum security/evidence window approved by Q-13; durable evidence remains in F009 records.

## Existing Entity Change: `public.workspace_memberships`

Preserve current membership identity and RLS semantics, but make accepted invitation provenance explicit. If the existing key is only subject-based, the F013 migration adds the configured issuer and enforces the current single-issuer invariant rather than pretending multi-issuer support.

| Added field                                       | Logical type            | Rules                                                                                        |
| ------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `account_issuer`                                  | bounded text            | Non-null for newly accepted F013 memberships; backfilled only from trusted configured issuer |
| `accepted_invitation_id`                          | UUID, nullable          | Unique provenance link for invitation-created memberships                                    |
| `accepted_generation_id`                          | UUID, nullable          | Unique; must belong to accepted invitation                                                   |
| `accepted_policy_id` / `accepted_policy_revision` | UUID / bigint, nullable | Offer provenance reviewed at acceptance                                                      |
| `accepted_role_ref` / `accepted_scope_ref`        | bounded text, nullable  | Immutable accepted snapshot; current membership changes remain F014                          |

**Constraints and indexes**:

- Unique active authority on `(workspace_id, account_issuer, account_subject)` according to the existing membership lifecycle.
- Unique non-null `accepted_invitation_id` and `accepted_generation_id`.
- All invitation provenance fields are all-null for non-invitation memberships or all-present for F013 acceptance.
- Invitation revocation/history updates never cascade-delete or mutate a membership.
- Foreign keys use restrictive/no-action deletion behavior; authoritative evidence is not removed by deleting a presentation object.

## Existing Evidence Reuse

F009 command receipts and audit/event projections record allowlisted data rather than duplicating another evidence system:

- operation ID and input digest;
- actor stable identity, workspace, invitation and generation references;
- safe recipient reference, offer/role/scope references, policy revision;
- event/outcome/reason/action code and authoritative time;
- membership reference after acceptance;
- delivery-attempt reference and safe provider outcome.

They never include raw email unless an approved encrypted operational field requires it, raw secret, continuation, URL, provider payload, Auth token, workspace/customer content, or unrestricted database/provider error.

## State Transitions

### Invitation

```text
create -> pending -> accepted
                  -> revoked
                  -> expired
                  -> superseded
```

All terminal states are irreversible. Expiry can be projected on read but the authoritative acceptance transaction also writes or proves the terminal state under lock.

### Generation

```text
create/resend -> current -> consumed
                         -> superseded
                         -> revoked
                         -> expired
```

Resend terminalizes `current` before inserting its successor in one transaction. Revoke terminalizes every non-terminal generation. No transition returns to `current`.

### Delivery

```text
queued -> provider_accepted -> delivered
       -> delayed
       -> failed
       -> bounced
       -> rate_limited
       -> unknown
```

The selected provider contract defines permitted refinements and callback verification. No delivery state changes invitation or membership state.

### Redemption

```text
awaiting_identity -> reviewed -> accepted
                  -> denied
                  -> expired
```

Wrong identity may remain neutral to the user while recording an allowlisted denied reason privately.

## Transaction Boundaries and Lock Order

| Operation | Transaction work                                                                                                                                                                              | Work after commit                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Create    | Claim F009 operation; lock relevant policy/pending key; validate authority; insert invitation/current generation/queued delivery; receipt/event                                               | Construct secret-bearing link in trusted memory; attempt provider dispatch; update delivery outcome |
| Resend    | Claim operation; lock invitation then current generation; compare revision; supersede old generation; create new current generation/queued delivery; receipt/event                            | Dispatch new link once; record outcome                                                              |
| Revoke    | Claim operation; lock invitation then generations; compare revision; terminalize all authority; receipt/event                                                                                 | None except UI refresh/evidence projection                                                          |
| Exchange  | Selector lookup; constant-time digest check; validate current/expiry; create short-lived redemption attempt                                                                                   | Set cookie and clear browser fragment                                                               |
| Accept    | Claim operation; lock invitation, generation, membership key; validate session/identity/policy/time; insert-or-return one membership; consume invitation/generation/redemption; receipt/event | Clear continuation; show safe result                                                                |

Every operation keeps database transactions short and performs no provider/network call while holding locks.

## Legacy Hardening Migration

1. Add private F013 relations, restricted functions, explicit grants, indexes, and nullable membership provenance.
2. Revoke direct membership mutation paths used by `anon`/`authenticated` clients.
3. Disable the F008 invitation handler and remove raw token fields from all reachable DTOs before enabling F013 routes.
4. Set every legacy raw invitation token unusable and clear it where evidence retention permits.
5. Classify legacy `status = 'invited'` rows as non-authoritative terminal compatibility evidence; do not auto-create F013 invitations or active memberships.
6. Preserve existing active memberships and validate tenant RLS/index behavior under actual roles.
7. Run orphan, duplicate, invalid-state, plaintext-secret, privilege, and cross-tenant checks before enabling any invitation policy.

Rollback disables execute grants/routes and provider dispatch while preserving the additive data. It never restores old tokens or removes accepted memberships.

## Retention and Redaction Classes

| Data                                               | Minimum rule                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Raw invitation/continuation secrets                | Never persisted; clear from browser URL immediately                                        |
| Secret/continuation digests                        | Keep only while needed for authority/replay defense; terminal cleanup per Q-13             |
| Encrypted delivery address                         | Operational minimum only; redact/delete per Q-13 without breaking stable identity evidence |
| Provider references                                | Digest/minimum verification fields only; retention per Q-13                                |
| Invitation/membership provenance and F009 evidence | Durable according to approved security/audit retention                                     |
| Expired redemption attempts                        | Short-lived cleanup; durable outcome remains redacted evidence                             |

## Required Database Verification

- Constraints reject two pending invitations for one binding, two current generations, duplicate memberships, inconsistent terminal fields, and mismatched provenance.
- Thirty-two-way create/resend/accept races converge to one authoritative result.
- Failpoints at every mutation boundary produce either a full commit or no partial authority.
- `anon`, ordinary `authenticated`, foreign-workspace, stale-session, and direct-DML attempts disclose/mutate nothing.
- Restricted functions derive identity from the session, use fixed `search_path`, and expose only allowlisted safe responses.
- Query plans use the intended workspace/recipient/current-generation/member indexes without unbounded scans.
- Secret canaries do not appear in tables, logs, receipts, audit, diagnostics, exports, or provider callback evidence.
