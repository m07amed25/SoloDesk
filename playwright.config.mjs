import { defineConfig } from "@playwright/test";
const owned = process.env.F002_REPORT_DIR;
if (!/^\.verification\/desktop-report-[\w-]+$/.test(owned || ""))
  throw new Error("owned-report-required");
export default defineConfig({
  testDir: "./tests/verification/desktop",
  testMatch: "shell.spec.mjs",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  outputDir: `${owned}/results`,
  reporter: [["line"], ["json", { outputFile: `${owned}/result.json` }]],
  use: { trace: "off", video: "off" },
});
