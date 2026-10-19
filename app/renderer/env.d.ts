/// <reference types="vite/client" />

import type { DesktopResponse } from "../shared/desktop-contracts.ts";
import type { PersistenceStatusDto } from "../shared/persistence-contracts.ts";

declare global {
  interface Window {
    solodesk: Readonly<{
      persistence: Readonly<{
        getState: (workspaceId: string) => Promise<PersistenceStatusDto>;
        retryOpen: (workspaceId: string) => Promise<PersistenceStatusDto>;
        onStateChanged: (
          callback: (status: PersistenceStatusDto) => void,
        ) => () => void;
      }>;
      protection: Readonly<{
        getState: (...args: unknown[]) => Promise<DesktopResponse>;
        retry: (...args: unknown[]) => Promise<DesktopResponse>;
      }>;
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
