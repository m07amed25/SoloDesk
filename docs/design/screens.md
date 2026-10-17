# SoloDesk screen and flow design specifications

Status: proposed UI design, no feature implementation. This is the visual/interaction companion to [functional specifications](../README.md), [DESIGN.md](../../DESIGN.md), and [components](components-and-interactions.md). Existing domain rules take precedence over an abbreviated screen row. Every screen inherits the shared state, permission, localization, keyboard and save/sync contracts; the exceptions below are additional requirements.

## Application map

Global navigation: **Overview, My work, Projects, Clients, Time, Finance, Reports, Knowledge**. **Connections & automation** is a secondary destination; **Settings, Help, Sync center** remain reachable near the workspace/account area. Notification center, search and persistent timer are global utilities. Finance expands into Invoices, Payments, Credits & refunds, Expenses, Agreements & recurring billing, and Reconciliation. Sales pipeline, estimates, proposals and contracts are grouped under Clients. Permission-hidden destinations never leak badge counts.

Use progressive disclosure: a project detail contains its Tasks, Timeline, Milestones, Scope, Time, Files, Activity and permitted Finance tabs; do not add every tab to global navigation. Remember personal last view per workspace. First usable release only shows implemented/enabled modules, rather than a sidebar of dead destinations. A setup checklist may explain planned or disabled capabilities when useful to an authorized administrator.

Route notation below is proposed information architecture, not an implemented router/API. All signed-in entity routes resolve within an explicit workspace. Handle invalid, deleted, moved, foreign-workspace and permission-revoked records distinctly without leaking private identifiers. Native deep links authenticate and select the proper workspace before reading content.

## Layout templates

| Template | Structure | When to use |
| --- | --- | --- |
| A — Access/setup | Logo, narrow 480–640px task column, step/progress context and help | Sign-in, enrollment, key-store repair and first workspace |
| B — Collection | Title + primary action, view/filter toolbar, table/list, pagination; optional inspector | Clients, projects, tasks, invoices, expenses, jobs |
| C — Entity | Breadcrumb, identity/status/actions, summary facts, tabs, main content + optional 320px context column | Project, client, invoice, proposal, agreement |
| D — Editor | Identity/save status, sectioned single-column form, optional preview/context, stable Save/Review actions | Task, client, expense, document and rule drafts |
| E — Planning | Scoped toolbar, accessible view switcher, board/calendar/timeline + equivalent list | Kanban, scheduling, capacity and cycles |
| F — Review/commit | Exact version/context, before/after or evidence, consequence, explicit action and receipt | Issue/post, merge, approval, restore and dangerous operations |
| G — Analysis | Formula/basis/period controls, headline explanation, chart with table/drill-down, completeness | Reports, aging, forecasting and profitability |
| H — Settings | Scope label, section navigation, grouped forms, policy/help, distinct dangerous area | Personal/device/workspace/security/finance configuration |
| I — External portal | Client branding, simple navigation, published-version content, one response/payment action | Guest-only web surfaces; never render the desktop sidebar |

Details use pages for complex work; inspectors are optional accelerators. At reduced effective width, the context column moves below content and inspectors become pages. No blank canvas becomes a fake “empty” result during authentication/loading failure.

