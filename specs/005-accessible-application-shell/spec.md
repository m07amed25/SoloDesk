# Feature Specification: F005 — Accessible English/Arabic Application Shell

**Feature Branch**: `feat/f005-accessible-english-arabic-application-shell` (proposed by root plan; no branch created here)

**Created**: 2026-10-18

**Status**: Draft — requirements quality reviewed; no implementation authorized by this request

**Input**: User description: "Create a spec for F005 at plan.md"

**Feature / Milestone**: F005 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisites**: F004 Secure Electron lifecycle and preload bridge. The application shell runs within the secure single-instance lifecycle and typed bridge established by F004.

**Parent requirements**:

- **PLT-015**: Accessible global search/command palette, keyboard shortcuts, theme/high contrast, resizing, and English/Arabic RTL as foundation requirements; OS-reserved shortcuts cannot be hijacked.
- **NFR-006**: Equivalent English/Arabic workflows, full RTL, correct bidi isolation, and localized artifacts, errors, and numeric input.
- **NFR-007**: Full accessibility including keyboard navigation, focus management, screen-reader semantics, contrast, 200% zoom, reduced motion, and drag alternatives targeting WCAG 2.2 AA.
- **NFR-015**: Renderer implementation uses Tailwind CSS and shadcn/ui while remaining unprivileged with narrow typed bridge communication.

