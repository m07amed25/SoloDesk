---
description: "Task list for F005 Accessible English/Arabic Application Shell implementation"
---

# Tasks: F005 — Accessible English/Arabic Application Shell

**Input**: Design documents from `/specs/005-accessible-application-shell/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Tests are explicitly specified across unit (`tests/unit/`), desktop Playwright accessibility (`tests/desktop/`), and bilingual validation. Following project standards and TDD rules, test tasks are defined first within each story and must fail prior to implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story in priority order.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., `[US1]`, `[US2]`, `[US3]`, etc.)
- All task descriptions include exact file paths and quoted validation constraints from `data-model.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure scaffolding, and shared token mapping.

- [x] T001 Create component and test directory structure for application shell in `app/renderer/components/shell/`, `app/renderer/components/ui/`, `app/renderer/contexts/`, `packages/localization/src/shell/`, `tests/unit/`, and `tests/desktop/`
- [x] T002 Configure semantic CSS custom variables mapped from `docs/design/tokens.json` in `app/renderer/styles/globals.css` (mapping `--background`, `--foreground`, `--surface`, `--muted`, `--border`, `--primary`, `--ring`, and `--sidebar` tokens for light and dark modes)
- [x] T003 [P] Define TypeScript contract types and translation key constraints in `packages/localization/src/shell/types.ts` enforcing `TranslationKey = keyof typeof en` and Arabic dictionary type `Record<TranslationKey, string>`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and base primitives that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement fail-closed preferences storage manager in `app/renderer/lib/preferences.ts` supporting `UserPreferenceRecord` with validation rules: `"schemaVersion must equal 1"`, `"locale must be strictly 'en' or 'ar'"`, `"theme must be strictly 'light', 'dark', or 'system'"`, `"sidebarCollapsed must be a boolean"`, and `"If storage contains invalid, corrupted, or unparseable JSON, parsing MUST fail closed to safe defaults without throwing runtime exceptions: schemaVersion: 1, locale: 'en', theme: 'system', sidebarCollapsed: false, lastUpdated: '1970-01-01T00:00:00.000Z'"`
- [x] T005 [P] Create typed desktop preload bridge client wrapper in `app/renderer/lib/bridge.ts` wrapping `window.solodesk` for window state and lifecycle events without arbitrary IPC access
- [x] T006 [P] Implement centralized keydown listener and OS-reserved shortcut protection in `app/renderer/lib/shortcuts.ts` guarding against interception of `Alt+F4`, `Cmd+Q`, `Cmd+H`, `Win+L`, `Ctrl+Alt+Delete`, and `Alt+Tab`
- [x] T007 [P] Create accessible base button primitive using `@base-ui/react` and `cva` in `app/renderer/components/ui/button.tsx` supporting visible 2px solid focus rings with ≥ 3:1 contrast
- [x] T008 [P] Create accessible headless dialog primitive using `@base-ui/react` in `app/renderer/components/ui/dialog.tsx` with inert background backdrop and focus trapping
- [x] T009 [P] Create accessible tooltip primitive using `@base-ui/react` in `app/renderer/components/ui/tooltip.tsx` supporting keyboard focus and hover triggers for collapsed navigation

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel or sequentially.

---

## Phase 3: User Story 1 - Full English and Arabic Parity with True RTL Layout (Priority: P1) 🎯 MVP

**Goal**: Deliver full bilingual parity with dynamic root direction switching (`ltr` vs `rtl`), Inter and Noto Sans Arabic typography with 1.625 line height, bidirectional text isolation (`<bdi>`), user content immutability, and physical window controls placement preservation in RTL.

**Independent Test**: Launch shell in English, toggle to Arabic, verify `dir="rtl"` and Noto Sans Arabic font activation without diacritic clipping, confirm Latin identifiers (e.g. `INV-2026-001`, emails) maintain internal order, and confirm OS window controls remain physically positioned (macOS top-left, Windows/Linux top-right).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Create unit test for localization dictionary parity and compile-time key completeness in `tests/unit/localization-parity.test.ts`
- [x] T011 [P] [US1] Create unit test for bidirectional text isolation and UBA formatting in `tests/unit/bidi-isolation.test.ts` asserting correct rendering of mixed alphanumeric strings, emails, and currency codes

