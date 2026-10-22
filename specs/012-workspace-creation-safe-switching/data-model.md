# Data Model: F012 — Workspace Creation and Safe Switching

This model extends existing F008/F010/F007 records. Names below are logical; exact migration names remain implementation details except where an existing table is identified. Server timestamps are authoritative; local timestamps are observations only.

## Relationship overview

```text
Verified account + enrolled device
        │
        ├── 1..* WorkspaceCreationIntent ── 0..1 resulting Workspace
        │                                             │
        │                                             ├── 1 WorkspaceProfile (same tenant row)
        │                                             └── 1..* WorkspaceMembership
        │                                                       └── creator has exactly one active Owner row
        │
        └── 1 protected local profile
                └── 0..1 ActiveWorkspaceSelection
                         └── 0..1 active WorkspaceLocalPartition

WorkspaceContextEnvelope binds transient actions/events to Workspace + selectionGeneration.
UnsavedEditRegistration is renderer memory only and always belongs to its captured source context.
```

## 1. Workspace and profile

**Existing storage**: `public.workspace_tenants`, evolved additively.

| Field | Meaning and validation |
| --- | --- |
| `id` | Immutable bare lowercase UUIDv4 text for every new production workspace. Existing legacy synthetic IDs remain readable compatibility data. Never derived from a name or clock. |
| `display_name` | Required editable Unicode display identity; trim leading/trailing whitespace for admission without changing internal text; 1–120 Unicode scalars, bounded UTF-8, no controls. Not unique and never authority. |
| `legal_name` | Optional truthful legal/seller name; absence is not replaced with the display name. Existing values are preserved. |
| `trade_name` | Optional bounded business/trade name. |
| `default_timezone` | Required IANA timezone accepted by the active creation policy and server catalogue. |
| `default_currency` | Required uppercase three-letter currency identity accepted by the active policy. It does not select exponent, rounding, tax, numbering, or legal support. |
| `default_locale` | `en` or `ar`; a workspace default, not the user's personal UI-locale authority. |
| `profile_version` | Positive version of the workspace-profile representation, initially `1`. |
| `creation_policy_version` | Exact server policy version that admitted the starting configuration. |
| `readiness_state` | `setup_incomplete` or `ready`. F012-created workspaces start `setup_incomplete` unless an explicitly approved later policy proves all required profile gates. |
| `status` | Existing `active | suspended | closing | archived`. Creation produces `active`; a status never grants membership. |
| `created_at`, `updated_at` | Authoritative service instants. |

### Invariants

- `id` and tenant ownership never change; display/profile edits cannot reparent data.
- Duplicate `display_name` values are valid. The chooser derives a safe discriminator from the opaque ID; the discriminator is not stored authority.
- `readiness_state` is orthogonal to tenant existence/status. `active + setup_incomplete` is expected.
- Missing Q-01/Q-03 approvals keep affected actions unavailable; profile fields do not prove compliance.
- Migration backfills `display_name = coalesce(nullif(trade_name,''), legal_name)` for existing rows before making the new field required, then permits truthful null `legal_name` for new rows.

## 2. Workspace membership

**Existing storage**: `public.workspace_memberships`.

| Field | Meaning and validation |
| --- | --- |
| `workspace_id` | Immutable reference to Workspace. |
| `user_id` | Supabase verified account UUID text derived by the service, never accepted as creation authority from the caller. |
| `role` | Existing closed role; F012 creates only `owner`. |
| `status` | Existing membership lifecycle; F012 creates only `active` and consumes current active rows. |
| `granted_by` | Creator's verified account reference for the initial row. |
| `created_at`, `updated_at` | Authoritative service instants and authority-change evidence. |

### Invariants

- The creation transaction produces exactly one `(workspace_id,user_id)` row for the creator with `role=owner`, `status=active`.
- F012 does not insert invitations, extra members, role edits, or ownership transfers.
- List/select/open authorization always reads current membership state. Cached membership explains UI but grants nothing.
- The existing `user_id,status` leading index supports account chooser queries; implementation verifies the actual PostgreSQL plan.

