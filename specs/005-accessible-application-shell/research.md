# Technical Research & Architecture Decisions: F005 — Accessible English/Arabic Application Shell

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Milestone**: P01 — Secure desktop, identity, teams and offline cloud foundation  
**Date**: 2026-10-18  
**Status**: Complete — All technical unknowns and architecture choices resolved

---

## 1. Overview & Research Scope

F005 establishes the foundational desktop application shell for SoloDesk, adhering to [spec.md](./spec.md), [DESIGN.md](../../DESIGN.md), [tokens.json](../../docs/design/tokens.json), [screens.md](../../docs/design/screens.md) (UI-001 Desktop shell), and the [SoloDesk Constitution](../../.specify/memory/constitution.md) (Principles I, II, VI, VIII).

This document consolidates findings, architecture patterns, and technical decisions across seven critical domains:

1. **Command Palette Architecture**: Accessible modal dialog, keyboard-first navigation, activedescendant semantics, and search indexing.
2. **Bidirectional Layout & Bidi Isolation**: Dynamic root direction (`dir="rtl"` vs `dir="ltr"`), logical CSS properties, Arabic typography (Noto Sans Arabic), and `<bdi>` character isolation.
3. **Design Tokens & Theme Management**: Semantic CSS variable mappings from `DESIGN.md` / `tokens.json`, OS dark-mode synchronization, and WCAG 2.2 AA contrast compliance.
4. **Desktop Titlebar & OS Window Controls**: Platform-native physical button placement in RTL (macOS top-left vs Windows/Linux top-right) and OS-reserved shortcut protection.
5. **Localization Infrastructure**: Zero-dependency in-bundle typed message dictionaries with parameter interpolation, pluralization, and zero network leakage.
6. **Shell Layout & Honest Placeholders**: Collapsible navigation rail, breadcrumb hierarchy, skip-to-content mechanism, and truthful module state disclosures without mock data.
7. **Verification & Accessibility Audit**: Multi-platform automated tests, axe-core / Playwright accessibility assertions, and fluent Arabic review protocol.

---

## 2. Research Findings & Technical Decisions

### Research 1: Accessible Command Palette Architecture (PLT-015, A-11–A-15, FR-013–FR-015)

- **Context**: The command palette must be invokable via `Mod+K` (`Cmd+K` on macOS, `Ctrl+K` on Windows/Linux) or a visible header button, filter up to 100 navigation routes and shell actions in < 50ms, trap focus while open, restore focus precisely to the triggering element on dismiss (`Escape` or backdrop click), and support arrow navigation with `aria-activedescendant`.
- **Decision**: Implement the Command Palette using a composable dialog wrapper built on `@base-ui/react` (v1.9.0) dialog primitives with a custom combobox listbox manager.
  - Combobox pattern: An input element with `role="combobox"`, `aria-autocomplete="list"`, `aria-controls="command-palette-results"`, and dynamic `aria-activedescendant="item-{id}"`.
  - Item list: `<ul id="command-palette-results" role="listbox">` with selectable items `<li role="option" aria-selected={isActive}>`.
  - Focus restoration: Cache `document.activeElement` upon invocation; restore focus on unmount or close event. If opened via global hotkey where active element was null/body, focus gracefully falls back to the shell skip-link or active route button.
  - In-memory indexing: Normalization of search queries and action titles (case-folding, diacritic stripping, Arabic normalization e.g. mapping `أ`/`إ`/`آ` to `ا` and `ة` to `ه`) to ensure instant sub-millisecond filtering across bilingual strings.
- **Rationale**:
  - `@base-ui/react` is already present in `package.json` (v1.9.0), is headless and unstyled, fully supports React 19, provides robust portal and inert backdrop trapping (`aria-hidden="true"` on root siblings), and complies with shadcn/ui headless standards.
  - Custom combobox state management avoids heavy third-party command menu packages that bundle unvetted styling or conflict with React 19 / Vite 8.
- **Alternatives Considered**:
  - `cmdk` (pacocoursey/cmdk): Evaluated, but current releases have peer-dependency warnings with React 19 and add an unnecessary external runtime dependency.
  - Native HTML `<dialog>`: Evaluated, but polyfills and focus restoration quirks across Electron Linux/Windows platforms make controlled headless primitives more predictable for keyboard trap and screen-reader announcements.

---

### Research 2: Bidirectional Layout, Font Stacks & Bidi Isolation Architecture (NFR-006, A-01–A-05, FR-001–FR-005)

