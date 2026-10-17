import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectUI } from "../../../tooling/ui-info.mjs";
test("local shadcn configuration and retained licensed stylesheet validate without generator CLI", () => {
  const result = inspectUI(process.cwd());
  assert.equal(result.framework, "shadcn/ui");
  assert.equal(result.styles.version, "4.22.0");
  assert.ok(result.components.includes("button.tsx"));
  assert.equal(result.generator_installed, false);
});
test("modified vendored stylesheet is rejected before it can be called verified", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "F002-ui-"));
  try {
    fs.cpSync("vendor", path.join(root, "vendor"), { recursive: true });
    fs.copyFileSync("components.json", path.join(root, "components.json"));
    fs.writeFileSync(
      path.join(root, "vendor/shadcn-ui/tailwind.css"),
      "modified",
    );
    assert.throws(() => inspectUI(root), /vendor-integrity/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
