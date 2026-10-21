/// <reference types="vite/client" />

import type { DesktopResponse } from "../shared/desktop-contracts.ts";
import type { PersistenceStatusDto } from "../shared/persistence-contracts.ts";
import type { ProviderQuotaProfileDto } from "../shared/cloud-contracts.ts";
import type { RendererAccountSecurityState } from "../shared/identity-security-contracts.ts";

export type IdentitySecurityApi = Readonly<{
  getState: () => Promise<RendererAccountSecurityState>;
  start: (action?: string) => Promise<RendererAccountSecurityState>;
  cancel: () => Promise<RendererAccountSecurityState>;
  acknowledgeRecoveryCodes: () => Promise<RendererAccountSecurityState>;
  retryReconciliation: () => Promise<RendererAccountSecurityState>;
  onStateChanged: (
    callback: (state: RendererAccountSecurityState) => void,
  ) => () => void;
}>;

declare global {
  interface Window {
    identitySecurity?: IdentitySecurityApi;
    solodesk: Readonly<{
      identitySecurity?: IdentitySecurityApi;
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
      cloud?: Readonly<{
        getQuota?: (workspaceId: string) => Promise<ProviderQuotaProfileDto>;
        onQuotaChanged?: (
          callback: (profile: ProviderQuotaProfileDto) => void,
        ) => () => void;
        onStatusChanged?: (
          callback: (payload: { state: string; reason?: string }) => void,
        ) => () => void;
      }>;
    }>;
  }
}