- **Context**: SoloDesk requires 100% bilingual parity from day one. When switching between English and Arabic, the layout must flip smoothly using CSS logical properties. Arabic typography requires Noto Sans Arabic, with adequate line-height (`1.571` to `1.625`) to prevent clipping diacritics (Harakat). Mixed-direction text (emails, URLs, invoice IDs like `INV-2026-001`, currency codes) must not suffer from punctuation or character inversion.
- **Decision**:
  - **Dynamic Root Direction**: Toggle `document.documentElement.dir = "rtl" | "ltr"` and `document.documentElement.lang = "ar" | "en"`.
  - **CSS Logical Properties**: Exclusively use Tailwind CSS v4 logical utility classes: `ms-*` / `me-*` (margin-inline-start/end), `ps-*` / `pe-*` (padding-inline-start/end), `start-*` / `end-*` (inset-inline-start/end), `text-start` / `text-end`, and `rounded-s-*` / `rounded-e-*`. Prohibit physical `left-*`, `right-*`, `ml-*`, `mr-*`, `pl-*`, `pr-*` for layout containers.
  - **Typography Stacks**: Configure `@theme` in Tailwind CSS v4:
    - Latin: `Inter, system-ui, sans-serif`
    - Arabic: `Noto Sans Arabic, system-ui, sans-serif`
    - Line-height: Set body line-height to `1.625` (26px on 16px base) and label line-height to `1.571` (22px on 14px base), providing generous clearance for Arabic ascending/descending diacritics.
  - **Bidi Isolation Component (`<BdiText>` / `<bdi>`)**:
    - Wrap all dynamic identifiers, emails, URLs, dates, numbers, and user-entered legal strings in `<bdi>` elements or CSS `unicode-bidi: isolate;`.
    - For directional punctuation (e.g. `(USD)`, `[F005]`, `INV-2026-001`), add Unicode Left-to-Right Marks (`&lrm;` / `\u200E`) when rendering inside an Arabic parent container to prevent trailing punctuation mirroring.
- **Rationale**:
  - Standard HTML `<bdi>` (Bidirectional Isolate) instructs the Unicode Bidirectional Algorithm (UBA) to treat embedded text as directionally isolated from surrounding text, eliminating bracket inversion and number transposition bugs.
  - Tailwind CSS v4 natively supports logical property classes, avoiding manual CSS overrides or multi-stylesheet forks.
- **Alternatives Considered**:
  - Separate stylesheets (`app-ltr.css` vs `app-rtl.css`): Rejected. Unmaintainable, doubles build artifacts, causes flash-of-unstyled-content (FOUC) during runtime locale toggles.
  - Pure CSS `direction: rtl` without logical properties: Rejected. Hardcoded left/right values break when direction flips.

---

### Research 3: Design Tokens & Semantic Theme Management (NFR-007, A-16–A-17, FR-006–FR-008)

- **Context**: The shell must support `light`, `dark`, and `system` modes, consuming the exact paired tokens specified in `DESIGN.md` and `docs/design/tokens.json`. High contrast mode (forced colors) must be supported, and all color pairs must meet WCAG 2.2 AA (minimum 4.5:1 for body text, 3:1 for headings, control borders, and focus rings).
- **Decision**:
  - Implement a zero-dependency `ThemeProvider` that manages theme state: `'light' | 'dark' | 'system'`.
  - When `'system'`, attach a listener to `window.matchMedia('(prefers-color-scheme: dark)')` to update the active class dynamically without page reload.
  - Apply theme via class `dark` on `document.documentElement`.
  - Map tokens from `tokens.json` to CSS custom variables in `app/renderer/styles/globals.css`:
    - Canvas / Background: `--background` (`#F5F7FA` light / `#10151D` dark)
    - Foreground / Ink: `--foreground` (`#18212F` light / `#EDF2F8` dark)
    - Surface / Cards: `--surface` (`#FFFFFF` light / `#171E28` dark)
    - Muted: `--muted` (`#E9EEF5` light / `#253143` dark), `--muted-foreground` (`#536173` light / `#B1BED0` dark)
    - Border: `--border` (`#D5DDE7` light / `#344156` dark)
    - Primary: `--primary` (`#285BCB` light / `#9EBEFF` dark), `--primary-foreground` (`#FFFFFF` light / `#101A2A` dark)
    - Ring / Focus: `--ring` (`#285BCB` light / `#9EBEFF` dark) with minimum 2px solid outline and offset.
    - Sidebar: `--sidebar` (`#E9EEF5` light / `#141D2B` dark), `--sidebar-foreground` (`#26364D` light / `#D8E3F2` dark)
  - Contrast Verification: Contrast ratios for light theme (`#18212F` on `#F5F7FA` = 14.2:1; `#285BCB` on `#FFFFFF` = 6.1:1; `#536173` on `#F5F7FA` = 5.6:1) and dark theme (`#EDF2F8` on `#10151D` = 15.5:1; `#9EBEFF` on `#171E28` = 7.8:1; `#B1BED0` on `#10151D` = 8.8:1) rigorously satisfy WCAG 2.2 AA.
  - Windows High Contrast (Forced Colors): Add `@media (forced-colors: active)` overrides using system color keywords (`ButtonText`, `CanvasText`, `Highlight`, `ButtonBorder`) ensuring borders and focus outlines remain visible.
