import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "../fixtures.mjs";

test("session closure checkpoints, closes and zeroes the owner key buffer", async () => {
  const f = fixture();
  try {
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    const heldKey = f.issued.at(-1);
    assert.notEqual(heldKey?.equals(Buffer.alloc(32)), true);
    await f.service.closeWorkspaceStore("ws-test-alpha");
    assert.equal(heldKey?.equals(Buffer.alloc(32)), true);
    assert.equal(f.service.getPersistenceState("ws-test-alpha").status, "closed");
    assert.throws(() => f.service.inspectForVerification("ws-test-alpha", "entities"), /vault_locked/);
  } finally { f.cleanup(); }
});

test("close waits for an in-flight atomic commit before checkpointing", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let started;
    const entered = new Promise((resolve) => { started = resolve; });
    const transaction = f.service.executeTransaction("ws-test-alpha", async (tx) => {
      await tx.persistEntity("_entity_example", { id: "pending", workspaceId: "ws-test-alpha", expectedRevision: 0, dataPayload: "pending data" });
      started();
      await gate;
      await tx.enqueueOutboxOperation({ operationId: "op-pending", workspaceId: "ws-test-alpha", aggregateType: "task", aggregateId: "pending", operationType: "create", payload: { text: "pending data" }, expectedRevision: 0 });
    });
    await entered;
    const closing = f.service.closeWorkspaceStore("ws-test-alpha");
    assert.equal(f.service.getPersistenceState("ws-test-alpha").status, "ready");
    release();
    await Promise.all([transaction, closing]);
    assert.equal(f.service.getPersistenceState("ws-test-alpha").status, "closed");
    assert.equal((await f.service.openWorkspaceStore("ws-test-alpha")).status, "ready");
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "entities").length, 1);
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "outbox").length, 1);
  } finally { f.cleanup(); }
});
