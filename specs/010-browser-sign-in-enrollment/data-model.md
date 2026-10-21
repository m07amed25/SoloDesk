# Phase 1 Data Model: F010 Browser Sign-in and Native Enrollment

**Status**: Logical design. Names and fields below define invariants; they are not committed migrations or provider configuration.

## Global invariants

1. Stable account identity is `(issuer_id, subject_id)`, never email or display name.
2. A local profile is bound to at most one stable account. Another account uses another isolated profile.
3. No F010 record grants workspace membership, role, offline lease, cache access, or business authority.
4. Passwords, authorization codes, PKCE verifiers, raw state/nonce, tokens, cookies, raw callbacks, unrestricted provider errors, raw keys, and profile paths are absent from ordinary/public models.
5. Server time determines authoritative enrollment/event instants. Local time is observation evidence only and cannot independently validate expiry.
6. Every persisted shape is versioned. Unsupported versions preserve bytes and enter upgrade/recovery behavior.

## 1. Sign-in Attempt

Main-owned and protected when persisted for bounded restart continuity.

| Field                                                | Type/rule                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `attempt_id`                                         | Opaque UUID; unique                                                                    |
| `profile_id` / `profile_generation`                  | App-owned local profile and positive generation captured at start                      |
| `protocol_version`                                   | Supported positive version                                                             |
| `identity_method`                                    | Closed configured method key                                                           |
| `issuer_id` / `application_audience`                 | Exact configured references                                                            |
| `state_digest` / `nonce_digest`                      | Non-reversible comparison/evidence values; raw values remain protected attempt secrets |
| `challenge_method` / `challenge_reference`           | `S256` and safe reference; verifier is excluded                                        |
| `return_destination_id`                              | Closed exact callback configuration key, not an arbitrary URL                          |
| `created_at` / `expires_at`                          | Bounded attempt window; trusted authority used where available                         |
| `status`                                             | `pending`, `cancelled`, `expired`, `consumed`, `rejected`, `superseded`                |
| `consumed_at` / `safe_reason_code` / `diagnostic_id` | Optional terminal safe metadata                                                        |

Constraints:

- At most one `pending` attempt per `(profile_id, profile_generation)`.
- Starting a replacement atomically marks the previous pending attempt `superseded` and invalidates its protected proof.
- Terminal states are immutable; only `pending` can be consumed.
- Consumption is compare-and-set and happens before session/enrollment effects.
- Profile, generation, issuer, audience, destination, expiry, state, nonce, and result shape must match the active attempt.

```text
pending -> consumed
pending -> cancelled | expired | rejected | superseded
terminal -> no transition
```

Trace: FR-001–FR-007, FR-023; A-01–A-05, A-11, A-13.

## 2. Verified Account

Narrow trusted identity result, not a tenant actor projection.

| Field                                 | Type/rule                                              |
| ------------------------------------- | ------------------------------------------------------ |
| `issuer_id` / `subject_id`            | Composite stable identity; unique                      |
| `verification_status`                 | `verified` for an accepted result                      |
| `display_name` / `display_identifier` | Optional bounded allowlisted values; non-authoritative |
| `session_status`                      | `current`, `sign_in_required`, `rejected`, `ended`     |
| `verified_at`                         | Authoritative identity result instant                  |
| `diagnostic_id`                       | Optional safe correlation                              |

It contains no workspace, role, permission, lease, local path, cache reference, or caller-selected owner. Trace: FR-005, FR-008, FR-009, FR-016; A-02, A-04, A-12.

## 3. Local Account Profile

Stable native isolation boundary owned by main.

