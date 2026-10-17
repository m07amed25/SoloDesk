import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
test("real built shell has isolated paths, sandbox and working disclosure", async ({
  playwright,
}, testInfo) => {
  const root = process.cwd(),
    owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData"),
    session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });
  let app;
  const failures = [];
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env: childEnvironment({
        F002_USER_DATA: user,
        F002_SESSION_DATA: session,
        F002_ROOT: root,
      }),
    });
    const window = await app.firstWindow({ timeout: 30000 });
    const identity = await app.evaluate(({ app, BrowserWindow }) => ({
      user: app.getPath("userData"),
      session: app.getPath("sessionData"),
      prefs:
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
      entry: globalThis.__F002_BUILT_ENTRY,
    }));
    expect(identity.user).toBe(user);
    expect(identity.session).toBe(session);
    expect(identity.entry).toBe(path.join(root, ".vite/build/main.js"));
    expect(identity.prefs.sandbox).toBe(true);
    expect(identity.prefs.contextIsolation).toBe(true);
    expect(identity.prefs.nodeIntegration).toBe(false);
    window.on("pageerror", (e) => failures.push(e.message));
    window.on("crash", () => failures.push("renderer-crashed"));
    expect(await window.evaluate(() => typeof globalThis.require)).toBe(
      "undefined",
    );
    await expect(
      window.getByRole("heading", {
        name: "A workspace for your independent work.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      window.getByText("Desktop shell ready", { exact: true }),
    ).toBeVisible();

    const disclosure = window.getByRole("button", {
      name: /view planned features/i,
    });
    await disclosure.click();
    await expect(window.getByText(/not implemented yet/i)).toBeVisible();
    await window
      .getByRole("button", { name: /hide planned features/i })
      .click();
    await expect(window.getByText(/not implemented yet/i)).toBeHidden();
    expect(failures).toEqual([]);
    await window.screenshot({ path: path.join(root, owned, "shell.png") });
    await testInfo.attach("shell", {
      path: path.join(root, owned, "shell.png"),
      contentType: "image/png",
    });
  } finally {
    if (app)
      await Promise.race([
        app.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("cleanup-failed")), 10000).unref(),
        ),
      ]);
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
