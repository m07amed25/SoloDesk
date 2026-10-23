// F013 Hosted Invitation Redemption Edge Handler
// Same-origin exchange, review, and accept endpoints with zero secret leakage.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  digestInvitationSecret,
  parseInvitationFragment,
} from "../_shared/invitation-delivery.ts";
import { isCanonicalUuid } from "../../../app/shared/invitation-contracts.ts";

const ALLOWED_ORIGINS = new Set([
  "https://auth.solodesk.test",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin =
    ALLOWED_ORIGINS.has(origin) || origin.endsWith(".solodesk.test")
      ? origin
      : "https://auth.solodesk.test";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v || null;
  }
  return null;
}

async function sha256Bytes(hexStr: string): Promise<Uint8Array> {
  const buffer = new Uint8Array(
    hexStr.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return new Uint8Array(hash);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function handleInvitationRedemption(
  req: Request,
  options?: {
    supabaseUrl?: string;
    anonKey?: string;
    supabaseClientFactory?: (authToken?: string) => SupabaseClient;
  },
): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  const supabaseUrl =
    options?.supabaseUrl ||
    process.env.VITE_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const anonKey =
    options?.anonKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "anon-key";

  const getClient = (authToken?: string) => {
    if (options?.supabaseClientFactory) {
      return options.supabaseClientFactory(authToken);
    }
    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers },
    });
  };

  try {
    // 1. Fragment Exchange: POST /exchange
    if (path.endsWith("/exchange")) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return new Response(
          JSON.stringify({
            state: "unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { selector, secret } = body;
      if (
        typeof selector !== "string" ||
        typeof secret !== "string" ||
        !/^sel_[0-9a-f]{32}$/i.test(selector) ||
        !/^[0-9a-f]{64}$/i.test(secret)
      ) {
        return new Response(
          JSON.stringify({
            state: "unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Mint 32-byte continuation token
      const continuationTokenBytes = new Uint8Array(32);
      crypto.getRandomValues(continuationTokenBytes);
      const continuationToken = bytesToHex(continuationTokenBytes);

      const secretDigestBytes = await digestInvitationSecret(secret);
      const continuationDigestBytes = await sha256Bytes(continuationToken);

      const client = getClient();
      const { data, error } = await client.rpc("solodesk_invitation_exchange", {
        p_selector: selector,
        p_secret_digest: "\\x" + bytesToHex(secretDigestBytes),
        p_continuation_digest: "\\x" + bytesToHex(continuationDigestBytes),
      });

      if (error || !data || data.state !== "continue") {
        return new Response(
          JSON.stringify({
            state: "unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Set HttpOnly, Secure continuation cookie
      const cookieHeader = `solodesk_inv_cont=${continuationToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;

      return new Response(
        JSON.stringify({ state: "continue", next: data.next || "sign_in" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Set-Cookie": cookieHeader,
          },
        },
      );
    }

    // 2. Verified Recipient Review: POST /review
    if (path.endsWith("/review")) {
      const continuationToken = parseCookie(
        req.headers.get("Cookie"),
        "solodesk_inv_cont",
      );
      if (!continuationToken || !/^[0-9a-f]{64}$/i.test(continuationToken)) {
        return new Response(
          JSON.stringify({
            state: "unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const authHeader = req.headers.get("Authorization") || "";
      const authToken = authHeader.replace(/^Bearer\s+/i, "");
      if (!authToken) {
        return new Response(
          JSON.stringify({ state: "unavailable", action: "try_again_later" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const continuationDigestBytes = await sha256Bytes(continuationToken);
      const client = getClient(authToken);

      const { data, error } = await client.rpc("solodesk_invitation_review", {
        p_continuation_digest: "\\x" + bytesToHex(continuationDigestBytes),
      });

      if (error || !data) {
        return new Response(
          JSON.stringify({
            state: "unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Acceptance Confirmation: POST /accept
    if (path.endsWith("/accept")) {
      const continuationToken = parseCookie(
        req.headers.get("Cookie"),
        "solodesk_inv_cont",
      );
      if (!continuationToken || !/^[0-9a-f]{64}$/i.test(continuationToken)) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "invitation_unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const authHeader = req.headers.get("Authorization") || "";
      const authToken = authHeader.replace(/^Bearer\s+/i, "");
      if (!authToken) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "online_required",
            action: "switch_account",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const body = await req.json().catch(() => null);
      if (
        !body ||
        typeof body !== "object" ||
        !isCanonicalUuid(body.operationId) ||
        typeof body.expectedRevision !== "number" ||
        body.confirmed !== true
      ) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "invitation_unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const continuationDigestBytes = await sha256Bytes(continuationToken);
      const requestDigest = bytesToHex(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              `${body.operationId}:${body.expectedRevision}:confirmed`,
            ),
          ),
        ),
      );

      const client = getClient(authToken);
      const { data, error } = await client.rpc("solodesk_invitation_accept", {
        p_continuation_digest: "\\x" + bytesToHex(continuationDigestBytes),
        p_operation_id: body.operationId,
        p_request_digest: requestDigest,
        p_expected_revision: body.expectedRevision,
      });

      if (error || !data) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: "invitation_unavailable",
            action: "request_new_invitation",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // If accepted, clear the continuation cookie
      const clearCookieHeader =
        "solodesk_inv_cont=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Set-Cookie": clearCookieHeader,
        },
      });
    }

    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    // Zero secret or DB logging
    return new Response(
      JSON.stringify({
        ok: false,
        code: "temporarily_unavailable",
        action: "try_again_later",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
