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
  onCallbackReceived?: (url: string) => boolean | void | Promise<boolean | void>;
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
        if (this.loopbackServer !== server || req.method !== "GET" || req.headers.host !== `127.0.0.1:${port}` ||
          !req.url?.startsWith("/auth/callback?") || Buffer.byteLength(fullUrl) > this.config.maxQueryBytes) {
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
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline';",
          "X-Content-Type-Options": "nosniff",
        });

        res.end(
          `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <title>SoloDesk Authentication</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Return to SoloDesk / عُد إلى سولو ديسك</h1>
    <p>Check the app for your sign-in status. / تحقّق من حالة تسجيل الدخول في التطبيق.</p>
  </div>
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
      if (process.env.NODE_ENV !== "test" && process.env.SOLODESK_TEST_MODE !== "1") {
        throw new Error("electron_shell_unavailable");
      }
    }
  }
}
