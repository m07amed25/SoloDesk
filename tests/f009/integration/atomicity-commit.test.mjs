import { test } from "node:test";
import assert from "node:assert/strict";
import { executeAuthoritativeCommand } from "../../../supabase/functions/_shared/authoritative-command.ts";
import {
  seedF009Fixtures,
  FIXTURES,
} from "../../../tooling/f009/seed-fixtures.mjs";
import {
  createTestRegistry,
  createTestEnvelope,
  makeId,
} from "../../../tooling/f009/test-helpers.mjs";

test("Scenario 2: Atomic First Commit and Replay Immutability (A-01, A-02, A-03, A-04, A-21)", async (t) => {
  const emulator = seedF009Fixtures();
  const registry = createTestRegistry();
  const wsId = makeId("workspace", FIXTURES.wsAlpha);
  const actorId = makeId("actor", FIXTURES.userAlice);
  const opId = makeId("operation");

  const trustedContext = {
    actorId: actorId.value,
    workspaceId: wsId.value,
    sessionObservation: "obs_session_active",
    authorityObservation: "obs_role_owner",
  };

  let firstReceiptId;
  let firstEventId;
  let firstAuditId;

  const fixedOccurredAt = "2026-10-20T00:00:00.000Z";

  await t.test(
    "First valid command commits atomically (A-01, A-04, A-21)",
    async () => {
      const envelope = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        occurredAt: fixedOccurredAt,
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          action: "update",
          delta: 1,
          safeNote: "Initial commit",
        },
      });

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: envelope,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, true, "First command execution must succeed");
      assert.equal(output.status, "authoritative_committed");
      assert.ok(output.receipt, "Receipt must be returned");
      assert.ok(output.event, "Event must be returned");
      assert.ok(output.auditEntry, "Audit entry must be returned");
      assert.equal(
        output.progressToken,
        "1",
        "Workspace progress must advance to 1",
      );

      firstReceiptId = output.receipt.receipt_id;
      firstEventId = output.event.event_id;
      firstAuditId = output.auditEntry.audit_entry_id;

      // Verify database state
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(
        target.revision,
        1n,
        "Target revision must advance from 0 to 1",
      );

      const claim = emulator.getOperationClaim(
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        opId.value,
      );
      assert.ok(claim, "Operation claim must exist");
      assert.equal(claim.disposition, "committed");
      assert.equal(claim.result_locator, firstReceiptId);

      const receipt = emulator.getReceiptById(FIXTURES.wsAlpha, firstReceiptId);
      assert.ok(receipt, "Receipt must exist in database");
      assert.equal(receipt.committed_revision, 1n);
      assert.equal(receipt.progress_position, 1n);

      const auditEntry = emulator.getAuditEntry(FIXTURES.wsAlpha, firstAuditId);
      assert.ok(auditEntry, "Audit entry must exist in database");
      assert.equal(auditEntry.receipt_id, firstReceiptId);
      assert.equal(auditEntry.event_id, firstEventId);
      assert.equal(auditEntry.progress_position, 1n);

      // Correlations must agree
      assert.equal(output.receipt.event_id, firstEventId);
      assert.equal(output.event.receipt_id, firstReceiptId);
      assert.equal(output.auditEntry.receipt_id, firstReceiptId);
      assert.equal(output.auditEntry.event_id, firstEventId);
    },
  );

  await t.test(
    "Identical replay with fresh requestId returns semantic original receipt unchanged (A-02)",
    async () => {
      const replayEnvelope = createTestEnvelope({
        requestId: makeId("request"), // fresh request ID
        workspaceId: wsId,
        operationId: opId, // same operation ID
        expectedRevision: "0",
        occurredAt: fixedOccurredAt,
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          action: "update",
          delta: 1,
          safeNote: "Initial commit",
        },
      });

      const replayOutput = await executeAuthoritativeCommand(
        emulator,
        emulator,
        {
          rawRequest: replayEnvelope,
          trustedContext,
          registry,
        },
      );

      assert.equal(replayOutput.ok, true, "Replay must succeed");
      assert.equal(replayOutput.status, "authoritative_committed");
      assert.equal(
        replayOutput.receipt.receipt_id,
        firstReceiptId,
        "Original receipt ID must be preserved",
      );
      assert.equal(
        replayOutput.receipt.committed_revision,
        1n,
        "Committed revision must remain 1",
      );
      assert.equal(
        replayOutput.progressToken,
        "1",
        "Progress token must remain 1",
      );

      // Target revision must NOT advance a second time
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(
        target.revision,
        1n,
        "Target revision must remain 1 under identical retry",
      );

      // Total receipts in workspace must remain 1
      assert.equal(
        emulator.getProgress(FIXTURES.wsAlpha),
        1n,
        "Progress watermark must remain 1",
      );
    },
  );

  await t.test(
    "Changed intent with same operation ID rejects with collision error (A-03)",
    async () => {
      const changedEnvelope = createTestEnvelope({
        requestId: makeId("request"),
        workspaceId: wsId,
        operationId: opId, // same operation ID
        expectedRevision: "0",
        occurredAt: fixedOccurredAt,
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          action: "update",
          delta: 999, // changed delta!
          safeNote: "Changed payload intent",
        },
      });

      const collisionOutput = await executeAuthoritativeCommand(
        emulator,
        emulator,
        {
          rawRequest: changedEnvelope,
          trustedContext,
          registry,
        },
      );

      assert.equal(collisionOutput.ok, false, "Collision must be rejected");
      assert.equal(collisionOutput.status, "rejected");
      assert.equal(collisionOutput.error.code, "VALIDATION");
      assert.equal(collisionOutput.error.outcomeCertainty, "not_applied");
    },
  );
});