### Implementation for User Story 1

- [x] T012 [P] [US1] Create complete English shell translation dictionary in `packages/localization/src/shell/en.ts` covering navigation labels, utility triggers, placeholders, dialogs, and errors
- [x] T013 [P] [US1] Create complete Arabic shell translation dictionary with fluent phrasing in `packages/localization/src/shell/ar.ts` matching 100% of keys in `packages/localization/src/shell/en.ts`
- [x] T014 [US1] Implement `LocalizationContext` provider in `app/renderer/contexts/LocalizationContext.tsx` managing `ShellLocaleState` with constraints: `"locale: 'en' | 'ar'"`, `"direction: 'ltr' | 'rtl'"`, `"fontFamily: 'Inter, system-ui, sans-serif' for Latin, 'Noto Sans Arabic, system-ui, sans-serif' for Arabic"`, `"lineHeight: 1.625 (26px on 16px base) for both Latin and Arabic to provide sufficient vertical clearance for Tashkeel/Harakat diacritics"`, and `"messages: Readonly<Record<string, string>> in-bundle immutable translation dictionary"` (depends on T004, T012, T013)
- [x] T015 [P] [US1] Implement bidirectional text isolation component `<BdiText>` in `app/renderer/components/ui/bdi-text.tsx` using `<bdi>` and Unicode LTR marks (`\u200E`) to prevent bracket and punctuation inversion
- [x] T016 [US1] Implement desktop custom titlebar container in `app/renderer/components/shell/Titlebar.tsx` preserving platform-specific physical placement of window controls in RTL (macOS traffic lights at physical left 72px; Windows/Linux minimize/maximize/close buttons anchored to physical top-right via `position: absolute; right: 0; dir: ltr;`) (depends on T005, T014)
- [x] T017 [US1] Integrate `LocalizationContext` and dynamic document root synchronization (`dir`, `lang`, `fontFamily`) into main renderer entry in `app/renderer/shell/App.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently as the minimal viable presentation.

---

## Phase 4: User Story 2 - Complete Keyboard Navigation, Visible Focus, and Assistive Semantics (Priority: P1)

**Goal**: Ensure 100% of interactive controls are keyboard reachable, focus rings are visibly unobstructed (minimum 2px solid with ≥ 3:1 contrast), standard ARIA landmarks are present, `prefers-reduced-motion` is respected, and a visible "Skip to main content" link is available.

**Independent Test**: Navigate all shell interactive elements using `Tab`/`Shift+Tab` in both LTR and RTL, verify visible 2px focus rings on every control, activate the skip-link to jump directly to `<main id="main-content">`, and verify transitions are instantaneous when `prefers-reduced-motion` is enabled.

### Tests for User Story 2 ⚠️

- [x] T018 [P] [US2] Create unit test for keyboard tab sequence and focus trap boundaries in `tests/unit/keyboard-navigation.test.ts`
- [x] T019 [P] [US2] Create unit test for reduced motion CSS class toggling and zero-duration animations in `tests/unit/reduced-motion.test.ts`

### Implementation for User Story 2

- [x] T020 [P] [US2] Implement visible "Skip to main content" link in `app/renderer/components/shell/SkipLink.tsx` targeting `#main-content` with accessible styling (`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4`)
- [x] T021 [US2] Implement desktop shell grid/flex layout container in `app/renderer/components/shell/ShellLayout.tsx` providing standard landmarks (`<header role="banner">`, `<nav role="navigation" aria-label="Main Navigation">`, `<main id="main-content" role="main" tabIndex={-1}>`, `<aside>`) and logical property spacing (depends on T016, T020)
- [x] T022 [P] [US2] Configure high-contrast focus rings and outline tokens in `app/renderer/styles/globals.css` enforcing minimum 2px solid outline with ≥ 3:1 contrast against adjacent backgrounds
- [x] T023 [P] [US2] Add reduced motion media query overrides in `app/renderer/styles/globals.css` suppressing decorative CSS transitions when `@media (prefers-reduced-motion: reduce)` is active
- [x] T024 [US2] Wire `SkipLink` and `ShellLayout` landmarks into `app/renderer/shell/App.tsx` ensuring focus moves predictably from skip link to main content

