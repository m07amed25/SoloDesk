# UI design quality, decisions and implementation handoff

Status: design gates and verification plan. A checked design artifact is not a passed app test. Automated tests + agent QA are followed by the user's final PR approval, as agreed in [plan.md](../../plan.md).

## Decisions and authority

Confirmed on 17 October 2026: preserve the supplied SoloDesk logo; support light and dark themes with System as the default; use a spacious workspace with larger controls; deliver full design documentation and a separate visual reference without changing the running app. English/Arabic RTL, Electron/React/Tailwind/shadcn, cloud/offline, teams, online invoice issuance and no AI product features remain binding.

Visual direction and accent are selected through the local design reference. Font choices, exact geometry and color values are design recommendations unless explicitly approved. Nothing in this design changes financial calculations, legal rules, grants, synchronization authority or production service limits.

| Decision gate | Recommendation / required resolution | When it blocks |
| --- | --- | --- |
| Brand artwork quality | Preserve original PNGs; obtain a clean source/vector master and approved dark-background wordmark before installer/marketing production | Production icon/wordmark QA; reference may use supplied icon with clear wordmark text |
| Font redistribution | Self-host Latin/Arabic fonts only after recording exact source, license and version; validate Arabic shaping and PDF embedding | F005/F044 font delivery; static reference may use honest fallback |
| Minimum window / OS | Proposed full-product minimum 1024×768 CSS px, tested at 1280×800 and 1920×1080; final support matrix remains Q-11 | F005/F029/F145–F147; 200% zoom still reflows at smaller effective width |
| Native controls | Prefer actual OS controls and measured overlay insets; validate Windows, macOS, Linux X11/Wayland | Shell release; never replace working OS controls with decorative fake buttons |
| Arabic terminology | Seed copy requires fluent review with finance/project context | Each user-facing release, not only a final translation phase |
| Finance legal profiles | Countries, taxes, rounding/void/credit rules and signature evidence need approved domain profiles | Affected issue/signature actions; no visual design can authorize them |
| Offline duration | Bounded access lease and retention remain explicit product/security decisions | Offline lock/recovery copy and UI behavior |
| Portal identity/payment | Verify guest login/link policy and hosted payment provider; publish only exact approved versions | F131–F137 |
| Tray/global shortcuts | Verify per-OS support/permission and choose default close/timer policy | Native timer interactions; in-app alternatives always available |
| Commercial pricing | Do not invent SoloDesk subscription prices, trials or seat limits | F139; entitlement states can be designed without fabricated price claims |

Open gates use a readiness panel with named missing configuration and an eligible next step. Hide irrelevant technical detail from ordinary users. A technical reference ID belongs in an optional details section, never the main error headline.

## Theme, locale and window matrix

Every applicable feature is exercised in light/English, dark/English, light/Arabic RTL and dark/Arabic RTL. Verify System preference changes while an editor is open, preserving form state and selected workspace. No hard-coded white text/background bypasses the semantic roles. Dialogs, portals, native menu/tray copy and PDF preview are included in their relevant release matrix.

Desktop capture sizes: 1024×768, 1280×800, 1440×900 and 1920×1080 CSS pixels; at least 200% zoom at 1280×800, plus increased OS text scale. The proposed product minimum does not excuse zoom failure: collapse navigation/context and allow content-level scrolling at reduced effective widths. Portal adds 390×844 and 768×1024. A design reference may show only representative sizes; implementation needs the whole relevant matrix.

High-contrast/forced-colors, reduced motion, keyboard-only navigation and screen-reader tests supplement screenshots. Verify NVDA on Windows, VoiceOver on macOS and a supported Linux screen-reader/browser combination on actual packaged artifacts. Automation cannot certify these paths alone.

## Color verification

Use WCAG 2.2 AA as the renderer/portal target: ordinary text and placeholders 4.5:1; large text 3:1; meaningful controls/icons and focus indicators 3:1 against adjacent colors. Large text means at least 24 CSS px regular or approximately 18.7px bold. Disabled incidental content is exempt from the contrast criterion but should remain understandable. A decorative separator is not a substitute for a meaningful input boundary.

Compute contrast for every declared text/surface pairing in the design token file, including button hover/pressed, semantic badge pairs, secondary text on muted surfaces, link text, focus on backgrounds and numeric chart labels. Charts use distinguishable line style/marker plus legends and table alternatives; not every pair of series colors needs 3:1 against each other when meaning is redundantly encoded. Do not claim the whole palette is accessible from one successful primary-button check.

Record actual ratio, token names, mode, threshold, script/version and result in [validation](validation.md). When a theme changes, regenerate the report and update screenshots together. The JSON is a design artifact, not an imported runtime theme.

## Required state fixtures

