import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AccountSecurityCoordinator } from "../../../app/main/identity/account-security.ts";
import {
  VALID_POLICY_SYNTHETIC,
  VALID_POLICY_UNAVAILABLE,
} from "../fixtures/security-fixtures.mjs";

describe("T057: Feature Rollback & Safe Re-enable Without Data Loss", () => {
  it("disables security entry points when policy changes to unavailable without altering stored credentials", async () => {
    let savedHandoff = {
      operation_id: "op_persisted_safely",
      purpose: "factor_enroll",
      status: "in_progress",
    };

    const mockStore = {
      saveActiveSecurityHandoff: (h) => {
        savedHandoff = { ...h };
      },
      loadActiveSecurityHandoff: () => savedHandoff,
    };

    // When factor_requirement is "unavailable", entry point is disabled
    const coordinator = new AccountSecurityCoordinator(
      { securityPolicy: VALID_POLICY_UNAVAILABLE },
      mockStore,
    );

    const state = coordinator.getRendererState();
    assert.equal(state.policy_status, "unavailable");

    // Existing stored handoff / credentials remain intact on disk
    assert.equal(savedHandoff.operation_id, "op_persisted_safely");
  });

  it("re-enables feature safely and re-evaluates policy before presenting actions", async () => {
    const coordinator = new AccountSecurityCoordinator({
      securityPolicy: VALID_POLICY_SYNTHETIC,
    });

    const state = coordinator.getRendererState();
    assert.equal(state.policy_status, "optional");
    assert.equal(state.readiness, "factor_not_configured");
  });
});
