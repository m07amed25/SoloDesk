import { test } from "node:test";
import assert from "node:assert/strict";
import {
  executeAuthoritativeCommand,
  reconcileOperation,
} from "../../../supabase/functions/_shared/authoritative-command.ts";
import {
  seedF009Fixtures,
  FIXTURES,
} from "../../../tooling/f009/seed-fixtures.mjs";
import {
  createTestRegistry,
  createTestEnvelope,
  makeId,
} from "../../../tooling/f009/test-helpers.mjs";

test("Scenarios 8 & 9: Receipt Archival, Migration, and Recovery Integrity (A-23, A-25, FR-017, FR-019)", async (t) => {
  const registry = createTestRegistry();
  const wsId = makeId("workspace", FIXTURES.wsAlpha);
  const actorId = makeId("actor", FIXTURES.userAlice);

  const trustedContext = {
    actorId: actorId.value,
    workspaceId: wsId.value,
    sessionObservation: "obs_session_active",
    authorityObservation: "obs_role_owner",
  };

  await t.test(
    "Archiving receipt preserves claim for ongoing deduplication and safe reconciliation (A-23, FR-017)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");
      const fixedOccurredAt = "2026-10-20T00:00:00.000Z";

      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        occurredAt: fixedOccurredAt,
      });

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, true);
      const receiptId = output.receipt.receipt_id;

      // Simulate cold storage archival: mark receipt as archived
      const nowIso = new Date().toISOString();
      emulator.db
        .prepare(
          "UPDATE command_receipts SET archived_at = ? WHERE receipt_id = ?",
        )
        .run(nowIso, receiptId);

      // Verify claim remains active in command_operations
      const claim = emulator.getOperationClaim(
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        opId.value,
      );
      assert.ok(claim);
      assert.equal(claim.disposition, "committed");

      // Identical replay after receipt archival still deduplicates cleanly
      const replayEnv = createTestEnvelope({
        requestId: makeId("request"),
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        occurredAt: fixedOccurredAt,
      });

      const replayOutput = await executeAuthoritativeCommand(
        emulator,
        emulator,
        {
          rawRequest: replayEnv,
          trustedContext,
          registry,
        },
      );

      assert.equal(replayOutput.ok, true);
      assert.equal(replayOutput.receipt.receipt_id, receiptId);

      // Reconciliation after archival still proves committed outcome
      const recon = await reconcileOperation(
        emulator,
        emulator,
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        opId.value,
      );

      assert.equal(recon.outcome, "committed");
      assert.equal(recon.receipt.receipt_id, receiptId);
    },
  );

  await t.test(
    "Authoritative write state blocks writes when verification is required or corrupted (A-25, FR-019)",
    async () => {
      const emulator = seedF009Fixtures();

      // Set write state to blocked
      emulator.setWriteState(FIXTURES.wsAlpha, "verification_required", {
        safe_block_reason: "Integrity verification pending",
      });

      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: makeId("operation"),
        expectedRevision: "0",
      });

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, false);
      assert.equal(output.status, "rejected");
      assert.equal(output.error.code, "SERVICE_UNAVAILABLE");
      assert.equal(output.error.outcomeCertainty, "unknown");

      // Domain target was not modified
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 0n);

      // Once restored to 'ready', writes succeed normally
      emulator.setWriteState(FIXTURES.wsAlpha, "ready");
      const restoredOutput = await executeAuthoritativeCommand(
        emulator,
        emulator,
        {
          rawRequest: env,
          trustedContext,
          registry,
        },
      );

      assert.equal(restoredOutput.ok, true);
      assert.equal(restoredOutput.status, "authoritative_committed");
    },
  );
});
