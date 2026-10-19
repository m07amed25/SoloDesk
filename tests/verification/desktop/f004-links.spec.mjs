import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("built app admits home ingress and denies navigation escape", async ({ playwright }, testInfo) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  const env = childEnvironment({ F002_USER_DATA: user, F002_SESSION_DATA: session, F002_ROOT: root });
  let app;
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs"), "solodesk://open/home"],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    const page = await app.firstWindow();
    await expect(page.getByRole("heading", { name: "A workspace for your independent work." })).toBeVisible();
    const child = spawn(
      path.join(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" :
        process.platform === "darwin" ? "Electron.app/Contents/MacOS/Electron" : "electron"),
      [path.join(root, "tooling/verification/electron-bootstrap.cjs"), "solodesk://open/home"],
      { env },
    );
    expect(await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    })).toBe(0);
    await page.getByRole("button", { name: "Switch language" }).click();
    await expect(page.getByRole("button", { name: "Switch language" })).toHaveText("English");
    const deniedLink = "solodesk://open/record/11111111-1111-4111-8111-111111111111?workspace=22222222-2222-4222-8222-222222222222";
    const deniedChild = spawn(
      path.join(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" :
        process.platform === "darwin" ? "Electron.app/Contents/MacOS/Electron" : "electron"),
      [path.join(root, "tooling/verification/electron-bootstrap.cjs"), deniedLink],
      { env },
    );
    expect(await new Promise((resolve, reject) => {
      deniedChild.once("error", reject);
      deniedChild.once("exit", resolve);
    })).toBe(0);
    await expect(page.getByRole("alert").filter({ hasText: "هذا الرابط" })).toContainText("غير متاح");
    await expect(page.getByRole("alert").filter({ hasText: "هذا الرابط" })).not.toContainText("11111111");
    const malformedChild = spawn(
      path.join(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" :
        process.platform === "darwin" ? "Electron.app/Contents/MacOS/Electron" : "electron"),
      [path.join(root, "tooling/verification/electron-bootstrap.cjs"), "solodesk://open/%2e%2e"],
      { env },
    );
    expect(await new Promise((resolve, reject) => {
      malformedChild.once("error", reject);
      malformedChild.once("exit", resolve);
    })).toBe(0);
    await expect(page.getByRole("alert").filter({ hasText: "هذا الرابط" })).toContainText("تعذّر فتح هذا الرابط");
    const denialImage = path.join(root, owned, "denied-ar.png");
    await page.screenshot({ path: denialImage });
    await testInfo.attach("denied-ar", { path: denialImage, contentType: "image/png" });
    await page.evaluate(() => {
      window.open("https://example.com/");
      location.assign("https://example.com/");
    });
    await expect.poll(() => page.url()).toBe("solodesk-app://ui/index.html");
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  } finally {
    if (app) await app.close();
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
