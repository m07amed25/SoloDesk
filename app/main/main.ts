import { app, dialog, protocol, type WebContents } from "electron";
import { randomUUID } from "node:crypto";
import { installBridge, type DesktopBridge } from "./bridge.ts";
import {
  ProfileOwners,
  DEFAULT_PROFILE,
  TEST_PROFILES,
  parseActivation,
  type Activation,
  type OwnedView,
} from "./profiles.ts";
import { initialLink, LinkRouter, parseLink } from "./links.ts";
import { LifecycleCoordinator } from "./lifecycle.ts";
import { createTrustedWindow, registerAssetScheme } from "./windows.ts";

app.setName("SoloDesk");

const testProfiles =
  !app.isPackaged &&
  process.env.F004_SYNTHETIC_PROFILES === "1" &&
  Boolean(process.env.F002_ROOT);
const catalogue = [DEFAULT_PROFILE, ...(testProfiles ? TEST_PROFILES : [])];
const requestedProfile =
  testProfiles && TEST_PROFILES.includes(process.env.F004_PROFILE || "")
    ? process.env.F004_PROFILE!
    : DEFAULT_PROFILE;
const owner = new LifecycleCoordinator();
const startupLink = initialLink(process.argv);
const lockHeld = app.requestSingleInstanceLock({
  version: 1,
  profileId: requestedProfile,
  ...(startupLink ? { link: startupLink } : {}),
});
owner.lockHeld = lockHeld;

if (!lockHeld) {
  // Electron forwards additionalData to the existing owner. A contender creates no view or job.
  app.exit(0);
} else {
  registerAssetScheme(protocol);
  type NativeView = OwnedView & { contents: WebContents };
  const profiles = new ProfileOwners<NativeView>(catalogue);
  const router = new LinkRouter({
    knownProfile: (id) => profiles.hasProfile(id),
  });
  let bridge: DesktopBridge;
  const pending: Activation[] = [];
  const startedAt = Date.now();
  let failureShown = false;

  function fail(): void {
    if (failureShown) return;
    failureShown = true;
    owner.fail("startup");
    dialog.showErrorBox(
      "SoloDesk could not open",
      "Close SoloDesk and restart it. No protected work has been replaced.\nأغلق التطبيق وأعِد تشغيله. لم تُستبدل بياناتك المحمية.",
    );
    app.exit(1);
  }

  async function activate(profileId: string): Promise<NativeView | undefined> {
    if (owner.state !== "ready") return;
    return profiles.activate(profileId, async (id, epoch) => {
      let view: NativeView | undefined;
      const trusted = await createTrustedWindow(id, epoch, {
        developmentUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
        onFailure: fail,
        onClose: () => {
          if (view) profiles.close(id, view);
        },
        onCreated: (window, origin, documentUrl) => {
          bridge.bind(window, id, epoch, origin, documentUrl);
          window.on("show", () =>
            bridge.emit(window.webContents, "lifecycle", { state: "visible" }),
          );
          window.on("minimize", () =>
            bridge.emit(window.webContents, "lifecycle", {
              state: "minimized",
            }),
          );
          window.on("restore", () =>
            bridge.emit(window.webContents, "lifecycle", { state: "visible" }),
          );
          window.on("close", () =>
            bridge.emit(window.webContents, "lifecycle", { state: "closing" }),
          );
        },
      });
      view = {
        contents: trusted.window.webContents,
        focus: () => {
          if (trusted.window.isMinimized()) trusted.window.restore();
          if (!trusted.window.isDestroyed()) trusted.window.focus();
        },
      };
      return view;
    });
  }

  async function route(intent: Activation): Promise<void> {
    if (owner.state !== "ready") return;
    if (!intent.link) {
      await activate(intent.profileId);
      return;
    }
    const decision = await router.decide(
      parseLink(intent.link),
      intent.profileId,
      randomUUID(),
    );
    if (decision.status !== "accepted") {
      const view = await activate(intent.profileId);
      if (view)
        bridge.emit(view.contents, "links", { status: decision.status });
      return;
    }
    const view = await activate(intent.profileId);
    if (view) bridge.emit(view.contents, "links", { status: "accepted" });
  }

  function admit(intent: Activation | null): void {
    if (!intent || !profiles.hasProfile(intent.profileId)) return;
    if (owner.state === "starting") {
      if (pending.length < 32) pending.push(intent);
      return;
    }
    void route(intent).catch(fail);
  }

  app.on(
    "second-instance",
    (_event, _argv, _workingDirectory, additionalData) =>
      admit(parseActivation(additionalData)),
  );
  app.on("open-url", (event, raw) => {
    event.preventDefault();
    admit({ profileId: DEFAULT_PROFILE, link: raw });
  });

  app
    .whenReady()
    .then(async () => {
      bridge = await installBridge({
        state: () => owner.state,
        epoch: (id) => profiles.epoch(id),
      });
      owner.onState((state) => {
        for (const view of profiles.views()) {
          bridge.emit(view.contents, "lifecycle", { state });
          if (state === "draining" || state === "failed")
            bridge.dispose(view.contents);
        }
      });
      owner.ready();
      await route({
        profileId: requestedProfile,
        ...(startupLink ? { link: startupLink } : {}),
      });
      if (Date.now() - startedAt <= 30000)
        for (const intent of pending.splice(0)) await route(intent);
      else pending.length = 0;
      app.on("activate", () => {
        void activate(DEFAULT_PROFILE).catch(fail);
      });
    })
    .catch(fail);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  let terminalQuit = false;
  app.on("before-quit", (event) => {
    if (terminalQuit) return;
    event.preventDefault();
    void owner
      .drain("quit")
      .then(() => {
        profiles.clear();
        terminalQuit = true;
        app.quit();
      })
      .catch(() => {
        terminalQuit = true;
        app.exit(1);
      });
  });
}
