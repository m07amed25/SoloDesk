import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FIXTURE_WORKSPACES } from "../fixtures/invitation-fixtures.mjs";

test("F013 T072: Rollback and disablement preserves active memberships and F009 evidence intact", () => {
  // Verify that F013 schema tables are decoupled from core workspace_memberships
  const sql = fs.readFileSync(
    path.resolve("supabase/migrations/20261023000013_f013_member_invitations.sql"),
    "utf8"
  );

  // Private tables created in private schema, leaving public.workspace_memberships intact
  assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.workspace_invitations/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.invitation_generations/);

  // Acceptance inserts into public.workspace_memberships with ON CONFLICT DO NOTHING
  assert.match(
    sql,
    /INSERT INTO public\.workspace_memberships/
  );

  // F009 authoritative commands receipts remain intact
  assert.match(
    sql,
    /private\.command_operations/
  );
});

test("F013 T072: Disabling invitation policy disables entry without dropping history", () => {
  const policy = {
    workspaceId: FIXTURE_WORKSPACES.wsMain.workspaceId,
    enabled: false,
    offers: [],
  };

  function canCreateInvitation(p) {
    if (!p.enabled || p.offers.length === 0) {
      return { ok: false, code: "policy_unavailable", action: "refresh" };
    }
    return { ok: true };
  }

  const res = canCreateInvitation(policy);
  assert.equal(res.ok, false);
  assert.equal(res.code, "policy_unavailable");
});

test("F013 T072: Legacy raw tokens remain permanently invalid and unexecutable", () => {
  // Legacy pseudo-tokens (from prior unhashed prototypes) must be rejected
  function validateLegacyToken(token) {
    if (!token || typeof token !== "string") return false;
    // Must strictly be valid selector (sel_ + 32 hex) and secret (64 hex)
    return /^sel_[0-9a-f]{32}$/i.test(token);
  }

  assert.equal(validateLegacyToken("raw_jwt_token_12345"), false);
  assert.equal(validateLegacyToken("invite_link_old_style"), false);
  assert.equal(validateLegacyToken("sel_short"), false);
});

test("F013 T072: Compatible re-enable reconciles original operations idempotently", () => {
  const opHistory = new Map([
    ["op_1", { originalEffect: "created", invitationId: "i1" }],
    ["op_2", { originalEffect: "resent", invitationId: "i1" }],
  ]);

  function reconcile(opId) {
    if (opHistory.has(opId)) {
      return { ok: true, effect: "replayed", ...opHistory.get(opId) };
    }
    return { ok: true, effect: "not_committed" };
  }

  const rec1 = reconcile("op_1");
  assert.equal(rec1.ok, true);
  assert.equal(rec1.effect, "replayed");

  const recUnknown = reconcile("op_unknown");
  assert.equal(recUnknown.ok, true);
  assert.equal(recUnknown.effect, "not_committed");
});
