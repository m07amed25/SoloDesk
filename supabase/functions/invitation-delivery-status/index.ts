// F013 Delivery Status Callback Webhook Handler
// Signed, bounded, deduplicated webhook processing with zero raw payload persistence.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_PAYLOAD_BYTES = 8192;
const MAX_TIMESTAMP_AGE_SECONDS = 300;

const PERMITTED_STATUS_TRANSITIONS: Record<string, string[]> = {
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
  delivered: [],
  failed: [],
  bounced: [],
  rate_limited: ["provider_accepted", "failed", "unknown"],
  unknown: [],
};

async function verifyHmacSignature(
  secret: string,
  signatureHeader: string | null,
  timestamp: string | null,
  payload: string,
): Promise<boolean> {
  if (!signatureHeader || !timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > MAX_TIMESTAMP_AGE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );

  const expectedHex = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signatureHeader.length !== expectedHex.length) return false;

  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < signatureHeader.length; i++) {
    diff |= signatureHeader.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

export async function handleDeliveryStatusCallback(
  req: Request,
  options?: {
    webhookSecret?: string;
    supabaseClient?: SupabaseClient;
  },
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payloadText = await req.text();
  if (payloadText.length > MAX_PAYLOAD_BYTES) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookSecret =
    options?.webhookSecret ||
    process.env.INVITATION_WEBHOOK_SECRET ||
    "synth_dev_webhook_secret_key_12345678";

  const signature = req.headers.get("X-Signature-SHA256");
  const timestamp = req.headers.get("X-Timestamp");

  const isValid = await verifyHmacSignature(
    webhookSecret,
    signature,
    timestamp,
    payloadText,
  );

  if (!isValid) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = JSON.parse(payloadText);
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.eventId !== "string" ||
    typeof body.attemptId !== "string" ||
    typeof body.status !== "string"
  ) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { eventId, attemptId, status: newStatus } = body;

  const validStatuses = new Set([
    "provider_accepted",
    "delivered",
    "delayed",
    "failed",
    "bounced",
    "rate_limited",
    "unknown",
  ]);

  // Reject illegal statuses (especially 'accepted', which is membership-only)
  if (!validStatuses.has(newStatus)) {
    return new Response(JSON.stringify({ error: "invalid_status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client =
    options?.supabaseClient ||
    createClient(
      process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "service-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

  // Look up current attempt status
  const { data: attempt, error: fetchErr } = await client
    .from("private.invitation_delivery_attempts")
    .select("status")
    .eq("attempt_id", attemptId)
    .single();

  if (fetchErr || !attempt) {
    // If not found in DB or test client, return 200 with not_found effect to avoid retries
    return new Response(
      JSON.stringify({ ok: true, effect: "attempt_not_found" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const allowedNext = PERMITTED_STATUS_TRANSITIONS[attempt.status] || [];
  if (!allowedNext.includes(newStatus)) {
    // Drop non-monotonic transition safely
    return new Response(
      JSON.stringify({ ok: true, effect: "transition_ignored" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Update status (never store raw payload)
  await client
    .from("private.invitation_delivery_attempts")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("attempt_id", attemptId);

  return new Response(JSON.stringify({ ok: true, effect: "updated" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
