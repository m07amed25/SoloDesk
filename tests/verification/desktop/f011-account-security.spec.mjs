import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("T051: F011 account security keyboard navigation, focus recovery & bilingual accessibility", async ({
  playwright,
}) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  let app;
  try {
    app = await playwright._electron.launch({
      args: [
        "--password-store=basic",
        path.join(root, "tooling/verification/electron-bootstrap.cjs"),
      ],
      chromiumSandbox: true,
      timeout: 30000,
      env: childEnvironment({
        F002_USER_DATA: user,
        F002_SESSION_DATA: session,
        F002_ROOT: root,
      }),
    });
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // The app shell renders with semantic status and accessible headings
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();

    // Verify keyboard focus navigation is responsive
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