## Platform, account and team screens

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-001 Desktop shell | Global navigation, workspace, native controls, search, timer, sync, account/language/theme | Navigate; search; open utilities | Focus survives navigation; RTL does not move OS controls; 200% zoom reflows | F004–F005, F012, F021 |
| UI-002 Sign-in/enrollment | A; Continue in browser, account, callback status, device label | Open/reopen system browser; cancel; enroll | Awaiting browser, callback invalid/expired, canceled, browser unavailable, offline first-use; no password in renderer | F010 |
| UI-003 MFA/recovery | A; factor, verification code, recovery choice, session consequences | Verify; use recovery; regenerate codes | Reauthentication, lockout/error, saved-code acknowledgment, sensitive values hidden by default | F011 |
| UI-004 Workspace onboarding | A; name, timezone, default language/currency, legal setup readiness, member invites | Create; accept invitation; switch | Duplicate display names allowed; recipient/account mismatch; online required | F012–F013 |
| UI-005 Team/access | B/H; member, role, project/client/action grants, pending invitation, expiry | Invite; preview grant diff; revoke; transfer ownership | Last owner protected; roles are templates; financial privileges independent; grant diff online | F013–F014 |
| UI-006 Devices/security | H; device/version/last seen, key-store status, sessions, access lease | Rename; revoke; lock; sign out; reauthenticate | Current device clearly marked; no promise of remote erasure; unsynced-data retention explained | F006–F007, F015–F016 |
| UI-007 Sync center | B/F; last acknowledged sync, pending count, authorized operation type/source, error | Inspect; retry eligible operation; resolve; export recoverable draft | Device save distinct from cloud; stale lease, incompatible version, rejected grant, deleted record and missing file states | F017–F020, F142 |
| UI-008 Conflict review | F; authorized base/local/server field values, version/time, consequence and resolved preview | Choose per field; preserve copy; submit resolution | Same-field edits never silently lost; financial conflicts route to authoritative workflow; revoked field redacted | F019–F020 |
| UI-009 Preferences | H; personal theme/language/digits/timezone/notifications; device launch/window/tray; workspace defaults | Save scoped preference; reset scoped defaults | Explain scope; no historical invoice mutation; translated validation survives language switch | F021 |
| UI-010 Notifications | B; unread/read/snoozed, source, time, channel status | Open source; mark read; snooze; quiet hours | OS denial retains in-app delivery; permission check before displaying source | F022 |
| UI-011 Attachments | B/D; version, type/size/checksum, local/upload/publication state | Browse/drop; cancel upload; retry; download | Local-only attachment explicit; failed verification and inaccessible version do not expose contents | F023 |
| UI-012 Import wizard | A/F; source/file, mapping, locale/timezone/currency, sample rows, duplicate/error report | Map; preview; import eligible rows; download errors; cancel | Separate staged/committed; progress/cancel boundary; opening financial history requires approved provenance | F024, F086, F098 |
| UI-013 Backup/restore/export | H/F; scope, included data/files, manifest, encrypted destination, missing files, rejoin diff | Export; verify; restore in isolation; review rejoin | Never overwrite live tenant implicitly; stale financial commands excluded; revoked access checked | F025–F027, F141, F150 |
| UI-014 Feature/policy setup | H; dependencies, enabled features, readiness checklist and affected obligations | Configure; preview enable/disable; save | Disabled feature preserves history; unsafe legal/provider profiles stay unavailable | F028, F040, F103, F139 |
| UI-015 Audit/activity | B; actor, event, timestamp, version, redacted diff and reason | Filter; inspect; permitted export | Audit read permission independent; no edit/delete audit controls | F009; reused in all consequential phases |

