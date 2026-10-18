import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const suites = ["unit", "integration"].flatMap((kind) =>
  readdirSync(path.join("tests", "f004", kind))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join("tests", "f004", kind, name)),
);
const result = spawnSync(process.execPath, ["--test", ...suites], {
  cwd: process.cwd(),
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
