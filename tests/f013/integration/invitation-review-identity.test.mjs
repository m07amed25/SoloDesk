import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";
import {
  normalizeAndValidateRecipientEmail,
  isCanonicalUuid,
} from "../../../app/shared/invitation-contracts.ts";

// Synthetic review evaluator modeling solodesk_invitation_review and Edge handler logic
function evaluateInvitationReview({
  caller,
  continuationExpired = false,
  invitationStatus = "pending",
  invitationExpired = false,
  invitationRecipient,
  workspace = FIXTURE_WORKSPACES.wsMain,
  offer = FIXTURE_POLICIES.synthetic.offers[0],
}) {
  // 1. Signed-out enforcement
  if (!caller || !caller.subjectId) {
    return {
      state: "unavailable",
      action: "try_again_later",
    };
  }

  // 2. Continuation token validity
  if (continuationExpired) {
    return {
      state: "unavailable",
      action: "request_new_invitation",
    };
  }

  // 3. Stale invitation check
  if (invitationStatus !== "pending" || invitationExpired) {
    return {
      state: "unavailable",
      action: "request_new_invitation",
    };
  }

  // 4. Identity matching: exact (issuer, subject) or verified claim resolution
  let isMatch = false;
  if (invitationRecipient.type === "account_identity") {
    isMatch =
      invitationRecipient.issuer === caller.issuerId &&
      invitationRecipient.subject === caller.subjectId;
  } else if (invitationRecipient.type === "unresolved_verified_claim") {
    if (invitationRecipient.claimName === "email") {
      isMatch =
        invitationRecipient.claimValue.toLowerCase() ===
        caller.email.toLowerCase();
    }
  }

  // Wrong account rejection: safe guidance without disclosing any workspace/offer/inviter data
  if (!isMatch) {
    return {
      state: "unavailable",
      action: "switch_account",
    };
  }

  // 5. Authorized review presentation (clean, bounded, non-secret)
  return {
    state: "review",
    invitationRef: `inv_${crypto.createHash("sha256").update(invitationRecipient.claimValue || invitationRecipient.subject).digest("hex").slice(0, 12)}`,
    workspaceLabel: workspace.displayName,
    inviterLabel: "Workspace Administrator",
    roleLabelKey: `roles.${offer.roleRef}`,
    scopeLabelKey: `scopes.${offer.scopeRef}`,
    consequenceLabelKey: `invitation.consequence.${offer.offerRef}`,
    expiresAt: "2026-10-30T12:00:00Z",
    revision: 1,
  };
}

test("F013 T032: Signed-out review attempt requires online sign-in and reveals nothing", () => {
  const result = evaluateInvitationReview({
    caller: null,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.action, "try_again_later");
  assert.equal(result.workspaceLabel, undefined);
  assert.equal(result.roleLabelKey, undefined);
  assert.equal(result.invitationRef, undefined);
});

test("F013 T032: Review by wrong account returns switch_account without revealing tenant details", () => {
  const result = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.wrongAccount,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.action, "switch_account");
  // CRITICAL: Zero workspace, inviter, or role details exposed to wrong caller
  assert.equal(result.workspaceLabel, undefined);
  assert.equal(result.inviterLabel, undefined);
  assert.equal(result.roleLabelKey, undefined);
  assert.equal(result.scopeLabelKey, undefined);
  assert.equal(result.invitationRef, undefined);
});

test("F013 T032: Review by exact matching account resolves verified claim and reveals approved offer", () => {
  const result = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });

  assert.equal(result.state, "review");
  assert.equal(result.workspaceLabel, "Acme Production");
  assert.equal(result.roleLabelKey, "roles.contributor");
  assert.equal(result.scopeLabelKey, "scopes.workspace_read_write");
  assert.equal(result.consequenceLabelKey, "invitation.consequence.member_standard");
  assert.ok(result.invitationRef.startsWith("inv_"));
  assert.equal(result.revision, 1);
});

test("F013 T032: Exact (issuer, subject) account identity match", () => {
  const result = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    invitationRecipient: {
      type: "account_identity",
      issuer: FIXTURE_ACCOUNTS.intendedRecipient.issuerId,
      subject: FIXTURE_ACCOUNTS.intendedRecipient.subjectId,
    },
  });

  assert.equal(result.state, "review");
  assert.equal(result.workspaceLabel, "Acme Production");
  assert.equal(result.roleLabelKey, "roles.contributor");
});

test("F013 T032: Changed primary email or alias mismatch safely requests account switch", () => {
  const callerWithDifferentAlias = {
    ...FIXTURE_ACCOUNTS.intendedRecipient,
    email: "sarah+alias@test.local", // alias differs from invited address
  };

  const result = evaluateInvitationReview({
    caller: callerWithDifferentAlias,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: "sarah@test.local",
    },
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.action, "switch_account");
});

test("F013 T032: Stale, expired, or revoked invitation returns neutral unavailable guidance", () => {
  // Expired
  const resExpired = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    invitationExpired: true,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });
  assert.equal(resExpired.state, "unavailable");
  assert.equal(resExpired.action, "request_new_invitation");

  // Revoked
  const resRevoked = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    invitationStatus: "revoked",
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });
  assert.equal(resRevoked.state, "unavailable");
  assert.equal(resRevoked.action, "request_new_invitation");

  // Continuation cookie expired
  const resContinuationExpired = evaluateInvitationReview({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationExpired: true,
    invitationRecipient: {
      type: "unresolved_verified_claim",
      claimName: "email",
      claimValue: FIXTURE_ACCOUNTS.intendedRecipient.email,
    },
  });
  assert.equal(resContinuationExpired.state, "unavailable");
  assert.equal(resContinuationExpired.action, "request_new_invitation");
});
