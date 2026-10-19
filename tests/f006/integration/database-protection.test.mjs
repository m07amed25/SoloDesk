import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fixtures, rawMarkers } from "../fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";
import { createDatabase, openDatabase } from "../../../app/main/protection/database.ts";

test("A-01/A-02 encrypted record and search survive reopen; wrong key and raw inspection fail closed", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "f006-db-"));
  const file = path.join(dir, "proof.db");
  const context = { identityBindingId: "synthetic-a", dataSetId: "dataset_a_00000001", generation: "generation_000001" };
  const key = randomBytes(32);
  try {
    const created = createDatabase(file, key, context);
    for (const record of fixtures.a.records) created.writeRecord(record);
    assert.deepEqual(created.search(fixtures.a.searchTerm), [fixtures.a.records[1]]);
    created.close();
    const reopened = openDatabase(file, key, context);
    assert.deepEqual(reopened.allRecords(), fixtures.a.records);
    reopened.close();
    const beforeWrongKey = await readFile(file);
    assert.throws(() => openDatabase(file, randomBytes(32), context));
    assert.deepEqual(await readFile(file), beforeWrongKey);
    assert.throws(() => openDatabase(file, key, { ...context, identityBindingId: "synthetic-b" }));
    assert.deepEqual(await readFile(file), beforeWrongKey);
    const inventory = await inventoryFiles(dir, rawMarkers);
    assert.ok(inventory.length > 0);
    assert.ok(inventory.every((entry) => entry.markerCount === 0));
    assert.notEqual((await readFile(file)).subarray(0, 16).toString("utf8"), "SQLite format 3\0");
  } finally {
    key.fill(0);
    await rm(dir, { recursive: true, force: true });
  }
});
