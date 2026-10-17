# Dashboards, reports, knowledge and search

Status: proposed P06 scope. Basic overview/search appears with each source module earlier; advanced aggregation depends on accepted P02–P05 data and current permissions. No AI or semantic-model indexing is included.

## INS-001 — Actionable home and saved views

Home shows assigned/unassigned eligible tasks, due milestones, active timer, review requests, pending sync/conflicts, unbilled work and receivables when permitted. Each card names filters/as-of and links to source records. Widgets can be reordered/hidden per user; shared dashboards have explicit scope. Empty data is not zero earnings or a fake example. A Contributor cannot infer private finance from widget counts or hidden values. Offline cards identify incomplete cached scope.

## INS-002 — Reporting definitions and drill-down

Reports have versioned definition, date basis/timezone, scope, filters, currency policy, inclusion/exclusion and as-of/cursor. Distinguish invoiced net revenue, collected cash, credits/refunds, contracted backlog, opportunity forecast, expenses, direct labor cost and tax components. Do not label operational margin statutory profit. Every total drills down to permitted source IDs and reconciles to an exported snapshot. Updating a definition does not silently change a previously exported report.

## INS-003 — Profitability and effective rates

Service margin = net invoiced services after discounts/credits excluding configured taxes − attributed direct expenses − versioned internal labor cost. Collection-basis variant is separately labeled. Missing labor/expense allocation means incomplete margin, not zero cost. Effective collected rate requires known cash-to-work allocation and actual reviewed hours; no denominator yields “No data.” Fixed-price time is cost evidence. Different currencies remain separate unless explicit frozen FX valuation is chosen. Costs remain role-restricted in chart tooltips/export/drill-down.

## INS-004 — Receivables, aging and cash forecast

Aging buckets proposed: current, 1–30, 31–60, 61–90 and 90+ days relative to due date in report timezone. Exclude voids, show disputes/credits separately and reconcile bucket sums to outstanding balance. Forecast distinguishes contracted due payments, subjective promised dates, recurring draft projections and weighted pipeline. Show scenario assumptions, missing dates, overdue risk and currency. No prediction is guaranteed; confidence is an explicit business assumption. A payment/credit changes forecast through authoritative facts, not edited dashboard totals.

## INS-005 — Capacity and delivery insights

Show estimated/actual/remaining effort, cycle completion, throughput, blocked aging, milestone variance, capacity/leave and scope changes. Definitions distinguish task counts from effort and accepted from merely done. Plans with missing estimates are visibly incomplete. Never rank employee productivity from commits/keystrokes or infer work attendance. A manager sees only assigned-project scopes.

## INS-006 — Multi-currency reporting

Keep original currency/exponent and show grouped totals by default. Consolidation requires selected reporting currency, rate/source/date policy and missing-rate behavior. Snapshot rates used; rounding occurs at the declared aggregation boundary. Rate feed failure preserves prior rates with stale indicator and blocks misleading new valuations. Displayed conversion is operational reporting, not realized/unrealized FX accounting without a separately approved model.

## INS-007 — Knowledge, notes and reusable material

Create workspace/project personal or shared notes, Markdown-style safe content, code snippets, decision records, runbooks and reusable templates. Fields include title, body revision, owner/scope, tags, links, archive and attachment refs. Conflicting bodies preserve revisions; no silent rich-text overwrite. Template insertion copies approved content and never exposes another client's private data. No script execution, credential storage or AI summarization. Export references missing files explicitly.

## INS-008 — Global search and command palette

Search clients, tasks, projects, notes, permitted documents and metadata by text/filters/tags/date, with stable pagination/highlighting. Arabic normalization is an index-only aid; preserve original text. Mixed-language queries, diacritics and identifiers require fixtures. Offline results label cached coverage; online results enforce current grants before snippet/count generation. Permission/deletion changes invalidate index entries. Commands in the palette use the same authorization/online requirements as buttons, not hidden privileged routes.

## INS-009 — Reports, schedules and exports

Save personal/shared report definitions and export CSV/PDF or archived exact data with locale, as-of and basis. Scheduled reports are P07 jobs; recipients and data scopes revalidate at execution. Freeze snapshot before rendering; no moving totals during pagination. Cancel before publication, track partial file cleanup, retry same snapshot and avoid duplicate email. Arabic PDFs must pass shaping/layout/number tests. A recipient losing access stops the delivery rather than receiving an old private snapshot.

## INS-010 — Goals, health and alerts

Optional configured goals for revenue, collections, utilization and savings show period/basis/targets and progress from source facts. Threshold rules explain source/version and dedupe per crossing; missing data does not trigger misleading certainty. Health overrides have reason/expiry. Alerts do not change fees, schedules, collection status or user capacity automatically. Users can dismiss/snooze with history.

## Acceptance and release gates

Reconcile all report totals to finance/time fixtures; compare online full tenant with offline partial cache; hide restricted fields/counts/files; test currency precision and zero denominators; Arabic search/RTL exports; immutable prior report after changed definition; report retry after payment arriving during render; and revoked recipient scheduled delivery. Performance datasets are proposed in [test strategy](../quality/test-strategy.md). Reporting basis, FX feed and private-rate visibility remain decisions, not defaults disguised as facts.
