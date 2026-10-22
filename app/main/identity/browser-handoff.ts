import http from "node:http";
import type { AddressInfo } from "node:net";
import type { IdentityConfig } from "./config.ts";

export function buildAuthorizationUrl(
  config: IdentityConfig,
  params: {
    challenge: string;
    state: string;
    nonce: string;
    redirectUri: string;
  },
): string {
  const url = new URL(config.hostedPath, config.hostedOrigin);
  if (config.provider) {
    const redirect = new URL(params.redirectUri);
    redirect.searchParams.set("state", params.state);
    url.searchParams.set("provider", config.provider);
    url.searchParams.set("redirect_to", redirect.toString());
    url.searchParams.set("code_challenge", params.challenge);
    url.searchParams.set("code_challenge_method", "s256");
    return url.toString();
  }
  url.searchParams.set("client_id", config.audience);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("redirect_uri", params.redirectUri);
  return url.toString();
}

export function isAllowedHostedUrl(
  urlStr: string,
  config: IdentityConfig,
): boolean {
  try {
    const url = new URL(urlStr);
    const isTest =
      process.env.NODE_ENV === "test" || process.env.SOLODESK_TEST_MODE === "1";

    if (url.protocol !== "https:") {
      if (
        !isTest ||
        url.protocol !== "http:" ||
        (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
      ) {
        return false;
      }
    }

    const expected = new URL(config.hostedOrigin);
    if (url.origin !== expected.origin) {
      return false;
    }

    if (url.pathname !== config.hostedPath || url.username || url.password) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export type BrowserHandoffOptions = {
  onCallbackReceived?: (
    url: string,
  ) => boolean | void | Promise<boolean | void>;
  shellOpenExternal?: (url: string) => Promise<void>;
};

export class BrowserHandoffManager {
  private readonly config: IdentityConfig;
  private readonly options: BrowserHandoffOptions;
  private loopbackServer: http.Server | null = null;
  private loopbackPort: number = 0;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private listenerGeneration = 0;

  constructor(config: IdentityConfig, options: BrowserHandoffOptions = {}) {
    this.config = config;
    this.options = options;
  }

  isLoopbackActive(): boolean {
    return this.loopbackServer !== null && this.loopbackServer.listening;
  }

  getLoopbackPort(): number {
    return this.loopbackPort;
  }

  isIdentityCallbackUrl(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      if (url.protocol === "solodesk:") {
        return url.hostname === "auth" && url.pathname === "/callback";
      }
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        (url.hostname === "127.0.0.1" || url.hostname === "localhost")
      ) {
        return url.pathname === "/auth/callback";
      }
      return false;
    } catch {
      return false;
    }
  }

  async startLoopbackListener(): Promise<number> {
    if (this.loopbackServer) {
      this.closeLoopbackListener();
    }
    const generation = ++this.listenerGeneration;

    return new Promise((resolve, reject) => {
      let port = 0;
      const server = http.createServer(async (req, res) => {
        const fullUrl = `http://127.0.0.1:${port}${req.url || ""}`;
        if (
          this.loopbackServer !== server ||
          req.method !== "GET" ||
          req.headers.host !== `127.0.0.1:${port}` ||
          !req.url?.startsWith("/auth/callback?") ||
          Buffer.byteLength(fullUrl) > this.config.maxQueryBytes
        ) {
          res.writeHead(400, { "Cache-Control": "no-store" });
          res.end();
          return;
        }
        try {
          if ((await this.options.onCallbackReceived?.(fullUrl)) === false) {
            res.writeHead(400, { "Cache-Control": "no-store" });
            res.end();
            return;
          }
        } catch {
          res.writeHead(503, { "Cache-Control": "no-store" });
          res.end();
          return;
        }

        // Safe static HTML response with security headers
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline';",
          "X-Content-Type-Options": "nosniff",
        });

        res.end(
          `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Sign-in complete — SoloDesk</title>
  <style>
    :root {
      color-scheme: light;
      --canvas: #f4f8ff;
      --surface: #ffffff;
      --ink: #111827;
      --muted: #53657d;
      --border: #dce7f7;
      --divider: #e1e8f2;
      --primary: #2854d7;
      --primary-hover: #2047be;
      --mark: #2463eb;
      --mark-surface: #dceafe;
    }

    * { box-sizing: border-box; }

    html, body { margin: 0; min-height: 100%; }

    body {
      display: grid;
      place-items: center;
      min-height: 100vh;
      min-height: 100svh;
      padding: 1.25rem;
      background: var(--canvas);
      color: var(--ink);
      font-family: Inter, "Noto Sans Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .card {
      width: min(24rem, 100%);
      padding: 2.25rem 2.375rem 2.375rem;
      border: 1px solid var(--border);
      border-radius: 1rem;
      background: var(--surface);
      box-shadow: 0 18px 48px rgba(45, 87, 150, 0.1);
    }

    .status-mark {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: var(--mark-surface);
      color: var(--mark);
    }

    .status-mark svg {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.4;
    }

    h1 {
      margin: 1.125rem 0 0;
      color: var(--ink);
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.2;
    }

    p {
      margin: 0.875rem 0 0;
      color: var(--muted);
      font-size: 0.875rem;
      line-height: 1.55;
    }

    .divider {
      height: 1px;
      margin: 1.375rem 0 1.25rem;
      background: var(--divider);
    }

    .return-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 2.25rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      background: var(--primary);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.25;
      text-align: center;
      text-decoration: none;
      transition: background-color 120ms ease-out;
    }

    .return-action:hover { background: var(--primary-hover); }

    .return-action:focus-visible {
      outline: 3px solid #a9c5ff;
      outline-offset: 3px;
    }

    .return-action svg {
      width: 0.875rem;
      height: 0.875rem;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    @media (max-width: 28rem) {
      body { padding: 1rem; }
      .card { padding: 1.75rem; }
      h1 { font-size: 1.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .return-action { transition: none; }
    }

    @media (forced-colors: active) {
      .card, .status-mark { border: 1px solid CanvasText; }
      .return-action { border: 1px solid LinkText; }
    }
  </style>
</head>
<body>
  <main class="card" aria-labelledby="completion-title">
      <div class="status-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6"></path>
        </svg>
      </div>
      <h1 id="completion-title">Sign-in complete</h1>
      <p>SoloDesk is ready in the desktop app. You can safely close this tab.</p>
      <div class="divider" aria-hidden="true"></div>
      <a class="return-action" href="solodesk://open/home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="14" rx="2"></rect>
          <path d="M8 21h8M12 18v3"></path>
        </svg>
        Return to the SoloDesk desktop app
      </a>
  </main>
</body>
</html>`,
        );

        // Close server immediately after receiving the single callback
        setImmediate(() => {
          if (this.loopbackServer === server) this.closeLoopbackListener();
        });
      });

      server.on("error", (err) => {
        if (this.loopbackServer === server) this.closeLoopbackListener();
        reject(err);
      });

      server.listen(0, "127.0.0.1", () => {
        if (generation !== this.listenerGeneration) {
          server.close();
          reject(new Error("superseded_listener"));
          return;
        }
        const addr = server.address() as AddressInfo;
        port = addr.port;
        this.loopbackPort = addr.port;
        this.loopbackServer = server;
        this.expiryTimer = setTimeout(() => {
          if (this.loopbackServer === server) this.closeLoopbackListener();
        }, this.config.attemptLifetimeMs);
        this.expiryTimer.unref();
        resolve(addr.port);
      });
    });
  }

  closeLoopbackListener(): void {
    this.listenerGeneration += 1;
    clearTimeout(this.expiryTimer);
    if (this.loopbackServer) {
      try {
        this.loopbackServer.close();
      } catch {
        // ignore
      }
      this.loopbackServer = null;
      this.loopbackPort = 0;
    }
  }

  async openBrowser(authUrl: string): Promise<void> {
    if (!isAllowedHostedUrl(authUrl, this.config)) {
      throw new Error("untrusted_hosted_url");
    }

    if (this.options.shellOpenExternal) {
      await this.options.shellOpenExternal(authUrl);
      return;
    }

    try {
      const { shell } = await import("electron");
      await shell.openExternal(authUrl);
    } catch {
      // In test environment without Electron
      if (
        process.env.NODE_ENV !== "test" &&
        process.env.SOLODESK_TEST_MODE !== "1"
      ) {
        throw new Error("electron_shell_unavailable");
      }
    }
  }
}
