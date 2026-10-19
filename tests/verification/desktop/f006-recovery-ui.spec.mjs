import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("A-08 Linux basic_text denial has keyboard reachable English and Arabic retry", async ({ playwright }) => {
  test.skip(process.platform !== "linux", "Linux backend observation only");
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
      env: childEnvironment({ F002_USER_DATA: user, F002_SESSION_DATA: session, F002_ROOT: root }),
    });
    const page = await app.firstWindow();
    await expect(page.getByRole("alert").filter({ hasText: "Local protection is unavailable" })).toBeVisible();
    const retry = page.getByRole("button", { name: "Check again" });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(retry).toBeEnabled();
    const language = page.getByRole("button", { name: "Switch language" });
    await language.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("alert").filter({ hasText: "الحماية المحلية غير متاحة" })).toBeVisible();
    const arabicRetry = page.getByRole("button", { name: "التحقق مجددًا" });
    await arabicRetry.focus();
    await page.keyboard.press("Enter");
    await expect(arabicRetry).toBeEnabled();
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
