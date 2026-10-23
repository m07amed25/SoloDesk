// F013 Platform Cryptography and Delivery Helpers
// Uses Web Crypto API (crypto.subtle / crypto.getRandomValues) for compatibility across Node and Deno

export type DeliveryLocale = "en" | "ar";

export interface InvitationDispatchOptions {
  deliveryAttemptId: string;
  recipientDeliveryValue: string;
  locale: DeliveryLocale;
  secretUrl: string;
  templateData: {
    workspaceLabel: string;
    inviterLabel?: string;
    roleLabelKey: string;
    scopeLabelKey: string;
    expiryText: string;
  };
}

export type InvitationDispatchResult =
  | { outcome: "provider_accepted"; providerRef: string }
  | { outcome: "failed" | "rate_limited" | "unknown"; safeReasonCode: string };

// 1. Secret generation: 16-byte selector, 32-byte (256-bit) bearer secret
export function generateInvitationSecret(): {
  selector: string;
  secret: string;
} {
  const selectorBytes = new Uint8Array(16);
  crypto.getRandomValues(selectorBytes);
  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);

  const selector =
    "sel_" +
    Array.from(selectorBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const secret = Array.from(secretBytes, (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return { selector, secret };
}

// 2. Domain-separated secret digesting
export async function digestInvitationSecret(
  secret: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const data = enc.encode(`solodesk:f013:secret:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

// 3. Domain-separated continuation token digesting
export async function digestContinuation(
  continuation: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const data = enc.encode(`solodesk:f013:continuation:${continuation}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

// 4. Constant-time comparison
export function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// 5. Fragment URL assembly (assembled only in trusted server memory)
export function assembleInvitationFragmentUrl(
  baseUrl: string,
  selector: string,
  secret: string,
): string {
  const clean = baseUrl.replace(/\/+$/, "");
  const path = clean.endsWith("/invitation") ? clean : `${clean}/invitation`;
  return `${path}#selector=${selector}&secret=${secret}`;
}

// 5.1 Fragment parsing and validation
export function parseInvitationFragment(
  fragment: string,
):
  | { ok: true; selector: string; secret: string }
  | { ok: false; reason: string } {
  if (!fragment || typeof fragment !== "string") {
    return { ok: false, reason: "empty_fragment" };
  }
  const clean = fragment.replace(/^#/, "").trim();
  let selector = "";
  let secret = "";

  if (clean.includes("=")) {
    // query-param style inside fragment: selector=...&secret=...
    const params = new URLSearchParams(clean);
    selector = params.get("selector") || "";
    secret = params.get("secret") || "";
    const allowed = new Set(["selector", "secret"]);
    for (const key of params.keys()) {
      if (!allowed.has(key))
        return { ok: false, reason: "unexpected_fragment_param" };
    }
  } else if (clean.includes(".")) {
    // dot-separated style: selector.secret
    const parts = clean.split(".");
    if (parts.length !== 2)
      return { ok: false, reason: "invalid_fragment_format" };
    [selector, secret] = parts;
  } else {
    return { ok: false, reason: "invalid_fragment_format" };
  }

  // Validate selector format: starts with sel_ followed by 32 hex chars (16 bytes)
  if (!/^sel_[0-9a-f]{32}$/i.test(selector)) {
    return { ok: false, reason: "invalid_selector_format" };
  }

  // Validate secret format: exactly 64 hex chars (32 bytes / 256 bits)
  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    return { ok: false, reason: "invalid_secret_format" };
  }

  return { ok: true, selector, secret };
}

// 6. Bilingual Email Templates (T070)
export function renderInvitationEmail(options: {
  locale: DeliveryLocale;
  workspaceLabel: string;
  inviterLabel?: string;
  roleLabel: string;
  expiryText: string;
  secretUrl: string;
}): { subject: string; text: string; html: string } {
  if (options.locale === "ar") {
    const inviterText = options.inviterLabel
      ? `بواسطة ${options.inviterLabel}`
      : "";
    const subject = `دعوة للانضمام إلى مساحة العمل ${options.workspaceLabel}`;
    const text = `تمت دعوتك ${inviterText} للانضمام إلى مساحة العمل "${options.workspaceLabel}" بصلاحية "${options.roleLabel}".\n\nتنتهي صلاحية هذه الدعوة في: ${options.expiryText}.\n\nلقبول الدعوة، افتح الرابط التالي:\n${options.secretUrl}\n\nهذه الدعوة صالحة للاستخدام مرة واحدة فقط ومخصصة لهويتك المسجلة.`;
    const html = `<div dir="rtl" style="font-family: sans-serif; line-height: 1.6;">
<h2>دعوة مساحة العمل</h2>
<p>تمت دعوتك ${inviterText} للانضمام إلى <strong>${options.workspaceLabel}</strong> بصلاحية <em>${options.roleLabel}</em>.</p>
<p>تنتهي صلاحية الدعوة في: ${options.expiryText}.</p>
<p><a href="${options.secretUrl}" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: #fff; text-decoration: none; border-radius: 5px;">مراجعة وقبول الدعوة</a></p>
<p style="color: #666; font-size: 0.9em;">هذه الدعوة صالحة للاستخدام مرة واحدة فقط.</p>
</div>`;
    return { subject, text, html };
  }

  const inviterText = options.inviterLabel ? `by ${options.inviterLabel}` : "";
  const subject = `Invitation to join ${options.workspaceLabel}`;
  const text = `You have been invited ${inviterText} to join the workspace "${options.workspaceLabel}" with role "${options.roleLabel}".\n\nThis invitation expires at: ${options.expiryText}.\n\nTo accept this invitation, open the link below:\n${options.secretUrl}\n\nThis invitation can only be accepted once by the intended verified account.`;
  const html = `<div dir="ltr" style="font-family: sans-serif; line-height: 1.6;">
<h2>Workspace Invitation</h2>
<p>You have been invited ${inviterText} to join <strong>${options.workspaceLabel}</strong> with role <em>${options.roleLabel}</em>.</p>
<p>Expires: ${options.expiryText}.</p>
<p><a href="${options.secretUrl}" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: #fff; text-decoration: none; border-radius: 5px;">Review &amp; Accept Invitation</a></p>
<p style="color: #666; font-size: 0.9em;">This invitation is single-use and intended exclusively for your verified identity.</p>
</div>`;
  return { subject, text, html };
}

// 7. Synthetic Delivery Sink for Tests / Sandbox
export class SyntheticDeliverySink {
  private dispatches: InvitationDispatchOptions[] = [];

  async dispatch(
    options: InvitationDispatchOptions,
  ): Promise<InvitationDispatchResult> {
    this.dispatches.push(options);
    return {
      outcome: "provider_accepted",
      providerRef: `mock_ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  getDispatches(): readonly InvitationDispatchOptions[] {
    return Object.freeze([...this.dispatches]);
  }

  clear(): void {
    this.dispatches = [];
  }
}

// 8. Bounded Delivery Dispatch Adapter (T043 / T048)
export type DeliveryStatus =
  | "provider_accepted"
  | "rate_limited"
  | "failed"
  | "unknown";

export interface DeliveryResult {
  status: DeliveryStatus;
  sink: string;
  providerDigest?: string;
}

export async function dispatchInvitationNotification(
  options: {
    locale: DeliveryLocale;
    recipientEmail: string;
    workspaceLabel: string;
    roleLabel: string;
    secretUrl: string;
    expiryText: string;
    inviterLabel?: string;
  },
  config?: {
    transport?: (opts: unknown) => Promise<{
      ok: boolean;
      reason?: string;
      providerReference?: string;
      retryAfterSeconds?: number;
    }>;
    isSynthetic?: boolean;
    logger?: (msg: string) => void;
  },
): Promise<DeliveryResult> {
  const isSynthetic = config?.isSynthetic ?? true;
  const sink = isSynthetic ? "synthetic_test_sink" : "email_provider";

  const email = renderInvitationEmail({
    locale: options.locale,
    workspaceLabel: options.workspaceLabel,
    inviterLabel: options.inviterLabel,
    roleLabel: options.roleLabel,
    expiryText: options.expiryText,
    secretUrl: options.secretUrl,
  });

  const transport =
    config?.transport ??
    (async () => ({
      ok: true,
      providerReference: `synth_ref_${crypto.randomUUID().slice(0, 8)}`,
    }));

  try {
    const res = await transport({
      to: options.recipientEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (config?.logger) {
      config.logger(
        `Delivery dispatched to ${sink} status=${res.ok ? "accepted" : res.reason || "failed"}`,
      );
    }

    if (res.ok) {
      let digest: string | undefined;
      if (res.providerReference) {
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(res.providerReference),
        );
        digest = Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 16);
      }
      return {
        status: "provider_accepted",
        sink,
        providerDigest: digest,
      };
    }

    if (res.reason === "rate_limited") {
      return { status: "rate_limited", sink };
    }

    return { status: "failed", sink };
  } catch (_err) {
    if (config?.logger) {
      config.logger("Delivery failed with network error");
    }
    return { status: "unknown", sink };
  }
}
