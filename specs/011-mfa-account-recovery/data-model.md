# Data Model: F011 MFA and Account Recovery

**Date**: 2026-10-21
**Scope**: Logical provider, server, and protected-local state for [the F011 plan](plan.md). This is a design contract, not an applied migration.

## Boundary and ownership

Supabase Auth owns factor secrets, challenges, verification values, recovery-code plaintext/digests, primary credentials, recovery artifacts, and provider sessions. SoloDesk must not mirror those values.

SoloDesk owns only its approved policy, a safe account-security readiness/generation record, purpose-bound operation/reconciliation records, redacted evidence, and one protected local handoff reference. Provider projections are read for reconciliation and are not new tables.

## 1. IdentitySecurityPolicy

Versioned deployment configuration approved under Q-08. It is not user-editable account metadata.

| Field | Type | Rules |
| --- | --- | --- |
| `policy_version` | bounded text | Immutable identifier included in operations/evidence |
| `factor_requirement` | closed text | `unavailable`, `optional`, or `required` |
| `factor_types` | closed set | F011 baseline is exactly `totp` |
| `recovery_method` | closed text | `provider_recovery_codes` only after capability approval |
| `reauth_purposes` | closed set | Supported sensitive operation purposes |
| `attempt_policy_ref` | bounded text | Approved provider/service limit profile; no secret thresholds in client input |
| `session_consequence_profile` | bounded text | Approved expected sign-out/reauth behavior |
| `primary_recovery_profile` | bounded text | Approved password or equivalent provider recovery path |
| `manual_escalation_profile` | optional bounded text | Present only after verified Q-08 support procedure |
| `effective_at` | `timestamptz` | Authoritative activation instant |

Missing, unsupported, contradictory, or unapproved production policy fails closed. Sandbox fixture values never become production defaults.

## 2. ProviderSecurityProjection

Ephemeral trusted projection returned by the provider adapter. It is independently read during reconciliation and never accepted from renderer or hosted result data.

| Field | Type | Rules |
| --- | --- | --- |
| `issuer_id` / `subject_id` | bounded stable text | Must match F010's verified account |
| `session_id` | bounded opaque reference | Must be live for the account |
| `current_aal` / `next_aal` | closed text | `aal1` or `aal2`; values outside the adapter contract fail |
| `factor_summaries` | bounded list | Non-secret factor ID/type/status/friendly name/timestamps only |
| `recovery_status` | closed aggregate | `unsupported`, `not_generated`, `available`, `exhausted`, or `unknown` |
| `provider_observed_at` | authoritative instant | Used only within bounded freshness rules |
| `capability_version` | bounded text | Exact probed SDK/server/project capability identity |

Factor enrollment secret, QR material, verification values, recovery codes, tokens, cookies, raw claims, and raw provider errors are prohibited.

## 3. AccountSecurityState

One private server row per verified account. This is SoloDesk's product-readiness and stale-operation fence, not a replacement for provider Auth state.

| Field | PostgreSQL shape | Rules |
| --- | --- | --- |
| `issuer_id` / `subject_id` | `text` composite primary key | Derived from verified session; never caller-selected |
| `security_generation` | `bigint not null` | Starts at 1 and increases on each accepted security-changing operation |
| `policy_version` | `text not null` | Approved policy used for the current state |
| `setup_state` | checked `text` | See lifecycle below |
| `recovery_handoff_state` | checked `text` | `not_required`, `not_generated`, `ack_pending`, `acknowledged`, `rotation_unknown` |
| `provider_factor_reference` | nullable bounded `text` | Safe opaque reference only; no secret or display payload |
| `provider_capability_version` | nullable bounded `text` | Capability proven for the accepted state |
| `last_operation_id` | nullable `uuid` | Latest accepted F011 operation |
| `last_session_consequence` | checked nullable `text` | Safe aggregate, not a session/token list |
| `updated_at` | `timestamptz not null` | Server authoritative |

`setup_state` is one of:

- `factor_not_configured`
- `factor_setup_required`
- `enrollment_pending`
- `recovery_codes_pending`
- `ready`
- `factor_reset_required`
- `reconciliation_required`
- `recovery_required`
- `upgrade_required`

Constraints:

- `ready` requires `recovery_handoff_state = acknowledged`, one verified provider factor under the approved policy, and a supported capability version at reconciliation time.
- `recovery_codes_pending` may coexist with a provider-verified factor; UI and protected product actions must not call it fully recoverable.
- No row grants workspace membership, role, device approval, offline lease, local-key access, or business authority.

## 4. IdentitySecurityOperation

Private durable operation and reconciliation ledger. One table handles a small closed purpose set; it is not a generic job system.

| Field | PostgreSQL shape | Rules |
| --- | --- | --- |
| `operation_id` | `uuid primary key` | Created once by trusted main/hosted coordination |
| `issuer_id` / `subject_id` | `text not null` | Foreign key to `AccountSecurityState`; derived server-side |
| `purpose` | checked `text` | Closed values below |
| `expected_generation` | `bigint not null` | Must equal current generation when claimed |
| `request_digest` | constrained hex `text` | Reuses F009 canonical idempotency convention |
| `policy_version` | `text not null` | Policy used to admit the operation |
| `status` | checked `text` | Lifecycle below |
| `provider_effect` | checked `text` | `not_started`, `not_observed`, `observed_applied`, `observed_not_applied`, `unknown` |
| `safe_provider_reference` | nullable bounded `text` | Optional opaque factor/recovery reference only |
| `session_consequence` | checked nullable `text` | Actual safe provider consequence after reconciliation |
| `safe_reason_code` | nullable bounded `text` | Closed application reason, never raw provider text |
| `created_at` / `expires_at` / `updated_at` | `timestamptz` | Server authoritative; `expires_at > created_at` |
| `completed_at` | nullable `timestamptz` | Required only for terminal accepted/rejected/cancelled status |

