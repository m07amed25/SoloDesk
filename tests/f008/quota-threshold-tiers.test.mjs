import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateUtilization,
  determineQuotaTier,
  assertQuotaWriteAvailable,
} from "../../supabase/functions/_shared/quota.ts";

test("A-16: Quota utilization calculation handles zero and baseline workloads", () => {
  const baseProfile = {
    db_storage_bytes: 0,
    object_storage_bytes: 0,
    monthly_egress_bytes: 0,
    db_storage_limit_bytes: 524288000, // 500 MB
    object_storage_limit_bytes: 1073741824, // 1 GB
    monthly_egress_limit_bytes: 5368709120, // 5 GB
  };

  const util = calculateUtilization(baseProfile);
  assert.equal(util.maxPercent, 0);
  assert.equal(determineQuotaTier(util.maxRatio), "normal");
});

test("A-16: Quota tier transitions across all threshold boundaries (70%, 85%, 95%, 100%)", () => {
  const limit = 1000000;
  const profile = {
    db_storage_bytes: 0,
    object_storage_bytes: 0,
    monthly_egress_bytes: 0,
    db_storage_limit_bytes: limit,
    object_storage_limit_bytes: limit,
    monthly_egress_limit_bytes: limit,
  };

  // 1. Normal (< 70%)
  profile.db_storage_bytes = 699999;
  let util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "normal");

  // 2. Warning 70 (70% - 84%)
  profile.db_storage_bytes = 700000;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "warning_70");

  profile.db_storage_bytes = 849999;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "warning_70");

  // 3. Warning 85 (85% - 94%)
  profile.db_storage_bytes = 850000;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "warning_85");

  profile.db_storage_bytes = 949999;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "warning_85");

  // 4. Critical 95 (95% - 99%)
  profile.db_storage_bytes = 950000;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "critical_95");

  profile.db_storage_bytes = 999999;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "critical_95");

  // 5. Exhausted 100 (>= 100%)
  profile.db_storage_bytes = 1000000;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "exhausted_100");

  profile.db_storage_bytes = 1500000;
  util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "exhausted_100");
});

test("A-16: Multi-dimensional quota evaluation triggers on whichever resource is highest", () => {
  const limit = 1000;
  // DB at 20%, Egress at 40%, Object storage at 96% -> critical_95
  const profile = {
    db_storage_bytes: 200,
    monthly_egress_bytes: 400,
    object_storage_bytes: 960,
    db_storage_limit_bytes: limit,
    monthly_egress_limit_bytes: limit,
    object_storage_limit_bytes: limit,
  };

  const util = calculateUtilization(profile);
  assert.equal(determineQuotaTier(util.maxRatio), "critical_95");

  // Now bump egress to 105% -> exhausted_100
  profile.monthly_egress_bytes = 1050;
  const utilExhausted = calculateUtilization(profile);
  assert.equal(determineQuotaTier(utilExhausted.maxRatio), "exhausted_100");
});

test("A-16: assertQuotaWriteAvailable allows write under limit and rejects write that exceeds limit", () => {
  const profile = {
    db_storage_bytes: 500,
    object_storage_bytes: 800,
    monthly_egress_bytes: 200,
    db_storage_limit_bytes: 1000,
    object_storage_limit_bytes: 1000,
    monthly_egress_limit_bytes: 1000,
  };

  // Normal write under remaining 200 bytes
  assert.doesNotThrow(() => {
    assertQuotaWriteAvailable(profile, 150);
  });

  // Write that would exceed remaining 200 bytes (800 + 250 = 1050 > 1000)
  assert.throws(
    () => {
      assertQuotaWriteAvailable(profile, 250);
    },
    (err) => err.code === "STORAGE_UNAVAILABLE" && err.statusCode === 507,
  );

  // If already at 100%, immediate rejection with 507
  profile.object_storage_bytes = 1000;
  assert.throws(
    () => {
      assertQuotaWriteAvailable(profile, 0);
    },
    (err) => err.code === "STORAGE_UNAVAILABLE" && err.statusCode === 507,
  );
});
