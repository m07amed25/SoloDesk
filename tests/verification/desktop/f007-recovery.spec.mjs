import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("F007 synthetic recovery modal is keyboard reachable in English and Arabic", async ({ playwright }) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  let app;
  try {
    app = await playwright._electron.launch({
      args: ["--password-store=basic", path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env: childEnvironment({
        F002_USER_DATA: user,
        F002_SESSION_DATA: session,
        F002_ROOT: root,
        F007_SYNTHETIC_WORKSPACE: "ws-test-alpha",
        F006_SIMULATE_BLOCKED: "unprotected",
      }),
    });
    const page = await app.firstWindow();
    const modal = page.getByRole("alertdialog", { name: "Protected storage is unavailable" });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Unsynced local drafts");
    const retry = modal.getByRole("button", { name: "Try again" });
    const quit = modal.getByRole("button", { name: "Quit SoloDesk" });
    await retry.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(quit).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(modal).toBeVisible();
    await page.evaluate(() => {
      localStorage.setItem("solodesk_shell_prefs", JSON.stringify({
        schemaVersion: 1, locale: "ar", theme: "system", sidebarCollapsed: false,
        lastUpdated: new Date().toISOString(),
      }));
    });
    await page.reload();
    const arabic = page.getByRole("alertdialog", { name: "التخزين المحمي غير متاح" });
    await expect(arabic).toBeVisible();
    await expect(arabic).toHaveCSS("direction", "rtl");
    await expect(arabic).toContainText("المسودات المحلية غير المتزامنة");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