**Authority**: [F005 card](../../plan.md#f005), [UX and localization](../../docs/product/ux-and-localization.md), [platform and workspaces specification](../../docs/specs/platform-and-workspaces.md), [requirements](../../docs/product/requirements.md), [UI design system](../../DESIGN.md), [UI screens catalogue](../../docs/design/screens.md) (UI-001 Desktop shell), [components and interactions](../../docs/design/components-and-interactions.md), [quality and handoff](../../docs/design/quality-and-handoff.md), [constitution](../../.specify/memory/constitution.md) (Principles I, II, VI, VIII), [decisions](../../docs/planning/decisions.md) (D-02, D-03, D-07, D-10, D-16, D-17, Q-11), [acceptance](../../docs/quality/acceptance.md), and [test strategy](../../docs/quality/test-strategy.md).

F005 establishes the foundational desktop user interface shell for SoloDesk. It delivers full parity between English (left-to-right) and Arabic (right-to-left) presentations, an accessible global command palette and search interface, flexible theme switching (Light, Dark, and System modes) adhering to design system tokens, responsive resizing and 200% zoom reflow, complete keyboard navigation and screen-reader accessibility, and honest navigation placeholders for upcoming foundation and domain modules.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Full English and Arabic Parity with True RTL Layout (Priority: P1)

As a freelancer or team member using SoloDesk in either English or Arabic, I can interact with a desktop application shell that renders with complete language parity, natural typography, and native-feeling right-to-left or left-to-right alignment, where toggling languages immediately updates layout direction and text without corrupting mixed bidi data (such as emails, IDs, numbers, and codes) or altering user-entered legal content.

**Why this priority**: SoloDesk commits to day-one bilingual parity (Constitution VI, D-17, NFR-006). Arabic is not a cosmetic afterthought; layout direction, typography, and bidi isolation are foundational architecture for all subsequent screens.

**Independent Test**: Launch the application shell in English and in Arabic, switch dynamically between locales, input mixed alphanumeric and bidirectional strings, and verify that alignment, font rendering, reading order, and cursor behaviors adhere to locale standards without layout overflow or text clipping.

**Acceptance Scenarios**:

1. **A-01 — Root direction and typography switch**: **Given** the application shell is rendered in English (LTR) using the Inter typography stack, **When** the user toggles the UI locale to Arabic, **Then** the root document direction updates to `rtl`, text aligns to the inline start (right edge), UI controls and navigation mirror appropriately, and the typography switches to the approved Arabic font stack (Noto Sans Arabic) without clipping diacritics or ascending/descending glyphs.
2. **A-02 — Bidirectional text isolation**: **Given** an Arabic RTL shell display, **When** content containing Latin characters, email addresses, external URLs, invoice/task identifiers (e.g. `INV-2026-001`), or technical terms appears in paragraphs, breadcrumbs, or list items, **Then** the embedded left-to-right text preserves correct internal character order and punctuation placement without visual distortion or wrapping anomalies.
3. **A-03 — User data immutability during locale switch**: **Given** user-entered text (e.g. legal entity names, client identifiers, or monetary quantities), **When** the interface language is switched between English and Arabic, **Then** the user-entered values remain identical and unaltered; only application-level chrome, labels, validation messages, and system placeholders are translated.
4. **A-04 — Locale preference persistence**: **Given** a user selects a preferred UI language, **When** the application is closed, restarted, or reloaded across sessions, **Then** the selected personal locale preference is restored immediately at startup without an unstyled or wrong-direction flash.
5. **A-05 — OS control preservation in RTL**: **Given** the desktop application running on Windows, macOS, or Linux, **When** the shell switches to Arabic RTL mode, **Then** operating-system-owned window controls (minimize, maximize, close buttons) retain their platform-standard physical placement (e.g., top-left on macOS, top-right on Windows/Linux) and are not flipped by application layout rules.

---

### User Story 2 - Complete Keyboard Navigation, Visible Focus, and Assistive Semantics (Priority: P1)

As a keyboard-only user or someone utilizing a screen reader, I can navigate through all interactive regions of the desktop shell, trigger actions, expand and collapse navigation, and receive predictable focus transitions, with clear high-contrast focus rings and semantic announcements meeting WCAG 2.2 AA standards.

**Why this priority**: Accessibility is mandatory from the first release (Constitution VI, NFR-007). Power users and users with disabilities rely on predictable keyboard and assistive technology support across the core application chrome.

**Independent Test**: Navigate through every interactive element in the shell using only `Tab`, `Shift+Tab`, `Arrow` keys, `Enter`, `Space`, and `Escape`, verifying visible unobscured focus rings, logical tab order in both LTR and RTL directions, and correct ARIA landmark, role, and state announcements via screen readers.

**Acceptance Scenarios**:

6. **A-06 — Logical tab order in both reading directions**: **Given** any view rendered in the shell, **When** navigating with `Tab` or `Shift+Tab`, **Then** focus moves in visual reading order (top-to-bottom, left-to-right in LTR; top-to-bottom, right-to-left in RTL) through all interactive controls without skipping elements or trapping focus.
7. **A-07 — Visible, unobscured focus indicators**: **Given** any focused interactive control (buttons, links, inputs, palette items), **When** keyboard focus is received, **Then** a high-contrast focus ring (minimum 2px solid with ≥ 3:1 contrast against adjacent background) appears clearly, unobscured by sticky headers, sidebars, or adjacent panels.
8. **A-08 — Semantic landmarks and ARIA roles**: **Given** assistive technology (screen reader), **When** the user explores the shell structure, **Then** standard landmarks (`header`, `nav`, `main`, `complementary`) are announced, the active navigation destination exposes `aria-current="page"`, and icon-only buttons provide unambiguous accessible names (`aria-label`) describing their purpose.
9. **A-09 — Reduced motion compliance**: **Given** the operating system or user preference has `prefers-reduced-motion` enabled, **When** the user collapses/expands the sidebar, opens dialogs, or switches views, **Then** animations and transitions are suppressed or replaced with instant state changes, avoiding motion-induced disorientation.
10. **A-10 — Skip to main content link**: **Given** keyboard focus at the start of the document, **When** the user presses `Tab`, **Then** a visible "Skip to main content" mechanism appears, which moves keyboard focus directly to the primary content landmark when activated.

---

### User Story 3 - Accessible Global Search and Command Palette (PLT-015) (Priority: P1)

As a user managing daily tasks and projects, I can invoke an accessible command palette using a standard keyboard shortcut (`Mod+K` / `Ctrl+K` / `Cmd+K`) or a visible trigger button, search across available navigation routes and application actions in English or Arabic, navigate results with arrow keys, and trigger navigation or commands without mouse interaction.

**Why this priority**: PLT-015 designates global search and the command palette as an essential foundation capability. It provides efficient keyboard-first navigation and satisfies multi-modal accessibility requirements.

**Independent Test**: Invoke the command palette via shortcut and visible button, perform queries in English and Arabic, verify keyboard arrow navigation and active descendant semantics, trigger a route transition, and confirm that dismissing the palette restores focus to the triggering element.

**Acceptance Scenarios**:

11. **A-11 — Palette activation and focus trap**: **Given** the application shell in any state, **When** the user presses `Mod+K` (or clicks the global search trigger), **Then** the Command Palette opens as a modal dialog, keyboard focus moves immediately to the search input, background content is inert (`aria-hidden="true"`), and focus is constrained within the palette.
12. **A-12 — Bi-lingual query filtering**: **Given** an open Command Palette, **When** the user types search terms in English or Arabic, **Then** matching navigation destinations and shell commands are filtered in real-time (< 50ms) with matching text highlighted, grouped into logical categories (Navigation, Actions, Preferences).
13. **A-13 — Keyboard list navigation**: **Given** filtered search results in the Command Palette, **When** the user presses `ArrowDown` or `ArrowUp`, **Then** active selection moves through the list with proper `aria-activedescendant` association, and pressing `Enter` executes the selected item and closes the palette.
14. **A-14 — Dismissal and focus restoration**: **Given** an open Command Palette, **When** the user presses `Escape` or clicks outside the modal boundary, **Then** the palette closes immediately and keyboard focus returns precisely to the control that had focus before the palette opened.
15. **A-15 — OS-reserved shortcut protection**: **Given** standard desktop operating system shortcuts (e.g. `Alt+F4`, `Cmd+Q`, `Ctrl+Alt+Del`, `Win+L`, `Alt+Tab`), **When** keys are pressed inside the application shell, **Then** the shell never intercepts or hijacks OS-reserved shortcuts.

---

### User Story 4 - Theme Modes, Design Tokens, and 200% Zoom Reflow (Priority: P1)

As a user working across varying lighting conditions and display hardware, I can select between Light, Dark, and System theme modes with full design token consistency, and resize the application window from supported minimum dimensions up to high-resolution displays or 200% zoom scaling without broken layouts, horizontal scrollbars on primary views, or truncated content.

**Why this priority**: The user confirmed spacious controls, familiar productivity aesthetic, and light/dark/system themes (DESIGN.md, NFR-007). Readability across display scaling is a key WCAG 2.2 AA requirement.

**Independent Test**: Switch themes across Light, Dark, and System modes, measure color contrast across text and interactive surfaces, resize the window from minimum test dimensions (1024×768) to high resolution (1920×1080), and apply 200% zoom scaling to verify fluid layout reflow.

**Acceptance Scenarios**:

16. **A-16 — Theme mode switching**: **Given** the shell in any view, **When** the user switches between Light, Dark, or System mode in settings or the command palette, **Then** all surfaces, borders, text, icons, and interactive elements update instantly using the paired token values from `DESIGN.md` without layout shifts or unstyled flickers.
17. **A-17 — High-contrast and WCAG 2.2 AA contrast compliance**: **Given** both Light and Dark themes, **When** text, icons, and control borders are evaluated against their respective backgrounds, **Then** body text maintains a contrast ratio of at least 4.5:1, large headings maintain at least 3:1, and interactive control boundaries and focus indicators maintain at least 3:1.
18. **A-18 — Window resizing and minimum dimensions**: **Given** the application running on any supported desktop platform, **When** the window is resized down to the approved product minimum dimensions (1024×768 CSS pixels) or up to large displays (1920×1080 and beyond), **Then** the sidebar, header, and content areas maintain proportional spacing without overlapping or unreadable compression.
19. **A-19 — 200% text and display zoom reflow**: **Given** the display scaled to 200% zoom or large text accessibility settings enabled, **When** viewing the shell, **Then** text wraps naturally without horizontal clipping, controls remain operable with minimum 44×44px hit targets, and the shell layout adapts gracefully (collapsing secondary sidebars or stacks where appropriate).

---

### User Story 5 - Honest Navigation and Module Placeholders (Priority: P2)

As a user exploring the SoloDesk application shell, I can navigate between primary application sections (Dashboard, Clients, Projects, Tasks, Time, Invoices, Reports, Settings) using the primary sidebar, understand my current location through breadcrumbs and active state cues, and view truthful placeholders for foundation capabilities (Timer, Sync status, Workspace selection, Notifications) that never invent fictional financial or activity data.

**Why this priority**: The shell must provide the structural scaffolding for all future milestones (P01–P09) without deceiving the user about the current state of implementation or backend connectivity (Constitution I, III, IV, VIII).

**Independent Test**: Click through all sidebar navigation routes and header triggers, verify that route transitions update URL/view states and breadcrumbs, and inspect all placeholder modules to confirm they display honest "unimplemented / pending foundation" indicators without mock earnings or simulated transactions.

**Acceptance Scenarios**:

20. **A-20 — Primary sidebar navigation**: **Given** the application shell sidebar, **When** a user clicks or keyboard-activates a navigation destination (e.g. Dashboard, Projects, Tasks, Invoices, Settings), **Then** the active route indicator updates visibly, the main landmark renders the corresponding screen container, and the browser/window title reflects the active view.
21. **A-21 — Collapsible sidebar mode**: **Given** the expanded sidebar, **When** the user triggers the sidebar collapse toggle, **Then** the sidebar animates (respecting reduced motion) into an icon-only rail, tooltips display navigation labels on hover and keyboard focus, and the main content expands to utilize the freed space.
22. **A-22 — Honest foundation placeholders**: **Given** header utility triggers for Workspaces, Timer, Sync status, and Notification center, **When** activated, **Then** each displays an honest, bounded placeholder dialog or popover explaining that the capability is planned for its respective phase (e.g., F012 for Workspaces, F017 for Sync, F036 for Timer), displaying zero simulated revenue, fake client records, or artificial sync checkmarks.
23. **A-23 — Breadcrumb hierarchy**: **Given** navigation to any sub-view or section within the shell, **When** viewing the header area, **Then** an accessible breadcrumb trail shows the current location hierarchy, allowing one-click or keyboard navigation back to parent views.

---

### User Story 6 - Cross-Platform Consistency and Fluent Bilingual Review (Priority: P2)

As an engineering reviewer and quality auditor, I can verify reproducible automated test suites and structured agent QA records across Windows, macOS, and Linux, with verified font licensing and an explicit fluent Arabic review confirming grammatical accuracy, natural phrasing, and proper typographic presentation before feature completion.

**Why this priority**: Constitution VIII mandates evidence before completion. A single platform or automated check alone cannot validate Arabic typography, RTL interaction, or native desktop packaging.

**Independent Test**: Execute automated accessibility and RTL test suites, run agent interaction QA on candidate builds, verify font redistribution licenses, and conduct an explicit fluent Arabic review of all user-facing strings and layouts.

**Acceptance Scenarios**:

24. **A-24 — Native desktop consistency**: **Given** candidate builds for Windows, macOS, and Linux, **When** the application shell is evaluated on each platform, **Then** window chrome, typography rendering, keyboard shortcut mappings (`Cmd` on macOS vs `Ctrl` on Windows/Linux), and dialog positioning function consistently without platform-specific regressions.
25. **A-25 — Fluent Arabic linguistic review**: **Given** all user-facing copy, labels, tooltips, validation messages, and empty states in Arabic, **When** audited by a fluent Arabic reviewer, **Then** all terminology aligns with natural business Arabic, uses correct gender/plural forms, avoids mechanical word-by-word translations, and presents proper typographic rhythm.
26. **A-26 — Delivery evidence record**: **Given** all automated checks and agent QA completed, **When** reporting feature readiness, **Then** all 26 acceptance scenarios and 24 functional requirements have linked observed test outcomes, screenshot artifacts, and documented defect logs, separating automated CI evidence from the user's final merge approval.

---

### Edge Cases

- **Rapid locale switching**: Quickly toggling between English and Arabic while typing in an input field or while a modal dialog is opening must not crash the renderer, deadlock CSS transitions, or leave orphaned styles.
- **Arabic diacritics and combining marks**: Text containing Harakat (tashkeel), Maddah, or Hamza must render with sufficient line-height (`1.571` to `1.625`) without vertical clipping or horizontal truncation.
- **Extremely long identifiers and names**: Multi-line workspace titles, client names spanning > 80 characters, or lengthy composite invoice numbers must wrap gracefully or truncate with accessible tooltips, never overflowing container bounds or obscuring adjacent navigation buttons.
- **Mixed-direction clipboard paste**: Pasting an Arabic string containing English URLs or code snippets into a search input in either locale must maintain cursor position and natural text editing flow without jumping.
- **Windows High Contrast Mode (Forced Colors)**: Under OS-forced high contrast settings, focus outlines, button boundaries, and text labels must remain clearly distinguishable using system color keywords rather than transparent borders.
- **Dynamic OS theme transition**: When the operating system shifts from Light to Dark mode automatically (e.g. at sunset), the shell in "System" mode must adapt immediately without requiring an application restart.
- **Focus restoration after dialog dismissal**: If the Command Palette or a placeholder popover was opened via a keyboard shortcut rather than a focused button, dismissing the dialog must restore focus to the last active container rather than resetting to `document.body`.
- **Sub-minimum window resizing**: If an operating system allows resizing below the product minimum (1024×768), horizontal and vertical scrollbars must become active on the main content area to prevent controls from becoming completely unreachable.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application shell MUST provide full language parity in both English and Arabic from day one, covering all chrome labels, navigation items, tooltips, placeholders, and error messages. (A-01, A-25)
- **FR-002**: The shell MUST dynamically set the document root direction (`dir="rtl"` for Arabic, `dir="ltr"` for English) and use CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline-start/end`) for all layout and alignment. (A-01)
- **FR-003**: All bidirectional text (emails, URLs, invoice IDs, numbers, file paths) in RTL views MUST be wrapped in bidirectional isolation (`<bdi>` or unicode bidi controls) to prevent character and punctuation inversion. (A-02)
- **FR-004**: Locale switching MUST NOT alter, translate, or mutate user-entered proper names, document snapshots, or stored numerical amounts. (A-03)
- **FR-005**: The application shell MUST utilize the approved typography tokens: Inter for Latin text and Noto Sans Arabic for Arabic text, ensuring valid redistribution licensing and no glyph clipping. (A-01, A-25)
- **FR-006**: The shell MUST support Light, Dark, and System (OS-following) theme modes, persisting the user's selection locally and applying paired tokens from `DESIGN.md`. (A-16)
- **FR-007**: All text and user interface components across Light and Dark themes MUST satisfy WCAG 2.2 AA contrast standards (minimum 4.5:1 for body text, 3:1 for headings, control borders, and focus rings). (A-17)
- **FR-008**: Color styling MUST consume semantic CSS variables and design tokens; hardcoded raw hex colors in feature components are strictly prohibited. (A-16, A-17)
- **FR-009**: The shell MUST implement the `UI-001 Desktop shell` layout structure, consisting of a persistent sidebar, top application header with utility controls, breadcrumb path, and primary content landmark. (A-20, A-23)
- **FR-010**: The sidebar MUST support both expanded (icon + label) and collapsed (icon-only with accessible tooltips) modes, persisting user preference. (A-21)
- **FR-011**: Active navigation destinations MUST be indicated both visually (tint and font weight) and semantically via `aria-current="page"`. (A-08, A-20)
- **FR-012**: Utility triggers for future foundation capabilities (Workspace switcher, Timer, Sync status, Notifications) MUST display truthful, bounded placeholder states that explain phase availability and present zero synthetic revenue or mock data. (A-22)
- **FR-013**: The shell MUST provide an accessible Command Palette modal dialog invokable via `Mod+K` (`Cmd+K` on macOS, `Ctrl+K` on Windows/Linux) or a visible search trigger in the header. (A-11)
- **FR-014**: The Command Palette MUST support real-time text filtering across navigation destinations and shell commands in both English and Arabic. (A-12)
- **FR-015**: The Command Palette MUST support full keyboard navigation using `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`, implementing `aria-activedescendant` semantics and restoring focus to the trigger upon exit. (A-13, A-14)
- **FR-016**: The application shell MUST NOT intercept or hijack operating-system-reserved keyboard shortcuts. (A-15)
- **FR-017**: 100% of interactive controls within the application shell MUST be reachable and operable using standard keyboard keys alone. (A-06)
- **FR-018**: Keyboard focus indicators MUST be clearly visible, unobscured by sticky chrome, and meet WCAG 2.2 focus appearance criteria (minimum 2px solid line with ≥ 3:1 contrast against adjacent colors). (A-07)
- **FR-019**: The shell MUST use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<aside>`) and provide accessible names for all icon-only buttons via `aria-label` or accessible screen-reader text. (A-08)
- **FR-020**: When `prefers-reduced-motion` is active, the shell MUST eliminate or minimize decorative transitions and animations, providing instantaneous state changes. (A-09)
- **FR-021**: The shell MUST provide a visible "Skip to main content" link that receives focus as the first tab stop and jumps keyboard focus directly to the `<main>` container. (A-10)
- **FR-022**: The shell layout MUST reflow without horizontal scrolling or text clipping at 200% zoom scaling across supported viewports from 1024×768 to 1920×1080 CSS pixels. (A-18, A-19)
- **FR-023**: The renderer process MUST remain unprivileged, communicating with Electron main exclusively through the narrow, typed preload bridge established in F004. (A-15, A-24)
- **FR-024**: Feature delivery evidence MUST document automated test results, cross-platform agent QA on Windows, macOS, and Linux, and an explicit fluent Arabic review before user final approval. (A-24, A-25, A-26)