## 3. Workspace creation policy

**Storage/owner**: versioned server deployment configuration; no renderer-owned or tenant-owned setting.

| Field | Meaning |
| --- | --- |
| `version` | Stable opaque policy version included in the request digest. |
| `enabled` | When false/absent, creation returns `workspace_creation_unavailable`. |
| `locales` | Exactly the approved set; F012 requires English and Arabic support. |
| `currency_codes` | Explicit approved codes for this deployment. No implicit global market support. |
| `timezone_catalogue` | Declared IANA catalogue/version or server lookup rule. |
| `required_profile_fields` | Closed subset of `display_name | legal_name | trade_name`; never arbitrary field names. |
| `bounds_profile` | Exact F012 field/encoded-size profile. |

Synthetic tests may inject a labeled policy containing `XTS`, `UTC`, `en`, and `ar`. That fixture is not a production policy.

## 4. Workspace creation intent/result

**New storage**: one private account-scoped relation, inaccessible to `PUBLIC`, `anon`, and direct `authenticated` table access.

| Field | Meaning and validation |
| --- | --- |
| `issuer_id`, `subject_id` | Verified F010 account binding. |
| `intent_id` | Client-generated UUIDv4; unique with account and operation kind. |
| `operation_type` | Constant `workspace.create`. |
| `request_digest` | SHA-256 canonical digest of semantic fields excluding retry/correlation transport values. |
| `payload_version`, `creation_policy_version` | Closed compatibility versions. |
| `device_enrollment_id` | Enrolled device proof matched to the verified account. |
| `status` | `submitted | committed | proven_not_created | rejected | outcome_unknown`. Server rows normally settle inside one transaction; `outcome_unknown` is primarily the client's observation until reconciliation. |
| `workspace_id` | Resulting stable Workspace ID only when committed. |
| `receipt_id` | Stable UUIDv4 safe result/evidence reference only when committed. |
| `safe_error_code` | Closed non-secret rejection/recovery code. |
| `created_at`, `finalized_at` | Authoritative service instants. |

### Invariants

- Primary/unique claim: `(issuer_id, subject_id, operation_type, intent_id)`.
- Same key + same digest returns the stored result. Same key + different digest raises an integrity conflict and has no new effect.
- Workspace, Owner membership, `workspace_created` audit event, and committed intent result are one short transaction.
- The row contains no access token, session token, key material, customer record, queued payload, raw error, or hidden tenant data.
- Result lookup is account-scoped and reveals only that account's intent.

## 5. Tenant audit evidence

**Existing storage**: `public.tenant_audit_events` using `action_type=workspace_created`.

The event records workspace ID, verified actor, target kind/ID, correlation/receipt references, authoritative time, creation policy/profile versions, and a redacted summary of admitted default identifiers. It excludes legal/customer content where not needed, credentials, device protection material, request payloads, and queued/local data. Existing immutability rules remain.

## 6. Active workspace selection and switch attempt

**New local storage**: one sealed, atomic, protected record under the existing identity/profile directory. It is a hint/context record, never authorization.

| Field | Meaning and validation |
| --- | --- |
| `format_version` | Local record format, initially `1`; unknown versions lock with upgrade/recovery guidance. |
| `profile_reference`, `profile_generation` | Exact F010 protected profile binding. |
| `issuer_id`, `subject_id` | Exact verified account binding. |
| `selection_generation` | Positive monotonic safe integer. Every transition advances it before source teardown. |
| `state` | `none | current | switching | locked`. |
| `current_workspace_id` | Present only for `current`, or retained as source during a bounded `switching` recovery record. |
| `target_workspace_id` | Present only during `switching`; never considered current before commit. |
| `attempt_id`, `correlation_id` | UUIDv4 references for a transition; no payload. |
| `pending_work_decision` | `not_required | saved_to_source | discarded`; never contains edit content. |
| `safe_reason_code` | Closed recovery reason for `locked`/failed transition. |
| `updated_at` | Local observation instant, not authority or conflict order. |

