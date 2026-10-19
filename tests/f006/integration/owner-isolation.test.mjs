import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import { fixtures, rawMarkers } from "../fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";

function proofProvider() {
  const keys = new Map();
  return {
    assertAvailable() {},
    async create(file, context) {
      const key = randomBytes(32);
      keys.set(file, { context, key: Buffer.from(key) });
      return { key, binding: { bindingId: randomUUID(), ...context, providerClass: "os_protected", availability: "available" } };
    },
    async open(file, context) {
      const saved = keys.get(file);
      if (!saved || JSON.stringify(saved.context) !== JSON.stringify(context)) throw new Error("protection_denied");
      return { key: Buffer.from(saved.key), binding: { bindingId: randomUUID(), ...context, providerClass: "os_protected", availability: "available" } };
    },
  };
}

test("synthetic owner reopens exact identity and refuses copied metadata", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-owner-"));
  const root = path.join(parent, "dataset");
  const provider = proofProvider();
  const known = (profile, epoch) => ["synthetic-a", "synthetic-b"].includes(profile) && epoch === 1;
  const a = new ProtectionOwner({ profileId: "synthetic-a", epoch: 1 }, known, provider);
  try {
    const dataSet = await a.createSyntheticDataSet(root, fixtures.a.records);
    assert.deepEqual(a.allRecords(), fixtures.a.records);
    const staged = await a.stageSyntheticFile(fixtures.a.fileBytes);
    assert.deepEqual(await a.readSyntheticFile(staged), fixtures.a.fileBytes);
    a.lock();
    assert.throws(() => a.allRecords(), /vault_locked/);
    await a.openProtected(root);
    assert.deepEqual(a.search(fixtures.a.searchTerm), [fixtures.a.records[1]]);
    assert.deepEqual(await a.readSyntheticFile(staged), fixtures.a.fileBytes);
    a.lock();
    const b = new ProtectionOwner({ profileId: "synthetic-b", epoch: 1 }, known, provider);
    await assert.rejects(b.openProtected(root), /protection_denied/);
    const metadata = JSON.parse(await readFile(path.join(root, "dataset.json"), "utf8"));
    assert.equal(metadata.dataSetId, dataSet.dataSetId);
    assert.ok((await inventoryFiles(root, rawMarkers)).every((entry) => entry.markerCount === 0));
  } finally {
    a.lock();
    await rm(parent, { recursive: true, force: true });
  }
});
