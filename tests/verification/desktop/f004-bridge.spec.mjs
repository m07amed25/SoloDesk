import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";

test("built preload exposes only named desktop actions", async ({ playwright }) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  let app;
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env: childEnvironment({ F002_USER_DATA: user, F002_SESSION_DATA: session, F002_ROOT: root }),
    });
    const page = await app.firstWindow();
    const surface = await page.evaluate(() => ({
      keys: Object.keys(window.solodesk || {}).sort(),
      windowKeys: Object.keys(window.solodesk?.window || {}).sort(),
      lifecycleKeys: Object.keys(window.solodesk?.lifecycle || {}).sort(),
      linkKeys: Object.keys(window.solodesk?.links || {}).sort(),
      protectionKeys: Object.keys(window.solodesk?.protection || {}).sort(),
      persistenceKeys: Object.keys(window.solodesk?.persistence || {}).sort(),
      node: typeof globalThis.require,
      process: typeof globalThis.process,
      rawIpc: typeof window.ipcRenderer,
    }));
    expect(surface).toEqual({
      keys: ["lifecycle", "links", "persistence", "protection", "window"],
      windowKeys: ["getState", "minimize", "requestClose", "restore"],
      lifecycleKeys: ["onState"],
      linkKeys: ["onDecision"],
      protectionKeys: ["getState", "retry"],
      persistenceKeys: ["getState", "onStateChanged", "retryOpen"],
      node: "undefined",
      process: "undefined",
      rawIpc: "undefined",
    });
    const state = await page.evaluate(() => window.solodesk.window.getState());
    expect(state.status, JSON.stringify(state)).toBe("ok");
    await expect.poll(async () =>
      (await page.evaluate(() => window.solodesk.window.getState())).data.visible,
    ).toBe(true);
    const denied = await page.evaluate(() => window.solodesk.window.getState({ unexpected: true }));
    expect(denied.status).toBe("rejected");
  } finally {
    if (app) await app.close();
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
