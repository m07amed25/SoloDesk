# Feature-phase to UI coverage

Status: design coverage, not implemented or tested functionality. Every phase in [plan.md](../../plan.md) appears once. UI IDs are defined in [screens.md](screens.md). Nonvisual foundations and release gates are identified explicitly. Domain requirements remain authoritative; feature PRs must add their concrete field/state evidence.

| Phase | Planned feature | UI surfaces | Design/QA obligation |
| --- | --- | --- | --- |
| [F001](../../plan.md) | Delivery governance and PR standards | Shared contracts only | Nonvisual governance/test/domain foundation. Verify shared UI contracts; no standalone end-user screen. |
| [F002](../../plan.md) | Automated CI and verification harness | Shared contracts only | Nonvisual governance/test/domain foundation. Verify shared UI contracts; no standalone end-user screen. |
| [F003](../../plan.md) | Shared typed commands and domain primitives | Shared contracts only | Nonvisual governance/test/domain foundation. Verify shared UI contracts; no standalone end-user screen. |
| [F004](../../plan.md) | Secure Electron lifecycle and preload bridge | UI-001 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F005](../../plan.md) | Accessible English/Arabic application shell | UI-001 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F006](../../plan.md) | Cross-platform key protection and encryption proof | UI-006 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F007](../../plan.md) | Encrypted local persistence and migrations | UI-006 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F008](../../plan.md) | Managed backend and tenant isolation | UI-004, UI-007 | Nonvisual tenant/backend foundation; access and sync errors surface in onboarding/Sync center. |
| [F009](../../plan.md) | Authoritative command receipts and audit | UI-015 | Nonvisual receipts/audit foundation; inspect through authorized history and operation receipts. |
| [F010](../../plan.md) | Browser sign-in and native enrollment | UI-002 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F011](../../plan.md) | MFA and account recovery | UI-003 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F012](../../plan.md) | Workspace creation and safe switching | UI-004, UI-001 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F013](../../plan.md) | Member invitations | UI-005 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F014](../../plan.md) | Roles and project-scoped grants | UI-005 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F015](../../plan.md) | Device enrollment and revocation | UI-006 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F016](../../plan.md) | Bounded offline authorization and lock | UI-006 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F017](../../plan.md) | Durable local outbox and push | UI-007 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F018](../../plan.md) | Incremental pull and permission invalidation | UI-007 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F019](../../plan.md) | Conflict review center | UI-007, UI-008 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F020](../../plan.md) | Deletion tombstones and stale-device rejoin | UI-007, UI-008 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F021](../../plan.md) | Personal, device and workspace settings | UI-009 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F022](../../plan.md) | In-app and OS notification center | UI-010 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F023](../../plan.md) | Private versioned attachments | UI-011 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F024](../../plan.md) | Safe staged import framework | UI-012 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F025](../../plan.md) | Encrypted device backup export | UI-013 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F026](../../plan.md) | Isolated restore and reviewed cloud rejoin | UI-013 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F027](../../plan.md) | Scoped portable data export | UI-013 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F028](../../plan.md) | Feature and policy configuration | UI-014 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F029](../../plan.md) | Native callback, packaging and signing feasibility | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F030](../../plan.md) | Durable scheduled job execution | UI-066 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F031](../../plan.md) | Clients and contact profiles | UI-018 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F032](../../plan.md) | Project creation and lifecycle | UI-029 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F033](../../plan.md) | Task creation, ownership and states | UI-017, UI-030 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F034](../../plan.md) | Task lists, filters and bulk editing | UI-017 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F035](../../plan.md) | Manual reviewed time entries | UI-042 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F036](../../plan.md) | Persistent timer start, pause, switch and stop | UI-041 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F037](../../plan.md) | Timer crash, sleep and exit recovery | UI-041, UI-043 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F038](../../plan.md) | Timezone and overlap reconciliation | UI-042, UI-043 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F039](../../plan.md) | Dated selling and internal cost rates | UI-044 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F040](../../plan.md) | Exact money and calculation profiles | UI-061, UI-049 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F041](../../plan.md) | Offline invoice draft editor | UI-049 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F042](../../plan.md) | Authoritative time/expense draft reservations | UI-046, UI-049 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F043](../../plan.md) | Invoice numbering and atomic online issuance | UI-048, UI-050 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F044](../../plan.md) | English/Arabic invoice PDF export | UI-051 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F045](../../plan.md) | Manual delivery and invoice status | UI-048, UI-052 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F046](../../plan.md) | Partial payments and unapplied client credit | UI-053 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F047](../../plan.md) | Expense recording and receipt evidence | UI-054 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F048](../../plan.md) | Core work and receivables overview | UI-016 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F049](../../plan.md) | Core pilot release and cross-domain evidence | UI-016, UI-018, UI-029, UI-041, UI-048 | Cross-domain pilot release gate; verify complete journeys across existing screens, not a new page. |
| [F050](../../plan.md) | Client archive, merge and relationship integrity | UI-018, UI-019 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F051](../../plan.md) | Opportunity pipeline and weighted forecast | UI-020 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F052](../../plan.md) | Relationship activities and follow-ups | UI-021 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F053](../../plan.md) | Versioned service catalog | UI-022 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F054](../../plan.md) | Estimate scenarios and comparison | UI-023 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F055](../../plan.md) | Proposal revisions and document sharing | UI-024 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F056](../../plan.md) | Acceptance evidence and disputes | UI-024 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F057](../../plan.md) | Agreements, amendments and obligations | UI-025 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F058](../../plan.md) | Client onboarding checklists | UI-026 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F059](../../plan.md) | Accepted engagement project handoff | UI-027 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F060](../../plan.md) | Renewals and deterministic client health | UI-028 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F061](../../plan.md) | Task hierarchy and checklists | UI-030 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F062](../../plan.md) | Accessible Kanban workflow | UI-031 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F063](../../plan.md) | Task dependency graph | UI-032 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F064](../../plan.md) | Milestone completion and acceptance | UI-032 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F065](../../plan.md) | Task calendar view | UI-033 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F066](../../plan.md) | Project timeline planning | UI-033 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F067](../../plan.md) | Team capacity and leave calendars | UI-034 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F068](../../plan.md) | Sprints and delivery cycles | UI-034 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F069](../../plan.md) | Recurring task generation | UI-035, UI-030 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F070](../../plan.md) | Project and task templates | UI-035, UI-030 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F071](../../plan.md) | Typed custom fields | UI-035, UI-030 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F072](../../plan.md) | Scope baseline and change requests | UI-036 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F073](../../plan.md) | Versioned deliverables and internal review | UI-037 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F074](../../plan.md) | Scoped comments, mentions and threads | UI-038 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F075](../../plan.md) | Project notes and attachment revisions | UI-038 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F076](../../plan.md) | Budget baselines and threshold alerts | UI-039 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F077](../../plan.md) | Portfolio health, risks and decisions | UI-039 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F078](../../plan.md) | Archive, task transfer and handover | UI-040 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F079](../../plan.md) | Unallocated time editing and conservation | UI-042 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F080](../../plan.md) | Time list and calendar views | UI-042 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F081](../../plan.md) | Versioned billing time-rounding policies | UI-044 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F082](../../plan.md) | Optional idle detection and review | UI-043 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F083](../../plan.md) | Focus sessions and breaks | UI-047 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F084](../../plan.md) | Timesheet submission and approvals | UI-045 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F085](../../plan.md) | Partial time-source allocation | UI-046 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F086](../../plan.md) | Time imports and detailed exports | UI-012, UI-042 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F087](../../plan.md) | Utilization and effective-rate metrics | UI-047, UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F088](../../plan.md) | Credit notes and invoice correction | UI-055 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F089](../../plan.md) | Refund recording and settlement reversals | UI-055 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F090](../../plan.md) | Expense approval, splits and reimbursement | UI-054 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F091](../../plan.md) | Deposits and final-invoice application | UI-056 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F092](../../plan.md) | Milestone billing schedules | UI-056 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F093](../../plan.md) | Monetary prepaid retainers | UI-057 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F094](../../plan.md) | Included-service retainers and overages | UI-057 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F095](../../plan.md) | Client subscriptions and proration | UI-058 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F096](../../plan.md) | Recurring invoice draft generation | UI-058 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F097](../../plan.md) | Collection reminder schedules | UI-059 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F098](../../plan.md) | Bank-file reconciliation | UI-060 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F099](../../plan.md) | Portable accounting transaction exports | UI-060 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F100](../../plan.md) | Cross-currency settlement records | UI-060 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F101](../../plan.md) | Disputes, write-offs and collection notes | UI-059 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F102](../../plan.md) | Branded bilingual document templates | UI-051 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F103](../../plan.md) | Validated market invoice profiles | UI-061, UI-014 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F104](../../plan.md) | Customizable home dashboards | UI-016 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F105](../../plan.md) | Revenue and collection reports | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F106](../../plan.md) | Receivables aging and cash scenarios | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F107](../../plan.md) | Project operational profitability | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F108](../../plan.md) | Delivery and capacity analytics | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F109](../../plan.md) | Consolidated FX reporting | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F110](../../plan.md) | Knowledge library and safe reusable notes | UI-063 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F111](../../plan.md) | Permission-aware global text search | UI-063 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F112](../../plan.md) | Reproducible report snapshots and exports | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F113](../../plan.md) | Business goals and explained threshold alerts | UI-062 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F114](../../plan.md) | Connector registry and OAuth secret lifecycle | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F115](../../plan.md) | Typed deterministic automation rules | UI-065 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F116](../../plan.md) | GitHub project context and issue import | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F117](../../plan.md) | GitLab project context and issue import | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F118](../../plan.md) | Explicit engineering-status synchronization | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F119](../../plan.md) | Calendar availability and event import | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F120](../../plan.md) | Calendar export and invitations | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F121](../../plan.md) | Verified outbound business email | UI-052, UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F122](../../plan.md) | Hosted payment links and checkout | UI-053, UI-064, UI-069 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F123](../../plan.md) | Verified payment webhooks and payout matching | UI-053, UI-064, UI-069 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F124](../../plan.md) | Provider refunds, disputes and chargebacks | UI-055, UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F125](../../plan.md) | Read-only bank-feed connection | UI-060, UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F126](../../plan.md) | Accounting-tool connector | UI-060, UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F127](../../plan.md) | Scoped developer API | UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F128](../../plan.md) | Signed outgoing webhooks | UI-065, UI-064 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F129](../../plan.md) | Job and connector health/repair console | UI-066 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F130](../../plan.md) | Scheduled report delivery | UI-062, UI-065, UI-066 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F131](../../plan.md) | Scoped client portal authentication | UI-067 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F132](../../plan.md) | Exact-version external publication | UI-068 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F133](../../plan.md) | Client deliverable feedback and approval | UI-068 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F134](../../plan.md) | Client proposal acceptance and signing adapter | UI-068 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F135](../../plan.md) | Client invoice balance and payment portal | UI-069 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F136](../../plan.md) | Client questionnaires and onboarding responses | UI-026, UI-070 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F137](../../plan.md) | Portal brand and notification preferences | UI-067 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F138](../../plan.md) | Account and workspace closure workflow | UI-071 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F139](../../plan.md) | SoloDesk plan and seat entitlements | UI-071 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F140](../../plan.md) | Privacy-safe diagnostics and support access | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F141](../../plan.md) | Cloud database/blob recovery drills | UI-013, UI-073 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F142](../../plan.md) | API/schema rolling compatibility | UI-007, UI-073 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F143](../../plan.md) | Performance and resource-budget verification | UI-073 | Performance/resource gate across all applicable screens; diagnostic surfaces are secondary. |
| [F144](../../plan.md) | Bilingual accessibility regression gate | UI-001 | Bilingual accessibility regression gate across all relevant UI-IDs; no standalone end-user screen. |
| [F145](../../plan.md) | Signed Windows installer | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F146](../../plan.md) | Signed and notarized macOS distribution | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F147](../../plan.md) | Supported Linux package distribution | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F148](../../plan.md) | Verified updates and safe rollback/repair | UI-072 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F149](../../plan.md) | Operational alerts, quotas and incident controls | UI-066, UI-073 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F150](../../plan.md) | Vendor exit and full workspace portability | UI-013 | Feature screen; apply shared state, permission, locale and online contracts. |
| [F151](../../plan.md) | Stable release promotion and acceptance | UI-073 | Stable release acceptance across all relevant journeys; no standalone product feature screen. |
