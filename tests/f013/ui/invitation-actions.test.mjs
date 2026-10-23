import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import { FIXTURE_INVITATIONS } from "../fixtures/invitation-fixtures.mjs";

describe("T045: Resend/Revoke Administration UI and Truthful Actions", () => {
  it("enforces availableActions gating: resend/revoke permitted only on pending invitations", () => {
    const pendingInv = FIXTURE_INVITATIONS.pending;
    const acceptedInv = FIXTURE_INVITATIONS.accepted;
    const revokedInv = FIXTURE_INVITATIONS.revoked;
    const expiredInv = FIXTURE_INVITATIONS.expired;

    assert.ok(pendingInv.availableActions.includes("resend"));
    assert.ok(pendingInv.availableActions.includes("revoke"));

    // Terminal invitations must never allow resend or revoke mutations
    assert.ok(!acceptedInv.availableActions.includes("resend"));
    assert.ok(!acceptedInv.availableActions.includes("revoke"));

    assert.ok(!revokedInv.availableActions.includes("resend"));
    assert.ok(!revokedInv.availableActions.includes("revoke"));

    assert.ok(!expiredInv.availableActions.includes("resend"));
    assert.ok(!expiredInv.availableActions.includes("revoke"));
  });

  it("warns about prior generation invalidation for resend and permanent cancellation for revoke", () => {
    const resendNoticeEn = en["invitation.action.resendNotice"];
    const revokeNoticeEn = en["invitation.action.revokeNotice"];

    assert.ok(resendNoticeEn.includes("creates a new acceptance link and invalidates all earlier links"));
    assert.ok(revokeNoticeEn.includes("permanently invalidates all acceptance links"));

    const resendNoticeAr = ar["invitation.action.resendNotice"];
    const revokeNoticeAr = ar["invitation.action.revokeNotice"];

    assert.ok(resendNoticeAr.includes("إنشاء رابط قبول جديد"));
    assert.ok(revokeNoticeAr.includes("يبطل جميع روابط القبول"));
  });

  it("never claims resend means delivered or accepted", () => {
    const resendAction = en["invitation.action.resend"];
    const queuedStatus = en["invitation.status.queued"];

    assert.equal(resendAction, "Resend Invitation");
    assert.ok(!queuedStatus.toLowerCase().includes("delivered"));
    assert.ok(!queuedStatus.toLowerCase().includes("accepted"));
  });

  it("renders distinct status for failed, bounced, or unknown delivery with recovery action", () => {
    const failedStatus = en["invitation.status.failed"];
    const unknownStatus = en["invitation.status.unknown"];
    const reconcileAction = en["invitation.action.reconcile"];
    const refreshAction = en["invitation.action.refresh"];

    assert.equal(failedStatus, "Delivery Failed");
    assert.equal(unknownStatus, "Delivery Unknown");
    assert.ok(reconcileAction.length > 0);
    assert.ok(refreshAction.length > 0);
  });

  it("maintains bilingual parity and Arabic script for all actions and delivery statuses", () => {
    const actionKeys = [
      "invitation.action.resend",
      "invitation.action.revoke",
      "invitation.action.confirmRevoke",
      "invitation.action.revokeNotice",
      "invitation.action.resendNotice",
      "invitation.status.delivered",
      "invitation.status.queued",
      "invitation.status.failed",
      "invitation.status.bounced",
      "invitation.status.unknown",
    ];

    const arabicRegex = /[\u0600-\u06FF]/;
    for (const key of actionKeys) {
      assert.ok(en[key], `en missing ${key}`);
      assert.ok(ar[key], `ar missing ${key}`);
      assert.ok(arabicRegex.test(ar[key]), `ar[${key}] must contain authentic Arabic characters`);
    }
  });
});
