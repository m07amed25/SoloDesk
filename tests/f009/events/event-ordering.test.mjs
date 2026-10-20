import { test } from "node:test";
import assert from "node:assert/strict";
import {
  executeAuthoritativeCommand,
  verifyEventConsumerCompatibility,
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

test("Scenario 7: Accepted Event and Progress Contract (A-19–A-22, FR-015, FR-016)", async (t) => {
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
    "Events ordered strictly by service commit sequence independent of client clock (A-19, A-20, FR-015)",
    async () => {
      const emulator = seedF009Fixtures();

      // Submit 3 commands with out-of-order and skew client timestamps:
      // Event 1: occurred in future
      const env1 = createTestEnvelope({
        workspaceId: wsId,
        operationId: makeId("operation"),
        expectedRevision: "0",
        occurredAt: "2099-01-01T00:00:00.000Z",
      });

      // Event 2: occurred in past
      const env2 = createTestEnvelope({
        workspaceId: wsId,
        operationId: makeId("operation"),
        expectedRevision: "1",
        occurredAt: "2010-01-01T00:00:00.000Z",
      });

      // Event 3: occurred in present
      const env3 = createTestEnvelope({
        workspaceId: wsId,
        operationId: makeId("operation"),
        expectedRevision: "2",
        occurredAt: "2026-10-20T00:00:00.000Z",
      });

      const res1 = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env1,
        trustedContext,
        registry,
      });
      const res2 = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env2,
        trustedContext,
        registry,
      });
      const res3 = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env3,
        trustedContext,
        registry,
      });

      assert.equal(res1.ok, true);
      assert.equal(res2.ok, true);
      assert.equal(res3.ok, true);

      // Verify progress positions advance strictly: 1 -> 2 -> 3
      assert.equal(res1.event.progress_position, 1n);
      assert.equal(res2.event.progress_position, 2n);
      assert.equal(res3.event.progress_position, 3n);

      // Query accepted_events table from database
      const rows = emulator.db
        .prepare(
          "SELECT * FROM accepted_events WHERE workspace_id = ? ORDER BY progress_position ASC",
        )
        .all(FIXTURES.wsAlpha);

      assert.equal(rows.length, 3);
      assert.equal(rows[0].progress_position, 1);
      assert.equal(rows[1].progress_position, 2);
      assert.equal(rows[2].progress_position, 3);

      // Invariant: client occurred_at preserved exactly as sent
      assert.equal(rows[0].occurred_at, "2099-01-01T00:00:00.000Z");
      assert.equal(rows[1].occurred_at, "2010-01-01T00:00:00.000Z");
      assert.equal(rows[2].occurred_at, "2026-10-20T00:00:00.000Z");
    },
  );

  await t.test(
    "Correlation invariants: receipt and accepted event cross-reference each other (A-21)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");
      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
      });

      const res = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(res.ok, true);
      const receipt = res.receipt;
      const event = res.event;

      // Cross-referencing invariant
      assert.equal(receipt.event_id, event.event_id);
      assert.equal(event.receipt_id, receipt.receipt_id);
      assert.equal(receipt.progress_position, event.progress_position);
      assert.equal(receipt.operation_id, event.operation_id);
    },
  );

  await t.test(
    "Consumer compatibility checks guard against unsupported event versions or kinds (A-22, FR-016)",
    async () => {
      const emulator = seedF009Fixtures();
      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: makeId("operation"),
        expectedRevision: "0",
      });

      const res = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });
      assert.equal(res.ok, true);

      const validKinds = new Set(["synthetic.mutate-target.accepted"]);

      // Compatible consumer
      const compatCheck = verifyEventConsumerCompatibility(
        res.event,
        validKinds,
        1,
      );
      assert.equal(compatCheck.ok, true);

      // Unsupported version (e.g. consumer only supports version 0 or event is version 2)
      const futureEvent = { ...res.event, event_version: 2 };
      const versionCheck = verifyEventConsumerCompatibility(
        futureEvent,
        validKinds,
        1,
      );
      assert.equal(versionCheck.ok, false);
      assert.equal(versionCheck.error.code, "UPGRADE_REQUIRED");

      // Unsupported event kind
      const unknownKindEvent = {
        ...res.event,
        event_kind: "unexpected.unknown.event",
      };
      const kindCheck = verifyEventConsumerCompatibility(
        unknownKindEvent,
        validKinds,
        1,
      );
      assert.equal(kindCheck.ok, false);
      assert.equal(kindCheck.error.code, "SCHEMA_UNSUPPORTED");
    },
  );
});
