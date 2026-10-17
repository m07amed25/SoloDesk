![SoloDesk GitHub banner](public/Github%20banner.png)

# SoloDesk

**Freelance work, from the first conversation to the final payment.**

SoloDesk is a desktop workspace being built for freelance software engineers and small teams. It brings client relationships, project delivery, time tracking and financial operations into one connected workflow.

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/m07amed25/SoloDesk?utm_source=oss&utm_medium=github&utm_campaign=m07amed25%2FSoloDesk&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

[Documentation](docs/README.md) · [Implementation plan](plan.md) · [Plan diagrams](implementation-plan-map.md) · [UI design system](DESIGN.md)

## Project status

**Early development — runnable desktop shell with a documented product and UI roadmap.**

The current app opens an Electron window with a React welcome screen, native window controls and a planned-features toggle. Business workflows, authentication, managed backend, encrypted local persistence, synchronization and the client portal remain planned.

The repository includes a **151-phase implementation plan**, detailed domain specifications and a UI design system covering **73 screen families**. The separate [design reference](docs/design/reference.html) illustrates the proposed interface; it is not the implemented application.

**Target platforms:** Windows, macOS and Linux. Current development documentation records Linux shell verification; packaged releases and Windows/macOS verification are future release gates.

## Planned capabilities

The following capabilities describe the product roadmap and are not available in the current shell.

| Area | Planned workflow |
| --- | --- |
| Clients and sales | Contacts, opportunity pipeline, estimates, proposals, agreements and onboarding |
| Projects and delivery | Tasks, dependencies, milestones, Kanban, calendars, timelines, deliverables and reviews |
| Time and productivity | Persistent timers, manual entries, crash recovery, timesheets, approvals and billing allocations |
| Finance | Invoices, partial payments, credits, refunds, expenses, deposits, retainers and recurring billing |
| Teams and workspaces | Cloud accounts, invitations, scoped roles, device enrollment and multiple workspaces |
| Business visibility | Dashboards, profitability, receivables, cash scenarios, reports, knowledge and search |
| Connected operations | Explicitly enabled integrations, deterministic automation and a scoped client portal |

### Product foundations

- **Cloud accounts with offline work:** enrolled devices will retain authorized work and synchronize with explicit conflict and recovery states.
- **Controlled financial actions:** invoice drafts can be prepared offline; final issuance requires an authoritative online transaction.
- **Privacy and access control:** the plan requires encrypted device storage, scoped permissions and traceable financial history.
- **English and Arabic:** full RTL, accessible keyboard interaction and equivalent workflows are first-release requirements.
- **A consistent workspace:** spacious layouts, light/dark/System themes, Tailwind CSS and shadcn/ui form the documented UI direction.
- **Focused scope:** deterministic automation is planned; AI product features are outside the current roadmap.

## Getting started

### Prerequisites

- **Node.js 24.x**, as required by `package.json`, and npm.
- **Git** to clone the repository.
- Python and a C/C++ build toolchain if native dependencies need compilation. See the [development setup](docs/development/setup.md) for native-module details.

### Install and launch

```bash
git clone https://github.com/m07amed25/SoloDesk.git
cd SoloDesk
npm ci
npm run setup:electron
npm start
```

For an existing checkout with dependencies installed, run:

```bash
npm start
```

