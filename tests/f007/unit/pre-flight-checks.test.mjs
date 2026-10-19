import test from "node:test";
import assert from "node:assert/strict";
import { requiredMigrationSpace, assertSupportedVersion, verifyMigrationSpace, MIGRATION_BUFFER_BYTES } from "../../../app/main/persistence/pre-flight-verifier.ts";
import { fixture } from "../fixtures.mjs";
import { steps } from "../migration-step.mjs";
import { readdirSync, readFileSync } from "node:fs";

test("pre-flight enforces two times DB and WAL size plus 50 MiB", async () => {
  assert.equal(requiredMigrationSpace(100, 20), 240 + MIGRATION_BUFFER_BYTES);
  assert.throws(() => requiredMigrationSpace(-1, 0), /integrity_failed/);
  assert.throws(() => assertSupportedVersion(3, 2), /unsupported_future_version/);
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    assert.throws(() => verifyMigrationSpace(f.paths(), 0), /disk_full/);
    assert.ok(verifyMigrationSpace(f.paths(), 1024 * 1024 * 1024).required >= MIGRATION_BUFFER_BYTES);
  } finally { f.cleanup(); }
});

test("an underfunded migration changes no schema and creates no snapshot", async () => {
  const f = fixture({ steps, availableSpaceOverride: 0 });
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await f.service.closeWorkspaceStore("ws-test-alpha");
    const before = readFileSync(f.paths().database);
    const state = await f.service.openWorkspaceStore("ws-test-alpha");
    assert.equal(state.recoveryDetails.reasonCode, "disk_full");
    assert.deepEqual(readFileSync(f.paths().database), before);
    assert.equal(readdirSync(f.paths().migration).length, 0);
  } finally { f.cleanup(); }
});
