import { contextBridge, ipcRenderer } from "electron";
import {
  boundedEvent,
  safeError,
  validateResponse,
  type DesktopResponse,
} from "../shared/desktop-contracts.ts";
import {
  isWorkspaceId,
  sanitizePersistenceStatus,
  type PersistenceStatusDto,
} from "../shared/persistence-contracts.ts";
import {
  isRendererIdentityState,
  sanitizeRendererState,
  validateIdentityResponse,
  type IdentityMethod,
  type RendererIdentityState,
} from "../shared/identity-contracts.ts";

type Family = "lifecycle" | "links" | "persistence" | "identity";
type Listener = (event: unknown) => void;
const listeners = new Map<string, { family: Family; callback: Listener }>();
const pendingEvents = new Map<string, { family: Family; data: unknown }>();

function newRequestId() {
  return Object.freeze({
    kind: "request" as const,
    value: globalThis.crypto.randomUUID(),
  });
}

function rejected(requestId: ReturnType<typeof newRequestId>): DesktopResponse {
  return {
    version: 1,
    requestId,
    status: "rejected",
    error: safeError("VALIDATION"),
  };
}

async function invoke(
  method: string,
  args: readonly unknown[],
): Promise<DesktopResponse> {
  const requestId = newRequestId();
  if (args.length !== 0) return rejected(requestId);
  const request = Object.freeze({
    version: 1,
    requestId,
    payload: Object.freeze({}),
  });
  try {
    const response: unknown = await ipcRenderer.invoke(
      `f004:${method}`,
      request,
    );
    const checked = validateResponse(response, requestId);
    if (checked.ok) return checked.value;
  } catch {
    // A lost reply may follow a native effect. Do not claim that it was not applied.
  }
  return {
    version: 1,
    requestId,
    status: "outcome_unknown",
    error: safeError("OUTCOME_UNKNOWN", "unknown"),
  };
}

ipcRenderer.on("f004:event", (_nativeEvent, input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const event = input as Record<string, unknown>;
  if (
    Object.keys(event).length !== 3 ||
    typeof event.subscriptionId !== "string" ||
    (event.family !== "lifecycle" &&
      event.family !== "links" &&
      event.family !== "persistence" &&
      event.family !== "identity")
  )
    return;
  const listener = listeners.get(event.subscriptionId);
  const data = boundedEvent(event.data);
  if (data === null) return;
  if (event.family === "persistence" && !sanitizePersistenceStatus(data))
    return;
  if (event.family === "identity" && !isRendererIdentityState(data)) return;
  if (listener?.family === event.family) listener.callback(data);
  else if (pendingEvents.size < 32)
    pendingEvents.set(event.subscriptionId, { family: event.family, data });
});

function subscribe(family: Family, callback: Listener): () => void {
  if (typeof callback !== "function") return () => {};
  let active = true;
  let subscriptionId: string | undefined;
  const method =
    family === "lifecycle" ? "lifecycle.onState" : "links.onDecision";
  void invoke(method, []).then((response) => {
    if (
      response.status !== "ok" ||
      !("subscriptionId" in response.data) ||
      typeof response.data.subscriptionId !== "string"
    )
      return;
    subscriptionId = response.data.subscriptionId;
    if (active) {
      listeners.set(subscriptionId, { family, callback });
      const pending = pendingEvents.get(subscriptionId);
      if (pending?.family === family) callback(pending.data);
      pendingEvents.delete(subscriptionId);
    } else ipcRenderer.send("f004:subscription:remove", { subscriptionId });
  });
  return () => {
    active = false;
    if (subscriptionId) {
      listeners.delete(subscriptionId);
      pendingEvents.delete(subscriptionId);
      ipcRenderer.send("f004:subscription:remove", { subscriptionId });
    }
  };
}

async function invokePersistence(
  method: "getState" | "retryOpen",
  workspaceId: string,
): Promise<PersistenceStatusDto> {
  if (!isWorkspaceId(workspaceId)) throw new Error("persistence_unavailable");
  try {
    const response: unknown = await ipcRenderer.invoke(
      `solodesk.persistence.${method}`,
      { workspaceId },
    );
    if (
      response &&
      typeof response === "object" &&
      "status" in response &&
      response.status === "ok" &&
      "data" in response
    ) {
      const safe = sanitizePersistenceStatus(response.data);
      if (safe && safe.workspaceId === workspaceId) return safe;
    }
  } catch {
    /* IPC errors remain inside preload. */
  }
  throw new Error("persistence_unavailable");
}

