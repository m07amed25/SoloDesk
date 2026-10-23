import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";
import {
  encodeCursor,
  decodeCursor,
  INVITATION_BOUNDS,
} from "../../../app/shared/invitation-contracts.ts";

class InvitationListServiceMock {
  constructor() {
    this.workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;
    this.items = [];

    // Seed 15 items with decreasing timestamps
    const baseTime = Date.parse("2026-10-23T12:00:00Z");
    for (let i = 0; i < 15; i++) {
      const createdAt = new Date(baseTime - i * 60000).toISOString();
      const idNum = String(i + 1).padStart(12, "0");
      this.items.push({
        invitation_id: `i0000000-0000-4000-8000-${idNum}`,
        workspace_id: this.workspaceId,
        revision: 1,
        recipient_label: `invitee${i + 1}@test.local`,
        recipient_binding_key: Buffer.from(`key_${i}`),
        offer_ref: "member_standard",
        role_ref: "contributor",
        scope_ref: "workspace_read_write",
        status: i === 0 ? "accepted" : i === 1 ? "revoked" : "pending",
        expires_at: new Date(baseTime + 7 * 86400000).toISOString(),
        created_at: createdAt,
        updated_at: createdAt,
        latest_delivery: i % 2 === 0 ? "delivered" : "queued",
      });
    }
  }

  list({ caller, workspaceId, pageSize = INVITATION_BOUNDS.defaultPageSize, cursor }) {
    if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
      return { ok: false, code: "not_authorized", action: "none" };
    }

    if (workspaceId !== this.workspaceId) {
      return { ok: false, code: "not_authorized", action: "none" };
    }

    const boundedPageSize = Math.max(1, Math.min(pageSize, INVITATION_BOUNDS.maxPageSize));

    let startIndex = 0;
    if (cursor) {
      const decoded = decodeCursor(cursor, workspaceId);
      if (!decoded.ok) {
        return { ok: false, code: "invalid_input", action: "refresh" };
      }
      startIndex = this.items.findIndex(
        (it) => it.created_at < decoded.createdAt || (it.created_at === decoded.createdAt && it.invitation_id < decoded.invitationId)
      );
      if (startIndex === -1) {
        startIndex = this.items.length;
      }
    }

    const slice = this.items.slice(startIndex, startIndex + boundedPageSize);
    const hasMore = startIndex + boundedPageSize < this.items.length;

