import type {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents,
  WebFrameMain,
} from "electron";
import type { Id } from "../../packages/domain/src/ids.ts";
import type { ProtectionResult } from "../shared/protection-contracts.ts";
import {
  isPersistenceRequest,
  sanitizePersistenceStatus,
  type PersistenceIpcResponse,
  type PersistenceStatusDto,
} from "../shared/persistence-contracts.ts";
import {
  IDENTITY_METHODS,
  isRendererIdentityState,
  sanitizeRendererState,
  validateIdentityRequest,
  type IdentityCommandResponse,
  type IdentityMethod,
  type RendererIdentityState,
} from "../shared/identity-contracts.ts";
import { plainData } from "../../packages/contracts/src/validation.ts";
import {
  METHODS,
  boundedEvent,
  safeError,
  validateRequest,
  type DesktopResponse,
  type WindowState,
} from "../shared/desktop-contracts.ts";

type Frame = Pick<WebFrameMain, "url" | "isDestroyed">;
type Contents = Pick<WebContents, "mainFrame" | "isDestroyed" | "getURL">;
export type WindowBinding = {
  contents: Contents;
  frame: Frame;
  origin: string;
  documentUrl: string;
  profileId: string;
  epoch: number;
};
type CallerEvent = { sender: Contents; senderFrame: Frame | null };
type CurrentContext = {
  state: string;
  epoch: number | undefined;
  authority: boolean;
};
type EventFamily = "lifecycle" | "links" | "persistence" | "identity";

function documentOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "solodesk-app:" && parsed.host === "ui")
      return "solodesk-app://ui";
    return parsed.origin === "null" ? null : parsed.origin;
  } catch {
    return null;
  }
}

export function admitCaller(
  event: CallerEvent,
  binding: WindowBinding | undefined,
  current: CurrentContext,
): boolean {
  if (
    !binding ||
    current.state !== "ready" ||
    !current.authority ||
    current.epoch !== binding.epoch ||
    event.sender !== binding.contents ||
    event.senderFrame !== binding.frame ||
    binding.contents.isDestroyed() ||
    binding.frame.isDestroyed() ||
    binding.contents.mainFrame !== binding.frame ||
    binding.frame.url !== binding.documentUrl ||
    binding.contents.getURL() !== binding.documentUrl ||
    documentOrigin(binding.frame.url) !== binding.origin
  )
    return false;
  return true;
}

export class SubscriptionRegistry {
  private readonly entries = new Map<
    string,
    { binding: WindowBinding; family: EventFamily }
  >();

  add(binding: WindowBinding, family: EventFamily): string {
    const id = globalThis.crypto.randomUUID();
    this.entries.set(id, { binding, family });
    return id;
  }

  remove(subscriptionId: string, binding: WindowBinding): void {
    if (this.entries.get(subscriptionId)?.binding === binding)
      this.entries.delete(subscriptionId);
  }

  invalidate(binding: WindowBinding): void {
    for (const [id, item] of this.entries)
      if (item.binding === binding) this.entries.delete(id);
  }

  deliver(
    binding: WindowBinding,
    family: EventFamily,
    data: unknown,
  ): readonly { subscriptionId: string; data: unknown }[] {
    const safe = boundedEvent(data);
    if (safe === null) return [];
    return [...this.entries]
      .filter(([, item]) => item.binding === binding && item.family === family)
      .map(([subscriptionId]) => ({ subscriptionId, data: safe }));
  }
}

type NativeBinding = WindowBinding & {
  window: BrowserWindow;
  contents: WebContents;
  frame: WebFrameMain;
};
type BridgeOptions = {
  state: () => string;
  epoch: (profileId: string) => number | undefined;
  authority?: (profileId: string, epoch: number) => boolean;
  protectionState?: (profileId: string, epoch: number) => ProtectionResult;
  persistenceState?: (
    profileId: string,
    epoch: number,
    workspaceId: string,
    retry: boolean,
  ) => Promise<PersistenceStatusDto | null>;
  activePersistenceState?: (
    profileId: string,
    epoch: number,
  ) => PersistenceStatusDto | null;
  identityState?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null> | RendererIdentityState | null;
  startSignIn?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null>;
  cancelSignIn?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null>;
  confirmEnrollment?: (
    profileId: string,
    epoch: number,
    label?: string,
  ) => Promise<RendererIdentityState | null>;
  retryReconciliation?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null>;
  signOut?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null>;
  confirmAccountSwitch?: (
    profileId: string,
    epoch: number,
  ) => Promise<RendererIdentityState | null>;
};

