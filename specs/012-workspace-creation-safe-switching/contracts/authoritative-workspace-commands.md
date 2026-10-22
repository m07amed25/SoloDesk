# Contract: Authoritative Workspace Commands

## Purpose and trust boundary

This contract covers the online service operations that exist before or independently of an active workspace: load creation options, create/reconcile a workspace, list current selectable memberships, and recheck one target. The Electron renderer never calls PostgreSQL, supplies actor/role authority, or receives credentials/raw provider/database errors.

All request/response values are versioned, closed, plain data within F003 bounds. The main-process adapter supplies the F010 access token and protected enrolled-device reference. The service derives the account/session and validates the device; client fields never override them.

## Common identity admission

Every operation requires:

- a valid non-anonymous Supabase access token for the configured issuer/audience;
- an extant `auth.sessions` row matching JWT `session_id` and `auth.uid()` for current-session-sensitive actions;
- the F010 verified account/profile boundary; and
- for creation, a current enrolled-device row matching the verified account and supplied protected enrollment reference.

Authentication is not membership. Workspace list/check operations additionally read current active membership from PostgreSQL. No JWT workspace/role claim is authoritative.

## Workspace creation policy

`GetWorkspaceBootstrap` returns:

```text
{
  version: 1,
  creation: {
    enabled,
    policyVersion,
    locales: ["en", "ar"],
    currencyCodes,
    timezonePolicy,
    requiredProfileFields,
    boundsProfile
  },
  workspaces: WorkspaceSummary[]
}
```

- `currencyCodes` is a non-empty deployment-approved uppercase list or creation is disabled. It is not a claim about precision, tax, invoicing, or market compliance.
- `timezonePolicy` identifies the declared IANA/server catalogue; the submitted zone must still be validated at commit time.
- `requiredProfileFields` is a closed subset of display/legal/trade name fields.
- A changed/removed option or policy version makes the submission stale and returns field issues while preserving safe renderer input.
- Production has no inferred defaults. Synthetic tests may inject a clearly labeled `XTS`/`UTC` policy.

## CreateWorkspace

### Request

```text
{
  version: 1,
  intentId: UUIDv4,
  requestDigest: sha256-v1,
  deviceEnrollmentId: UUIDv4,
  profile: {
    displayName,
    legalName?,
    tradeName?,
    defaultTimezone,
    defaultCurrency,
    defaultLocale: "en" | "ar",
    profileVersion: 1,
    creationPolicyVersion
  }
}
```

`requestDigest` covers the canonical semantic profile, payload/profile/policy versions, and enrolled-device reference; it excludes correlation IDs, transport attempts, and client timestamps. The service recomputes it.

### Validation

- exact allowed keys and encoded/container/string bounds;
- bare lowercase UUIDv4 intent and enrollment IDs;
- display name trimmed at boundaries, 1–120 Unicode scalars, no controls, bounded UTF-8;
- optional legal/trade fields follow the active required-field policy and bounds;
- timezone exists in the declared catalogue;
- currency is uppercase, three letters, and present in the active allowlist;
- locale is `en` or `ar` and allowed by policy;
- policy/profile versions are exact supported values; and
- account/session/enrollment remain current at submission.

Invalid/stale input has no database effect and returns a closed list of field issue codes. No raw SQL/provider message crosses the boundary.

### Transaction

In one short PostgreSQL transaction:

1. derive/reconfirm the verified account and enrolled device;
2. claim `(issuer, subject, workspace.create, intentId)` under a unique constraint;
3. if the claim exists, reject a changed digest or return its committed result;
4. generate one lowercase UUIDv4 workspace ID and receipt/evidence IDs;
5. insert Workspace with `active + setup_incomplete` and admitted profile defaults;
6. insert exactly one active Owner membership for the verified creator;
7. append redacted `workspace_created` evidence; and
8. finalize the intent with workspace and receipt IDs.

Any exception rolls back every row. No provider/network call occurs while the transaction holds locks.

### Response

```text
committed {
  workspace: WorkspaceSummary,
  membership: { role: "owner", status: "active" },
  receiptId,
  committedAt,
  readinessState: "setup_incomplete"
}
| rejected { code, fieldIssues?, diagnosticId, recovery }
| outcome_unknown { intentId, diagnosticId, recovery: "reconcile_creation" }
```

