# Projects, tasks, planning and delivery

Status: proposed functional requirements, documentation only. Main phase P03. Mandatory team/offline foundations are in P01. [Time](time-and-productivity.md), [client lifecycle](client-lifecycle.md), and [finance](finance.md) own their domain facts.

## Shared contract

Every record belongs to one workspace and all linked business records must share it. Projects normally belong to one client; internal projects have an explicit internal classification and cannot issue a customer invoice without a deliberate client/billing conversion. Membership in a workspace does not grant every project. Mutations record actor, expected revision, operation ID and audit event. Offline edits are provisional until the server accepts them. Private notes/costs never become client-visible through a general project serializer.

## WRK-001 — Project creation and lifecycle

Fields: client/internal flag, title, summary, code, owner, members/grants, timezone, lifecycle, start/target dates, billing profile/currency, budget/estimate revisions, tags, health and archive state. Lifecycle: Planned → Active ↔ On hold → Completed; reopening records a reason. Archive is reversible and separate. Creation can use a versioned template or accepted proposal snapshot. A proposal handoff key prevents duplicate projects. Completion previews incomplete tasks, active timers, unsettled scope and billing, with explicit acknowledged exceptions rather than silently deleting them. Archived projects reject new work unless restored; historical invoices stay readable. Acceptance: retrying proposal conversion creates one project; renaming a client leaves the accepted scope snapshot unchanged.

## WRK-002 — Tasks and hierarchy

Task fields: project, parent, title, safe rich description, assignees, creator, status, priority, labels, estimate, dates, checklist, attachments, recurring origin and order. Proposed states: Backlog, To do, In progress, Blocked, In review, Done, Cancelled. Custom statuses map to these semantics. Parent hierarchy cannot contain cycles; configurable bounded nesting has an approved limit. A task can have multiple collaborators with one accountable owner. An unassigned task remains visible in triage. Completing parent with unfinished children offers explicit close-all or retain-open behavior; no time is generated automatically. Reopening keeps completion history. Acceptance: a failed board move restores prior status and pending local intent without losing description edits.

## WRK-003 — Dependencies and milestones

Typed finish-to-start dependencies are the first supported graph rule; additional relation types need scheduling fixtures. Detect cycles when adding edges, importing, syncing and moving tasks. Blocking does not automatically change every dependent due date. Milestones have target date, included tasks/deliverables, completion criteria and approval evidence. Milestone status is Planned, At risk, Ready for review, Accepted or Cancelled. Task completion alone is not external acceptance. Acceptance: A→B→C rejects C→A; a cancelled predecessor creates a repair choice rather than silently marking successors complete.

## WRK-004 — Views and filters

Provide project and cross-project list, Kanban, calendar and timeline views with identical permission/record sets. Saved personal/shared views store filters, grouping, sort, columns and density, not copied records. Support assignee/client/project/status/priority/date/label/billable-context queries, inclusive date boundaries and explicit undated buckets. Bulk updates preview count, excluded records and permission failures; partial success reports exact rows and retry identities. Keyboard alternatives exist for all drag actions. Acceptance: a saved filter with zero matches shows its filters and clear-reset action, not an empty-workspace onboarding screen.

## WRK-005 — Scheduling, capacity and workload

Maintain per-member working calendar, timezone, available hours, leave, focus allocation and explicit forecast assumptions. Schedule uses remaining effort and dependency constraints; it is a suggestion until accepted. Flag over-allocation, unavailable assignees and impossible dates. Do not infer work hours from computer activity. Changing capacity previews affected plans without rewriting agreed delivery dates automatically. Acceptance: a member with 20 available hours and 28 planned hours shows 8 hours overload, while missing estimates remain separately counted.

## WRK-006 — Sprints, cycles and recurring work

Optional project cycles have start/end, goals, planned task set and completion snapshot. Moving unfinished work to a new cycle is explicit and retains history. Recurrence stores timezone, anchor, rule, end condition, source revision and occurrence key; generate one task per occurrence despite retry/offline duplicates. Preview month-end/holiday handling. Missed occurrences offer skip/create/merge choices; a server scheduler handles enabled runs while desktops are closed. A completed recurring instance never edits the template or other instances implicitly.

## WRK-007 — Templates and custom fields

Version project/task/checklist templates, field definitions, statuses and dependencies. Supported initial custom field types: text, bounded number, date, boolean, single/multiple choice and member reference. Field-level access follows project and explicit financial classification. Changing/deleting a used field archives or migrates with preview; historical values remain exportable. Templates contain no live credentials or hidden client data. Acceptance: cloning a template with task dependencies remaps IDs to the new project, never links tasks across tenants.

