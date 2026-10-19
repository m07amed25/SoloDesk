import { defineConfig } from "@playwright/test";
const owned = process.env.F002_REPORT_DIR;
if (!/^\.verification\/desktop-report-[\w-]+$/.test(owned || ""))
  throw new Error("owned-report-required");
export default defineConfig({
  testDir: "./tests/verification/desktop",
  testMatch: [
    "shell.spec.mjs",
    "f003-runtime.spec.mjs",
    "f004-ownership.spec.mjs",
    "f004-bridge.spec.mjs",
    "f004-links.spec.mjs",
    "f004-lifecycle.spec.mjs",
    "f006-recovery-ui.spec.mjs",
    "f006-protected-files.spec.mjs",
    "f006-key-states.spec.mjs",
    "f006-identity.spec.mjs",
    "f006-key-loss.spec.mjs",
    "f006-rotation.spec.mjs",
  ],
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  outputDir: `${owned}/results`,
  reporter: [["line"], ["json", { outputFile: `${owned}/result.json` }]],
  use: { trace: "off", video: "off" },
});
