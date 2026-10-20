# SoloDesk — Full Feature-by-Feature Development Plan

**Date:** 17 October 2026  
**Status:** planned, not implemented  
**Repository:** https://github.com/m07amed25/SoloDesk  
**Verified target branch:** `main`  
**Delivery rule:** one feature/platform phase → one branch → one GitHub PR → documentation + automated testing + agent QA → user's final approval → merge.

This is the single root development plan requested by the user. It replaces the aborted Spec Kit planning scaffold; no feature directories, application changes, CI workflows, branches, commits, issues, PRs or remote settings are created by writing this plan. Existing product specifications remain the source of detailed behavior. The earlier P00–P09 groups are **milestones**, not ten giant PRs. The executable feature/platform phases are **F001–F151**, listed below.

## 1. Confirmed requirements and scope

- Build an Electron/React/TypeScript application for Windows, macOS and Linux using the existing Forge/Vite stack. Use Tailwind CSS and shadcn/ui.
- Serve solo freelancers and small teams from the first usable release. Cloud account and initial online enrollment required; authorized enrolled devices support offline work.
- Prefer efficient free/low-cost managed services. Recommended initial backend is Supabase Auth/PostgreSQL/private Storage/TypeScript Edge Functions and bounded scheduled jobs. Verify pricing, quotas, region and recovery before provisioning real data; do not promise uninterrupted free production.
- Encrypt cloud transport/storage and device databases/files/indexes/outbox/backups. OS secret storage does not itself encrypt SQLite. Current standard better-sqlite3 is not an approved encryption implementation.
- English and Arabic, full RTL, accessibility, current permissions, honest sync states and recovery are part of every applicable feature, not final cosmetic work.
- Invoice drafts can be edited offline; issuance is online and transactional. Money is exact, historical snapshots immutable, billable sources consumed only once, provider effects idempotent.
- Financial capabilities are configurable, with explicit country/number/tax/rounding/retention profile validation before real-market claims.
- No AI product features, native mobile application, complete payroll/general ledger, raw-card handling or first-release self-hosting in this plan.
- **User-confirmed QA workflow:** automated tests and agent QA, then the user gives final approval for each PR. Green checks or agent QA alone do not authorize merge.

The current implementation is the welcome shell plus launcher fixes. Full docs and agent skill guides exist; the product/backend/encryption/sync/finance/portal features below are not implemented. Existing uncommitted AGENT.md/AGENTS.md and README edits predate this plan and must not be discarded accidentally.

## 2. What counts as one feature phase

A phase delivers one bounded user or platform outcome through its necessary domain/storage/API/bridge/UI layers. Foundation capabilities (encrypted storage, CI, synchronization, distribution) count as platform phases because later features cannot safely ship without them. A stable requirement ID can span more than one phase where it bundles separate features; several requirements can describe the same coherent feature.

Each phase has exactly one primary PR identity. Fix failures in the same open PR; never merge a model PR, a UI PR and a test PR for the same phase separately. If scope is too large for a reviewable feature PR, split **before implementation** into new feature IDs and update this plan/dependencies/coverage. Do not silently replace the rule with multiple PRs under one phase. Later bugs have their own maintenance phase/PR linked to the original; never rewrite merged history.

Default execution is the listed dependency-correct order. A phase may start only after its prerequisites merge and its listed decision gates resolve. Independent phases may run concurrently only with merged prerequisites, separate file ownership and an agreed integration plan. A milestone/release cannot skip an included phase just because its PR is independently mergeable. No calendar dates or effort estimates are committed without team capacity and scope evidence.

## 3. Per-feature build and PR lifecycle

1. **Select and prepare:** choose the next F-ID; inspect current code and its linked requirements, fields/states, role/offline behavior and decisions. Recheck prerequisites; distinguish actual implementation from old plans. Read AGENT.md and relevant skills. Do not rerun unrelated planning workflows.
2. **Lock the feature contract:** state included/excluded behavior, acceptance examples, domain/data/API changes, migrations, permissions, online/offline actions, failure/retry/recovery and rollout/backout. Resolve only decisions blocking this feature. Reuse existing approved policies; do not reopen confirmed choices.
3. **Create branch:** `feat/f###-short-slug` from the latest verified `main` after earlier required phases merge. Preserve unrelated working changes. One active feature branch per checkout; use isolated worktrees for genuinely concurrent authorized work.
4. **Write meaningful tests:** add scenario/property/contract/integration tests appropriate to the feature before or alongside implementation, with independent expected values. For requested behavioral test-first tasks, prove failure is due to the missing behavior. Do not add trivial implementation-mirroring tests or claim test creation means tests passed.
5. **Build the vertical slice:** pure rule/model → local/server persistence and constraints → application command/query → narrow IPC/API → accessible English/Arabic UI where relevant. Enforce current authority at trusted boundaries, not only buttons. Add exact transaction/idempotency and migration support with the feature.
6. **Document:** update relevant specifications/decision/coverage references, feature/user guidance, migrations/rollback notes and operations runbook where affected. Include screenshots/artifacts only where they demonstrate actual behavior; label synthetic data.
7. **Open one reviewable PR:** title `[F###] <feature outcome>`, target `main`, include the feature ID and requirement IDs. Use Draft while work/QA is incomplete where available. Do not pre-open 151 empty PRs.
8. **Automated verification:** run all applicable current checks and regression suites. Save commands, environment, result and artifacts against the latest commit. Fix failures; never mark skipped/unrun tests passed.
9. **Agent QA:** exercise the phase's actual positive, denied, malformed, offline/retry/concurrent and recovery scenarios; check Arabic/RTL/keyboard/private-field behavior and relevant native platforms. Record observed results and defects, not just code review.
10. **User review:** present the concrete PR, scope, test/QA evidence, remaining limitations and risks. User gives final approval after the latest meaningful change. If the author is the user's own GitHub account, self-approval cannot satisfy an independent GitHub-review requirement; record owner QA/merge approval honestly.
11. **Merge and reconcile:** after user approval, required checks and applicable reviews, squash-merge the one feature PR (recommended), record URL/merge SHA and update actual status. Rebase/retest as needed if the base changed. Do not auto-merge because checks are green.
12. **Release separately:** merged is not deployed/released. Apply the relevant pilot/stable/signing/service gates and explicit authorized rollout. Monitor and use the documented compatible rollback/forward repair.

Phase statuses: `planned → decision-ready → building → PR open/draft → automated checks passed → agent QA passed → awaiting user approval → approved → merged → released`. A blocked/failed state has a reason and next action. Status never advances without actual evidence.

## 4. Mandatory contents of every feature PR

### Documentation deliverables

These are future deliverables within the feature PR, not additional files created by this planning request:

- `docs/features/F###.md`: behavior, acceptance, linked IDs, fields/states, permissions, offline/online contract, UI notes and known limits.
- `docs/qa/F###.md`: exact build/commit, environments, fixtures, automated results, agent QA steps/observations, defects and user sign-off.
- Update the affected existing domain/architecture/API/data-model/decision docs and usage/support guidance; add migration/backout/runbook details if applicable.
- Keep feature status and its PR URL/merge SHA traceable in this root plan or a future explicitly adopted tracker. Never use a planned feature ID as a fake GitHub PR number.

### PR description contract

Describe problem and resulting behavior; phase/requirement/dependency IDs; included/excluded scope; docs changed; test commands and results; QA evidence/artifact links; schema/API/security/financial impact; rollback/forward repair; flags/market/provider limitations; and approval status. Explain the concrete trigger/before-after behavior rather than recounting work history. The [F001 PR template](.github/pull_request_template.md) now implements this description contract.

### Minimum automated verification

- Documentation/schema/requirement link consistency, type checking, lint/format where configured, build and existing launcher regression.
- Feature-specific domain/contract/storage/API tests with positive, invalid, unauthorized, revision/retry and failure cases where applicable.
- UI/Electron end-to-end and English/Arabic/RTL/a11y checks for interactive features; exact rendered artifact reconciliation for PDF/CSV exports.
- Native matrix smoke for affected OS/CPU behavior; financial concurrency/property tests for money/source ownership; sync partitions/revocation/migrations for distributed features.
- Secrets/dependency/license/security checks and redacted logs. Test with synthetic tenants/provider sandboxes, never production keys or real payments.

Document a justified **not applicable** for a test category, never a blanket waiver. A docs-only governance PR still has automated consistency checks and agent review; unavailable future CI cannot be reported as running. Until F002 supplies CI, capture equivalent existing/local checks honestly.

### Agent QA checklist applied to every relevant phase

- [ ] Positive user/platform outcome works through the real integrated path.
- [ ] Missing/invalid/long/Arabic/mixed-direction inputs and empty/loading/error states behave correctly.
- [ ] Incorrect roles/tenants/project scopes are rejected across pages, lists/counts, search, files, exports and notifications.
- [ ] Offline/online status and unknown outcome are honest; restart/retry/response loss cannot lose or duplicate work.
- [ ] Keyboard/focus/screen-reader semantics and English/Arabic RTL remain usable; animation respects reduced motion when relevant.
- [ ] Native lifecycle/file dialog/secret store/platform regression is verified on every affected supported target, or explicitly remains blocked.
- [ ] Exact finance/time values match independent fixtures; no silent snapshot change or duplicated source consumption.
- [ ] Actual observed result, build identity, commands/artifacts and unresolved defects are recorded; user receives a concise evidence summary.

A category can be inapplicable for a pure platform/docs phase with a reason. Missing required native/Arabic/security evidence is a real gate, not an inferred pass from Linux screenshots. Automated checks do not replace agent interaction QA; agent QA does not replace the user's final approval or fluent/native review where required.

### Merge definition of done

All included requirements implemented; applicable tests pass on the latest PR commit/base; docs complete; QA complete with no blocking defect; migrations/backout safe; financial/security invariants intact; dependencies merged; unresolved limitations accurately disabled/documented; and **user final approval recorded**. Material code/schema/behavior changes after QA invalidate affected evidence and approval until rerun/review. Never merge with tenant leakage, double billing, data loss, plaintext fallback or broken critical bilingual flows.

## 5. GitHub setup and cost-aware enforcement

Read-only inspection found this repository public, default branch main, and the current authenticated viewer with ADMIN permission. F001 read-only inspection found no rulesets and no main branch protection; see [current QA](docs/qa/F001.md). No remote settings were changed. F002 owns separately authorized enforcement.

Recommend PR-only main updates, no ordinary force-push/deletion, resolved conversations, current required checks and a single aggregate phase gate. Use uniquely named required checks; do not path-skip the only required workflow and leave it pending, or let skipped dependent jobs produce a false success. An always-running gate evaluates applicable jobs and evidence. Separate user final approval from CI automation. Add a mandatory independent human code review only if a real reviewer is available; agent review is not an independent GitHub human approval.

GitHub documents free standard hosted Actions for public repositories and plan-dependent private repository protection/drafts/quotas. Reverify if visibility/plan changes. Run fast Linux checks on relevant PR changes, native matrix when required by risk, and all declared platform/release gates before distribution. Cancel superseded runs, bound artifact size/retention and keep compact QA summaries in the repository. No paid runner, visibility change or subscription purchase is authorized by this plan. A quota failure leaves the feature blocked or requires equivalent documented local evidence where the policy allows; it never means tests passed.

PR automation uses least permissions (initially contents read), untrusted PR code cannot access signing/production/provider secrets, and trusted signing/deployment is isolated. Pin verified action versions/commit identities and keep dependencies locked. Do not run untrusted PR code through privileged pull_request_target workflows.