## Everyday work and clients

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-016 Overview | G/B; assigned priorities, reviews, delivery trail, time and permitted currency-separated receivables, as-of | Open exact filtered source; create task; configure later | Real empty workspace; missing cache; no hidden finance counts or invented earnings | F048, F104 |
| UI-017 My work/task list | B; task, project, assignee, state, priority, due, estimate and blockers | Create; filter/sort; save view; select/bulk preview | Overdue derived; all-match vs page selection; partial denial/failure summary | F033–F034 |
| UI-018 Client list/profile | B/C/D; display/legal names, contacts/addresses, tags, preferred language/currency, projects, activity, permitted finance | Create/edit; add contact; archive; scoped export | Same-name clients; invalid contact; optional tax fields by profile; no snapshot mutation | F031, F050 |
| UI-019 Client merge/archive | F; source/target clients, duplicate contacts, historical links and resulting preview | Merge; archive; cancel | References preserved; incompatible financial ownership blocks; retry receipt | F050 |
| UI-020 Opportunity pipeline | E/C; stage, client, value/currency, probability, owner, expected close and next step | Create; move; compare forecast; won/lost with reason | Keyboard moves; forecast basis explicit; opportunity won does not issue bill | F051 |
| UI-021 Relationship activity | B/D; contact, kind, date, note, follow-up/owner and permitted attachments | Log; schedule; complete; link communication | Recorded communication versus actually sent message; quiet hours and offline queued state | F052 |
| UI-022 Service catalog | B/D; versioned description, unit, rates/currency, tax eligibility, active period | Create version; archive; select for estimate | Historical estimates retain versions; no free-form unapproved tax rules | F053 |
| UI-023 Estimate scenarios | D/G; scope/lines, quantity/rate, effort assumptions, exclusions, currency, terms and scenarios | Add scenario; compare; review; convert chosen lines | Explicit assumptions and totals; no mixed-currency scenario total; accepted version immutability | F054, FIN-002–FIN-003 |
| UI-024 Proposal editor/detail | D/C/F; revision, sections, commercial terms, expiry, recipient, publication history | Save draft; preview; publish selected version; supersede | Internal vs external note; offline draft; expired/revoked link; publication not acceptance | F055–F056 |
| UI-025 Agreement/amendment | C/D/F; parties, scope baseline, obligations, signatures/evidence, dates, predecessor | Draft amendment; track obligation; review acceptance | Provider signature versus manual evidence; pending legal template/market readiness explicit | F057 |
| UI-026 Client onboarding | B/D; checklist/questions, responsible person, request/access evidence, readiness | Request; answer; mark complete; handoff | Do not store credentials in ordinary notes; guest responses isolated; missing access blocks readiness only | F058, F136 |
| UI-027 Engagement handoff | F; accepted commercial version, mapped deliverables/tasks/budgets, exclusions and new project | Preview mapping; create engagement | Retry does not duplicate project; accepted terms remain immutable | F059 |
| UI-028 Client renewals/health | G/B; renewal date, agreed thresholds, signal evidence, next action | Schedule review; draft renewal; inspect reason | Explainable deterministic health; absent evidence distinct from bad health; no AI scoring | F060 |

## Projects and delivery

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-029 Project collection/detail | B/C; client, owner/team, lifecycle, dates, scope, budgets by permission, trail and tabs | Create/edit; change state; open work | Archived filter; project grants; scope completion distinct from acceptance/payment | F032 |
| UI-030 Task editor/detail | D/C; title/description, project, state, priority, assignee, due/work dates, estimate, tags | Save; start timer; comment; create subtask/checklist | Task/project consistency; required custom fields; long Arabic titles; clean/dirty/local/queued/conflict | F033, F061, F071 |
| UI-031 Board | E; configurable workflow columns, task cards, filters, grouping | Move by drag or menu; add task; inspect | Invalid transition reason; local save rollback; accessible announce; WIP limits when configured | F062 |
| UI-032 Dependencies/milestones | C/E; predecessor/successor, dependency type, date impact, milestone evidence | Link/unlink; inspect blocker; submit completion/acceptance | Cycle preview; blocked vs late; completion and external acceptance separate | F063–F064 |
| UI-033 Calendar/timeline | E; date ranges, effort, deadlines, dependency lines, agenda and zoom | Schedule; move/resize by form; fit; switch view | Working-day/timezone assumptions; date-only vs instant; no silent cascade across tasks | F065–F066 |
| UI-034 Capacity/cycles | E/G; members, work calendars, leave, capacity, commitments, cycle goal/dates | Plan load; adjust leave; open cycle; close cycle | Over-allocation text/table; no employee surveillance; closed-cycle evidence retained | F067–F068 |
| UI-035 Recurrence/templates/custom fields | H/D; rule/timezone, next occurrences, template versions, typed fields | Preview next runs; pause; create template/version | Duplicate-run protection; missed-run explanation; type migration preview; disabled values preserved | F069–F071 |
| UI-036 Scope/change request | C/F; original baseline, requested change, effort/price/date impact, approvers | Draft; compare; accept/reject; apply reviewed plan | Acceptance version explicit; request does not silently change contract/invoice | F072 |
| UI-037 Deliverables/review | B/C/F; file/revision, criteria, reviewer, due, feedback and publication | Upload revision; request review; approve/reject; publish | Internal approval versus guest acceptance; exact version; withdrawn/replaced publication | F073, F132–F133 |
| UI-038 Comments/notes/files | C/D; threads, mentions, revisions, access and linked evidence | Reply; resolve; attach; revise note | Permission-safe mentions; local queued text; private/internal vs published clear; safe rich content | F074–F075 |
| UI-039 Budgets/portfolio/risks | G/C; baseline/version, actual/forecast, threshold reasons, risk owner/impact, decisions | Compare; acknowledge alert; record decision; drill down | Internal cost grants; exact units; no automatic financial action on threshold | F076–F077 |
| UI-040 Handover/archive | F; source/target project, task/client relationships, open timers/obligations and access impact | Transfer; archive; restore eligible record | Referenced invoices immutable; orphan work prevented; source/target grants rechecked | F078 |

