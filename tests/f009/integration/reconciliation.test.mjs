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

test("Scenario 3: Lost Response and Reconciliation with Atomic Fence (A-02, A-10–A-13, FR-004, FR-009, SC-001)", async (t) => {
  const emulator = seedF009Fixtures();
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
    "Simulated lost response reconciles to original authoritative receipt (A-02, A-10, A-11)",
    async () => {
      const opId = makeId("operation");
      const envelope = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          action: "update",
          delta: 1,
        },
      });

      // 1. Command commits on server
      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: envelope,
        trustedContext,
        registry,
      });
      assert.equal(output.ok, true);
      const originalReceiptId = output.receipt.receipt_id;

      // 2. Client encounters transport timeout/drop -> outcome_unknown
      // Client invokes command.reconcile with originalOperation and originalOperationId
      const reconResult = await reconcileOperation(
        emulator,
        emulator,
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        opId.value,
      );

      assert.equal(
        reconResult.outcome,
        "committed",
        "Reconciliation must prove committed outcome",
      );
      assert.ok(reconResult.receipt, "Original receipt must be returned");
      assert.equal(reconResult.receipt.receipt_id, originalReceiptId);
      assert.equal(reconResult.receipt.committed_revision, 1n);

      // Target remains at revision 1; no duplicate effect
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 1n);
    },
  );

  await t.test(
    "Pre-dispatch absence becomes proven_not_applied only via atomic fence (A-12, FR-010)",
    async () => {
      const unseenOpId = makeId("operation");

      // Operation was never dispatched to server. Reconcile unseen operation:
      const reconResult = await reconcileOperation(
        emulator,
        emulator,
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        unseenOpId.value,
      );

      assert.equal(
        reconResult.outcome,
        "proven_not_applied",
        "Unseen operation must be atomically fenced",
      );

      // The claim is now durably stored as proven_not_applied
      const claim = emulator.getOperationClaim(
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        unseenOpId.value,
      );
      assert.ok(claim, "Fence must establish durable claim");
      assert.equal(claim.disposition, "proven_not_applied");

      // Attempting to submit a delayed command with the fenced operation ID fails safely
      const delayedEnv = createTestEnvelope({
        workspaceId: wsId,
        operationId: unseenOpId,
        expectedRevision: "1",
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          delta: 1,
        },
      });

      const delayedOutput = await executeAuthoritativeCommand(
        emulator,
        emulator,
        {
          rawRequest: delayedEnv,
          trustedContext,
          registry,
        },
      );

      assert.equal(
        delayedOutput.ok,
        false,
        "Fenced operation ID cannot execute later",
      );
      assert.equal(delayedOutput.status, "rejected");
    },
  );

  await t.test(
    "Unauthorized reconciliation lookup discloses no operation details (A-13)",
    async () => {
      const opId = makeId("operation");

      // Revoked user attempts reconciliation
      const revokedRecon = await reconcileOperation(
        emulator,
        emulator,
        FIXTURES.wsAlpha,
        FIXTURES.userRevoked,
        "synthetic.mutate-target",
        opId.value,
      );

      assert.equal(revokedRecon.outcome, "still_unknown");
      assert.ok(revokedRecon.safeError);
      assert.equal(revokedRecon.safeError.code, "FORBIDDEN");
    },
  );
});