- **Rationale**:
  - CSS custom variables allow instant, zero-re-render theme switches with 60fps fluidity.
  - Strict mapping to `tokens.json` prevents raw hex color drift in feature components.
- **Alternatives Considered**:
  - CSS-in-JS (styled-components / emotion): Incompatible with React 19 Server Components/modern Vite pipelines and introduces severe runtime styling overhead.
  - Hardcoded Tailwind classes with `dark:` prefix everywhere: Causes inconsistency when tokens change; defining semantic CSS variables once in `globals.css` ensures complete single-source consistency.

---

### Research 4: Desktop Chrome, Platform Window Controls & OS-Reserved Shortcut Protection (PLT-015, A-05, A-15, FR-016, FR-023)

- **Context**: On macOS, native traffic-light window controls sit on the top-left. On Windows and Linux, window controls (minimize, maximize, close) sit on the top-right. When the application switches to Arabic RTL, the header layout mirrors, but OS-owned or custom desktop window controls must preserve physical platform placement (A-05). Furthermore, OS-reserved shortcuts (e.g. `Alt+F4`, `Cmd+Q`, `Win+L`, `Ctrl+Alt+Del`) must never be intercepted (A-15, FR-016).
- **Decision**:
  - **Window Controls Layout Architecture**:
    - The custom desktop titlebar (`.window-titlebar`) uses an explicit physical layout container (`dir="ltr"`) for the platform controls region.
    - macOS: Window drag area has left margin (`margin-inline-start: 72px` in LTR, or physical `left: 72px`) leaving the native traffic lights in their physical top-left position.
    - Windows/Linux: The window controls container (Minimize, Maximize/Restore, Close) is anchored physically to the top-right corner using physical CSS positioning (`position: absolute; right: 0; top: 0; dir: ltr;`).
    - The application navigation and user-facing header beneath the titlebar mirror cleanly with `dir="rtl"`.
  - **OS-Reserved Shortcut Safeguard**:
    - Centralized keydown dispatcher in the renderer window.
    - Explicit blacklist of OS-reserved combinations:
      - Windows/Linux: `Alt+F4`, `Ctrl+Alt+Delete`, `Win+*`, `Alt+Tab`, `Ctrl+Shift+Esc`.
      - macOS: `Cmd+Q`, `Cmd+H`, `Cmd+Option+Esc`, `Cmd+Tab`, `Cmd+Space`.
    - If `event.key` or `event.code` matches a reserved shortcut, the event handler immediately returns without calling `event.preventDefault()` or `event.stopPropagation()`, allowing native Electron/OS handlers to process it unimpeded.
  - **Typed Preload Bridge**:
    - Use the narrow typed bridge established in F004 (`window.solodesk.window.minimize()`, `window.solodesk.window.restore()`, `window.solodesk.window.requestClose()`).
    - No direct Node.js or Electron `remote` access in the renderer.
- **Rationale**:
  - Preserves platform conventions expected by desktop users.
  - Failing to protect OS shortcuts creates trapped user states and violates desktop human interface guidelines.
- **Alternatives Considered**:
  - Mirroring window controls in RTL on Windows (moving close button to top-left): Violates Windows UX guidelines and user muscle memory.
  - Intercepting `Cmd+Q` / `Alt+F4` in renderer to show custom prompt: Violates Principle II and FR-016; Electron main process owns application termination lifecycle.

---