| Field                      | Type/rule                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `profile_id`               | App-generated stable opaque ID; not a renderer/provider path component                                             |
| `issuer_id` / `subject_id` | Optional until first verified binding; immutable once bound                                                        |
| `protection_binding_id`    | Opaque F006/F007 reference                                                                                         |
| `profile_generation`       | Positive monotonic value; incremented before sign-out/switch teardown                                              |
| `compatibility_version`    | Supported local profile format                                                                                     |
| `lifecycle`                | `locked`, `signing_in`, `enrolling`, `enrolled`, `sign_in_required`, `protection_unavailable`, `recovery_required` |
| `last_transition_at`       | Local observation instant                                                                                          |
| `safe_recovery_reason`     | Optional closed value                                                                                              |
| `retained_work_status`     | Safe classification only; no record data/count                                                                     |

Constraints:

- An existing binding cannot be relabelled or rebound to another account.
- Profile paths are derived internally and never accepted from callback, renderer, or service input.
- Read/open failure cannot create a substitute profile.
- Older-generation callbacks/responses cannot restore authority.

```text
locked -> signing_in
signing_in -> locked | enrolling
enrolling -> enrolled | locked | protection_unavailable | recovery_required
enrolled -> locked | sign_in_required | recovery_required
sign_in_required -> signing_in
protection_unavailable -> locked | enrolling  (only after protection recheck)
recovery_required -> another state           (only after successful recovery/reconciliation)
```

Trace: FR-013, FR-015–FR-020, FR-025; A-04, A-07, A-08, A-10, A-15–A-19.

## 4. Protected Session Binding

Local non-secret metadata that points to protected credential storage.

| Field                               | Type/rule                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `binding_id`                        | Opaque UUID                                                                   |
| `profile_id` / `profile_generation` | Current local owner/generation                                                |
| `issuer_id` / `subject_id`          | Must match immutable profile binding                                          |
| `credential_reference`              | Opaque protected-store handle; never credential bytes                         |
| `session_generation`                | Positive monotonic value                                                      |
| `status`                            | `pending_commit`, `current`, `sign_in_required`, `invalidated`, `unavailable` |
| `protected_write_status`            | `not_started`, `committed`, `outcome_unknown`, `failed`                       |
| `validated_at` / `invalidated_at`   | Optional authoritative/observed instants                                      |
| `safe_reason_code`                  | Optional closed reason                                                        |

- Only one `current` binding exists per profile generation.
- `pending_commit` and `outcome_unknown` never grant readiness.
- Account/profile mismatch is rejected before protected cache access.
- Sign-out invalidates/removes reusable credential material and increments generation.

Trace: FR-013–FR-019; A-07, A-10, A-15–A-18.

## 5. Enrollment Intent

Account-scoped command/reconciliation record. This reuses F009 semantics without inventing a workspace.

