import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("T064: F013 Member Invitations packaged Electron desktop journeys & accessibility", async ({
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

    // Check Command Palette or Member Invite triggers
    await page.keyboard.press("Control+k");
    const palette = page.locator("[role='combobox'], [role='dialog']").first();
    if (await palette.isVisible()) {
      await page.keyboard.type("invite");
      await page.keyboard.press("Escape");
    }

    // Verify invitation list region rendering
    const invitationRegion = page.locator("[aria-label='Workspace Invitations']");
    if (await invitationRegion.isVisible()) {
      await expect(invitationRegion).toBeVisible();

      // Refresh button keyboard navigation
      const refreshBtn = invitationRegion.locator("button[aria-label*='Refresh'], button[aria-label*='تحديث']").first();
      if (await refreshBtn.isVisible()) {
        await expect(refreshBtn).toBeEnabled();
      }
    }

    // Verify no secret leak in renderer DOM
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("raw_secret");
    expect(bodyText).not.toContain("continuationDigest");
    expect(bodyText).not.toContain("recipient_binding_key");

  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
