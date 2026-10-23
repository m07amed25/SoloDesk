import test from "node:test";
import assert from "node:assert/strict";
import {
  projectCommandAudit,
  isSensitiveKey,
} from "../../../supabase/functions/_shared/audit-projectors.ts";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
} from "../fixtures/invitation-fixtures.mjs";

test("F013 T054: Invitation command audit projectors produce safe allowlisted summaries", () => {
  const operations = [
    {
      op: "invitation.create",
      payload: {
        invitationId: "i0000000-0000-4000-8000-000000000001",
        workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
        recipientLabel: "sarah.invitee@test.local",
        offerRef: "member_standard",
        policyRevision: 1,
        // Sensitive canary fields that must never appear in evidence summary:
        secret: "super_secret_raw_token_value_32_bytes",
        selector: "sel_11111111111111111111111111111111",
        url: "https://solodesk.app/invite#token=secret",
        recipientEmail: "sarah.invitee@test.local",
        emailEncryptionKey: "enc_key_123",
      },
      target: {
        kind: "invitation",
        id: "i0000000-0000-4000-8000-000000000001",
      },
    },
    {
      op: "invitation.resend",
      payload: {
        invitationId: "i0000000-0000-4000-8000-000000000001",
        workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
        expectedRevision: 1,
        newGenerationNumber: 2,
        secret: "secret_generation_2",
      },
      target: {
        kind: "invitation",
        id: "i0000000-0000-4000-8000-000000000001",
      },
    },
    {
      op: "invitation.revoke",
      payload: {
        invitationId: "i0000000-0000-4000-8000-000000000001",
        workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
        expectedRevision: 2,
        terminalOutcome: "revoked",
      },
      target: {
        kind: "invitation",
        id: "i0000000-0000-4000-8000-000000000001",
      },
    },
    {
      op: "invitation.accept",
      payload: {
        invitationId: "i0000000-0000-4000-8000-000000000001",
        workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
        membershipId: "m0000000-0000-4000-8000-000000000001",
        continuationToken: "cont_secret_token",
      },
      target: {
        kind: "invitation",
        id: "i0000000-0000-4000-8000-000000000001",
      },
    },
  ];

  for (const { op, payload, target } of operations) {
    const projection = projectCommandAudit(op, payload, target);
    assert.ok(projection, `Projection must exist for ${op}`);
    assert.ok(projection.summary_kind, `summary_kind required for ${op}`);
    assert.equal(projection.summary_version, 1);

    const summary = projection.summary;
    assert.ok(typeof summary === "object" && summary !== null);

    // Guaranteed absence of prohibited strings
    const summaryStr = JSON.stringify(summary);
    assert.ok(!summaryStr.includes("super_secret"), `Secret leaked in ${op}`);
    assert.ok(!summaryStr.includes("https://solodesk.app/invite"), `URL leaked in ${op}`);
    assert.ok(!summaryStr.includes("cont_secret_token"), `Continuation token leaked in ${op}`);

    // Verify key safety
    for (const key of Object.keys(summary)) {
      assert.ok(!isSensitiveKey(key), `Sensitive key ${key} found in summary for ${op}`);
    }
  }
});

test("F013 T054: Delivery status callback event projection redacts raw provider payload", () => {
  const payload = {
    deliveryStatus: "failed",
    attemptNumber: 1,
    providerDigest: "sha256:abc123",
    rawWebhookPayload: { headers: { "X-Api-Key": "secret" }, body: "smtp failed 550" },
  };

  const projection = projectCommandAudit("invitation.delivery_status", payload, {
    kind: "invitation_delivery",
    id: "d0000000-0000-4000-8000-000000000001",
  });

  const summary = projection.summary;
  assert.equal(summary.rawWebhookPayload, undefined);
  assert.equal(summary.headers, undefined);
  const json = JSON.stringify(summary);
  assert.ok(!json.includes("secret"));
});
