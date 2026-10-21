import type { IdentityConfig } from "./config.ts";
import type { EnrollmentService, EnrollmentServiceResult } from "./enrollment.ts";
import type { StoredEnrollmentIntent } from "./protected-identity-store.ts";

export function parseEnrollmentResult(value: unknown): EnrollmentServiceResult {
  if (!value || typeof value !== "object") throw new Error("invalid_enrollment_result");
  const result = value as Record<string, unknown>;
  if (result.status === "enrolled") {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (![result.deviceEnrollmentId, result.deviceId, result.receiptId].every(
      (entry) => typeof entry === "string" && uuid.test(entry),
    )) throw new Error("invalid_enrollment_result");
    return Object.freeze({
      status: "enrolled",
      deviceEnrollmentId: String(result.deviceEnrollmentId),
      deviceId: String(result.deviceId),
      receiptId: String(result.receiptId),
    });
  }
  if (!["not_enrolled", "outcome_unknown", "rejected"].includes(String(result.status)))
    throw new Error("invalid_enrollment_result");
  return Object.freeze({ status: result.status as "not_enrolled" | "outcome_unknown" | "rejected" });
}

export function enrollmentPayload(intent: StoredEnrollmentIntent): Record<string, unknown> {
  const { status: _status, deviceEnrollmentId: _enrollment, receiptId: _receipt, ...request } = intent;
  void _status; void _enrollment; void _receipt;
  return request;
}

export class SupabaseEnrollmentService implements EnrollmentService {
  private readonly config: IdentityConfig;
  private readonly accessToken: () => string;
  constructor(
    config: IdentityConfig,
    accessToken: () => string,
  ) { this.config = config; this.accessToken = accessToken; }

  async enroll(_account: Readonly<{ issuerId: string; subjectId: string }>, request: StoredEnrollmentIntent): Promise<EnrollmentServiceResult> {
    return this.rpc("solodesk_enroll_device", { p_request: enrollmentPayload(request) });
  }

  async result(_account: Readonly<{ issuerId: string; subjectId: string }>, enrollmentIntentId: string): Promise<EnrollmentServiceResult> {
    return this.rpc("solodesk_enrollment_result", { p_intent_id: enrollmentIntentId });
  }

  private async rpc(name: string, body: Record<string, unknown>): Promise<EnrollmentServiceResult> {
    const response = await fetch(`${new URL(this.config.issuer).origin}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.config.publishableKey,
        Authorization: `Bearer ${this.accessToken()}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("session_rejected");
      throw new Error("enrollment_service_unavailable");
    }
    return parseEnrollmentResult(await response.json());
  }
}
