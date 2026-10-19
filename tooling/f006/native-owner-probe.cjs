const { app, safeStorage } = require("electron");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const source = (relative) => import(pathToFileURL(path.resolve(relative)));
app.whenReady().then(async () => {
  const [{ ProtectionOwner }, { ElectronKeyProvider }, { fixtures, rawMarkers }, { inventoryFiles }] = await Promise.all([
    source("app/main/protection/owner.ts"),
    source("app/main/protection/key-provider.ts"),
    source("tests/f006/fixtures/protection-fixtures.mjs"),
    source("tooling/f006/file-inventory.mjs"),
  ]);
  const provider = new ElectronKeyProvider();
  const backend = process.platform === "linux" ? safeStorage.getSelectedStorageBackend() : "os";
  const parent = await mkdtemp(path.join(tmpdir(), "f006-native-owner-"));
  const root = path.join(parent, "dataset");
  const identity = { profileId: "synthetic-a", epoch: 1 };
  const known = (profile, epoch) => ["synthetic-a", "synthetic-b"].includes(profile) && epoch === 1;
  const owner = new ProtectionOwner(identity, known, provider);
  try {
    if (backend === "basic_text" || backend === "unknown") {
      let reason = "unexpected_success";
      try { await owner.createSyntheticDataSet(root, fixtures.a.records); }
      catch (error) { reason = error.reason || error.message; }
      if (reason !== "unprotected_backend") throw new Error("unprotected backend accepted");
      console.log(JSON.stringify({ electron: process.versions.electron, backend, outcome: reason }));
    } else {
      const dataSet = await owner.createSyntheticDataSet(root, fixtures.a.records);
      const staged = await owner.stageSyntheticFile(fixtures.a.fileBytes);
      owner.lock();
      await owner.openProtected(root);
      if (JSON.stringify(owner.allRecords()) !== JSON.stringify(fixtures.a.records)) throw new Error("record reopen mismatch");
      if (owner.search(fixtures.a.searchTerm).length !== 1) throw new Error("search reopen mismatch");
      if (!(await owner.readSyntheticFile(staged)).equals(fixtures.a.fileBytes)) throw new Error("stage reopen mismatch");
      owner.lock();
      const swapped = new ProtectionOwner({ profileId: "synthetic-b", epoch: 1 }, known, provider);
      let wrongIdentity = "unexpected_success";
      try { await swapped.openProtected(root); } catch (error) { wrongIdentity = error.reason || error.message; }
      if (wrongIdentity !== "protection_denied") throw new Error("wrong identity opened data");
      const inventory = await inventoryFiles(root, rawMarkers);
      if (!inventory.length || inventory.some((entry) => entry.markerCount > 0)) throw new Error("raw marker found");
      console.log(JSON.stringify({ electron: process.versions.electron, backend, outcome: "protected_reopen", wrongIdentity,
        dataSetFormat: dataSet.formatVersion, files: inventory.length, rawMarkers: 0 }));
    }
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
    app.quit();
  }
}).catch((error) => { console.error(error?.message || "probe_failed"); app.exit(1); });
