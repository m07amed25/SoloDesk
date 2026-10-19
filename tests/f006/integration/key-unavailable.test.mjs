import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import { fixtures } from "../fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";

const identity = { profileId: "synthetic-a", epoch: 1 };
const known = (profile, epoch) => profile === identity.profileId && epoch === identity.epoch;
const binding = (context) => ({ bindingId: randomUUID(), ...context, providerClass: "os_protected", availability: "available" });

test("A-05/A-07 unavailable key states preserve prior encrypted bytes exactly", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-unavailable-"));
  const root = path.join(parent, "existing");
  const saved = new Map();
  const available = {
    assertAvailable() {},
    async create(file, context) {
      const key = randomBytes(32);
      saved.set(file, { context, key: Buffer.from(key) });
      return { key, binding: binding(context) };
    },
    async open(file, context) {
      const found = saved.get(file);
      if (!found) throw new Error("key_missing");
      return { key: Buffer.from(found.key), binding: binding(context) };
    },
  };
  const first = new ProtectionOwner(identity, known, available);
  try {
    await first.createSyntheticDataSet(root, fixtures.a.records);
    first.lock();
    const before = await inventoryFiles(root);
    for (const reason of ["vault_locked", "key_missing", "protection_denied", "unprotected_backend"]) {
      const unavailable = {
        assertAvailable() { throw new Error(reason); },
        async create() { throw new Error(reason); },
        async open() { throw new Error(reason); },
      };
      const owner = new ProtectionOwner(identity, known, unavailable);
      await assert.rejects(owner.openProtected(root), new RegExp(reason));
      assert.deepEqual(await inventoryFiles(root), before);
      const fresh = path.join(parent, `fresh-${reason}`);
      await assert.rejects(owner.createSyntheticDataSet(fresh, fixtures.a.records), new RegExp(reason));
      await assert.rejects(stat(fresh), { code: "ENOENT" });
    }
  } finally {
    first.lock();
    await rm(parent, { recursive: true, force: true });
  }
});
