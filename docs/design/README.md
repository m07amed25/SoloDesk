# SoloDesk UI design documentation

Version 1, 17 October 2026. Full design specification for the current product roadmap; **not implemented app features**. Confirmed direction: supplied SoloDesk logo, familiar productivity UI with Linear/Notion/GitHub as references, spacious controls, light/dark/System themes, English and Arabic RTL.

Start with [DESIGN.md](../../DESIGN.md), then open the [standalone visual reference](reference.html). The reference can be opened directly in a desktop browser or served locally; it needs no npm install, cloud connection or application build. It uses embedded tokens, inline CSS/JavaScript and the existing local logo. Keep its relative location in the repository so the logo resolves.

| Artifact | What it defines |
| --- | --- |
| [DESIGN.md](../../DESIGN.md) | Brand/logo, complete visual foundations, central paired colors, typography, spacious geometry, RTL, native chrome, depth, shapes and implementation guardrails |
| [Direction brief](brief.md) | User choices, working-screen composition, scope and reviewable proposals |
| [Token specification](tokens.json) | Exact light/dark semantic colors, typography/spacing/radius, geometry, motion, layers, breakpoints and 88 declared contrast checks |
| [Design tooling metadata](../../.impeccable/design.json) | Companion metadata for the design panel, motion/depth/layout extensions and isolated component specimens; not an applied runtime theme |
| [Components and interactions](components-and-interactions.md) | Actions, forms, navigation, data views, charts, overlays, timer/sync/finance/review composites, required states and accessibility |
| [Exact component visual specifications](component-visual-specs.md) | Button variants and states, border widths/styles/colors, every radius role, field/control geometry, icon spacing, tables, menus, dialogs, feedback and completion checklist |
| [Screen specifications](screens.md) | Navigation, nine layout templates, 73 surface families, fields/actions/state exceptions and consequential end-to-end flows |
| [Phase coverage](phase-coverage.md) | Every F001–F151 feature phase linked to UI contracts or marked nonvisual/release verification |
| [QA and handoff](quality-and-handoff.md) | Decisions/gates, locale/theme/OS/viewport matrix, worst-case fixtures and docs/testing/agent-QA/user-approval lifecycle |
| [Validation evidence](validation.md) | Actual design-artifact checks and explicitly untested implementation behavior |
| [Visual reference](reference.html) | Interactive design reference with theme/language/state switching, sample work, projects, clients, time, finance, reports, knowledge, controls and palette |
| [Reference sources](sources.md) | Official accessibility/font/framework and user-selected visual-quality references |
| [Optional generated concepts](exploration/README.md) | Earlier visual alternatives with exact prompt/provenance; no mockup is approved as a production UI or token source |

The reference lets you change theme, English/Arabic, online/offline/conflict examples and sample view. Task search/status/selection and explanatory dialogs are functional **reference interactions**. New task/Issue controls show the documented interaction contract; they never create records or issue invoices. All sample organizations, work, money and dates are illustrative. Recommended custom fonts are documented but not installed; the reference uses available system fallback fonts.

User decisions are authoritative. Domain specs remain authoritative for money, permissions and synchronization. Exact token values remain a reviewable design proposal; a generated image is not their source. Do not infer app implementation, legal compliance or production readiness from these documents. Each feature still ships through its own PR with docs, automated tests, agent QA and user final approval under [plan.md](../../plan.md).