---

### Key Entities

- **Shell Locale State**: The active personal language configuration (`en` or `ar`), associated text direction (`ltr` or `rtl`), typography stack, and localized message dictionary.
- **Shell Theme State**: The active display mode (`light`, `dark`, or `system`), active system contrast override, and corresponding token values.
- **Navigation Route Item**: A registered top-level destination, containing unique route ID, translated label key, icon identifier, permission scope, enabled/placeholder status, and destination view component.
- **Command Palette Action**: An invokable action or route shortcut in the global palette, containing unique action ID, category (Navigation, Commands, Preferences), translated title, search keywords, shortcut badge, and execution handler.
- **Placeholder State**: Honest status metadata for unbuilt modules (Workspaces, Timer, Sync, Notifications), detailing feature name, target delivery phase, explanation text, and link to project roadmap.
- **User Preference Record**: Persistent desktop-side configuration storing personal UI preferences (selected locale, theme mode, sidebar collapse state) without mutating workspace settings.

---

### Scope, Dependencies and Decision Boundaries

**Included in F005 delivery**:

- Application shell layout (sidebar, header, breadcrumbs, main view container) matching `UI-001 Desktop shell`.
- Translation infrastructure and complete English and Arabic dictionaries for all shell chrome and placeholders.
- Bidirectional layout engine using Tailwind CSS and CSS logical properties with bidi text isolation.
- Theme management (Light, Dark, System modes) adhering strictly to `DESIGN.md` tokens.
- Accessible Command Palette modal with keyboard shortcut registration, search filtering, and arrow navigation.
- 100% keyboard accessibility, visible focus indicators, skip-link, and WCAG 2.2 AA screen-reader semantics.
- Honest placeholders for Workspaces, Timer, Sync status, and Notifications.
- Responsive reflow supporting 1024×768 to 1920×1080 viewports and 200% zoom scaling.
- Cross-platform verification on Windows, macOS, and Linux with fluent Arabic review.

