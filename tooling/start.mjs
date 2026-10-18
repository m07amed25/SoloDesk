import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// VS Code's classic Snap supplies bundled GNOME schemas to terminal children.
// Its terminal can remove SNAP_NAME while retaining the bundled paths, so match
// those paths directly. Standalone Electron needs the host schemas to start.
export function launchEnvironment(
  source,
  platform = process.platform,
  userHome = homedir(),
) {
  const environment = { ...source };
  if (platform !== "linux") return environment;

  const roots = ["/snap/code", path.join(userHome, "snap", "code")];
  const isBundledPath = (value) =>
    roots.some((root) => value === root || value.startsWith(`${root}/`));

  for (const key of [
    "GSETTINGS_SCHEMA_DIR",
    "GIO_MODULE_DIR",
    "GDK_PIXBUF_MODULE_FILE",
    "GTK_EXE_PREFIX",
    "GTK_DATA_PREFIX",
    "GTK_IM_MODULE_FILE",
  ]) {
    if (environment[key] && isBundledPath(environment[key]))
      delete environment[key];
  }

  for (const key of ["XDG_DATA_DIRS", "GTK_PATH", "LD_LIBRARY_PATH"]) {
    if (!environment[key]) continue;
    const kept = environment[key]
      .split(":")
      .filter((entry) => !isBundledPath(entry));
    if (kept.length) environment[key] = kept.join(":");
    else delete environment[key];
  }

  return environment;
}

export function launchArguments(source, platform = process.platform) {
  const args = [...source];
  if (platform === "linux") {
    if (!args.includes("--")) args.push("--");
    // The development shell has no video workload. Avoid probing unsupported
    // VA-API drivers while retaining GPU compositing for the interface.
    for (const flag of [
      "--disable-accelerated-video-decode",
      "--disable-accelerated-video-encode",
    ]) {
      if (!args.includes(flag)) args.push(flag);
    }
  }
  return args;
}

if (import.meta.main) {
  const require = createRequire(import.meta.url);
  const packagePath = require.resolve("@electron-forge/cli/package.json");
  const forgePackage = JSON.parse(readFileSync(packagePath, "utf8"));
  const forgeCli = path.resolve(
    path.dirname(packagePath),
    forgePackage.bin["electron-forge"],
  );
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const child = spawn(
    process.execPath,
    [forgeCli, "start", ...launchArguments(process.argv.slice(2))],
    {
      cwd: projectRoot,
      env: launchEnvironment(process.env),
      stdio: "inherit",
    },
  );

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => child.kill(signal));
  }
  child.once("error", (error) => {
    console.error("Could not start SoloDesk:", error.message);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
}
