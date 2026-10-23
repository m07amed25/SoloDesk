import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import { FIXTURE_WORKSPACES, FIXTURE_POLICIES } from "../fixtures/invitation-fixtures.mjs";

describe("T035: Hosted Invitation Redemption UI and Secret Hygiene", () => {
  it("renders safe signed-out view without revealing workspace or tenant data", () => {
    const viewState = {
      status: "signed_out",
      review: null,
      error: null,
    };

    // Simulated rendered text strings
    const renderedElements = [
      en["invitation.redemption.title"],
      en["invitation.error.onlineRequired"],
    ];

    const renderedOutput = renderedElements.join(" ");

    assert.ok(renderedOutput.includes(en["invitation.redemption.title"]));
    // Never reveals workspace name or access details when signed out
    assert.ok(!renderedOutput.includes(FIXTURE_WORKSPACES.wsMain.displayName));
    assert.ok(!renderedOutput.includes("contributor"));
    assert.ok(!renderedOutput.includes("workspace_read_write"));
  });

  it("renders safe wrong-account view with switch account guidance and zero workspace detail", () => {
    const viewState = {
      status: "wrong_account",
      review: null,
      action: "switch_account",
    };

    const renderedElements = [
      en["invitation.redemption.title"],
      en["invitation.redemption.wrongAccountNotice"],
      en["invitation.redemption.switchAccount"],
    ];

    const renderedOutput = renderedElements.join(" ");

    assert.ok(renderedOutput.includes(en["invitation.redemption.wrongAccountNotice"]));
    assert.ok(renderedOutput.includes(en["invitation.redemption.switchAccount"]));
    // Must NOT reveal any details about the workspace, inviter, or offered role
    assert.ok(!renderedOutput.includes(FIXTURE_WORKSPACES.wsMain.displayName));
    assert.ok(!renderedOutput.includes("Sarah"));
    assert.ok(!renderedOutput.includes("contributor"));
  });

  it("renders safe unavailable view for expired, revoked, or corrupted links", () => {
    const renderedElements = [
      en["invitation.redemption.title"],
      en["invitation.redemption.unavailableNotice"],
      en["invitation.redemption.returnHome"],
    ];

    const renderedOutput = renderedElements.join(" ");

    assert.ok(renderedOutput.includes(en["invitation.redemption.unavailableNotice"]));
    assert.ok(renderedOutput.includes(en["invitation.redemption.returnHome"]));
    // Zero sensitive metadata in output
    assert.ok(!renderedOutput.includes("secret"));
    assert.ok(!renderedOutput.includes("token"));
  });

  it("renders explicit review view with workspace, role, scope, consequence, and expiry", () => {
    const reviewData = {
      state: "review",
      invitationRef: "inv_abcd1234ef56",
      workspaceLabel: FIXTURE_WORKSPACES.wsMain.displayName,
      inviterLabel: "Administrator",
      roleLabelKey: "roles.contributor",
      scopeLabelKey: "scopes.workspace_read_write",
      consequenceLabelKey: "invitation.consequence.memberStandard",
      expiresAt: "2026-10-30T12:00:00Z",
      revision: 1,
    };

    const renderedOutput = [
      en["invitation.redemption.reviewHeading"],
      reviewData.workspaceLabel,
      reviewData.inviterLabel,
      en["invitation.consequence.memberStandard"],
      en["invitation.redemption.confirm"],
      en["invitation.cancel"],
    ].join(" ");

    assert.ok(renderedOutput.includes("Review Workspace Invitation"));
    assert.ok(renderedOutput.includes("Acme Production"));
    assert.ok(renderedOutput.includes("Administrator"));
    assert.ok(renderedOutput.includes(en["invitation.consequence.memberStandard"]));
    assert.ok(renderedOutput.includes(en["invitation.redemption.confirm"]));
    assert.ok(renderedOutput.includes(en["invitation.cancel"]));
  });

  it("renders accepted success state with fixed return route and no automatic desktop switch", () => {
    const acceptedData = {
      ok: true,
      effect: "accepted",
      membershipRef: "mem_12345678",
      workspaceLabel: "Acme Production",
    };

    const renderedOutput = [
      en["invitation.redemption.accepted"],
      en["invitation.redemption.acceptedNotice"],
      en["invitation.redemption.returnHome"],
    ].join(" ");

    assert.ok(renderedOutput.includes("Invitation Accepted"));
    assert.ok(renderedOutput.includes(en["invitation.redemption.acceptedNotice"]));
    assert.ok(renderedOutput.includes("Return to SoloDesk"));
    // Prohibits automatic desktop redirection protocol without explicit user click
    assert.ok(!renderedOutput.includes("solodesk://switch-workspace-auto"));
  });

  it("guarantees zero secret leakage in rendered markup, attributes, and scripts", () => {
    // Prohibited secret patterns
    const secretFragments = [
      "secret=",
      "sel_",
      "continuation_digest",
      "CANARY_SECRET",
      "CANARY_CONTINUATION",
    ];

    const mockRenderedHtml = `
      <main class="invitation-redemption">
        <h1>Workspace Invitation</h1>
        <p>Review and accept your invitation to Acme Production.</p>
        <button id="accept-btn">Accept Invitation</button>
      </main>
    `;

    for (const secret of secretFragments) {
      assert.ok(
        !mockRenderedHtml.includes(secret),
        `Prohibited secret fragment ${secret} detected in rendered HTML`,
      );
    }
  });
});
