# Quickstart Validation Guide: F005 — Accessible English/Arabic Application Shell

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Milestone**: P01 — Secure desktop, identity, teams and offline cloud foundation  
**Date**: 2026-10-18  
**Status**: Complete — Design Phase 1 Artifact  

---

## 1. Overview & Purpose

This quickstart guide provides runnable validation scenarios that prove the application shell works end-to-end according to the [feature specification](./spec.md), [data model](./data-model.md), [interface contracts](./contracts/), and the [SoloDesk Constitution](../../.specify/memory/constitution.md).

It is structured for engineering reviewers, automated verification runners, and quality auditors. It covers automated suites, interactive test scenarios, and cross-platform verification on Windows, macOS, and Linux.

---

## 2. Prerequisites & Setup

### 2.1 System Requirements
- Node.js `24.x` (enforced by `package.json` engines: `node: ">=24 <25"`).
- npm `11.x`.
- Supported OS: Linux (Ubuntu 22.04+), macOS (13+), or Windows (11/10).

### 2.2 Environment Initialization
From the repository root:
```bash
# Verify Node and npm version
node -v
npm -v

# Check repository status and run linting/typechecking
npm run typecheck
npm run lint
```

---

## 3. Automated Verification Suites

Run the automated verification commands covering unit tests, contract validation, and Playwright accessibility checks:

```bash
# 1. Run unit & localization parity tests
npm run test:unit

# 2. Run integration suites
npm run test:integration

# 3. Run desktop shell launcher & Playwright accessibility tests
npm run test:desktop
```

---

## 4. End-to-End Validation Scenarios

### Scenario 1: Bilingual English/Arabic Parity & Bidirectional Text Isolation (A-01–A-05, FR-001–FR-005)

1. **Launch App**: Start the desktop application via `npm start`.
2. **Initial English State**:
   - Verify the application shell renders in English (LTR).
   - Verify `document.documentElement.dir === "ltr"` and `lang === "en"`.
   - Verify typography uses the Inter font family.
3. **Switch to Arabic**:
   - Click the language toggle button in the header (or press `Mod+K` and run "تبديل اللغة").
   - **Expected Outcome**:
     - `document.documentElement.dir` updates immediately to `"rtl"`.
     - `document.documentElement.lang` updates to `"ar"`.
     - Navigation sidebar moves to the right-hand side (inline start).
     - Arabic typography activates (Noto Sans Arabic) with zero clipping on diacritics (Harakat).
4. **Bidirectional Text Inspection**:
   - Open a view containing mixed strings (e.g. `INV-2026-001`, `contact@solodesk.dev`, `USD 1,250.00`).
   - **Expected Outcome**:
     - Embedded Latin identifiers and emails remain in correct internal character order without inverted brackets or punctuation.
5. **Data Immutability Verification**:
   - Enter a user-supplied name (e.g. "Acme Corp Ltd") in an input field.
   - Switch language back to English.
   - **Expected Outcome**:
     - The entered name remains strictly identical ("Acme Corp Ltd") and is NOT translated or altered.

---

### Scenario 2: 100% Keyboard Navigation & Visible Focus Indicators (A-06–A-10, FR-017–FR-021)

1. **Skip to Main Content**:
   - Reload the application shell.
   - Press `Tab` once from the initial window state.
   - **Expected Outcome**:
     - A visible high-contrast "Skip to main content" button appears at the top/start of the viewport.
     - Pressing `Enter` shifts keyboard focus immediately to `<main id="main-content">`.
2. **Tab Navigation Through Shell**:
   - Navigate sequentially using `Tab` and `Shift+Tab`.
   - **Expected Outcome**:
     - Focus moves logically through all interactive controls (skip link, sidebar toggle, navigation routes, search trigger, utilities, and footer actions).
     - Every focused element displays an unobscured, high-contrast focus indicator (minimum 2px solid ring with ≥ 3:1 contrast against adjacent background).
     - Focus is never trapped in any control or lost to `document.body`.
3. **Reduced Motion**:
   - Enable `prefers-reduced-motion: reduce` in OS display settings.
   - Collapse and expand the sidebar.
   - **Expected Outcome**:
     - Transitions occur instantaneously (< 10ms) without smooth width animations.

---

### Scenario 3: Global Command Palette (`Mod+K`) & Search Filtering (A-11–A-15, FR-013–FR-015)

1. **Invoke Palette**:
   - Focus any button in the main content area (e.g. "View planned features").
   - Press `Mod+K` (`Cmd+K` on macOS, `Ctrl+K` on Windows/Linux) or click the header search trigger.
   - **Expected Outcome**:
     - Command Palette modal opens in < 100ms.
     - Focus moves immediately into the search input.
     - Background elements receive `aria-hidden="true"`.
