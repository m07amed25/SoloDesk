# Desktop Bridge & Window Controls Interface Contract

**Feature**: F005 — Accessible English/Arabic Application Shell  
**Module**: Desktop Titlebar, Window Lifecycle, and Preload Bridge  
**Path**: `specs/005-accessible-application-shell/contracts/desktop-bridge-contract.md`

---

## 1. Overview

This contract specifies how the application shell interacts with the Electron desktop runtime through the narrow typed preload bridge established in F004, enforcing trust boundaries (Principle II) and platform window controls placement in RTL (A-05).

---

## 2. Preload Bridge API Contract

### 2.1 Typed Interface (`window.solodesk`)

The renderer interacts exclusively with the typed API exposed on `window.solodesk`:

```typescript
export interface SoloDeskBridge {
  window: {
    getState: () => Promise<BridgeResult<WindowState>>;
    minimize: () => Promise<BridgeResult<void>>;
    restore: () => Promise<BridgeResult<void>>;
    requestClose: () => Promise<BridgeResult<void>>;
  };
  lifecycle: {
    onState: (callback: (event: LifecycleEvent) => void) => () => void;
  };
  links: {
    onDecision: (callback: (event: LinkDecisionEvent) => void) => () => void;
  };
}

export type BridgeResult<T> =
  | { status: "ok"; data: T }
  | { status: "accepted"; transition: string }
  | {
      status: "rejected" | "outcome_unknown";
      error: { code: string; message: string };
    };

export interface WindowState {
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
}

export interface LifecycleEvent {
  state: "ready" | "visible" | "minimized" | "background" | "closing";
}

export interface LinkDecisionEvent {
  status: "allowed" | "denied" | "unavailable";
  targetUrl?: string;
}
```

---

## 3. Platform Window Titlebar Layout Rules

### 3.1 macOS Native Traffic Lights (Top-Left)

- **Physical Placement**:
  - macOS native window controls (close, minimize, zoom) are placed by the operating system at the top-left corner of the window.
- **RTL Behavior (A-05)**:
  - In Arabic RTL mode, the titlebar content and user chrome mirror to align with RTL flow, but the window drag margin at the top-left remains fixed (`margin-inline-start: 72px` in LTR, or physical `left: 72px`).
  - No application controls may overlap the `0px to 72px` region from the left edge on macOS.

### 3.2 Windows & Linux Custom Window Controls (Top-Right)

- **Physical Placement**:
  - The window control buttons (Minimize, Maximize/Restore, Close) must sit at the top-right corner.
- **RTL Behavior (A-05)**:
  - The window controls container MUST use physical CSS positioning (`position: absolute; right: 0; top: 0; dir: ltr;`).
  - When the root document direction is set to `dir="rtl"`, the window control buttons MUST NOT be flipped to the top-left corner.
  - The application header content ends before the window control buttons with appropriate end padding (`padding-inline-end: 140px`).

---

## 4. Unprivileged Renderer Invariants

1. **No Node.js Integration**: The renderer process has no access to Node `process`, `require`, `fs`, `path`, or `child_process`.
2. **No Arbitrary IPC**: The renderer cannot emit arbitrary IPC events via `ipcRenderer.send()` or `ipcRenderer.invoke()`. It only calls the typed methods on `window.solodesk.window`.
3. **No External URL Navigation**: External links (`http:`, `https:`) must not open inside the Electron renderer window. They route through the secure link decision broker in the main process.