### Research 5: In-Bundle Typed Localization & Bidi Text Formatting (FR-001, FR-004, SC-001, SC-002)

- **Context**: The application requires 100% translated strings in both English and Arabic with zero missing keys, parameter interpolation (e.g. `{{name}}`), pluralization rules, and zero external network calls. Switching locale must never mutate user-entered proper names or financial numbers.
- **Decision**:
  - **Typed Dictionary Architecture**:
    - Define a strict TypeScript type `TranslationKey` derived from the English dictionary keys: `keyof typeof en`.
    - Arabic dictionary (`ar`) must satisfy `Record<TranslationKey, string>`, enforcing compile-time completeness (missing or extra keys cause immediate typecheck errors).
    - Expand existing `packages/localization/src/` to include shell-specific modules:
      - `packages/localization/src/shell/en.ts`
      - `packages/localization/src/shell/ar.ts`
  - **Lightweight Formatter Utility**:
    - A pure, deterministic translation helper: `t(key: TranslationKey, params?: Record<string, string | number>): string`.
    - Simple placeholder replacement: `{{param}}` substituted with escaped, safe text.
    - Zero external localization runtime library needed (avoids i18next bloat and bundling complexities).
  - **Immutability of User Content**:
    - The localization dictionary handles only application chrome, labels, placeholder notices, tooltips, and status descriptions.
    - User data (e.g. workspace name, client name, invoice identifier, amount) is passed through untouched without translation lookup.
- **Rationale**:
  - Enforces 100% key parity at compile time via TypeScript's type system.
  - Zero runtime dependencies ensure instantaneous load and zero network telemetry.
- **Alternatives Considered**:
  - `react-i18next` / `i18next`: Evaluated. Adds ~45KB runtime footprint, async backend loading complexities, and overhead for what is cleanly handled by typed immutable dictionaries in a desktop app.
  - Runtime JSON files fetched via HTTP: Incompatible with sandboxed offline desktop renderer; static TypeScript objects ensure instant bundle availability and type safety.

---

### Research 6: Shell Layout, Navigation & Honest Module Placeholders (FR-009–FR-012, FR-021, A-20–A-23)

- **Context**: F005 must implement `UI-001 Desktop shell`:
  - Persistent sidebar with expanded (icon + label) and collapsed (icon-only with tooltip) modes.
  - Top header with utility buttons (Workspace switcher, Timer, Sync status, Notifications, Language, Theme, Search trigger).
  - Breadcrumb navigation showing current hierarchical location.
  - Main content landmark (`<main id="main-content">`) with a visible "Skip to main content" link for keyboard users.
  - Honest placeholders for upcoming modules (Workspaces F012, Timer F036, Sync F017, Notifications F022) with zero fake revenue, mock balances, or simulated sync checkmarks.
- **Decision**:
  - **Layout Structure**:
    - Grid/flex layout using semantic landmarks:
      - `<a href="#main-content" className="sr-only focus:not-sr-only ...">` (Skip link)
      - `<header role="banner">` (Titlebar and global utilities)
      - `<nav role="navigation" aria-label="Main Navigation">` (Collapsible sidebar)
      - `<main id="main-content" role="main" tabIndex={-1}>` (Primary view container)
  - **Sidebar Interaction**:
    - Toggle button with `aria-expanded={isExpanded}` and `aria-label={isExpanded ? t('nav.collapse') : t('nav.expand')}`.
    - When collapsed (width 64px), navigation links display accessible tooltips on hover and keyboard focus using `@base-ui/react` tooltip primitives.
    - When expanded (width 240px), navigation links show icon and localized label.
    - Active navigation item has `aria-current="page"`, high-contrast active background (`var(--sidebar-accent)`), and distinct indicator.
  - **Honest Module Placeholders**:
    - Each utility trigger opens a bounded, accessible dialog or popover:
      - **Workspace Switcher Placeholder**: Indicates that multi-workspace management is scheduled for phase F012; displays currently loaded local default workspace.
      - **Timer Placeholder**: Explains that active time capture, idle detection, and tray integration are scheduled for phase F036; displays timer as inactive (00:00:00) with no fake running state.
      - **Sync Status Placeholder**: Explicitly discloses that offline outbox and Supabase cloud synchronization are scheduled for phase F017; shows "Local desktop mode (Offline)" without synthetic cloud sync checkmarks.
      - **Notification Center Placeholder**: Explains that in-app notification center is scheduled for phase F022; shows a genuine empty notification list ("No notifications").
