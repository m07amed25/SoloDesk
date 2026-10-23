import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  dispatchInvitationNotification,
} from "../../../supabase/functions/_shared/invitation-delivery.ts";
import { FIXTURE_CANARIES } from "../fixtures/invitation-fixtures.mjs";

test("F013 T043: Delivery adapter dispatches once to synthetic sink without external network egress", async () => {
  let callCount = 0;
  const mockTransport = async (_options) => {
    callCount++;
    return { ok: true, providerReference: "synth_ref_123" };
  };

  const result = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "sarah.invitee@test.local",
      workspaceLabel: "Acme Production",
      roleLabel: "Contributor",
      secretUrl: "https://auth.solodesk.test/invitation#sel_111.secret_222",
      expiryText: "7 days",
    },
    { transport: mockTransport, isSynthetic: true },
  );

  assert.equal(callCount, 1);
  assert.equal(result.status, "provider_accepted");
  assert.equal(result.sink, "synthetic_test_sink");
  assert.ok(result.providerDigest);
});

test("F013 T043: Correctly classifies provider outcomes: failed, rate-limited, timeout/unknown", async () => {
  // 1. Rate-limited provider
  const rateLimitedTransport = async () => ({
    ok: false,
    reason: "rate_limited",
    retryAfterSeconds: 60,
  });

  const resRateLimited = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "sarah.invitee@test.local",
      workspaceLabel: "Acme Production",
      roleLabel: "Contributor",
      secretUrl: "https://auth.solodesk.test/invitation#sel_111.secret_222",
      expiryText: "7 days",
    },
    { transport: rateLimitedTransport },
  );
  assert.equal(resRateLimited.status, "rate_limited");

  // 2. Permanent rejection / invalid address
  const failedTransport = async () => ({
    ok: false,
    reason: "bounced_or_rejected",
  });

  const resFailed = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "invalid@test.local",
      workspaceLabel: "Acme Production",
      roleLabel: "Contributor",
      secretUrl: "https://auth.solodesk.test/invitation#sel_111.secret_222",
      expiryText: "7 days",
    },
    { transport: failedTransport },
  );
  assert.equal(resFailed.status, "failed");

  // 3. Network throw / crash collapses to 'unknown'
  const crashingTransport = async () => {
    throw new Error("Connection reset by peer");
  };

  const resUnknown = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "sarah.invitee@test.local",
      workspaceLabel: "Acme Production",
      roleLabel: "Contributor",
      secretUrl: "https://auth.solodesk.test/invitation#sel_111.secret_222",
      expiryText: "7 days",
    },
    { transport: crashingTransport },
  );
  assert.equal(resUnknown.status, "unknown");
});

test("F013 T043: Guaranteed zero secret or recipient leakage in delivery results", async () => {
  const secretString = FIXTURE_CANARIES.rawSecret;
  const secretUrl = `https://auth.solodesk.test/invitation#sel_123.${secretString}`;

  const loggedMessages = [];
  const captureLogger = (msg) => loggedMessages.push(msg);

  const transport = async () => ({
    ok: true,
    providerReference: "provider_ref_sensitive_id",
  });

  const result = await dispatchInvitationNotification(
    {
      locale: "en",
      recipientEmail: "sarah.invitee@test.local",
      workspaceLabel: "Acme Production",
      roleLabel: "Contributor",
      secretUrl,
      expiryText: "7 days",
    },
    { transport, logger: captureLogger },
  );

  const resultJson = JSON.stringify(result);
  const logDump = loggedMessages.join(" ");

  // Prohibited secret fragments must not exist in results or logs
  assert.ok(!resultJson.includes(secretString));
  assert.ok(!resultJson.includes("sarah.invitee@test.local"));
  assert.ok(!resultJson.includes("sel_123"));

  assert.ok(!logDump.includes(secretString));
  assert.ok(!logDump.includes("sarah.invitee@test.local"));
  assert.ok(!logDump.includes(secretUrl));
});
