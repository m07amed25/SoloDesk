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

test("Scenario 4: High Concurrency Races and Competing Revisions (A-09, SC-005)", async (t) => {
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
    "32 concurrent identical callers: exactly 1 commits, 31 receive identical receipt (A-09)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");
      const fixedOccurredAt = "2026-10-20T00:00:00.000Z";

      const promises = Array.from({ length: 32 }, () => {
        const env = createTestEnvelope({
          requestId: makeId("request"),
          workspaceId: wsId,
          operationId: opId, // all share the exact same operation ID
          expectedRevision: "0",
          occurredAt: fixedOccurredAt,
          payload: {
            targetKind: "doc",
            targetId: "doc_alpha_01",
            action: "update",
            delta: 1,
          },
        });

        return executeAuthoritativeCommand(emulator, emulator, {
          rawRequest: env,
          trustedContext,
          registry,
        });
      });

      const results = await Promise.all(promises);

      // Every result must succeed with authoritative_committed
      for (const res of results) {
        assert.equal(res.ok, true);
        assert.equal(res.status, "authoritative_committed");
      }

      // All must reference the exact same receipt ID and progress token
      const firstReceiptId = results[0].receipt.receipt_id;
      for (const res of results) {
        assert.equal(res.receipt.receipt_id, firstReceiptId);
        assert.equal(res.progressToken, "1");
      }

      // Target must advance exactly once (from 0 to 1)
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 1n);

      // Progress watermark must be exactly 1
      assert.equal(emulator.getProgress(FIXTURES.wsAlpha), 1n);
    },
  );

  await t.test(
    "32 concurrent competing revisions: exactly 1 commits, 31 conflict (A-09)",
    async () => {
      const emulator = seedF009Fixtures();
      const fixedOccurredAt = "2026-10-20T00:00:00.000Z";

      // 32 distinct operations competing to advance revision from 0 to 1
      const promises = Array.from({ length: 32 }, () => {
        const distinctOpId = makeId("operation");
        const env = createTestEnvelope({
          requestId: makeId("request"),
          workspaceId: wsId,
          operationId: distinctOpId,
          expectedRevision: "0",
          occurredAt: fixedOccurredAt,
          payload: {
            targetKind: "doc",
            targetId: "doc_alpha_01",
            action: "update",
            delta: 1,
          },
        });

        return executeAuthoritativeCommand(emulator, emulator, {
          rawRequest: env,
          trustedContext,
          registry,
        });
      });

      const results = await Promise.all(promises);

      const committed = results.filter(
        (r) => r.ok && r.status === "authoritative_committed",
      );
      const conflicts = results.filter((r) => !r.ok && r.status === "conflict");

      assert.equal(
        committed.length,
        1,
        "Exactly 1 competing operation must commit",
      );
      assert.equal(
        conflicts.length,
        31,
        "Remaining 31 operations must receive revision conflict",
      );

      for (const conflict of conflicts) {
        assert.equal(conflict.error.code, "REVISION_CONFLICT");
        assert.equal(conflict.error.outcomeCertainty, "not_applied");
      }

      // Target revision must advance to 1, not 32
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 1n);

      // Progress advances by 1
      assert.equal(emulator.getProgress(FIXTURES.wsAlpha), 1n);
    },
  );
});