- **Rationale**:
  - Satisfies Principles I, III, IV, and VIII: Never deceive the user with simulated financial or activity data.
  - Provides a complete, accessible frame for future phases (P01–P09) to seamlessly mount their respective feature views.
- **Alternatives Considered**:
  - Hiding unimplemented utility buttons: Evaluated, but `UI-001 Desktop shell` specification explicitly designates these as global utilities; displaying honest, educational placeholders provides a superior user experience and structural readiness without mock data.
  - Showing dummy numbers ($12,450 revenue, 5 active syncs): Strictly prohibited by Constitution IV and VIII.

---

### Research 7: Verification & Automated Accessibility Test Architecture (NFR-007, FR-024, A-24–A-26)

- **Context**: Verification must prove WCAG 2.2 AA contrast, 100% keyboard navigation, focus indicator visibility (2px solid, ≥ 3:1 contrast), screen-reader semantics, 200% zoom reflow, and bilingual rendering across Windows, macOS, and Linux. In addition, an explicit fluent Arabic review protocol must be documented.
- **Decision**:
  - **Unit & Integration Suite (`node:test`)**:
    - Component testing with React Testing Library / happy-dom or jsdom to assert:
      - 100% translation key parity between `en` and `ar`.
      - Bidi isolation helper renders `<bdi>` and directional marks correctly for mixed alphanumeric inputs.
      - Theme switching properly assigns CSS classes and notifies listeners.
      - Keyboard dispatchers correctly block or pass OS shortcuts.
      - Command palette query normalization and filtering logic.
  - **Playwright Desktop & Accessibility Suite (`@playwright/test`)**:
    - Automated accessibility scan using `@axe-core/playwright` on all shell states (English LTR, Arabic RTL, Light theme, Dark theme, Command Palette open, Collapsed sidebar, Honest placeholder dialogs).
    - Assert 0 critical, serious, or moderate axe accessibility violations.
    - Viewport reflow tests at 1024×768 and 1920×1080 at 100% and 200% zoom scaling, asserting absence of horizontal scrollbars (`document.documentElement.scrollWidth <= window.innerWidth`).
    - Focus appearance tests verifying 2px outline and contrast against background.
  - **Cross-Platform & Fluent Arabic Protocol**:
    - Multi-target test matrix (Windows, macOS, Linux).
    - Linguistic review checklist evaluating every Arabic string for context, natural syntax, correct grammatical agreement, and typographic clarity.
- **Rationale**:
  - Automated axe-core tests provide repeatable regression prevention for WCAG 2.2 AA.
  - Separates automated verification evidence from final user sign-off, fulfilling Principle VIII.
- **Alternatives Considered**:
  - Manual review only: Inadequate; prone to regression and fails to provide machine-verifiable evidence.
  - Third-party SaaS accessibility scanners: Unsuitable for offline desktop Electron application.

---

## 3. Technology Stack Summary

| Layer             | Selected Technology           | Version                | Purpose                                           |
| ----------------- | ----------------------------- | ---------------------- | ------------------------------------------------- |
| **Runtime**       | Electron (Forge + Vite)       | 44.8.0 / 8.0.1 / 8.3.4 | Sandboxed, unprivileged desktop renderer          |
| **UI Framework**  | React / React DOM             | 19.3.1                 | Component rendering and reactive state            |
| **Language**      | TypeScript                    | 7.0.2 / Node 24        | Type safety and dictionary key completeness       |
| **Styling**       | Tailwind CSS / tw-animate-css | 4.3.3 / 1.4.0          | Design token consumption and logical properties   |
| **Primitives**    | `@base-ui/react`              | 1.9.0                  | Headless accessible dialogs, tooltips, popovers   |
| **Icons**         | `lucide-react`                | 1.58.0                 | Accessible iconography with directional mirroring |
| **Theme / State** | React Context + CSS Variables | Native React 19        | Zero-dependency theme & locale management         |
| **Verification**  | `node:test` + Playwright      | Node 24 / 1.64.1       | Unit, integration, E2E, and axe-core a11y checks  |

---

## 4. Resolution of Needs Clarification

All technical context items and architectural requirements are fully resolved:

- **No unresolved `NEEDS CLARIFICATION` markers remain.**
- Architecture adheres strictly to all constitutional principles (I, II, VI, VIII).
- Design artifacts Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`) can proceed without blockers.
