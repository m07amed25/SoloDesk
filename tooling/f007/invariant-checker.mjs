import assert from "node:assert/strict";

export function assertReconciled(result) {
  assert.equal(result.totalEntitiesBefore, result.totalEntitiesAfter);
  assert.equal(result.mismatchedCounts.length, 0);
  assert.equal(result.brokenForeignKeys.length, 0);
  assert.equal(result.corruptedUnicodeFields.length, 0);
  assert.equal(result.arithmeticMismatches.length, 0);
}

export function captureInvariants(db) {
  const entities = db.prepare("SELECT id, data_payload FROM _entity_example ORDER BY id").all();
  const outbox = db.prepare("SELECT operation_id, payload_json, payload_hash FROM outbox_operations ORDER BY operation_id").all();
  return { entities, outbox };
}

export function reconcileInvariants(db, before) {
  const after = captureInvariants(db);
  const mismatchedCounts = [];
  for (const table of ["entities", "outbox"]) {
    if (before[table].length !== after[table].length)
      mismatchedCounts.push({ table, expected: before[table].length, actual: after[table].length });
  }
  const brokenForeignKeys = db.pragma("foreign_key_check").map((row) => ({
    table: row.table, column: String(row.fkid), missingParentId: String(row.rowid),
  }));
  const corruptedUnicodeFields = [];
  const arithmeticMismatches = [];
  const original = new Map(before.entities.map((row) => [row.id, row.data_payload]));
  for (const row of after.entities) {
    const prior = original.get(row.id);
    if (typeof prior !== "string") continue;
    if (prior !== row.data_payload) {
      const expected = JSON.parse(prior);
      const actual = JSON.parse(row.data_payload);
      for (const key of ["name", "title", "note", "emoji"]) {
        if (expected[key] !== actual[key])
          corruptedUnicodeFields.push({ table: "_entity_example", column: key, recordId: row.id, error: "value_changed" });
      }
      for (const key of ["seconds", "minorUnits"]) {
        if (expected[key] !== actual[key])
          arithmeticMismatches.push({ table: "_entity_example", column: key, recordId: row.id, expectedValue: expected[key], actualValue: actual[key] });
      }
    }
  }
  return {
    totalEntitiesBefore: before.entities.length + before.outbox.length,
    totalEntitiesAfter: after.entities.length + after.outbox.length,
    mismatchedCounts, brokenForeignKeys, corruptedUnicodeFields, arithmeticMismatches,
  };
}
