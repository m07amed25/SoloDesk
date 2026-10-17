import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";

app.setName("SoloDesk");

async function createWindow() {
  const window = new BrowserWindow({
    title: "SoloDesk",
    width: 1080,
    height: 760,
    minWidth: 640,
    minHeight: 520,
    show: false,
    backgroundColor: "#f7faf9",
    frame: true,
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: "#e8f0ed",
            symbolColor: "#193b43",
            height: 36,
          },
        }
      : {}),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once("ready-to-show", () => window.show());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

function reportStartupFailure(error: unknown) {
  console.error("SoloDesk could not open:", error);
  dialog.showErrorBox(
    "SoloDesk could not open",
    "Close SoloDesk and run npm start again. See the terminal for details.",
  );
  app.exit(1);
}

app
  .whenReady()
  .then(async () => {
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch(reportStartupFailure);
      }
    });
  })
  .catch(reportStartupFailure);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
