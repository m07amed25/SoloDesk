import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateInvitationInput,
  computeInvitationOperationDigest,
  INVITATION_BOUNDS,
  INVITATION_CONTRACT_VERSION,
} from "../../../app/shared/invitation-contracts.ts";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_POLICIES,
  FIXTURE_BOUNDS,
} from "../fixtures/invitation-fixtures.mjs";

test("F013 T020: Valid CreateInvitationInput admitted and normalized", () => {
  const allowedOffers = FIXTURE_POLICIES.synthetic.offers.map(
    (o) => o.offerRef,
  );
  const rawInput = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: { kind: "email", value: "  Sarah.Invitee@Test.Local  " },
    offerRef: "member_standard",
    policyRevision: 1,
  };

  const result = validateCreateInvitationInput(rawInput, allowedOffers);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.input.operationId,
      "11111111-1111-4111-8111-111111111111",
    );
    assert.equal(result.input.recipient.kind, "email");
    assert.equal(result.input.recipient.value, "sarah.invitee@test.local");
    assert.equal(result.input.offerRef, "member_standard");
    assert.equal(result.input.policyRevision, 1);
  }
});

test("F013 T020: Rejects unknown fields (Exact Key Check)", () => {
  const allowedOffers = ["member_standard"];
  const rawWithExtra = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: { kind: "email", value: "test@example.com" },
    offerRef: "member_standard",
    policyRevision: 1,
    extraProperty: "malicious_payload",
  };

  const result = validateCreateInvitationInput(rawWithExtra, allowedOffers);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.ok(result.reason.includes("unknown_field"));
  }
});

test("F013 T020: Rejects caller-supplied authority (actorId, workspaceId, role, scope, expiresAt, token)", () => {
  const allowedOffers = ["member_standard"];
  const attacks = [
    { actorId: "a0000000-0000-4000-8000-000000000001" },
    { workspaceId: "11111111-1111-4111-8111-111111111111" },
    { role: "owner" },
    { scope: "workspace_admin" },
    { expiresAt: "2099-01-01T00:00:00Z" },
    { token: "prohibited_tok" },
    { secret: "prohibited_sec" },
    { authority: "superuser" },
    { status: "accepted" },
  ];

  for (const attack of attacks) {
    const raw = {
      operationId: "11111111-1111-4111-8111-111111111111",
      recipient: { kind: "email", value: "test@example.com" },
      offerRef: "member_standard",
      policyRevision: 1,
      ...attack,
    };
    const result = validateCreateInvitationInput(raw, allowedOffers);
    assert.equal(
      result.ok,
      false,
      `Expected rejection for injected ${Object.keys(attack)[0]}`,
    );
    if (!result.ok) {
      assert.equal(result.code, "invalid_input");
      assert.ok(
        result.reason.includes("caller_authority_injection_prohibited"),
      );
    }
  }
});

test("F013 T020: Approved opaque offers only", () => {
  const allowedOffers = ["member_standard", "read_only"];

  // Valid offer
  const resValid = validateCreateInvitationInput(
    {
      operationId: "11111111-1111-4111-8111-111111111111",
      recipient: { kind: "email", value: "test@example.com" },
      offerRef: "read_only",
      policyRevision: 1,
    },
    allowedOffers,
  );
  assert.equal(resValid.ok, true);

  // Unapproved offer
  const resUnapproved = validateCreateInvitationInput(
    {
      operationId: "11111111-1111-4111-8111-111111111111",
      recipient: { kind: "email", value: "test@example.com" },
      offerRef: "super_admin_unapproved",
      policyRevision: 1,
    },
    allowedOffers,
  );
  assert.equal(resUnapproved.ok, false);
  if (!resUnapproved.ok) {
    assert.equal(resUnapproved.code, "policy_unavailable");
    assert.equal(resUnapproved.field, "offer");
  }
});

test("F013 T020: Bounded recipient input (max, max+1, control characters)", () => {
  const allowedOffers = ["member_standard"];
  const base = {
    operationId: "11111111-1111-4111-8111-111111111111",
    offerRef: "member_standard",
    policyRevision: 1,
  };

  // Max+1 length
  const resTooLong = validateCreateInvitationInput(
    {
      ...base,
      recipient: { kind: "email", value: FIXTURE_BOUNDS.invalidEmailTooLong },
    },
    allowedOffers,
  );
  assert.equal(resTooLong.ok, false);
  if (!resTooLong.ok) {
    assert.equal(resTooLong.field, "recipient");
  }

  // Control characters
  const resControl = validateCreateInvitationInput(
    {
      ...base,
      recipient: {
        kind: "email",
        value: FIXTURE_BOUNDS.invalidEmailControlChars,
      },
    },
    allowedOffers,
  );
  assert.equal(resControl.ok, false);
  if (!resControl.ok) {
    assert.equal(resControl.field, "recipient");
  }

  // Empty recipient
  const resEmpty = validateCreateInvitationInput(
    { ...base, recipient: { kind: "email", value: "   " } },
    allowedOffers,
  );
  assert.equal(resEmpty.ok, false);
});

test("F013 T020: Policy revision boundary checking", () => {
  const allowedOffers = ["member_standard"];
  const base = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: { kind: "email", value: "test@example.com" },
    offerRef: "member_standard",
  };

  // Negative revision
  assert.equal(
    validateCreateInvitationInput(
      { ...base, policyRevision: -1 },
      allowedOffers,
    ).ok,
    false,
  );
  // Zero revision
  assert.equal(
    validateCreateInvitationInput({ ...base, policyRevision: 0 }, allowedOffers)
      .ok,
    false,
  );
  // Float revision
  assert.equal(
    validateCreateInvitationInput(
      { ...base, policyRevision: 1.5 },
      allowedOffers,
    ).ok,
    false,
  );
});

test("F013 T020: Exact semantic digest calculation parity and isolation", () => {
  const d1 = computeInvitationOperationDigest("create", {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    recipientEmail: "sarah.invitee@test.local",
    offerRef: "member_standard",
    policyRevision: 1,
  });

  const d2 = computeInvitationOperationDigest("create", {
    policyRevision: 1,
    recipientEmail: "sarah.invitee@test.local",
    workspaceId: "11111111-1111-4111-8111-111111111111",
    offerRef: "member_standard",
  });

  assert.equal(d1, d2, "Digest must be independent of key order");

  const dDifferent = computeInvitationOperationDigest("create", {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    recipientEmail: "sarah.invitee@test.local",
    offerRef: "read_only", // different offer
    policyRevision: 1,
  });

  assert.notEqual(
    d1,
    dDifferent,
    "Different semantic fields must produce different digests",
  );
});
