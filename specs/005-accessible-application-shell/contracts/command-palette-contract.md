# Command Palette Interface Contract

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Module**: Global Command Palette & Quick Search (PLT-015)  
**Path**: `specs/005-accessible-application-shell/contracts/command-palette-contract.md`

---

## 1. Overview

This contract specifies the global Command Palette modal dialog (`Mod+K`), including action registry, search query indexing and filtering, keyboard navigation, focus trap, focus restoration, and OS-reserved shortcut protection.

---

## 2. Command Palette Registry Interface

### 2.1 Action Model & Context

```typescript
export type CommandCategory = "navigation" | "actions" | "preferences";

export interface CommandPaletteAction {
  id: string;
  category: CommandCategory;
  titleKey: string;
  keywords: readonly string[];
  shortcutBadge?: string;
  iconName: string;
  execute: () => void;
  enabled: boolean;
}

export interface CommandPaletteContextValue {
  /**
   * Whether the command palette modal dialog is currently visible.
   */
  isOpen: boolean;

  /**
   * Open the command palette dialog.
   * Optionally accepts a trigger HTMLElement for precise focus restoration on close.
   */
  open: (triggerElement?: HTMLElement | null) => void;

  /**
   * Close the command palette dialog and restore focus to triggerElement.
   */
  close: () => void;

  /**
   * Register a dynamic action into the command palette.
   * Returns an unregister cleanup function.
   */
  registerAction: (action: CommandPaletteAction) => () => void;

  /**
   * Registered actions grouped by category.
   */
  actions: readonly CommandPaletteAction[];
}
```

---

## 3. Keyboard Navigation & Accessibility Contract

### 3.1 Shortcut Invocations

1. **Global Palette Trigger**:
   - macOS: `Cmd+K` (`event.metaKey && event.key === 'k'`).
   - Windows/Linux: `Ctrl+K` (`event.ctrlKey && event.key === 'k'`).
   - Visible Header Button: Global search trigger with accessible label `t('search.placeholder')` and visual badge `Mod+K`.
2. **OS-Reserved Shortcut Safeguard (FR-016, A-15)**:
   - The shell must inspect keydown events and explicitly NEVER intercept or call `preventDefault()` on:
     - `Alt+F4`
     - `Cmd+Q` (macOS)
     - `Cmd+H` (macOS)
     - `Win+L` / `Win+*`
     - `Ctrl+Alt+Delete`
     - `Alt+Tab` / `Cmd+Tab`

### 3.2 Modal Dialog & Focus Trap

1. **Focus Trap**:
   - Upon opening, focus shifts immediately to `<input role="combobox" />`.
   - All background siblings receive `aria-hidden="true"`.
   - `Tab` and `Shift+Tab` cycle focus within the palette bounds (input, clear button, close button).
2. **Combobox & Listbox Roles**:
   - The search input:
     - `role="combobox"`
     - `aria-expanded="true"`
     - `aria-haspopup="listbox"`
     - `aria-autocomplete="list"`
     - `aria-controls="command-palette-results"`
     - `aria-activedescendant={activeItemId ? `action-${activeItemId}` : undefined}`
   - The results container:
     - `<ul id="command-palette-results" role="listbox" aria-label="Available commands">`
   - Individual options:
     - `<li id={`action-${action.id}`} role="option" aria-selected={isActive}>`
3. **Arrow Navigation**:
   - `ArrowDown`: Moves `activeItemId` to the next available item (cycles to start if at the end).
   - `ArrowUp`: Moves `activeItemId` to the previous available item (cycles to end if at the start).
   - `Enter`: Triggers `action.execute()` for the active item, closes the palette, and restores focus.
   - `Escape`: Closes the palette immediately without executing an action.
4. **Focus Restoration**:
   - When the palette closes via `Escape`, backdrop click, or action execution:
     - If `triggerElement` is defined and still mounted in the DOM, call `triggerElement.focus()`.
     - If `triggerElement` is null or unmounted, move focus gracefully to the active navigation item or main container. Focus MUST NOT be lost to `document.body`.

---

## 4. Query Normalization & Real-Time Filtering

### 4.1 Normalization Algorithm

```typescript
export function normalizeQuery(raw: string): string {
  return (
    raw
      .trim()
      .toLowerCase()
      // Strip Arabic diacritics (Harakat / Tashkeel)
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // Normalize Alef variants to bare Alef
      .replace(/[\u0622\u0623\u0625]/g, "\u0627")
      // Normalize Ta Marbuta to Ha
      .replace(/\u0629/g, "\u0647")
  );
}
```

### 4.2 Performance Contract

- For an action catalogue containing up to 100 items:
  - Query filtering execution time MUST be `< 50ms` on standard hardware (SC-004).
  - Highlighting matching substring spans in action titles must use safe string splitting without HTML injection.
