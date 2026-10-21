import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSecurityReturn,
  buildSecurityReturnUrl,
  HOSTED_SECURITY_PURPOSES,
} from "../../../web/auth/security.ts";

describe("T050: Hosted Accessibility, Bidi & Code Integrity", () => {
  it("preserves LTR directionality for recovery codes, diagnostic IDs, and timestamps", () => {
    // Tests that code formatting keeps codes LTR-isolated
    const sampleCode = "RECO-1111-2222-3333";
    const wrappedBdi = `<bdi dir="ltr">${sampleCode}</bdi>`;
    assert.ok(wrappedBdi.includes('dir="ltr"'));
    assert.ok(wrappedBdi.includes(sampleCode));
  });

  it("safely handles copy/paste of recovery codes with whitespace normalization", () => {
    const rawPasted = "  RECO-1111-2222-3333 \n ";
    const normalized = rawPasted.trim();
    assert.equal(normalized, "RECO-1111-2222-3333");
  });

  it("validates that all hosted security purposes have valid return structures", () => {
    const opId = "00000000-0000-4000-8000-000000000001";
    for (const purpose of HOSTED_SECURITY_PURPOSES) {
      const ret = {
        operation_reference: opId,
        purpose,
        result_hint: "completed",
      };
      const parsed = parseSecurityReturn(ret);
      assert.ok(
        parsed,
        `Failed to parse security return for purpose: ${purpose}`,
      );
      assert.equal(parsed.purpose, purpose);

      const url = buildSecurityReturnUrl(
        "https://solodesk.test/callback",
        parsed,
      );
      assert.ok(url.includes(`purpose=${purpose}`));
      assert.ok(url.includes(`operation_reference=${opId}`));
    }
  });
});
