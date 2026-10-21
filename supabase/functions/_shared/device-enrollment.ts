import { computeIntentDigest } from "./authoritative-command.ts";
import type { VerifiedIdentityContext } from "./identity-auth.ts";

export type DeviceEnrollmentRequest = Readonly<{
  enrollmentIntentId: string;
  profileReference: string;
  profileGeneration: number;
  installationContextId: string;
  deviceContextDigest: string;
  deviceLabel?: string;
  platform: "win32" | "darwin" | "linux";
  architecture: string;
  appVersion: string;
  protectionProofReference: string;
  payloadVersion: 1;
  requestDigest: string;
}>;

export interface DeviceEnrollmentDatabase {
  enroll(
    identity: VerifiedIdentityContext,
    request: DeviceEnrollmentRequest,
  ): Promise<unknown>;
  result(
    identity: VerifiedIdentityContext,
    enrollmentIntentId: string,
  ): Promise<unknown | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST = /^[0-9a-f]{64}$/;

export async function parseDeviceEnrollmentRequest(value: unknown): Promise<DeviceEnrollmentRequest | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = [
    "enrollmentIntentId", "profileReference", "profileGeneration",
    "installationContextId", "deviceContextDigest", "deviceLabel", "platform",
    "architecture", "appVersion", "protectionProofReference", "payloadVersion",
    "requestDigest",
  ];
  if (Object.keys(input).some((key) => !allowed.includes(key))) return null;
  if (
    typeof input.enrollmentIntentId !== "string" || !UUID.test(input.enrollmentIntentId) ||
    typeof input.profileReference !== "string" || input.profileReference.length > 128 ||
    !Number.isSafeInteger(input.profileGeneration) || Number(input.profileGeneration) < 1 ||
    typeof input.installationContextId !== "string" || input.installationContextId.length > 128 ||
    typeof input.deviceContextDigest !== "string" || !DIGEST.test(input.deviceContextDigest) ||
    (input.deviceLabel !== undefined && (typeof input.deviceLabel !== "string" || input.deviceLabel.length > 64 || /[\u0000-\u001f\u007f-\u009f]/.test(input.deviceLabel))) ||
    !["win32", "darwin", "linux"].includes(String(input.platform)) ||
    typeof input.architecture !== "string" || input.architecture.length > 32 ||
    typeof input.appVersion !== "string" || input.appVersion.length > 64 ||
    typeof input.protectionProofReference !== "string" || input.protectionProofReference.length > 128 ||
    input.payloadVersion !== 1 || typeof input.requestDigest !== "string" || !DIGEST.test(input.requestDigest)
  ) return null;

  const digestInput = Object.fromEntries(
    allowed
      .filter((key) => key !== "enrollmentIntentId" && key !== "requestDigest")
      .filter((key) => input[key] !== undefined)
      .sort()
      .map((key) => [key, input[key]]),
  );
  if ((await computeIntentDigest(JSON.stringify(digestInput))) !== input.requestDigest) return null;
  return Object.freeze(input as DeviceEnrollmentRequest);
}