2. **Bilingual Search Filtering**:
   - Type `"proj"` in English; verify "Projects" appears under the Navigation category.
   - Clear input and type `"مشرو"` in Arabic; verify "المشاريع" appears in the filtered list.
   - **Expected Outcome**:
     - Real-time search filters up to 100 registered actions within 50ms per keystroke.
3. **Keyboard List Selection**:
   - Press `ArrowDown` and `ArrowUp`.
   - **Expected Outcome**:
     - Selection moves through the list items with `aria-activedescendant` updated to match the active item.
   - Press `Enter` on the selected destination.
   - **Expected Outcome**:
     - Palette executes the route change, closes immediately, and moves focus to the new view.
4. **Dismissal & Focus Restoration**:
   - Open the palette again via `Mod+K`.
   - Press `Escape` (or click the backdrop overlay).
   - **Expected Outcome**:
     - Palette closes immediately.
     - Keyboard focus returns precisely to the button that was focused prior to invoking `Mod+K`.

---

### Scenario 4: Theme Switching & WCAG 2.2 AA Contrast Compliance (A-16–A-17, FR-006–FR-008)

1. **Switch Theme Modes**:
   - Toggle theme mode between **Light**, **Dark**, and **System**.
   - **Expected Outcome**:
     - Surfaces, borders, text, and icons transition cleanly without layout shifts or unstyled flash.
     - Tokens consumed match the exact pairs defined in `docs/design/tokens.json`.
2. **Contrast Audit**:
   - Run automated contrast inspection tool (axe-core):
   - **Expected Outcome**:
     - Body text on background: ≥ 4.5:1.
     - Headings and large titles: ≥ 3:1.
     - Control borders and focus rings: ≥ 3:1.
     - Zero contrast violations reported.
3. **System Mode Adaptation**:
   - Set theme to "System".
   - Toggle operating system dark mode setting.
   - **Expected Outcome**:
     - Shell dynamically adapts theme to match OS setting without application reload.

---

### Scenario 5: 200% Zoom Reflow & Minimum Dimensions (A-18–A-19, FR-022)

1. **Minimum Dimensions (1024×768)**:
   - Resize window to product test minimum: 1024px width × 768px height.
   - **Expected Outcome**:
     - Layout maintains proportional spacing without overlapping or unreadable compression.
2. **200% Display Scaling / Zoom**:
   - Apply 200% zoom scaling (`Ctrl++` / `Cmd++` or display DPI scaling).
   - **Expected Outcome**:
     - Text wraps naturally without horizontal clipping.
     - No horizontal scrollbars appear on the root document.
     - Hit targets remain operable with minimum 44×44px interactive areas.

---

### Scenario 6: Honest Foundation Module Placeholders (A-22, FR-012, SC-008)

1. **Activate Header Utility Triggers**:
   - Click the **Workspaces** trigger:
     - Verify dialog displays "Personal Workspace" and explicitly explains multi-workspace support arrives in F012.
   - Click the **Timer** trigger:
     - Verify display shows "00:00:00 (Inactive)" with explanation that active time tracking arrives in F036.
   - Click the **Sync status** trigger:
     - Verify display shows "Local Desktop (Offline)" with explanation that Supabase cloud sync arrives in F017.
   - Click the **Notifications** trigger:
     - Verify popover displays an honest empty list ("No notifications") and roadmap reference for F022.
2. **Audit for Mock Data**:
   - **Expected Outcome**:
     - ZERO synthetic dollars (e.g. "$12,450.00"), fake client names, or artificial sync checkmarks appear in any placeholder.

---

### Scenario 7: Native Desktop Chrome & OS Shortcut Protection (A-05, A-15, FR-016, FR-023)

1. **OS Window Controls in RTL**:
   - Run on macOS: Switch to Arabic RTL. Verify traffic light buttons remain at physical top-left.
   - Run on Windows/Linux: Switch to Arabic RTL. Verify Minimize/Maximize/Close buttons remain at physical top-right.
2. **OS-Reserved Shortcuts**:
   - Press `Alt+F4` on Windows / `Cmd+Q` on macOS.
   - **Expected Outcome**:
     - The shell does not block or swallow the shortcut; window closes or quits as standard desktop convention.

---

## 5. Delivery Evidence & Linguistic Audit Checklist

Before declaring feature completion:
- [ ] Automated test suite (`test:unit`, `test:integration`, `test:desktop`) passes with 0 failures.
- [ ] axe-core accessibility audit reports 0 violations across all shell states.
- [ ] Candidate builds verified across Windows, macOS, and Linux test machines.
- [ ] Fluent Arabic reviewer signs off on all strings and typography in `packages/localization/src/shell/ar.ts`.
- [ ] Test execution records saved to `docs/qa/F005.md`.
- [ ] Final pull request presented to user for owner approval (merge gated on owner sign-off).
