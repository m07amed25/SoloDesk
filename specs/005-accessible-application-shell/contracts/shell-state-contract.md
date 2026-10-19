# Shell State & Localization Interface Contract

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Module**: Shell State, Localization, and Theme Management  
**Path**: `specs/005-accessible-application-shell/contracts/shell-state-contract.md`  

---

## 1. Overview

This contract specifies the TypeScript interfaces, state management signatures, and lifecycle guarantees for localization, directionality, and theme management within the SoloDesk renderer.

---

## 2. Localization & Directionality Contract

### 2.1 Interface Definition

```typescript
export type SupportedLocale = 'en' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface LocalizationContextValue {
  /**
   * Currently active locale ('en' or 'ar').
   */
  locale: SupportedLocale;

  /**
   * Layout direction for current locale ('ltr' or 'rtl').
   */
  direction: TextDirection;

  /**
   * Set the active locale, updating root attributes and persisting choice.
   */
  setLocale: (locale: SupportedLocale) => void;

  /**
   * Toggle between 'en' and 'ar'.
   */
  toggleLocale: () => void;

  /**
   * Look up a translated message by key, with optional parameter interpolation.
   * If key is not found, returns the key itself as a fallback.
   */
  t: (key: string, params?: Record<string, string | number>) => string;

  /**
   * Format an entity or mixed string with directional isolation.
   * Wraps the content in a <bdi> element with appropriate direction markers.
   */
  isolateBidi: (text: string) => string;
}
```

### 2.2 Lifecycle & DOM Synchronization Rules

1. **Root HTML Element Synchronization**:
   - When `locale === 'ar'`:
     - `document.documentElement.setAttribute('dir', 'rtl')`
     - `document.documentElement.setAttribute('lang', 'ar')`
     - `document.documentElement.style.fontFamily = 'var(--font-arabic)'`
   - When `locale === 'en'`:
     - `document.documentElement.setAttribute('dir', 'ltr')`
     - `document.documentElement.setAttribute('lang', 'en')`
     - `document.documentElement.style.fontFamily = 'var(--font-sans)'`
2. **Instant State Transition**:
   - Direction and language attributes must update synchronously within a single animation frame (< 16ms) without full page reload or unstyled layout flash.
3. **Data Immutability Guarantee**:
   - The `t()` function only evaluates application-level chrome, labels, status text, and placeholders.
   - User data (such as legal client names, project titles, monetary figures, or task summaries) is NEVER passed through `t()` or modified by locale changes.

---

## 3. Theme & Token Contract

### 3.1 Interface Definition

```typescript
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /**
   * User configured theme mode preference ('light', 'dark', or 'system').
   */
  mode: ThemeMode;

  /**
   * Computed effective theme ('light' or 'dark') applied to the DOM.
   */
  resolvedTheme: ResolvedTheme;

  /**
   * Indicates if the operating system is enforcing high contrast / forced colors.
   */
  forcedColorsActive: boolean;

  /**
   * Update theme preference and synchronize DOM classes and persistence.
   */
  setTheme: (mode: ThemeMode) => void;
}
```

### 3.2 DOM & Token Synchronization Rules

1. **Theme Class Application**:
   - If `resolvedTheme === 'dark'`, `document.documentElement.classList.add('dark')`.
   - If `resolvedTheme === 'light'`, `document.documentElement.classList.remove('dark')`.
2. **OS Media Query Listener**:
   - When `mode === 'system'`, attach a persistent listener to:
     ```typescript
     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
     mediaQuery.addEventListener('change', (e) => {
       if (currentMode === 'system') {
         applyTheme(e.matches ? 'dark' : 'light');
       }
     });
     ```
   - Automatically unbind listener on unmount.
3. **Forced Colors Mode**:
   - High contrast forced colors listener:
     ```typescript
     const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
     ```
   - When active, ensure all interactive buttons and focus rings expose solid 2px borders using system color tokens (`ButtonBorder`, `Highlight`).

---

## 4. Preference Persistence Contract

### 4.1 Storage Schema & Fail-Closed Guard

```typescript
export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface UserPreferencesManager {
  /**
   * Load stored preferences synchronously at startup.
   * Returns DEFAULT_USER_PREFERENCES if data is missing, corrupted, or schema mismatch.
   */
  load: () => UserPreferenceRecord;

  /**
   * Save partial or complete preferences.
   * Atomically writes to local storage adapter.
   */
  save: (patch: Partial<UserPreferenceRecord>) => void;
}
```

### 4.2 Error Handling & Recovery

- If `localStorage.getItem('solodesk_shell_prefs')` throws `SecurityError`, `QuotaExceededError`, or returns malformed JSON, the manager:
  1. Catches the error cleanly without bubbling.
  2. Sets in-memory state to `DEFAULT_USER_PREFERENCES` (`en`, `system`, expanded sidebar).
  3. Emits a non-fatal warning to the internal diagnostics logger.
  4. Keeps the application shell running smoothly.
