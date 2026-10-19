# Implementation Plan: F005 — Accessible English/Arabic Application Shell

**Branch**: `feat/f005-accessible-english-arabic-application-shell` | **Date**: 2026-10-18 | **Spec**: [F005 Specification](./spec.md)

**Input**: Feature specification from `specs/005-accessible-application-shell/spec.md` and design specifications from `DESIGN.md` / `docs/design/screens.md` (UI-001 Desktop shell).

---

## Summary

F005 establishes the foundational desktop application shell for SoloDesk, delivering:

1. Day-one bilingual parity with full English (LTR) and Arabic (RTL) layout switching via CSS logical properties and Noto Sans Arabic typography with adequate line height (1.625).
2. Bidirectional text isolation (`<bdi>` and direction marks) preventing inverted punctuation or character mangling on identifiers (e.g. `INV-2026-001`), emails, and numbers.
3. Accessible global Command Palette (`Mod+K`) built with `@base-ui/react` combobox primitives, real-time search filtering in < 50ms, arrow navigation, and focus restoration to the trigger element.
4. Flexible theme management (Light, Dark, System modes) strictly consuming paired tokens from `tokens.json` with WCAG 2.2 AA contrast compliance and OS dark-mode synchronization.
5. 100% keyboard navigation, visible 2px solid focus rings (≥ 3:1 contrast), "Skip to main content" link, reduced-motion compliance, and 200% zoom reflow down to 1024×768 CSS pixels.
6. Honest module placeholders for upcoming capabilities (Workspaces F012, Timer F036, Sync F017, Notifications F022) with zero simulated revenue, fake client records, or artificial sync checkmarks.
7. Unprivileged renderer security, native window controls preservation in RTL, and strict OS-reserved shortcut protection.

---

## Technical Context

**Language/Version**: TypeScript 7.0.2 / Node 24 (engines: `>=24 <25`).

**Primary Dependencies**:

- React 19.3.1 (`react`, `react-dom`)
- Tailwind CSS 4.3.3 (`@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`)
- `@base-ui/react` 1.9.0 (headless accessible dialogs, tooltips, comboboxes)
- `lucide-react` 1.58.0 (accessible icons with directional mirroring)
- `class-variance-authority` 0.7.1 and `cn` for component styling composition

**Storage**:

- Pure client-side persistent user preferences (`localStorage` or typed local file storage) for locale, theme mode, and sidebar collapse state.
- Corrupted or unparseable preference data fails closed to safe defaults (`en`, `system`, expanded sidebar).
- Zero server database schema or migrations in F005.

**Testing**:

- Node.js test runner (`node:test`) for unit and integration suites (`tooling/verification/run-suite.mjs`).
- Playwright (`@playwright/test`) for desktop shell E2E, window controls, and keyboard navigation.
- Automated accessibility scanner (`@axe-core/playwright`) asserting 0 WCAG 2.2 AA violations.
- Explicit fluent Arabic linguistic review checklist.

**Target Platform**: Windows, macOS, Linux (Electron 44.8.0, Electron Forge 8.0.1, Vite 8.3.4).

**Project Type**: Desktop application (unprivileged renderer + typed preload bridge).

**Performance Goals**:

- Command Palette opens in < 100ms on `Mod+K` / click trigger.
- Search query filtering across up to 100 items in < 50ms per keystroke.
- Instant, flicker-free theme and locale transitions (< 16ms / 1 animation frame).
- Layout reflows cleanly without horizontal scrollbars at 200% zoom across 1024×768 to 1920×1080.

**Constraints**:

- WCAG 2.2 AA compliance (≥ 4.5:1 body text contrast, ≥ 3:1 headings/borders/focus rings).
- 100% keyboard reachable and operable with visible 2px solid focus rings.
- Full bilingual parity (LTR/RTL, CSS logical properties, `<bdi>` bidi isolation).
- OS-reserved shortcuts (`Alt+F4`, `Cmd+Q`, `Win+L`, `Ctrl+Alt+Del`) must not be intercepted.
- Zero synthetic revenue, fake client data, or fabricated sync indicators in placeholders.
- Operating system window controls must preserve physical platform placement in RTL (macOS top-left, Win/Linux top-right).
- Renderer process remains strictly unprivileged with no direct Node.js or arbitrary IPC access.

**Scale/Scope**:

- 1 desktop shell frame (`UI-001 Desktop shell`).
- 9 top-level routes (8 honest module placeholders + 1 active settings view).
- 4 foundation utility placeholders (Workspaces, Timer, Sync status, Notifications).
- ~100 command palette searchable actions and navigation destinations.

---

## Constitution Check

_GATE: Evaluated against SoloDesk Constitution (v1.0.0). All gates passed._

