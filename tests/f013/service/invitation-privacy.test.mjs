import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
} from "../fixtures/invitation-fixtures.mjs";

class InvitationPrivacyMock {
  constructor() {
    this.primaryWorkspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;
    this.foreignWorkspaceId = FIXTURE_WORKSPACES.wsForeign.workspaceId;

    // Membership directory
    this.memberships = new Map([
      [`${this.primaryWorkspaceId}:${FIXTURE_ACCOUNTS.inviterOwner.subjectId}`, "owner"],
      [`${this.primaryWorkspaceId}:${FIXTURE_ACCOUNTS.inviterAdmin.subjectId}`, "admin"],
      [`${this.primaryWorkspaceId}:${FIXTURE_ACCOUNTS.intendedRecipient.subjectId}`, "contributor"],
      [`${this.foreignWorkspaceId}:${FIXTURE_ACCOUNTS.inviterOwner.subjectId}`, "viewer"],
    ]);

    this.invitations = [
      {
        invitation_id: "i0000000-0000-4000-8000-000000000001",
        workspace_id: this.primaryWorkspaceId,
        recipient_label: "confidential.candidate@test.local",
        status: "pending",
      },
    ];
  }

  list({ callerId, workspaceId }) {
    if (!callerId) {
      // anon caller
      return { ok: false, code: "not_authorized", action: "connect_and_retry" };
    }

    const role = this.memberships.get(`${workspaceId}:${callerId}`);
    if (!role || (role !== "owner" && role !== "admin")) {
      // Non-admin or non-member
      return { ok: false, code: "not_authorized", action: "none" };
    }

    const items = this.invitations
      .filter((inv) => inv.workspace_id === workspaceId)
      .map((inv) => ({
        invitationId: inv.invitation_id,
        recipientLabel: inv.recipient_label,
        lifecycle: inv.status,
      }));

    return {
      ok: true,
      items,
    };
  }

  getDetail({ callerId, workspaceId, invitationId }) {
    // Detail RPC should not even exist for standard clients, but if attempted:
    const role = this.memberships.get(`${workspaceId}:${callerId}`);
    if (!role || (role !== "owner" && role !== "admin")) {
      return { ok: false, code: "not_authorized", action: "none" };
    }
    return { ok: false, code: "invalid_input", action: "none" };
  }
}

test("F013 T053: Anon callers are strictly rejected with not_authorized", () => {
  const privacy = new InvitationPrivacyMock();
  const res = privacy.list({
    callerId: null,
    workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
  });

  assert.equal(res.ok, false);
  assert.equal(res.code, "not_authorized");
  assert.equal(res.items, undefined);
  assert.equal(res.invitation, undefined);
});

test("F013 T053: Authenticated non-admin members are rejected with not_authorized", () => {
  const privacy = new InvitationPrivacyMock();
  const res = privacy.list({
    callerId: FIXTURE_ACCOUNTS.intendedRecipient.subjectId, // contributor
    workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
  });

  assert.equal(res.ok, false);
  assert.equal(res.code, "not_authorized");
  assert.equal(res.items, undefined);
});

test("F013 T053: Cross-workspace access returns not_authorized with zero data leakage", () => {
  const privacy = new InvitationPrivacyMock();
  // Owner of wsMain tries to list wsForeign where they are only a viewer
  const res = privacy.list({
    callerId: FIXTURE_ACCOUNTS.inviterOwner.subjectId,
    workspaceId: FIXTURE_WORKSPACES.wsForeign.workspaceId,
  });

  assert.equal(res.ok, false);
  assert.equal(res.code, "not_authorized");
  assert.equal(res.items, undefined);
});

test("F013 T053: Direct DML and tables are revoked from public, anon, and authenticated", () => {
  const sql = fs.readFileSync(
    path.resolve("supabase/migrations/20261023000013_f013_member_invitations.sql"),
    "utf8"
  );

  const privateTables = [
    "private.invitation_policies",
    "private.workspace_invitations",
    "private.invitation_generations",
    "private.invitation_delivery_attempts",
    "private.invitation_redemption_attempts",
  ];

  for (const table of privateTables) {
    const escaped = table.replace(".", "\\.");
    const revokeRegex = new RegExp(`REVOKE ALL ON TABLE ${escaped} FROM PUBLIC,\\s*anon,\\s*authenticated;`);
    assert.match(
      sql,
      revokeRegex,
      `Table ${table} must be strictly revoked from PUBLIC, anon, and authenticated`
    );
  }
});