| Family | Fixture | Expected visible result |
| --- | --- | --- |
| Data availability | Fresh workspace; filtered-empty; network failure; offline cache empty/incomplete | Distinct messages and next actions; no fake zero revenue or false empty result |
| Long content | 200-character legal name; 10-line task; long unbreakable email; Arabic with diacritics | Wrap/truncate intentionally, full value accessible, actions reachable |
| Numeric extremes | Zero, 0/2/3-decimal currencies, large exact amounts, negative corrections, 90 seconds at 120/hour | Explicit units/currency and faithful precision; no truncated or silently rounded financial input |
| Mixed direction | Arabic name + English code; invoice `SD-2026-0012`; URL/email; Arabic/Latin digits | Isolated identifiers and predictable caret/selection; unmirrored logo/code |
| Role changes | Contributor lacks costs; owner revokes grant while editor open | No hidden amounts/counts/exports; preserved authorized draft recovery; clear rejection |
| Local durability | Disk write failure, crash during edit/timer stop, staged upload restart | No false saved/stopped success; recoverable data and explicit retry |
| Cloud acknowledgment | Pending outbox, conflict, stale version, revoked lease, deleted target | Device/cloud status distinct; scoped conflict diff; unlock/rejoin route |
| Financial unknown outcome | Server commits invoice, response lost | “Checking issuance result”; same-operation receipt lookup; no second invoice |
| Document output | Three-page bilingual invoice, long lines, missing logo/font, print cancellation | Correct shaping/selectable text/page carryover/totals; retry does not change issued snapshot |
| Planning | Keyboard-only Kanban move, dependency cycle, leave/over-allocation | Full alternative to drag; cycle explanation; capacity basis visible |
| External action | Unknown send/payment/refund response; revoked portal version | Receipt reconciliation; no duplicate send/refund; stale version cannot accept |
| Platform | Overlay controls on all OSs; tray unavailable; browser callback canceled; update failure | Usable native controls and in-app alternatives; protected work and actionable recovery |

## Representative visual reference

The separate reference demonstrates the selected visual system, token palette, typography, controls, spacious tables, task/project context, timer/sync, and English/Arabic light/dark examples. All sample work/amounts are labeled illustrative. It is not connected to Supabase, does not create tasks/invoices, and contains no real client data. Prototype-only controls either perform an actual reference interaction or are clearly marked specimen controls. Do not present a mock submit as successful application mutation.

Generated concept images are visual direction aids. Their exact text, contrast and geometry are not implementation authority; the token/interaction specifications are. Record prompt and origin alongside images. Never use a whole mockup raster as the app UI. Supplied brand files remain unchanged; potential edge artifacts are reported rather than silently edited.

## Implementation handoff per feature PR

The [exact component catalogue](component-visual-specs.md) is required alongside behavioral acceptance: select the named button/control recipe and verify its stroke, radius, height, padding, icon gap and complete state matrix. A feature cannot be marked design-complete while those values are left to an arbitrary library default.

1. Select the feature F-ID and related UI-ID(s) from [phase coverage](phase-coverage.md). Read the domain spec and relevant components before building.
2. Record screen job, actor/action scope, data fields and validation, command/result states, locale/online rules, and the planned component reuse.
3. Use semantic tokens through Tailwind/shadcn wrappers. No isolated feature palette, custom titlebar imitation or inaccessible drag-only workflow.
4. Build the smallest complete user journey, including loading/empty/rejected/recovery and translated error paths, alongside persistence/authorization behavior.
5. Run meaningful unit/integration/permission/RTL/keyboard tests and actual screenshot/native QA where relevant; capture exact build/commit and sample data.
6. Update `docs/features/Fxxx.md` and `docs/qa/Fxxx.md`, domain/design changes and migration/runbook implications. Link screenshots and state evidence in the same PR.
7. Agent reports observed results and unresolved limitations; user gives final approval. Do not merge from a design reference, green screenshot or self-awarded completion label.

F005 establishes tokens/theme/typography/navigation/localization/accessibility contracts. Domain screens arrive in their own feature PRs. F044 validates PDFs; F143 resource budgets; F144 runs bilingual accessibility regression; F145–F148 verify native distribution/update UI. These later gates do not defer core correctness in earlier phases.

## Design evolution

Version the design system with a dated change note. Token changes update both mode values, contrast checks, dependent components and visual examples. Breaking component interaction changes name migration steps and affected feature PRs. Keep confirmed decisions distinct from proposals; do not rewrite the user's preference for a spacious workspace as a compact default. New feature proposals must extend the screen and phase maps rather than remain undocumented exceptions.

Primary standards to verify during implementation: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/), [CSS logical properties](https://www.w3.org/TR/css-logical-1/), and [Electron window customization](https://www.electronjs.org/docs/latest/tutorial/window-customization). References guide verification; this document does not claim current app conformance.
