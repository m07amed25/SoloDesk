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

export async function registerAssetHandler(
  viewSession: Session,
  bundleRoot: string,
): Promise<void> {
  if (activeSessions.has(viewSession)) return;
  const { net } = await import("electron");
  const root = fs.realpathSync(bundleRoot);
  viewSession.protocol.handle(ASSET_SCHEME, async (request) => {
    const target = assetPath(request.url, request.method, root);
    if (!target) return new Response("Unavailable", { status: 404 });
    try {
      const actual = await fs.promises.realpath(target);
      if (
        !actual.startsWith(root + path.sep) ||
        !(await fs.promises.stat(actual)).isFile()
      )
        return new Response("Unavailable", { status: 404 });
      const fetched = await net.fetch(pathToFileURL(actual).toString());
      return request.method === "HEAD"
        ? new Response(null, {
            status: fetched.status,
            headers: fetched.headers,
          })
        : fetched;
    } catch {
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
  const developmentOrigin =
    options.developmentUrl && trustedDevelopmentOrigin(options.developmentUrl);
  if (options.developmentUrl && !developmentOrigin)
    throw new Error("untrusted-development-origin");
  const viewSession = session.fromPartition(`solodesk-${profileId}-${epoch}`, {
    cache: false,
  });
  const bundleRoot = path.join(__dirname, "../renderer/main_window");
  if (!developmentOrigin) await registerAssetHandler(viewSession, bundleRoot);
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
    frame: true,
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: "#e8f0ed",
            symbolColor: "#193b43",
            height: 36,
          },
        }
      : {}),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      session: viewSession,
    },
  });
  const documentUrl = developmentOrigin
    ? options.developmentUrl!
    : `${ASSET_ORIGIN}/index.html`;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-frame-navigate", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("will-redirect", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("render-process-gone", options.onFailure);
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
  } catch {
    window.destroy();
    throw new Error("trusted-document-unavailable");
  }
  return {
    window,
    viewSession,
    origin: developmentOrigin || ASSET_ORIGIN,
    documentUrl,
  };
}
