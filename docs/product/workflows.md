# End-to-end workflows and state ownership

Proposed behavior; no business workflows implemented. Detailed state machines belong to domain specs; this document joins them across modules. All flows use current workspace/scope, localized UI, audit and explicit local/server state.

## 1. Account → team → offline-ready workspace

Online sign-in via system browser → identity verification/recovery settings → create/join workspace → invite scoped members → enroll device → validate protected key store → download only authorized data → issue bounded offline lease. Missing connection/key/permissions shows a recovery state, never a new empty business database. A solo freelancer follows the same flow with one Owner. Switching account/workspace isolates caches, keys and subscriptions.

## 2. Lead → agreed work

Create client/contact → qualify opportunity → record discovery/follow-up → compare estimate scenarios → prepare proposal v1 → share exact version → record manual or authenticated acceptance evidence → agreement/SOW/onboarding → preview project handoff → create once. Changing shared terms creates a revision; stale acceptance is a conflict. No proposal acceptance fabricates payment, issued invoice or legal-signature verification.

## 3. Project → controlled delivery

Create planned project/template → assign scoped members/tasks → add estimates/dependencies/milestones → activate → work/review → publish selected deliverable version → accept/request changes → complete with unresolved-work/billing preview. Change requests create a new baseline only after exact-version approval. Archive is reversible and never erases time/finance/audit. Client publication is explicit and cannot include internal notes/costs accidentally.

## 4. Work → reviewed time

Select active project/task → durable start → pause/resume/switch → stop/save once → review idle/sleep/anomalies → submit/approve if enabled → eligible billable source. Independent devices can capture simultaneously; overlaps require review before billing. Completing a task, importing a commit, attending a meeting or starting a focus session does not itself create billable time. Billed source edits follow adjustment/credit flows.

## 5. Draft → online issue → collection

Create draft offline from manual lines and provisional eligible source candidates → reconnect/sync → authoritative reservation/revision check → preview exact tax/discount/rounding/parties → online issue transaction → obtain committed identity/number → export saved snapshot → explicit share/provider delivery → record partial/multiple payments → reconcile remaining balance. A lost finalization response means check operation receipt, never create a replacement number. Overdue is derived from due date and outstanding balance; issued/delivery/settlement/dispute are distinct states.

## 6. Correction, credit, refund and dispute

Identify issued source/document → preview affected entitlement/debt/cash → require finance authority/reason/approval where configured → issue linked credit or post compensating event → allocate/refund explicitly → recalculate projections. A refund can reopen debt unless linked adjustment removes it. Credit/refund never silently releases time for rebilling. Voiding is policy/market constrained; historical numbers/snapshots remain. Unsupported jurisdiction behavior stays disabled.

## 7. Expenses, retainers and subscriptions

Record expense/receipt → approve/split → select reimbursable amount/markup/currency → reserve source → issue once → reconcile payment. Retainers distinguish prepaid money versus included service units; consumption links actual eligible work. Subscription/recurring schedule stores accepted plan/period/revision/timezone, generates one draft per occurrence, and applies explicit proration/rollover/end policies. Missed scheduled work is visible and idempotent; no automatic debit without enabled provider authority.

## 8. Offline conflict → accepted sync

Durable local mutation+outbox → show pending → push authenticated dependency-ordered commands → server checks current membership/revision → accept/merge or retain conflict/rejection → apply pull+cursor atomically → synchronized. Same-field edits preserve local/base/remote candidates; financial facts do not merge. Removed member cannot replay old privileges. Unsupported protocol asks upgrade while preserving capture. A restored old device resnapshots before writing when outside retention.

## 9. Automation / portal

Authorized owner configures typed rule/provider scope → dry-run → enable → event/schedule creates durable job → lease/recheck → domain command/provider call → reconcile receipt → audit/notification. Guest sees only published exact versions; approvals bind identity/version and are idempotent. Disconnect/revocation stops future actions, not already received downloads/messages. No AI is included.

## 10. Recovery, closure and export

Choose archive/export/backup → validate scope/encryption/manifest → stage isolated recovery → compare current authority → reviewed rejoin/import eligible changes. Never overwrite cloud with an old SQLite file or replay old finance outbox. Account closure checks ownership transfer, outstanding obligations, export and retention; cancellation of SoloDesk's product plan is separate from cancelling client contracts/invoices.

## Universal failure behavior

Retain unsaved input/local capture; show whether operation committed, rejected or unknown; reuse operation IDs; provide bounded retry/reconcile rather than silent duplication. Read failure is not an empty workspace. PDF/upload failure retains source records. External delivery failure does not unissue or renumber. Permission errors avoid leaking hidden targets. Each recovery action has keyboard and Arabic equivalents. [Acceptance](../quality/acceptance.md) specifies required evidence.
