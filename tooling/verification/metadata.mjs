// Standalone metadata dispatcher: no candidate dependency/module imports before base selection.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
const root = process.cwd(),
  mode = process.argv[2];
if (!["context", "aggregate"].includes(mode)) throw new Error("metadata-mode");
const file = process.env.GITHUB_EVENT_PATH;
if (!file || fs.statSync(file).size > 2097152)
  throw new Error("metadata-event");
const event = JSON.parse(fs.readFileSync(file, "utf8")),
  base = event.pull_request?.base.sha || event.before;
if (!/^[a-f0-9]{40,64}$/.test(base || "")) throw new Error("metadata-base");
const git = (...args) =>
  execFileSync("git", args, { cwd: root, timeout: 10000, maxBuffer: 33554432 });
const exists = git(
  "ls-tree",
  "--name-only",
  base,
  "verification/policy.v1.json",
)
  .toString()
  .trim();
let entry = path.join(root, "tooling/verification/hosted.mjs");
const env = { ...process.env, F002_TRUSTED_DISPATCH: "1" };
if (exists) {
  const dest = path.join(root, ".verification/trusted-base");
  if (fs.existsSync(dest)) throw new Error("metadata-allocation-exists");
  fs.mkdirSync(dest, { recursive: true, mode: 0o700 });
  const archive = git(
    "archive",
    base,
    "tooling/verification",
    "schema/verification",
    "verification",
  );
  execFileSync("tar", ["-x", "-C", dest], {
    input: archive,
    timeout: 10000,
    maxBuffer: 2097152,
  });
  entry = path.join(dest, "tooling/verification/hosted.mjs");
  env.F002_BASE_POLICY =
    ".verification/trusted-base/verification/policy.v1.json";
}
const r = spawnSync(process.execPath, [entry, mode], {
  cwd: root,
  env,
  stdio: "inherit",
  timeout: mode === "aggregate" ? 110000 : 280000,
});
process.exitCode = r.status ?? 2;