export class DesktopBridge {
  private readonly bindings = new WeakMap<WebContents, NativeBinding>();
  private readonly subscriptions = new SubscriptionRegistry();
  private readonly pendingLinkDecision = new WeakMap<WebContents, unknown>();
  private readonly options: BridgeOptions;

  constructor(options: BridgeOptions) {
    this.options = options;
  }

  bind(
    window: BrowserWindow,
    profileId: string,
    epoch: number,
    origin: string,
    documentUrl: string,
  ): void {
    const contents = window.webContents;
    const binding: NativeBinding = {
      window,
      contents,
      frame: contents.mainFrame,
      origin,
      documentUrl,
      profileId,
      epoch,
    };
    this.bindings.set(contents, binding);
    contents.once("destroyed", () => this.invalidate(binding));
    let loaded = false;
    contents.once("did-finish-load", () => {
      loaded = true;
    });
    contents.on("did-start-navigation", (details) => {
      if (!loaded || !details.isMainFrame || details.isSameDocument) return;
      if (details.url !== documentUrl) {
        this.invalidate(binding);
        return;
      }
      // Vite reloads the same trusted page during startup and after edits.
      // Its old renderer subscriptions must not survive the new document.
      this.subscriptions.invalidate(binding);
    });
    contents.on(
      "did-frame-navigate",
      (_event, url, _code, _text, isMainFrame) => {
        if (!isMainFrame || this.bindings.get(contents) !== binding) return;
        if (url !== documentUrl) this.invalidate(binding);
        else binding.frame = contents.mainFrame;
      },
    );
    window.once("closed", () => this.invalidate(binding));
  }

  private invalidate(binding: NativeBinding): void {
    this.subscriptions.invalidate(binding);
    this.pendingLinkDecision.delete(binding.contents);
    this.bindings.delete(binding.contents);
  }

  dispose(contents: WebContents): void {
    const binding = this.bindings.get(contents);
    if (binding) this.invalidate(binding);
  }

  private context(binding: NativeBinding | undefined): CurrentContext {
    return {
      state: this.options.state(),
      epoch: binding && this.options.epoch(binding.profileId),
      authority: Boolean(
        binding &&
        (this.options.authority?.(binding.profileId, binding.epoch) ?? true),
      ),
    };
  }