| Field                                       | Type/rule                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enrollment_intent_id`                      | Stable operation UUID reused across identical retries                                                                                            |
| `issuer_id` / `subject_id`                  | Derived from verified session, never caller authority                                                                                            |
| `profile_id` / `profile_generation`         | Safe local references bound into request digest                                                                                                  |
| `installation_context_id`                   | App-owned stable installation reference                                                                                                          |
| `device_context_digest`                     | Canonical digest of trusted app/platform context                                                                                                 |
| `device_label`                              | Bounded display value; never identity/uniqueness evidence                                                                                        |
| `platform` / `architecture` / `app_version` | Closed/bounded compatibility evidence                                                                                                            |
| `protection_proof_reference`                | Opaque approved proof reference; no key material                                                                                                 |
| `request_digest` / `payload_version`        | F009-style canonical digest and schema version                                                                                                   |
| `status`                                    | `prepared`, `submitted`, `outcome_unknown`, `service_confirmed`, `locally_committed`, `reconciled_not_enrolled`, `rejected`, `recovery_required` |
| `device_enrollment_id` / `receipt_id`       | Optional authoritative result references                                                                                                         |
| `created_at` / `updated_at`                 | Server instants once submitted                                                                                                                   |
| `safe_error_code` / `diagnostic_id`         | Optional safe result metadata                                                                                                                    |

Constraints:

- Identical retries keep the same intent ID/digest and converge on the original result.
- Same ID with changed account, profile, generation, installation/device context, or protection proof is rejected.
- `submitted`/`outcome_unknown` must reconcile before replacement.
- `locally_committed` requires service confirmation plus protected session/profile commit.

Trace: FR-010–FR-013, FR-021, FR-023; A-06, A-09, A-14.

## 6. Device Enrollment

Authoritative service-side first-device registration.

| Field                                       | Type/rule                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `device_enrollment_id` / `device_id`        | Stable service identities                                              |
| `issuer_id` / `subject_id`                  | Derived from verified service session                                  |
| `installation_context_id`                   | Stable approved service reference                                      |
| `originating_intent_id` / `request_digest`  | Unique authoritative operation correlation                             |
| `device_label`                              | Bounded display value                                                  |
| `platform` / `architecture` / `app_version` | Enrollment evidence                                                    |
| `protected_key_proof_reference`             | Opaque reference only                                                  |
| `status`                                    | F010: `enrolled` or `rejected`; later device lifecycle belongs to F015 |
| `enrolled_at` / `last_contact_at`           | Authoritative instants                                                 |
| `receipt_id` / `evidence_id`                | Immutable result/evidence links                                        |

- Exactly one authoritative result per accepted intent.
- The final uniqueness key for installation/device identity is a Q-08/security design gate; mutable label and covert hardware fingerprinting are prohibited substitutes.
- F010 exposes no list, revoke, rotate, or remote-wipe operation.

Trace: FR-010–FR-013, FR-021, FR-025; A-06, A-09, A-14.

## 7. Identity Security Evidence

Bounded redacted append-only evidence for security-relevant terminal events.

| Field                                               | Type/rule                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `evidence_id` / `schema_version`                    | Stable UUID and supported version                                     |
| `event_type`                                        | Closed sign-in, enrollment, reconciliation, sign-out, or switch event |
| `outcome` / `safe_reason_code`                      | Closed safe values                                                    |
| `profile_reference` / `device_reference`            | Optional safe references                                              |
| `attempt_reference` / `enrollment_intent_reference` | Optional safe correlations                                            |
| `account_reference`                                 | Optional policy-approved pseudonymous reference                       |
| `authoritative_at` / `local_observed_at`            | Distinguished time sources                                            |
| `correlation_id` / `diagnostic_id`                  | Safe bounded references                                               |

Evidence never contains credentials, raw callback/provider payloads, full email/display name, secrets, paths, cache content, or unrestricted exception text. Diagnostic lookup is authorized, bounded, rate-limited, and non-enumerating. Trace: FR-022–FR-024; A-03, A-06, A-09, A-20–A-22.

## Atomic readiness invariant

```text
profile.lifecycle == enrolled
iff
  verified account == immutable profile account binding
  AND authoritative device enrollment is confirmed
  AND protected session write is committed
  AND protected profile/account binding is committed
  AND approved protection is currently usable
  AND every component belongs to the current profile/session generation
```

Any false or unknown term leaves the profile `locked`, `protection_unavailable`, or `recovery_required`. This is a reconciliation fence across two durable authorities, not a claim of a distributed transaction.

## Relationships and indexes

- `local_account_profile` 1—0..1 current `protected_session_binding`.
- `sign_in_attempt` belongs to one profile generation and may produce one `verified_account` observation.
- `verified_account` 1—many `enrollment_intent`; each accepted intent 1—1 `device_enrollment` and 1—1 immutable receipt/evidence result.
- Unique active attempt: `(profile_id, profile_generation)` where `status = pending`.
- Unique account identity: `(issuer_id, subject_id)`.
- Unique accepted intent: `(issuer_id, subject_id, enrollment_intent_id)` plus request-digest equality.
- Unique enrollment result: `originating_intent_id`; final installation uniqueness awaits the approved device-identity rule.
- Evidence lookups use fixed safe references and authoritative time; no public free-text/token search.
