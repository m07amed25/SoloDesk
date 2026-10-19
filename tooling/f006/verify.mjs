import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const suites = ["unit", "integration"].flatMap((kind) => {
  const dir = path.join("tests", "f006", kind);
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".test.mjs"))
      .sort()
      .map((name) => path.join(dir, name));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
});
if (!suites.length) throw new Error("F006 focused tests are not enrolled");
const result = spawnSync(process.execPath, ["--test", ...suites], {
  cwd: process.cwd(),
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
