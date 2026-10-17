# Platform, identity, teams and offline work

Status: proposed functional specification under confirmed cloud/team/offline/encryption choices. P01 is mandatory for the first usable release. Current shell implements none of these domain capabilities. Related authority: [security](../architecture/security-and-privacy.md), [sync](../architecture/sync-and-collaboration.md), [API contracts](../architecture/api-contracts.md).

## Capability requirements

| ID | Behavior and acceptance boundary |
| --- | --- |
| PLT-001 | First use requires internet, account registration/sign-in, verified identity according to the chosen provider, and enrollment of an authorized device. No false empty workspace on auth/network failure. |
| PLT-002 | Sign-in uses the system browser, PKCE/state validation and a constrained callback. Account recovery, MFA setup/recovery codes, session listing and sign-out are supported. Changing email/account requires reauthentication and clear ownership checks. |
| PLT-003 | Create a workspace with legal/profile defaults, timezone, currencies and language preferences; invite members and switch between authorized workspaces. Workspace ID is immutable; the active workspace is visible in consequential actions. |
| PLT-004 | Invite a specific recipient with role/scope/expiry; accept once while online with the intended identity. Pending invitations may be resent with old-token invalidation or revoked. Never let a client contact email grant workspace membership automatically. |
| PLT-005 | Authorize every service command/read/download/search by current membership plus resource/action grants. Role templates are editable only through authorized policy; record an audit diff. Final owner cannot leave/be removed without transfer. |
| PLT-006 | Enroll devices, show label/version/last contact, rotate credentials and revoke sessions. Revoked devices cannot push queued writes. Explain that previously downloaded data cannot be guaranteed remotely erased. |
| PLT-007 | Cache only permitted records in encrypted local storage with encrypted attachments/indexes. Lock on explicit action/inactivity as configured. Missing/unprotected OS key storage blocks protected persistence with recovery guidance rather than silently using plaintext. |
| PLT-008 | Save eligible offline work and its outbox operation atomically; show local versus synchronized status. Restart preserves pending edits. Push/pull retries are deduplicated, revision checked and schema compatible. |
| PLT-009 | Conflict inbox shows authorized local/base/remote values, consequences, and resolution history. Same-field conflicts preserve both candidates; independent field merges require evidence. Financial facts never use last-write-wins. |
| PLT-010 | An enrolled device may reopen cached work offline under a signed, time-limited authorization lease. Expired lease locks editing according to the approved policy; sign-in refresh never discards unsynced work. Maximum duration is Q-06, not an unlimited promise. |
| PLT-011 | Preferences distinguish per-device (window position), personal (language/notifications), workspace (currency/tax/roles), and document snapshot settings. Defaults apply to new records; historical documents do not change. |
| PLT-012 | One single-instance owner per local profile coordinates timers, migrations, outbox and window activation. Deep links open only allowed record IDs/routes and require the correct signed-in workspace; external input cannot invoke privileged commands directly. |
| PLT-013 | Notification center has unread/read, snooze, source links, delivery channels and quiet hours. OS denial leaves in-app notices. Dedupe by event/recipient; permission checks occur again before display and delivery. |
| PLT-014 | Central audit records actor, workspace, operation, target, revision, occurred/received instants, reason, correlation ID and redacted change summary. Ordinary members cannot alter audit history; audit reads/exports are separately scoped. |
| PLT-015 | Accessible global search/command palette, keyboard shortcuts, theme/high contrast, resizing and English/Arabic RTL are foundation requirements. OS-reserved shortcuts cannot be hijacked. |
| PLT-016 | Import/export and recovery follow the data-lifecycle specification. Offline restore does not replace the cloud tenant or replay old finance commands. Export must include a readable manifest and permission scope. |
| PLT-017 | Feature configuration declares dependencies, role requirements and online needs. Disabling taxes/recurrence/connectors prevents new actions but preserves historical records, pending obligations and exports. |
| PLT-018 | Account/workspace closure is an online, reauthenticated workflow with owner transfer, outstanding obligations, retention/export preview and a grace policy. Product-plan cancellation is distinct from deleting data or cancelling client invoices. |

## Access templates

Roles are proposed templates, not the sole security model. A capability plus project/client scope governs access. Personal workspaces use the same rules with one Owner.

| Capability | Owner | Admin | Manager | Contributor | Finance | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| Membership/settings | All | Operational; no ownership transfer | No | No | No | No |
| Client relationship management | All | Granted scope | Granted clients | Minimal assigned-project contact | Billing profile only | Explicit scope |
| Project/task management | All | Granted scope | Assigned projects | Assigned tasks; own permitted edits | Financial references | Read granted projects |
| Own time | All | Own | Own + review when assigned | Own | Read financially relevant approved time | Read only if granted |
| Others' time approval | All | Explicit reviewer grant | Assigned reviewer | No | Explicit reviewer grant | No |
| Issue invoice/credit, post payment/refund | All | No by default | No by default | No | Explicit finance actions | No |
| Cost rates/profitability | All | No by default | Explicit grant | Own rate only if policy permits | Granted scope | No by default |
| Data export/integrations | All with reauth where needed | Separately granted | Scoped export only | Own export if granted | Finance export if granted | Explicit export only |

Bulk actions do not expand scope. An owner may add a second approver requirement for high-value credits/refunds, but that policy must be explicitly configured and tested. Platform support is not a workspace Owner and must use audited, temporary support grants.

## Online/offline contract

| Operation | Offline behavior | Reconnection behavior |
| --- | --- | --- |
| Read cached permitted work | Available if locally unlocked and lease permits | Refresh permissions and changes |
| Tasks/comments/time/draft documents | Save locally as pending, preserve dependencies | Validate latest role/revision; sync or conflict/reject |
| Invite/role change/ownership transfer | Online required | Do not queue privilege changes |
| Invoice/credit issuance, payment/refund posting, authoritative number/allocation changes | Online required; prepare drafts/intents only | Revalidate and confirm exact server result by operation ID |
| Attach local file | Save encrypted local staged file | Resume upload and finalize reference after verification |
| Portal publish/provider send/payment action | Online required with preview/rule authority | Reconcile unknown outcome before any retry |
| Report | Available cached subset with as-of/sync warning | Refresh; never imply cache is complete |

States are `locked`, `signing_in`, `enrolled`, `offline_authorized`, `lease_expired`, `syncing`, `conflicted`, `revoked`, and `recovery_required`; sync state and UI lock state can coexist. Failed reauthentication must keep encrypted unsynced data recoverable. Restoring a device or switching accounts never reuses another identity's cache/key/outbox.

## Acceptance examples

Two members editing different fields retain both accepted changes; same-field edits produce a review conflict. A Finance user can issue an invoice but cannot promote themselves to Owner. A Contributor cannot obtain cost rates through a CSV, search count, PDF, notification, or attachment URL. Revoking a member while their laptop is offline causes queued writes to be rejected on reconnect without erasing the user's recoverable local draft. Signing into a different account never exposes the first account's data. Switching Arabic/English does not alter amounts, record IDs, invoice content snapshots, or issued numbers.
