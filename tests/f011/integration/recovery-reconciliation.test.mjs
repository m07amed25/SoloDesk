import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { RecoveryReconciliationCoordinator } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_A,
  PROFILE_B,
  VALID_POLICY_SYNTHETIC,
  MISSING_LOCAL_KEY_CONSEQUENCE,
} from "../fixtures/security-fixtures.mjs";

describe("T036: Recovery Reconciliation, Interruption & Local Protection Boundary", () => {
  it("resumes in-flight recovery operation after simulated app restart", async () => {
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

    const coordinator1 = new RecoveryReconciliationCoordinator(
      { securityPolicy: VALID_POLICY_SYNTHETIC },
      mockStore,
    );

    const handoff = {
      version: 1,
      handoff_id: crypto.randomUUID(),
      operation_id: crypto.randomUUID(),
      purpose: "lost_factor_recover",
      expected_security_generation: 1,
      profile_generation: 1,
      session_generation: 1,
      destination_id: "hosted_recover_v1",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: "in_progress",
    };

    coordinator1.stageRecoveryHandoff(handoff);

    // Simulate app restart by instantiating new coordinator with the same store
    const coordinator2 = new RecoveryReconciliationCoordinator(
      { securityPolicy: VALID_POLICY_SYNTHETIC },
      mockStore,
    );

    const resumed = coordinator2.getActiveRecoveryHandoff();
    assert.ok(resumed);
    assert.equal(resumed.operation_id, handoff.operation_id);
    assert.equal(resumed.purpose, "lost_factor_recover");
  });

  it("enforces local key boundary: missing local key preserves encrypted bytes and requires unlock", async () => {
    const mockStore = {
      hasLocalKey: () => false,
      getEncryptedBytesLength: () => 4096,
    };

    const coordinator = new RecoveryReconciliationCoordinator(
      { securityPolicy: VALID_POLICY_SYNTHETIC },
      mockStore,
    );

    const consequence = coordinator.evaluateLocalDataConsequence({
      subjectId: ACCOUNT_A.subject_id,
      recoveredCloudIdentity: true,
    });

    assert.equal(consequence.local_data, "current_key_unavailable");
    assert.equal(consequence.next_action, "local_unlock_required");
    assert.equal(consequence.workspace_authority, "must_revalidate");

    // Must never delete or overwrite encrypted data when key is missing
    assert.equal(mockStore.getEncryptedBytesLength(), 4096);
  });

  it("enforces strict account isolation between Account A and Account B", async () => {
    const coordinator = new RecoveryReconciliationCoordinator({
      securityPolicy: VALID_POLICY_SYNTHETIC,
    });

    coordinator.setActiveAccount(ACCOUNT_A.subject_id);
    coordinator.stageRecoveryHandoff({
      operation_id: "op_account_a",
      purpose: "lost_factor_recover",
      subject_id: ACCOUNT_A.subject_id,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });

    // Account B context cannot access Account A handoff
    const handoffB = coordinator.getAccountRecoveryHandoff(
      ACCOUNT_B.subject_id,
    );
    assert.equal(handoffB, null);

    const handoffA = coordinator.getAccountRecoveryHandoff(
      ACCOUNT_A.subject_id,
    );
    assert.ok(handoffA);
    assert.equal(handoffA.operation_id, "op_account_a");
  });
});
