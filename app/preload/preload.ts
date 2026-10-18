import { contextBridge, ipcRenderer } from "electron";
import {
  boundedEvent,
  safeError,
  validateResponse,
  type DesktopResponse,
} from "../shared/desktop-contracts.ts";

type Family = "lifecycle" | "links";
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
    (event.family !== "lifecycle" && event.family !== "links")
  )
    return;
  const listener = listeners.get(event.subscriptionId);
  const data = boundedEvent(event.data);
  if (data === null) return;
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

const facade = Object.freeze({
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