**Excluded from this specification request**:

- Code implementation, npm dependency installations, Git branch creation, GitHub pull requests, or CI pipeline execution.
- Technical implementation plan (`plan.md`) and task breakdown (`tasks.md`), which belong to subsequent Spec Kit phases (`$speckit-plan`, `$speckit-tasks`).

**Excluded from F005 delivery**:

- Cloud sign-in and device enrollment UI (F010).
- MFA and account recovery workflows (F011).
- Multi-workspace management and switching mechanics (F012).
- Encrypted SQLite persistence and storage migrations (F006, F007).
- Active timer capture, idle detection, or tray tracking (F036, F037).
- Offline outbox and background synchronization engine (F017–F020).
- Business domain screens and records (Clients F031, Projects F032, Tasks F033, Invoices F041).
- AI or machine-learning integrations (strictly excluded under D-16).

**Authority and offline behavior**:
The shell is purely client-side desktop presentation. It operates entirely offline without requiring server authentication or network access. Placeholders honestly disclose that cloud and offline sync capabilities depend on subsequent phases.

**Open decisions**:

- **Q-11 (Platform Matrix & Minimum Window)**: The full-product minimum window size is set to a reviewable target of 1024×768 CSS pixels (with 640×520 remaining the development bootstrap minimum). Exact final native OS/CPU support remains bounded by Q-11.
- **Visual Direction**: The visual direction proposal in `DESIGN.md` (spacious controls, Linear/Notion/GitHub productivity feel, blue `#285BCB` primary, graphite/silver palette) is ratified as the foundation for F005.