## Time and review

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-041 Timer panel | D; project/task, description, billable, running/paused duration, save and review state | Start; pause/resume; switch; stop | Persistence before success; cross-device conflict; native close/tray choices | F036–F037 |
| UI-042 Time collection/editor | B/D/E; date/timezone, interval or duration, description, project/task, billable/review/approval/allocation | Add; edit; split/merge; list/calendar; duplicate as new | Conservation preview; locked sources; display vs billing rounding; duration-only overlap unknown | F035, F038, F079–F080 |
| UI-043 Recovery/idle/overlap | F; confirmed segment, uncertain gap, last checkpoint, overlaps, exact retained/discarded duration | Keep; split; revise; discard uncertain portion; reconcile | No auto-billing uncertain intervals; idle is a signal not proof; sleep/DST/clock jump explained | F037–F038, F082 |
| UI-044 Rates/rounding | H/F; dated selling/cost rate, source precedence, currency, rounding increment/group/ties, raw versus billed example | Create policy/version; preview eligible repricing | Cost secrecy; no silent zero rate/FX; historical snapshot unaffected | F039, F081 |
| UI-045 Timesheet review | B/F; person/period, revisions, exact totals, exceptions, reviewer and comments | Submit; withdraw; approve/reject; reopen corrected revision | Rejection reason; stale source revision; own vs team scope; approval distinct from allocation | F084 |
| UI-046 Source allocation | F; raw seconds, selected ranges, draft reservations, available/consumed amounts and invoice links | Select ranges; reserve online; release; review handoff | Offline provisional only; overlap/conflict blocks; billed correction uses linked financial flow | F042, F085 |
| UI-047 Focus/weekly review | B/G; chosen project, focus/break policy, actual recorded work and personal goals | Start focus; pause; review week | Focus does not automatically generate billable time; no idle surveillance | F083, F087 |