Closed `purpose` values:

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

Lifecycle:

```text
pending -> provider_in_progress -> reconcile_required -> accepted
   |                |                    |
   +-> cancelled    +-> rejected         +-> rejected
   +-> expired      +-> outcome_unknown  +-> outcome_unknown
```

- Identical `(operation_id, account, purpose, expected_generation, request_digest)` retries return the stored result.
- Reuse with changed account/purpose/generation/digest is rejected.
- Only `accepted` may update `AccountSecurityState`; the first accepted observation of each provider security change increments generation once. Code acknowledgment changes readiness within that already-current generation.
- An operation with `provider_effect = unknown` keeps its ID and blocks a replacement of the same purpose until reconciled.
- External provider calls happen outside database transactions. The database transaction locks only the current account state/operation rows needed to validate and commit a short transition.

Indexes required in the eventual migration:

- primary key on `operation_id`;
- index on `(issuer_id, subject_id, status)` for account reconciliation;
- index on `expires_at` for bounded maintenance;
- partial uniqueness preventing two non-terminal operations for the same account and mutually exclusive purpose class where the approved policy requires it;
- indexes on both columns/sides used by foreign-key lookups.

## 5. ProtectedSecurityHandoff

One sealed main-process-only record per local profile generation. It extends the current protected identity store; it is not a new database.

| Field | Type | Rules |
| --- | --- | --- |
| `format_version` | integer | Reject unsupported versions without replacement |
| `profile_reference` | safe opaque ID | Must match current F010 protected profile |
| `profile_generation` | integer | Late-result fence |
| `session_generation` | integer | Late sign-out/switch fence |
| `operation_id` / `purpose` | safe references | Match one admitted operation |
| `expected_security_generation` | integer | Must match server result before applying |
| `hosted_destination_id` | closed identifier | No arbitrary URL |
| `lifecycle` | closed text | `pending`, `returned`, `reconcile_required`, or terminal safe state |
| `created_at` / `expires_at` | instants | Bounded lifetime |

It must never contain codes, factor seeds/QR payloads, passwords, tokens, cookies, raw provider responses, account identifiers used for public recovery, or arbitrary URLs. Secret provider session material remains in the existing F010 session adapter.

## 6. SessionConsequence

Safe result projection, not a table unless evidence needs the closed value.

| Field | Closed values |
| --- | --- |
| `current_session` | `continues_aal2`, `continues_aal1`, `reauthentication_required`, `ended`, `unknown` |
| `other_sessions` | `unchanged`, `ended`, `reauthentication_required`, `unknown` |
| `local_data` | `retained_encrypted`, `current_key_available`, `current_key_unavailable`, `not_evaluated` |
| `workspace_authority` | `must_revalidate` |
| `next_action` | Closed renderer action from the contract |

Only observed provider behavior may be reported. `ended` never means that another device's downloaded or encrypted data was remotely erased.

## 7. IdentitySecurityEvidence extension

Extend the existing append-only private evidence store rather than add a second audit table. The F010 schema is enrollment-specific, so the additive migration must preserve old rows while allowing F011 identity-operation linkage.

Allowed additions:

- nullable `identity_operation_reference` with partial uniqueness where applicable;
- additive closed F011 event types for enrollment, challenge, recovery-code lifecycle, recovery, reauthentication, sensitive change, reconciliation, and session consequence;
- `policy_version`, `security_generation`, `safe_reason_code`, and closed consequence fields;
- server and local observation instants, safe diagnostic/correlation IDs, and outcome certainty.

The existing immutability trigger remains. `enrollment_intent_reference` must become nullable only with a check requiring exactly the correct linkage for each event family; legacy F010 rows remain valid and unchanged.

Never record code values/digests/count-derived guessing hints, factor secrets, passwords, tokens, cookies, raw claims/provider payloads/errors, public recovery identifiers, IP addresses, paths, local/customer content, or unrestricted metadata JSON.

## Cross-boundary invariants

1. Provider state authenticates; SoloDesk readiness constrains product use. Neither is inferred from the other without reconciliation.
2. A provider-verified factor can exist while SoloDesk is `recovery_codes_pending`; UI must state this partial state truthfully.
3. Every accepted sensitive operation proves the verified account, live `session_id`, sufficient `aal`, exact purpose, expiry, policy version, and current security generation.
4. No renderer or public caller supplies `issuer_id`, `subject_id`, `session_id`, AAL, factor status, or provider outcome as authority.
5. An accepted security-changing operation advances `security_generation` once. Older pending operations then fail stale.
6. Provider response loss creates `reconcile_required`/`outcome_unknown`, never success and never an automatic replacement operation.
7. Recovery-code acknowledgment is app-owned metadata; code generation, validity, consumption, and rotation remain provider-owned.
8. Cloud recovery cannot set local profile protection to ready, recreate a missing key, relabel another profile, or restore revoked workspace authority.
9. All private tables revoke `PUBLIC`, `anon`, and `authenticated`; direct Data API access is absent. RLS remains enabled as defense in depth, while narrowly privileged functions enforce derived account/session/generation checks.
10. Migration and function transactions are short, constraints are explicit, foreign-key lookup columns are indexed, and remote provider calls never occur while holding database locks.
