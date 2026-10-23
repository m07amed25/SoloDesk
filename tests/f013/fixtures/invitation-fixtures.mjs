// F013 Member Invitations Fixtures
// Strictly synthetic test data with prohibited-data canaries

export const FIXTURE_ACCOUNTS = Object.freeze({
  inviterOwner: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000001",
    email: "owner@test.local",
  },
  inviterAdmin: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "a0000000-0000-4000-8000-000000000002",
    email: "admin@test.local",
  },
  intendedRecipient: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "b0000000-0000-4000-8000-000000000001",
    email: "sarah.invitee@test.local",
  },
  wrongAccount: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "b0000000-0000-4000-8000-000000000002",
    email: "mallory.wrong@test.local",
  },
  arabicRecipient: {
    issuerId: "https://auth.solodesk.test",
    subjectId: "b0000000-0000-4000-8000-000000000003",
    email: "tariq@test.local",
  },
});

export const FIXTURE_DEVICES = Object.freeze({
  device1: "d0000000-0000-4000-8000-000000000001",
  device2: "d0000000-0000-4000-8000-000000000002",
});

export const FIXTURE_WORKSPACES = Object.freeze({
  wsMain: {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    displayName: "Acme Production",
    discriminator: "1111",
    role: "owner",
  },
  wsArabic: {
    workspaceId: "33333333-3333-4333-8333-333333333333",
    displayName: "ورشة العمل",
    discriminator: "3333",
    role: "owner",
  },
  wsForeign: {
    workspaceId: "99999999-9999-4999-8999-999999999999",
    displayName: "Foreign Studio",
    discriminator: "9999",
    role: "owner",
  },
});

export const FIXTURE_POLICIES = Object.freeze({
  synthetic: {
    policyId: "p0000000-0000-4000-8000-000000000001",
    revision: 1,
    enabled: true,
    offers: [
      {
        offerRef: "member_standard",
        roleRef: "contributor",
        scopeRef: "workspace_read_write",
        consequenceKey: "invitation.consequence.member_standard",
      },
      {
        offerRef: "read_only",
        roleRef: "viewer",
        scopeRef: "workspace_read_only",
        consequenceKey: "invitation.consequence.read_only",
      },
    ],
  },
  disabled: {
    policyId: "p0000000-0000-4000-8000-000000000002",
    revision: 1,
    enabled: false,
    offers: [],
  },
});

export const FIXTURE_INVITATIONS = Object.freeze({
  pending: {
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
  accepted: {
    invitationId: "i0000000-0000-4000-8000-000000000002",
    revision: 2,
    recipientLabel: "accepted.user@test.local",
    offerRef: "member_standard",
    roleLabelKey: "roles.contributor",
    scopeLabelKey: "scopes.workspace_read_write",
    lifecycle: "accepted",
    expiresAt: "2026-10-30T12:00:00Z",
    deliveryOutcome: "delivered",
    membershipOutcome: "active",
    availableActions: ["refresh"],
    updatedAt: "2026-10-23T13:00:00Z",
  },
  revoked: {
    invitationId: "i0000000-0000-4000-8000-000000000003",
    revision: 2,
    recipientLabel: "revoked.user@test.local",
    offerRef: "read_only",
    roleLabelKey: "roles.viewer",
    scopeLabelKey: "scopes.workspace_read_only",
    lifecycle: "revoked",
    expiresAt: "2026-10-30T12:00:00Z",
    deliveryOutcome: "unknown",
    membershipOutcome: "not_created",
    availableActions: ["refresh"],
    updatedAt: "2026-10-23T14:00:00Z",
  },
  expired: {
    invitationId: "i0000000-0000-4000-8000-000000000004",
    revision: 1,
    recipientLabel: "expired.user@test.local",
    offerRef: "member_standard",
    roleLabelKey: "roles.contributor",
    scopeLabelKey: "scopes.workspace_read_write",
    lifecycle: "expired",
    expiresAt: "2026-10-20T12:00:00Z",
    deliveryOutcome: "failed",
    membershipOutcome: "not_created",
    availableActions: ["refresh"],
    updatedAt: "2026-10-20T12:00:00Z",
  },
});

export const FIXTURE_BOUNDS = Object.freeze({
  validEmailShort: "a@b.co",
  validEmailMax: "a".repeat(60) + "@" + "b".repeat(250) + ".com",
  invalidEmailTooLong: "a".repeat(65) + "@" + "b".repeat(260) + ".com",
  invalidEmailControlChars: "test\x00user@example.com",
  validArabicDisplayName: "مروان أحمد",
  validMixedBidiDisplayName: "Sarah كريم",
});

// Distinctive prohibited secret canaries for security scanner checks
export const FIXTURE_CANARIES = Object.freeze({
  rawSecret: "CANARY_F013_RAW_SECRET_LEAK_deadbeef1234",
  secretUrl:
    "https://auth.solodesk.test/invitation#sel_canary.CANARY_SECRET_FRAGMENT",
  continuationToken: "CANARY_CONTINUATION_TOKEN_cookie_secret_9999",
  providerPayload: "CANARY_RAW_PROVIDER_PAYLOAD_INTERNAL_SENDGRID_WEBHOOK",
  recipientBinding: "CANARY_RECIPIENT_BINDING_RAW_SECRET_SALT",
});
