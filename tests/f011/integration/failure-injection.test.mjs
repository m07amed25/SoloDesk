import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  AccountSecurityCoordinator,
} from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  VALID_POLICY_SYNTHETIC,
  F011_CANARY_SECRETS,
} from "../fixtures/security-fixtures.mjs";

describe("T056: Cross-Boundary Failure Injection & Resilient Reconciliation", () => {
  it("fails closed on simulated browser launch failure without corrupting state", async () => {
    let savedHandoff = null;
    const mockStore = {
      saveActiveSecurityHandoff: (h) => {
        savedHandoff = { ...h };
      },
      loadActiveSecurityHandoff: () => savedHandoff,
      clearActiveSecurityHandoff: () => {
        savedHandoff = null;
      },
    };

    const failingBrowserLauncher = async () => {
      throw new Error("browser_launch_failed");
    };

    const coordinator = new AccountSecurityCoordinator(
      { securityPolicy: VALID_POLICY_SYNTHETIC },
      mockStore,
      undefined,
      failingBrowserLauncher,
    );

    // Initial state
    const initial = coordinator.getRendererState();
    assert.equal(initial.readiness, "factor_not_configured");

    // Start flow
    await coordinator.start("factor_enroll");
    const staged = coordinator.getActiveHandoff();
    assert.ok(staged);
    assert.equal(staged.status, "in_progress");

    // Cancel safely reverts to safe unconfigured state
    await coordinator.cancel();
    const cancelledState = coordinator.getRendererState();
    assert.equal(cancelledState.readiness, "factor_not_configured");
  });

  it("handles clock skew and expired handoffs safely", async () => {
    let savedHandoff = {
      version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: "factor_enroll",
      expected_security_generation: 1,
      destination_id: "hosted_enroll_v1",
      created_at: new Date(Date.now() - 700000).toISOString(),
      expires_at: new Date(Date.now() - 100000).toISOString(), // Expired!
      status: "in_progress",
    };

    const mockStore = {
      saveActiveSecurityHandoff: (h) => {
        savedHandoff = { ...h };
      },
      loadActiveSecurityHandoff: () => savedHandoff,
    };

    const coordinator = new AccountSecurityCoordinator(
      { securityPolicy: VALID_POLICY_SYNTHETIC },
      mockStore,
    );

    const active = coordinator.getActiveHandoff();
    // Expired handoff must be returned as null and marked expired
    assert.equal(active, null);
    assert.equal(savedHandoff.status, "expired");
  });
});