**Checkpoint**: At this point, User Stories 1 AND 2 work together independently with full keyboard accessibility.

---

## Phase 5: User Story 3 - Accessible Global Search and Command Palette (PLT-015) (Priority: P1)

**Goal**: Implement accessible global command palette modal dialog invokable via `Mod+K` or header trigger, real-time query filtering (< 50ms across 100 items), arrow key navigation with `aria-activedescendant`, dismissal, and focus restoration to the trigger element without intercepting OS shortcuts.

**Independent Test**: Press `Mod+K`, verify dialog opens in < 100ms and search input receives focus, filter items with Arabic and English queries, navigate with `ArrowDown`/`ArrowUp`, execute a command via `Enter`, dismiss via `Escape`, and verify focus returns to the initial trigger element.

### Tests for User Story 3 ⚠️

- [x] T025 [P] [US3] Create unit test for search query normalization and diacritic stripping in `tests/unit/command-normalizer.test.ts` verifying `"strip Arabic diacritics (Harakat / Tashkeel) [\u064B-\u065F\u0670]"`, `"normalize Alef variants [\u0622\u0623\u0625] to bare Alef \u0627"`, and `"normalize Ta Marbuta \u0629 to Ha \u0647"`
- [x] T026 [P] [US3] Create unit test for command palette registry and filtering performance in `tests/unit/command-palette.test.ts` asserting filtering execution < 50ms across 100 registered actions

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement search normalization and indexing engine in `app/renderer/lib/command-registry.ts` supporting bilingual query search and category grouping (`navigation`, `actions`, `preferences`)
- [x] T028 [US3] Implement `CommandPaletteContext` in `app/renderer/contexts/CommandPaletteContext.tsx` managing open state, action registration, trigger element reference, and focus restoration (depends on T027)
- [x] T029 [US3] Implement accessible `CommandPalette` modal dialog component in `app/renderer/components/shell/CommandPalette.tsx` using `@base-ui/react` dialog primitives, `role="combobox"`, `aria-activedescendant`, and keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) (depends on T008, T027, T028)
- [x] T030 [P] [US3] Implement visible header search button trigger in `app/renderer/components/shell/SearchTrigger.tsx` displaying search placeholder and visual shortcut badge `Mod+K`
- [x] T031 [US3] Register default navigation routes and preference actions into `CommandPaletteContext` and mount `CommandPalette` in `app/renderer/shell/App.tsx` (depends on T006, T028, T029, T030)

**Checkpoint**: At this point, User Stories 1, 2, and 3 are functional with complete keyboard-driven command navigation.

---

## Phase 6: User Story 4 - Theme Modes, Design Tokens, and 200% Zoom Reflow (Priority: P1)

**Goal**: Support Light, Dark, and System theme modes using paired tokens from `tokens.json`, OS dark-mode synchronization, Windows Forced Colors (high contrast) support, and fluid layout reflow at 200% zoom scaling down to 1024×768 CSS pixels without horizontal scrollbars.

**Independent Test**: Toggle themes between Light, Dark, and System modes, verify paired color tokens apply immediately, test OS `prefers-color-scheme` adaptation, and resize viewport to 1024×768 at 200% zoom to verify absence of horizontal scrollbars.

### Tests for User Story 4 ⚠️

- [x] T032 [P] [US4] Create unit test for theme switching and OS media query listener in `tests/unit/theme-switching.test.ts` asserting correct transitions between `light`, `dark`, and `system`

### Implementation for User Story 4

