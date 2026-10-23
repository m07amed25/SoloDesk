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

test("F013 T023: Recipient binding uses normalized email and rejects existing active members", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      if (params.p_recipient_email === "existing.member@test.local") {
        throw new Error(
          "RPC solodesk_invitation_create failed (409): recipient_already_member",
        );
      }
      return {
        ok: true,
        effect: "created",
        invitation: FIXTURE_INVITATIONS.pending,
      };
    },
  });

  // Attempt to invite an existing member
  const resExisting = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "11111111-1111-4111-8111-111111111111",
      recipient: { kind: "email", value: "EXISTING.MEMBER@test.local" },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(resExisting.ok, false);
  if (!resExisting.ok) {
    assert.equal(resExisting.code, "recipient_already_member");
    assert.equal(resExisting.field, "recipient");
    assert.equal(resExisting.action, "none");
  }
});

test("F013 T023: Removed prior member can receive a new pending invitation", async () => {
  let capturedRecipient = null;
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      capturedRecipient = params.p_recipient_email;
      return {
        ok: true,
        effect: "created",
        invitation: {
          ...FIXTURE_INVITATIONS.pending,
          recipientLabel: params.p_recipient_email,
        },
      };
    },
  });

  const resRemoved = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "22222222-2222-4222-8222-222222222222",
      recipient: { kind: "email", value: "prior.removed.member@test.local" },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(resRemoved.ok, true);
  assert.equal(capturedRecipient, "prior.removed.member@test.local");
});

test("F013 T023: Strict identity/contact separation: Contact/client records confer ZERO membership", async () => {
  // A contact with the same email exists in a CRM/client lead book
  const contactBookRecord = {
    email: "lead.contact@test.local",
    name: "Lead Contact",
    role: "billing_contact",
    isClient: true,
  };

  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (_fn, params) => {
      // Database creates only pending invitation, does not check or mutate client book
      assert.equal(params.p_recipient_email, contactBookRecord.email);
      return {
        ok: true,
        effect: "created",
        invitation: {
          ...FIXTURE_INVITATIONS.pending,
          recipientLabel: contactBookRecord.email,
          membershipOutcome: "not_created",
        },
      };
    },
  });

  const res = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "33333333-3333-4333-8333-333333333333",
      recipient: { kind: "email", value: contactBookRecord.email },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    // Crucial: membershipOutcome MUST be not_created
    assert.equal(res.invitation.membershipOutcome, "not_created");
  }
});

test("F013 T023: Lost inviter authority results in not_authorized safe failure", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error(
        "RPC solodesk_invitation_create failed (403): not_authorized",
      );
    },
  });

  const res = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "44444444-4444-4444-8444-444444444444",
      recipient: { kind: "email", value: "newbie@test.local" },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "downgraded-viewer-token",
  );

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, "not_authorized");
    assert.equal(res.action, "connect_and_retry");
  }
});

test("F013 T023: Disabled policy or unapproved offer returns policy_unavailable", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error(
        "RPC solodesk_invitation_create failed (400): policy_unavailable",
      );
    },
  });

  const res = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "55555555-5555-4555-8555-555555555555",
      recipient: { kind: "email", value: "newbie@test.local" },
      offerRef: "disabled_offer",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, "policy_unavailable");
    assert.equal(res.field, "offer");
    assert.equal(res.action, "refresh");
  }
});

test("F013 T023: Offline state returns online_required", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error("fetch failed: ECONNREFUSED 127.0.0.1:54321");
    },
  });

  const res = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    {
      operationId: "66666666-6666-4666-8666-666666666666",
      recipient: { kind: "email", value: "newbie@test.local" },
      offerRef: "member_standard",
      policyRevision: 1,
    },
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, "online_required");
    assert.equal(res.action, "connect_and_retry");
  }
});
