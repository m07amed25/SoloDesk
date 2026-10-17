import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  safePath,
  redact,
  allocate,
  writeRecord,
  artifact,
  validateArtifact,
} from "../../../tooling/verification/artifacts.mjs";
test("safe artifact path rejects traversal, encoded/active content and symlink", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "F002-artifacts-"));
  try {
    for (const p of [
      "../escape",
      "/tmp/file",
      "C:\\file",
      "x/%2e%2e/file",
      "x.html",
    ])
      assert.throws(() => validateArtifact(root, p));
    fs.symlinkSync(os.tmpdir(), path.join(root, "link"));
    assert.throws(() => safePath(root, "link/file"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("secret tokens and URL credentials/query/path never survive redaction", () => {
  const out = redact(
    "F002_SECRET_fixture https://user:pass@example.test/private?token=sentinel",
  );
  assert.ok(!/fixture|pass|private|sentinel/.test(out));
});
test("atomic owned JSON and digest/expiry/byte checks fail closed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "F002-artifacts-"));
  try {
    const own = allocate(root, "test");
    writeRecord(root, `${own}/a.json`, { safe: true });
    const a = artifact(root, `${own}/a.json`, "c", "r", "k");
    assert.equal(validateArtifact(root, a.path, a), true);
    for (const patch of [
      { sha256: "0".repeat(64) },
      { bytes: 2 },
      { expires_at: "2000-01-01T00:00:00.000Z" },
      { redaction_status: "unknown" },
    ])
      assert.throws(() => validateArtifact(root, a.path, { ...a, ...patch }));
    assert.throws(() =>
      writeRecord(root, `${own}/huge.json`, { data: "x".repeat(2097152) }),
    );
    assert.equal(
      fs.readdirSync(path.join(root, own)).filter((x) => x.endsWith(".tmp"))
        .length,
      0,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
