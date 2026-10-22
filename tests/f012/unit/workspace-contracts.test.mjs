import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACE_CONTRACT_VERSION,
  WORKSPACE_PROFILE_VERSION,
  WORKSPACE_LIFECYCLES,
  WORKSPACE_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  READINESS_STATES,
  CREATION_INTENT_STATUSES,
  SELECTION_STATES,
  PENDING_WORK_DECISIONS,
  SAFE_REASON_CODES,
  SAFE_ACTION_CODES,
  SUPPORTED_LOCALES,
  REQUIRED_PROFILE_FIELDS,
  isValidUuidV4,
  isValidWorkspaceId,
  deriveDiscriminator,
  countUnicodeScalars,
  validateDisplayName,
  validateOptionalName,
  computeCreationRequestDigest,
  rejectProhibitedAuthority,
  validateExactKeys,
} from "../../../app/shared/workspace-contracts.ts";

test("Contract versions and closed enums are frozen and distinct", () => {
  assert.equal(WORKSPACE_CONTRACT_VERSION, 1);
  assert.equal(WORKSPACE_PROFILE_VERSION, 1);
  assert.ok(WORKSPACE_LIFECYCLES.includes("ready"));
  assert.ok(WORKSPACE_LIFECYCLES.includes("switching"));
  assert.ok(WORKSPACE_LIFECYCLES.includes("online_required"));
  assert.ok(WORKSPACE_STATUSES.includes("active"));
  assert.ok(MEMBERSHIP_ROLES.includes("owner"));
  assert.ok(MEMBERSHIP_STATUSES.includes("active"));
  assert.ok(READINESS_STATES.includes("setup_incomplete"));
  assert.ok(CREATION_INTENT_STATUSES.includes("committed"));
  assert.ok(SELECTION_STATES.includes("current"));
  assert.ok(PENDING_WORK_DECISIONS.includes("save_to_source"));
  assert.ok(SAFE_REASON_CODES.includes("stale_context"));
  assert.ok(SAFE_ACTION_CODES.includes("choose_another_workspace"));
  assert.deepEqual([...SUPPORTED_LOCALES], ["en", "ar"]);
  assert.deepEqual(
    [...REQUIRED_PROFILE_FIELDS],
    ["display_name", "legal_name", "trade_name"],
  );
});

test("Bare lowercase UUIDv4 validation vs legacy fixture ID compatibility", () => {
  const validUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  assert.equal(isValidUuidV4(validUuid), true);
  assert.equal(isValidWorkspaceId(validUuid), true);

  // Upper-case UUID is rejected as non-canonical bare lowercase
  assert.equal(isValidUuidV4(validUuid.toUpperCase()), false);
  assert.equal(isValidWorkspaceId(validUuid.toUpperCase()), false);

  // Missing dashes or UUIDv1 (non-4 version)
  assert.equal(isValidUuidV4("f47ac10b58cc4372a5670e02b2c3d479"), false);
  assert.equal(isValidUuidV4("f47ac10b-58cc-1372-a567-0e02b2c3d479"), false);

  // Legacy synthetic ID: rejected by strict isValidUuidV4 and default isValidWorkspaceId, but accepted when allowLegacy is true
  const legacyId = "ws_test_legacy_123";
  assert.equal(isValidUuidV4(legacyId), false);
  assert.equal(isValidWorkspaceId(legacyId), false);
  assert.equal(isValidWorkspaceId(legacyId, true), true);
});

test("Discriminator derivation is deterministic 4-character label", () => {
  const id1 = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  assert.equal(deriveDiscriminator(id1), "d479");

  const id2 = "11111111-2222-4333-8444-55555555abcd";
  assert.equal(deriveDiscriminator(id2), "abcd");
});

test("Unicode-scalar count handles English, Arabic, combining marks and emoji correctly", () => {
  assert.equal(countUnicodeScalars("Acme"), 4);
  assert.equal(countUnicodeScalars("ورشة"), 4);
  // Emoji with variation selector or surrogate pair
  assert.equal(countUnicodeScalars("✨"), 1);
  assert.equal(countUnicodeScalars("SoloDesk ✨"), 10);
});