function subscribePersistence(
  callback: (state: PersistenceStatusDto) => void,
): () => void {
  if (typeof callback !== "function") return () => {};
  let active = true;
  let subscriptionId: string | undefined;
  void ipcRenderer
    .invoke("solodesk.persistence.onStateChanged")
    .then((response: unknown) => {
      if (
        !response ||
        typeof response !== "object" ||
        !("subscriptionId" in response) ||
        typeof response.subscriptionId !== "string" ||
        !/^[0-9a-f-]{36}$/.test(response.subscriptionId)
      )
        return;
      subscriptionId = response.subscriptionId;
      if (active) {
        const deliver = (value: unknown) => {
          const safe = sanitizePersistenceStatus(value);
          if (safe) callback(safe);
        };
        listeners.set(subscriptionId, {
          family: "persistence",
          callback: deliver,
        });
        const pending = pendingEvents.get(subscriptionId);
        if (pending?.family === "persistence") deliver(pending.data);
        pendingEvents.delete(subscriptionId);
      } else ipcRenderer.send("f004:subscription:remove", { subscriptionId });
    })
    .catch(() => {});
  return () => {
    active = false;
    if (subscriptionId) {
      listeners.delete(subscriptionId);
      ipcRenderer.send("f004:subscription:remove", { subscriptionId });
    }
  };
}

async function invokeIdentity(
  method: IdentityMethod,
  payload: Record<string, unknown> = {},
): Promise<RendererIdentityState> {
  const requestId = newRequestId();
  const request = Object.freeze({
    version: 1 as const,
    requestId,
    method,
    payload: Object.freeze({ ...payload }),
  });
  try {
    const response: unknown = await ipcRenderer.invoke(
      `solodesk.${method}`,
      request,
    );
    const checked = validateIdentityResponse(response, requestId);
    if (checked.ok && checked.value.status === "ok") {
      const data = checked.value.data;
      if (isRendererIdentityState(data)) {
        return sanitizeRendererState(data);
      }
    }
  } catch {
    /* IPC errors remain inside preload. */
  }
  throw new Error("identity_unavailable");
}

function subscribeIdentity(
  callback: (state: RendererIdentityState) => void,
): () => void {
  if (typeof callback !== "function") return () => {};
  let active = true;
  let subscriptionId: string | undefined;
  void ipcRenderer
    .invoke("solodesk.identity.onStateChanged")
    .then((response: unknown) => {
      if (
        !response ||
        typeof response !== "object" ||
        !("subscriptionId" in response) ||
        typeof response.subscriptionId !== "string" ||
        !/^[0-9a-f-]{36}$/.test(response.subscriptionId)
      )
        return;
      subscriptionId = response.subscriptionId;
      if (active) {
        const deliver = (value: unknown) => {
          if (isRendererIdentityState(value))
            callback(sanitizeRendererState(value));
        };
        listeners.set(subscriptionId, {
          family: "identity",
          callback: deliver,
        });
        const pending = pendingEvents.get(subscriptionId);
        if (
          pending?.family === "identity" &&
          isRendererIdentityState(pending.data)
        ) {
          deliver(pending.data);
        }
        pendingEvents.delete(subscriptionId);
      } else ipcRenderer.send("f004:subscription:remove", { subscriptionId });
    })
    .catch(() => {});
  return () => {
    active = false;
    if (subscriptionId) {
      listeners.delete(subscriptionId);
      pendingEvents.delete(subscriptionId);
      ipcRenderer.send("f004:subscription:remove", { subscriptionId });
    }
  };
}

const facade = Object.freeze({
  identity: Object.freeze({
    getState: () => invokeIdentity("identity.getState"),
    startSignIn: () => invokeIdentity("identity.startSignIn"),
    cancelSignIn: () => invokeIdentity("identity.cancelSignIn"),
    confirmEnrollment: (label?: string) =>
      invokeIdentity(
        "identity.confirmEnrollment",
        label !== undefined ? { label } : {},
      ),
    retryReconciliation: () => invokeIdentity("identity.retryReconciliation"),
    signOut: () => invokeIdentity("identity.signOut"),
    confirmAccountSwitch: () => invokeIdentity("identity.confirmAccountSwitch"),
    onStateChanged: (callback: (state: RendererIdentityState) => void) =>
      subscribeIdentity(callback),
  }),
  persistence: Object.freeze({
    getState: (workspaceId: string) =>
      invokePersistence("getState", workspaceId),
    retryOpen: (workspaceId: string) =>
      invokePersistence("retryOpen", workspaceId),
    onStateChanged: (callback: (state: PersistenceStatusDto) => void) =>
      subscribePersistence(callback),
  }),
  protection: Object.freeze({
    getState: (...args: unknown[]) => invoke("protection.getState", args),
    retry: (...args: unknown[]) => invoke("protection.retry", args),
  }),
  window: Object.freeze({
    getState: (...args: unknown[]) => invoke("window.getState", args),
    minimize: (...args: unknown[]) => invoke("window.minimize", args),
    restore: (...args: unknown[]) => invoke("window.restore", args),
    requestClose: (...args: unknown[]) => invoke("window.requestClose", args),
  }),
  lifecycle: Object.freeze({
    onState: (callback: Listener) => subscribe("lifecycle", callback),
  }),
  links: Object.freeze({
    onDecision: (callback: Listener) => subscribe("links", callback),
  }),
});

contextBridge.exposeInMainWorld("solodesk", facade);
