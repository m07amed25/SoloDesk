# Cloud synchronization, devices, teams and client portal

Status: proposed protocol under confirmed product choices. Required cloud accounts, teams and offline support belong to **P01 from the first release**. Online financial authority is used by P05. P08 adds the client portal. None is implemented.

Managed cloud is the selected initial deployment. Every workspace is a tenant and every device enrolls online. Encryption in transit/at rest and encrypted device storage with controlled server access are selected; end-to-end encryption and a self-hosted edition are outside this release plan. Initial sign-in needs connectivity; cached offline access is bounded by the approved authorization lease. A cloud mirror is not a historical backup.

## Scope and isolation

Every synchronized record, attachment, cursor, operation and permission belongs to a workspace. A user may belong to multiple workspaces; the active workspace is visible in all consequential views. An immutable workspace ID is distinct from display name. Switching workspace closes subscriptions, clears view caches and prevents pending UI actions from targeting the previous workspace.

Membership changes are authoritative on the service. Local cached roles help explain the interface but cannot grant service access. Workspace owners cannot silently become platform operators, and platform support access is a separate reviewed capability with explicit audit. A project-scoped collaborator receives only allowed project material, not the entire client relationship or workspace finance data.

## Proposed synchronization model

Use application-level mutations with durable local storage and an outbox; do not synchronize a live SQLite file through a shared folder. SQLite WAL depends on local shared-memory coordination and is unsuitable for concurrent database access across machines. [SQLite WAL documentation](https://www.sqlite.org/wal.html) (accessed 17 October 2026).

Local commits write the domain change and outbound operation atomically. Each operation includes workspace, operation ID, device ID, actor, entity ID, operation/schema version, base revision, causal dependency and payload. Transport retries are at-least-once; the service deduplicates by operation ID and rejects reuse with changed payload. The service assigns an authoritative sequence/cursor and acceptance result. Client wall-clock time is descriptive metadata, never the sole conflict arbiter.

Pull applies ordered committed events transactionally and updates the cursor only with the applied data. A connection failure after a successful push must return the same accepted result on retry. Unknown schema/events stop that stream with a required-upgrade message rather than discarding fields. Retries use bounded exponential backoff with jitter and visible retry control; permanent permission/validation errors stay actionable and are not retried forever.

Maintain separate states: saved locally, queued for sync, syncing, synchronized, requires sign-in, conflict, rejected and service unavailable. “Saved” must never mean “uploaded.” Offline work remains usable; the UI names actions that require current server authority. Show last successful sync, queued-operation count and conflict count without exposing provider internals.

## Conflict rules by data type

| Data | Proposed merge rule | User-visible consequence |
| --- | --- | --- |
| New independent tasks/comments/time entries | Stable IDs, deduplicated creation | Both survive unless a domain invariant is violated |
| Non-overlapping edits to simple task/project fields | Merge only when base revision proves fields are independent | Result and contributors recorded |
| Concurrent edits to the same field | Retain both candidates and base; require choice or explicit merge | Conflict inbox offers diff, keep local, keep remote or edited result |
| Rich notes/document bodies | Preserve divergent versions initially | Never silently replace a long document; CRDT editing is a later separately approved capability |
| Status/dependency changes | Revalidate current workflow and graph after merge | Invalid transitions/cycles rejected with a repair action |
| Deletion versus concurrent edit | Tombstone wins visibility; preserve edit as recoverable conflict until retention policy allows purge | User may restore as an explicit new revision; no silent resurrection |
| Tags/set membership | Operation-aware add/remove semantics with causal metadata | Concurrent removal behavior is defined and tested |
| Attachments | Immutable content versions with reference changes | Conflicting replacements remain separate versions; incomplete upload is never a valid attachment |
| Financial finalized documents and payment events | No field-level merge; immutable event/command processing | Conflicting requests fail or require a correction document |
| Preferences | Classify personal, per-device and workspace preferences | Device window position never overwrites another device's layout |

All conflicts are scoped to permitted content. Resolving a conflict creates a new audited mutation against the current revision. Resolve actions must be idempotent and rechecked if another device changes the record during review. Never display a collaborator's confidential rejected payload to someone lacking access.

## Timers and financially safe offline work

One active timer is enforced per workspace user on each device, following the time specification. Across disconnected devices a globally exclusive timer cannot be guaranteed. Record each device session separately, detect overlapping work on reconnection, and require review before billing. Do not discard elapsed work or double-bill an overlap automatically. An online advisory lease can warn about another running timer; it cannot retroactively prevent offline overlap.

For every workspace, confirmed D-13 permits offline drafting and requires online authoritative invoice finalization. Finalization atomically reserves the invoice number, snapshots totals/parties, locks billable allocations and appends the audit event. The client receives the committed document identity before it can send a final invoice. A network timeout shows “Checking finalization” and resolves by operation ID; it does not create another invoice.

Offline final invoice issuance is excluded by confirmed decision D-13. Offline drafts and source selections remain candidates until accepted by server authority. Credit issuance, payment/refund posting and allocation changes also require online authoritative commands under recommendation A-03. A stale device cannot reserve a final number, post money or claim global billing ownership locally.

Payment-provider events use verified webhook identity and provider event IDs; duplicate or out-of-order delivery cannot create duplicate payments or regress settlement state. Manually recorded payments retain a source and reconciliation status. Partial payments, credits, refunds, currency conversion and expenses follow the financial domain rules; sync does not recalculate historical snapshots. An unauthorized or stale actor cannot publish a payment/invoice operation just because it was queued while they had access.

## Deletion, retention, restored backups and old devices

Deletes create tombstones with object ID, workspace, server revision, actor, timestamp and retention metadata. Keep them until all supported active device cursors have passed the deletion and the approved retention window is satisfied. Devices offline beyond the supported window must resnapshot before writing; a stale cursor cannot resurrect deleted data. The retention duration and maximum offline support period are P00/P01 decisions; portal-specific retention extends them in P08.

A restore opens initially as an isolated local recovery workspace with new device/session identity. Offer export, comparison, or an explicitly reviewed reconnect/fork operation. Never replay the old outbox, restore revoked credentials, decrement server invoice sequences or replace cloud content wholesale. A rejoin computes permitted current changes against server state. Financial documents already issued remain governed by current authoritative history.

Attachments have chunk/integrity verification, size quotas, resumable upload, missing-file repair and garbage collection tied to committed references and retention. Failed uploads remain local with retry/export options. A delete removes future visibility first; permanent blob deletion waits for reference and backup-retention rules. Search indexes must reflect permissions and deletions before results become visible.

## Identity, enrollment and revocation

Native sign-in should use the system browser with authorization-code flow and PKCE, not an embedded credential form. Validate state and redirect destination; never embed a service client secret in the desktop bundle. This is the native-app pattern described in [RFC 8252](https://www.rfc-editor.org/info/rfc8252/) (accessed 17 October 2026). Supabase Auth is the recommended provider; hosted sign-in UI, callback mechanism and recovery policy need P01 proof.

Each device has a visible label, last successful contact, enrollment date, app version and revocation action. Store refresh credentials through the approved secret store; rotate/revoke according to the chosen provider's supported flow. Re-authentication cannot silently bind a different account to an existing workspace. Device addition requires an authorized user and an approved device-key enrollment step.

Revocation denies new requests and queued pushes after the service learns it. On next contact the revoked device clears session secrets and stops sync. It may still hold an offline copy; remote wipe is best effort and must not be advertised as guaranteed. Owners decide whether local access after membership removal is contractually permitted; technical enforcement cannot recall data already exported.

## Proposed roles and resource grants

Roles are starting templates; final role names and permission granularity require user approval. Deny permissions by default and evaluate workspace + project/client/object scope + action on every trusted request.

| Template | Typical access | Explicit restrictions |
| --- | --- | --- |
| Owner | Workspace administration, billing settings, membership, finance, data export | Ownership transfer and workspace deletion require re-authentication and recovery checks |
| Admin | Member/project administration and operational settings | No implicit ownership transfer or signing/hosting authority; finance permission is separately assignable |
| Finance | Invoice/payment/expense workflows, financial reports | No integration-secret access or arbitrary member-role escalation |
| Manager | Assigned project planning, reviews, delivery and approved budgets | Cannot view unassigned projects or publish financial corrections by role alone |
| Contributor/contractor | Assigned tasks, own time, permitted files and comments | Internal margin, other people's cost rates, all-client contacts and unassigned finance hidden |
| Client guest | Explicit portal shares for their client/project | No internal notes, costs, draft invoices, other clients, hidden attachments or member list |
| Viewer | Explicit scoped read/export access | No mutation; export itself remains an independently granted action |

An invitation has intended recipient, scope, role, issuer, expiry and single-use acceptance. Revoking a link/invitation invalidates future use. Removing the final owner is rejected until ownership transfers. Role changes must invalidate permission caches and active subscriptions; stale live pages cannot keep receiving updates. Permission tests cover list counts, search, notifications, download links, exports and error messages as well as record pages.

## Client portal contract

The portal is a separately deployed web surface; it receives published views rather than the desktop workspace API. Publishing is explicit: selected deliverable/version, invoice snapshot, contract/proposal version or progress summary. Default sharing is off. Internal comments and cost/margin fields never become public through a new template or broad object serialization.

Proposed portal actions: view/download published documents; comment on a specific deliverable version; approve or request changes; accept a proposal through an approved acceptance workflow; view outstanding invoice balance; open a configured hosted payment checkout. Signing with legal effect and jurisdiction-specific e-signature evidence are separate decisions, not implied by an “Approve” button.

Each approval records authenticated identity or declared link identity, version, timestamp, action and evidence policy. Changing a deliverable/proposal creates a new version and makes approval applicability explicit. Client actions use idempotency keys; a reload does not accept twice. Hosted checkout completion is provisional until a verified provider event settles the payment. Never collect raw payment-card data in the desktop or portal under this proposal.

Anonymous bearer links, if selected, need high-entropy tokens, expiry, revocation, optional recipient verification, rate limits and access logging. Do not place private data or durable credentials in URLs. Determine whether link possession is sufficient evidence for each action; invoice viewing and contract acceptance need not share the same policy. Notification sending requires an explicit enabled rule or user action and a delivery audit.

## Service operations and release gate

Before P01 deployment, approve hosting region/cost, identity recovery, encrypted-cache adapter, offline authorization period, retention/quotas, service recovery and exit/export plan. Before P08, additionally approve portal identity, publication and client evidence policies. Before a pilot, test conflict resolution, interrupted uploads, duplicate/reordered events, account switching, owner transfer, permission downgrade, revoked devices and restored backups.

Release gate: deterministic replicas converge for accepted non-conflicting operations; conflicts preserve both permitted versions; no tenant/portal scope bypass; no duplicate financial effect under retries; old clients cannot corrupt new schemas; and service outages preserve local work with honest status. Agree service availability, recovery point/recovery time and incident staffing before selling a cloud availability promise. See [test strategy](../quality/test-strategy.md) and [release/support](../operations/release-and-support.md).
