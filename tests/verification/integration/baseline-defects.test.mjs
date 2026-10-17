import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runProcess } from "../../../tooling/verification/run-suite.mjs";
import os from "node:os";
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "f002-defect-"));
  t.after(() => fs.rmSync(dir, { force: true, recursive: true }));
  return dir;
}
test("real type checker rejects an independently invalid assignment", async (t) => {
  const dir = fixture(t),
    file = path.join(dir, "bad.ts");
  fs.writeFileSync(file, 'const amount: number = "synthetic";\n');
  const r = await runProcess(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "--ignoreConfig",
      "--noEmit",
      "--skipLibCheck",
      "--target",
      "es2022",
      file,
    ],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /not assignable/);
});
test("real linter rejects debugger in explicit fixture", async (t) => {
  const dir = fixture(t),
    file = path.join(dir, "bad.js");
  fs.writeFileSync(file, "debugger;\n");
  const r = await runProcess(
    process.execPath,
    ["node_modules/oxlint/bin/oxlint", "--no-ignore", "--deny-warnings", file],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /no-debugger/);
});
test("real Vite build rejects malformed independent entry", async (t) => {
  const dir = fixture(t),
    file = path.join(dir, "bad.ts"),
    config = path.join(dir, "vite.config.mjs");
  fs.writeFileSync(file, "export ???;\n");
  fs.writeFileSync(
    config,
    `export default ${JSON.stringify({ build: { outDir: path.join(dir, "out"), lib: { entry: file, formats: ["cjs"] } } })};`,
  );
  const r = await runProcess(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build", "--config", config],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /error|Error|Unexpected/);
});
test("existing launcher suite detects a deliberately broken cleanup adapter", async (t) => {
  const dir = fixture(t),
    stub = path.join(dir, "start.mjs"),
    file = path.join(dir, "start.test.mjs");
  fs.writeFileSync(
    stub,
    "export function launchEnvironment(source){ return {...source}; }\n",
  );
  const original = fs.readFileSync("tooling/start.test.mjs", "utf8");
  assert.ok(original.includes("./start.mjs"));
  fs.writeFileSync(
    file,
    original.replaceAll("./start.mjs", pathToFileURL(stub).href),
  );
  const r = await runProcess(
    process.execPath,
    ["--test", "--test-reporter=tap", file],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.notEqual(r.code, 0);
  assert.match(r.stdout, /# fail [1-9]/);
});
