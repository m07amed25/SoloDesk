import type {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents,
  WebFrameMain,
} from "electron";
import type { Id } from "../../packages/domain/src/ids.ts";
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
type EventFamily = "lifecycle" | "links";

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
  ipcMain.on("f004:subscription:remove", (event, input: unknown) =>
    bridge.remove(event as IpcMainInvokeEvent, input),
  );
  return bridge;
}
