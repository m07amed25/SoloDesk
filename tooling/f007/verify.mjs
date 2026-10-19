import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const groups = ["unit", "integration", "migrations"];
const selected = process.argv[2] ? [process.argv[2]] : groups;
if (selected.some((group) => !groups.includes(group))) {
  throw new Error("Unknown F007 test group");
}
const files = selected.flatMap((group) =>
  readdirSync(path.join("tests", "f007", group))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join("tests", "f007", group, name)),
);
if (files.length === 0) throw new Error("F007 tests are not enrolled");
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: process.cwd(),
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