## Finance

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-048 Invoice collection/detail | B/C; number/draft label, client, dates, currency, total/balance, issue/delivery/settlement/dispute | New draft; preview/export; record delivery/payment; correct | Independent statuses; overdue derived; issued fields immutable; no inaccessible financial counts | F041, F043–F046 |
| UI-049 Invoice editor | D; seller/client snapshots, currency/date/terms, lines/source/rate, tax/discount profile, totals and document language | Save draft; add line; select source; preview; review issue | Incomplete drafts valid to save; no final number offline; exact normalized input; failed save preserves edits | F040–F042 |
| UI-050 Issue review/receipt | F; exact parties, calculation version, source ownership, dates/totals and consequence | Issue online; cancel; inspect receipt | Retry receipt lookup on timeout; immutable result; no issue success based on PDF or email | F043 |
| UI-051 Document preview/template | D/C; language, seller branding, line detail, page boundaries, notes/payment instructions and version | Preview English/Arabic; save template version; export/print | Multi-page rows, selectable Arabic text, font embedding; dark UI prints white document; failed export preserves issue | F044, F102 |
| UI-052 Delivery history | B/F; recipient/channel, exact document version, send/manual evidence, attempts and outcome | Record manual delivery; preview/send when enabled; reconcile | Sent not read; queued/failed/bounced/unknown independent from issue/payment | F045, F121 |
| UI-053 Payments/client credit | B/F; received amount/currency/date/reference, allocations, unallocated credit, receipt | Record; allocate; review/post; reverse | Overpayment explicit; same-client/currency allocation; posting online; source permission | F046 |
| UI-054 Expenses/approvals | B/D/F; supplier/date/category, original amount/currency/tax, receipt, project, splits/billable/reimbursement | Save; submit/approve; select for billing; reimburse | Missing receipt repair; split conservation; billed source locked; approval and paid reimbursement distinct | F047, F090 |
| UI-055 Credits/refunds/corrections | B/F; original invoice/payment, remaining creditable/refundable components, reason/date and evidence | Draft credit; issue; record/provider refund; compensating reversal | Credit is not cash refund; partial totals bounded; void conditional on market policy; unknown outcome checked | F088–F089, F124 |
| UI-056 Deposits/milestones | C/F; agreement, schedule/trigger, planned amount, issued/cash/applied and remainder | Draft deposit invoice; apply reviewed amount; create milestone draft | Planned versus received distinct; final invoice avoids double counting; no assumption milestone approval is payment | F091–F092 |
| UI-057 Retainers | C/D/G; money vs service-unit model, period, allowance/balance, rollover/expiry/overage | Preview agreement; replenish; consume reviewed source; close | Models never mixed; allocation ledger; forecasts not posted balances | F093–F094 |
| UI-058 Subscriptions/recurring drafts | C/D/F; plan/version, quantities, periods/timezone, next run, proration and missed runs | Preview change; pause/resume/end; generate draft | Client subscriptions separate from SoloDesk seats; automatic issuance/send separately enabled; no duplicate run | F095–F096 |
| UI-059 Collections/disputes | B/F; overdue balance, recipient/contact policy, reminder plan/history, promise date, dispute/write-off evidence | Preview reminder; suppress; record dispute; review write-off | Recheck balance before send; paid/disputed suppression; write-off not tax deduction | F097, F101 |
| UI-060 Reconciliation/accounting/FX | B/F; imported record, candidate invoices/expenses, split amounts, fees, FX rate/source/date, export mappings | Match; split; confirm; undo via event; export | Suggested match not posted fact; exact remainder; cross-currency explicit; no money movement from a match | F098–F100, F125–F126 |
| UI-061 Finance configuration | H/F; legal seller/registrations, numbering series, tax/calculation versions, document defaults, payment terms, validated market readiness | Preview new policy; save version; inspect impact | Unsafe country profiles block issue; configuration not legal certification; historical snapshots unchanged | F040, F043, F103 |

## Insight, connections, portal and operations

| ID / surface | Template and fields/information | Main actions | Special states and checks | Phases |
| --- | --- | --- | --- | --- |
| UI-062 Report builder/viewer | G; saved definition, filters/period/basis/timezone, currency, formula, as-of, chart/table and source | Drill down; compare; save; snapshot/export; schedule later | Cash/issued revenue separate; missing vs zero; cached subset; permitted costs only; reproducible definition/version | F105–F109, F112–F113, F130 |
| UI-063 Knowledge/search | B/D; title, tags, safe body/revision, links, owners and search scope | Create/edit; link; search; pin/saved view | No scripts; Arabic normalization doesn't alter source; offline subset identified; revoked titles absent | F110–F111 |
| UI-064 Connection registry/setup | B/H/F; provider, account, scopes, project mapping, consent, quota/cost and health | Connect via browser; preview mapping; disconnect; rotate via secure flow | No token display; unsupported connectors hidden; disconnect stops future jobs while evidence remains | F114, F116–F127 |
| UI-065 Automation builder | D/F; trigger, typed conditions/actions, recipients, schedule/timezone, dry-run matches and duplicate rule | Test; preview; enable online; pause; version | Deterministic only; no AI/unrestricted code; dangerous external sends require authorized rule/scope | F115, F128, F130 |
| UI-066 Jobs/health center | B/C; queued/running/failed/unknown jobs, stage, attempts, quota, receipt, affected connection | Inspect; reconcile; eligible retry; cancel/stop | Retry unknown external outcome only after lookup; no fabricated percent; rate-limit backoff visible | F030, F129, F149 |
| UI-067 Portal access/home | I/A; verified guest/client identity, permitted published projects/documents and language | Sign in; choose published item; manage permitted preferences | Expired/revoked link/session; no internal workspace/member search or counts | F131, F137 |
| UI-068 Published review/acceptance | I/F; exact revision, deliverable/proposal, comments, criteria, signing evidence | Comment; approve/reject exact version; accept/sign where enabled | Replaced/withdrawn version, stale response, recipient mismatch; acceptance not payment | F132–F134 |
| UI-069 Portal invoices/payments | I/C/F; issued snapshot, balance/as-of, settlement history and hosted payment link | Download; open hosted checkout; refresh status | Do not collect raw card details; pending provider status distinct from receipt; no false payment success on redirect | F135 |
| UI-070 Portal questionnaire | I/D; published questions, required fields, safe file responses, submission version | Save allowed draft; review; submit | Guest draft retention policy stated; revisions after submission explicit; no internal credentials | F136 |
| UI-071 Closure/product seats | H/F; account vs workspace vs commercial-plan scope, owners, seat count, obligations, retention/export | Review cancellation; transfer; export; close with reauth | Product cancellation not client subscription cancellation; unknown pricing not invented; final owner protected | F138–F139 |
| UI-072 Help/diagnostics/update | H/B/F; app/version/OS, redacted diagnostics preview, support consent, update stage/changelog | Copy redacted ID; export bundle; check/download/restart when authorized | No silent support access; failed signature blocks install; protect running timer and undurable changes | F029, F140, F145–F148 |
| UI-073 Service/storage/recovery readiness | H/G/F; permitted quotas, estimated usage/cost, backup/restore drill evidence, compatibility and incidents | Inspect; export; configure authorized limits; safe repair | Free-tier limits truthful; recovered state isolated until reviewed; degraded service doesn't discard drafts | F141–F143, F149–F151 |