**Recovery and compatibility**:
F005 introduces no database schema or backend protocols. User preferences (locale, theme, sidebar state) are stored in client-side settings. Corrupt or unreadable preference files fail closed to safe defaults (`en`, `system`, expanded sidebar) without crashing the application.

**Delivery evidence**:
A future F005 PR will deliver `docs/features/F005.md` and `docs/qa/F005.md`. Evidence must document automated accessibility suites, RTL bidi visual checks, keyboard navigation runs, native multi-OS screenshots, and an explicit fluent Arabic review sign-off. Final merge requires owner approval.

---

### Acceptance and Constitution Traceability

| Requirements                               | Acceptance Scenarios  | Constitution Principles & Safeguards                                                                                                                                      |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-001–FR-005** (Localization & RTL)     | A-01–A-05, A-25       | **Principle VI (English, Arabic & Accessibility)**: Full bilingual parity, RTL root direction, bidi text isolation, Noto Sans Arabic typography, and fluent human review. |
| **FR-006–FR-008** (Themes & Tokens)        | A-16, A-17            | **Principle II (Desktop Platform)** & `DESIGN.md`: Strict token consumption from paired Light/Dark system; WCAG 2.2 AA contrast compliance.                               |
| **FR-009–FR-012** (Layout & Navigation)    | A-08, A-20–A-23       | **Principle I (Traceable Scope)** & **Principle III/IV (Honest Evidence)**: Truthful module placeholders; zero simulated revenue or fake sync indicators.                 |
| **FR-013–FR-016** (Command Palette)        | A-11–A-15             | **PLT-015** & **Principle II**: Global search and keyboard palette; preservation of operating-system reserved shortcuts.                                                  |
| **FR-017–FR-022** (Accessibility & Reflow) | A-06–A-10, A-18, A-19 | **Principle VI**: 100% keyboard access, visible focus rings, ARIA landmark semantics, reduced-motion honor, and 200% zoom reflow.                                         |
| **FR-023–FR-024** (Trust & Quality)        | A-24, A-26            | **Principle II (Narrow Bridge)** & **Principle VIII (Evidence Before Completion)**: Unprivileged renderer, native OS verification, and owner merge gate.                  |

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

