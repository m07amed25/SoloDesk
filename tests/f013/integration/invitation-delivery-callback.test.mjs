import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Synthetic provider webhook evaluator modeling invitation-delivery-status handler
class DeliveryCallbackEvaluator {
  constructor(webhookSecret) {
    this.webhookSecret = webhookSecret;
    this.processedEvents = new Set();
    this.attempts = new Map([
      [
        "att_001",
        {
          attemptId: "att_001",
          status: "queued",
          generationId: "gen_001",
          invitationId: "inv_001",
        },
      ],
    ]);
  }

  verifySignature(payloadString, signatureHeader, timestamp) {
    if (!signatureHeader || !timestamp) return false;
    // Check freshness: within 300 seconds
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 300) {
      return false;
    }

    const expectedSig = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${timestamp}.${payloadString}`)
      .digest("hex");

    const sigBuf = Buffer.from(signatureHeader);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  handleWebhook({ payloadString, signatureHeader, timestamp, contentLength }) {
    // 1. Oversized rejection (max 8KB)
    if (
      contentLength > 8192 ||
      (payloadString && payloadString.length > 8192)
    ) {
      return { ok: false, code: "payload_too_large" };
    }

    // 2. Signature verification
    if (!this.verifySignature(payloadString, signatureHeader, timestamp)) {
      return { ok: false, code: "unauthorized" };
    }

    // 3. JSON parse
    let body;
    try {
      body = JSON.parse(payloadString);
    } catch {
      return { ok: false, code: "bad_request" };
    }

    const { eventId, attemptId, status: newStatus } = body;
    if (!eventId || !attemptId || !newStatus) {
      return { ok: false, code: "bad_request" };
    }

    // 4. Deduplication
    if (this.processedEvents.has(eventId)) {
      return { ok: true, effect: "deduplicated" };
    }

    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      return { ok: false, code: "attempt_not_found" };
    }

    // 5. Monotonic status transitions:
    // queued -> provider_accepted -> delivered | delayed | failed | bounced | rate_limited | unknown
    const permittedTransitions = {
      queued: [
        "provider_accepted",
        "delivered",
        "delayed",
        "failed",
        "bounced",
        "rate_limited",
        "unknown",
      ],
      provider_accepted: [
        "delivered",
        "delayed",
        "failed",
        "bounced",
        "rate_limited",
        "unknown",
      ],
      delayed: ["delivered", "failed", "bounced", "unknown"],
      delivered: [], // Terminal delivery state
      failed: [], // Terminal delivery state
      bounced: [], // Terminal delivery state
      rate_limited: ["provider_accepted", "failed", "unknown"],
      unknown: [],
    };

    const allowedNext = permittedTransitions[attempt.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return { ok: false, code: "invalid_transition" };
    }

    attempt.status = newStatus;
    this.processedEvents.add(eventId);

    return { ok: true, effect: "updated", newStatus };
  }
}

test("F013 T044: Valid webhook signature and freshness updates attempt status", () => {
  const secret = "synth_webhook_secret_key_12345678";
  const evaluator = new DeliveryCallbackEvaluator(secret);

  const payload = JSON.stringify({
    eventId: "evt_001",
    attemptId: "att_001",
    status: "provider_accepted",
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const res = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader: signature,
    timestamp,
    contentLength: payload.length,
  });

  assert.equal(res.ok, true);
  assert.equal(res.effect, "updated");
  assert.equal(evaluator.attempts.get("att_001").status, "provider_accepted");
});

test("F013 T044: Rejects stale timestamps (>300s) and bad signatures", () => {
  const secret = "synth_webhook_secret_key_12345678";
  const evaluator = new DeliveryCallbackEvaluator(secret);

  const payload = JSON.stringify({
    eventId: "evt_002",
    attemptId: "att_001",
    status: "delivered",
  });

  // Stale timestamp (10 minutes ago)
  const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
  const staleSig = crypto
    .createHmac("sha256", secret)
    .update(`${staleTimestamp}.${payload}`)
    .digest("hex");

  const resStale = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader: staleSig,
    timestamp: staleTimestamp,
    contentLength: payload.length,
  });
  assert.equal(resStale.ok, false);
  assert.equal(resStale.code, "unauthorized");

  // Invalid signature
  const freshTimestamp = Math.floor(Date.now() / 1000).toString();
  const resBadSig = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader:
      "bad_signature_0000000000000000000000000000000000000000000000000000000000000000",
    timestamp: freshTimestamp,
    contentLength: payload.length,
  });
  assert.equal(resBadSig.ok, false);
  assert.equal(resBadSig.code, "unauthorized");
});

test("F013 T044: Deduplicates replayed webhook events without re-applying", () => {
  const secret = "synth_webhook_secret_key_12345678";
  const evaluator = new DeliveryCallbackEvaluator(secret);

  const payload = JSON.stringify({
    eventId: "evt_replay_001",
    attemptId: "att_001",
    status: "delivered",
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const first = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader: signature,
    timestamp,
    contentLength: payload.length,
  });
  assert.equal(first.ok, true);
  assert.equal(first.effect, "updated");

  // Replay identical event
  const replay = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader: signature,
    timestamp,
    contentLength: payload.length,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.effect, "deduplicated");
});

test("F013 T044: Enforces monotonic delivery transitions and cannot transition to accepted or membership", () => {
  const secret = "synth_webhook_secret_key_12345678";
  const evaluator = new DeliveryCallbackEvaluator(secret);

  evaluator.attempts.get("att_001").status = "delivered";

  // Attempting to set delivered -> queued (illegal reverse transition)
  const payload = JSON.stringify({
    eventId: "evt_reverse_001",
    attemptId: "att_001",
    status: "queued",
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const res = evaluator.handleWebhook({
    payloadString: payload,
    signatureHeader: signature,
    timestamp,
    contentLength: payload.length,
  });

  assert.equal(res.ok, false);
  assert.equal(res.code, "invalid_transition");

  // Webhook cannot deliver "accepted" status (membership authority violation)
  const acceptPayload = JSON.stringify({
    eventId: "evt_illegal_accept",
    attemptId: "att_001",
    status: "accepted", // Webhook cannot claim acceptance!
  });
  const acceptSig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${acceptPayload}`)
    .digest("hex");

  const resAccept = evaluator.handleWebhook({
    payloadString: acceptPayload,
    signatureHeader: acceptSig,
    timestamp,
    contentLength: acceptPayload.length,
  });

  assert.equal(resAccept.ok, false);
  assert.equal(resAccept.code, "invalid_transition");
});