| Constitutional Principle                             | Status   | Compliance Evidence & Safeguards                                                                                                                                                                                     |
| ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Authorized Scope & Traceable Decisions**        | **PASS** | Planning remains within P01 foundation; business features remain documentation-only; stable requirement IDs (PLT-015, NFR-006, NFR-007, NFR-015) and decisions (D-02, D-03, D-07, D-10, D-16, D-17, Q-11) preserved. |
| **II. Desktop Platform & Explicit Trust Boundaries** | **PASS** | Desktop Electron/React/TypeScript with Tailwind CSS and shadcn/`@base-ui/react`. Renderer is unprivileged, sandboxed, context-isolated, communicating via narrow typed bridge `window.solodesk`.                     |
| **III. Durable Offline Work with Cloud Authority**   | **PASS** | Shell operates 100% offline; honest sync placeholder explicitly announces local desktop offline state without fabricated cloud sync.                                                                                 |
| **IV. Exact, Immutable Financial Evidence**          | **PASS** | Zero simulated revenue or mock transactions; user-entered data remains immutable across locale switches; exact bidi isolation for financial numbers and invoice IDs.                                                 |
| **V. Fail-Closed Security & Least Privilege**        | **PASS** | Storage read failures fall back closed to safe defaults; no secrets, tokens, or credentials enter the renderer.                                                                                                      |
| **VI. English, Arabic & Accessible Interaction**     | **PASS** | Day-one English/Arabic parity; Noto Sans Arabic typography with 1.625 line height; CSS logical properties; `<bdi>` isolation; WCAG 2.2 AA contrast; visible 2px focus indicators; 200% zoom reflow; skip link.       |
| **VII. Recoverable Data & Compatible Evolution**     | **PASS** | Preference schema is versioned (`schemaVersion: 1`); corrupted or missing preferences fail closed to safe defaults without crashing.                                                                                 |
| **VIII. Evidence Before Completion or Release**      | **PASS** | Automated unit/integration tests, Playwright axe-core a11y audit, cross-platform tests across Windows, macOS, and Linux, and fluent Arabic human review documented before owner approval.                            |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-accessible-application-shell/
├── spec.md              # Requirements and acceptance criteria
├── checklists/
│   └── requirements.md  # Requirements quality checklist (16/16 passed)
├── plan.md              # This implementation plan
├── research.md          # Phase 0: Technical research & architecture decisions
├── data-model.md        # Phase 1: Entity definitions, state transitions, validation
├── quickstart.md        # Phase 1: Runnable validation scenarios & test guide
├── contracts/           # Phase 1: Component and interface contracts
│   ├── shell-state-contract.md     # Localization, direction, and theme contracts
│   ├── navigation-contract.md      # Primary navigation, rail, and breadcrumbs
│   ├── command-palette-contract.md # Command palette modal & search filtering
│   └── desktop-bridge-contract.md  # Preload bridge & window controls in RTL
└── tasks.md             # Phase 2: Actionable tasks ($speckit-tasks command)
```

### Source Code (repository root layout for implementation)

```text
app/
├── preload/
│   └── index.ts                     # Preload bridge exposing window.solodesk (F004)
└── renderer/
    ├── components/
    │   ├── shell/
    │   │   ├── ShellLayout.tsx            # UI-001 desktop shell container (header, sidebar, main)
    │   │   ├── SidebarNav.tsx             # Primary navigation rail (expanded / collapsed modes)
    │   │   ├── BreadcrumbTrail.tsx        # Accessible location breadcrumbs
    │   │   ├── CommandPalette.tsx         # Mod+K accessible combobox modal dialog
    │   │   ├── SkipLink.tsx               # First tab stop jump to #main-content
    │   │   ├── HeaderUtilities.tsx        # Workspace, Timer, Sync, Notification triggers
    │   │   └── ModulePlaceholder.tsx      # Truthful, bounded placeholders for unbuilt modules
    │   └── ui/
    │       ├── button.tsx                 # Base UI accessible button variant
    │       ├── dialog.tsx                 # Headless accessible dialog wrapper (@base-ui/react)
    │       ├── tooltip.tsx                # Accessible tooltip for collapsed rail (@base-ui/react)
    │       └── bdi-text.tsx               # Bidirectional isolation wrapper (<bdi>)
    ├── contexts/
    │   ├── LocalizationContext.tsx        # Locale & direction state provider (en/ar, ltr/rtl)
    │   ├── ThemeContext.tsx               # Theme mode provider (light/dark/system + forced-colors)
    │   └── NavigationContext.tsx          # Active route & sidebar collapse state
    ├── lib/
    │   ├── preferences.ts                 # Fail-closed local preference storage
    │   ├── command-registry.ts            # Action index & Arabic/Latin query normalizer
    │   └── shortcuts.ts                   # Global keydown dispatcher & OS shortcut safeguard
    └── styles/
        └── globals.css                    # CSS variables mapped from tokens.json & logical utilities

packages/
└── localization/
    └── src/
        ├── shell/
        │   ├── en.ts                      # Complete English shell dictionary
        │   └── ar.ts                      # Complete Arabic shell dictionary (fluent reviewed)
        └── types.ts                       # Strict 1:1 TranslationKey type constraint

tests/
├── unit/
│   ├── localization-parity.test.ts        # 100% key parity & bidi isolation assertions
│   ├── command-palette.test.ts            # Query normalization & filtering tests
│   └── preferences.test.ts                # Fail-closed storage fallback tests
└── desktop/
    ├── accessibility.spec.ts              # Playwright + axe-core WCAG 2.2 AA audit
    ├── bidirectional.spec.ts              # RTL layout & bidi isolation visual tests
    └── zoom-reflow.spec.ts                # 200% zoom & 1024x768 reflow assertions
```

**Structure Decision**: The application shell is implemented in `app/renderer/` within the Electron Forge / Vite architecture, with translation dictionaries centralized in `packages/localization/src/shell/` to enforce compile-time key completeness, and automated tests organized under `tests/unit/` and `tests/desktop/`.

---

## Complexity Tracking

> **Violations**: None. All constitutional gates pass with zero deviations.

| Violation | Why Needed                                         | Simpler Alternative Rejected Because |
| --------- | -------------------------------------------------- | ------------------------------------ |
| _None_    | _All constitutional gates pass without exception._ | _N/A_                                |