## WRK-008 — Scope baseline and change requests

A project scope baseline links accepted proposal/contract versions, deliverables, estimates, budget, assumptions and exclusions. Change request fields include requester, reason, affected work, price/currency, effort, schedule impact, options and approval evidence. States: Draft → Submitted → Under review → Approved/Rejected/Withdrawn → Applied. Applying an approved change atomically creates a new baseline revision and traceable task/budget changes. Approval of scope is distinct from invoice issuance and payment. Stale approvals cannot authorize altered scope. Acceptance: a request approved against baseline v2 requires review if v3 changed the affected deliverable before application.

## WRK-009 — Deliverables and acceptance

Deliverables have title, version, files/links, criteria, due date, author, visibility and review policy. States: Draft → Internal review → Ready → Published → Accepted/Changes requested → Superseded. Publication is online and selects exact content/reviewers; it is never equivalent to uploading an internal file. Acceptance applies only to the published version. New revisions preserve prior approval evidence and show whether reapproval is required. Local manual external acceptance is clearly labeled with capturing actor/evidence. Acceptance: replacing a file after approval creates v2 requiring new review; v1 remains reproducible.

## WRK-010 — Collaboration and activity

Project-scoped comments support threads, mentions, edit history, resolution and attachments. Mentions resolve only to people who can read the target. Internal and client-visible threads have explicit separate visibility and publication. Edits/deletions preserve required audit metadata under retention policy; no hidden privilege escalation through a notification. Presence is advisory and opt-out; no keystroke/screenshots/activity surveillance. Acceptance: removing a project grant stops new comments/subscriptions/downloads for that member and hides cached content at next policy refresh.

## WRK-011 — Files, notes and knowledge links

Use versioned attachment references with content hash, MIME/size, upload state, permissions and local availability. Upload states: Local staged → Uploading → Verified/Failed → Published if separately authorized. Resumable retries cannot create duplicate files; incomplete upload is not a downloadable final artifact. Scan/validate supported uploads before portal publication. Notes support drafts/revisions, project links and explicit access classification; conflicting rich-text edits preserve versions until a merge feature is proven. Code snippets and repository links are text/URLs, not executable programs or credentials.

## WRK-012 — Budgets, rates and profitability context

Project budget is a versioned plan with effort, fee, costs and currency. Actual time, issued revenue, collected cash and expense commitments remain separate metrics. Threshold alerts dedupe per threshold/budget revision and explain missing cost data. Contributors see permitted planned effort, not hidden labor costs. Changing billing model does not reprice historical entries or invoices; preview unbilled effects and require explicit finance review. Acceptance: fixed-fee work can record 40 hours for cost analysis without silently creating 40 billable hourly lines.

## WRK-013 — Portfolio, risks and decision records

Portfolio views group permitted projects by client, owner, health, stage and target period. Health is manual or calculated from named rules with provenance; overrides have reason/expiry. Risk records hold likelihood, impact, mitigation, owner, due date and state; issue/decision records link affected scope. Pipeline forecasts, signed backlog and delivered revenue are distinct. Acceptance: missing due dates do not become “on time”; high-risk tasks link to the actual blocked work and mitigation owner.

## WRK-014 — Archive, transfer and recovery

Moving tasks between permitted projects previews client/currency/billing implications and blocks allocated time contradictions. Cross-workspace move is a reviewed export/import with new IDs, never a direct reassignment of tenant ID. Unreferenced deletions use trash/recovery under retention; referenced records archive. Project handover checks membership, task ownership, open reviews, files and access credentials checklist without storing passwords. Acceptance: removing a member offers reassignment of active tasks but never deletes their time/audit identity.

## Required validation, errors and phase gate

All editors retain input on save/revision failure and display local/sync/rejected states. Rich text is sanitized; URL/file boundaries are constrained. Role changes, bulk actions and imports use the same invariants as single-record actions. API errors distinguish unauthorized, validation, version conflict, dependency cycle, financial lock, upload pending and service unavailable without leaking inaccessible objects.

P03 acceptance requires two members on two OSs, one offline; task changes converge or preserve conflicts; dependency cycles are rejected; scope/deliverable approval is version specific; private costs stay private in views/search/exports; and every planning action works with keyboard and in English/Arabic RTL. Scheduling relation types, custom-field limits, approval policy and capacity calendars remain explicit decisions.
