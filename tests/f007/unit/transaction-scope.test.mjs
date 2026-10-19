import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fixture, createRecord } from "../fixtures.mjs";

test("a domain write requires a matching outbox row with SHA-256 payload digest", async () => {
  const f = fixture();
  try {
    await f.service.openWorkspaceStore("ws-test-alpha");
    await assert.rejects(f.service.executeTransaction("ws-test-alpha", async (tx) => {
      await tx.persistEntity("_entity_example", { id: "orphan", workspaceId: "ws-test-alpha", expectedRevision: 0, dataPayload: "orphan" });
    }), /missing_outbox_operation/);
    assert.equal(f.service.inspectForVerification("ws-test-alpha", "entities").length, 0);
    await createRecord(f.service, "ws-test-alpha", "record-1", "offline");
    const [row] = f.service.inspectForVerification("ws-test-alpha", "outbox");
    assert.equal(row.payload_hash, createHash("sha256").update(row.payload_json).digest("hex"));
  } finally { f.cleanup(); }
});