### Invariants

- At most one current workspace exists for a profile/account; `switching` exposes no interactive source or target context.
- A remembered ID is ignored when profile/account/protection binding differs.
- Any action/event with another generation is stale even if its workspace ID equals the new current workspace.
- Crash recovery rechecks service/local authority and converges to a verified source, verified target, or `locked`; it never trusts the incomplete record alone.
- Sign-out/account/profile teardown increments the owning authority generation, closes the active store, and prevents this record from granting later access.

## 7. Workspace local partition

**Existing storage**: `userData/workspaces/<profile>/<workspace>/` with encrypted DB, manifest, envelope, WAL/SHM, migrations, attachments, entities, and outbox.

| Property | Rule |
| --- | --- |
| Account/profile/workspace binding | Manifest, key envelope, physical path, and every entity/outbox row must match the trusted context. |
| Availability | `uninitialized | opening | ready | recovery_required | closed`; F012 adds intent-specific distinction between authorized initialization and retained-only open. |
| Durable work | Saved-local, queued, conflicted, staged, rejected, and outcome-unknown items retain original workspace ID across switches. |
| Open behavior | `initializeAuthorizedWorkspace` may create only after an authoritative create result for that exact workspace. `openRetainedWorkspace` must reject `uninitialized` and every unreadable/mismatched state without creating/replacing data. |

## 8. Workspace context envelope

**Storage**: transient immutable value on each workspace-bound request, response, callback, subscription, dialog, delayed result, and entry point.

```text
{ profileReference, profileGeneration, workspaceId, selectionGeneration }
```

Main derives/validates the profile fields and current selection; renderer cannot use the envelope to grant itself access. Equality with the current context is required before an effect or UI delivery. `CloudGatewayClient.setWorkspaceId()` is not used for production F012 calls because mutable ambient workspace state can redirect a delayed request.

## 9. Unsaved edit registration

**Storage**: renderer memory only.

Each registration captures a stable editor key, source WorkspaceContextEnvelope, whether save-to-source is eligible, and callbacks for save/discard/focus. It contains no authority and is cleared when its generation unmounts. Save completion is checked against the captured source before main begins the switch.

## State transitions

### Creation

```text
editing -> submitting -> committed
                     -> rejected
                     -> outcome_unknown -> reconciling -> committed
                                                     -> proven_not_created -> editing/retry
```

Only `committed` materializes Workspace + Owner + audit. If cloud commit succeeds but local initialization fails, creation remains committed and selection becomes locked/recoverable.

### Selection

```text
none/current(A)/locked
  -> switching(A?, B, generation+1)
       -> current(B)       target rechecked and protected partition opened
       -> current(A)       target failed and source reauthorized/reopened
       -> locked           neither context can be proven safe
       -> stale            superseded generation; no visible effect
```

Unsaved edits resolve before `switching`. Source durable work never changes owner or status merely because selection changes.

### Restart and revocation

```text
remembered candidate
  -> binding/protection/authority check
       -> current(candidate)
       -> locked/online_required/recovery_required

current(A) + service membership removal
  -> generation advance + stop new reads/events/submissions
       -> locked chooser with permitted recovery for A-owned local work
```

## Cross-entity validation rules

1. Display/profile changes never change IDs, membership, local path ownership, request digests already committed, or audit evidence.
2. The service does not accept actor/role/status/readiness/created timestamps from the renderer.
3. A target must pass current membership, tenant status, account/profile binding, protection, schema compatibility, and local availability before it is published current.
4. List/count/search/notice/subscription projections are always filtered by current WorkspaceContextEnvelope; no cross-workspace aggregate is defined.
5. Every closed error maps to one safe next action and has English/Arabic parity; guessed tenant denial does not reveal existence.
