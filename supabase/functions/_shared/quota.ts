// Quota calculation, threshold evaluation, and pre-flight write verification
import type {
  QuotaTier,
  ProviderQuotaProfileDto,
} from "../../../app/shared/cloud-contracts.ts";

export interface QuotaProfile {
  db_storage_bytes: number;
  object_storage_bytes: number;
  monthly_egress_bytes: number;
  db_storage_limit_bytes: number;
  object_storage_limit_bytes: number;
  monthly_egress_limit_bytes: number;
  quota_tier?: QuotaTier;
}

export function calculateUtilization(profile: QuotaProfile): {
  dbRatio: number;
  objectRatio: number;
  egressRatio: number;
  maxRatio: number;
  maxPercent: number;
} {
  const dbRatio =
    profile.db_storage_limit_bytes > 0
      ? profile.db_storage_bytes / profile.db_storage_limit_bytes
      : 0;

  const objectRatio =
    profile.object_storage_limit_bytes > 0
      ? profile.object_storage_bytes / profile.object_storage_limit_bytes
      : 0;

  const egressRatio =
    profile.monthly_egress_limit_bytes > 0
      ? profile.monthly_egress_bytes / profile.monthly_egress_limit_bytes
      : 0;

  const maxRatio = Math.max(dbRatio, objectRatio, egressRatio);
  const maxPercent = Math.round(maxRatio * 100);

  return { dbRatio, objectRatio, egressRatio, maxRatio, maxPercent };
}

export function determineQuotaTier(maxRatio: number): QuotaTier {
  if (maxRatio >= 1.0) {
    return "exhausted_100";
  }
  if (maxRatio >= 0.95) {
    return "critical_95";
  }
  if (maxRatio >= 0.85) {
    return "warning_85";
  }
  if (maxRatio >= 0.7) {
    return "warning_70";
  }
  return "normal";
}

export function assertQuotaWriteAvailable(
  profile: QuotaProfile,
  additionalObjectBytes = 0,
): void {
  const currentUtilization = calculateUtilization(profile);

  if (currentUtilization.maxRatio >= 1.0) {
    const err = new Error(
      "507 Storage Unavailable: Quota capacity exhausted (100%)",
    );
    (err as any).statusCode = 507;
    (err as any).code = "STORAGE_UNAVAILABLE";
    throw err;
  }

  if (additionalObjectBytes > 0) {
    const projectedObject =
      profile.object_storage_bytes + additionalObjectBytes;
    const projectedRatio =
      profile.object_storage_limit_bytes > 0
        ? projectedObject / profile.object_storage_limit_bytes
        : 1.0;

    if (projectedRatio > 1.0) {
      const err = new Error(
        "507 Storage Unavailable: Storage limit would be exceeded by write",
      );
      (err as any).statusCode = 507;
      (err as any).code = "STORAGE_UNAVAILABLE";
      throw err;
    }
  }
}
