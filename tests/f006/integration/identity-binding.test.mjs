import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import { fixtures } from "../fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";

test("A-09/A-10 copied database, staged bytes and key references do not cross identities", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-binding-"));
  const rootA = path.join(parent, "a");
  const rootB = path.join(parent, "b");
  const storage = async (root) => path.join(root, "generations", JSON.parse(await readFile(path.join(root, "dataset.json"), "utf8")).activeGeneration);
  const bindings = new Map();
  const provider = {
    assertAvailable() {},
    async create(file, context) {
      const key = randomBytes(32);
      bindings.set(file, { context, key: Buffer.from(key) });
      return { key, binding: { bindingId: randomUUID(), ...context, providerClass: "os_protected", availability: "available" } };
    },
    async open(file, context) {
      const found = bindings.get(file);
      if (!found || JSON.stringify(found.context) !== JSON.stringify(context)) throw new Error("protection_denied");
      return { key: Buffer.from(found.key), binding: { bindingId: randomUUID(), ...context, providerClass: "os_protected", availability: "available" } };
    },
  };
  const known = (profile, epoch) => ["synthetic-a", "synthetic-b"].includes(profile) && epoch === 1;
  const a = new ProtectionOwner({ profileId: "synthetic-a", epoch: 1 }, known, provider);
  const b = new ProtectionOwner({ profileId: "synthetic-b", epoch: 1 }, known, provider);
  try {
    await a.createSyntheticDataSet(rootA, fixtures.a.records);
    const stageA = await a.stageSyntheticFile(fixtures.a.fileBytes);
    await b.createSyntheticDataSet(rootB, fixtures.b.records);
    const stageB = await b.stageSyntheticFile(fixtures.b.fileBytes);
    a.lock(); b.lock();
    const dirA = await storage(rootA);
    const dirB = await storage(rootB);
    const originalB = await readFile(path.join(dirB, "data.db"));
    const beforeB = await inventoryFiles(rootB);
    await copyFile(path.join(dirA, "data.db"), path.join(dirB, "data.db"));
    await assert.rejects(b.openProtected(rootB), /integrity_failed/);
    assert.notDeepEqual(await inventoryFiles(rootB), beforeB);
    await writeFile(path.join(dirB, "data.db"), originalB);
    await b.openProtected(rootB);
    await copyFile(path.join(dirA, `${stageA.fileId}.stage`), path.join(dirB, `${stageB.fileId}.stage`));
    await assert.rejects(b.readSyntheticFile(stageB), /integrity_failed/);
    b.lock();
    // Altering the unencrypted selector cannot make A's key envelope authorize B.
    const aMeta = JSON.parse(await readFile(path.join(rootA, "dataset.json"), "utf8"));
    await writeFile(path.join(rootA, "dataset.json"), JSON.stringify({ ...aMeta, identityBindingId: "synthetic-b" }));
    await assert.rejects(b.openProtected(rootA), /protection_denied/);
  } finally {
    a.lock(); b.lock();
    await rm(parent, { recursive: true, force: true });
  }
});
