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

test("Scenario 2: Failure Boundaries and All-or-Nothing Atomicity (A-04, A-21, FR-007, SC-004)", async (t) => {
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
    "Failpoint injection during audit entry creation rolls back domain effect and evidence",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");

      // Intercept saveAuditEntry to throw an error inside the transaction
      const originalSaveAuditEntry = emulator.saveAuditEntry.bind(emulator);
      emulator.saveAuditEntry = () => {
        throw new Error("Simulated audit store crash");
      };

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

      let caughtError = false;
      try {
        await executeAuthoritativeCommand(emulator, emulator, {
          rawRequest: envelope,
          trustedContext,
          registry,
        });
      } catch (err) {
        caughtError = true;
        assert.ok(err.message.includes("Simulated audit store crash"));
      }

      assert.equal(caughtError, true, "Transaction must fail and throw");

      // Invariant checks: All evidence and domain mutations must have been rolled back
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(
        target.revision,
        0n,
        "Target revision must remain 0 after rollback",
      );

      assert.equal(
        emulator.getProgress(FIXTURES.wsAlpha),
        0n,
        "Progress watermark must remain 0 after rollback",
      );

      const claim = emulator.getOperationClaim(
        FIXTURES.wsAlpha,
        FIXTURES.userAlice,
        "synthetic.mutate-target",
        opId.value,
      );
      assert.equal(
        claim,
        null,
        "Operation claim must not exist after rollback",
      );

      const auditCount = emulator.countAuditEntries(FIXTURES.wsAlpha);
      assert.equal(auditCount, 0, "No audit entries must exist after rollback");

      // Restore method
      emulator.saveAuditEntry = originalSaveAuditEntry;
    },
  );

  await t.test(
    "Failpoint injection during progress allocation rolls back transaction",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");

      // Intercept advanceProgress to throw
      const originalAdvanceProgress = emulator.advanceProgress.bind(emulator);
      emulator.advanceProgress = () => {
        throw new Error("Simulated progress counter crash");
      };

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

      let caught = false;
      try {
        await executeAuthoritativeCommand(emulator, emulator, {
          rawRequest: envelope,
          trustedContext,
          registry,
        });
      } catch (err) {
        caught = true;
      }

      assert.equal(caught, true);

      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 0n);
      assert.equal(emulator.getProgress(FIXTURES.wsAlpha), 0n);

      emulator.advanceProgress = originalAdvanceProgress;
    },
  );
});
