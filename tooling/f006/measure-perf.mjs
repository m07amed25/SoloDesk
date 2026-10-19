import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { ProtectionOwner } from "../../app/main/protection/owner.ts";
import { rotateKey } from "../../app/main/protection/rotation.ts";
import { fixtures } from "../../tests/f006/fixtures/protection-fixtures.mjs";

class MemoryKeyProvider {
  constructor() {
    this.bindings = new Map();
  }
  classifyAvailability() {
    return "available";
  }
  assertAvailable() {}
  async create(file, context) {
    const key = crypto.randomBytes(32);
    this.bindings.set(file, { context, key: Buffer.from(key) });
    return {
      key,
      binding: {
        bindingId: crypto.randomUUID(),
        ...context,
        providerClass: "os_protected",
        availability: "available",
      },
    };
  }
  async open(file, context) {
    const found = this.bindings.get(file);
    if (!found) throw new Error("key_missing");
    return {
      key: Buffer.from(found.key),
      binding: {
        bindingId: crypto.randomUUID(),
        ...context,
        providerClass: "os_protected",
        availability: "available",
      },
    };
  }
}

async function measure() {
  const tmpParent = await fs.mkdtemp(path.join(os.tmpdir(), "f006-perf-"));
  const root = path.join(tmpParent, "ds");
  const provider = new MemoryKeyProvider();
  const owner = new ProtectionOwner(
    { profileId: "synthetic-a", epoch: 1 },
    (p, epoch) => p === "synthetic-a" && epoch === 1,
    provider,
  );

  const results = {
    os: process.platform,
    arch: process.arch,
    release: os.release(),
    cpus: os.cpus().length,
  };

  try {
    // 1. Create dataset (includes SQLite DB cipher initialization + key derivation + table creation)
    const t0 = performance.now();
    await owner.createSyntheticDataSet(root, fixtures.a.records);
    const tCreate = performance.now() - t0;

    // 2. Write synthetic records (50 records batch)
    const syntheticBatch = Array.from(
      { length: 50 },
      (_, i) => `REC-${i}-${fixtures.a.records[0]}`,
    );
    const t1 = performance.now();
    for (const r of syntheticBatch) {
      owner.writeSyntheticRecord(r);
    }
    const tWrite = performance.now() - t1;

    // 3. Search query across indexed search term
    const t2 = performance.now();
    const searchMatches = owner.search(fixtures.a.searchTerm);
    const tSearch = performance.now() - t2;

    // 4. Staging a binary file
    const t3 = performance.now();
    const staged = await owner.stageSyntheticFile(fixtures.a.fileBytes);
    const tStage = performance.now() - t3;

    // 5. Read staged file
    const t4 = performance.now();
    const readBytes = await owner.readSyntheticFile(staged);
    const tRead = performance.now() - t4;

    // 6. Lock and Reopen
    owner.lock();
    const t5 = performance.now();
    await owner.openProtected(root);
    const tReopen = performance.now() - t5;

    // 7. Key rotation (rekey database + staged files + verify candidate + commit)
    const t6 = performance.now();
    const rot = await rotateKey(owner, root, provider);
    const tRekey = performance.now() - t6;

    results.metrics = {
      datasetCreationMs: Number(tCreate.toFixed(2)),
      batchWrite50RecordsMs: Number(tWrite.toFixed(2)),
      searchQueryMs: Number(tSearch.toFixed(2)),
      fileStagingMs: Number(tStage.toFixed(2)),
      fileReadMs: Number(tRead.toFixed(2)),
      lockAndReopenMs: Number(tReopen.toFixed(2)),
      fullKeyRotationMs: Number(tRekey.toFixed(2)),
      searchMatchesCount: searchMatches.length,
      fileBytesVerified: readBytes.length === fixtures.a.fileBytes.length,
      rotationPhase: rot.attempt.phase,
    };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    owner.lock();
    await fs.rm(tmpParent, { recursive: true, force: true });
  }
}

measure().catch((err) => {
  console.error(err);
  process.exit(1);
});
