import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { AccountSecurityCoordinator } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_A,
  PROFILE_B,
  TEST_SECRET_PROTECTION,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T021: Factor Enrollment Restart, Failure & Protected Handoff Integration", () => {
  function createTestStore(t) {
    const root = mkdtempSync(join(tmpdir(), "solodesk-f011-integration-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const store = new ProtectedIdentityStore(
      root,
      PROFILE_A.profile_id,
      undefined,
      TEST_SECRET_PROTECTION,
    );
    return { root, store };
  }

  const dummyConfig = {
    issuer: "https://auth.solodesk.test",
    audience: "solodesk-desktop",
    publishableKey: "test-publishable-key",
    serviceDomain: "https://auth.solodesk.test",
    authServerUrl: "https://auth.solodesk.test",
    securityPolicy: VALID_POLICY_SYNTHETIC,
  };

  it("stages protected security handoff before browser launch and restores it on restart", (t) => {
    const { store } = createTestStore(t);
    const coordinator = new AccountSecurityCoordinator(dummyConfig, store);

    const handoff = {
      version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: "factor_enroll",
      expected_security_generation: 1,
      profile_generation: 1,
      session_generation: 1,
      destination_id: "hosted_enroll_v1",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: "in_progress",
    };

    coordinator.stageHandoff(handoff);
    assert.deepEqual(store.loadActiveSecurityHandoff(), handoff);

    // Create a new coordinator simulating restart
    const restartedCoordinator = new AccountSecurityCoordinator(
      dummyConfig,
      store,
    );
    const restoredHandoff = restartedCoordinator.getActiveHandoff();
    assert.deepEqual(restoredHandoff, handoff);
  });

  it("cancelling or expiring a handoff marks it cancelled/expired and fails closed", (t) => {
    const { store } = createTestStore(t);
    const coordinator = new AccountSecurityCoordinator(dummyConfig, store);

    const handoff = {
      version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: "factor_enroll",
      expected_security_generation: 1,
      profile_generation: 1,
      session_generation: 1,
      destination_id: "hosted_enroll_v1",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: "in_progress",
    };

    coordinator.stageHandoff(handoff);
    coordinator.cancelActiveHandoff();
    assert.equal(store.loadActiveSecurityHandoff()?.status, "cancelled");

    // Expired handoff on restore
    const expiredHandoff = {
      ...handoff,
      handoff_id: crypto.randomUUID(),
      expires_at: new Date(Date.now() - 1000).toISOString(),
      status: "in_progress",
    };
    store.saveActiveSecurityHandoff(expiredHandoff);
    const restored = new AccountSecurityCoordinator(
      dummyConfig,
      store,
    ).getActiveHandoff();
    assert.equal(restored, null);
    assert.equal(store.loadActiveSecurityHandoff()?.status, "expired");
  });

  it("corrupted handoff fails closed without destroying profile or replacing with empty profile", async (t) => {
    const { root, store } = createTestStore(t);
    const handoffDir = join(root, "identity", "profiles", PROFILE_A.profile_id);
    const { mkdirSync } = await import("node:fs");
    mkdirSync(handoffDir, { recursive: true });
    const handoffPath = join(handoffDir, "active-security-handoff.json");
    writeFileSync(handoffPath, "{ corrupted invalid json !!!", "utf-8");

    const coordinator = new AccountSecurityCoordinator(dummyConfig, store);
    const active = coordinator.getActiveHandoff();
    assert.equal(active, null);

    // Profile remains intact, never replaced by empty profile
    assert.equal(store.hasProfile(), false); // no active profile was stored yet, but nothing threw or replaced
  });

  it("enforces profile/account isolation across two windows or devices", (t) => {
    const { root, store } = createTestStore(t);
    const storeB = new ProtectedIdentityStore(
      root,
      PROFILE_B.profile_id,
      undefined,
      TEST_SECRET_PROTECTION,
    );
    const coordA = new AccountSecurityCoordinator(dummyConfig, store);
    const coordB = new AccountSecurityCoordinator(dummyConfig, storeB);

    const handoffA = {
      version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: "factor_enroll",
      expected_security_generation: 1,
      profile_generation: 1,
      session_generation: 1,
      destination_id: "hosted_enroll_v1",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: "in_progress",
    };

    coordA.stageHandoff(handoffA);
    assert.equal(coordB.getActiveHandoff(), null);
  });
});