test("Display name validation enforces trim, scalar bounds and prohibits control characters", () => {
  // Valid English
  const res1 = validateDisplayName("  My Workspace  ");
  assert.equal(res1.valid, true);
  assert.equal(res1.trimmed, "My Workspace");

  // Valid Arabic
  const res2 = validateDisplayName("  ورشة العمل  ");
  assert.equal(res2.valid, true);
  assert.equal(res2.trimmed, "ورشة العمل");

  // Empty after trim
  const res3 = validateDisplayName("    ");
  assert.equal(res3.valid, false);

  // Contains control character (e.g. \u0000 or \u0007 or \u001F)
  const res4 = validateDisplayName("Workspace\u0000Bad");
  assert.equal(res4.valid, false);

  // Exceeds 120 scalars
  const longName = "A".repeat(121);
  const res5 = validateDisplayName(longName);
  assert.equal(res5.valid, false);
});

test("Optional name validation enforces bounds and control character checks", () => {
  assert.equal(validateOptionalName(undefined, 200).valid, true);
  assert.equal(validateOptionalName("", 200).valid, true);
  assert.equal(validateOptionalName("   ", 200).valid, true);
  assert.equal(validateOptionalName("Acme Corp", 200).valid, true);
  assert.equal(validateOptionalName("A".repeat(201), 200).valid, false);
  assert.equal(validateOptionalName("Acme\u0007Corp", 200).valid, false);
});

test("Canonical creation request digest is stable and sensitive to semantic profile fields", () => {
  const baseReq = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    profile: {
      displayName: "Acme Studio",
      legalName: "Acme Legal Inc",
      tradeName: "Acme",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const digest1 = computeCreationRequestDigest(baseReq);
  const digest2 = computeCreationRequestDigest(baseReq);
  assert.equal(digest1, digest2);
  assert.ok(digest1.startsWith("sha256-v1:"));

  // Changing display name changes digest
  const diffDisplayName = {
    ...baseReq,
    profile: { ...baseReq.profile, displayName: "Different Name" },
  };
  assert.notEqual(computeCreationRequestDigest(diffDisplayName), digest1);

  // Changing currency changes digest
  const diffCurrency = {
    ...baseReq,
    profile: { ...baseReq.profile, defaultCurrency: "EUR" },
  };
  assert.notEqual(computeCreationRequestDigest(diffCurrency), digest1);

  // Changing policy version changes digest
  const diffPolicy = {
    ...baseReq,
    profile: { ...baseReq.profile, creationPolicyVersion: "f012_v2" },
  };
  assert.notEqual(computeCreationRequestDigest(diffPolicy), digest1);
});

test("rejectProhibitedAuthority rejects tokens, subjects, passwords, keys, paths and SQL", () => {
  assert.doesNotThrow(() => {
    rejectProhibitedAuthority({ displayName: "Acme", defaultCurrency: "USD" });
  });

  assert.throws(() => {
    rejectProhibitedAuthority({ accessToken: "secret-token" });
  }, /Forbidden authority key/);

  assert.throws(() => {
    rejectProhibitedAuthority({ profile: { dbPath: "/etc/passwd" } });
  }, /Forbidden authority key/);

  assert.throws(() => {
    rejectProhibitedAuthority({ role: "owner" });
  }, /Forbidden authority key/);

  assert.throws(() => {
    rejectProhibitedAuthority({ sql: "SELECT * FROM users" });
  }, /Forbidden authority key/);
});

test("validateExactKeys rejects unknown extra keys", () => {
  const allowed = ["displayName", "defaultCurrency"];
  assert.equal(
    validateExactKeys({ displayName: "Acme", defaultCurrency: "USD" }, allowed),
    true,
  );
  assert.equal(
    validateExactKeys(
      { displayName: "Acme", defaultCurrency: "USD", extraField: "bad" },
      allowed,
    ),
    false,
  );
});