_These criteria represent the target metrics that the implemented feature must satisfy._

- **SC-001**: 100% of application chrome labels, navigation routes, tooltips, placeholders, and error messages are translated with 0 missing keys in both English and Arabic.
- **SC-002**: In 100% of tested bidirectional fixtures (containing Arabic text mixed with Latin alphanumeric IDs, URLs, emails, and currency codes), text reads in correct visual order with zero punctuation inversion.
- **SC-003**: 100% of interactive controls in the shell are operable via keyboard alone, exhibiting visible focus indicators with at least 3:1 contrast against adjacent backgrounds.
- **SC-004**: The Command Palette opens within 100 milliseconds of pressing `Mod+K` and filters up to 100 registered routes and actions within 50 milliseconds per keystroke on standard test hardware.
- **SC-005**: The shell layout reflows cleanly without horizontal page scrollbars or clipped text when tested at 200% zoom scaling on viewports down to 1024×768 CSS pixels.
- **SC-006**: 100% of color combinations across both Light and Dark themes pass WCAG 2.2 AA automated contrast checks (≥ 4.5:1 for body text, ≥ 3:1 for headings and controls).
- **SC-007**: When `prefers-reduced-motion` is enabled, 100% of animated CSS transitions in the shell are suppressed or reduced to instantaneous cuts (< 10ms).
- **SC-008**: 0 instances of simulated revenue, fake client data, or fabricated sync indicators appear in placeholder modules across the entire shell.
- **SC-009**: Candidate builds pass automated verification and agent QA across Windows, macOS, and Linux, supplemented by a signed-off fluent Arabic linguistic audit prior to owner merge approval.

