import test from "node:test";
import assert from "node:assert/strict";
import {
  INVITATION_CONTRACT_VERSION,
  INVITATION_LIFECYCLES,
  DELIVERY_OUTCOMES,
  MEMBERSHIP_OUTCOMES,
  SAFE_ACTIONS,
  SAFE_FAILURE_CODES,
  INVITATION_BOUNDS,
  isCanonicalUuid,
  normalizeAndValidateRecipientEmail,
  computeInvitationOperationDigest,
  createSafeInvitationFailure,
} from "../../../app/shared/invitation-contracts.ts";
import { FIXTURE_BOUNDS } from "../fixtures/invitation-fixtures.mjs";

test("F013 Contracts: Version and Closed Enums", () => {
  assert.equal(INVITATION_CONTRACT_VERSION, 1);
  assert.deepEqual([...INVITATION_LIFECYCLES], [
    "pending",
    "accepted",
    "revoked",
    "expired",
    "superseded",
  ]);
  assert.deepEqual([...DELIVERY_OUTCOMES], [
    "queued",
    "provider_accepted",
    "delivered",
    "delayed",
    "failed",
    "bounced",
    "rate_limited",
    "unknown",
  ]);
  assert.deepEqual([...MEMBERSHIP_OUTCOMES], ["not_created", "active"]);
  assert.ok(SAFE_ACTIONS.includes("connect_and_retry"));
  assert.ok(SAFE_ACTIONS.includes("refresh"));
  assert.ok(SAFE_ACTIONS.includes("resend"));
  assert.ok(SAFE_ACTIONS.includes("correct_input"));
  assert.ok(SAFE_FAILURE_CODES.includes("online_required"));
  assert.ok(SAFE_FAILURE_CODES.includes("not_authorized"));
  assert.ok(SAFE_FAILURE_CODES.includes("stale_state"));
  assert.ok(SAFE_FAILURE_CODES.includes("recipient_already_member"));
  assert.ok(SAFE_FAILURE_CODES.includes("invitation_already_pending"));
});

test("F013 Contracts: Canonical UUIDv4 Validation", () => {
  assert.equal(isCanonicalUuid("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isCanonicalUuid("a0000000-0000-4000-8000-000000000001"), true);
  // Rejections
  assert.equal(isCanonicalUuid("11111111-1111-1111-8111-111111111111"), false); // not v4
  assert.equal(isCanonicalUuid("11111111-1111-4111-c111-111111111111"), false); // invalid variant
  assert.equal(isCanonicalUuid("11111111-1111-4111-8111-11111111111"), false); // short
  assert.equal(isCanonicalUuid("A0000000-0000-4000-8000-000000000001"), false); // upper case
  assert.equal(isCanonicalUuid(null), false);
  assert.equal(isCanonicalUuid(123), false);
  assert.equal(isCanonicalUuid({}), false);
});

test("F013 Contracts: Recipient Email Normalization & Bounds", () => {
  // Valid
  const res1 = normalizeAndValidateRecipientEmail("  Alice@Example.COM  ");
  assert.equal(res1.ok, true);
  if (res1.ok) {
    assert.equal(res1.email, "alice@example.com");
  }

  const resShort = normalizeAndValidateRecipientEmail(FIXTURE_BOUNDS.validEmailShort);
  assert.equal(resShort.ok, true);

  // Invalid formats
  assert.equal(normalizeAndValidateRecipientEmail("").ok, false);
  assert.equal(normalizeAndValidateRecipientEmail("no-at-sign.com").ok, false);
  assert.equal(normalizeAndValidateRecipientEmail("@missing-local.com").ok, false);
  assert.equal(normalizeAndValidateRecipientEmail("missing-domain@").ok, false);
  assert.equal(normalizeAndValidateRecipientEmail("spaces in@email.com").ok, false);

  // Control characters rejected
  assert.equal(
    normalizeAndValidateRecipientEmail(FIXTURE_BOUNDS.invalidEmailControlChars).ok,
    false,
  );

  // Too long rejected
  assert.equal(
    normalizeAndValidateRecipientEmail(FIXTURE_BOUNDS.invalidEmailTooLong).ok,
    false,
  );
});

test("F013 Contracts: Deterministic Semantic Digest for Operation Replay", () => {
  const digest1 = computeInvitationOperationDigest("create", {
    workspaceId: "ws_123",
    recipientEmail: "test@example.com",
    offerRef: "member_standard",
    policyRevision: 1,
  });

  const digest2 = computeInvitationOperationDigest("create", {
    // Keys in different order
    policyRevision: 1,
    offerRef: "member_standard",
    recipientEmail: "test@example.com",
    workspaceId: "ws_123",
  });

  assert.equal(digest1, digest2);
  assert.equal(digest1.length, 64); // SHA-256 hex string

  // Different payload produces different digest
  const digestChanged = computeInvitationOperationDigest("create", {
    workspaceId: "ws_123",
    recipientEmail: "other@example.com",
    offerRef: "member_standard",
    policyRevision: 1,
  });
  assert.notEqual(digest1, digestChanged);
});

test("F013 Contracts: Safe Failure Factory Excludes Unsafe Attributes", () => {
  const failure = createSafeInvitationFailure("recipient_already_member", "none", {
    field: "recipient",
    correlationId: "cor_test_123",
  });

  assert.equal(failure.ok, false);
  assert.equal(failure.code, "recipient_already_member");
  assert.equal(failure.action, "none");
  assert.equal(failure.field, "recipient");
  assert.equal(failure.correlationId, "cor_test_123");

  // Ensure no token, error stack, secret, or provider details exist
  assert.equal("error" in failure, false);
  assert.equal("stack" in failure, false);
  assert.equal("token" in failure, false);
  assert.equal("secret" in failure, false);
  assert.equal(Object.isFrozen(failure), true);
});
