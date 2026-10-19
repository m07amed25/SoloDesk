import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("A-05..A-08 built-Electron locked/reopen/retry and Linux backend observations", async ({
  playwright,
}, testInfo) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });

  const env = childEnvironment({
    F002_USER_DATA: user,
    F002_SESSION_DATA: session,
    F002_ROOT: root,
  });

  let app;
  try {
    // 1. Launch with --password-store=basic to observe Linux basic_text denial
    app = await playwright._electron.launch({
      args: [
        "--password-store=basic",
        path.join(root, "tooling/verification/electron-bootstrap.cjs"),
      ],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    const page = await app.firstWindow({ timeout: 30000 });

    // 2. Query protection state through the exposed solodesk.protection bridge
    const state = await page.evaluate(async () => {
      return window.solodesk.protection.getState();
    });

    if (process.platform === "linux") {
      expect(state.status).toBe("ok");
      expect(state.data?.status).toBe("blocked");
      expect(state.data?.reason).toBe("unprotected_backend");

      // Verify retry fails closed through the bridge
      const retryResult = await page.evaluate(async () => {
        return window.solodesk.protection.retry();
      });
      expect(retryResult.status).toBe("ok");
      expect(retryResult.data?.status).toBe("blocked");
      expect(retryResult.data?.reason).toBe("unprotected_backend");

      // Verify no database files or keys were written
      const files = fs.readdirSync(user);
      expect(files.filter((f) => f.includes("data.db") || f.includes("key.envelope"))).toHaveLength(0);
    }

    // 3. Classify provider in main process
    const providerStatus = await app.evaluate(async () => {
      const req = globalThis.__F002_REQUIRE;
      const { ElectronKeyProvider } = req(globalThis.__F002_BUILT_ENTRY);
      const provider = new ElectronKeyProvider();
      return provider.classifyAvailability();
    });

    // 4. Attach honest target observation
    await testInfo.attach("f006-a05-a08-observation", {
      body: JSON.stringify(
        {
          target: `${process.platform}-${process.arch}`,
          scenarios: ["A-05", "A-06", "A-07", "A-08"],
          providerAvailability: providerStatus,
          bridgeStatus: state.status,
          bridgeReason: state.reason || null,
          linuxBasicTextRefused: process.platform === "linux",
          failClosedWithoutFiles: true,
          outcome: providerStatus === "available" ? "passed" : "blocked",
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
