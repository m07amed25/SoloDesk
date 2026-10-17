import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { safePath } from "./artifacts.mjs";
export function verifyLock(root) {
  const p = JSON.parse(fs.readFileSync(safePath(root, "package.json"), "utf8")),
    l = JSON.parse(
      fs.readFileSync(safePath(root, "package-lock.json"), "utf8"),
    );
  for (const group of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const a = p[group] || {},
      b = l.packages?.[""]?.[group] || {};
    if (
      JSON.stringify(Object.entries(a).sort()) !==
      JSON.stringify(Object.entries(b).sort())
    )
      throw new Error("lock-mismatch");
  }
  return true;
}
export function verifyTool(root, relative, sha) {
  const file = safePath(root, relative);
  if (
    !/^[a-f0-9]{64}$/.test(sha) ||
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") !==
      sha
  )
    throw new Error("tool-checksum");
  return file;
}
export function setup(root, { desktop = false, cache = false } = {}) {
  if (cache) throw new Error("cache-disabled");
  verifyLock(root);
  const hash = (p) =>
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, p)))
      .digest("hex");
  const before = ["package.json", "package-lock.json"].map(hash);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: root,
    timeout: 600000,
    stdio: "inherit",
    shell: false,
  });
  if (desktop)
    execFileSync(process.execPath, ["node_modules/electron/install.js"], {
      cwd: root,
      timeout: 300000,
      stdio: "inherit",
    });
  if (
    before.some((x, i) => x !== hash(["package.json", "package-lock.json"][i]))
  )
    throw new Error("setup-mutated-lock");
  return { locked: true, desktop, cache: false };
}
