# SoloDesk documentation index

Updated 17 October 2026. Complete phased design set for the expanded product; **business implementation deferred**. F001 governance documentation and local validation are implemented for review. Current implementation includes the welcome shell, F001/F002 delivery tooling and the authorized F003 pure-contract foundation in review. Business workflows remain deferred. Confirmed product choices and proposed details are explicitly distinguished. Read [product brief](../PRODUCT.md), [roadmap](planning/roadmap.md), [coverage](planning/coverage.md), then [decisions](planning/decisions.md).

## Confirmed direction

Freelancers and small teams from first release; Windows/macOS/Linux Electron; Tailwind/shadcn; required managed-cloud accounts with offline work; online invoice finalization; encrypted device/cloud storage with controlled server access; configurable finance; English/Arabic/full RTL; no AI for now; prefer low-cost efficient free services where suitable. Backend selection recommends a Supabase-first free development/pilot profile with explicit quota/recovery/upgrade gates.

## Agent skill guide

[AGENT.md](../AGENT.md) documents 34 local and 18 session-provided skills, task routing, Spec Kit/OpenSpec prerequisites and phase guidance. [AGENTS.md](../AGENTS.md) points repository agents to it.

## Delivery governance

[Contributor policy](development/delivery-governance.md), [F001 feature guide](features/F001.md)
and [F001 QA/evidence](qa/F001.md) describe the implemented local tooling and current review.
Owner approval, merge and release are separate outcomes. [F003 guide](features/F003.md) and [F003 QA](qa/F003.md) cover current shared contracts and synthetic conformance.

## UI design system

[DESIGN.md](../DESIGN.md) defines the proposed logo-based visual foundations. The [complete UI design set](design/README.md) includes paired theme tokens, spacious component/interaction contracts, English/Arabic RTL, 73 screen families, all 151 feature-phase mappings, QA/handoff and a separate [visual reference](design/reference.html). This design is not applied to the running app.

## Document map

| Document                                                        | Purpose                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Product brief](../PRODUCT.md)                                  | Audience, goals, confirmed boundaries, first release versus complete roadmap              |
| [Requirements](product/requirements.md)                         | Requirement families, nonfunctional rules and earlier-ID migration                        |
| [Workflows](product/workflows.md)                               | Cross-domain actions, states, retries and recovery                                        |
| [Screens](product/screens.md)                                   | Navigation, permissions, online/offline and required UI states                            |
| [UX/localization](product/ux-and-localization.md)               | English/Arabic, RTL, numeric/bidi/PDF, keyboard/accessibility                             |
| [Glossary](product/glossary.md)                                 | Domain meanings and Arabic terminology seed                                               |
| [Platform/workspaces](specs/platform-and-workspaces.md)         | Identity, teams, permissions, offline, devices, settings and closure                      |
| [Client lifecycle](specs/client-lifecycle.md)                   | CRM, contacts, catalog, proposals, agreements, onboarding and portal handoff              |
| [Work management](specs/work-management.md)                     | Tasks, dependencies, capacity, scope changes, delivery and collaboration                  |
| [Time/productivity](specs/time-and-productivity.md)             | Timer evidence/recovery, rates, rounding, approvals and allocations                       |
| [Finance](specs/finance.md)                                     | Exact money, invoices/payments/credits, expenses, retainers/subscriptions, reconciliation |
| [Insights/knowledge](specs/insights-and-knowledge.md)           | Reports, forecasts, profitability, knowledge and search                                   |
| [Integrations/automation](specs/integrations-and-automation.md) | Provider scopes, deterministic rules, durable jobs and external evidence                  |
| [Architecture](architecture/overview.md)                        | Desktop/cloud/portal responsibilities and authority                                       |
| [Backend/cost selection](architecture/backend-stack.md)         | Supabase recommendation, verified free limits, alternatives and cost triggers             |
| [Data model](architecture/data-model.md)                        | Entities, relationships, types, constraints, migrations and invariants                    |
| [API/IPC contracts](architecture/api-contracts.md)              | Commands, validation, idempotency, errors, pagination and files                           |
| [Sync/collaboration](architecture/sync-and-collaboration.md)    | Conflicts/cursors/tombstones, revocation, financial authority and client portal           |
| [Security/privacy](architecture/security-and-privacy.md)        | Threats, keys, tenant isolation, retention, support and release controls                  |
| [Data lifecycle](architecture/data-lifecycle.md)                | Persistence, migrations, imports/exports, encrypted backup and safe recovery              |
| [Proposed source structure](architecture/project-structure.md)  | Future desktop/shared/backend/portal folders and dependencies                             |
| [Module ownership](modules/responsibilities.md)                 | Rule owners, contracts and event boundaries                                               |
| [Acceptance](quality/acceptance.md)                             | User-visible expected outcomes and evidence format                                        |
| [Test strategy](quality/test-strategy.md)                       | Domain/integration/OS/RTL/security/recovery/load verification                             |
| [Release/support](operations/release-and-support.md)            | Installers, signed updates, incident response, quotas, recovery and user guidance         |
| [Current development setup](development/setup.md)               | Installed shell/tooling and checks already performed                                      |
| [Roadmap](planning/roadmap.md)                                  | Ten phases, dependencies, core/advanced/connected release slices                          |
| [Decisions](planning/decisions.md)                              | Confirmed answers, recommendations, complex unresolved gates                              |
| [Risks](planning/risks.md)                                      | Integrity, privacy, deployment, Arabic and scope risks                                    |
| [Coverage](planning/coverage.md)                                | Every requirement mapped to source, phase and acceptance family                           |

## Phase plans

- [P00 — Product rules, scope and UX](planning/phases/P00-product-decisions.md)
- [P01 — Secure desktop, cloud and team foundation](planning/phases/P01-platform-and-cloud.md)
- [P02 — Clients, sales and agreements](planning/phases/P02-client-lifecycle.md)
- [P03 — Projects, tasks and controlled delivery](planning/phases/P03-work-management.md)
- [P04 — Time evidence, rates and review](planning/phases/P04-time-and-productivity.md)
- [P05 — Billing, collections and commercial finances](planning/phases/P05-finance.md)
- [P06 — Business visibility, knowledge and search](planning/phases/P06-insights-and-knowledge.md)
- [P07 — Provider connections and deterministic rules](planning/phases/P07-integrations-and-automation.md)
- [P08 — Client portal and external review](planning/phases/P08-client-portal.md)
- [P09 — Distribution, support and reliable service](planning/phases/P09-release-and-operations.md)

## Maintenance and implementation readiness

Confirmed decisions are authoritative; recommendations and open policies must not be silently promoted to user choices. Update requirement, affected state/data/API, phase, acceptance, risk and decision links together. Stable IDs are never reused. Each enabled release slice needs actual evidence; never check a future gate from documentation alone. Financial legal profiles require selected markets/review. Current scope authorizes F001 governance implementation and its PR publication. Business implementation, new packages, cloud provisioning and deployment remain deferred.

Recommended reading paths: product owner → brief/decisions/roadmap/screens; engineer → architecture/data/API/sync/security/specs; QA → coverage/acceptance/test strategy/phases; operator → backend/data lifecycle/release/support. For running the existing shell, use development/setup.md.

F002 implementation is authorized by the current user request. Its [verification commands, native/security scope and recovery](features/F002.md) and actual QA remain distinct from business-feature implementation, owner approval, merge, protection activation and release.
