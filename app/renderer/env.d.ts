/// <reference types="vite/client" />

import type { DesktopResponse } from "../shared/desktop-contracts.ts";

declare global {
  interface Window {
    solodesk: Readonly<{
      window: Readonly<{
        getState: (...args: unknown[]) => Promise<DesktopResponse>;
        minimize: (...args: unknown[]) => Promise<DesktopResponse>;
        restore: (...args: unknown[]) => Promise<DesktopResponse>;
        requestClose: (...args: unknown[]) => Promise<DesktopResponse>;
      }>;
      lifecycle: Readonly<{
        onState: (callback: (event: unknown) => void) => () => void;
      }>;
      links: Readonly<{
        onDecision: (callback: (event: unknown) => void) => () => void;
      }>;
    }>;
  }
}
