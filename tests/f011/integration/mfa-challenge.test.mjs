import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MfaChallengeCoordinator } from "../../../app/main/identity/account-security.ts";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROFILE_A,
  PROFILE_B,
  VALID_POLICY_SYNTHETIC,
} from "../fixtures/security-fixtures.mjs";

describe("T029: MFA Challenge Online Authority and Zero-Offline Enforcement", () => {
  const dummyConfig = {
    issuer: "https://auth.solodesk.test",
    audience: "solodesk-desktop",
    publishableKey: "test-publishable-key",
    serviceDomain: "https://auth.solodesk.test",
    authServerUrl: "https://auth.solodesk.test",
    securityPolicy: VALID_POLICY_SYNTHETIC,
  };

  it("refuses offline/cached success and fails closed on provider outage", async () => {
    let providerAvailable = false;
    const mockProvider = {
      observeSecurityProjection: async () => {
        if (!providerAvailable) throw new Error("provider_unavailable");
        return {
          issuer_id: ACCOUNT_A.issuer_id,
          subject_id: ACCOUNT_A.subject_id,
          session_id: "sess_mock_001",
          current_aal: "aal2",
          
          next_aal: "aal2",
          factor_summaries: [
            {
              id: "factor_1",
              type: "totp",
              status: "verified",
              friendly_name: "App",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          recovery_status: "available",
          provider_observed_at: new Date().toISOString(),
          capability_version: "v1",
        };
      },
    };

    const coordinator = new MfaChallengeCoordinator(dummyConfig, mockProvider);
    const challenge = coordinator.createChallenge({
      originatingAttemptId: crypto.randomUUID(),
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      securityGeneration: 1,
    });

    // Provider is offline: returns safe offline/error outcome, zero authority
    const offlineResult = await coordinator.reconcileChallenge(
      challenge.challengeId,
    );
    assert.equal(offlineResult.success, false);
    assert.equal(offlineResult.requiresOnline, true);
    assert.equal(offlineResult.safeNextAction, "retry");

    // Even if local state exists, NEVER grant cached/offline success
    assert.equal(coordinator.hasAuthority(challenge.challengeId), false);
  });

  it("invalidates challenge immediately on revoked session or generation change", async () => {
    const mockProvider = {
      observeSecurityProjection: async () => {
        throw new Error("session_rejected");
      },
    };

    const coordinator = new MfaChallengeCoordinator(dummyConfig, mockProvider);
    const challenge = coordinator.createChallenge({
      originatingAttemptId: crypto.randomUUID(),
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      securityGeneration: 1,
    });

    const result = await coordinator.reconcileChallenge(challenge.challengeId);
    assert.equal(result.success, false);
    assert.equal(result.safeNextAction, "sign_in_again");
    assert.equal(coordinator.hasAuthority(challenge.challengeId), false);
  });

  it("invalidates pending challenge on profile switch or account isolation boundary", () => {
    const coordinator = new MfaChallengeCoordinator(dummyConfig);
    const challenge = coordinator.createChallenge({
      originatingAttemptId: crypto.randomUUID(),
      issuerId: ACCOUNT_A.issuer_id,
      subjectId: ACCOUNT_A.subject_id,
      sessionId: "sess_mock_001",
      securityGeneration: 1,
      profileId: PROFILE_A.profile_id,
    });

    // Switch profile to Profile B
    coordinator.switchProfile(PROFILE_B.profile_id);

    // Prior challenge for Profile A is invalidated
    const res = coordinator.getChallenge(challenge.challengeId);
    assert.equal(res, null);
  });
});
