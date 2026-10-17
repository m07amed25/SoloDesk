import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "./artifacts.mjs";
import { runProcess, childEnvironment } from "./run-suite.mjs";
const target =
  process.argv[2] ||
  `${process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"}-${process.arch}`;
const actual = `${process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"}-${process.arch}`;
if (target !== actual) throw new Error("native-target-unavailable");

const entry = path.resolve(".vite/build/main.js");
if (
  !fs.existsSync(entry) ||
  !fs.existsSync(".vite/renderer/main_window/index.html")
)
  throw new Error("built-entry-unavailable");
const headless =
  process.platform === "linux" &&
  !process.env.DISPLAY &&
  !process.env.WAYLAND_DISPLAY;
const owned = allocate(process.cwd(), `desktop-report-${crypto.randomUUID()}`);
const argv = [
  "node_modules/@playwright/test/cli.js",
  "test",
  "--config",
  "playwright.config.mjs",
];
const run = await runProcess(
  headless ? "xvfb-run" : process.execPath,
  headless ? ["-a", process.execPath, ...argv] : argv,
  {
    cwd: process.cwd(),
    timeout: 80000,
    env: childEnvironment({ F002_REPORT_DIR: owned }),
  },
);
let counts = null;
const screenshots = [];
try {
  const data = JSON.parse(
    fs.readFileSync(path.join(owned, "result.json"), "utf8"),
  );
  const walk = (v) => {
    if (v && typeof v === "object") {
      if (v.contentType === "image/png" && typeof v.path === "string")
        screenshots.push(
          path.relative(process.cwd(), v.path).split(path.sep).join("/"),
        );
      for (const x of Object.values(v)) walk(x);
    }
  };
  walk(data);
  counts = {
    executed: data.stats.expected + data.stats.unexpected + data.stats.skipped,
    passed: data.stats.expected,
    failed: data.stats.unexpected,
    skipped: data.stats.skipped,
  };
} catch {
  /* Missing evidence blocks. */
}
console.log(
  JSON.stringify({
    target,
    os: process.platform,
    arch: process.arch,
    electron: JSON.parse(
      fs.readFileSync("node_modules/electron/package.json", "utf8"),
    ).version,
    screenshots,
    entry_sha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(entry))
      .digest("hex"),
    counts,
    reason: run.reason,
    stdout: run.stdout,
    stderr: run.stderr,
  }),
);
process.exitCode =
  run.code === 0 &&
  !run.reason &&
  counts?.executed > 0 &&
  counts.passed === counts.executed &&
  !counts.failed &&
  !counts.skipped
    ? 0
    : 1;