  async invoke(
    method: string,
    event: IpcMainInvokeEvent,
    input: unknown,
  ): Promise<DesktopResponse> {
    const checked = validateRequest(method, input);
    const requestId: Id<"request"> = checked.ok
      ? checked.value.requestId
      : Object.freeze({
          kind: "request",
          value: globalThis.crypto.randomUUID(),
        });
    const base = { version: 1 as const, requestId };
    if (!checked.ok)
      return { ...base, status: "rejected", error: safeError(checked.code) };
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)))
      return { ...base, status: "rejected", error: safeError("FORBIDDEN") };
    if (!binding || binding.window.isDestroyed())
      return {
        ...base,
        status: "rejected",
        error: safeError("RESOURCE_UNAVAILABLE"),
      };

    if (method === "lifecycle.onState" || method === "links.onDecision") {
      const family = method === "lifecycle.onState" ? "lifecycle" : "links";
      const subscriptionId = this.subscriptions.add(binding, family);
      if (family === "links") {
        const pending = this.pendingLinkDecision.get(binding.contents);
        if (pending) {
          binding.contents.send("f004:event", {
            family,
            subscriptionId,
            data: pending,
          });
          this.pendingLinkDecision.delete(binding.contents);
        }
      }
      return { ...base, status: "ok", data: { subscriptionId } };
    }

    try {
      if (method === "protection.getState" || method === "protection.retry") {
        const data = this.options.protectionState?.(
          binding.profileId,
          binding.epoch,
        );
        if (!data)
          return {
            ...base,
            status: "rejected",
            error: safeError("RESOURCE_UNAVAILABLE"),
          };
        return { ...base, status: "ok", data };
      }
      if (method === "window.getState") {
        const data: WindowState = {
          visible: binding.window.isVisible(),
          minimized: binding.window.isMinimized(),
          maximized: binding.window.isMaximized(),
          focused: binding.window.isFocused(),
        };
        return { ...base, status: "ok", data };
      }
      if (method === "window.minimize") binding.window.minimize();
      else if (method === "window.restore") {
        if (binding.window.isMinimized()) {
          binding.window.restore();
        } else if (binding.window.isMaximized()) {
          binding.window.unmaximize();
        } else {
          binding.window.maximize();
        }
        binding.window.focus();
      } else if (method === "window.requestClose") {
        setTimeout(() => {
          if (!binding.window.isDestroyed()) binding.window.close();
        }, 0);
        return { ...base, status: "accepted", transition: "closing" };
      } else
        return {
          ...base,
          status: "rejected",
          error: safeError("RESOURCE_UNAVAILABLE"),
        };
      return { ...base, status: "ok", data: {} };
    } catch {
      return {
        ...base,
        status: "outcome_unknown",
        error: safeError("OUTCOME_UNKNOWN", "unknown"),
      };
    }
  }

  async invokePersistence(
    method: "getState" | "retryOpen",
    event: IpcMainInvokeEvent,
    input: unknown,
  ): Promise<PersistenceIpcResponse> {
    if (!isPersistenceRequest(input))
      return { status: "rejected", code: "VALIDATION" };
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)) || !binding)
      return { status: "rejected", code: "FORBIDDEN" };
    try {
      const data = await this.options.persistenceState?.(
        binding.profileId,
        binding.epoch,
        input.workspaceId,
        method === "retryOpen",
      );
      const safe = sanitizePersistenceStatus(data);
      if (!safe || safe.workspaceId !== input.workspaceId)
        return { status: "rejected", code: "RESOURCE_UNAVAILABLE" };
      return { status: "ok", data: safe };
    } catch {
      return { status: "rejected", code: "RESOURCE_UNAVAILABLE" };
    }
  }

  subscribePersistence(
    event: IpcMainInvokeEvent,
  ): { subscriptionId: string } | null {
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)) || !binding)
      return null;
    const subscriptionId = this.subscriptions.add(binding, "persistence");
    const current = sanitizePersistenceStatus(
      this.options.activePersistenceState?.(binding.profileId, binding.epoch),
    );
    if (current)
      queueMicrotask(() => {
        if (!binding.contents.isDestroyed())
          binding.contents.send("f004:event", {
            family: "persistence",
            subscriptionId,
            data: current,
          });
      });
    return { subscriptionId };
  }

  async invokeIdentity(
    method: IdentityMethod,
    event: IpcMainInvokeEvent,
    input: unknown,
  ): Promise<IdentityCommandResponse> {
    const checked = validateIdentityRequest(method, input);
    const requestId: Id<"request"> = checked.ok
      ? checked.value.requestId
      : Object.freeze({
          kind: "request",
          value: globalThis.crypto.randomUUID(),
        });
    const base = { version: 1 as const, requestId };
    if (!checked.ok) {
      return {
        ...base,
        status: "error",
        error: safeError(checked.code),
      };
    }
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)) || !binding) {
      return {
        ...base,
        status: "error",
        error: safeError("FORBIDDEN"),
      };
    }

    try {
      let state: RendererIdentityState | null | undefined;
      if (method === "identity.getState") {
        state = await this.options.identityState?.(
          binding.profileId,
          binding.epoch,
        );
      } else if (method === "identity.startSignIn") {
        state = await this.options.startSignIn?.(
          binding.profileId,
          binding.epoch,
        );
      } else if (method === "identity.cancelSignIn") {
        state = await this.options.cancelSignIn?.(
          binding.profileId,
          binding.epoch,
        );
      } else if (method === "identity.confirmEnrollment") {
        const label = checked.value.payload.label as string | undefined;
        state = await this.options.confirmEnrollment?.(
          binding.profileId,
          binding.epoch,
          label,
        );
      } else if (method === "identity.retryReconciliation") {
        state = await this.options.retryReconciliation?.(
          binding.profileId,
          binding.epoch,
        );
      } else if (method === "identity.signOut") {
        state = await this.options.signOut?.(binding.profileId, binding.epoch);
      } else if (method === "identity.confirmAccountSwitch") {
        state = await this.options.confirmAccountSwitch?.(
          binding.profileId,
          binding.epoch,
        );
      }
      if (!state || !isRendererIdentityState(state)) {
        return {
          ...base,
          status: "error",
          error: safeError("RESOURCE_UNAVAILABLE"),
        };
      }
      return {
        ...base,
        status: "ok",
        data: sanitizeRendererState(state),
      };
    } catch {
      return {
        ...base,
        status: "error",
        error: safeError("RESOURCE_UNAVAILABLE"),
      };
    }
  }

  subscribeIdentity(
    event: IpcMainInvokeEvent,
  ): { subscriptionId: string } | null {
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)) || !binding)
      return null;
    const subscriptionId = this.subscriptions.add(binding, "identity");
    void Promise.resolve(
      this.options.identityState?.(binding.profileId, binding.epoch),
    ).then((data) => {
      if (data && isRendererIdentityState(data)) {
        const safe = sanitizeRendererState(data);
        queueMicrotask(() => {
          if (!binding.contents.isDestroyed())
            binding.contents.send("f004:event", {
              family: "identity",
              subscriptionId,
              data: safe,
            });
        });
      }
    });
    return { subscriptionId };
  }

  remove(event: IpcMainInvokeEvent, input: unknown): void {
    const binding = this.bindings.get(event.sender);
    if (!admitCaller(event, binding, this.context(binding)) || !binding) return;
    const copied = plainData(input);
    if (
      !copied.ok ||
      !copied.value ||
      typeof copied.value !== "object" ||
      Array.isArray(copied.value)
    )
      return;
    const safe = copied.value as Record<string, unknown>;
    if (
      Object.keys(safe).length !== 1 ||
      typeof safe.subscriptionId !== "string" ||
      !/^[0-9a-f-]{36}$/.test(safe.subscriptionId)
    )
      return;
    this.subscriptions.remove(safe.subscriptionId, binding);
  }

  emit(bindingContents: WebContents, family: EventFamily, data: unknown): void {
    const binding = this.bindings.get(bindingContents);
    const current = this.context(binding);
    if (
      family === "lifecycle" &&
      ["draining", "failed"].includes(current.state)
    )
      current.state = "ready";
    if (
      !binding ||
      !admitCaller(
        { sender: binding.contents, senderFrame: binding.frame },
        binding,
        current,
      )
    )
      return;
    const events = this.subscriptions.deliver(binding, family, data);
    if (family === "links" && events.length === 0) {
      const safe = boundedEvent(data);
      if (safe !== null) this.pendingLinkDecision.set(binding.contents, safe);
    }
    for (const event of events)
      binding.contents.send("f004:event", { family, ...event });
  }
}

export async function installBridge(
  options: BridgeOptions,
): Promise<DesktopBridge> {
  const { ipcMain } = await import("electron");
  const bridge = new DesktopBridge(options);
  for (const method of METHODS)
    ipcMain.handle(`f004:${method}`, (event, input: unknown) =>
      bridge.invoke(method, event, input),
    );
  for (const method of ["getState", "retryOpen"] as const)
    ipcMain.handle(`solodesk.persistence.${method}`, (event, input: unknown) =>
      bridge.invokePersistence(method, event, input),
    );
  ipcMain.handle("solodesk.persistence.onStateChanged", (event) =>
    bridge.subscribePersistence(event),
  );
  for (const method of IDENTITY_METHODS)
    ipcMain.handle(`solodesk.${method}`, (event, input: unknown) =>
      bridge.invokeIdentity(method, event, input),
    );
  ipcMain.handle("solodesk.identity.onStateChanged", (event) =>
    bridge.subscribeIdentity(event),
  );
  ipcMain.on("f004:subscription:remove", (event, input: unknown) =>
    bridge.remove(event as IpcMainInvokeEvent, input),
  );
  return bridge;
}
