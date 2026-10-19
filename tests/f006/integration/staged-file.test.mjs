import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { expected, fixtures, rawMarkers } from "../fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";
import { sealStagedFile, openStagedFile } from "../../../app/main/protection/files.ts";

test("A-03 staged binary bytes seal, reopen exactly and leave no raw marker", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "f006-stage-"));
  const key = randomBytes(32);
  const context = { identityBindingId: "synthetic-a", dataSetId: "dataset_a_00000001", generation: "generation_000001" };
  try {
    const staged = await sealStagedFile(dir, key, context, fixtures.a.fileBytes);
    assert.equal(staged.lifecycle, "sealed");
    assert.equal(staged.expectedDigest, expected.a.fileDigest);
    assert.deepEqual(await openStagedFile(dir, key, context, staged), fixtures.a.fileBytes);
    assert.ok((await inventoryFiles(dir, rawMarkers)).every((entry) => entry.markerCount === 0));
    await assert.rejects(openStagedFile(dir, randomBytes(32), context, staged));
    await assert.rejects(openStagedFile(dir, key, { ...context, identityBindingId: "synthetic-b" }, staged));
    const surface = path.join(dir, `${staged.fileId}.stage`);
    const encrypted = await readFile(surface);
    await writeFile(surface, encrypted.subarray(0, Math.floor(encrypted.length / 2)));
    await assert.rejects(openStagedFile(dir, key, context, staged));
    await assert.rejects(openStagedFile(dir, key, context, { ...staged, lifecycle: "interrupted" }));
    assert.ok((await inventoryFiles(dir, rawMarkers)).every((entry) => entry.markerCount === 0));
  } finally {
    key.fill(0);
    await rm(dir, { recursive: true, force: true });
  }
});