## Consequential flows

### First usable workspace

Launch → choose language/theme or system default → explain cloud sign-in → system browser authentication → verified callback → device/key-store check → choose/create/accept workspace → encrypted initial sync → real empty overview with Create client / Create project. If network or key-store fails, show repair/retry at that step. Never display a normal empty overview for an incomplete enrollment. On subsequent offline launch, verify the bounded lease and unlock before showing cached content.

### Client to paid delivery

Client profile → optional opportunity/estimate/proposal → exact-version acceptance/agreement → reviewed project handoff → tasks/deliverables/time → reviewed approved sources → invoice draft → online issuance review → immutable issued document → delivery evidence → partial/full payment recording → balance/credit/reconciliation. Each step links back to source evidence; no step implies completion of the next. Feature flags omit optional stages while keeping the core path usable.

### Offline work and recovery

Connection lost → unobtrusive persistent offline status → eligible edit saves atomically on device → queued count updates → restart preserves editor/outbox → reconnect refreshes access → push/pull → sync receipt, conflict or rejection. Rejection shows recoverable local copy only within permitted scope; never silently reapplies privilege-revoked writes. Final issuance and external sends stay online-required. A timeout after sending a command enters unknown/checking state, not a fresh unsent draft.

### Invoice issue and subsequent correction

Save draft → validate fields/source/rates/market profile → present exact review → Issue invoice → checking authoritative result → receipt/permanent number. A lost response triggers same-operation lookup; it does not offer a second issue. Later Change/Correct opens an allowed credit/replacement/void workflow. It never unlocks the original editor. PDF failure offers export retry; delivery failure offers delivery recovery; neither renumbers or unissues the invoice.

### Team approval and external acceptance

Submit exact internal revision → reviewer sees scope/evidence → approve/reject with history → publish chosen version separately → guest sees only published data → response bound to exact revision → stale response asks to review the replacement. Internal approval, customer acceptance, legal signature, issuance and settlement each retain their own labels and records.

### Sign-out, workspace switching and close

Changing workspace preserves each tenant's draft/outbox and clears visible prior-tenant data immediately. Sign-out or account switch explains remaining unsynced encrypted work and offers safe synchronization/recovery under policy. Closing a window honors configured tray/timer behavior; Exit protects undurable edits and leaves recoverable timer evidence. System shutdown may be abrupt, so correctness cannot depend solely on a confirmation dialog.

## Screen completion contract

Before a feature screen is accepted, its PR includes the exact fields/validation from its domain specification, screenshot/state matrix, keyboard path, RTL changes, role/online policy, error/recovery behavior and meaningful tests. The tables are a complete surface inventory for the current plan, not a replacement for field-level domain rules or proof that features are implemented. The [phase map](phase-coverage.md) connects every F001–F151 phase to these surfaces or explicitly identifies a nonvisual foundation.