Official references: [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [approval rules](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [secure Actions](https://docs.github.com/en/actions/reference/security/secure-use).

## 6. Architecture and build order

Keep current app/main and app/renderer. Add narrow preload only with validated commands. Pure shared domain/contracts are separate from Electron/SQL/HTTP. Encrypted local adapters own cache/outbox/files and independent migrations; backend owns accepted data, current membership, receipts/numbers/allocations, audit and event cursor. Supabase Edge Functions call restricted transactional database commands; private objects and database records require coordinated backup. A separate hosted bilingual authentication UI is needed in P01; full client portal follows later. Heavy rendering/import work uses bounded workers/runtime proofs, not an assumed unlimited free server.

Suggested future paths: `app/preload/`, `app/renderer/screens/`, `packages/domain/`, `packages/application/`, `packages/contracts/`, `infrastructure/local-store/`, `infrastructure/cloud-client/`, `infrastructure/exports/`, `supabase/migrations/`, `supabase/functions/`, `web/` for hosted auth/portal, and `tests/` for domain/contract/integration/sync/desktop/document/provider suites. These paths are proposed and do not exist merely because listed here. Each implementation phase refines exact files against the current tree; avoid copying irrelevant scaffold conventions.

Critical sequencing: encrypted native storage proof before real persisted data; tenant/command authority before domain writes; hosted sign-in/roles/revocation before team release; outbox/pull/conflicts before offline collaboration; private attachments before receipts/deliverables; exact calculation and source ownership before issue; immutable snapshots before exports/publication; durable jobs before recurrence/reminders; financial corrections/reconciliation before provider money automation; guest scope before portal publication. Native signing/callback/ABI feasibility is investigated early, not discovered at final release.

## 7. Release slices and milestone groups

| Slice                         | Included delivery | Required interpretation                                                                                                                                                                                    |
| ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation                    | F001–F030         | Secure team/offline/cloud architecture and verification enablers; not a usable finance product                                                                                                             |
| Core pilot                    | F001–F049         | Real client→project→task→time→draft→online issue→PDF→partial manual payment, roles, encrypted offline sync/recovery and bilingual QA; only approved markets/native targets, otherwise synthetic evaluation |
| Advanced delivery/business    | F050–F113         | CRM, contracts, controlled delivery, advanced time, configured finance and explainable reports; core contracts remain intact                                                                               |
| Connected/portal              | F114–F137         | Only approved providers/rules/guest publication; no automatic broad data sharing or AI                                                                                                                     |
| Commercial/platform readiness | F138–F151         | Safe closure/optional product seats, recovery/compatibility/performance, supported signed installers/updates and stable acceptance                                                                         |

The stable release PR depends on every enabled included feature, not only its abbreviated direct prerequisites. Optional providers/commercial product billing can remain disabled and excluded from a release only by an explicit release-scope decision. They stay planned, not silently considered complete. Every release, including a smaller public core release, still requires all applicable P09 platform/security/recovery/signing gates; sequence positions do not waive them. Teams, English/Arabic and encrypted offline behavior cannot be dropped from first release for convenience.

P00–P09 retain the original domain milestone meanings. They are organizational labels; feature dependencies determine execution and can pull an enabler such as durable jobs earlier than its old integration milestone. There is no PR for a whole milestone on top of its feature PRs.

## 8. Decision gates before dependent implementation

| Decision family                                       | Must resolve before                                        | Safe work while unresolved                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Q-01 country/seller/retention/legal document profile  | Real finance issuance/signature/market release             | Generic engine and synthetic fixtures; do not claim compliance                |
| Q-02 cloud region/budget/scale                        | Provision real hosted data or promise capacity             | Local synthetic backend and measured free-pilot recommendation                |
| Q-03 exact tax/discount/time rounding/FX/series       | Approve calculation fixtures and issue actual finance      | Define exact engine/policy versions with explicit unapproved state            |
| Q-04 idle/sleep/tray/manual limits                    | Finalize timer recovery/activity semantics                 | Durable capture/recovery evidence with review states                          |
| Q-05 roles/approvals/cost visibility                  | Ship grants, timesheets, expenses, high-risk money actions | Proposed default-deny matrix and synthetic denied tests                       |
| Q-06 offline authorization duration                   | Enable real offline access lease                           | Encrypted cache/outbox and expiry mechanism tests                             |
| Q-07 native encryption/key backup/recovery            | Persist customer data or claim protected offline support   | Native compatibility proof with synthetic data                                |
| Q-08 sign-in/MFA/recovery/invitation policy           | Public enrollment/account recovery                         | Validated sandbox auth/callback and bilingual UI                              |
| Q-09 external provider/sender/scopes/country          | Connect/send/charge/export through each provider           | Provider-independent adapter contracts, fixtures and dry runs                 |
| Q-10 guest/signatory evidence/expiry                  | Publish/approve/sign client content                        | Exact snapshots/manual evidence with honest provenance                        |
| Q-11 OS/CPU/package/signing/native QA access          | Claim support or ship that target                          | Linux evidence plus explicit blocked Windows/macOS gates, never inferred pass |
| Q-12 product price/license/seat/trial/grace           | Commercial SoloDesk seat billing/launch                    | Core business features and noncommercial pilot                                |
| Q-13 deletion/tombstone/backup grace/offline window   | Purge, closure or stale-device rejoin guarantees           | Archive and conservative retained tombstones                                  |
| Q-14 capacity/report/FX/cost assumptions              | Publish comparative business metrics                       | Explicit formula versions and incomplete-data states                          |
| Q-15 import sources/historic numbers/opening balances | Import real financial/customer records                     | Generic staged synthetic import/export                                        |
| Q-16 service levels/RPO/RTO/support/budget            | Production availability/recovery promise                   | Restore drills and measured limited-pilot behavior                            |

These gates are existing complex decisions, not reasons to ask the same global questions again. Ask focused questions just before the affected phase, record the answer, and continue unrelated ready phases. The concrete Spec Kit constitution is v1.0.0; F001 reviews it and completes the delivery/evidence policy. This root programme plan is not a claim that all future feature-specific Spec Kit gates are already passed. User preference for one root plan overrides creating a separate programme scaffold now.

## 9. Feature-phase index

The following is the proposed build/merge sequence. All phase/PR/checklist statuses are **planned/not run** today. Branch names and PR titles are proposed, not created branches or assigned GitHub PR numbers. Dependencies name prior phases; the detailed card below supplies scope, tests, QA and gates.

| Phase         | One PR feature outcome                             | Milestone | Dependencies                       |
| ------------- | -------------------------------------------------- | --------- | ---------------------------------- |
| [F001](#f001) | Delivery governance and PR standards               | P00       | None                               |
| [F002](#f002) | Automated CI and verification harness              | P01       | F001                               |
| [F003](#f003) | Shared typed commands and domain primitives        | P01       | F002                               |
| [F004](#f004) | Secure Electron lifecycle and preload bridge       | P01       | F003                               |
| [F005](#f005) | Accessible English/Arabic application shell        | P01       | F004                               |
| [F006](#f006) | Cross-platform key protection and encryption proof | P01       | F004                               |
| [F007](#f007) | Encrypted local persistence and migrations         | P01       | F003, F006                         |
| [F008](#f008) | Managed backend and tenant isolation               | P01       | F003                               |
| [F009](#f009) | Authoritative command receipts and audit           | P01       | F008                               |
| [F010](#f010) | Browser sign-in and native enrollment              | P01       | F005, F007, F009                   |
| [F011](#f011) | MFA and account recovery                           | P01       | F010                               |
| [F012](#f012) | Workspace creation and safe switching              | P01       | F010                               |
| [F013](#f013) | Member invitations                                 | P01       | F012                               |
| [F014](#f014) | Roles and project-scoped grants                    | P01       | F013                               |
| [F015](#f015) | Device enrollment and revocation                   | P01       | F011, F014                         |
| [F016](#f016) | Bounded offline authorization and lock             | P01       | F015                               |
| [F017](#f017) | Durable local outbox and push                      | P01       | F007, F009, F016                   |
| [F018](#f018) | Incremental pull and permission invalidation       | P01       | F017                               |
| [F019](#f019) | Conflict review center                             | P01       | F018                               |
| [F020](#f020) | Deletion tombstones and stale-device rejoin        | P01       | F019                               |
| [F021](#f021) | Personal, device and workspace settings            | P01       | F012, F014                         |
| [F022](#f022) | In-app and OS notification center                  | P01       | F014, F018, F021                   |
| [F023](#f023) | Private versioned attachments                      | P01       | F007, F014, F018                   |
| [F024](#f024) | Safe staged import framework                       | P01       | F003, F023                         |
| [F025](#f025) | Encrypted device backup export                     | P01       | F007, F023                         |
| [F026](#f026) | Isolated restore and reviewed cloud rejoin         | P01       | F020, F025                         |
| [F027](#f027) | Scoped portable data export                        | P01       | F014, F023                         |
| [F028](#f028) | Feature and policy configuration                   | P01       | F021, F009                         |
| [F029](#f029) | Native callback, packaging and signing feasibility | P01       | F004, F006, F010                   |
| [F030](#f030) | Durable scheduled job execution                    | P01       | F009, F014, F028                   |
| [F031](#f031) | Clients and contact profiles                       | P02       | F018, F021, F027                   |
| [F032](#f032) | Project creation and lifecycle                     | P03       | F031, F014                         |
| [F033](#f033) | Task creation, ownership and states                | P03       | F032, F005                         |
| [F034](#f034) | Task lists, filters and bulk editing               | P03       | F033                               |
| [F035](#f035) | Manual reviewed time entries                       | P04       | F033, F018                         |
| [F036](#f036) | Persistent timer start, pause, switch and stop     | P04       | F035, F004                         |
| [F037](#f037) | Timer crash, sleep and exit recovery               | P04       | F036                               |
| [F038](#f038) | Timezone and overlap reconciliation                | P04       | F037, F019                         |
| [F039](#f039) | Dated selling and internal cost rates              | P04       | F035, F021                         |
| [F040](#f040) | Exact money and calculation profiles               | P05       | F003, F028                         |
| [F041](#f041) | Offline invoice draft editor                       | P05       | F031, F039, F040                   |
| [F042](#f042) | Authoritative time/expense draft reservations      | P05       | F041, F009                         |
| [F043](#f043) | Invoice numbering and atomic online issuance       | P05       | F042, F040                         |
| [F044](#f044) | English/Arabic invoice PDF export                  | P05       | F043, F023                         |
| [F045](#f045) | Manual delivery and invoice status                 | P05       | F044                               |
| [F046](#f046) | Partial payments and unapplied client credit       | P05       | F043, F009                         |
| [F047](#f047) | Expense recording and receipt evidence             | P05       | F040, F023                         |
| [F048](#f048) | Core work and receivables overview                 | P06       | F034, F038, F045, F046             |
| [F049](#f049) | Core pilot release and cross-domain evidence       | P09       | F026, F027, F029, F048             |
| [F050](#f050) | Client archive, merge and relationship integrity   | P02       | F031, F043                         |
| [F051](#f051) | Opportunity pipeline and weighted forecast         | P02       | F031, F040                         |
| [F052](#f052) | Relationship activities and follow-ups             | P02       | F051, F022, F030                   |
| [F053](#f053) | Versioned service catalog                          | P02       | F039, F040                         |
| [F054](#f054) | Estimate scenarios and comparison                  | P02       | F053                               |
| [F055](#f055) | Proposal revisions and document sharing            | P02       | F054, F044                         |
| [F056](#f056) | Acceptance evidence and disputes                   | P02       | F055, F009                         |
| [F057](#f057) | Agreements, amendments and obligations             | P02       | F056, F023, F030                   |
| [F058](#f058) | Client onboarding checklists                       | P02       | F057, F033, F023                   |
| [F059](#f059) | Accepted engagement project handoff                | P02       | F056, F058, F032                   |
| [F060](#f060) | Renewals and deterministic client health           | P02       | F052, F057, F048                   |
| [F061](#f061) | Task hierarchy and checklists                      | P03       | F033                               |
| [F062](#f062) | Accessible Kanban workflow                         | P03       | F034, F061                         |
| [F063](#f063) | Task dependency graph                              | P03       | F061                               |
| [F064](#f064) | Milestone completion and acceptance                | P03       | F063, F056                         |
| [F065](#f065) | Task calendar view                                 | P03       | F034, F038                         |
| [F066](#f066) | Project timeline planning                          | P03       | F063, F065                         |
| [F067](#f067) | Team capacity and leave calendars                  | P03       | F014, F066                         |
| [F068](#f068) | Sprints and delivery cycles                        | P03       | F034, F064                         |
| [F069](#f069) | Recurring task generation                          | P03       | F030, F033, F038                   |
| [F070](#f070) | Project and task templates                         | P03       | F061, F063, F064                   |
| [F071](#f071) | Typed custom fields                                | P03       | F070, F003                         |
| [F072](#f072) | Scope baseline and change requests                 | P03       | F059, F064, F040                   |
| [F073](#f073) | Versioned deliverables and internal review         | P03       | F064, F023, F056                   |
| [F074](#f074) | Scoped comments, mentions and threads              | P03       | F014, F022, F033                   |
| [F075](#f075) | Project notes and attachment revisions             | P03       | F023, F074                         |
| [F076](#f076) | Budget baselines and threshold alerts              | P03       | F039, F048, F072                   |
| [F077](#f077) | Portfolio health, risks and decisions              | P03       | F076, F052                         |
| [F078](#f078) | Archive, task transfer and handover                | P03       | F073, F074, F042                   |
| [F079](#f079) | Unallocated time editing and conservation          | P04       | F042, F038                         |
| [F080](#f080) | Time list and calendar views                       | P04       | F079, F065                         |
| [F081](#f081) | Versioned billing time-rounding policies           | P04       | F040, F079                         |
| [F082](#f082) | Optional idle detection and review                 | P04       | F037                               |
| [F083](#f083) | Focus sessions and breaks                          | P04       | F036, F022                         |
| [F084](#f084) | Timesheet submission and approvals                 | P04       | F014, F079                         |
| [F085](#f085) | Partial time-source allocation                     | P05       | F043, F079, F084                   |
| [F086](#f086) | Time imports and detailed exports                  | P04       | F024, F027, F080                   |
| [F087](#f087) | Utilization and effective-rate metrics             | P06       | F080, F046, F067                   |
| [F088](#f088) | Credit notes and invoice correction                | P05       | F043, F046                         |
| [F089](#f089) | Refund recording and settlement reversals          | P05       | F088                               |
| [F090](#f090) | Expense approval, splits and reimbursement         | P05       | F047, F084, F042, F088             |
| [F091](#f091) | Deposits and final-invoice application             | P05       | F046, F088                         |
| [F092](#f092) | Milestone billing schedules                        | P05       | F064, F091, F054                   |
| [F093](#f093) | Monetary prepaid retainers                         | P05       | F089, F091                         |
| [F094](#f094) | Included-service retainers and overages            | P05       | F085, F093                         |
| [F095](#f095) | Client subscriptions and proration                 | P05       | F091, F094, F030                   |
| [F096](#f096) | Recurring invoice draft generation                 | P05       | F030, F041, F095                   |
| [F097](#f097) | Collection reminder schedules                      | P05       | F030, F045, F046, F022             |
| [F098](#f098) | Bank-file reconciliation                           | P05       | F024, F046, F090, F089             |
| [F099](#f099) | Portable accounting transaction exports            | P05       | F027, F088, F090, F098             |
| [F100](#f100) | Cross-currency settlement records                  | P05       | F046, F089, F040                   |
| [F101](#f101) | Disputes, write-offs and collection notes          | P05       | F088, F089, F097                   |
| [F102](#f102) | Branded bilingual document templates               | P05       | F044, F055, F088                   |
| [F103](#f103) | Validated market invoice profiles                  | P05       | F040, F043, F088, F102             |
| [F104](#f104) | Customizable home dashboards                       | P06       | F048, F077, F087                   |
| [F105](#f105) | Revenue and collection reports                     | P06       | F099, F100, F101                   |
| [F106](#f106) | Receivables aging and cash scenarios               | P06       | F105, F051, F097                   |
| [F107](#f107) | Project operational profitability                  | P06       | F105, F090, F039                   |
| [F108](#f108) | Delivery and capacity analytics                    | P06       | F067, F068, F077, F087             |
| [F109](#f109) | Consolidated FX reporting                          | P06       | F105, F100                         |
| [F110](#f110) | Knowledge library and safe reusable notes          | P06       | F075, F070                         |
| [F111](#f111) | Permission-aware global text search                | P06       | F110, F105, F018                   |
| [F112](#f112) | Reproducible report snapshots and exports          | P06       | F105, F106, F107, F109, F044       |
| [F113](#f113) | Business goals and explained threshold alerts      | P06       | F104, F105, F108, F022             |
| [F114](#f114) | Connector registry and OAuth secret lifecycle      | P07       | F014, F030, F015                   |
| [F115](#f115) | Typed deterministic automation rules               | P07       | F114, F030, F028                   |
| [F116](#f116) | GitHub project context and issue import            | P07       | F114, F033, F111                   |
| [F117](#f117) | GitLab project context and issue import            | P07       | F114, F033, F111                   |
| [F118](#f118) | Explicit engineering-status synchronization        | P07       | F115, F116, F117                   |
| [F119](#f119) | Calendar availability and event import             | P07       | F114, F065, F067                   |
| [F120](#f120) | Calendar export and invitations                    | P07       | F119, F115                         |
| [F121](#f121) | Verified outbound business email                   | P07       | F114, F115, F097, F102             |
| [F122](#f122) | Hosted payment links and checkout                  | P07       | F114, F043, F103                   |
| [F123](#f123) | Verified payment webhooks and payout matching      | P07       | F122, F098, F100, F009             |
| [F124](#f124) | Provider refunds, disputes and chargebacks         | P07       | F123, F089, F101                   |
| [F125](#f125) | Read-only bank-feed connection                     | P07       | F114, F098                         |
| [F126](#f126) | Accounting-tool connector                          | P07       | F114, F099, F123                   |
| [F127](#f127) | Scoped developer API                               | P07       | F009, F014, F114                   |
| [F128](#f128) | Signed outgoing webhooks                           | P07       | F127, F115, F030                   |
| [F129](#f129) | Job and connector health/repair console            | P07       | F114, F115, F121                   |
| [F130](#f130) | Scheduled report delivery                          | P07       | F112, F121, F129                   |
| [F131](#f131) | Scoped client portal authentication                | P08       | F010, F014, F015                   |
| [F132](#f132) | Exact-version external publication                 | P08       | F131, F073, F055, F102             |
| [F133](#f133) | Client deliverable feedback and approval           | P08       | F132, F074                         |
| [F134](#f134) | Client proposal acceptance and signing adapter     | P08       | F132, F056, F057, F114             |
| [F135](#f135) | Client invoice balance and payment portal          | P08       | F132, F123, F103                   |
| [F136](#f136) | Client questionnaires and onboarding responses     | P08       | F131, F058, F023                   |
| [F137](#f137) | Portal brand and notification preferences          | P08       | F132, F121                         |
| [F138](#f138) | Account and workspace closure workflow             | P01       | F020, F026, F027, F101, F015       |
| [F139](#f139) | SoloDesk plan and seat entitlements                | P09       | F028, F124, F138                   |
| [F140](#f140) | Privacy-safe diagnostics and support access        | P09       | F009, F014, F129                   |
| [F141](#f141) | Cloud database/blob recovery drills                | P09       | F026, F123, F129                   |
| [F142](#f142) | API/schema rolling compatibility                   | P09       | F020, F043, F129                   |
| [F143](#f143) | Performance and resource-budget verification       | P09       | F111, F112, F129                   |
| [F144](#f144) | Bilingual accessibility regression gate            | P09       | F137, F112, F005                   |
| [F145](#f145) | Signed Windows installer                           | P09       | F029, F142, F143                   |
| [F146](#f146) | Signed and notarized macOS distribution            | P09       | F029, F142, F143                   |
| [F147](#f147) | Supported Linux package distribution               | P09       | F029, F142, F143                   |
| [F148](#f148) | Verified updates and safe rollback/repair          | P09       | F145, F146, F147, F142             |
| [F149](#f149) | Operational alerts, quotas and incident controls   | P09       | F140, F141, F148                   |
| [F150](#f150) | Vendor exit and full workspace portability         | P09       | F099, F138, F141, F142             |
| [F151](#f151) | Stable release promotion and acceptance            | P09       | F103, F139, F144, F148, F149, F150 |

## 10. Detailed phase contracts

The common documentation/testing/QA/merge contract in sections 3–4 applies to **every card**. Tests below add feature-specific cases, not substitutes for required denial, recovery and bilingual checks. For every phase, create/update its future feature guidance and QA report in that same implementation PR, update the owning existing specs, and record actual evidence before asking for the user's final approval.

<a id="f001"></a>

### F001 — Delivery governance and PR standards

- **PR identity:** `[F001] Delivery governance and PR standards`; branch `feat/f001-delivery-governance-and-pr-standards` → `main`; one PR; [PR #1](https://github.com/m07amed25/SoloDesk/pull/1) merged 17 October 2026; inspected merge `c66095e65e0b901aeeddf4f9e1d7274be5fdbf8a`.
- **Prerequisites:** None; preserve existing working changes. **Milestone:** P00 — Product and development governance.
- **Requirements:** NFR-014. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Review the established constitution from confirmed principles; define branch/PR naming, feature evidence and review policy; preserve existing docs and requirement IDs.
- **Automated tests:** Validate policy links, phase/requirement references and no undocumented approval bypass. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent audits the policy; owner approves the first feature PR and its evidence convention. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F001.md`, `docs/qa/F001.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Review staffing and QA owner are resolved: automated tests plus agent QA, then user approval.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f002"></a>

### F002 — Automated CI and verification harness

- **Feature specification:** [Full F002 specification](specs/002-ci-verification-harness/spec.md), [technical plan and design artifacts](specs/002-ci-verification-harness/plan.md), [dependency-ordered tasks](specs/002-ci-verification-harness/tasks.md) and [requirements-quality checklist](specs/002-ci-verification-harness/checklists/requirements.md). Specification/planning readiness does not change delivery status or authorize implementation.
- **PR identity:** `[F002] Automated CI and verification harness`; branch `feat/f002-automated-ci-and-verification-harness` → `main`; one primary [PR #2](https://github.com/m07amed25/SoloDesk/pull/2), merged by the repository owner at `196555cc8fd05e9f8c5a5cf1d59dd38634440218` on 18 October 2026 (Cairo). Security repair, baseline and all three native targets passed with automated readiness true. Fork/control evidence remains unexecuted; release/protection activation unclaimed. Outcome/LF documentation continues as linked maintenance.
- **Prerequisites:** F001 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** NFR-008, NFR-014, NFR-015. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Add locked installs, type/lint/build, meaningful unit/integration runners, desktop test harness, documentation integrity and an always-running aggregate PR gate.
- **Automated tests:** Inject a failing applicable job and missing evidence; prove the aggregate fails; verify superseded-run cancellation and secret isolation. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Run a real test PR through success/failure paths; distinguish available checks from planned jobs. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F002.md`, `docs/qa/F002.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Confirm Actions settings and artifact budget; do not change public visibility or purchase runners.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f003"></a>

### F003 — Shared typed commands and domain primitives

- **Feature specification:** [Full F003 specification](specs/003-shared-domain-contracts/spec.md), [technical plan and design artifacts](specs/003-shared-domain-contracts/plan.md), [dependency-ordered tasks](specs/003-shared-domain-contracts/tasks.md) and [requirements-quality checklist](specs/003-shared-domain-contracts/checklists/requirements.md). Implementation authorized by the user’s speckit-implement request. Pure packages, exact arithmetic, bounded serialization, bilingual errors and synthetic adapter/runtime suites are implemented; engineering bounds/version profiles are adopted. [Actual QA](docs/qa/F003.md) and [feature guide](docs/features/F003.md) retain pending fluent/native/hosted/approval gates.
- **PR identity:** `[F003] Shared typed commands and domain primitives`; branch `feat/f003-shared-typed-commands-and-domain-primitives` → `main`; [primary draft PR #4](https://github.com/m07amed25/SoloDesk/pull/4). Status: implemented, repaired hosted/native verification and two independent clean installations passed; fluent Arabic review, final evidence sign-off, user approval/merge/release remain pending. PR #2 and PR #3 belong to F002.
- **Prerequisites:** F002 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** NFR-001, NFR-015, PLT-008. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Define versioned DTOs, IDs, exact decimal/money and integer-second types, stable localized error codes, validation bounds and adapter ports.
- **Automated tests:** Reject malformed/oversized payloads, cross-tenant references, unsupported versions and float-based authoritative amounts. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Review representative English/Arabic error displays and serializable contracts without exposing internals. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F003.md`, `docs/qa/F003.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Engineering F003-bounds-v1 and protocol/payload/event version 1 adopted for this implementation; Q-03/Q-04 financial/timer policies remain open.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f004"></a>

### F004 — Secure Electron lifecycle and preload bridge

- **Specification and design:** [F004 feature specification](specs/004-secure-electron-lifecycle/spec.md), [requirements quality checklist](specs/004-secure-electron-lifecycle/checklists/requirements.md), and [implementation plan](specs/004-secure-electron-lifecycle/plan.md). These artifacts define acceptance and design; they do not establish implementation, native QA or approval.
- **PR identity:** `[F004] Secure Electron lifecycle and preload bridge`; proposed branch `feat/f004-secure-electron-lifecycle-and-preload-bridge` → `main`; one future PR. F004 implementation, automated/native QA, delivery evidence, owner approval and merge are not established in the checked-out baseline. The previously linked [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) is the merged F002 verification-harness PR, not F004.
- **Prerequisites:** F003 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-012, NFR-015. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Add single-instance/profile ownership, narrow validated preload IPC, sender/origin checks, safe deep links/external URLs and shutdown/window behavior.
- **Automated tests:** Deny arbitrary SQL/filesystem/shell/URLs, forged sender/frame and malicious deep links; regress native controls and Snap startup. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent exercises launch/close/restart/window controls and keyboard behavior; native platform matrix documented. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F004.md`, `docs/qa/F004.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** OS callback/close/tray support policy; never use blanket sandbox disabling.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f005"></a>

### F005 — Accessible English/Arabic application shell

- **Specification:** [F005 feature specification](specs/005-accessible-application-shell/spec.md) and [requirements quality checklist](specs/005-accessible-application-shell/checklists/requirements.md). These artifacts define requirements and acceptance; they do not establish implementation, native QA, owner approval or merge.
- **PR identity:** `[F005] Accessible English/Arabic application shell`; branch `feat/f005-accessible-english-arabic-application-shell` → `main`; one PR; implementation, automated verification, and QA evidence prepared; [PR #8](https://github.com/m07amed25/SoloDesk/pull/8) merged.
- **Prerequisites:** F004 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-015, NFR-006, NFR-007, NFR-015. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Build navigation, workspace/timer/sync placeholders, translation infrastructure, full RTL/logical layout, theme/focus and command-shell routing with Tailwind/shadcn.
- **Automated tests:** Test RTL reading order, mixed bidi IDs, translated validation, keyboard focus, zoom and denied navigation. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests both languages, long Arabic content, 200% zoom and keyboard-only navigation; fluent Arabic review remains explicit. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F005.md`, `docs/qa/F005.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve visual direction and product minimum window size.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f006"></a>

### F006 — Cross-platform key protection and encryption proof

- **Specification and design:** [F006 feature specification](specs/006-cross-platform-key-protection/spec.md), [requirements quality checklist](specs/006-cross-platform-key-protection/checklists/requirements.md), and [implementation plan](specs/006-cross-platform-key-protection/plan.md). These are planning artifacts; Q-07/Q-11 decisions and native proof are tracked as separate evidence gates.
- **PR identity:** `[F006] Cross-platform key protection and encryption proof`; branch `feat/f006-cross-platform-key-protection-and-encryption-proof` → `main`; one PR; implementation and baseline/three-target native QA executed; verification passed; delivery packet prepared; [PR #9](https://github.com/m07amed25/SoloDesk/pull/9) open; owner review pending.
- **Prerequisites:** F004 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-007, NFR-005. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Prove an Electron-compatible encrypted SQLite adapter, OS-wrapped device keys and encrypted attachment/temp/WAL handling on supported native targets.
- **Automated tests:** Show raw database/files are unreadable; test locked/missing vault, Linux basic_text rejection, rotation interruption and key loss. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Inspect actual Windows/macOS/Linux native evidence, ABI/signing behavior and local-key recovery limits. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F006.md`, `docs/qa/F006.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-07 encryption adapter/licensing/fallback; Q-11 OS/CPU access. Blocks persisted business data.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f007"></a>

### F007 — Encrypted local persistence and migrations

- **Specification and design:** [F007 feature specification](specs/007-encrypted-local-persistence/spec.md) and [requirements quality checklist](specs/007-encrypted-local-persistence/checklists/requirements.md). Specification/planning readiness does not change delivery status or authorize implementation.
- **PR identity:** `[F007] Encrypted local persistence and migrations`; branch `feat/f007-encrypted-local-persistence-and-migrations` → `main`; one PR; implementation and baseline/three-target native QA executed; verification passed; delivery packet prepared; [PR #10](https://github.com/m07amed25/SoloDesk/pull/10) open; owner review pending.
- **Prerequisites:** F003, F006 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-007, NFR-003, NFR-010. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Implement protected per-account/workspace cache, transactions, schema history, migration journal and recoverable read failures.
- **Automated tests:** Kill before/after commit and migration stages; disk-full/corrupt/key failures preserve prior data or enter explicit recovery. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Reopen after forced termination; prove no automatic empty database and no plaintext fallback. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F007.md`, `docs/qa/F007.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve local migration recovery and reference dataset.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f008"></a>

### F008 — Managed backend and tenant isolation

- **Specification and design:** [F008 feature specification](specs/008-managed-backend-and-tenant-isolation/spec.md) and [requirements quality checklist](specs/008-managed-backend-and-tenant-isolation/checklists/requirements.md). Specification/planning readiness does not change delivery status or authorize implementation.
- **PR identity:** `[F008] Managed backend and tenant isolation`; branch `feat/f008-managed-backend-and-tenant-isolation` → `main`; one PR; implementation and baseline/synthetic QA executed; [PR #11](https://github.com/m07amed25/SoloDesk/pull/11) open; hosted readiness passed; manual delivery evidence and owner approval pending.

- **Prerequisites:** F003 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-003, PLT-005, NFR-004, NFR-009. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Define Supabase local/staging schemas, tenant keys, relational constraints, least-privilege RLS/private storage baseline and bounded Edge Functions.
- **Automated tests:** Attempt cross-workspace reads/writes/counts and service-key exposure; test foreign-key and tenant constraints. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests two tenants through authorized and direct denied requests; document free-tier outage/quota behavior. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F008.md`, `docs/qa/F008.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-02 region/real-data provisioning; local synthetic services can proceed without paid signup.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f009"></a>

### F009 — Authoritative command receipts and audit

- **Specification and design:** [F009 feature specification](specs/009-authoritative-command-receipts/spec.md), [implementation plan](specs/009-authoritative-command-receipts/plan.md), and [requirements quality checklist](specs/009-authoritative-command-receipts/checklists/requirements.md). Specification/planning readiness does not change delivery status or authorize implementation.
- **PR identity:** `[F009] Authoritative command receipts and audit`; branch `feat/f009-authoritative-command-receipts-and-audit` → `main`; one PR; partial synthetic backend and contract implementation; 45/45 emulator and boundary regression tests pass; PostgreSQL transaction/query functions, production adapters, and rendered UI acceptance remain incomplete; [QA limitations](docs/qa/F009.md) and open feature tasks govern delivery status.
- **Prerequisites:** F008 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-014, NFR-001, NFR-004. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Add verified actor/current-scope entry points, expected revisions, transactional receipts/request digests, accepted event cursor and redacted append-only audit.
- **Automated tests:** Replay same operation; reject changed payload using same key; simulate response loss/concurrency and audit write failure. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Inspect one effect and traceable redacted audit per accepted command; ordinary roles cannot edit audit. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F009.md`, `docs/qa/F009.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve receipt retention and service audit access.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f010"></a>

### F010 — Browser sign-in and native enrollment

- **PR identity:** `[F010] Browser sign-in and native enrollment`; branch `feat/f010-browser-sign-in-and-native-enrollment` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F005, F007, F009 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-001, PLT-002. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Build separate bilingual hosted sign-in UI, Supabase auth/session flow, system-browser PKCE/state and validated native callback; enroll first device online.
- **Automated tests:** Wrong state/redirect/account, expired code, interrupted callback and unavailable network cannot expose another cache. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent completes real sandbox sign-in in both languages, restart and account-switch isolation. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F010.md`, `docs/qa/F010.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-08 auth methods/callback; Q-02 hosting; SMTP must be verified before public email onboarding.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f011"></a>

### F011 — MFA and account recovery

- **PR identity:** `[F011] MFA and account recovery`; branch `feat/f011-mfa-and-account-recovery` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F010 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-002. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Implement configured MFA enrollment/challenge/recovery codes, reauthentication and lost-session/password recovery without claiming recovery of missing unsynced keys.
- **Automated tests:** Replay/expired recovery, revoked session and MFA-reset abuse tests; cloud re-fetch differs from local-key recovery. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows successful/failed recovery; user verifies security prompts and recovery guidance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F011.md`, `docs/qa/F011.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-08 mandatory MFA and identity recovery policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f012"></a>

### F012 — Workspace creation and safe switching

- **PR identity:** `[F012] Workspace creation and safe switching`; branch `feat/f012-workspace-creation-and-safe-switching` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F010 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-003. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Create solo/team workspaces with profile/timezone/defaults; switch caches/subscriptions safely; show current tenant in consequential actions.
- **Automated tests:** Switch with pending edits; wrong-account cache/key reuse and stale UI commands are denied. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent uses two workspaces and restarts offline; no data or notification crosses tenants. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F012.md`, `docs/qa/F012.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Initial seller/workspace profile defaults remain configurable.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f013"></a>

### F013 — Member invitations

- **PR identity:** `[F013] Member invitations`; branch `feat/f013-member-invitations` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F012 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-004. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Create recipient-bound role/scope invitations with expiry, one-use acceptance, resend invalidation and revoke.
- **Automated tests:** Wrong identity, duplicate/expired/revoked invite, failed delivery and retry produce correct membership count. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent invites a contributor, finance member and existing user; records delivery versus acceptance separately. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F013.md`, `docs/qa/F013.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-08 invite expiry; public email sender/provider readiness.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f014"></a>

### F014 — Roles and project-scoped grants

- **PR identity:** `[F014] Roles and project-scoped grants`; branch `feat/f014-roles-and-project-scoped-grants` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F013 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-005, NFR-004. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Implement capability-based Owner/Admin/Manager/Contributor/Finance/Viewer templates, project/client grants, ownership transfer and policy invalidation.
- **Automated tests:** Prevent self-escalation/final-owner removal; deny finance via list/count/search/file/export/subscription paths. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests each role and scope downgrade on open views; owner validates the permission matrix. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F014.md`, `docs/qa/F014.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-05 role/approval choices; default-deny is mandatory.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f015"></a>

### F015 — Device enrollment and revocation

- **PR identity:** `[F015] Device enrollment and revocation`; branch `feat/f015-device-enrollment-and-revocation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F011, F014 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-006. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** List device label/version/last contact, manage independent credentials/keys, revoke sessions and handle next-contact local restrictions.
- **Automated tests:** Revoked device cannot push or refresh; enrollment/re-auth cannot bind a different account silently. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent revokes a second device while offline and reconnects it; explain limits of remote wipe. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F015.md`, `docs/qa/F015.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-07 key enrollment and local retention after revoke.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f016"></a>

### F016 — Bounded offline authorization and lock

- **PR identity:** `[F016] Bounded offline authorization and lock`; branch `feat/f016-bounded-offline-authorization-and-lock` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F015 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-010. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Issue signed offline leases, encrypted unlock/lock states, expiry/reauth recovery and honest cached access policy.
- **Automated tests:** Expired/revoked lease, clock anomalies and failed sign-in preserve encrypted pending work without granting online authority. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent uses disconnected restart and lease expiry in both languages; user approves the access policy. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F016.md`, `docs/qa/F016.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-06 offline period; Q-07 recovery. Do not invent unlimited offline access.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f017"></a>

### F017 — Durable local outbox and push

- **PR identity:** `[F017] Durable local outbox and push`; branch `feat/f017-durable-local-outbox-and-push` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F007, F009, F016 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-008, NFR-002. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Commit eligible local changes with outbound commands atomically; order dependencies; use bounded retries and per-operation accepted/rejected receipts.
- **Automated tests:** Kill between save/enqueue, duplicate/reordered push and response loss cannot lose or duplicate accepted changes. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent edits offline, restarts, reconnects and inspects local versus synchronized status. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F017.md`, `docs/qa/F017.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Resolve supported offline window and payload bounds.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f018"></a>

### F018 — Incremental pull and permission invalidation

- **PR identity:** `[F018] Incremental pull and permission invalidation`; branch `feat/f018-incremental-pull-and-permission-invalidation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F017 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-008, NFR-004. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Apply authorized accepted events/cursor atomically, refresh cache scopes, dispose old subscriptions and resynchronize after interruptions.
- **Automated tests:** Dropped/reordered events, cursor rollback, role downgrade and unknown schema stop or recover safely. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares two-device views and verifies hidden data stops arriving after grant removal. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F018.md`, `docs/qa/F018.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Protocol/version compatibility rules; Realtime is only a pull hint.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f019"></a>

### F019 — Conflict review center

- **PR identity:** `[F019] Conflict review center`; branch `feat/f019-conflict-review-center` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F018 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-009. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Preserve base/local/remote candidates; merge only proven independent fields; resolve against current revision with audit.
- **Automated tests:** Same-field edit, changed role, resolver race and rejected financial merge preserve evidence and prevent hidden-field leaks. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent creates/reviews/resolves real two-device conflicts, including Arabic long notes. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F019.md`, `docs/qa/F019.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve field merge policy; never last-write-wins financial facts.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f020"></a>

### F020 — Deletion tombstones and stale-device rejoin

- **PR identity:** `[F020] Deletion tombstones and stale-device rejoin`; branch `feat/f020-deletion-tombstones-and-stale-device-rejoin` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F019 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** NFR-002, NFR-003, NFR-010, PLT-008. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Separate archive/delete/purge, retain scoped tombstones, enforce cursor retention and resnapshot old devices before writes.
- **Automated tests:** Delete/edit conflict, long-offline device and restored cursor cannot resurrect purged data. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent restores/rejoins a stale cache with permitted local edits and checks rejected-operation recovery. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F020.md`, `docs/qa/F020.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-13 tombstone/offline/retention windows.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f021"></a>

### F021 — Personal, device and workspace settings

- **PR identity:** `[F021] Personal, device and workspace settings`; branch `feat/f021-personal-device-and-workspace-settings` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F012, F014 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-011. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Separate preference scopes, locale/digits/timezone/theme/quiet hours, workspace defaults and protected profile edits.
- **Automated tests:** Personal/device settings cannot overwrite another user's preferences; defaults cannot mutate saved snapshots. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent switches languages/workspaces and compares device settings; finance-sensitive fields need capability. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F021.md`, `docs/qa/F021.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03 financial defaults remain draft until profile approval.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f022"></a>

### F022 — In-app and OS notification center

- **PR identity:** `[F022] In-app and OS notification center`; branch `feat/f022-in-app-and-os-notification-center` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F018, F021 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-013. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Add deduped unread/read/snooze, source links, quiet hours and accessible OS-permission fallback.
- **Automated tests:** Grant changes suppress private snippets; duplicate events and missed reminders do not flood; invalid links fail safely. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent denies OS permission, restarts after quiet hours and checks Arabic notifications. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F022.md`, `docs/qa/F022.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Required security notices versus optional preferences.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f023"></a>

### F023 — Private versioned attachments

- **PR identity:** `[F023] Private versioned attachments`; branch `feat/f023-private-versioned-attachments` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F007, F014, F018 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** WRK-011, FIN-033, NFR-005. **Behavior authority:** [requirements](docs/product/requirements.md), [finance](docs/specs/finance.md), [work-management](docs/specs/work-management.md).
- **Build the feature:** Stage files encrypted, validate type/size/hash, resume upload, commit verified private refs and reauthorize downloads with short-lived links.
- **Automated tests:** Interrupted upload, traversal/bomb, wrong hash, expired/revoked URL and cross-tenant bytes are rejected. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests local-pending and remote files plus missing-file repair; internal files never publish implicitly. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F023.md`, `docs/qa/F023.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Storage quotas, scan policy, content limits and backup scope.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f024"></a>

### F024 — Safe staged import framework

- **PR identity:** `[F024] Safe staged import framework`; branch `feat/f024-safe-staged-import-framework` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F003, F023 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-016, NFR-013. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Add inert CSV/JSON/archive parsing, locale/encoding mapping, row previews, duplicate IDs, staged errors and batch provenance.
- **Automated tests:** Malformed/oversized archives, Arabic digits, bad parents, exact reimport and changed duplicate rows handled without silent merge. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews/cancels a synthetic import; no email, billing or execution side effect occurs. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F024.md`, `docs/qa/F024.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-15 source formats; financial imports need later authoritative review.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f025"></a>

### F025 — Encrypted device backup export

- **PR identity:** `[F025] Encrypted device backup export`; branch `feat/f025-encrypted-device-backup-export` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F007, F023 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-016, NFR-003, NFR-005. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Export versioned encrypted manifest, permitted records/local capture/files, checksums and key-recovery instructions excluding credentials.
- **Automated tests:** Wrong key, missing blob, incomplete snapshot, disk full and secret-redaction checks. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent decrypts/stages backup on clean profile and reconciles counts/bytes. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F025.md`, `docs/qa/F025.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-07 backup recovery; Q-16 schedule/retention budget.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f026"></a>

### F026 — Isolated restore and reviewed cloud rejoin

- **PR identity:** `[F026] Isolated restore and reviewed cloud rejoin`; branch `feat/f026-isolated-restore-and-reviewed-cloud-rejoin` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F020, F025 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-016, NFR-003. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Validate/decrypt into a new recovery identity, preview integrity, safety export and explicit permitted rejoin; never replace tenant from old file.
- **Automated tests:** Interrupted/corrupt/newer schema restore, revoked user and old outbox cannot overwrite cloud or restore tokens. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent proves current workspace remains usable and restored data stays isolated until reviewed. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F026.md`, `docs/qa/F026.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-13 retention; future finance tests must preserve authoritative numbers and receipts.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f027"></a>

### F027 — Scoped portable data export

- **PR identity:** `[F027] Scoped portable data export`; branch `feat/f027-scoped-portable-data-export` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F023 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-016, NFR-013. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Provide exact CSV/JSON/archive snapshot exports with scope/as-of/manifest, safe names and formula-injection handling.
- **Automated tests:** Unauthorized private fields, partial cache, CSV formulas, failed save and missing file are explicit. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles exported source IDs/counts and tests English/Arabic filenames and cancel. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F027.md`, `docs/qa/F027.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Export permissions and data-retention policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f028"></a>

### F028 — Feature and policy configuration

- **PR identity:** `[F028] Feature and policy configuration`; branch `feat/f028-feature-and-policy-configuration` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F021, F009 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-017. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Version enabled features/profiles, prerequisites/role/online needs and safe disable behavior preserving historical data/obligations.
- **Automated tests:** Disabled writes blocked server-side; dependencies/cached UI cannot bypass flags; historic export remains available. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent disables/re-enables a synthetic profile and checks history does not vanish. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F028.md`, `docs/qa/F028.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Configurable does not mean legally validated or enabled by default.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f029"></a>

### F029 — Native callback, packaging and signing feasibility

- **PR identity:** `[F029] Native callback, packaging and signing feasibility`; branch `feat/f029-native-callback-packaging-and-signing-feasibility` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F004, F006, F010 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** NFR-011, PLT-012. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Prove packaged native callback, encrypted-adapter ABI, key-store continuity and installer feasibility on target architectures early.
- **Automated tests:** Packaged sandbox/callback/key tests; clean machine smoke and signed identity where available. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records actual OS/CPU evidence; unavailable platforms remain blocked rather than inferred from Linux. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F029.md`, `docs/qa/F029.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-11 OS/CPU/signing access; no paid credentials purchased automatically.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f030"></a>

### F030 — Durable scheduled job execution

- **PR identity:** `[F030] Durable scheduled job execution`; branch `feat/f030-durable-scheduled-job-execution` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F009, F014, F028 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** INT-010, NFR-009. **Behavior authority:** [requirements](docs/product/requirements.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Add job/outbox leases, checkpoints, bounded batches, occurrence IDs, retries/dead letters and current-authority checks before effects.
- **Automated tests:** Lease expiry, duplicate invocation, cancellation, downtime, rate/quota/runtime caps produce one business effect. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent pauses/restarts scheduling and reconciles missed work; no unbounded Edge Function background assumption. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F030.md`, `docs/qa/F030.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Job budget/retention and provider outcome reconciliation policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f031"></a>

### F031 — Clients and contact profiles

- **PR identity:** `[F031] Clients and contact profiles`; branch `feat/f031-clients-and-contact-profiles` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F018, F021, F027 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-001. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Deliver scoped legal/display/billing profiles, contacts/addresses/tags, preferred currency/locale and duplicate suggestions.
- **Automated tests:** Required fields, same-name clients, cross-tenant contacts and restart persistence; issued snapshots unaffected later. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent creates/searches/edits Arabic and English clients with correct financial field visibility. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F031.md`, `docs/qa/F031.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-15 import needs; no automatic membership from contact email.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f032"></a>

### F032 — Project creation and lifecycle

- **PR identity:** `[F032] Project creation and lifecycle`; branch `feat/f032-project-creation-and-lifecycle` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F031, F014 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-001. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Create client/internal projects, grants, dates and lifecycle/archive flag with reopen/completion consequences.
- **Automated tests:** Task/client tenant mismatch, invalid transition and active work archive preview; retry creates one project. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent creates/pauses/completes/reopens work and tests missing data/permission states. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F032.md`, `docs/qa/F032.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-05 project grants; billing profile compatibility.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f033"></a>

### F033 — Task creation, ownership and states

- **PR identity:** `[F033] Task creation, ownership and states`; branch `feat/f033-task-creation-ownership-and-states` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F032, F005 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-002. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Deliver task forms, descriptions, accountable owner/collaborators, semantic statuses, priority/dates and safe edits.
- **Automated tests:** Unauthorized assignee/project, stale save, done/reopen history and failed save input preservation. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent uses keyboard/screen reader and long mixed-language text; no automatic time on completion. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F033.md`, `docs/qa/F033.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve task-state semantics and bounded fields.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f034"></a>

### F034 — Task lists, filters and bulk editing

- **PR identity:** `[F034] Task lists, filters and bulk editing`; branch `feat/f034-task-lists-filters-and-bulk-editing` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F033 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-004. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Add cross-project list/search/status/date/assignee/label filters, undated buckets, saved views and bulk preview/results.
- **Automated tests:** Filter boundary/no matches, mixed permitted/denied bulk rows, pagination refresh and revision conflicts. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks visible counts/rows, accessible columns and recoverable partial success. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F034.md`, `docs/qa/F034.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** No hidden tasks/finance through counts or saved shared filters.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f035"></a>

### F035 — Manual reviewed time entries

- **PR identity:** `[F035] Manual reviewed time entries`; branch `feat/f035-manual-reviewed-time-entries` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F033, F018 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-005, TIM-011. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Capture duration/interval work with integer seconds, work date/source, task/project and billable/review states.
- **Automated tests:** Reject zero/negative/mismatched intervals/project; duration-only entries labeled; restart retains data. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records/corrects own offline entries and checks contributors cannot edit others without grants. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F035.md`, `docs/qa/F035.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-04 manual limits and uncertainty policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f036"></a>

### F036 — Persistent timer start, pause, switch and stop

- **PR identity:** `[F036] Persistent timer start, pause, switch and stop`; branch `feat/f036-persistent-timer-start-pause-switch-and-stop` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F035, F004 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-001, TIM-002, TIM-003, TIM-024. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Implement one timer per user/device, durable segments, atomic switch/stop, visible indicator and keyboard controls.
- **Automated tests:** Duplicate stop/switch/retry, pause exclusion and persistence failure conserve captured work. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows start/pause/resume/switch/restart in both languages; timer state remains discoverable. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F036.md`, `docs/qa/F036.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** User/device exclusivity cannot guarantee global disconnected exclusivity.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f037"></a>

### F037 — Timer crash, sleep and exit recovery

- **PR identity:** `[F037] Timer crash, sleep and exit recovery`; branch `feat/f037-timer-crash-sleep-and-exit-recovery` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F036 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-004, TIM-016. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Checkpoint confirmed work, detect suspend/clock anomalies, review uncertain gaps, configure close/tray and recover real OS termination.
- **Automated tests:** Force kill/sleep/clock rollback and disk failure never silently invoice uncertain intervals or duplicate sessions. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews retained/discarded gaps and tests actual power/window lifecycle on available native targets. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F037.md`, `docs/qa/F037.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-04 sleep/idle/close defaults; OS permissions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f038"></a>

### F038 — Timezone and overlap reconciliation

- **PR identity:** `[F038] Timezone and overlap reconciliation`; branch `feat/f038-timezone-and-overlap-reconciliation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F037, F019 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-007, TIM-008, TIM-022. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Split reporting days by explicit zone, retain original instants/offsets and reconcile same-user multi-device overlaps.
- **Automated tests:** DST ambiguous/missing local times, midnight buckets and concurrent offline timers conserve exact seconds. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews overlapping devices and Arabic date/time formats before affected billing is eligible. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F038.md`, `docs/qa/F038.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approve overlap exceptions and report timezone policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f039"></a>

### F039 — Dated selling and internal cost rates

- **PR identity:** `[F039] Dated selling and internal cost rates`; branch `feat/f039-dated-selling-and-internal-cost-rates` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F035, F021 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-010, WRK-012. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md), [work-management](docs/specs/work-management.md).
- **Build the feature:** Resolve versioned rate precedence/currency and snapshots, private labor costs and explicit repricing of unbilled work.
- **Automated tests:** Missing/currency-mismatched rates do not become zero; effective-date/reprice bounds; private fields denied. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares past work and new defaults; correct role sees selling/cost values. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F039.md`, `docs/qa/F039.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03 precedence/snapshot timing and Q-05 cost visibility.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f040"></a>

### F040 — Exact money and calculation profiles

- **PR identity:** `[F040] Exact money and calculation profiles`; branch `feat/f040-exact-money-and-calculation-profiles` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F003, F028 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-016, FIN-017, FIN-018, NFR-001. **Behavior authority:** [requirements](docs/product/requirements.md), [finance](docs/specs/finance.md).
- **Build the feature:** Implement currency exponents, bounded exact quantities/rates, versioned rounding/tax/discount order and independent golden fixtures.
- **Automated tests:** 0/2/3-decimal currencies, ties, inclusive/exclusive tax, largest-remainder discounts and overflow/conservation properties. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles hand-reviewed examples and localized input normalization; unapproved policies stay disabled. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F040.md`, `docs/qa/F040.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 country, calculation/numbering policy approval before real issuance.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f041"></a>

### F041 — Offline invoice draft editor

- **PR identity:** `[F041] Offline invoice draft editor`; branch `feat/f041-offline-invoice-draft-editor` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F031, F039, F040 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-001, FIN-004, FIN-005, FIN-034. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Create/edit/duplicate manual or source-candidate drafts with parties, dates/terms, currency, revision and complete preview.
- **Automated tests:** Incomplete drafts save honestly; duplicate has no number/payment/ownership; stale editor/save failure preserves input. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent edits offline in both languages and verifies finalization is visibly online-only. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F041.md`, `docs/qa/F041.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Required seller/client fields depend on selected profile.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f042"></a>

### F042 — Authoritative time/expense draft reservations

- **PR identity:** `[F042] Authoritative time/expense draft reservations`; branch `feat/f042-authoritative-time-expense-draft-reservations` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F041, F009 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** TIM-012, TIM-013, FIN-022. **Behavior authority:** [finance](docs/specs/finance.md), [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Acknowledge/release online draft reservations, distinguish offline candidates and protect finalized source revisions/ranges.
- **Automated tests:** Competing drafts, source edits and abandoned reservation recovery cannot double-consume work/expenses. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles candidate/conflict/reserved labels across two devices. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F042.md`, `docs/qa/F042.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Whole-entry initial allocation; partial ranges added later without weakening locks.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f043"></a>

### F043 — Invoice numbering and atomic online issuance

- **PR identity:** `[F043] Invoice numbering and atomic online issuance`; branch `feat/f043-invoice-numbering-and-atomic-online-issuance` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F042, F040 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-006, FIN-007, FIN-029, FIN-030. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Online command atomically revalidates preview, freezes snapshot, allocates number/source ownership and commits audit/receipt/event.
- **Automated tests:** Double click/lost reply/concurrent draft/failure at every write yields one number/document/effect; no reused void numbers. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks committed snapshot and unknown-outcome recovery; offline cannot issue or claim final numbers. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F043.md`, `docs/qa/F043.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 legal seller/series/rounding profile; only synthetic issuance until resolved.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f044"></a>

### F044 — English/Arabic invoice PDF export

- **PR identity:** `[F044] English/Arabic invoice PDF export`; branch `feat/f044-english-arabic-invoice-pdf-export` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F043, F023 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-008, FIN-031. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Render exact saved snapshot with licensed embedded Arabic fonts, bidi-safe identifiers, pagination and no remote executable content.
- **Automated tests:** Totals/snapshot equality, shaping, long lines, page breaks, missing font/disk-full/cancel and private-field exclusion. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent visually inspects multipage English/Arabic artifacts and native save dialogs. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F044.md`, `docs/qa/F044.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** PDF engine/font licensing and native packaging proof.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f045"></a>

### F045 — Manual delivery and invoice status

- **PR identity:** `[F045] Manual delivery and invoice status`; branch `feat/f045-manual-delivery-and-invoice-status` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F044 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-009, FIN-011. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Separate issued/delivery/settlement/dispute/overdue indicators; record manual sharing evidence without claiming receipt/read.
- **Automated tests:** Export failure cannot unissue/renumber; due-today boundary and stale balance states correct. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent distinguishes exported/not sent/manual sent and online versus cached balance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F045.md`, `docs/qa/F045.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Automatic email is a later enabled provider feature.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f046"></a>

### F046 — Partial payments and unapplied client credit

- **PR identity:** `[F046] Partial payments and unapplied client credit`; branch `feat/f046-partial-payments-and-unapplied-client-credit` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F043, F009 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-010, FIN-011, FIN-012. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Post online manual payments, split eligible same-client/currency settlements, overpayments and exact remaining balances.
- **Automated tests:** Repeated posting, partial/overpayment, cross-client allocation and concurrent allocation conserve cash/debt. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent applies two payments and extra credit, verifies exact receipts and no negative hidden obligation. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F046.md`, `docs/qa/F046.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03 finance policy and Q-05 posting roles; recording does not process money.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f047"></a>

### F047 — Expense recording and receipt evidence

- **PR identity:** `[F047] Expense recording and receipt evidence`; branch `feat/f047-expense-recording-and-receipt-evidence` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F040, F023 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-021, FIN-033. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Record supplier/category/date/amount/currency/tax/receipt and project attribution as local draft/authoritative recorded evidence.
- **Automated tests:** Invalid currency/receipt/project, restart/duplicate source and missing file cannot corrupt finance history. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records foreign-currency receipts and confirms visibility/repair state. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F047.md`, `docs/qa/F047.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01 expense tax profile; no inferred reimbursability.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f048"></a>

### F048 — Core work and receivables overview

- **PR identity:** `[F048] Core work and receivables overview`; branch `feat/f048-core-work-and-receivables-overview` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F034, F038, F045, F046 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-001, FIN-025. **Behavior authority:** [finance](docs/specs/finance.md), [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Show permitted upcoming tasks/time/unbilled/receivables grouped by currency with source links/as-of and cache completeness.
- **Automated tests:** Empty versus missing/filtered/stale data, mixed currencies and hidden finance counts correct. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares dashboard with authoritative source totals and contributor view. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F048.md`, `docs/qa/F048.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** No fictional earnings or converted total without approved policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f049"></a>

### F049 — Core pilot release and cross-domain evidence

- **PR identity:** `[F049] Core pilot release and cross-domain evidence`; branch `feat/f049-core-pilot-release-and-cross-domain-evidence` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F026, F027, F029, F048 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-001, NFR-002, NFR-003, NFR-004, NFR-005, NFR-006, NFR-007, NFR-011, NFR-014. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Deliver reproducible pilot artifact and automated bilingual two-member client→task→time→invoice→partial-payment/recovery journey.
- **Automated tests:** Run tenant/role denial, offline overlap/conflict, issued snapshot, restore/number safety and platform regression suite. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent submits exact build/OS evidence and unresolved limits; user approves a limited pilot, not public-compliance claims. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F049.md`, `docs/qa/F049.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** All applicable native/market/key gates resolved or affected platform/profile explicitly unavailable; no public release yet.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f050"></a>

### F050 — Client archive, merge and relationship integrity

- **PR identity:** `[F050] Client archive, merge and relationship integrity`; branch `feat/f050-client-archive-merge-and-relationship-integrity` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F031, F043 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-001. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Add archive/reactivation and reviewed atomic merge/aliases with affected links, field conflicts and frozen-history protection.
- **Automated tests:** Shared email, failed merge, old invoice snapshot and restore of relationship links remain correct. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews merge before/after and archive with active work; no automatic dedupe. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F050.md`, `docs/qa/F050.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Merge reversal policy and retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f051"></a>

### F051 — Opportunity pipeline and weighted forecast

- **PR identity:** `[F051] Opportunity pipeline and weighted forecast`; branch `feat/f051-opportunity-pipeline-and-weighted-forecast` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F031, F040 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-002. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Create semantic/custom stages, values/ranges, probability, next action and won/lost/reopen history.
- **Automated tests:** Stage drag failure, probability/range bounds, currency groups and missing estimates; forecast never counts as cash. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent qualifies/loss/reopens opportunities and reconciles a visible weighted example. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F051.md`, `docs/qa/F051.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Stage semantics and forecast assumptions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f052"></a>

### F052 — Relationship activities and follow-ups

- **PR identity:** `[F052] Relationship activities and follow-ups`; branch `feat/f052-relationship-activities-and-follow-ups` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F051, F022, F030 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-003. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Record scoped activity/evidence and scheduled/completed/snoozed/cancelled follow-ups with deduped catch-up.
- **Automated tests:** Duplicate reminder/import, timezone/quiet hours and revoked target access; log-email never sends. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests closed-app catch-up and Arabic timeline while respecting private notes. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F052.md`, `docs/qa/F052.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Communication provenance/retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f053"></a>

### F053 — Versioned service catalog

- **PR identity:** `[F053] Versioned service catalog`; branch `feat/f053-versioned-service-catalog` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F039, F040 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-004. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Maintain catalog codes/descriptions/units/selling rates/currency and private estimate assumptions with archive/versioning.
- **Automated tests:** Referenced item deletion archives; currency/unit validation and historical snapshots retain prior values. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent updates a catalog rate without changing an accepted output. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F053.md`, `docs/qa/F053.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Service units and catalog permissions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f054"></a>

### F054 — Estimate scenarios and comparison

- **PR identity:** `[F054] Estimate scenarios and comparison`; branch `feat/f054-estimate-scenarios-and-comparison` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F053 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-004, FIN-002. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md), [finance](docs/specs/finance.md).
- **Build the feature:** Create versioned hourly/fixed/unit/milestone estimate scenarios, alternatives/contingency and explicit draft refresh.
- **Automated tests:** Alternative selection excludes unchosen lines; missing cost not zero margin; accepted version frozen. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares options, validities, taxes and localized money previews. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F054.md`, `docs/qa/F054.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approved tax/discount policy; estimates are not collectible invoices.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f055"></a>

### F055 — Proposal revisions and document sharing

- **PR identity:** `[F055] Proposal revisions and document sharing`; branch `feat/f055-proposal-revisions-and-document-sharing` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F054, F044 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-005. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Version scope/terms/options, export exact proposal revision and distinguish exported/shared/superseded/withdrawn states.
- **Automated tests:** Edits after share create a new revision; retry/export failure preserves old artifact; internal fields excluded. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent shares v1 and edits v2 with correct version/validity in both PDFs. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F055.md`, `docs/qa/F055.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** External sending stays manual until provider phase.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f056"></a>

### F056 — Acceptance evidence and disputes

- **PR identity:** `[F056] Acceptance evidence and disputes`; branch `feat/f056-acceptance-evidence-and-disputes` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F055, F009 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-006. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Record manual versus authenticated decision provenance, selected options, expiry and correction/dispute history.
- **Automated tests:** Duplicate/stale/withdrawn version acceptance cannot approve other terms or masquerade as verified signature. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records a phone acceptance with separate operator/actor timestamps and attached evidence. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F056.md`, `docs/qa/F056.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-10 signatory/evidence rules; legal signature provider not assumed.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f057"></a>

### F057 — Agreements, amendments and obligations

- **PR identity:** `[F057] Agreements, amendments and obligations`; branch `feat/f057-agreements-amendments-and-obligations` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F056, F023, F030 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-007. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Version agreements/SOW/NDA/support documents, term/notice dates, signature evidence and assigned obligation states.
- **Automated tests:** Amendment cannot overwrite executed original; termination retains invoices and explicit reconciliation checklist. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records renewal notice and disputed obligation; no invented legal clauses. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F057.md`, `docs/qa/F057.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-10 jurisdiction and required evidence.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f058"></a>

### F058 — Client onboarding checklists

- **PR identity:** `[F058] Client onboarding checklists`; branch `feat/f058-client-onboarding-checklists` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F057, F033, F023 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-008. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Create versioned questionnaires/checklists, responsible party, blocking verification and explicit waivers.
- **Automated tests:** Template updates preserve responses; incomplete blockers prevent ready state; ordinary forms refuse credential collection. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent verifies requested repository access rather than storing secrets; tests partial offline saves. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F058.md`, `docs/qa/F058.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Secure credential-sharing references and client response identity.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f059"></a>

### F059 — Accepted engagement project handoff

- **PR identity:** `[F059] Accepted engagement project handoff`; branch `feat/f059-accepted-engagement-project-handoff` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F056, F058, F032 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-009. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Preview mapping accepted scope/template/options into one project/task/milestone baseline with stable handoff receipt.
- **Automated tests:** Mid-handoff failure/retry and split plan cannot duplicate projects or remap other tenant IDs. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reopens an existing handoff and confirms agreement/deposit readiness blockers. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F059.md`, `docs/qa/F059.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** One versus split-project mapping approved explicitly.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f060"></a>

### F060 — Renewals and deterministic client health

- **PR identity:** `[F060] Renewals and deterministic client health`; branch `feat/f060-renewals-and-deterministic-client-health` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F052, F057, F048 **Milestone:** P02 — Client acquisition and commercial lifecycle.
- **Requirements:** CRM-010. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Track review/renewal cadence, explicit satisfaction/health rules and overdue/delivery signals with evidence links.
- **Automated tests:** Missing activity remains unknown; stale source labeled; reminder dedupes after date change. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews an explained health score/override and private renewal data. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F060.md`, `docs/qa/F060.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** No AI sentiment or unsolicited outreach.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f061"></a>

### F061 — Task hierarchy and checklists

- **PR identity:** `[F061] Task hierarchy and checklists`; branch `feat/f061-task-hierarchy-and-checklists` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F033 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-002. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Add bounded parent/subtask structure, checklist completion and explicit parent-close/reopen behavior.
- **Automated tests:** Cycle/depth/tenant validation, missing parent, concurrent completion and source-time references preserved. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent closes/reopens a mixed-state hierarchy with keyboard and long Arabic text. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F061.md`, `docs/qa/F061.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Maximum depth and parent completion policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f062"></a>

### F062 — Accessible Kanban workflow

- **PR identity:** `[F062] Accessible Kanban workflow`; branch `feat/f062-accessible-kanban-workflow` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F034, F061 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-004. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Add status/group boards with keyboard move, permitted saved board config and transactional status changes.
- **Automated tests:** Drag/keyboard equivalent, denied/stale move and no-match/undated cards with virtualized large board. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks focus after move, RTL board direction and failed-save recovery. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F062.md`, `docs/qa/F062.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** No gesture-only required action.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f063"></a>

### F063 — Task dependency graph

- **PR identity:** `[F063] Task dependency graph`; branch `feat/f063-task-dependency-graph` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F061 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-003. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Add validated finish-to-start edges, blockers and explicit predecessor-cancel repair without auto-rescheduling agreements.
- **Automated tests:** Reject cycles in create/import/sync, stale graph edits and cross-project unauthorized edges. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows A→B→C and failed cycle repair in diagram/list. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F063.md`, `docs/qa/F063.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Additional relation types require separate scheduling fixtures.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f064"></a>

### F064 — Milestone completion and acceptance

- **PR identity:** `[F064] Milestone completion and acceptance`; branch `feat/f064-milestone-completion-and-acceptance` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F063, F056 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-003. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Group tasks/deliverables into criteria/date/owner milestones with ready/review/accepted/cancelled evidence.
- **Automated tests:** Task done alone cannot equal client acceptance; changing criteria requires version review. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent distinguishes ready, accepted and cancelled milestone with incomplete exceptions. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F064.md`, `docs/qa/F064.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** External approval identity follows portal/evidence policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f065"></a>

### F065 — Task calendar view

- **PR identity:** `[F065] Task calendar view`; branch `feat/f065-task-calendar-view` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F034, F038 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-004. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Render permitted tasks/undated items by selected timezone; date moves are validated edits with keyboard equivalents.
- **Automated tests:** DST/date-only boundaries, permission filters and failed-reschedule rollback. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks Arabic calendar, undated discovery and multi-day work. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F065.md`, `docs/qa/F065.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Calendar system remains explicit; no implicit Hijri conversion.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f066"></a>

### F066 — Project timeline planning

- **PR identity:** `[F066] Project timeline planning`; branch `feat/f066-project-timeline-planning` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F063, F065 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-004, WRK-003. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Show dependency-aware intervals/milestones and preview reschedule impacts without rewriting agreed dates automatically.
- **Automated tests:** Impossible intervals/cycles, concurrent edits and partial scheduling with missing effort. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares plan versus contractual target and uses non-drag alternatives. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F066.md`, `docs/qa/F066.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approved scheduling relations and target assumptions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f067"></a>

### F067 — Team capacity and leave calendars

- **PR identity:** `[F067] Team capacity and leave calendars`; branch `feat/f067-team-capacity-and-leave-calendars` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F066 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-005. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Model user working hours/timezone/leave, remaining estimates and explicit overload/capacity suggestions.
- **Automated tests:** 20 available/28 planned shows 8 overload; missing estimates and leave/DST changes visible. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews scoped workload without exposing private cost or surveillance signals. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F067.md`, `docs/qa/F067.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 working calendars and visibility.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f068"></a>

### F068 — Sprints and delivery cycles

- **PR identity:** `[F068] Sprints and delivery cycles`; branch `feat/f068-sprints-and-delivery-cycles` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F034, F064 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-006. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Manage cycle goals/periods/task selection, completion snapshots and explicit carryover.
- **Automated tests:** Moving unfinished work retains old cycle history; close/retry produces one result. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent closes a partially completed cycle and reconciles throughput/remaining work. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F068.md`, `docs/qa/F068.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Cycle date boundaries and definition of completion.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f069"></a>

### F069 — Recurring task generation

- **PR identity:** `[F069] Recurring task generation`; branch `feat/f069-recurring-task-generation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F030, F033, F038 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-006. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Store timezone/anchor/end/template revision and unique occurrence; preview missed create/skip/merge decisions.
- **Automated tests:** Month-end/DST, downtime, duplicate scheduler and template change cannot duplicate instances. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent pauses/resumes recurrence and inspects upcoming occurrences. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F069.md`, `docs/qa/F069.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Month-end/holiday/missed-period policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f070"></a>

### F070 — Project and task templates

- **PR identity:** `[F070] Project and task templates`; branch `feat/f070-project-and-task-templates` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F061, F063, F064 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-007. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Version reusable task/checklist/dependency/project skeletons with safe clone mapping and no client secrets.
- **Automated tests:** IDs remap to new tenant/project; template updates cannot mutate existing instances silently. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent clones a realistic bilingual project and reviews inherited fields. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F070.md`, `docs/qa/F070.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Template sharing/grants and limits.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f071"></a>

### F071 — Typed custom fields

- **PR identity:** `[F071] Typed custom fields`; branch `feat/f071-typed-custom-fields` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F070, F003 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-007. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Add bounded text/number/date/bool/choice/member fields, classifications and archive/migration preview.
- **Automated tests:** Unsupported type/schema execution denied; deleting used fields preserves historical values and export. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent verifies Arabic labels/options, finance-field visibility and large field lists. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F071.md`, `docs/qa/F071.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Field/type/size limits and migration policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f072"></a>

### F072 — Scope baseline and change requests

- **PR identity:** `[F072] Scope baseline and change requests`; branch `feat/f072-scope-baseline-and-change-requests` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F059, F064, F040 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-008. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Version agreed scope, price/effort/date impacts; approve exact change and apply new baseline atomically.
- **Automated tests:** Stale approval/partial apply/retry cannot change unapproved scope or issue money automatically. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews before/after baseline and rejected/withdrawn request history. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F072.md`, `docs/qa/F072.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Who approves scope and whether external acceptance is required.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f073"></a>

### F073 — Versioned deliverables and internal review

- **PR identity:** `[F073] Versioned deliverables and internal review`; branch `feat/f073-versioned-deliverables-and-internal-review` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F064, F023, F056 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-009. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Track exact file/criteria versions, internal review/readiness and publication eligibility; new revisions retain approval history.
- **Automated tests:** File replacement cannot inherit prior acceptance; unverified uploads cannot publish. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent requests changes on v1, prepares v2 and checks internal versus published state. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F073.md`, `docs/qa/F073.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Publication external identity delivered later.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f074"></a>

### F074 — Scoped comments, mentions and threads

- **PR identity:** `[F074] Scoped comments, mentions and threads`; branch `feat/f074-scoped-comments-mentions-and-threads` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F022, F033 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-010. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Support safe threaded comments, mention eligibility, revision/resolution and explicit internal/client-visible separation.
- **Automated tests:** Mention cannot grant access; revoked member stops notifications; unsafe markup and edit conflicts handled. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks private threads across roles and Arabic writing/reading order. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F074.md`, `docs/qa/F074.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Retention/edit policy; presence is advisory and optional.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f075"></a>

### F075 — Project notes and attachment revisions

- **PR identity:** `[F075] Project notes and attachment revisions`; branch `feat/f075-project-notes-and-attachment-revisions` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F023, F074 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-011. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Link safe notes/snippets/files to projects, preserve rich-text conflict versions and local/remote availability.
- **Automated tests:** Conflicting replacement/body edits preserve both; broken link/missing file has repair/export state. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent opens inert code snippets and encrypted offline attachments; no credential storage. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F075.md`, `docs/qa/F075.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approved note formats and file size/type quotas.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f076"></a>

### F076 — Budget baselines and threshold alerts

- **PR identity:** `[F076] Budget baselines and threshold alerts`; branch `feat/f076-budget-baselines-and-threshold-alerts` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F039, F048, F072 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-012, TIM-017. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md), [work-management](docs/specs/work-management.md).
- **Build the feature:** Compare versioned fee/effort/cost budget to reviewed source work with deduped explained thresholds.
- **Automated tests:** Budget change/retry cannot spam or reprice history; missing cost visible; fixed-fee time not auto-billed. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares estimate/actual/remaining/overrun by permitted role. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F076.md`, `docs/qa/F076.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 reporting/cost assumptions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f077"></a>

### F077 — Portfolio health, risks and decisions

- **PR identity:** `[F077] Portfolio health, risks and decisions`; branch `feat/f077-portfolio-health-risks-and-decisions` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F076, F052 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-013. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Aggregate permitted project health, named rules/overrides, risk likelihood/impact/mitigation and decision history.
- **Automated tests:** Undated/missing evidence not falsely healthy; scope filters/private finance honored. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent traces an at-risk card to blocker/owner/mitigation and override expiry. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F077.md`, `docs/qa/F077.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Health semantics and portfolio grants.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f078"></a>

### F078 — Archive, task transfer and handover

- **PR identity:** `[F078] Archive, task transfer and handover`; branch `feat/f078-archive-task-transfer-and-handover` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F073, F074, F042 **Milestone:** P03 — Work planning and delivery.
- **Requirements:** WRK-014. **Behavior authority:** [work-management](docs/specs/work-management.md).
- **Build the feature:** Preview project/task move, archive/restore and member handover; preserve billing/time/approval history and ownership.
- **Automated tests:** Allocated task/client/currency moves rejected; removed member work not deleted; cross-tenant transfer uses export/import. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent hands over active work and resolves timers/open reviews safely. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F078.md`, `docs/qa/F078.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Data retention and cross-workspace migration rules.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f079"></a>

### F079 — Unallocated time editing and conservation

- **PR identity:** `[F079] Unallocated time editing and conservation`; branch `feat/f079-unallocated-time-editing-and-conservation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F042, F038 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-006, TIM-023. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Split/merge/duplicate/correct/move eligible entries with revision/audit, explicit undo and lock explanation.
- **Automated tests:** Seconds sum exactly; incompatible rate/project/approval merge denied; billed facts cannot be overwritten. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent splits a 3601-second record and corrects unbilled versus issued-source cases. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F079.md`, `docs/qa/F079.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Correction/rebilling policy follows credit workflow.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f080"></a>

### F080 — Time list and calendar views

- **PR identity:** `[F080] Time list and calendar views`; branch `feat/f080-time-list-and-calendar-views` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F079, F065 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-014. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Provide day/week/source/client/project/billable/review/approval/allocation filters and saved views in exact seconds.
- **Automated tests:** Aggregate before display rounding; undated/duration-only entries clear; role/scope filtering and DST totals. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles raw entries with totals and Arabic calendars. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F080.md`, `docs/qa/F080.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Report timezone and source completeness.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f081"></a>

### F081 — Versioned billing time-rounding policies

- **PR identity:** `[F081] Versioned billing time-rounding policies`; branch `feat/f081-versioned-billing-time-rounding-policies` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F040, F079 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-009. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Add configured increments/grouping/minimum/tie policies and raw-versus-billed preview without changing source seconds.
- **Automated tests:** Two 2-minute entries compare exact/per-entry/grouped rounding; policy updates cannot alter issued amounts. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews rounding difference and effective rate before issuance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F081.md`, `docs/qa/F081.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03 requires explicit agreed rounding/grouping/minimum rules.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f082"></a>

### F082 — Optional idle detection and review

- **PR identity:** `[F082] Optional idle detection and review`; branch `feat/f082-optional-idle-detection-and-review` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F037 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-015. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Process minimal local idle signal, threshold/enable controls and keep/discard/split review with privacy.
- **Automated tests:** Idle cannot prove no work; permission failure/restart/long away intervals preserve review evidence. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent pauses/disables feature and checks offline recovery; no screenshots/keystrokes collected. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F082.md`, `docs/qa/F082.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-04 idle threshold/semantics and local privacy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f083"></a>

### F083 — Focus sessions and breaks

- **PR identity:** `[F083] Focus sessions and breaks`; branch `feat/f083-focus-sessions-and-breaks` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F036, F022 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-018. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Add optional focus/break/goals preferences, local reminders and explicit assignment to saved time.
- **Automated tests:** Breaks/goals never change billing; retries/sleep/notification denial recover correctly. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent completes/skips sessions and checks reduced motion/accessibility. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F083.md`, `docs/qa/F083.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Focus preferences independent from timer evidence.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f084"></a>

### F084 — Timesheet submission and approvals

- **PR identity:** `[F084] Timesheet submission and approvals`; branch `feat/f084-timesheet-submission-and-approvals` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F079 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-019. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Submit revisioned periods, reviewer assignment, rejection/withdrawal/resubmission and approval-based billing eligibility.
- **Automated tests:** Stale approval cannot authorize corrected time; self-review/role downgrade rules enforced. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent submits/rejects/revises/approves two-member timesheet and checks locks. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F084.md`, `docs/qa/F084.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-05 approval roles and whether approval is required for billing.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f085"></a>

### F085 — Partial time-source allocation

- **PR identity:** `[F085] Partial time-source allocation`; branch `feat/f085-partial-time-source-allocation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F043, F079, F084 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** TIM-012, TIM-013, FIN-030. **Behavior authority:** [finance](docs/specs/finance.md), [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Allocate nonoverlapping canonical second ranges with exact locks, corrections and explicit release chains.
- **Automated tests:** [0,1800) then [1800,3600) succeeds; overlapping range fails; rounding/refund cannot create available source. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews partial/unbilled/reserved/fully billed labels across devices. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F085.md`, `docs/qa/F085.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Partial allocation policy and auditable rebilling exceptions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f086"></a>

### F086 — Time imports and detailed exports

- **PR identity:** `[F086] Time imports and detailed exports`; branch `feat/f086-time-imports-and-detailed-exports` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F024, F027, F080 **Milestone:** P04 — Time evidence and productivity.
- **Requirements:** TIM-020. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Map source IDs/units/timezone/locale, duplicate/overlap validation and reviewed export of raw metadata.
- **Automated tests:** Repeated/changed source rows and allocated entries cannot duplicate billable time; errors preserve valid rows. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent imports a mixed-language fixture and reconciles exact seconds/source provenance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F086.md`, `docs/qa/F086.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-15 actual time services and import formats.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f087"></a>

### F087 — Utilization and effective-rate metrics

- **PR identity:** `[F087] Utilization and effective-rate metrics`; branch `feat/f087-utilization-and-effective-rate-metrics` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F080, F046, F067 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** TIM-021. **Behavior authority:** [time-and-productivity](docs/specs/time-and-productivity.md).
- **Build the feature:** Calculate explicit reviewed/billable/utilization/effective collected-rate definitions with missing allocation/denominator states.
- **Automated tests:** No-data not zero; fixed-fee/nonbillable costs and cash-to-work unknowns labeled; currency separation. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent drills to permitted source records and compares independent fixture totals. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F087.md`, `docs/qa/F087.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 capacity/earnings basis; no employee surveillance ranking.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f088"></a>

### F088 — Credit notes and invoice correction

- **PR identity:** `[F088] Credit notes and invoice correction`; branch `feat/f088-credit-notes-and-invoice-correction` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F043, F046 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-013, FIN-015. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Issue online immutable partial/full credits against original line/tax/discount entitlement with correction references.
- **Automated tests:** Repeated partials exhaust exact original components; cannot overcredit, erase history or auto-release time. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent credits a paid/partially paid invoice and compares debt/surplus without changing original PDF. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F088.md`, `docs/qa/F088.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 legal document/void/reversal rules.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f089"></a>

### F089 — Refund recording and settlement reversals

- **PR identity:** `[F089] Refund recording and settlement reversals`; branch `feat/f089-refund-recording-and-settlement-reversals` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F088 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-014, FIN-015. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Post online compensating cash/allocation events, refundable bounds and linked credit/debt preview.
- **Automated tests:** Refund with/without credit, overpayment transfers and retries conserve cash and debt; provider money not moved. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent distinguishes recording refund versus initiating it and confirms reopened debt. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F089.md`, `docs/qa/F089.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-05 finance permissions/dual approval and refund policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f090"></a>

### F090 — Expense approval, splits and reimbursement

- **PR identity:** `[F090] Expense approval, splits and reimbursement`; branch `feat/f090-expense-approval-splits-and-reimbursement` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F047, F084, F042, F088 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-021, FIN-022. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Add approval workflow, exact project/eligible splits, at-cost/markup and full/partial reimbursement source ownership.
- **Automated tests:** Splits sum exactly; rejected/stale/credited expense cannot double bill; FX/reversal retains evidence. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent approves/splits/invoices receipt and checks missing-file/private fields. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F090.md`, `docs/qa/F090.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01 tax treatment; Q-05 expense approvers and markup policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f091"></a>

### F091 — Deposits and final-invoice application

- **PR identity:** `[F091] Deposits and final-invoice application`; branch `feat/f091-deposits-and-final-invoice-application` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F046, F088 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-032. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Model deposit agreement/invoice/cash separately and explicit remaining-scope or credit application to final bill.
- **Automated tests:** Prior deposit invoice and payment cannot both reduce obligation; duplicate conversion/cancellation conserved. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows deposit→partial cash→final bill with original links and exact balance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F091.md`, `docs/qa/F091.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 deposit tax/legal treatment.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f092"></a>

### F092 — Milestone billing schedules

- **PR identity:** `[F092] Milestone billing schedules`; branch `feat/f092-milestone-billing-schedules` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F064, F091, F054 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-032, FIN-003. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Convert approved estimate/milestone amounts into distinct reviewed draft invoices, track consumed entitlement/due triggers.
- **Automated tests:** Retry/changed milestone cannot invoice same contracted amount twice; acceptance is not payment. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent selects milestones and reconciles remaining contracted scope. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F092.md`, `docs/qa/F092.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Milestone trigger and partial billing terms.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f093"></a>

### F093 — Monetary prepaid retainers

- **PR identity:** `[F093] Monetary prepaid retainers`; branch `feat/f093-monetary-prepaid-retainers` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F089, F091 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-020. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Track prepaid receipts, consumption, replenishment, refundable balance and explicit cancellation/expiry terms.
- **Automated tests:** Partial consumption/correction/refund conserve available money; prepayment not silently labeled earned revenue. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews agreement/receipt/consumption and cancellation with zero duplicated settlement. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F093.md`, `docs/qa/F093.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 agreement/accounting/expiry treatment.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f094"></a>

### F094 — Included-service retainers and overages

- **PR identity:** `[F094] Included-service retainers and overages`; branch `feat/f094-included-service-retainers-and-overages` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F085, F093 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-020. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Track service-period units, approved consumption, rollover/cap/expiry and overage at versioned rates.
- **Automated tests:** Same seconds cannot consume allowance and bill hourly except explicit overage; reversals return only eligible units. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests mid-period change, unused allowance and rollover boundaries. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F094.md`, `docs/qa/F094.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Contract unit/rollover/overage rules.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f095"></a>

### F095 — Client subscriptions and proration

- **PR identity:** `[F095] Client subscriptions and proration`; branch `feat/f095-client-subscriptions-and-proration` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F091, F094, F030 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-035. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Manage accepted service plans, period anchors, quantities, pause/end, effective changes and explicit proration adjustments.
- **Automated tests:** Month-end/leap/DST, cancellation boundary, 100→200 remaining-half-period adjustment and duplicate events conserved. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews next-period/current-adjustment preview; issued invoices unchanged. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F095.md`, `docs/qa/F095.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03 proration/terms; separate from SoloDesk seat subscriptions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f096"></a>

### F096 — Recurring invoice draft generation

- **PR identity:** `[F096] Recurring invoice draft generation`; branch `feat/f096-recurring-invoice-draft-generation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F030, F041, F095 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-019. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Generate one draft per schedule/template/period, preview next dates, pause/resume/end and recover missed occurrences.
- **Automated tests:** Duplicate jobs/device retries/month-end/timezone/downtime create one period result; no implicit send/issue. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent runs recurrence with desktop closed and reviews missed create/skip/merge decisions. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F096.md`, `docs/qa/F096.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Auto-issue/send remain separately enabled online rules.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f097"></a>

### F097 — Collection reminder schedules

- **PR identity:** `[F097] Collection reminder schedules`; branch `feat/f097-collection-reminder-schedules` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F030, F045, F046, F022 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-027. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Prepare versioned reminder schedule/text, suppress opted-out/paid/disputed/void records and record catch-up history.
- **Automated tests:** Payment/revoke/recipient change just before execution suppresses stale reminder; dedupe per occurrence. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews EN/AR message and confirms no external send until provider/rule enabled. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F097.md`, `docs/qa/F097.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 sender/provider and reminder permissions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f098"></a>

### F098 — Bank-file reconciliation

- **PR identity:** `[F098] Bank-file reconciliation`; branch `feat/f098-bank-file-reconciliation` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F024, F046, F090, F089 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-024. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Import account transaction IDs, match split/combined payments/expenses, fees/transfers and explicit exclusions/undo.
- **Automated tests:** Repeated/changed rows, partial match and FX/fee residual cannot fabricate settlement or duplicate money. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent confirms/undoes suggested matches and reconciles original totals. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F098.md`, `docs/qa/F098.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-15 bank formats; no external bank transfers.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f099"></a>

### F099 — Portable accounting transaction exports

- **PR identity:** `[F099] Portable accounting transaction exports`; branch `feat/f099-portable-accounting-transaction-exports` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F027, F088, F090, F098 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-026. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Export exact IDs/source/tax/discount/reversal/currency/account mappings with reconciliation summaries.
- **Automated tests:** Formula safety, privacy, unmapped codes and line totals produce explicit errors or exact output. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles exported ledger-ready operational data without claiming certified accounting. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F099.md`, `docs/qa/F099.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 accounting mapping/tool and finance reviewer.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f100"></a>

### F100 — Cross-currency settlement records

- **PR identity:** `[F100] Cross-currency settlement records`; branch `feat/f100-cross-currency-settlement-records` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F046, F089, F040 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-018. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Record original and invoice currency amounts, approved FX/source/date/rounding and explicit fee components.
- **Automated tests:** Missing rate or silent currency mix denied; partial/refund histories retain original rates and conserved allocations. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews a foreign-currency receipt and exact obligation/cash reconciliation. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F100.md`, `docs/qa/F100.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-03/Q-14 FX source/valuation policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f101"></a>

### F101 — Disputes, write-offs and collection notes

- **PR identity:** `[F101] Disputes, write-offs and collection notes`; branch `feat/f101-disputes-write-offs-and-collection-notes` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F088, F089, F097 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-028. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Record separate dispute/promised date/write-off adjustments with reasons/permissions and reminder suppression.
- **Automated tests:** Write-off/credit cannot double-reduce debt; reversal/source evidence and stale policy checks. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent opens/resolves dispute and reviews operational versus legal/tax meaning. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F101.md`, `docs/qa/F101.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-05 allowed write-off/approval and retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f102"></a>

### F102 — Branded bilingual document templates

- **PR identity:** `[F102] Branded bilingual document templates`; branch `feat/f102-branded-bilingual-document-templates` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F044, F055, F088 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-031. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Version invoice/estimate/credit layout, branding/notes/QR links and document locale with safe asset selection.
- **Automated tests:** Changing template cannot change saved amounts; private fields/remote assets/multipage bidi fail tests if exposed. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent visually compares EN/AR PDFs and correction links with approved snapshots. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F102.md`, `docs/qa/F102.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Brand/font licenses; legal profiles constrain required fields.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f103"></a>

### F103 — Validated market invoice profiles

- **PR identity:** `[F103] Validated market invoice profiles`; branch `feat/f103-validated-market-invoice-profiles` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F040, F043, F088, F102 **Milestone:** P05 — Finance and commercial operations.
- **Requirements:** FIN-001, FIN-007, FIN-016, FIN-030. **Behavior authority:** [finance](docs/specs/finance.md).
- **Build the feature:** Configure selected seller/market-required fields, numbering/correction/tax/retention validators and unsupported-profile blocks.
- **Automated tests:** Independent approved country fixtures; incomplete/unvalidated profile cannot issue real compliant-labelled documents. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent and appropriate finance/legal reviewer verify artifacts and settings for selected market. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F103.md`, `docs/qa/F103.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-03 country and reviewer; no invented universal tax compliance.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f104"></a>

### F104 — Customizable home dashboards

- **PR identity:** `[F104] Customizable home dashboards`; branch `feat/f104-customizable-home-dashboards` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F048, F077, F087 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-001. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Personal/shared widget configuration, scoped actions and versioned definitions without copied source balances.
- **Automated tests:** Hidden finance/counts, no-data/stale cache and changed widgets remain consistent. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent configures owner/contributor dashboards and verifies useful source links in both languages. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F104.md`, `docs/qa/F104.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Shared dashboard visibility and cached completeness.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f105"></a>

### F105 — Revenue and collection reports

- **PR identity:** `[F105] Revenue and collection reports`; branch `feat/f105-revenue-and-collection-reports` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F099, F100, F101 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-002, FIN-025. **Behavior authority:** [finance](docs/specs/finance.md), [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Separate net invoiced/collected/credits/refunds/taxes/costs by explicit basis/date/currency with drill-down.
- **Automated tests:** Report totals reconcile source snapshots and reversals; definition changes retain prior exports. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares report to independent fixture and contributor/finance visibility. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F105.md`, `docs/qa/F105.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 report basis and pass-through expense policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f106"></a>

### F106 — Receivables aging and cash scenarios

- **PR identity:** `[F106] Receivables aging and cash scenarios`; branch `feat/f106-receivables-aging-and-cash-scenarios` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F105, F051, F097 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-004. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Show current/aging buckets, disputes/promises, recurring/contracted/weighted-pipeline forecasts as separate assumptions.
- **Automated tests:** Buckets sum outstanding; due-date zone boundaries, unknown dates and rate groups visible. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent traces forecast assumptions and confirms no predicted income presented as cash. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F106.md`, `docs/qa/F106.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 aging/forecast definitions.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f107"></a>

### F107 — Project operational profitability

- **PR identity:** `[F107] Project operational profitability`; branch `feat/f107-project-operational-profitability` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F105, F090, F039 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-003. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Report net service revenue minus attributed costs with versioned private labor rates and explicit incomplete data.
- **Automated tests:** Missing cost not zero, fixed-fee actual time and reimburse pass-through basis consistent. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks margin formula/source drill-down and cost visibility in exports/tooltips. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F107.md`, `docs/qa/F107.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 cost basis/permissions; not statutory profit.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f108"></a>

### F108 — Delivery and capacity analytics

- **PR identity:** `[F108] Delivery and capacity analytics`; branch `feat/f108-delivery-and-capacity-analytics` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F067, F068, F077, F087 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-005. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Define completion/accepted versus done/throughput/blocked-age/milestone variance and remaining workload metrics.
- **Automated tests:** Missing estimates/cancelled tasks/cycle carryover and scoped counts reconcile. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows metrics to actual project/task history, no surveillance scoring. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F108.md`, `docs/qa/F108.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 metrics and capacity calendars.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f109"></a>

### F109 — Consolidated FX reporting

- **PR identity:** `[F109] Consolidated FX reporting`; branch `feat/f109-consolidated-fx-reporting` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F105, F100 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-006. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Keep original totals and explicit report-currency rate source/date/version/missing-rate policy for consolidation.
- **Automated tests:** Different exponents/valuation dates/stale feed and aggregation rounding fixture; no unlabeled mixed sum. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews original versus converted statements and reproducible snapshot. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F109.md`, `docs/qa/F109.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 FX feed/basis; no realized/unrealized accounting claims.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f110"></a>

### F110 — Knowledge library and safe reusable notes

- **PR identity:** `[F110] Knowledge library and safe reusable notes`; branch `feat/f110-knowledge-library-and-safe-reusable-notes` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F075, F070 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-007. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Provide personal/shared notes, code snippets, linked decisions/runbooks/templates and revision/conflict/archive/export.
- **Automated tests:** Cross-client template leakage, executable content and conflicting rich text denied/preserved. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent authors Arabic/code mixed note, restores revision and checks offline availability. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F110.md`, `docs/qa/F110.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Knowledge sharing/retention, no credentials or AI summaries.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f111"></a>

### F111 — Permission-aware global text search

- **PR identity:** `[F111] Permission-aware global text search`; branch `feat/f111-permission-aware-global-text-search` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F110, F105, F018 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-008, PLT-015. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Index permitted clients/work/tasks/notes/document metadata with Arabic normalization, filters, snippets/cursors and cache scope.
- **Automated tests:** Grant/delete invalidates snippets/counts; mixed bidi/diacritics and local subset labeled; no model embeddings. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent searches multiple roles/languages and follows safe command-palette links. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F111.md`, `docs/qa/F111.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Search dataset/performance and indexed fields.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f112"></a>

### F112 — Reproducible report snapshots and exports

- **PR identity:** `[F112] Reproducible report snapshots and exports`; branch `feat/f112-reproducible-report-snapshots-and-exports` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F105, F106, F107, F109, F044 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-009. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Freeze report filters/formulas/as-of/currencies/data scope and render exact CSV/PDF/archive with retry/cancel.
- **Automated tests:** Payment arriving during render cannot change pages; sensitive fields excluded; snapshot rerender stable. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconciles exported totals and multipage Arabic report after definition update. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F112.md`, `docs/qa/F112.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Scheduled delivery is separate and requires recipient reauthorization.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f113"></a>

### F113 — Business goals and explained threshold alerts

- **PR identity:** `[F113] Business goals and explained threshold alerts`; branch `feat/f113-business-goals-and-explained-threshold-alerts` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F104, F105, F108, F022 **Milestone:** P06 — Business insights, knowledge and search.
- **Requirements:** INS-010. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md).
- **Build the feature:** Track configurable targets/period/basis and deterministic deduped alerts with reason/expiry/snooze.
- **Automated tests:** Missing data/zero denominator/stale source cannot claim success; retry or target revision not spam. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent inspects alert evidence and dismiss/snooze without changing underlying work or debt. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F113.md`, `docs/qa/F113.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-14 selected goal/forecast semantics.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f114"></a>

### F114 — Connector registry and OAuth secret lifecycle

- **PR identity:** `[F114] Connector registry and OAuth secret lifecycle`; branch `feat/f114-connector-registry-and-oauth-secret-lifecycle` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F014, F030, F015 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-001, INT-002. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Add provider/account/scope/owner/status, authorization/revoke/rotation and server vault with health/last success.
- **Automated tests:** Wrong-account mapping, token expiry, revoked owner and disconnect remove secrets/cancel unsent work. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews actual transferred fields and reconnects sandbox account without cross-client remapping. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F114.md`, `docs/qa/F114.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 providers/scopes/credentials; no surprise connections.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f115"></a>

### F115 — Typed deterministic automation rules

- **PR identity:** `[F115] Typed deterministic automation rules`; branch `feat/f115-typed-deterministic-automation-rules` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F030, F028 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-009. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Build bounded trigger/condition/action rules, version/owner/scope, dry run, cooldown/loop/run caps and stop control.
- **Automated tests:** Dry run inert; malformed expression cannot execute code; role/recipient/cancellation rechecked at action. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews task/reminder examples and sees complete audit; no AI actions. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F115.md`, `docs/qa/F115.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Explicit rule enablement and bounded external side-effect authority.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f116"></a>

### F116 — GitHub project context and issue import

- **PR identity:** `[F116] GitHub project context and issue import`; branch `feat/f116-github-project-context-and-issue-import` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F033, F111 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-003. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Map approved GitHub repos; link issues/PRs/commits/releases and selected read-only metadata with source IDs.
- **Automated tests:** Unauthorized repo/changed duplicate/deleted issue and webhook retry do not leak code or create billable time. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent imports selected issues into permitted project and verifies source provenance. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F116.md`, `docs/qa/F116.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 GitHub scopes/account; source-code copying disabled by default.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f117"></a>

### F117 — GitLab project context and issue import

- **PR identity:** `[F117] GitLab project context and issue import`; branch `feat/f117-gitlab-project-context-and-issue-import` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F033, F111 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-003. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Add GitLab adapter using same bounded mapping/ID/permission contracts, separate from GitHub credentials.
- **Automated tests:** Private namespace, account mismatch, deleted/MR duplicate/rate limit follow common invariants. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent connects GitLab sandbox and checks parity without shared token assumptions. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F117.md`, `docs/qa/F117.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 GitLab instance/provider choice and scopes.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f118"></a>

### F118 — Explicit engineering-status synchronization

- **PR identity:** `[F118] Explicit engineering-status synchronization`; branch `feat/f118-explicit-engineering-status-synchronization` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F115, F116, F117 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-003. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Enable selected issue/status writes and mapped PR/MR transitions with revision conflict and source loop prevention.
- **Automated tests:** Duplicate remote event/write echo/stale status cannot loop or record time/accept scope/bill. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent dry-runs then enables a narrowly scoped mapping and reviews audit. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F118.md`, `docs/qa/F118.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Per-project write scopes and conflict mapping; connectors may stay read-only.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f119"></a>

### F119 — Calendar availability and event import

- **PR identity:** `[F119] Calendar availability and event import`; branch `feat/f119-calendar-availability-and-event-import` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F065, F067 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-004. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Read selected calendars, busy-only privacy and external event/recurrence mappings with timezone exceptions.
- **Automated tests:** Private title leakage, cancellation/repeat/DST/source duplicate and stale token handled. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent chooses calendars/fields and sees no automatic billable time. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F119.md`, `docs/qa/F119.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 provider, allowed fields and retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f120"></a>

### F120 — Calendar export and invitations

- **PR identity:** `[F120] Calendar export and invitations`; branch `feat/f120-calendar-export-and-invitations` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F119, F115 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-004. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Add approved outbound event/update/invite with recipients, mapping/revision and explicit send evidence.
- **Automated tests:** Lost reply, changed attendee/time and duplicate recurrence cannot resend/invite incorrectly. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews recipients and tests failed/resolved delivery in sandbox. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F120.md`, `docs/qa/F120.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Explicit external invitation authority and sender identity.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f121"></a>

### F121 — Verified outbound business email

- **PR identity:** `[F121] Verified outbound business email`; branch `feat/f121-verified-outbound-business-email` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F115, F097, F102 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-005, FIN-009, FIN-027. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Configure verified sender/reply-to/templates/locale and exact document recipient/version; distinguish queued/accepted/delivered/bounced/unknown.
- **Automated tests:** Response loss/retry/bounce/recipient revoke and private attachment filtering; reconcile before resend. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reviews EN/AR inbox artifacts and provider receipts; export is not proof of send. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F121.md`, `docs/qa/F121.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 SMTP/provider/domain; auth email versus business email separate.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f122"></a>

### F122 — Hosted payment links and checkout

- **PR identity:** `[F122] Hosted payment links and checkout`; branch `feat/f122-hosted-payment-links-and-checkout` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F043, F103 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-006, FIN-023. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Create approved hosted checkout links bound to invoice/client/currency, with no raw card entry in app.
- **Automated tests:** Tampered amount/tenant/expired link cannot settle debt from a redirect alone. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent uses provider sandbox success/cancel/failure; desktop/portal shows provisional outcome. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F122.md`, `docs/qa/F122.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 country/provider/methods and legal/business account readiness.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f123"></a>

### F123 — Verified payment webhooks and payout matching

- **PR identity:** `[F123] Verified payment webhooks and payout matching`; branch `feat/f123-verified-payment-webhooks-and-payout-matching` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F122, F098, F100, F009 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-006, FIN-023, FIN-024. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Verify callback identity/replay, dedupe provider events, map capture/fees/payout to exact payment evidence and reconcile unmatched funds.
- **Automated tests:** Duplicate/out-of-order/wrong-currency/forged callback and net payout 97 after fee 3 reconcile gross 100. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks provider IDs, outstanding balance and unmatched-event repair. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F123.md`, `docs/qa/F123.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Provider event/signature/account mapping; no webhook-trusted arbitrary tenant.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f124"></a>

### F124 — Provider refunds, disputes and chargebacks

- **PR identity:** `[F124] Provider refunds, disputes and chargebacks`; branch `feat/f124-provider-refunds-disputes-and-chargebacks` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F123, F089, F101 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-006, FIN-014, FIN-028. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Add explicitly authorized refund initiation and async dispute/chargeback evidence distinct from recording corrections.
- **Automated tests:** Retry/unknown reply/refund bound/signature/order and role approval prevent duplicate movement. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent confirms refund impact and provider reconciliation with linked debt/credit evidence. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F124.md`, `docs/qa/F124.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Provider refund/dual-approval limits and dispute policies.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f125"></a>

### F125 — Read-only bank-feed connection

- **PR identity:** `[F125] Read-only bank-feed connection`; branch `feat/f125-read-only-bank-feed-connection` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F098 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-007, FIN-024. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Connect approved read-only bank provider, account consent/expiry and deduped incremental transactions for matching.
- **Automated tests:** Revoked consent/partial feed/changed transaction/rate limit retain originals and pending reconciliation. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent reconnects sandbox feed without new payments or bank transfers. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F125.md`, `docs/qa/F125.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 supported country/provider/data consent/cost.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f126"></a>

### F126 — Accounting-tool connector

- **PR identity:** `[F126] Accounting-tool connector`; branch `feat/f126-accounting-tool-connector` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F099, F123 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-007, FIN-026. **Behavior authority:** [finance](docs/specs/finance.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Version provider account/tax/currency mappings, send approved data with stable IDs/reversal links and reconcile acknowledgments.
- **Automated tests:** Unmapped/duplicate/rejected/out-of-order rows cannot fabricate ledger success or lose local authority. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares provider sandbox records with exact export totals and disconnect repair. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F126.md`, `docs/qa/F126.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-09 tool/account/chart mapping and finance reviewer.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f127"></a>

### F127 — Scoped developer API

- **PR identity:** `[F127] Scoped developer API`; branch `feat/f127-scoped-developer-api` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F009, F014, F114 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-008. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Publish versioned bounded API contracts, scoped revocable tokens, cursor pagination and domain-command receipts/rate limits.
- **Automated tests:** Tenant scope/token downgrade/changed idempotency key/large payload and hidden counts tests. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent executes permitted/denied sandbox requests and validates redacted docs/examples. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F127.md`, `docs/qa/F127.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Token scopes/lifetime, support/version window and API quota.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f128"></a>

### F128 — Signed outgoing webhooks

- **PR identity:** `[F128] Signed outgoing webhooks`; branch `feat/f128-signed-outgoing-webhooks` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F127, F115, F030 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-008. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Deliver minimal authorized event payloads to validated HTTPS destinations with signature/rotation/retry/receipt controls.
- **Automated tests:** Private-network/redirect SSRF, replay/secret rotation and recipient revoke cannot expose records. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent verifies signature and dead-letter repair with a synthetic receiver. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F128.md`, `docs/qa/F128.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Allowed destinations/payloads and secret retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f129"></a>

### F129 — Job and connector health/repair console

- **PR identity:** `[F129] Job and connector health/repair console`; branch `feat/f129-job-and-connector-health-repair-console` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F114, F115, F121 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INT-012, INT-010. **Behavior authority:** [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Expose leases/backlog/retries/dead letters/last success/cost caps and safe pause/reconcile/resume without secrets.
- **Automated tests:** Pause during side effect, stale job owner, quota exhaustion and retry-after remain honest/idempotent. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent repairs failed rule/provider batch and reviews full redacted outcome history. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F129.md`, `docs/qa/F129.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Quota budgets and repair capabilities.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f130"></a>

### F130 — Scheduled report delivery

- **PR identity:** `[F130] Scheduled report delivery`; branch `feat/f130-scheduled-report-delivery` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F112, F121, F129 **Milestone:** P07 — Providers and deterministic automation.
- **Requirements:** INS-009, INT-011. **Behavior authority:** [insights-and-knowledge](docs/specs/insights-and-knowledge.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Schedule snapshot reports with current recipient scope, locale/timezone/quiet hours and unique occurrences.
- **Automated tests:** Revoked recipient/new payment/snapshot retry and unknown email outcome cannot leak or duplicate. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent inspects delivered EN/AR report and can pause future runs without erasing source report. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F130.md`, `docs/qa/F130.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Recipient permissions, delivery consent and runtime/PDF worker proof.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f131"></a>

### F131 — Scoped client portal authentication

- **PR identity:** `[F131] Scoped client portal authentication`; branch `feat/f131-scoped-client-portal-authentication` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F010, F014, F015 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-011, NFR-004, NFR-006. **Behavior authority:** [requirements](docs/product/requirements.md), [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Deploy separate bilingual portal guest login or approved expiring verified-link policy scoped to client/project.
- **Automated tests:** Guest cannot enumerate members/other clients; expired/revoked identity/link and account switch denied. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent tests Client A/B, English/Arabic and limited browser keyboard/screen-reader matrix. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F131.md`, `docs/qa/F131.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-10 guest identity/evidence/expiry; hosting region/budget.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f132"></a>

### F132 — Exact-version external publication

- **PR identity:** `[F132] Exact-version external publication`; branch `feat/f132-exact-version-external-publication` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F131, F073, F055, F102 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-011, WRK-009. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md), [work-management](docs/specs/work-management.md).
- **Build the feature:** Publish selected immutable views/files to explicit guests; draft edits stay internal; withdraw/revoke governed by version.
- **Automated tests:** Broad serialization/private cost/sibling file/replaced artifact cannot become public; signed link expiry enforced. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares internal and external projections then withdraws while page is open. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F132.md`, `docs/qa/F132.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Approved shareable fields and download/retention policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f133"></a>

### F133 — Client deliverable feedback and approval

- **PR identity:** `[F133] Client deliverable feedback and approval`; branch `feat/f133-client-deliverable-feedback-and-approval` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F132, F074 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-011, WRK-009, WRK-010. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md), [work-management](docs/specs/work-management.md).
- **Build the feature:** Permit version-scoped client comment/change request/acceptance with identity and idempotent decision evidence.
- **Automated tests:** Double accept/stale/withdrawn/new version and unauthorized reviewer cannot approve unintended scope. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent completes review from two guest sessions and retains prior-version history. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F133.md`, `docs/qa/F133.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-10 approval applicability and evidence requirements.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f134"></a>

### F134 — Client proposal acceptance and signing adapter

- **PR identity:** `[F134] Client proposal acceptance and signing adapter`; branch `feat/f134-client-proposal-acceptance-and-signing-adapter` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F132, F056, F057, F114 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-006, CRM-007, CRM-011. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Add authenticated proposal/contract decisions and selected legal-signature provider evidence with signer authority/version checks.
- **Automated tests:** Expired terms/duplicate callbacks/wrong signer/provider outage never present unverified acceptance as signed. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent follows signature sandbox and dispute/correction history with exact uploaded/exported artifact. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F134.md`, `docs/qa/F134.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-01/Q-10 jurisdiction/provider/signatory policy; plain portal approval distinct.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f135"></a>

### F135 — Client invoice balance and payment portal

- **PR identity:** `[F135] Client invoice balance and payment portal`; branch `feat/f135-client-invoice-balance-and-payment-portal` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F132, F123, F103 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-011, FIN-023. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md), [finance](docs/specs/finance.md).
- **Build the feature:** Expose only published final invoice/credit/balance snapshots and approved hosted checkout links.
- **Automated tests:** Hidden drafts/internal notes/other-client currency and checkout redirect cannot alter settlement. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent compares portal balance with finance and verified webhook settlement. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F135.md`, `docs/qa/F135.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Guest invoice permissions and provider/market readiness.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f136"></a>

### F136 — Client questionnaires and onboarding responses

- **PR identity:** `[F136] Client questionnaires and onboarding responses`; branch `feat/f136-client-questionnaires-and-onboarding-responses` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F131, F058, F023 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-008, CRM-011. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md).
- **Build the feature:** Publish assigned onboarding questions/files, save partial guest responses and internal verification/waivers.
- **Automated tests:** Changed template/revoked grant/duplicate submission retains responses; no credential collection in forms. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent submits incomplete and complete bilingual questionnaires, distinct from verified readiness. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F136.md`, `docs/qa/F136.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Response retention and permitted file/identity policy.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f137"></a>

### F137 — Portal brand and notification preferences

- **PR identity:** `[F137] Portal brand and notification preferences`; branch `feat/f137-portal-brand-and-notification-preferences` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F132, F121 **Milestone:** P08 — Client portal and external collaboration.
- **Requirements:** CRM-011, INT-011. **Behavior authority:** [client-lifecycle](docs/specs/client-lifecycle.md), [integrations-and-automation](docs/specs/integrations-and-automation.md).
- **Build the feature:** Apply approved logo/theme/document locale, client notification controls, accessibility and branded-safe links.
- **Automated tests:** Brand changes cannot widen sharing, alter finance snapshots or break RTL/focus/contrast. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent checks narrow/mobile browser layout only for authorized portal scope and no private tracking. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F137.md`, `docs/qa/F137.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Brand assets, link policy and supported portal browser matrix.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f138"></a>

### F138 — Account and workspace closure workflow

- **PR identity:** `[F138] Account and workspace closure workflow`; branch `feat/f138-account-and-workspace-closure-workflow` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F020, F026, F027, F101, F015 **Milestone:** P01 — Secure desktop, identity, teams and offline cloud foundation.
- **Requirements:** PLT-018. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Online reauthenticated owner transfer/closure, obligations/export/retention preview and identity/session revocation with grace.
- **Automated tests:** Final owner removal, outstanding debt/hold, stale offline replay and cancellation cannot erase required history. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent completes/cancels closure on synthetic tenant; clearly state backup/export/remote-wipe limits. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F138.md`, `docs/qa/F138.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-12/Q-13 account/finance retention and deletion grace.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f139"></a>

### F139 — SoloDesk plan and seat entitlements

- **PR identity:** `[F139] SoloDesk plan and seat entitlements`; branch `feat/f139-solodesk-plan-and-seat-entitlements` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F028, F124, F138 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** PLT-017, PLT-018. **Behavior authority:** [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Implement selected commercial product plans/trials/seats/guests/grace and server entitlements, separate from client subscriptions.
- **Automated tests:** Downgrade/cancel/retry cannot delete history, block agreed export or confuse product billing with client cash. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent verifies seat counts and grace/read/export behavior in sandbox; pricing not guessed. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F139.md`, `docs/qa/F139.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-12 pricing/license/product billing provider and refund/cancellation terms; optional until commercial launch.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f140"></a>

### F140 — Privacy-safe diagnostics and support access

- **PR identity:** `[F140] Privacy-safe diagnostics and support access`; branch `feat/f140-privacy-safe-diagnostics-and-support-access` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F009, F014, F129 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-012, PLT-014. **Behavior authority:** [requirements](docs/product/requirements.md), [platform-and-workspaces](docs/specs/platform-and-workspaces.md).
- **Build the feature:** Provide redacted support bundles, opt-in crash uploads and explicitly scoped temporary support grants with audit.
- **Automated tests:** Tokens/content/raw environment/dumps excluded by default; support grant expiry/abuse denied. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent previews bundle and tests opt-out and support revoke without hidden impersonation. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F140.md`, `docs/qa/F140.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Diagnostics retention, crash-memory consent and support staffing.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f141"></a>

### F141 — Cloud database/blob recovery drills

- **PR identity:** `[F141] Cloud database/blob recovery drills`; branch `feat/f141-cloud-database-blob-recovery-drills` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F026, F123, F129 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-003. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Independently back up DB/object bytes/required key metadata, test service restore and reconcile later provider jobs/receipts.
- **Automated tests:** Old restore cannot reuse invoice numbers, replay charges/messages or miss blobs; interrupted recovery handled. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records measured backup age/RPO/RTO and repair result with finance read-only mode if needed. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F141.md`, `docs/qa/F141.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-16 service recovery budget; Free lacks automatic DB backup/PITR guarantees.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f142"></a>

### F142 — API/schema rolling compatibility

- **PR identity:** `[F142] API/schema rolling compatibility`; branch `feat/f142-api-schema-rolling-compatibility` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F020, F043, F129 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-010. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Add expand/contract migrations, supported protocol windows, old-client upgrade prompts and forward-repair rollback policy.
- **Automated tests:** Unknown fields/events/stale client and interrupted migration cannot lose outbox or corrupt new schema. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent upgrades desktop/API in both orders and documents compatible downgrade limits. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F142.md`, `docs/qa/F142.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Minimum supported versions/offline window and migration ownership.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f143"></a>

### F143 — Performance and resource-budget verification

- **PR identity:** `[F143] Performance and resource-budget verification`; branch `feat/f143-performance-and-resource-budget-verification` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F111, F112, F129 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-008, NFR-009. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Measure cold launch/search/lists/sync/PDF/import/idle memory on declared hardware/data; fix query/index/worker bottlenecks without weakening rules.
- **Automated tests:** Benchmark reproducibility, bounded jobs, large pagination and memory/CPU regressions. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records actual p95/results/platform and quota assumptions; targets not unsupported capacity claims. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F143.md`, `docs/qa/F143.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-02 scale/budget and agreed reference hardware.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f144"></a>

### F144 — Bilingual accessibility regression gate

- **PR identity:** `[F144] Bilingual accessibility regression gate`; branch `feat/f144-bilingual-accessibility-regression-gate` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F137, F112, F005 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-006, NFR-007. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Deliver complete string/RTL/bidi/font/error audit and repeatable keyboard/screen-reader/zoom/contrast/reduced-motion QA.
- **Automated tests:** Missing translations, wrong numeric parsing, clipped Arabic multipage output or keyboard dead ends fail gate. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent verifies supported journeys; fluent Arabic/native assistive-tech review explicitly evidenced. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F144.md`, `docs/qa/F144.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Reviewer/platform/browser access; this adds gate, not delayed first-release localization.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f145"></a>

### F145 — Signed Windows installer

- **PR identity:** `[F145] Signed Windows installer`; branch `feat/f145-signed-windows-installer` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F029, F142, F143 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-011. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Implement selected Windows architecture installer, trusted signing, native callback/credentials, uninstall data choices and reproducible artifacts.
- **Automated tests:** Clean install/upgrade/repair/uninstall/reinstall and tampered artifact/native encryption tests. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records Windows build/CPU/signature and checks real file dialogs/screen reader. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F145.md`, `docs/qa/F145.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-11 supported Windows/CPU/signing credentials/cost.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f146"></a>

### F146 — Signed and notarized macOS distribution

- **PR identity:** `[F146] Signed and notarized macOS distribution`; branch `feat/f146-signed-and-notarized-macos-distribution` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F029, F142, F143 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-011. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Implement selected macOS DMG/ZIP, signing/notarization, Keychain continuity and callback/privacy behavior.
- **Automated tests:** Clean install/upgrade/quarantine/notarization/adapter ABI and tampered artifact tests on supported CPUs. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records actual macOS/CPU evidence, VoiceOver/window controls and key access after update. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F146.md`, `docs/qa/F146.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-11 Apple credentials, machines and signing cost.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f147"></a>

### F147 — Supported Linux package distribution

- **PR identity:** `[F147] Supported Linux package distribution`; branch `feat/f147-supported-linux-package-distribution` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F029, F142, F143 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-011. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Build selected AppImage/distro packages with checksum/signature, callbacks and GNOME/KDE secure vault behavior.
- **Automated tests:** Wayland/X11, Snap VS Code startup, missing vault, upgrade/uninstall and ABI/package smoke. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent records distro/desktop/display/CPU and OS permission behavior; no blanket no-sandbox fix. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F147.md`, `docs/qa/F147.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-11 distro/package/CPU support and key-store fallback decision.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f148"></a>

### F148 — Verified updates and safe rollback/repair

- **PR identity:** `[F148] Verified updates and safe rollback/repair`; branch `feat/f148-verified-updates-and-safe-rollback-repair` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F145, F146, F147, F142 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-011, NFR-010. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Add signed update manifest/artifacts, channels/staged rollout, invalid update rejection and timer/migration/key-rotation coordination.
- **Automated tests:** Tampered/old/incompatible update, crash mid-update and active timer retain safe recovery/forward repair. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent upgrades a packaged prior version on supported OSs and records data/key continuity. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F148.md`, `docs/qa/F148.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Update/signing trust roots and hosting; rollback only when schema-compatible.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f149"></a>

### F149 — Operational alerts, quotas and incident controls

- **PR identity:** `[F149] Operational alerts, quotas and incident controls`; branch `feat/f149-operational-alerts-quotas-and-incident-controls` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F140, F141, F148 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-009, NFR-012. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Monitor auth/sync/finance/jobs/backup/blob quotas with redacted correlation, spend caps, degraded modes and incident response/runbooks.
- **Automated tests:** Quota/pause/outage/secret compromise and unsafe finance pause preserve drafts and stop duplicate effects. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent drills alert→contain→reconcile→restore with owner/support responsibilities. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F149.md`, `docs/qa/F149.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Q-02/Q-16 availability/support/budget; no free-tier SLA claim.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f150"></a>

### F150 — Vendor exit and full workspace portability

- **PR identity:** `[F150] Vendor exit and full workspace portability`; branch `feat/f150-vendor-exit-and-full-workspace-portability` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F099, F138, F141, F142 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-013, NFR-003. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Rehearse portable DB/files/auth mapping/finance history/jobs export and controlled migration without old-secret reuse.
- **Automated tests:** Counts/blobs/balances/numbers/audit/relationships reconcile on restored independent environment. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent documents exit steps/cost/limitations and verifies product cancellation export path. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F150.md`, `docs/qa/F150.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** Provider terms, identity mapping/key ownership and retention.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

<a id="f151"></a>

### F151 — Stable release promotion and acceptance

- **PR identity:** `[F151] Stable release promotion and acceptance`; branch `feat/f151-stable-release-promotion-and-acceptance` → `main`; one PR; implementation and baseline/three-target native QA executed; security repaired and hosted readiness passed; fork/control delivery evidence pending; [PR #2](https://github.com/m07amed25/SoloDesk/pull/2) open; hosted readiness passed; manual delivery evidence and owner approval pending.
- **Prerequisites:** F103, F139, F144, F148, F149, F150 **Milestone:** P09 — Commercial readiness, supported distribution and operations.
- **Requirements:** NFR-001, NFR-004, NFR-005, NFR-006, NFR-007, NFR-011, NFR-014. **Behavior authority:** [requirements](docs/product/requirements.md).
- **Build the feature:** Promote only enabled verified profiles/features to signed stable artifacts with release notes, user guides and known-limitations register.
- **Automated tests:** Run complete two-user/two-device client→scope→work→time→invoice→payment/credit→portal→recovery regression and required platform gates. Apply the shared relevant contract/permission/retry/RTL/regression checks.
- **Agent QA:** Agent submits current build evidence and outstanding blockers; user gives final approval before merge/release action. Record observed results and build/commit, not code-inspection assumptions.
- **Documentation in this PR:** `docs/features/F151.md`, `docs/qa/F151.md`, affected specification/contract/user guidance and migration/rollback/runbook updates where applicable.
- **Entry decisions/limits:** All applicable market/security/QA/platform/service gates closed; disabled optional providers clearly excluded.
- **Exit gate:** all included acceptance and applicable tests/QA pass, docs complete, dependencies merged, no blocking defect, **user final approval**, then merge this one PR. Never mark this card done merely from its plan.

## 11. Requirement-to-feature traceability

All 139 existing requirements map to at least one feature phase. Cross-cutting NFRs also apply throughout every affected PR even when not repeated in each card. Multiple phase links reflect legitimate feature slices, not repeated completion claims. The original detailed requirements remain in docs; no ID is repurposed.

| Requirement | Feature phases                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| CRM-001     | [F031](#f031), [F050](#f050)                                                                            |
| CRM-002     | [F051](#f051)                                                                                           |
| CRM-003     | [F052](#f052)                                                                                           |
| CRM-004     | [F053](#f053), [F054](#f054)                                                                            |
| CRM-005     | [F055](#f055)                                                                                           |
| CRM-006     | [F056](#f056), [F134](#f134)                                                                            |
| CRM-007     | [F057](#f057), [F134](#f134)                                                                            |
| CRM-008     | [F058](#f058), [F136](#f136)                                                                            |
| CRM-009     | [F059](#f059)                                                                                           |
| CRM-010     | [F060](#f060)                                                                                           |
| CRM-011     | [F131](#f131), [F132](#f132), [F133](#f133), [F134](#f134), [F135](#f135), [F136](#f136), [F137](#f137) |
| FIN-001     | [F041](#f041), [F103](#f103)                                                                            |
| FIN-002     | [F054](#f054)                                                                                           |
| FIN-003     | [F092](#f092)                                                                                           |
| FIN-004     | [F041](#f041)                                                                                           |
| FIN-005     | [F041](#f041)                                                                                           |
| FIN-006     | [F043](#f043)                                                                                           |
| FIN-007     | [F043](#f043), [F103](#f103)                                                                            |
| FIN-008     | [F044](#f044)                                                                                           |
| FIN-009     | [F045](#f045), [F121](#f121)                                                                            |
| FIN-010     | [F046](#f046)                                                                                           |
| FIN-011     | [F045](#f045), [F046](#f046)                                                                            |
| FIN-012     | [F046](#f046)                                                                                           |
| FIN-013     | [F088](#f088)                                                                                           |
| FIN-014     | [F089](#f089), [F124](#f124)                                                                            |
| FIN-015     | [F088](#f088), [F089](#f089)                                                                            |
| FIN-016     | [F040](#f040), [F103](#f103)                                                                            |
| FIN-017     | [F040](#f040)                                                                                           |
| FIN-018     | [F040](#f040), [F100](#f100)                                                                            |
| FIN-019     | [F096](#f096)                                                                                           |
| FIN-020     | [F093](#f093), [F094](#f094)                                                                            |
| FIN-021     | [F047](#f047), [F090](#f090)                                                                            |
| FIN-022     | [F042](#f042), [F090](#f090)                                                                            |
| FIN-023     | [F122](#f122), [F123](#f123), [F135](#f135)                                                             |
| FIN-024     | [F098](#f098), [F123](#f123), [F125](#f125)                                                             |
| FIN-025     | [F048](#f048), [F105](#f105)                                                                            |
| FIN-026     | [F099](#f099), [F126](#f126)                                                                            |
| FIN-027     | [F097](#f097), [F121](#f121)                                                                            |
| FIN-028     | [F101](#f101), [F124](#f124)                                                                            |
| FIN-029     | [F043](#f043)                                                                                           |
| FIN-030     | [F043](#f043), [F085](#f085), [F103](#f103)                                                             |
| FIN-031     | [F044](#f044), [F102](#f102)                                                                            |
| FIN-032     | [F091](#f091), [F092](#f092)                                                                            |
| FIN-033     | [F023](#f023), [F047](#f047)                                                                            |
| FIN-034     | [F041](#f041)                                                                                           |
| FIN-035     | [F095](#f095)                                                                                           |
| INS-001     | [F048](#f048), [F104](#f104)                                                                            |
| INS-002     | [F105](#f105)                                                                                           |
| INS-003     | [F107](#f107)                                                                                           |
| INS-004     | [F106](#f106)                                                                                           |
| INS-005     | [F108](#f108)                                                                                           |
| INS-006     | [F109](#f109)                                                                                           |
| INS-007     | [F110](#f110)                                                                                           |
| INS-008     | [F111](#f111)                                                                                           |
| INS-009     | [F112](#f112), [F130](#f130)                                                                            |
| INS-010     | [F113](#f113)                                                                                           |
| INT-001     | [F114](#f114)                                                                                           |
| INT-002     | [F114](#f114)                                                                                           |
| INT-003     | [F116](#f116), [F117](#f117), [F118](#f118)                                                             |
| INT-004     | [F119](#f119), [F120](#f120)                                                                            |
| INT-005     | [F121](#f121)                                                                                           |
| INT-006     | [F122](#f122), [F123](#f123), [F124](#f124)                                                             |
| INT-007     | [F125](#f125), [F126](#f126)                                                                            |
| INT-008     | [F127](#f127), [F128](#f128)                                                                            |
| INT-009     | [F115](#f115)                                                                                           |
| INT-010     | [F030](#f030), [F129](#f129)                                                                            |
| INT-011     | [F130](#f130), [F137](#f137)                                                                            |
| INT-012     | [F129](#f129)                                                                                           |
| NFR-001     | [F003](#f003), [F009](#f009), [F040](#f040), [F049](#f049), [F151](#f151)                               |
| NFR-002     | [F017](#f017), [F020](#f020), [F049](#f049)                                                             |
| NFR-003     | [F007](#f007), [F020](#f020), [F025](#f025), [F026](#f026), [F049](#f049), [F141](#f141), [F150](#f150) |
| NFR-004     | [F008](#f008), [F009](#f009), [F014](#f014), [F018](#f018), [F049](#f049), [F131](#f131), [F151](#f151) |
| NFR-005     | [F006](#f006), [F023](#f023), [F025](#f025), [F049](#f049), [F151](#f151)                               |
| NFR-006     | [F005](#f005), [F049](#f049), [F131](#f131), [F144](#f144), [F151](#f151)                               |
| NFR-007     | [F005](#f005), [F049](#f049), [F144](#f144), [F151](#f151)                                              |
| NFR-008     | [F002](#f002), [F143](#f143)                                                                            |
| NFR-009     | [F008](#f008), [F030](#f030), [F143](#f143), [F149](#f149)                                              |
| NFR-010     | [F007](#f007), [F020](#f020), [F142](#f142), [F148](#f148)                                              |
| NFR-011     | [F029](#f029), [F049](#f049), [F145](#f145), [F146](#f146), [F147](#f147), [F148](#f148), [F151](#f151) |
| NFR-012     | [F140](#f140), [F149](#f149)                                                                            |
| NFR-013     | [F024](#f024), [F027](#f027), [F150](#f150)                                                             |
| NFR-014     | [F001](#f001), [F002](#f002), [F049](#f049), [F151](#f151)                                              |
| NFR-015     | [F002](#f002), [F003](#f003), [F004](#f004), [F005](#f005)                                              |
| PLT-001     | [F010](#f010)                                                                                           |
| PLT-002     | [F010](#f010), [F011](#f011)                                                                            |
| PLT-003     | [F008](#f008), [F012](#f012)                                                                            |
| PLT-004     | [F013](#f013)                                                                                           |
| PLT-005     | [F008](#f008), [F014](#f014)                                                                            |
| PLT-006     | [F015](#f015)                                                                                           |
| PLT-007     | [F006](#f006), [F007](#f007)                                                                            |
| PLT-008     | [F003](#f003), [F017](#f017), [F018](#f018), [F020](#f020)                                              |
| PLT-009     | [F019](#f019)                                                                                           |
| PLT-010     | [F016](#f016)                                                                                           |
| PLT-011     | [F021](#f021)                                                                                           |
| PLT-012     | [F004](#f004), [F029](#f029)                                                                            |
| PLT-013     | [F022](#f022)                                                                                           |
| PLT-014     | [F009](#f009), [F140](#f140)                                                                            |
| PLT-015     | [F005](#f005), [F111](#f111)                                                                            |
| PLT-016     | [F024](#f024), [F025](#f025), [F026](#f026), [F027](#f027)                                              |
| PLT-017     | [F028](#f028), [F139](#f139)                                                                            |
| PLT-018     | [F138](#f138), [F139](#f139)                                                                            |
| TIM-001     | [F036](#f036)                                                                                           |
| TIM-002     | [F036](#f036)                                                                                           |
| TIM-003     | [F036](#f036)                                                                                           |
| TIM-004     | [F037](#f037)                                                                                           |
| TIM-005     | [F035](#f035)                                                                                           |
| TIM-006     | [F079](#f079)                                                                                           |
| TIM-007     | [F038](#f038)                                                                                           |
| TIM-008     | [F038](#f038)                                                                                           |
| TIM-009     | [F081](#f081)                                                                                           |
| TIM-010     | [F039](#f039)                                                                                           |
| TIM-011     | [F035](#f035)                                                                                           |
| TIM-012     | [F042](#f042), [F085](#f085)                                                                            |
| TIM-013     | [F042](#f042), [F085](#f085)                                                                            |
| TIM-014     | [F080](#f080)                                                                                           |
| TIM-015     | [F082](#f082)                                                                                           |
| TIM-016     | [F037](#f037)                                                                                           |
| TIM-017     | [F076](#f076)                                                                                           |
| TIM-018     | [F083](#f083)                                                                                           |
| TIM-019     | [F084](#f084)                                                                                           |
| TIM-020     | [F086](#f086)                                                                                           |
| TIM-021     | [F087](#f087)                                                                                           |
| TIM-022     | [F038](#f038)                                                                                           |
| TIM-023     | [F079](#f079)                                                                                           |
| TIM-024     | [F036](#f036)                                                                                           |
| WRK-001     | [F032](#f032)                                                                                           |
| WRK-002     | [F033](#f033), [F061](#f061)                                                                            |
| WRK-003     | [F063](#f063), [F064](#f064), [F066](#f066)                                                             |
| WRK-004     | [F034](#f034), [F062](#f062), [F065](#f065), [F066](#f066)                                              |
| WRK-005     | [F067](#f067)                                                                                           |
| WRK-006     | [F068](#f068), [F069](#f069)                                                                            |
| WRK-007     | [F070](#f070), [F071](#f071)                                                                            |
| WRK-008     | [F072](#f072)                                                                                           |
| WRK-009     | [F073](#f073), [F132](#f132), [F133](#f133)                                                             |
| WRK-010     | [F074](#f074), [F133](#f133)                                                                            |
| WRK-011     | [F023](#f023), [F075](#f075)                                                                            |
| WRK-012     | [F039](#f039), [F076](#f076)                                                                            |
| WRK-013     | [F077](#f077)                                                                                           |
| WRK-014     | [F078](#f078)                                                                                           |

## 12. Execution checklist and first next step

For each selected feature, use this sequence as work tasks; all are future work:

- [ ] Read its phase card/current source/owning specs and relevant AGENT.md skills; confirm dependency PRs merged.
- [ ] Resolve its blocking policy/provider/native questions and write the feature acceptance contract.
- [ ] Create its one feature branch and meaningful tests/fixtures; build the bounded vertical slice with relevant migrations/security/RTL.
- [ ] Update feature/source/user/runbook docs and record local checks before opening its reviewable draft PR.
- [ ] Complete applicable CI and agent QA, fix defects in the same PR and refresh evidence for the latest changes.
- [ ] Present that PR and evidence for the user's final approval; do not merge on silence or checks alone.
- [ ] Merge only after approval and gates; record actual URL/SHA/status and release only through applicable gates.

**First implementation phase:** F001, delivery governance and PR standards. Its scope is concrete project principles, one-feature/one-PR/evidence policy and traceable approval rules; do not begin product features or reinitialize the repository inside that phase. F002 then supplies enforced verification tooling; F003–F030 establish safe foundations before broad domain work. Reuse the existing shell/launcher fixes rather than rebuilding them unnecessarily.

For future feature-scoped Spec Kit work, resolve active feature paths through its scripts, read the actual skill and hooks, and generate only artifacts authorized for that selected phase. OpenSpec is not initialized and must not be mixed into this programme automatically. This request produces only root plan.md; formal phase implementation/PR creation is subsequent work using this plan and the user's selected phase.

## 13. Plan integrity checks

Planning verification: 151 unique ordered feature IDs, one PR identity per phase, acyclic prerequisite graph with prerequisites earlier than dependents, all 139 requirement IDs covered, documentation/testing/QA/decision/approval fields on every card, and local references/anchors valid. These are document checks only, not runtime tests. No feature completion, CI success, GitHub protection or deployment is asserted by these checks.

Maintain this single plan as the programme source: new scope receives new feature IDs; dependency changes are revalidated; affected tests/docs/QA/market/provider limits are revised together. Keep factual status separate from desired behavior. Do not silently mark optional blocked features complete or remove necessary quality gates to shorten the roadmap.
