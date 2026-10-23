import type {
  WindowState,
  DesktopResponse,
} from "../../shared/desktop-contracts.ts";

export type { WindowState, DesktopResponse };

export interface LifecycleEvent {
  state: "ready" | "visible" | "minimized" | "background" | "closing";
}

export interface LinkDecisionEvent {
  status: "allowed" | "denied" | "unavailable";
  targetUrl?: string;
}

export type BridgeResult<T> =
  | { status: "ok"; data: T }
  | { status: "accepted"; transition: string }
  | {
      status: "rejected" | "outcome_unknown";
      error: { code: string; messageKey?: string; recovery?: string };
    };

export interface SoloDeskBridgeClient {
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
  workspace: {
    getState: () => Promise<
      import("../../shared/workspace-contracts.ts").WorkspaceState | null
    >;
    switch: (
      targetWorkspaceId: string,
      expectedSelectionGeneration: number,
    ) => Promise<
      import("../../shared/workspace-contracts.ts").WorkspaceSwitchResult | null
    >;
    onStateChanged: (
      callback: (
        state: import("../../shared/workspace-contracts.ts").WorkspaceState,
      ) => void,
    ) => () => void;
  };
  invitation: {
    getPolicy: (
      envelope?: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").GetInvitationPolicyResult
      | null
    >;
    list: (
      request: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").ListInvitationsResult
      | null
    >;
    create: (
      request: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").CreateInvitationResult
      | null
    >;
    resend: (
      request: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").ResendInvitationResult
      | null
    >;
    revoke: (
      request: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").RevokeInvitationResult
      | null
    >;
    reconcile: (
      request: unknown,
    ) => Promise<
      | import("../../shared/invitation-contracts.ts").ReconcileInvitationResult
      | null
    >;
  };
}

function mapResponse<T>(
  response: DesktopResponse,
  extractData: (data: unknown) => T,
): BridgeResult<T> {
  if (response.status === "ok") {
    return { status: "ok", data: extractData(response.data) };
  }
  if (response.status === "accepted") {
    return { status: "accepted", transition: response.transition };
  }
  return {
    status: response.status,
    error: {
      code: response.error.code,
      messageKey: response.error.messageKey,
      recovery: response.error.recovery,
    },
  };
}

export const bridge: SoloDeskBridgeClient = {
  window: {
    getState: async () => {
      if (typeof window !== "undefined" && window.solodesk) {
        const res = await window.solodesk.window.getState();
        return mapResponse(res, (data) => data as WindowState);
      }
      return {
        status: "ok",
        data: {
          visible: true,
          minimized: false,
          maximized: false,
          focused: true,
        },
      };
    },
    minimize: async () => {
      if (typeof window !== "undefined" && window.solodesk) {
        const res = await window.solodesk.window.minimize();
        return mapResponse(res, () => undefined);
      }
      return { status: "ok", data: undefined };
    },
    restore: async () => {
      if (typeof window !== "undefined" && window.solodesk) {
        const res = await window.solodesk.window.restore();
        return mapResponse(res, () => undefined);
      }
      return { status: "ok", data: undefined };
    },
    requestClose: async () => {
      if (typeof window !== "undefined" && window.solodesk) {
        const res = await window.solodesk.window.requestClose();
        return mapResponse(res, () => undefined);
      }
      return { status: "ok", data: undefined };
    },
  },
  lifecycle: {
    onState: (callback) => {
      if (typeof window !== "undefined" && window.solodesk) {
        return window.solodesk.lifecycle.onState((event) => {
          callback(event as LifecycleEvent);
        });
      }
      return () => {};
    },
  },
  links: {
    onDecision: (callback) => {
      if (typeof window !== "undefined" && window.solodesk) {
        return window.solodesk.links.onDecision((event) => {
          callback(event as LinkDecisionEvent);
        });
      }
      return () => {};
    },
  },
  workspace: {
    getState: async () => {
      if (typeof window !== "undefined" && window.solodesk?.workspace) {
        return window.solodesk.workspace.getState();
      }
      return null;
    },
    switch: async (
      targetWorkspaceId: string,
      expectedSelectionGeneration: number,
    ) => {
      if (typeof window !== "undefined" && window.solodesk?.workspace) {
        return window.solodesk.workspace.switch({
          targetWorkspaceId,
          expectedSelectionGeneration,
        });
      }
      return null;
    },
    onStateChanged: (callback) => {
      if (typeof window !== "undefined" && window.solodesk?.workspace) {
        return window.solodesk.workspace.onStateChanged(callback);
      }
      return () => {};
    },
  },
  invitation: {
    getPolicy: async (envelope?: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.getPolicy(envelope);
      }
      return null;
    },
    list: async (request: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.list(request);
      }
      return null;
    },
    create: async (request: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.create(request);
      }
      return null;
    },
    resend: async (request: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.resend(request);
      }
      return null;
    },
    revoke: async (request: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.revoke(request);
      }
      return null;
    },
    reconcile: async (request: unknown) => {
      if (typeof window !== "undefined" && window.solodesk?.invitation) {
        return window.solodesk.invitation.reconcile(request);
      }
      return null;
    },
  },
};
