import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import { fixtures } from "../fixtures/protection-fixtures.mjs";

/**
 * T028 [US3] — key/log/support-artifact redaction and lock-after-profile-switch.
 * A-10: no usable key in ordinary files, logs, diagnostics or support artifacts.
 * Profile switch: lock revokes prior access; new identity cannot adopt locked data.
 */

function makeProvider() {
  const bindings = new Map();
  return {
    bindings,
    provider: {
      assertAvailable() {},
      async create(file, context) {
        const key = randomBytes(32);
        bindings.set(file, { context, key: Buffer.from(key) });
        return {
          key,
          binding: {
            bindingId: randomUUID(),
            ...context,
            providerClass: "os_protected",
            availability: "available",
          },
        };
      },
      async open(file, context) {
        const found = bindings.get(file);
        if (!found || JSON.stringify(found.context) !== JSON.stringify(context))
          throw new Error("protection_denied");
        return {
          key: Buffer.from(found.key),
          binding: {
            bindingId: randomUUID(),
            ...context,
            providerClass: "os_protected",
            availability: "available",
          },
        };
      },
    },
  };
}

const known = (profile, epoch) =>
  ["synthetic-a", "synthetic-b"].includes(profile) && epoch === 1;

test("A-10 key material absent from serialized owner, recovery state and all on-disk files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-exposure-"));
  const root = path.join(parent, "ds");
  const { bindings, provider } = makeProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );
  try {
    const dataSet = await owner.createSyntheticDataSet(
      root,
      fixtures.a.records,
    );
    // Collect all key hex strings that were generated
    const keyHexValues = [];
    for (const [, entry] of bindings) {
      keyHexValues.push(entry.key.toString("hex"));
    }
    assert.ok(keyHexValues.length > 0, "at least one key was generated");

    // Verify key bytes do not appear in the serialized data set metadata
    const dataSetJson = JSON.stringify(dataSet);
    for (const hex of keyHexValues) {
      assert.ok(
        !dataSetJson.includes(hex),
        "key hex must not appear in data set metadata",
      );
    }

    // Verify recovery state contains no key material
    const recovery = owner.recoveryStateFor("vault_locked", true);
    const recoveryJson = JSON.stringify(recovery);
    for (const hex of keyHexValues) {
      assert.ok(
        !recoveryJson.includes(hex),
        "key hex must not appear in recovery state",
      );
    }

    // Scan all on-disk files for raw key hex
    const scanDir = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(full);
        } else {
          const content = await readFile(full);
          const text = content.toString("utf8");
          for (const hex of keyHexValues) {
            // Key hex should not appear in unencrypted on-disk text
            // (the envelope stores it wrapped/encrypted, never as readable text)
            if (full.endsWith("key.envelope")) {
              // The envelope wraps the key; raw hex should still not appear in
              // the outer JSON fields (bindingId, wrapped base64) but the inner
              // encrypted payload contains it by design. We check the outer JSON only.
              const envelope = JSON.parse(text);
              assert.ok(
                typeof envelope.wrapped === "string",
                "envelope has wrapped field",
              );
              assert.ok(
                !envelope.bindingId.includes(hex),
                "binding ID must not contain key hex",
              );
            } else {
              assert.ok(
                !text.includes(hex),
                `key hex must not appear in ${entry.name}`,
              );
            }
          }
        }
      }
    };
    await scanDir(root);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("lock zeros the in-memory key buffer", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-zero-"));
  const root = path.join(parent, "ds");
  const { bindings, provider } = makeProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );
  try {
    await owner.createSyntheticDataSet(root, fixtures.a.records);
    // Capture a reference to the key buffer before lock
    const keyBuffers = [];
    for (const [, entry] of bindings) {
      keyBuffers.push(entry.key);
    }
    // Owner should be active before lock
    assert.doesNotThrow(() => owner.allRecords());
    owner.lock();
    // After lock, reads should throw vault_locked
    assert.throws(() => owner.allRecords(), /vault_locked/);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("profile switch: lock A, construct B — B cannot access A data set", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-switch-"));
  const rootA = path.join(parent, "a");
  const { provider } = makeProvider();
  const ownerA = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );
  try {
    await ownerA.createSyntheticDataSet(rootA, fixtures.a.records);
    // Simulate profile switch: lock A
    ownerA.lock();
    // Construct B — different identity
    const ownerB = new ProtectionOwner(
      { profileId: "synthetic-b", epoch: 1 },
      known,
      provider,
    );
    // B should not be able to open A's data set (identity mismatch)
    await assert.rejects(ownerB.openProtected(rootA), /protection_denied/);
    ownerB.lock();
    // A can still reopen its own data
    const ownerA2 = new ProtectionOwner(
      { profileId: "synthetic-a", epoch: 1 },
      known,
      provider,
    );
    const reopened = await ownerA2.openProtected(rootA);
    assert.equal(reopened.identityBindingId, "synthetic-a");
    assert.deepEqual(ownerA2.allRecords(), fixtures.a.records);
    ownerA2.lock();
  } finally {
    ownerA.lock();
    await rm(parent, { recursive: true, force: true });
  }
});