The response never says creation failed merely because the committed workspace's local protected partition could not initialize. That later failure is a local activation/recovery state.

## ReconcileWorkspaceCreation

Input is only `{version:1,intentId}` plus authenticated transport. Result lookup is scoped to the derived account:

- committed returns the exact original workspace/member/receipt result;
- `proven_not_created` permits the UI to return to editing and explicitly retry;
- `rejected` returns the original safe reason when permitted; and
- unresolved transport/service state stays `outcome_unknown`.

Reconciliation never searches by display name and never creates a replacement intent automatically.

## WorkspaceSummary

```text
{
  workspaceId,
  displayName,
  discriminator,
  role,
  membershipStatus: "active",
  workspaceStatus: "active",
  readinessState,
  defaultTimezone,
  defaultCurrency,
  defaultLocale,
  profileVersion,
  authorityVersion,
  checkedAt
}
```

`discriminator` is a deterministic short presentation label derived from the authorized opaque ID and is never used for lookup/authorization. Summaries contain no counts, customer/financial data, invites, hidden status, or other members.

## ListSelectableWorkspaces

The service returns only WorkspaceSummary rows joined to the caller's current `active` membership and selectable workspace status. The query uses a `user_id,status`-leading index and explicit minimum grants/RLS. Empty means no selectable membership; it does not expose hidden row existence.

The list is a snapshot for presentation, not activation authority. Cached list rows may explain an offline/failed state but cannot open a workspace without the approved offline lease or a fresh online check.

## CheckWorkspaceSelectability

Input is one canonical workspace UUID. The service repeats current session and membership checks and returns either a fresh WorkspaceSummary or generic `workspace_unavailable`. Missing, revoked, suspended, closed, archived, guessed, and foreign workspaces do not produce distinguishable existence responses.

The main coordinator calls this immediately before target activation and again whenever current authority reports membership change.

## Errors and recovery

| Code | Meaning when disclosable | Recovery |
| --- | --- | --- |
| `validation` | Closed field/shape/bounds problem | `correct_input` |
| `stale_creation_policy` | Submitted option/policy changed | `refresh_options` |
| `auth_required` | No current verified session | `sign_in_again` |
| `device_not_enrolled` | F010 enrollment no longer valid | `reenroll_device` |
| `workspace_creation_unavailable` | No approved/enabled creation policy or service gate | `retry_or_contact_support` |
| `changed_intent` | Same intent ID reused with different semantics | `reconcile_creation` |
| `outcome_unknown` | Commit result is not known to the client | `reconcile_creation` |
| `workspace_unavailable` | Target cannot be selected without existence disclosure | `choose_another_workspace` |
| `service_unavailable` | Online authority cannot be reached | `retry` |
| `upgrade_required` | Protocol/policy version incompatible | `upgrade` |

All codes have English/Arabic message/action keys. Diagnostic/correlation IDs are bounded and non-secret.

## Database security obligations

- New private relations/functions revoke all direct access from `PUBLIC`, `anon`, and `authenticated`.
- Public RPC functions revoke execute from `PUBLIC`/`anon`, grant only `authenticated`, set `search_path=''`, fully qualify relations, and perform explicit account/session checks.
- Existing F008 membership helper functions are hardened before production use; no exposed definer helper returns arbitrary-account or arbitrary-tenant data.
- Policies name `TO authenticated`, wrap stable auth helpers in `select`, index policy filter columns, and avoid recursive workspace/membership policies.
- Direct workspace/membership INSERT by client roles is denied.
- Security/performance advisors, pgTAP/SQL privilege matrices, transaction failpoints, and query plans are required evidence.

## Traceability

- Creation/policy/reconcile: FR-001–FR-007, FR-023–FR-026; A-01–A-05; SC-001, SC-002, SC-008, SC-011, SC-012.
- Listing/target authority/privacy: FR-008, FR-010–FR-011, FR-021–FR-024, FR-026; A-06, A-11, A-15, A-17–A-19; SC-003, SC-007, SC-010, SC-011.
