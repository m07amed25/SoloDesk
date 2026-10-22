/// <reference types="vite/client" />

import type { DesktopResponse } from "../shared/desktop-contracts.ts";
import type { PersistenceStatusDto } from "../shared/persistence-contracts.ts";
import type { ProviderQuotaProfileDto } from "../shared/cloud-contracts.ts";
import type { RendererAccountSecurityState } from "../shared/identity-security-contracts.ts";
import type { RendererIdentityState } from "../shared/identity-contracts.ts";
import type {
  WorkspaceState,
  WorkspaceCreationResult,
  WorkspaceSwitchResult,
} from "../shared/workspace-contracts.ts";

export type WorkspaceApi = Readonly<{
  getState: () => Promise<WorkspaceState | null>;
  refresh: () => Promise<WorkspaceState | null>;
  create: (request: unknown) => Promise<WorkspaceCreationResult | null>;
  reconcileCreation: (
    intentId: string,
  ) => Promise<WorkspaceCreationResult | null>;
  switch: (request: unknown) => Promise<WorkspaceSwitchResult | null>;
  onStateChanged: (callback: (state: WorkspaceState) => void) => () => void;
}>;

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

export type IdentityApi = Readonly<{
  getState: () => Promise<RendererIdentityState>;
  startSignIn: () => Promise<RendererIdentityState>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<RendererIdentityState>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<RendererIdentityState>;
  cancelSignIn: () => Promise<RendererIdentityState>;
  confirmEnrollment: (label?: string) => Promise<RendererIdentityState>;
  retryReconciliation: () => Promise<RendererIdentityState>;
  signOut: () => Promise<RendererIdentityState>;
  confirmAccountSwitch: () => Promise<RendererIdentityState>;
  onStateChanged: (callback: (state: RendererIdentityState) => void) => () => void;
}>;

declare global {
  interface Window {
    identitySecurity?: IdentitySecurityApi;
    solodesk: Readonly<{
      identity: IdentityApi;
      workspace?: WorkspaceApi;
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
