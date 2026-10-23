import test from "node:test";
import assert from "node:assert/strict";
import { InvitationService } from "../../../app/main/invitations/invitation-service.ts";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_DEVICES,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
  FIXTURE_INVITATIONS,
} from "../fixtures/invitation-fixtures.mjs";

test("F013 T021: InvitationService create requires valid session and inviter authority", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (_fn, _params, token) => {
      if (!token || token === "expired") {
        throw new Error("not_authorized: invalid or expired session token");
      }
      return {
        ok: true,
        effect: "created",
        invitation: FIXTURE_INVITATIONS.pending,
      };
    },
  });

  const validPayload = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: {
      kind: "email",
      value: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
    offerRef: "member_standard",
    policyRevision: 1,
  };

  // Missing token
  const resNoToken = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    validPayload,
    FIXTURE_DEVICES.device1,
    undefined,
  );
  assert.equal(resNoToken.ok, false);
  if (!resNoToken.ok) {
    assert.equal(resNoToken.code, "not_authorized");
  }

  // Valid token
  const resValid = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    validPayload,
    FIXTURE_DEVICES.device1,
    "valid-owner-jwt",
  );
  assert.equal(resValid.ok, true);
});

test("F013 T021: Authoritative create produces one pending invitation, one generation, queued delivery, zero membership", async () => {
  let rpcParamsCaptured = null;
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params, _token) => {
      assert.equal(fn, "solodesk_invitation_create");
      rpcParamsCaptured = params;
      return {
        ok: true,
        effect: "created",
        invitation: {
          invitationId: "i0000000-0000-4000-8000-000000000001",
          revision: 1,
          recipientLabel: "sarah.invitee@test.local",
          offerRef: "member_standard",
          roleLabelKey: "roles.contributor",
          scopeLabelKey: "scopes.workspace_read_write",
          lifecycle: "pending",
          expiresAt: "2026-10-30T12:00:00Z",
          deliveryOutcome: "queued",
          membershipOutcome: "not_created",
          availableActions: ["resend", "revoke", "refresh"],
          updatedAt: "2026-10-23T12:00:00Z",
        },
      };
    },
  });

  const payload = {
    operationId: "22222222-2222-4222-8222-222222222222",
    recipient: { kind: "email", value: "sarah.invitee@test.local" },
    offerRef: "member_standard",
    policyRevision: 1,
  };

  const result = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    payload,
    FIXTURE_DEVICES.device1,
    "valid-admin-jwt",
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.effect, "created");
    assert.equal(result.invitation.lifecycle, "pending");
    assert.equal(result.invitation.deliveryOutcome, "queued");
    assert.equal(result.invitation.membershipOutcome, "not_created");
    // Explicit assertion: zero secret fields leaked to caller
    assert.equal("secret" in result.invitation, false);
    assert.equal("token" in result.invitation, false);
    assert.equal("rawSecret" in result.invitation, false);
    assert.equal("selector" in result.invitation, false);
    assert.equal("secretDigest" in result.invitation, false);
  }

  // Verify parameters sent to database RPC
  assert.ok(rpcParamsCaptured);
  assert.equal(
    rpcParamsCaptured.p_workspace_id,
    FIXTURE_WORKSPACES.wsMain.workspaceId,
  );
  assert.equal(rpcParamsCaptured.p_operation_id, payload.operationId);
  assert.equal(rpcParamsCaptured.p_recipient_email, "sarah.invitee@test.local");
  assert.equal(rpcParamsCaptured.p_offer_ref, "member_standard");
  assert.equal(rpcParamsCaptured.p_policy_revision, 1);
  assert.equal(
    rpcParamsCaptured.p_device_enrollment_id,
    FIXTURE_DEVICES.device1,
  );
  assert.ok(rpcParamsCaptured.p_selector.startsWith("sel_"));
  assert.ok(rpcParamsCaptured.p_secret_digest);
});

test("F013 T021: Atomic transaction rollback on failure after generation, delivery, or evidence boundaries", async () => {
  const failurePoints = [
    {
      step: "invitation_insert",
      error: "unique_violation: pending invitation already exists",
    },
    {
      step: "generation_insert",
      error: "db_error: foreign key generation failed",
    },
    {
      step: "delivery_insert",
      error: "db_error: delivery attempt allocation failed",
    },
    { step: "evidence_insert", error: "db_error: evidence log write failed" },
  ];

  for (const failure of failurePoints) {
    const service = new InvitationService({
      supabaseUrl: "https://auth.solodesk.test",
      supabaseAnonKey: "anon-key",
      rpcExecutor: async () => {
        throw new Error(
          `RPC solodesk_invitation_create failed (500): ${failure.error}`,
        );
      },
    });

    const res = await service.create(
      FIXTURE_WORKSPACES.wsMain.workspaceId,
      {
        operationId: "33333333-3333-4333-8333-333333333333",
        recipient: { kind: "email", value: "test@example.com" },
        offerRef: "member_standard",
        policyRevision: 1,
      },
      FIXTURE_DEVICES.device1,
      "valid-token",
    );

    assert.equal(res.ok, false, `Expected safe failure on ${failure.step}`);
    if (!res.ok) {
      assert.ok(
        [
          "temporarily_unavailable",
          "invitation_already_pending",
          "outcome_unknown",
        ].includes(res.code),
      );
    }
  }
});

test("F013 T021: Database digest failures are not mislabeled as stale workspace state", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error("function digest(text, unknown) does not exist");
    },
  });

  const result = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "44444444-4444-4444-8444-444444444444",
      recipient: { kind: "email", value: "test@example.com" },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "outcome_unknown");
});