Keep the terminal open while developing. Renderer changes reload through Vite; main-process changes restart the app. Close the window or press `Ctrl+C` in the terminal to stop it. A Supabase project is not needed to launch the current welcome shell.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm start` | Launch the Electron development app through the project launcher |
| `npm run setup:electron` | Download Electron's platform binary when needed |
| `npm run typecheck` | Check TypeScript types |
| `npm run test:launcher` | Run startup-environment regression tests |
| `npm run ui:info` | Inspect the shadcn configuration |
| `npm run build` | Compile the main process and renderer; does not create an installer |

On Linux, the launcher handles inherited VS Code Snap GTK/schema paths associated with the documented startup crash. For startup troubleshooting and verification history, read [development setup](docs/development/setup.md).

## Technology stack

| Layer | Technology | Current role |
| --- | --- | --- |
| Desktop runtime | Electron, Electron Forge | Runnable desktop shell and development lifecycle |
| Interface | React, TypeScript | Welcome-screen renderer and typed source |
| Styling and components | Tailwind CSS, shadcn/ui, Base UI, Lucide | Existing UI foundation; complete design system documented for implementation |
| Build tooling | Vite | Main/renderer builds and development reload |
| Local persistence | SQLite-compatible storage | `better-sqlite3` is installed; business persistence and a verified encryption adapter remain planned |
| Managed backend | Supabase Auth, PostgreSQL, private Storage and TypeScript Edge Functions | Client dependencies are present; the managed application backend and auth workflows remain planned |
| Verification | TypeScript checks and Node test runner | Current type and launcher checks; broader feature verification follows the implementation plan |

Exact package versions are recorded in [package.json](package.json) and [package-lock.json](package-lock.json). Backend selection, service limits and deployment decisions are documented in [backend architecture](docs/architecture/backend-stack.md).

## Documentation and design

| Start here | What it contains |
| --- | --- |
| [Documentation index](docs/README.md) | Product, architecture, domain, quality and operations specifications |
| [Product brief](PRODUCT.md) | Audience, product outcomes and confirmed boundaries |
| [Implementation plan](plan.md) | All 151 feature phases, dependencies, PR scope, testing and QA |
| [Implementation tree and diagrams](implementation-plan-map.md) | Complete phase tree, authentication dependencies and delivery workflow |
| [UI design system](DESIGN.md) | Brand, colors, typography, layout, themes and visual rules |
| [UI component specifications](docs/design/component-visual-specs.md) | Exact buttons, borders, radii, dimensions, spacing and interaction states |
| [Design documentation and reference](docs/design/README.md) | Screen contracts, tokens, bilingual reference views and design QA |
| [Architecture overview](docs/architecture/overview.md) | Desktop, cloud, portal and trust-boundary responsibilities |
| [Requirements and decisions](docs/planning/coverage.md) | Requirement traceability, with open policies in the [decision register](docs/planning/decisions.md) |

The earlier [P00–P09 roadmap](docs/planning/roadmap.md) groups domain milestones. The **F001–F151 plan** defines the individual implementation phases and PRs.

## Repository structure

```text
SoloDesk/
├── app/
│   ├── main/                       Electron main process
│   └── renderer/                   React shell, components, styles and helpers
├── public/                         Brand assets and GitHub banner
├── tooling/                        Startup launcher and regression tests
├── docs/
│   ├── architecture/              System boundaries and technical specifications
│   ├── design/                    UI system, component specs and visual reference
│   ├── product/                   Requirements, workflows and localization
│   ├── specs/                     Detailed business-domain specifications
│   ├── planning/                  Milestones, decisions, risks and coverage
│   ├── quality/                   Acceptance and testing strategy
│   └── operations/                Release and support guidance
├── DESIGN.md                      UI design entry point
├── PRODUCT.md                     Product brief
├── plan.md                        Authoritative feature implementation plan
├── implementation-plan-map.md     Phase tree and diagrams
├── AGENT.md                       Development workflow and skill guide
└── AGENTS.md                      Repository agent entry point
```

This is a navigation guide to the current repository. The [proposed application structure](docs/architecture/project-structure.md) describes how future domain, persistence, backend and portal modules will be organized.

## Development workflow

**One feature phase → one branch → one GitHub PR → documentation, automated tests and agent QA → maintainer approval → merge.**

1. Select the next ready phase from [plan.md](plan.md) and confirm its prerequisites and decision gates.
2. Read the relevant domain/design specifications and [agent development guide](AGENT.md).
3. Build the bounded feature with its documentation, meaningful tests and applicable permission, offline, English/Arabic and accessibility behavior.
4. Include observed automated results and QA evidence in the same PR.
5. Obtain the project owner's final approval before merging.

Start with **F001 — Delivery governance and PR standards**. User authentication arrives in **F010**, followed by MFA/recovery in **F011**, before the core business workflows. The [plan map](implementation-plan-map.md) shows that dependency path visually.

Use [GitHub issues](https://github.com/m07amed25/SoloDesk/issues) for reproducible bugs and scoped proposals. Include the relevant phase, expected behavior, environment and useful reproduction details. Keep feature status tied to evidence; planned capabilities should never be presented as shipped functionality.
