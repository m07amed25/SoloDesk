import { test } from "node:test";
import assert from "node:assert/strict";
import { intent } from "../../../packages/contracts/src/intent.ts";
import { computeIntentDigest } from "../../../supabase/functions/_shared/authoritative-command.ts";
import {
  createTestRegistry,
  createTestEnvelope,
  makeId,
} from "../../../tooling/f009/test-helpers.mjs";

test("Scenario 1: Canonical Intent and Changed-Intent Reuse (A-03, FR-003, SC-002)", async (t) => {
  const registry = createTestRegistry();
  const wsId = makeId("workspace");
  const actorId = makeId("actor");
  const opId = makeId("operation");

  const trustedContext = {
    actorId: actorId,
    workspaceId: wsId,
    sessionObservation: "obs_session_active",
    authorityObservation: "obs_role_admin",
  };

  await t.test(
    "Reordered object keys produce identical canonical bytes and digest",
    async () => {
      const fixedTime = "2026-10-20T00:00:00.000Z";
      const envelope1 = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        occurredAt: fixedTime,
        payload: { b: 2, a: 1, c: { y: 20, x: 10 } },
      });

      const envelope2 = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        occurredAt: fixedTime,
        payload: { c: { x: 10, y: 20 }, a: 1, b: 2 },
      });

      const res1 = intent(envelope1, trustedContext, registry);
      const res2 = intent(envelope2, trustedContext, registry);

      assert.equal(res1.ok, true, "res1 must be ok");
      assert.equal(res2.ok, true, "res2 must be ok");

      assert.equal(
        res1.value.canonical,
        res2.value.canonical,
        "Canonical bytes must match identically",
      );

      const digest1 = await computeIntentDigest(res1.value.canonical);
      const digest2 = await computeIntentDigest(res2.value.canonical);
      assert.equal(
        digest1,
        digest2,
        "Intent digests must be identical for reordered keys",
      );
    },
  );

  await t.test("Request identity changes do NOT alter intent", async () => {
    const fixedTime = "2026-10-20T00:00:00.000Z";
    const req1 = makeId("request");
    const req2 = makeId("request");

    const env1 = createTestEnvelope({
      requestId: req1,
      workspaceId: wsId,
      operationId: opId,
      occurredAt: fixedTime,
    });
    const env2 = createTestEnvelope({
      requestId: req2,
      workspaceId: wsId,
      operationId: opId,
      occurredAt: fixedTime,
    });

    const res1 = intent(env1, trustedContext, registry);
    const res2 = intent(env2, trustedContext, registry);

    assert.equal(res1.ok, true);
    assert.equal(res2.ok, true);
    assert.equal(res1.value.canonical, res2.value.canonical);
    const d1 = await computeIntentDigest(res1.value.canonical);
    const d2 = await computeIntentDigest(res2.value.canonical);
    assert.equal(d1, d2, "Changing requestId must not alter intent digest");
  });

  await t.test(
    "Changing target, expectedRevision, or payload alters intent digest",
    async () => {
      const baseEnv = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        payload: { targetKind: "doc", targetId: "doc_alpha_01", delta: 1 },
      });

      const diffRev = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "1",
        payload: { targetKind: "doc", targetId: "doc_alpha_01", delta: 1 },
      });

      const diffPayload = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        payload: { targetKind: "doc", targetId: "doc_alpha_01", delta: 2 },
      });

      const baseRes = intent(baseEnv, trustedContext, registry);
      const diffRevRes = intent(diffRev, trustedContext, registry);
      const diffPayloadRes = intent(diffPayload, trustedContext, registry);

      assert.equal(baseRes.ok, true);
      assert.equal(diffRevRes.ok, true);
      assert.equal(diffPayloadRes.ok, true);

      const baseDigest = await computeIntentDigest(baseRes.value.canonical);
      const diffRevDigest = await computeIntentDigest(
        diffRevRes.value.canonical,
      );
      const diffPayloadDigest = await computeIntentDigest(
        diffPayloadRes.value.canonical,
      );

      assert.notEqual(
        baseDigest,
        diffRevDigest,
        "Revision change must alter digest",
      );
      assert.notEqual(
        baseDigest,
        diffPayloadDigest,
        "Payload change must alter digest",
      );
    },
  );

  await t.test(
    "Arabic combining text and mixed-direction strings preserve exact semantic values",
    async () => {
      const arabicText = "فاتورة ضريبية معتمدة رقم ١٢٣٤٥";
      const bidiText = "Invoice #12345 (مسودة رسمية)";

      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        payload: { arabic: arabicText, bidi: bidiText },
      });

      const res = intent(env, trustedContext, registry);
      assert.equal(res.ok, true);

      const digest = await computeIntentDigest(res.value.canonical);
      assert.equal(typeof digest, "string");
      assert.equal(
        digest.length,
        64,
        "SHA-256 hex digest must be 64 characters",
      );
      assert.ok(
        res.value.canonical.includes(arabicText),
        "Canonical string must retain Arabic text exactly",
      );
    },
  );
});
