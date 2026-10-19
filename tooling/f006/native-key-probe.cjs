const { app, safeStorage } = require("electron");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.whenReady().then(async () => {
  const backend = process.platform === "linux" ? safeStorage.getSelectedStorageBackend() : "os";
  const { ElectronKeyProvider } = await import(pathToFileURL(path.resolve("app/main/protection/key-provider.ts")));
  const provider = new ElectronKeyProvider();
  const context = { identityBindingId: "synthetic-a", dataSetId: "dataset_a_00000001", generation: "generation_000001" };
  const dir = await mkdtemp(path.join(tmpdir(), "f006-native-key-"));
  const file = path.join(dir, "key.envelope");
  try {
    if (backend === "basic_text" || backend === "unknown") {
      let reason = "unexpected_success";
      try { await provider.create(file, context); } catch (error) { reason = error.reason || "unexpected_error"; }
      if (reason !== "unprotected_backend") throw new Error("unprotected backend was not denied");
      console.log(JSON.stringify({ electron: process.versions.electron, backend, outcome: reason }));
    } else {
      const created = await provider.create(file, context);
      const persisted = await readFile(file);
      if (persisted.includes(created.key.toString("hex"))) throw new Error("raw key in envelope");
      const opened = await provider.open(file, context);
      if (!opened.key.equals(created.key)) throw new Error("key reopen mismatch");
      let wrongIdentity = "unexpected_success";
      try { await provider.open(file, { ...context, identityBindingId: "synthetic-b" }); }
      catch (error) { wrongIdentity = error.reason || "unexpected_error"; }
      if (wrongIdentity !== "integrity_failed") throw new Error("wrong identity accepted");
      created.key.fill(0);
      opened.key.fill(0);
      console.log(JSON.stringify({ electron: process.versions.electron, backend, outcome: "protected_reopen", wrongIdentity }));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
    app.quit();
  }
}).catch((error) => { console.error(error?.message || "probe_failed"); app.exit(1); });
