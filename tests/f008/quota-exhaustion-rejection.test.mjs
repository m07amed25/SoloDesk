import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import {
  assertQuotaWriteAvailable,
  calculateUtilization,
  determineQuotaTier,
} from "../../supabase/functions/_shared/quota.ts";

test("A-17: 100% Quota exhaustion rejects new writes cleanly without data corruption", () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // 1. Snapshot initial state of Workspace Alpha
  const initialClients = emulator
    .from("clients")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");
  const initialProjects = emulator
    .from("projects")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");
  const initialStorage = emulator
    .from("tenant_storage_objects")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");

  assert.ok(initialClients.data.length > 0, "Initial clients exist");
  assert.ok(initialProjects.data.length > 0, "Initial projects exist");
  assert.ok(initialStorage.data.length > 0, "Initial storage objects exist");
  const initialClientCount = initialClients.data.length;
  const initialProjectCount = initialProjects.data.length;
  const initialStorageCount = initialStorage.data.length;

  // 2. Set Workspace Alpha quota to 100% exhausted
  emulator.execSql(`
    UPDATE provider_quota_profiles
    SET db_storage_bytes = db_storage_limit_bytes,
        quota_tier = 'exhausted_100'
    WHERE workspace_id = 'ws_alpha_01'
  `);

  const updatedProfileRow = emulator
    .from("provider_quota_profiles")
    .select("*")
    .eq("workspace_id", "ws_alpha_01").data[0];

  assert.equal(updatedProfileRow.quota_tier, "exhausted_100");

  // 3. Verify write pre-flight rejects any new write with STORAGE_UNAVAILABLE / 507
  assert.throws(
    () => {
      assertQuotaWriteAvailable(updatedProfileRow, 1024);
    },
    (err) => {
      return (
        err.code === "STORAGE_UNAVAILABLE" &&
        err.statusCode === 507 &&
        err.message.includes("507 Storage Unavailable")
      );
    },
    "Must throw 507 STORAGE_UNAVAILABLE when quota is exhausted",
  );

  // 4. Verify 100% preservation of all pre-existing records
  const afterClients = emulator
    .from("clients")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");
  const afterProjects = emulator
    .from("projects")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");
  const afterStorage = emulator
    .from("tenant_storage_objects")
    .select("*")
    .eq("workspace_id", "ws_alpha_01");

  assert.equal(
    afterClients.data.length,
    initialClientCount,
    "All existing client records preserved",
  );
  assert.equal(
    afterProjects.data.length,
    initialProjectCount,
    "All existing project records preserved",
  );
  assert.equal(
    afterStorage.data.length,
    initialStorageCount,
    "All existing storage records preserved",
  );

  // 5. Existing records remain readable
  assert.equal(afterClients.data[0].id, initialClients.data[0].id);
  assert.equal(afterClients.data[0].name, initialClients.data[0].name);
});
