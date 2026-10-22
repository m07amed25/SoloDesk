import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { BrowserWindow, Protocol, Session } from "electron";

export const ASSET_ORIGIN = "solodesk-app://ui";
const ASSET_SCHEME = "solodesk-app";
const activeSessions = new WeakSet<Session>();

export function trustedDevelopmentOrigin(input: string): string | null {
  try {
    const url = new URL(input);
    if (
      url.protocol !== "http:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.port
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function trustedDevelopmentDocumentUrl(input: string): string | null {
  if (!trustedDevelopmentOrigin(input)) return null;
  return new URL(input).href;
}

export function assetPath(
  raw: string,
  method: string,
  bundleRoot: string,
): string | null {
  if (
    !["GET", "HEAD"].includes(method) ||
    !raw.startsWith(`${ASSET_ORIGIN}/`) ||
    [...raw].some(
      (character) =>
        character === "%" ||
        character === "\\" ||
        character.charCodeAt(0) < 32 ||
        character.charCodeAt(0) === 127,
    ) ||
    raw.includes("?") ||
    raw.includes("#")
  )
    return null;
  const rawPath = raw.slice(ASSET_ORIGIN.length);
  if (
    rawPath
      .slice(1)
      .split("/")
      .some((part) => part === "." || part === ".." || !part)
  )
    return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== `${ASSET_SCHEME}:` ||
      url.host !== "ui" ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const root = path.resolve(bundleRoot);
    const target = path.resolve(root, `.${rawPath}`);
    return target.startsWith(root + path.sep) ? target : null;
  } catch {
    return null;
  }
}

export function registerAssetScheme(protocol: Protocol): void {
  // Electron requires this call before app readiness.
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ]);
}

export function isRendererFailure(
  reason: Electron.RenderProcessGoneDetails["reason"],
): boolean {
  return reason !== "clean-exit";
}

export async function registerAssetHandler(
  viewSession: Session,
  bundleRoot: string,
): Promise<void> {
  if (activeSessions.has(viewSession)) return;
  const { net } = await import("electron");
  const root = fs.realpathSync(bundleRoot);
  viewSession.protocol.handle(ASSET_SCHEME, async (request) => {
    if (process.env.F002_ROOT)
      console.error("[F004 verification] asset request:", request.url);
    const target = assetPath(request.url, request.method, root);
    if (!target) {
      if (process.env.F002_ROOT)
        console.error("[F004 verification] asset path denied");
      return new Response("Unavailable", { status: 404 });
    }
    try {
      const actual = await fs.promises.realpath(target);
      if (
        !actual.startsWith(root + path.sep) ||
        !(await fs.promises.stat(actual)).isFile()
      ) {
        if (process.env.F002_ROOT)
          console.error("[F004 verification] asset file denied");
        return new Response("Unavailable", { status: 404 });
      }
      const fetched = await net.fetch(pathToFileURL(actual).toString());
      if (process.env.F002_ROOT)
        console.error(
          "[F004 verification] asset fetch status:",
          fetched.status,
        );
      return request.method === "HEAD"
        ? new Response(null, {
            status: fetched.status,
            headers: fetched.headers,
          })
        : fetched;
    } catch (reason) {
      if (process.env.F002_ROOT)
        console.error("[F004 verification] asset handler failure:", reason);
      return new Response("Unavailable", { status: 404 });
    }
  });
  activeSessions.add(viewSession);
}

export type TrustedView = Readonly<{
  window: BrowserWindow;
  viewSession: Session;
  origin: string;
  documentUrl: string;
}>;

export async function createTrustedWindow(
  profileId: string,
  epoch: number,
  options: {
    developmentUrl?: string;
    onFailure: () => void;
    onClose: () => void;
    onCreated?: (
      window: BrowserWindow,
      origin: string,
      documentUrl: string,
    ) => void;
  },
): Promise<TrustedView> {
  const { BrowserWindow, session } = await import("electron");
  const developmentUrl = options.developmentUrl
    ? trustedDevelopmentDocumentUrl(options.developmentUrl)
    : null;
  if (options.developmentUrl && !developmentUrl)
    throw new Error("untrusted-development-origin");
  const developmentOrigin = developmentUrl
    ? new URL(developmentUrl).origin
    : null;
  const viewSession = session.fromPartition(`solodesk-${profileId}-${epoch}`, {
    cache: false,
  });
  const bundleRoot = path.join(__dirname, "../renderer/main_window");
  if (!developmentOrigin) await registerAssetHandler(viewSession, bundleRoot);
  const preloadPath = path.join(__dirname, "preload.cjs");
  if (!fs.existsSync(preloadPath))
    throw new Error("trusted-preload-unavailable");
  viewSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  viewSession.setPermissionCheckHandler(() => false);

  const window = new BrowserWindow({
    title: "SoloDesk",
    width: 1080,
    height: 760,
    minWidth: 640,
    minHeight: 520,
    show: false,
    backgroundColor: "#f7faf9",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
      session: viewSession,
    },
  });
  const documentUrl = developmentUrl || `${ASSET_ORIGIN}/index.html`;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-frame-navigate", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("will-redirect", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("render-process-gone", (_event, details) => {
    if (isRendererFailure(details.reason)) options.onFailure();
  });
  window.webContents.on(
    "did-fail-load",
    (_event, code, _description, validatedUrl, isMainFrame) => {
      if (isMainFrame && code !== -3 && validatedUrl === documentUrl)
        options.onFailure();
    },
  );
  window.once("closed", options.onClose);
  window.once("ready-to-show", () => window.show());
  options.onCreated?.(window, developmentOrigin || ASSET_ORIGIN, documentUrl);
  try {
    await window.loadURL(documentUrl);
    if (!window.isDestroyed() && !window.isVisible()) window.show();
  } catch (reason) {
    window.destroy();
    throw new Error("trusted-document-unavailable", { cause: reason });
  }
  return {
    window,
    viewSession,
    origin: developmentOrigin || ASSET_ORIGIN,
    documentUrl,
  };
}
