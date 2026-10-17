# Integrations, deterministic automation and notifications

Status: proposed P07 functional scope; required identity/basic sync is P01. No AI features. Each connector needs provider/country/scopes/operator credentials and test evidence before activation. A provider name here is a candidate capability, not a configured connection or external action authorization today.

## INT-001 — Connector lifecycle

Registry shows provider/account/workspace, enabled capabilities/scopes, owner, created/last-success timestamp, pending jobs and health. States: Not configured → Authorizing → Connected ↔ Degraded → Reauth required → Disconnected. Setup previews exactly which records/fields can leave the workspace. Disconnect revokes/removes credentials where supported, cancels unsent jobs and records what previously shared data cannot be recalled. Read-only mode cannot invoke write endpoints. No broad connector is silently enabled by login.

## INT-002 — Authorization and secret handling

Provider OAuth/token flows validate state/redirect/account identity, request minimum scope and store server-side secrets in vault. Desktop does not embed service secrets. Refresh failure suspends affected jobs without deleting source records. Scope changes require reauthorization; account switching never binds one client's records to another provider account. Audit connection creation/revoke/rotation and test revoked tokens.

## INT-003 — GitHub/GitLab engineering context

Explicitly map authorized repositories to project/task references. Link issues, branches, commits, pull/merge requests, reviews and releases; import selected issue metadata with external ID dedupe. Initial mode is links/read-only import. Bidirectional issue/status mapping requires enabled per-project rules and conflict policy. Private source code/secrets are not copied by default. A merged PR may suggest/execute a configured task transition, but cannot record time, approve client scope or bill automatically. Deleting a remote issue retains local history/source status.

## INT-004 — Calendar

Connect selected calendars and choose read-only availability import or approved event export. Show event timezone/source and private fields; availability can expose busy intervals without titles. Mapping stores external event ID/revision. Declined/cancelled/time-shifted events reconcile explicitly; reconnect does not duplicate. Recurrence/DST exceptions require fixtures. Calendar events can suggest tasks/manual time, never become billable evidence automatically. Invite sending is a separately enabled action with recipient preview.

## INT-005 — Email and document delivery

Configure verified sender/reply-to, permitted recipient sources, template/version/locale and provider. Distinguish prepared, queued, provider accepted, delivered when verified, bounced, failed and unknown; manual “sent” is explicitly recorded evidence. Retry uses message/occurrence IDs and reconciles unknown outcomes before resend. Invoice/contract attachments are exact authorized snapshots. Internal notes/costs excluded. Auth emails and business invoices are separate delivery concerns; default development SMTP is not a production delivery promise.

## INT-006 — Payment providers

Use approved hosted checkout/payment links and verified provider webhooks; no raw card data in desktop/portal. Separate invoice debt, payment initiation, captured money, fees, payout, refund and chargeback. Deduplicate event IDs and handle out-of-order states. Validate amount/currency/tenant/invoice/customer; unmatched money goes to reconciliation, not guessed settlement. Refund initiation requires finance permission and explicit confirmation/policy; refund recording alone never moves money. Country/method/provider are Q-09 gates.

## INT-007 — Accounting and bank context

Portable CSV/JSON accounting export first; named tool connectors later. Version mappings for tax codes/categories/accounts/currencies, send stable IDs and correction links, reconcile acknowledgments and rejected rows. Bank CSV import is initial reconciliation; live bank feeds are optional read-only provider connections with consent/expiry. Matching suggestions require confirmation. No statutory filing, payroll, general-ledger certification or automatic bank transfer is implied.

## INT-008 — External API/webhooks

Future developer API uses scoped revocable tokens, per-tenant quotas, documented versions, cursor pagination and command idempotency. Outgoing webhooks have allowlisted HTTPS destination, signed payload/event ID, retry policy and secret rotation. Guard private network/metadata endpoints and redirect-based SSRF. Incoming webhooks verify provider identity and parse bounded data; untrusted body cannot grant permissions or select arbitrary SQL/templates. API tokens inherit bounded capabilities and cannot exceed their issuing actor's authority.

## INT-009 — Rule builder

Rules have owner, scope, enabled flag, revision, trigger, typed conditions, allowed actions, recipients, timezone, quiet hours, cooldown, maximum runs and audit. Use allowlisted operators/fields; no arbitrary JavaScript/SQL. Trigger types: accepted domain event, scheduled occurrence, threshold crossing or manual run. Actions: create a draft/task, notify, request review, or send/issue only when separately permitted. Preview/dry-run shows candidate records/consequences without external effects. Enabling/changing a rule requires appropriate online authority. Owner removal/permission downgrade suspends or transfers rule ownership explicitly.

## INT-010 — Safe job execution

Jobs: Queued → Leased/Running → Succeeded, Retry scheduled, Needs review, Cancelled or Dead letter. Persist occurrence/operation IDs, rule/source revisions, attempts, checkpoints, lease expiry and redacted result. At-least-once invocation yields idempotent business effects, not a claim of exactly-once transport. Bounded batch/time/memory avoids free-function runtime limits; continuation resumes from durable checkpoint. Recheck current role, document/balance, recipient and cancellation immediately before side effects. Loop detection/depth/run limits prevent rule cascades. Human stop switch cancels future work but cannot undo sent money/email.

## INT-011 — Notification delivery and preferences

Combine in-app center, OS notifications and explicit external channels. Per-user/channel/topic/quiet-hour preferences apply; required security notices have documented exceptions. Dedupe by source-event+recipient+channel. Permission is rechecked before text/snippet/link is built. Catch-up after downtime summarizes, not floods. Denied OS permission leaves in-app access. Read/dismiss is personal and does not resolve the underlying task/debt.

## INT-012 — Reconciliation, audit and cost controls

Connection/job dashboards show last success, backlog, quota/rate limits, dead letters and repair actions. Use bounded exponential backoff/jitter and provider retry-after; permanent errors require repair. Audit actor/rule/version/source/recipient/outcome without credentials. Cost/volume caps pause nonessential jobs and notify owner; never silently drop financial facts. A duplicated/out-of-order callback cannot produce a second invoice/payment or regress a state. Disconnect and data-deletion policies include previously shared provider copies.

## Concrete rule examples and failure tests

| Example | Preconditions/action | Guard/recovery |
| --- | --- | --- |
| Task blocked for three days | Notify assigned manager once | Authorized project; no same-record loop; timezone/quiet hours |
| Monthly support plan | Create one draft per subscription period | Stable occurrence; period/terms/tax review; issue online only |
| Invoice three days overdue | Prepare/send enabled reminder | Recheck remaining balance, dispute/opt-out and recipient before send |
| PR merged | Move mapped task to Review when enabled | Same authorized repo/project; never marks client acceptance or bills |
| Weekly report | Snapshot permitted report and deliver to configured members | Current recipient grants; reproducible as-of; cancel on revoked scope |

Acceptance includes lost provider reply, duplicate webhook, disabled rule during execution, role downgrade, DST/month-end, paused free-tier service/missed occurrences, long job continuation, broken credentials, wrong-account mapping, private URL redirect, recipient unsubscribe and quota exhaustion. Heavy unattended bilingual PDF generation must prove runtime/font compatibility or use an approved dedicated worker; do not send an incomplete attachment as fallback.
