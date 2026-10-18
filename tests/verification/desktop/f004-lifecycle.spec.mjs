import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("native minimize, restore, close and restart keep one owner", async ({ playwright }, testInfo) => {
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
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    const page = await app.firstWindow();
    await expect(page.getByRole("button", { name: "Minimize" })).toBeVisible();
    await page.getByRole("button", { name: "Minimize" }).focus();
    await page.keyboard.press("Enter");
    if (process.env.F002_HEADLESS !== "1") {
      await expect.poll(() => app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.isMinimized())).toBe(true);
    } else {
      const observed = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.isMinimized());
      await testInfo.attach("headless-minimize", {
        body: JSON.stringify({ nativeMinimized: observed, display: "virtual-no-window-manager" }),
        contentType: "application/json",
      });
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    await expect.poll(() => app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.isVisible())).toBe(true);
    const exited = new Promise((resolve) =>
      app.process().once("exit", (code, signal) => resolve({ code, signal })),
    );
    const accepted = await page.evaluate(() => window.solodesk.window.requestClose())
      .catch(() => ({ status: "outcome_unknown" }));
    expect(["accepted", "outcome_unknown"]).toContain(accepted.status);
    if (process.platform === "darwin") {
      await expect.poll(() => app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().length)).toBe(0);
      await app.close();
    } else expect(await exited).toEqual({ code: 0, signal: null });
    app = undefined;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    const child = app.process();
    const restarted = child.exitCode !== null || child.signalCode !== null
      ? null
      : await Promise.race([
          app.firstWindow(),
          new Promise((resolve) => child.once("exit", () => resolve(null))),
        ]);
    expect(restarted, "restarted owner exited before creating a window").not.toBeNull();
    await expect(restarted.getByRole("heading", { name: "A workspace for your independent work." })).toBeVisible();
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
