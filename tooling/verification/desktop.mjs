import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "./artifacts.mjs";
import {
  desktopColorEnabled,
  formatDesktopHuman,
} from "./desktop-output.mjs";
import { runProcess, childEnvironment } from "./run-suite.mjs";
const args = process.argv.slice(2);
if (args.some((arg) => arg.startsWith("--") && arg !== "--human"))
  throw new Error("unknown-desktop-option");
const human = args.includes("--human");
if (args.filter((arg) => !arg.startsWith("--")).length > 1)
  throw new Error("invalid-desktop-target");
const actual = `${process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"}-${process.arch}`;
const target = args.find((arg) => !arg.startsWith("--")) || actual;
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
if (human) console.log(`Running desktop tests on ${target}...`);
const run = await runProcess(
  headless ? "xvfb-run" : process.execPath,
  headless ? ["-a", process.execPath, ...argv] : argv,
  {
    cwd: process.cwd(),
    timeout: 150000,
    env: childEnvironment({
      F002_REPORT_DIR: owned,
      F002_HEADLESS: headless ? "1" : "0",
      ...(process.env.SOLODESK_DESKTOP_DEBUG === "1"
        ? { DEBUG: "pw:browser" }
        : {}),
    }),
  },
);
let counts = null;
let report = null;
const screenshots = [];
try {
  const data = JSON.parse(
    fs.readFileSync(path.join(owned, "result.json"), "utf8"),
  );
  report = data;
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
const launchUnavailable =
  run.code !== 0 && /Process failed to launch!/.test(run.stdout + run.stderr);
const complete =
  run.code === 0 &&
  !run.reason &&
  !launchUnavailable &&
  counts?.executed >= 2 &&
  counts.passed === counts.executed &&
  !counts.failed &&
  !counts.skipped;
const result = {
  status: launchUnavailable ? "unavailable" : complete ? "passed" : "failed",
  code: launchUnavailable
    ? "native-launch-unavailable"
    : run.reason || (!complete && run.code === 0 ? "native-incomplete" : null),
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
};
if (human)
  console.log(
    formatDesktopHuman(result, report, `${owned}/result.json`, {
      debug: process.env.SOLODESK_DESKTOP_DEBUG === "1",
      color: desktopColorEnabled(process.env, process.stdout.isTTY),
    }),
  );
else console.log(JSON.stringify(result));
process.exitCode = complete ? 0 : 1;
