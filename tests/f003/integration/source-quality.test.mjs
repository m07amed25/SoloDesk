import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createScanner, SyntaxKind } from "typescript/unstable/ast";
const root = process.cwd();
const exec = (args) =>
  spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
function imports(file, text) {
  const scan = createScanner(true, undefined, text),
    bad = [];
  let token,
    previous = "",
    importing = false;
  while ((token = scan.scan()) !== SyntaxKind.EndOfFile) {
    const word = scan.getTokenText();
    if (token === SyntaxKind.ImportKeyword) importing = true;
    if (
      token === SyntaxKind.Identifier &&
      [
        "process",
        "window",
        "document",
        "Buffer",
        "fetch",
        "require",
        "execute",
        "eval",
        "Function",
        "globalThis",
      ].includes(scan.getTokenValue())
    )
      bad.push(word);
    if (importing && previous === "(" && token !== SyntaxKind.StringLiteral)
      bad.push("computed-import");
    if (
      token === SyntaxKind.StringLiteral &&
      (importing || previous === "from")
    ) {
      const value = scan.getTokenValue();
      let resolved = "";
      try {
        resolved = fs.realpathSync(path.resolve(path.dirname(file), value));
      } catch {
        bad.push(value);
      }
      if (
        !value.startsWith(".") ||
        !resolved.includes(`${path.sep}packages${path.sep}`)
      )
        bad.push(value);
      if (
        file.includes(`${path.sep}domain${path.sep}`) &&
        resolved &&
        !resolved.includes(`${path.sep}domain${path.sep}`)
      )
        bad.push(value);
      importing = false;
    }
    if (word === ";") importing = false;
    previous = word;
  }
  return bad;
}
const files = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((x) =>
      x.isDirectory()
        ? files(path.join(p, x.name))
        : x.name.endsWith(".ts")
          ? [path.join(p, x.name)]
          : [],
    );
test("shared typecheck and deliberate ambient-privilege violation", () => {
  const result = exec([
    "node_modules/typescript/bin/tsc",
    "--project",
    "tsconfig.shared.json",
  ]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "f003-types-"));
  try {
    const file = path.join(temp, "bad.ts");
    fs.writeFileSync(file, "const leaked: string = process.env.TOKEN;");
    const config = path.join(temp, "tsconfig.json");
    fs.writeFileSync(
      config,
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022"],
          types: [],
          strict: true,
          noEmit: true,
        },
        files: [file],
      }),
    );
    const bad = exec(["node_modules/typescript/bin/tsc", "--project", config]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stdout, /process/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("locked package lint and deliberate undefined identifier", () => {
  const result = exec([
    "node_modules/oxlint/bin/oxlint",
    "--deny-warnings",
    "--threads",
    "2",
    "packages",
    "tests/f003",
    "tooling/f003",
  ]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "f003-lint-"));
  try {
    const file = path.join(temp, "bad.mjs");
    fs.writeFileSync(file, "const unusedF003Name = 1;");
    const bad = exec([
      "node_modules/oxlint/bin/oxlint",
      "--deny-warnings",
      file,
    ]);
    assert.notEqual(bad.status, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("actual module resolution and privileged API negative", () => {
  for (const file of files(path.join(root, "packages")))
    assert.deepEqual(imports(file, fs.readFileSync(file, "utf8")), [], file);
  assert.notEqual(
    imports(
      path.join(root, "packages/domain/src/bad.ts"),
      "import fs from 'node:fs'; export const execute = () => fs.readFileSync('/tmp/secret');",
    ).length,
    0,
  );
});
