import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import {
  rotateKey,
  reconcileRotation,
} from "../../../app/main/protection/rotation.ts";
import { fixtures } from "../fixtures/protection-fixtures.mjs";

function makeMockProvider() {
  const envelopes = new Map();
  return {
    envelopes,
    provider: {
      assertAvailable() {},
      classifyAvailability() {
        return "available";
      },
      async create(file, context) {
        const key = randomBytes(32);
        envelopes.set(file, { context, key: Buffer.from(key) });
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
        const found = envelopes.get(file);
        if (!found) throw new Error("key_missing");
        if (
          found.context.identityBindingId !== context.identityBindingId ||
          found.context.dataSetId !== context.dataSetId ||
          found.context.generation !== context.generation
        ) {
          throw new Error("protection_denied");
        }
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

const known = (p, epoch) => p === "synthetic-a" && epoch === 1;

test("A-12/A-13 complete key rotation transitions monotonically and retires old key", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rotation-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    await owner.stageSyntheticFile(fixtures.a.fileBytes);
    const oldGen = ds.activeGeneration;

    // Execute full key rotation
    const result = await rotateKey(owner, dir, provider);
    assert.equal(result.attempt.phase, "retired");
    assert.equal(result.attempt.validationResult, "valid");
    assert.notEqual(result.newGeneration, oldGen);

    // Old key cannot open new generation
    owner.lock();
    const reopened = await owner.openProtected(dir);
    assert.equal(reopened.activeGeneration, result.newGeneration);
    assert.deepEqual(owner.allRecords(), fixtures.a.records);

    // Staged file survives rotation
    const fileBytes = await owner.readSyntheticFile(result.stagedFiles[0]);
    assert.deepEqual(fileBytes, fixtures.a.fileBytes);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("A-12 interruption at prepare checkpoint preserves intact prior generation on restart", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rot-prep-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    const initialGen = ds.activeGeneration;

    // Simulate interruption during prepared phase
    await rotateKey(owner, dir, provider, { failAt: "prepared" }).catch(
      () => {},
    );
    owner.lock();

    // Reconcile and reopen
    const reconciled = await reconcileRotation(dir, provider);
    assert.equal(reconciled.selectedGeneration, initialGen);

    await owner.openProtected(dir);
    assert.equal(owner.allRecords().length, fixtures.a.records.length);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("A-12 interruption at candidate_written preserves intact prior generation on restart", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rot-written-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    const initialGen = ds.activeGeneration;

    // Fail at candidate_written
    await rotateKey(owner, dir, provider, {
      failAt: "candidate_written",
    }).catch(() => {});
    owner.lock();

    const reconciled = await reconcileRotation(dir, provider);
    assert.equal(reconciled.selectedGeneration, initialGen);

    await owner.openProtected(dir);
    assert.deepEqual(owner.allRecords(), fixtures.a.records);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("A-12 interruption at candidate_verified (before selected) preserves prior generation", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rot-verified-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    const initialGen = ds.activeGeneration;

    // Fail at candidate_verified before selection
    await rotateKey(owner, dir, provider, {
      failAt: "candidate_verified",
    }).catch(() => {});
    owner.lock();

    const reconciled = await reconcileRotation(dir, provider);
    assert.equal(reconciled.selectedGeneration, initialGen);

    await owner.openProtected(dir);
    assert.deepEqual(owner.allRecords(), fixtures.a.records);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("A-12 interruption at selected (before retired) completes selection on restart", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rot-selected-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    const initialGen = ds.activeGeneration;

    // Fail at selected before retired
    await rotateKey(owner, dir, provider, { failAt: "selected" }).catch(
      () => {},
    );
    owner.lock();

    const reconciled = await reconcileRotation(dir, provider);
    assert.notEqual(reconciled.selectedGeneration, initialGen);

    await owner.openProtected(dir);
    assert.deepEqual(owner.allRecords(), fixtures.a.records);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});

test("candidate write failure or disk-full leaves prior generation completely untouched", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "f006-rot-err-"));
  const dir = path.join(parent, "ds");
  const { provider } = makeMockProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    known,
    provider,
  );

  try {
    const ds = await owner.createSyntheticDataSet(dir, fixtures.a.records);
    const initialGen = ds.activeGeneration;

    // Simulate failure during candidate generation
    await assert.rejects(async () => {
      await rotateKey(owner, dir, provider, { injectWriteError: true });
    });

    owner.lock();
    const reopened = await owner.openProtected(dir);
    assert.equal(reopened.activeGeneration, initialGen);
    assert.equal(owner.allRecords().length, fixtures.a.records.length);
  } finally {
    owner.lock();
    await rm(parent, { recursive: true, force: true });
  }
});