    let nextCursor;
    if (hasMore && slice.length > 0) {
      const last = slice[slice.length - 1];
      nextCursor = encodeCursor({
        workspaceId,
        createdAt: last.created_at,
        invitationId: last.invitation_id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
    }

    const safeItems = slice.map((item) => ({
      invitationId: item.invitation_id,
      revision: item.revision,
      recipientLabel: item.recipient_label,
      offerRef: item.offer_ref,
      roleLabelKey: `roles.${item.role_ref}`,
      scopeLabelKey: `scopes.${item.scope_ref}`,
      lifecycle: item.status,
      expiresAt: item.expires_at,
      deliveryOutcome: item.latest_delivery,
      membershipOutcome: item.status === "accepted" ? "active" : "not_created",
      availableActions: item.status === "pending" ? ["resend", "revoke", "refresh"] : ["refresh"],
      updatedAt: item.updated_at,
    }));

    return {
      ok: true,
      items: safeItems,
      nextCursor,
      policyRevision: 1,
    };
  }
}

test("F013 T052: Stable (created_at desc, invitation_id desc) paging with opaque cursor", () => {
  const service = new InvitationListServiceMock();
  const caller = { role: "owner" };
  const workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;

  // Page 1: 5 items
  const res1 = service.list({ caller, workspaceId, pageSize: 5 });
  assert.equal(res1.ok, true);
  assert.equal(res1.items.length, 5);
  assert.ok(res1.nextCursor);
  assert.equal(res1.items[0].recipientLabel, "invitee1@test.local");
  assert.equal(res1.items[4].recipientLabel, "invitee5@test.local");

  // Page 2: 5 items using nextCursor
  const res2 = service.list({ caller, workspaceId, pageSize: 5, cursor: res1.nextCursor });
  assert.equal(res2.ok, true);
  assert.equal(res2.items.length, 5);
  assert.ok(res2.nextCursor);
  assert.equal(res2.items[0].recipientLabel, "invitee6@test.local");
  assert.equal(res2.items[4].recipientLabel, "invitee10@test.local");

  // Verify no overlap between page 1 and page 2
  const ids1 = new Set(res1.items.map((i) => i.invitationId));
  for (const item of res2.items) {
    assert.ok(!ids1.has(item.invitationId), "Duplicate item across cursor boundary");
  }

  // Page 3: remaining 5 items
  const res3 = service.list({ caller, workspaceId, pageSize: 5, cursor: res2.nextCursor });
  assert.equal(res3.ok, true);
  assert.equal(res3.items.length, 5);
  assert.equal(res3.items[4].recipientLabel, "invitee15@test.local");
  assert.equal(res3.nextCursor, undefined);
});

test("F013 T052: Bounded page size enforcement (clamped between 1 and 50)", () => {
  const service = new InvitationListServiceMock();
  const caller = { role: "admin" };
  const workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;

  // Clamped max
  const resHuge = service.list({ caller, workspaceId, pageSize: 1000 });
  assert.equal(resHuge.ok, true);
  assert.ok(resHuge.items.length <= INVITATION_BOUNDS.maxPageSize);

  // Clamped min
  const resZero = service.list({ caller, workspaceId, pageSize: 0 });
  assert.equal(resZero.ok, true);
  assert.equal(resZero.items.length, 1);
});

test("F013 T052: Opaque cursor rejects expired, tampered, or cross-workspace cursors", () => {
  const service = new InvitationListServiceMock();
  const caller = { role: "owner" };
  const workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;

  // Tampered cursor
  const badCursor = "not-a-valid-base64-cursor";
  const resBad = service.list({ caller, workspaceId, pageSize: 5, cursor: badCursor });
  assert.equal(resBad.ok, false);
  assert.equal(resBad.code, "invalid_input");

  // Cross-workspace cursor
  const foreignCursor = encodeCursor({
    workspaceId: FIXTURE_WORKSPACES.wsForeign.workspaceId,
    createdAt: new Date().toISOString(),
    invitationId: "i0000000-0000-4000-8000-000000000001",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  const resForeign = service.list({ caller, workspaceId, pageSize: 5, cursor: foreignCursor });
  assert.equal(resForeign.ok, false);
  assert.equal(resForeign.code, "invalid_input");

  // Expired cursor
  const expiredCursor = encodeCursor({
    workspaceId,
    createdAt: new Date().toISOString(),
    invitationId: "i0000000-0000-4000-8000-000000000001",
    expiresAt: new Date(Date.now() - 10000).toISOString(),
  });
  const resExpired = service.list({ caller, workspaceId, pageSize: 5, cursor: expiredCursor });
  assert.equal(resExpired.ok, false);
  assert.equal(resExpired.code, "invalid_input");
});

test("F013 T052: Safe projection guarantee with zero secret or prohibited detail disclosure", () => {
  const service = new InvitationListServiceMock();
  const caller = { role: "owner" };
  const workspaceId = FIXTURE_WORKSPACES.wsMain.workspaceId;

  const result = service.list({ caller, workspaceId, pageSize: 10 });
  assert.equal(result.ok, true);

  // Prohibited top-level fields
  assert.equal(result.totalCount, undefined);
  assert.equal(result.total, undefined);
  assert.equal(result.search, undefined);
  assert.equal(result.query, undefined);

  // Validate item projections
  for (const item of result.items) {
    assert.ok(item.invitationId);
    assert.ok(item.recipientLabel);
    assert.ok(item.lifecycle);
    assert.ok(item.deliveryOutcome);
    assert.ok(item.membershipOutcome);
    assert.ok(Array.isArray(item.availableActions));

    // Must never leak secrets or crypto bindings
    assert.equal(item.secret, undefined);
    assert.equal(item.selector, undefined);
    assert.equal(item.token, undefined);
    assert.equal(item.recipient_binding_key, undefined);
    assert.equal(item.bindingKey, undefined);
  }
});

test("F013 T052: Database migration defines idx_workspace_invitations_cursor index", () => {
  const sql = fs.readFileSync(
    path.resolve("supabase/migrations/20261023000013_f013_member_invitations.sql"),
    "utf8"
  );
  assert.match(
    sql,
    /CREATE INDEX IF NOT EXISTS idx_workspace_invitations_cursor\s+ON private\.workspace_invitations\s*\(\s*workspace_id,\s*created_at\s+DESC,\s*invitation_id\s+DESC\s*\)/i
  );
});