- [x] T033 [US4] Implement `ThemeContext` provider in `app/renderer/contexts/ThemeContext.tsx` managing `ShellThemeState` with validation rules: `"mode: 'light' | 'dark' | 'system'"`, `"resolvedTheme: 'light' | 'dark'"`, and `"forcedColorsActive: boolean derived from matchMedia('(forced-colors: active)')"` (depends on T004)
- [x] T034 [P] [US4] Implement theme mode toggle component in `app/renderer/components/shell/ThemeToggle.tsx` allowing one-click switching across Light, Dark, and System modes with accessible labels
- [x] T035 [P] [US4] Configure Windows High Contrast `@media (forced-colors: active)` rules in `app/renderer/styles/globals.css` using system color keywords (`ButtonBorder`, `Highlight`, `CanvasText`)
- [x] T036 [P] [US4] Add CSS container queries and responsive zoom reflow rules in `app/renderer/styles/globals.css` ensuring zero horizontal scrollbars at 200% zoom down to 1024×768 viewport width
- [x] T037 [US4] Integrate `ThemeContext` into `app/renderer/shell/App.tsx` and attach theme class synchronization to `document.documentElement` (depends on T033, T034)

**Checkpoint**: All P1 user stories (US1–US4) are fully functional, accessible, and responsive.

---

## Phase 7: User Story 5 - Honest Navigation and Module Placeholders (Priority: P2)

**Goal**: Implement primary collapsible navigation rail matching `UI-001 Desktop shell`, breadcrumb trail, and honest foundation module placeholders (Workspaces, Timer, Sync status, Notifications) with exact truthful text and zero fake data.

**Independent Test**: Click through all 9 top-level routes, verify active indicator (`aria-current="page"`) and breadcrumbs, toggle sidebar between expanded (240px) and collapsed (64px) modes, and activate foundation utility triggers to verify honest placeholders disclose phase availability with zero synthetic revenue or mock records.

### Tests for User Story 5 ⚠️

- [x] T038 [P] [US5] Create unit test for navigation routing and breadcrumbs hierarchy in `tests/unit/navigation-routing.test.ts` asserting correct path and label resolution for all 9 routes

### Implementation for User Story 5

- [x] T039 [US5] Implement `NavigationContext` provider in `app/renderer/contexts/NavigationContext.tsx` managing active route, breadcrumbs trail, and sidebar collapse state with validation: `"RouteId: 'overview' | 'my-work' | 'projects' | 'clients' | 'time' | 'finance' | 'reports' | 'knowledge' | 'settings'"`, and `"status: 'active' | 'placeholder'"` (depends on T004)
- [x] T040 [US5] Implement primary navigation sidebar rail in `app/renderer/components/shell/SidebarNav.tsx` supporting expanded (240px) and collapsed (64px) modes, `aria-current="page"`, and `@base-ui/react` tooltips on collapsed items (depends on T009, T039)
- [x] T041 [US5] Implement accessible breadcrumb hierarchy in `app/renderer/components/shell/BreadcrumbTrail.tsx` using `<nav aria-label="Breadcrumb">`, `<ol role="list">`, and directional chevron separators (depends on T039)
- [x] T042 [US5] Implement header utility triggers in `app/renderer/components/shell/HeaderUtilities.tsx` for Workspaces, Timer, Sync status, Notifications, Language, and Theme (depends on T014, T033)
- [x] T043 [US5] Implement honest foundation placeholder component in `app/renderer/components/shell/ModulePlaceholder.tsx` displaying exact truthful metadata: `"workspaces: 'Personal Workspace', targetPhase: 'F012'"`, `"timer: '00:00:00 (Inactive)', targetPhase: 'F036'"`, `"sync: 'Local Desktop (Offline)', targetPhase: 'F017'"`, `"notifications: 'No notifications', targetPhase: 'F022'"`, with `"ZERO synthetic dollars, fake client counts, or artificial sync checkmarks"` (depends on T008)
- [x] T044 [US5] Implement settings view panel in `app/renderer/components/shell/SettingsView.tsx` exposing active UI preferences (language selection, theme mode, desktop environment details) (depends on T014, T033)
- [x] T045 [US5] Assemble sidebar, breadcrumbs, header utilities, module containers, and settings view into `app/renderer/components/shell/ShellLayout.tsx` (depends on T021, T040, T041, T042, T043, T044)

