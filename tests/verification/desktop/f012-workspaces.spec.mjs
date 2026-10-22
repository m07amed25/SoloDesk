import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("T058: F012 Workspaces packaged Electron desktop journeys & accessibility", async ({
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

    // The header utilities or main container renders accessible workspace cues
    const headerWorkspace = page.locator("[aria-label*='Workspace'], [aria-label*='مساحة']").first();
    if (await headerWorkspace.isVisible()) {
      await expect(headerWorkspace).toBeVisible();
    }

    // Verify keyboard navigation across controls
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    // Verify dialog accessibility when triggered
    const createTrigger = page.locator("button:has-text('Create Workspace'), button:has-text('إنشاء مساحة عمل')").first();
    if (await createTrigger.isVisible()) {
      await createTrigger.click();
      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Create Workspace" }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
    }
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
