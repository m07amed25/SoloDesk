# Navigation & Shell Layout Interface Contract

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Module**: Primary Navigation, Breadcrumbs, and Sidebar Rail  
**Path**: `specs/005-accessible-application-shell/contracts/navigation-contract.md`

---

## 1. Overview

This contract specifies the navigation registry, route definitions, sidebar rail behavior, breadcrumb hierarchy, and landmark semantics matching `UI-001 Desktop shell` from `docs/design/screens.md`.

---

## 2. Navigation Registry Interface

### 2.1 Route Model & Navigation Context

```typescript
export type RouteId =
  | "overview"
  | "my-work"
  | "projects"
  | "clients"
  | "time"
  | "finance"
  | "reports"
  | "knowledge"
  | "settings";

export interface RouteDefinition {
  id: RouteId;
  path: string;
  labelKey: string;
  iconName: string;
  status: "active" | "placeholder";
  targetPhase: string;
  order: number;
}

export interface NavigationContextValue {
  /**
   * Currently active route ID.
   */
  activeRoute: RouteId;

  /**
   * Navigate to a destination route.
   */
  navigateTo: (routeId: RouteId) => void;

  /**
   * Whether the sidebar is in collapsed (icon-only) mode.
   */
  isSidebarCollapsed: boolean;

  /**
   * Toggle sidebar between expanded and collapsed modes.
   */
  toggleSidebar: () => void;

  /**
   * Current breadcrumb segments for the active route.
   */
  breadcrumbs: ReadonlyArray<{
    label: string;
    routeId?: RouteId;
    isCurrent: boolean;
  }>;
}
```

---

## 3. Component Interaction & Accessibility Contracts

### 3.1 Primary Sidebar Rail (`<nav aria-label="Main Navigation">`)

1. **Landmark & Hierarchy**:
   - The sidebar container must render as `<nav role="navigation" aria-label="Main Navigation">`.
   - Links must be rendered as `<button>` or `<a>` elements within an unordered list (`<ul role="list">`).
2. **Active State Semantics**:
   - The active navigation item must expose `aria-current="page"`.
   - The active item must have a distinct visual background (`var(--sidebar-accent)`), text color (`var(--sidebar-accent-foreground)`), and high-contrast start indicator.
3. **Collapsed Rail Mode**:
   - When `isSidebarCollapsed === true`:
     - Sidebar width contracts to `64px`.
     - Route labels are hidden from visible flow (`display: none` or collapsed container).
     - Each icon button exposes an accessible tooltip using `@base-ui/react` tooltip primitives with `role="tooltip"`.
     - Tooltips trigger on both mouse hover and keyboard focus.
     - The toggle control exposes `aria-expanded="false"` and `aria-label="Expand sidebar"`.
   - When `isSidebarCollapsed === false`:
     - Sidebar width expands to `240px`.
     - Labels and icons render inline.
     - Tooltips are disabled.
     - The toggle control exposes `aria-expanded="true"` and `aria-label="Collapse sidebar"`.
4. **Keyboard Accessibility**:
   - All navigation items must be operable via `Tab` / `Shift+Tab` and activated with `Enter` or `Space`.

---

### 3.2 Breadcrumb Trail (`<nav aria-label="Breadcrumb">`)

1. **Markup & Semantics**:
   - Rendered as `<nav aria-label="Breadcrumb">` containing an ordered list `<ol role="list">`.
   - Current page item must expose `aria-current="location"` or `aria-current="page"`.
   - Separator icons (e.g. `ChevronRight` in LTR, mirrored `ChevronLeft` in RTL) must have `aria-hidden="true"`.
2. **Directional Awareness**:
   - Breadcrumb items flow inline according to document direction:
     - In LTR: Left to right.
     - In RTL: Right to left.

---

### 3.3 Skip to Main Content Link (`#main-content`)

1. **DOM Placement**:
   - Must be the first interactive element in the document body:
     ```html
     <a
       href="#main-content"
       class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
     >
       Skip to main content
     </a>
     ```
2. **Target Destination**:
   - Primary content container must have `id="main-content"` and `tabIndex={-1}` to receive programmatic focus when the skip link is activated.
