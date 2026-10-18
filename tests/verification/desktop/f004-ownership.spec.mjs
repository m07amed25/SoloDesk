import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";
import { allocate } from "../../../tooling/verification/artifacts.mjs";

const electronPath = path.join(
  process.cwd(),
  "node_modules/electron/dist",
  process.platform === "win32"
    ? "electron.exe"
    : process.platform === "darwin"
      ? "Electron.app/Contents/MacOS/Electron"
      : "electron",
);

function launchContender(root, env) {
  const child = spawn(electronPath, [path.join(root, "tooling/verification/electron-bootstrap.cjs")], { env });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function ownedEnvironment(root) {
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  return { user, session, env: childEnvironment({
    F002_USER_DATA: user,
    F002_SESSION_DATA: session,
    F002_ROOT: root,
  }) };
}

test("concurrent real processes leave one owner and one profile view", async ({ playwright }) => {
  const root = process.cwd();
  const { user, session, env } = ownedEnvironment(root);

  let app;
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    await app.firstWindow();
    const before = await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    );
    expect(before).toBe(1);
    const contenders = await Promise.all(Array.from({ length: 8 }, () => launchContender(root, env)));
    expect(contenders).toEqual(Array.from({ length: 8 }, () => ({ code: 0, signal: null })));
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
      )
      .toBe(1);
  } finally {
    if (app) await app.close();
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});

test("synthetic A/B views use distinct sessions and restart without a stale owner", async ({ playwright }) => {
  const root = process.cwd();
  const { user, session, env } = ownedEnvironment(root);
  const fixtureEnv = { ...env, F004_SYNTHETIC_PROFILES: "1" };
  let app;
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env: fixtureEnv,
    });
    await app.firstWindow();
    for (const profile of ["synthetic-a", "synthetic-b"]) {
      expect(await launchContender(root, { ...fixtureEnv, F004_PROFILE: profile }))
        .toEqual({ code: 0, signal: null });
    }
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length))
      .toBe(3);
    const distinct = await app.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      return new Set(windows.map((window) => window.webContents.session)).size;
    });
    expect(distinct).toBe(3);
    await app.close();
    app = undefined;
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env: fixtureEnv,
    });
    await app.firstWindow();
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