**Checkpoint**: All shell navigation routes and honest placeholders are functional with zero mock data.

---

## Phase 8: User Story 6 - Cross-Platform Consistency and Fluent Bilingual Review (Priority: P2)

**Goal**: Deliver automated Playwright accessibility and reflow test suites, cross-platform validation evidence across Windows, macOS, and Linux, and an explicit fluent Arabic linguistic review log.

**Independent Test**: Run automated axe-core test suite to verify 0 WCAG 2.2 AA violations, run visual tests verifying RTL and 200% zoom reflow, and audit all Arabic strings for natural syntax and typographic rhythm.

### Tests for User Story 6 ⚠️

- [x] T046 [P] [US6] Create automated Playwright accessibility test suite in `tests/desktop/accessibility.spec.ts` using `@axe-core/playwright` asserting 0 WCAG 2.2 AA violations across English LTR, Arabic RTL, Light mode, Dark mode, and open Command Palette
- [x] T047 [P] [US6] Create Playwright bidirectional layout and RTL visual test in `tests/desktop/bidirectional.spec.ts` asserting directional mirroring, `<bdi>` isolation, and physical OS controls placement
- [x] T048 [P] [US6] Create Playwright zoom reflow test in `tests/desktop/zoom-reflow.spec.ts` asserting layout reflows without horizontal scrollbars at 200% zoom across 1024×768 to 1920×1080 viewports

### Implementation for User Story 6

- [x] T049 [US6] Conduct comprehensive fluent Arabic linguistic audit of all strings in `packages/localization/src/shell/ar.ts` verifying natural business phrasing, correct pluralization, and zero mechanical translations
- [x] T050 [US6] Document cross-platform verification results and test execution evidence in `docs/qa/F005.md` linking acceptance scenarios A-01 through A-26 to test outcomes
- [x] T051 [US6] Create feature delivery specification summary in `docs/features/F005.md` detailing verification commands, native security boundaries, and owner approval prerequisites

**Checkpoint**: All user stories have verifiable automated test suites and linguistic sign-off.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: App entry assembly, full suite execution, and validation against quickstart scenarios.

