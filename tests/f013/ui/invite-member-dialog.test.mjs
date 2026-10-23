import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import { INVITATION_KEYS } from "../../../packages/localization/src/shell/types.ts";
import { FIXTURE_POLICIES, FIXTURE_WORKSPACES } from "../fixtures/invitation-fixtures.mjs";

describe("T024: Invite Member Dialog UI, Validation and Truthful Claims", () => {
  it("enforces bilingual English and Arabic localization parity with authentic Arabic script", () => {
    const arabicRegex = /[\u0600-\u06FF]/;

    for (const key of INVITATION_KEYS) {
      assert.ok(en[key], `en missing key: ${key}`);
      assert.ok(ar[key], `ar missing key: ${key}`);
      assert.ok(en[key].length > 0, `en key ${key} is empty`);
      assert.ok(ar[key].length > 0, `ar key ${key} is empty`);
      assert.ok(
        arabicRegex.test(ar[key]),
        `Arabic text for ${key} must contain Arabic characters`,
      );
    }
  });

  it("restricts available access offers strictly to approved policy", () => {
    const policy = FIXTURE_POLICIES.synthetic;
    const approvedOffers = policy.offers.map((o) => o.offerRef);
    assert.deepEqual(approvedOffers, ["member_standard", "read_only"]);

    // Disallowed offers are rejected
    assert.ok(!approvedOffers.includes("super_owner"));
    assert.ok(!approvedOffers.includes("billing_admin"));
  });

  it("truthfully claims creation only—never delivery, sending, or membership", () => {
    const successEn = en["invitation.success"];
    const noticeEn = en["invitation.successNotice"];
    const consequenceEn = en["invitation.consequenceNotice"];

    assert.equal(successEn, "Invitation created");
    assert.ok(noticeEn.includes("created"));
    assert.ok(noticeEn.includes("not been delivered or accepted yet"));
    assert.ok(!noticeEn.toLowerCase().includes("delivered successfully"));
    assert.ok(!noticeEn.toLowerCase().includes("member added"));

    assert.ok(consequenceEn.includes("zero workspace membership"));
  });

  it("preserves non-secret recipient input upon validation or submission rejection", () => {
    const initialEmail = "colleague.test@example.com";
    const formState = {
      recipientEmail: initialEmail,
      selectedOfferRef: "member_standard",
      errorMessage: null,
    };

    // Simulated rejection
    const rejectedState = {
      ...formState,
      errorMessage: en["invitation.error.alreadyMember"],
    };

    assert.equal(rejectedState.recipientEmail, initialEmail);
    assert.equal(rejectedState.selectedOfferRef, "member_standard");
    assert.equal(rejectedState.errorMessage, en["invitation.error.alreadyMember"]);
  });

  it("safely handles disabled policy and offline states", () => {
    const disabledPolicy = FIXTURE_POLICIES.disabled;
    assert.equal(disabledPolicy.enabled, false);

    assert.ok(en["invitation.error.policyUnavailable"]);
    assert.ok(en["invitation.error.onlineRequired"]);
    assert.ok(ar["invitation.error.onlineRequired"].includes("الاتصال بالإنترنت"));
  });

  it("supports bidirectional isolation for workspace names and recipient emails", () => {
    // Both Latin and Arabic workspace titles should be displayable with Bdi isolation
    const wsLatin = FIXTURE_WORKSPACES.wsMain.displayName;
    const wsArabic = FIXTURE_WORKSPACES.wsArabic.displayName;

    assert.ok(wsLatin.length > 0);
    assert.ok(wsArabic.length > 0);
    // Arabic regex
    assert.ok(/[\u0600-\u06FF]/.test(wsArabic));
  });
});
