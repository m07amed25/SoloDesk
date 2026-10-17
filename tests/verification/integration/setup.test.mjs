import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  verifyLock,
  verifyTool,
} from "../../../tooling/verification/setup.mjs";
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "f002-setup-"));
  t.after(() => fs.rmSync(dir, { force: true, recursive: true }));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ dependencies: { example: "1.0.0" } }),
  );
  fs.writeFileSync(
    path.join(dir, "package-lock.json"),
    JSON.stringify({
      packages: {
        "": { dependencies: { example: "1.0.0" } },
        "node_modules/example": { version: "1.0.0" },
      },
    }),
  );
  return dir;
}
test("consistent lock is accepted without rewriting", (t) => {
  const r = fixture(t),
    before = fs.readFileSync(path.join(r, "package-lock.json"));
  verifyLock(r);
  assert.deepEqual(fs.readFileSync(path.join(r, "package-lock.json")), before);
});
test("manifest lock mismatch fails before install", (t) => {
  const r = fixture(t);
  fs.writeFileSync(
    path.join(r, "package.json"),
    JSON.stringify({ dependencies: { example: "2.0.0" } }),
  );
  assert.throws(() => verifyLock(r), /lock/);
});
test("tool hash mismatch and symlink fail", (t) => {
  const r = fixture(t);
  fs.writeFileSync(path.join(r, "tool"), "synthetic");
  assert.throws(() => verifyTool(r, "tool", "0".repeat(64)), /checksum/);
});
