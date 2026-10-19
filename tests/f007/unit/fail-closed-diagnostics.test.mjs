import test from "node:test";
import assert from "node:assert/strict";
import { classifyStorageError, recoveryStatus } from "../../../app/main/persistence/recovery-state.ts";
import { fixture } from "../fixtures.mjs";

test("closed error codes produce localized, path-free recovery DTOs", () => {
  assert.equal(classifyStorageError(Object.assign(new Error("anything"), { code: "SQLITE_FULL" })), "disk_full");
  assert.equal(classifyStorageError(new Error("key_missing")), "key_missing");
  for (const reason of ["vault_locked", "key_missing", "integrity_failed", "disk_full", "interrupted_migration", "unsupported_future_version", "io_error"]) {
    const state = recoveryStatus("ws-test-alpha", reason);
    assert.equal(state.status, "recovery_required");
    assert.ok(state.recoveryDetails.localizedTitle.en);
    assert.ok(state.recoveryDetails.localizedTitle.ar);
    assert.ok(state.recoveryDetails.localizedGuidance.en);
    assert.ok(state.recoveryDetails.localizedGuidance.ar);
    assert.equal(JSON.stringify(state).includes("/home/"), false);
    assert.equal(state.recoveryDetails.unsyncedWorkRetained, false);
  }
});

test("native I/O failure during a transaction locks the store", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await assert.rejects(f.service.executeTransaction("ws-test-alpha", async () => {
      throw Object.assign(new Error("native failure"), { code: "SQLITE_IOERR" });
    }), /native failure/);
    assert.equal(f.service.getPersistenceState("ws-test-alpha").recoveryDetails.reasonCode, "io_error");
    assert.throws(() => f.service.inspectForVerification("ws-test-alpha", "entities"), /vault_locked/);
  } finally { f.cleanup(); }
});
