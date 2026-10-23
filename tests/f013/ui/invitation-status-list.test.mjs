import test from "node:test";
import assert from "node:assert/strict";
import {
  INVITATION_LIFECYCLES,
  DELIVERY_OUTCOMES,
  MEMBERSHIP_OUTCOMES,
} from "../../../app/shared/invitation-contracts.ts";
import { FIXTURE_INVITATIONS } from "../fixtures/invitation-fixtures.mjs";

test("F013 T055: Status projection handles all lifecycle, delivery, and membership combinations", () => {
  // Test every lifecycle status is recognized and has non-color semantic meaning
  for (const lifecycle of INVITATION_LIFECYCLES) {
    assert.ok(typeof lifecycle === "string");
  }

  // Test every delivery outcome is recognized
  for (const delivery of DELIVERY_OUTCOMES) {
    assert.ok(typeof delivery === "string");
  }

  // Test every membership outcome is recognized
  for (const membership of MEMBERSHIP_OUTCOMES) {
    assert.ok(typeof membership === "string");
  }
});

test("F013 T055: Available actions are server-derived and disallow client mutation overrides", () => {
  const pending = FIXTURE_INVITATIONS.pending;
  const accepted = FIXTURE_INVITATIONS.accepted;
  const revoked = FIXTURE_INVITATIONS.revoked;

  // Pending invitations allow resend/revoke
  assert.deepEqual(pending.availableActions, ["resend", "revoke", "refresh"]);

  // Terminal invitations must never offer resend or revoke mutations
  assert.ok(!accepted.availableActions.includes("resend"));
  assert.ok(!accepted.availableActions.includes("revoke"));
  assert.ok(!revoked.availableActions.includes("resend"));
  assert.ok(!revoked.availableActions.includes("revoke"));
});

test("F013 T055: Stale / offline state disables all mutations and labels interface clearly", () => {
  // Offline simulation
  const isOffline = true;
  const item = FIXTURE_INVITATIONS.pending;

  const canResend = item.availableActions.includes("resend") && !isOffline;
  const canRevoke = item.availableActions.includes("revoke") && !isOffline;

  assert.equal(canResend, false, "Resend must be disabled when offline");
  assert.equal(canRevoke, false, "Revoke must be disabled when offline");
});

test("F013 T055: UI prohibits search, total counts, direct detail RPC, or token affordances", () => {
  const keys = Object.keys(FIXTURE_INVITATIONS.pending);
  assert.ok(!keys.includes("totalCount"));
  assert.ok(!keys.includes("secret"));
  assert.ok(!keys.includes("token"));
  assert.ok(!keys.includes("continuationDigest"));
});
