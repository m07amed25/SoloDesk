import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkDocuments } from "../../../tooling/verification/documentation.mjs";
function root(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "f002-doc-"));
  t.after(() => fs.rmSync(d, { force: true, recursive: true }));
  fs.writeFileSync(
    path.join(d, "target.md"),
    '# مرحبا\n\n<a id="explicit"></a>',
  );
  return d;
}
test("Unicode and explicit anchors resolve locally without fetching", (t) => {
  const d = root(t);
  fs.writeFileSync(
    path.join(d, "source.md"),
    "[x](target.md#مرحبا) [y](target.md#explicit) [remote](https://example.invalid/no-network)",
  );
  assert.deepEqual(checkDocuments(d, ["source.md"]).findings, []);
});
test("missing target and fragment fail", (t) => {
  const d = root(t);
  fs.writeFileSync(
    path.join(d, "source.md"),
    "[x](missing.md) [y](target.md#absent)",
  );
  assert.equal(checkDocuments(d, ["source.md"]).findings.length, 2);
});
test("traversal and unsupported required references fail", (t) => {
  const d = root(t);
  fs.writeFileSync(path.join(d, "source.md"), "[x](../private.md)");
  assert.equal(checkDocuments(d, ["source.md"]).findings.length, 1);
});
test("feature-local IDs resolve against their owning spec", (t) => {
  const d = root(t);
  fs.mkdirSync(path.join(d, "specs/002-synthetic"), { recursive: true });
  fs.writeFileSync(
    path.join(d, "specs/002-synthetic/spec.md"),
    "# F002\n\n- **FR-001**: Synthetic rule\n",
  );
  fs.writeFileSync(
    path.join(d, "specs/002-synthetic/notes.md"),
    "FR-999 is required.",
  );
  assert.ok(
    checkDocuments(d, ["specs/002-synthetic/notes.md"]).findings.some(
      (f) => f.code === "unknown-local-id",
    ),
  );
});
test("duplicate authoritative local IDs rejected", (t) => {
  const d = root(t);
  fs.mkdirSync(path.join(d, "specs/002-synthetic"), { recursive: true });
  fs.writeFileSync(
    path.join(d, "specs/002-synthetic/spec.md"),
    "- **FR-001**: One\n- **FR-001**: Two\n",
  );
  assert.ok(
    checkDocuments(d, ["specs/002-synthetic/spec.md"]).findings.some(
      (f) => f.code === "duplicate-local-id",
    ),
  );
});
test("broken full reference-style link is not silently ignored", (t) => {
  const d = root(t);
  fs.writeFileSync(path.join(d, "source.md"), "[Example][missing-reference]");
  assert.ok(
    checkDocuments(d, ["source.md"]).findings.some(
      (f) => f.code === "document-reference",
    ),
  );
});
