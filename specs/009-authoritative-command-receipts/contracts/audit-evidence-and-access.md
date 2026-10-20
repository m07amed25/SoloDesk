# Contract: Audit Evidence and Access

**Version**: F009 audit projection v1
**Authority**: [F009 specification](../spec.md), FR-011–FR-014, FR-018, FR-020

## Audit Entry Projection

Every accepted command appends exactly one immutable audit entry in its owning transaction. The closed entry contains:

- `auditVersion`, `auditEntryId`, and `workspaceId`;
- stable non-reassignable actor reference and actor kind (`member` or approved `service_operator`);
- operation, payload version, and operation identity;
- scoped target reference(s);
- applicable prior and committed revisions;
- optional supported client occurrence evidence;
- service received/committed instants;
- operation-owned reason code and a tightly bounded safe note only when explicitly required;
- accepting request/correlation identity;
- receipt, event, and progress references;
- `summaryKind`, `summaryVersion`, and closed allowlisted structured summary;
- retention class.

It excludes raw request/canonical payload, credentials/session material, tokens/secrets, customer document bodies, arbitrary diagnostics/environment data, generic JSON diff, and unbounded user text.

## Projection and Redaction Rules

- Every registered command defines its audit projector and exact allowlist.
- The projector runs before commit and returns a bounded versioned summary.
- Unknown/sensitive fields use an approved minimal summary or abort the entire authoritative transaction.
- There is no fallback that copies the payload and redacts it later.
- F008 `change_diff` records remain historical and are not treated as this public contract.
- Ordinary roles cannot update/delete/rewrite evidence; corrections are new linked commands and entries.

## Query Operations

| Operation      | Kind        | Required authority                                | Result                                                                       |
| -------------- | ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `audit.get`    | query       | `audit_read` within current scope                 | One closed permitted entry or safe unavailable result                        |
| `audit.list`   | query       | `audit_read`; `audit_search` for metadata filters | Bounded fixed-order page and opaque continuation token                       |
| `audit.count`  | query       | Same grant/scope as matching list                 | Authorized count only; hidden rows contribute nothing                        |
| `audit.export` | command/job | Separate `audit_export` grant and current scope   | Consistent permitted snapshot request; acceptance is not delivery completion |

Allowed metadata filters are commit position/time range, exact actor, operation, target kind/reference, receipt, and correlation reference. Sort is fixed chronological order with a stable ID tie-breaker. Page size and export bounds are contract-versioned. Arbitrary predicates, raw SQL-like filters, and unrestricted content search are forbidden.

Every page, count, search, export chunk, and download rechecks current membership, action grant, workspace scope, resource scope, and export authority. Permission loss stops later disclosure. Page/export tokens are continuation locators, not bearer authority.

English and Arabic exports may localize labels and layout but never translate, reorder, reshape, or change stable IDs, revisions, exact timestamps, operation kinds, or evidence meaning.

## Workspace Audit Grants

Audit read/search/export are separate actions. Owner/Admin role alone does not create an unrestricted export or service grant. A grant is named, scoped, versioned, revocable, and rechecked for every access. Bulk actions do not broaden scope.

## Service Audit Access

Production service access is disabled until the F009 policy gate is approved. A future valid grant requires:

- named operator identity and reauthentication evidence;
- explicit read/search/export action;
- minimum workspace/resource scope;
- approved purpose and approver;
- start and bounded expiry;
- redaction and notification/review policy version;
- append-only audit of each successful service access/export.

It never impersonates or confers workspace Owner. Missing, expired, revoked, wrong-purpose, or broader access discloses no rows, counts, matches, fields, or existence details.

## Audit-of-Access

Successful service access and audit exports append a separate access event containing only safe operator/grant/action/purpose/scope/correlation/timing metadata. It does not copy viewed audit content. Failed access belongs in redacted security telemetry, not the workspace business audit trail unless an approved policy explicitly requires otherwise.

## Required Fixtures

- Synthetic secret/private markers are absent from database projection, API/query response, export, logs, and evidence artifacts.
- Authorized reviewer can correlate actor/workspace/operation/target/revisions/times/receipt/event.
- Owner/Admin update/delete attempts fail and preserve original rows.
- Removed/pseudonymized actor remains stable and is never reassigned.
- Ordinary, revoked, cross-tenant, and expired-grant callers receive zero rows/counts/matches/fields.
- Revocation between pages/export chunks stops disclosure.
- Default service-access fixture denies all service operators.
- Approved synthetic service grant reveals only its scope and creates one access audit event.
- English/Arabic presentation preserves stable values and passes applicable RTL/keyboard/screen-reader review.
