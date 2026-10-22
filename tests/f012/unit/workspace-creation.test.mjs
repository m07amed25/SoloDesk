import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCreationRequestDigest,
  validateDisplayName,
  validateOptionalName,
  isValidUuidV4,
} from "../../../app/shared/workspace-contracts.ts";

test("Creation request digest covers exact semantic fields", () => {
  const req = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    profile: {
      displayName: "My Studio",
      legalName: "My Studio LLC",
      tradeName: "Studio",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const digest = computeCreationRequestDigest(req);
  assert.ok(digest.startsWith("sha256-v1:"));

  // Changing transport correlation does not affect digest
  const reqWithTransport = { ...req, correlationId: "extra-transport-value" };
  assert.equal(computeCreationRequestDigest(reqWithTransport), digest);

  // Changing device enrollment id changes digest
  const reqDiffDevice = {
    ...req,
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000002",
  };
  assert.notEqual(computeCreationRequestDigest(reqDiffDevice), digest);

  // Changing policy version changes digest
  const reqDiffPolicy = {
    ...req,
    profile: { ...req.profile, creationPolicyVersion: "f012_v2" },
  };
  assert.notEqual(computeCreationRequestDigest(reqDiffPolicy), digest);
});

test("Display name trim preserves internal text without normalization", () => {
  const raw = "   Acme   Studio   ";
  const res = validateDisplayName(raw);
  assert.equal(res.valid, true);
  assert.equal(res.trimmed, "Acme   Studio");
});

test("Arabic and mixed-direction names with emoji pass validation", () => {
  const arabic = "  مكتب الاستشارات الهندسية  ";
  const resArabic = validateDisplayName(arabic);
  assert.equal(resArabic.valid, true);
  assert.equal(resArabic.trimmed, "مكتب الاستشارات الهندسية");

  const mixed = "  SoloDesk ✨ حلول المكتب  ";
  const resMixed = validateDisplayName(mixed);
  assert.equal(resMixed.valid, true);
  assert.equal(resMixed.trimmed, "SoloDesk ✨ حلول المكتب");
});

test("Max scalar bounds and control character rejection", () => {
  // 120 scalars is max
  const maxName = "A".repeat(120);
  assert.equal(validateDisplayName(maxName).valid, true);

  // 121 scalars fails
  const overMaxName = "A".repeat(121);
  assert.equal(validateDisplayName(overMaxName).valid, false);

  // Control characters fail
  assert.equal(validateDisplayName("Hello\nWorld").valid, false);
  assert.equal(validateDisplayName("Hello\tWorld").valid, false);
  assert.equal(validateDisplayName("Hello\rWorld").valid, false);
});

test("Legal and trade names enforce optional bounds", () => {
  assert.equal(validateOptionalName(undefined, 200).valid, true);
  assert.equal(validateOptionalName("  ", 200).valid, true);
  assert.equal(validateOptionalName("B".repeat(200), 200).valid, true);
  assert.equal(validateOptionalName("B".repeat(201), 200).valid, false);
});