- [x] T052 [P] Clean up orphaned styles and verify Tailwind CSS utility consistency in `app/renderer/styles/globals.css`
- [x] T053 Wire all context providers (`LocalizationContext`, `ThemeContext`, `NavigationContext`, `CommandPaletteContext`) into root entry `app/renderer/shell/App.tsx`
- [x] T054 [P] Run static analysis and linting checks via `npm run typecheck` and `npm run lint` across all modified packages
- [x] T055 Execute full test suite via `npm run test:unit`, `npm run test:integration`, and `npm run test:desktop`
- [x] T056 Execute end-to-end quickstart validation scenarios 1 through 7 defined in `specs/005-accessible-application-shell/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2). Establishes bilingual parity and RTL layout.
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) and integrates with User Story 1 (RTL landmarks).
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) and integrates with User Stories 1 and 2 (Command Palette).
- **User Story 4 (Phase 6)**: Depends on Foundational (Phase 2) and integrates with User Story 1 (Theme & Zoom).
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) and User Stories 1–4 (Navigation & Honest Placeholders).
- **User Story 6 (Phase 8)**: Depends on User Stories 1–5 (Verification & Arabic Audit).
- **Polish (Phase 9)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — Can run in parallel with US1, integrates at ShellLayout.
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) — Can run in parallel with US1/US2.
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) — Can run in parallel with US1/US2/US3.
- **User Story 5 (P2)**: Depends on US1 (localization), US2 (landmarks), and US4 (tokens/theme).
- **User Story 6 (P2)**: Tests all preceding stories (US1–US5).

### Within Each User Story

- Tests MUST be written FIRST and fail prior to implementation.
- Types and models before context providers.
- Context providers before UI components.
- Sub-components before top-level container integration.
- Story complete and verified before declaring checkpoint passed.

### Parallel Opportunities

- In **Phase 1**: T003 can run in parallel with T002.
- In **Phase 2**: T005, T006, T007, T008, T009 can run in parallel after T004.
- In **Phase 3 (US1)**: Tests T010, T011 can run in parallel; dictionaries T012, T013 and `<BdiText>` T015 can run in parallel.
- In **Phase 4 (US2)**: Tests T018, T019 can run in parallel; T020, T022, T023 can run in parallel.
- In **Phase 5 (US3)**: Tests T025, T026 can run in parallel; T027 and T030 can run in parallel.
- In **Phase 6 (US4)**: Test T032, T034, T035, T036 can run in parallel.
- In **Phase 7 (US5)**: Test T038 can run in parallel; T040, T041, T042, T043, T044 can proceed in parallel once T039 is in place.
- In **Phase 8 (US6)**: Tests T046, T047, T048 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch unit tests for User Story 1 in parallel:
Task: "T010 [P] [US1] Create unit test for localization dictionary parity in tests/unit/localization-parity.test.ts"
Task: "T011 [P] [US1] Create unit test for bidirectional text isolation in tests/unit/bidi-isolation.test.ts"

# Launch dictionary and component creation in parallel:
Task: "T012 [P] [US1] Create complete English shell translation dictionary in packages/localization/src/shell/en.ts"
Task: "T013 [P] [US1] Create complete Arabic shell translation dictionary in packages/localization/src/shell/ar.ts"
Task: "T015 [P] [US1] Implement bidirectional text isolation component in app/renderer/components/ui/bdi-text.tsx"
```

---

## Parallel Example: User Story 3

```bash
# Launch query normalization test and filtering test in parallel:
Task: "T025 [P] [US3] Create unit test for search query normalization in tests/unit/command-normalizer.test.ts"
Task: "T026 [P] [US3] Create unit test for command palette registry in tests/unit/command-palette.test.ts"

# Implement normalization logic and visible trigger in parallel:
Task: "T027 [P] [US3] Implement search normalization engine in app/renderer/lib/command-registry.ts"
Task: "T030 [P] [US3] Implement visible header search button trigger in app/renderer/components/shell/SearchTrigger.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003).
2. Complete Phase 2: Foundational (T004–T009) — blocking prerequisites.
3. Complete Phase 3: User Story 1 (T010–T017) — English/Arabic parity and RTL layout.
4. **STOP and VALIDATE**: Run `npm run test:unit` and launch desktop shell to verify bilingual parity and bidi isolation.
5. Demo bilingual shell foundation.

### Incremental Delivery

1. Complete Setup + Foundational → Core baseline ready.
2. Add User Story 1 (T010–T017) → Test independently → English/Arabic foundation delivered (MVP!).
3. Add User Story 2 (T018–T024) → Test independently → Full keyboard navigation and visible focus rings.
4. Add User Story 3 (T025–T031) → Test independently → Accessible Command Palette (`Mod+K`).
5. Add User Story 4 (T032–T037) → Test independently → Light/Dark/System themes and 200% zoom reflow.
6. Add User Story 5 (T038–T045) → Test independently → Collapsible sidebar and honest module placeholders.
7. Add User Story 6 (T046–T051) → Run complete axe-core audit, E2E tests, and fluent Arabic review.
8. Polish & Validate (T052–T056) → Final typecheck, lint, test run, and quickstart validation.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks.
- `[Story]` label (`[US1]`–`[US6]`) maps task to specific user story for complete traceability.
- Each user story is independently completable and testable.
- Tests are written first and must fail before implementing functional components.
- Commit after each task or logical group.
- Stop at each checkpoint to validate the story independently before moving forward.
- Avoid: vague descriptions, unquoted constraints, same-file merge conflicts, cross-story dependencies breaking isolation.
