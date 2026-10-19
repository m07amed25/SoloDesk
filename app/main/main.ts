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
import { ElectronKeyProvider } from "./protection/key-provider.ts";
import { ProtectionOwner } from "./protection/owner.ts";
import { PersistenceService } from "./persistence/persistence-service.ts";
import { isWorkspaceId } from "../shared/persistence-contracts.ts";
import { KeyUnavailable } from "./protection/key-provider.ts";
import {
  blockedProtection,
  type ProtectionResult,
} from "../shared/protection-contracts.ts";

import { rotateKey, reconcileRotation } from "./protection/rotation.ts";

export {
  ElectronKeyProvider,
  KeyUnavailable,
  ProtectionOwner,
  rotateKey,
  reconcileRotation,
};

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
if (process.env.F002_ROOT)
  console.error(`[F004 verification] single-instance lock: ${lockHeld}`);

if (!lockHeld) {
  // Electron forwards additionalData to the existing owner. A contender creates no view or job.
  app.exit(0);
} else {
  registerAssetScheme(protocol);
  type NativeView = OwnedView & { contents: WebContents };
  const profiles = new ProfileOwners<NativeView>(catalogue);
  const keyProvider = new ElectronKeyProvider();
  const protectionOwners = new Map<string, ProtectionOwner>();
  const persistenceServices = new Map<string, PersistenceService>();
  // F012 enrollment will supply the authorized workspace. Until then only the
  // existing synthetic verification mode can opt into an active workspace.
  const syntheticWorkspace =
    !app.isPackaged &&
    Boolean(process.env.F002_ROOT) &&
    isWorkspaceId(process.env.F007_SYNTHETIC_WORKSPACE)
      ? process.env.F007_SYNTHETIC_WORKSPACE
      : undefined;
  function protectionState(profileId: string, epoch: number): ProtectionResult {
    if (profiles.epoch(profileId) !== epoch)
      return blockedProtection("protection_denied");
    try {
      keyProvider.assertAvailable();
      return Object.freeze({ status: "ready", correlationId: randomUUID() });
    } catch (error) {
      return blockedProtection(
        error instanceof KeyUnavailable ? error.reason : "protection_denied",
      );
    }
  }
  const router = new LinkRouter({
    knownProfile: (id) => profiles.hasProfile(id),
  });
  let bridge: DesktopBridge;
  const pending: Activation[] = [];
  const startedAt = Date.now();
  let failureShown = false;

  function fail(reason?: unknown): void {
    if (failureShown) return;
    failureShown = true;
    if (process.env.F002_ROOT) {
      console.error("[F004 verification] startup failure:", reason);
      app.exit(1);
      return;
    }
    owner.fail("startup");
    dialog.showErrorBox(
      "SoloDesk could not open",
      "Close SoloDesk and restart it. No protected work has been replaced.\nأغلق التطبيق وأعِد تشغيله. لم تُستبدل بياناتك المحمية.",
    );
    app.exit(1);
  }

  async function activate(profileId: string): Promise<NativeView | undefined> {
    if (owner.state !== "ready") return;
    for (const [id, protection] of protectionOwners)
      if (id !== profileId) {
        await persistenceServices.get(id)?.closeActiveStore();
        protection.lock();
      }
    return profiles.activate(profileId, async (id, epoch) => {
      const protection = new ProtectionOwner(
        { profileId: id, epoch },
        (candidate, candidateEpoch) =>
          profiles.epoch(candidate) === candidateEpoch,
        keyProvider,
      );
      protectionOwners.set(id, protection);
      const persistence = new PersistenceService(
        app.getPath("userData"),
        id,
        protection,
      );
      persistenceServices.set(id, persistence);
      persistence.onStateChanged((state) => {
        const current = profiles.current(id);
        if (current) bridge.emit(current.contents, "persistence", state);
      });
      if (syntheticWorkspace)
        await persistence.openWorkspaceStore(syntheticWorkspace);
      let view: NativeView | undefined;
      const trusted = await createTrustedWindow(id, epoch, {
        developmentUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
        onFailure: fail,
        onClose: () => {
          void persistence.closeActiveStore().catch(() => {}).finally(() => protection.lock());
          if (protectionOwners.get(id) === protection)
            protectionOwners.delete(id);
          if (persistenceServices.get(id) === persistence)
            persistenceServices.delete(id);
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
      }).catch((error) => {
        void persistence.closeActiveStore().catch(() => {}).finally(() => protection.lock());
        if (protectionOwners.get(id) === protection)
          protectionOwners.delete(id);
        if (persistenceServices.get(id) === persistence)
          persistenceServices.delete(id);
        throw error;
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
        protectionState,
        persistenceState: async (profileId, epoch, workspaceId, retry) => {
          if (
            profiles.epoch(profileId) !== epoch ||
            workspaceId !== syntheticWorkspace
          )
            return null;
          const service = persistenceServices.get(profileId);
          if (!service) return null;
          return retry
            ? service.openWorkspaceStore(workspaceId)
            : service.getPersistenceState(workspaceId);
        },
        activePersistenceState: (profileId, epoch) => {
          if (profiles.epoch(profileId) !== epoch || !syntheticWorkspace)
            return null;
          return (
            persistenceServices
              .get(profileId)
              ?.getPersistenceState(syntheticWorkspace) ?? null
          );
        },
      });
      owner.onState((state) => {
        for (const view of profiles.views()) {
          bridge.emit(view.contents, "lifecycle", { state });
          if (state === "draining" || state === "failed")
            bridge.dispose(view.contents);
        }
      });
      owner.ready();
      if (process.env.F002_ROOT)
        console.error("[F004 verification] owner ready");
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
      .then(async () => {
        for (const service of persistenceServices.values())
          await service.closeActiveStore();
        persistenceServices.clear();
        for (const protection of protectionOwners.values()) protection.lock();
        protectionOwners.clear();
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
