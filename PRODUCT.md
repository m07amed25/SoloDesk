# SoloDesk — Product Brief

<!-- impeccable:product-schema 1 -->

Updated 17 October 2026. This is the product specification, not a claim of implemented capability. Current implementation is a minimal Electron welcome shell. **Current authorization: documentation only.**

## Platform

web

Desktop application using Electron and web rendering on Windows, macOS, and Linux. A later client portal is a distinct browser surface. Native mobile applications are outside the present roadmap.

## Users and operating model

Confirmed audience: independent freelance software engineers **and small teams from the first release**. Every user requires a cloud account. A workspace is the tenant and collaboration boundary; a solo freelancer is a one-member workspace. Users may belong to multiple workspaces. Initial enrollment requires connectivity; an enrolled device supports offline work within a documented authorization policy.

Confirmed hosting direction: managed cloud first. Confirmed protection: encryption in transit and at rest, encrypted device storage, and controlled server access. End-to-end encryption is not the selected model. Invoice drafts work offline; **final invoice issuance requires online server authority**.

## Purpose and outcomes

Connect client acquisition, scope agreements, delivery, time, billing, collections, and business review. Users should understand what to work on, who owns it, what was agreed, whether work is profitable, what can be billed, what is owed, and whether local changes have synchronized.

Success measures are proposed: complete client-to-payment workflows with no duplicate billing; recover work after crashes and disconnection; enforce workspace/project permissions; and provide equivalent English and Arabic experiences including full RTL. Baseline metrics and commercial targets must be established during P00 rather than invented here.

## Product scope

| Area | Intended capabilities |
| --- | --- |
| Workspace | Accounts, invitations, roles, project grants, multiple workspaces, device enrollment, offline access, synchronization, conflict review |
| Client lifecycle | Clients/contacts, CRM pipeline, activities, catalog, estimates, versioned proposals, agreements, onboarding, renewals |
| Delivery | Projects, tasks/subtasks, dependencies, milestones, boards/lists/calendar/timeline, capacity, templates, change requests, deliverables, comments, approvals |
| Time | Persistent timers, manual entries, recovery, idle review, timesheets, approvals, rate history, allocation protection, utilization |
| Finance | Configurable currencies, taxes, discounts, invoice series, partial payments, credits/refunds, expenses, reimbursements, retainers, recurring billing, reconciliation |
| Business visibility | Permission-aware dashboards, profitability, aging, cash forecasts, reporting, knowledge, global search, saved views |
| Connected operations | Explicitly enabled integrations, scheduled rules, notification center, client portal, provider reconciliation |
| Reliability | Encrypted cache/backups, import/export, migrations, restore drills, audit, accessibility, signed updates, observability, support |

Financial capabilities are configurable; enabling a profile does not establish legal compliance. Country packs, invoice mandates, seller tax registrations, payment providers, accounting exports, and retention laws require a selected market and validation before release there.

**No AI features for now**, as confirmed by the user. Do not add model providers, embeddings, automated AI agents, AI budgets, or AI data sharing to this roadmap. Conventional deterministic automation remains in scope.

## Stack

Required and installed desktop foundation: Electron, React, TypeScript, Vite, Electron Forge, Tailwind CSS, and shadcn/ui. Exact current versions live in package.json/package-lock.json. The installed better-sqlite3 adapter is not an encryption solution.

Recommended new backend: Supabase Auth/PostgreSQL/private Storage, with TypeScript Edge Functions, restricted transactional database functions, and short scheduled job batches. Start with the free development/pilot profile; add paid capacity or a dedicated worker only when measured limits and operational needs justify it. Region, plan, spend and service limits require a deployment decision. Local persistence needs an encrypted SQLite-compatible adapter validated on all target OSs. These are documentation recommendations; no packages or services have been installed for them. See [backend selection](docs/architecture/backend-stack.md).

## Delivery boundaries

[Ten phases P00–P09](docs/planning/roadmap.md) describe the complete roadmap. First usable release includes cloud/team/security foundations and a coherent clients → delivery → time → invoice/payment path. Advanced slices follow explicit dependencies. Client portal and third-party connectors need their own release gates. Security, translations, offline behavior, and testing apply throughout.

No implementation, deployment, paid service signup, legal template approval, or external communication is authorized by this documentation request. Only the previously authorized shell exists today. Design details are proposed unless listed as confirmed in the [decision register](docs/planning/decisions.md).