---

## Assumptions

- **Scope boundary**: "Create a spec for F005 at plan.md" authorizes creating the feature specification and quality checklist under `specs/005-accessible-application-shell/`. It does not authorize software implementation, package installations, or Git commits.
- **Directory convention**: In accordance with `.specify/init-options.json` (`"feature_numbering": "sequential"`), `005-accessible-application-shell` is the sequential directory following `004-secure-electron-lifecycle`.
- **F004 foundation**: F004 provides the single-instance application lifecycle and narrow preload bridge. F005 operates inside the renderer window created by F004 and accesses desktop actions only through that typed bridge.
- **Visual design system**: The visual tokens, spacing scales, and component guidelines in `DESIGN.md` are approved as the aesthetic baseline for F005.
- **Window sizing baseline**: 1024×768 CSS pixels represents the full-product minimum window size for testing and layout reflow, while the existing 640×520 size remains a temporary development bootstrap baseline.
- **Local dictionary approach**: Bilingual localization is achieved using typed in-bundle translation dictionaries (JSON/TS) with zero external network or runtime machine-translation dependencies.
- **Inapplicable domain features**: Authentic cloud authentication (F010), multi-tenant switching (F012), offline synchronization (F017), and business entities (Clients, Tasks, Invoices) are not yet implemented; the shell provides honest placeholders and structural routing to support them without fabricating data.
- **Checklist validation**: Passing the specification quality checklist validates requirements completeness and clarity, serving as the gateway to subsequent technical planning (`speckit-plan`).
