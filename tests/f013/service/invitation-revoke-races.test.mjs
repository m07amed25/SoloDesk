import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";

class RevokeRacesMock {
  constructor() {
    this.invitation = {
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      workspace_id: FIXTURE_WORKSPACES.wsMain.workspaceId,
      status: "pending",
      revision: 1,
      current_generation_id: "g0000000-0000-4000-8000-000000000001",
      accepted_membership_id: null,
      recipient_subject: FIXTURE_ACCOUNTS.intendedRecipient.subjectId,
      expires_at: Date.now() + 60000,
    };

    this.generations = new Map([
      [
        "g0000000-0000-4000-8000-000000000001",
        {
          generation_id: "g0000000-0000-4000-8000-000000000001",
          status: "current",
        },
      ],
    ]);

    this.memberships = new Map();
    this.isLocked = false;
  }

  async withLock(action) {
    while (this.isLocked) {
      await new Promise((r) => setImmediate(r));
    }
    this.isLocked = true;
    try {
      return await action();
    } finally {
      this.isLocked = false;
    }
  }

  async revoke({ caller, expectedRevision }) {
    return this.withLock(async () => {
      if (!caller || caller.role !== "owner") {
        return { ok: false, code: "not_authorized" };
      }

      if (this.invitation.status === "accepted") {
        return { ok: false, code: "stale_state", action: "refresh" };
      }

      if (this.invitation.status !== "pending") {
        return { ok: false, code: "stale_state", action: "refresh" };
      }

      if (this.invitation.revision !== expectedRevision) {
        return { ok: false, code: "stale_state", action: "refresh" };
      }

      // Mark all generations superseded
      for (const gen of this.generations.values()) {
        if (gen.status === "current") {
          gen.status = "superseded";
        }
      }

      this.invitation.status = "revoked";
      this.invitation.current_generation_id = null;
      this.invitation.terminal_reason = "revoked";
      this.invitation.revision += 1;

      return {
        ok: true,
        effect: "revoked",
        invitation: {
          invitationId: this.invitation.invitation_id,
          revision: this.invitation.revision,
          lifecycle: "revoked",
        },
      };
    });
  }

  async accept({
    caller = FIXTURE_ACCOUNTS.intendedRecipient,
    expectedRevision,
  }) {
    return this.withLock(async () => {
      if (
        this.invitation.status !== "pending" ||
        this.invitation.revision !== expectedRevision ||
        this.invitation.expires_at <= Date.now()
      ) {
        return { ok: false, code: "invitation_unavailable" };
      }

      const gen = this.generations.get(this.invitation.current_generation_id);
      if (!gen || gen.status !== "current") {
        return { ok: false, code: "invitation_unavailable" };
      }

      gen.status = "consumed";
      this.invitation.status = "accepted";
      this.invitation.current_generation_id = null;
      this.invitation.accepted_membership_id = caller.subjectId;
      this.invitation.revision += 1;

      this.memberships.set(caller.subjectId, {
        workspace_id: this.invitation.workspace_id,
        user_id: caller.subjectId,
        role: "contributor",
        status: "active",
      });

      return { ok: true, effect: "accepted" };
    });
  }
}

test("F013 T042: Revoke invalidates all generations and marks invitation terminal", async () => {
  const db = new RevokeRacesMock();

  const res = await db.revoke({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    expectedRevision: 1,
  });

  assert.equal(res.ok, true);
  assert.equal(res.effect, "revoked");
  assert.equal(db.invitation.status, "revoked");
  assert.equal(db.invitation.current_generation_id, null);
  assert.equal(db.invitation.revision, 2);

  // All generations invalidated
  for (const gen of db.generations.values()) {
    assert.equal(gen.status, "superseded");
  }
});

test("F013 T042: Stale revision rejects revoke cleanly without mutating status", async () => {
  const db = new RevokeRacesMock();

  const res = await db.revoke({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    expectedRevision: 99,
  });

  assert.equal(res.ok, false);
  assert.equal(res.code, "stale_state");
  assert.equal(db.invitation.status, "pending");
  assert.equal(db.invitation.revision, 1);
});

test("F013 T042: Revoke cannot delete or mutate an acceptance-winning membership", async () => {
  const db = new RevokeRacesMock();

  // 1. Recipient accepts first
  const acceptRes = await db.accept({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    expectedRevision: 1,
  });
  assert.equal(acceptRes.ok, true);
  assert.equal(db.memberships.size, 1);

  // 2. Admin submits revoke afterward
  const revokeRes = await db.revoke({
    caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
    expectedRevision: 1,
  });
  assert.equal(revokeRes.ok, false);
  assert.equal(revokeRes.code, "stale_state");

  // Critical: Membership remains intact and active!
  assert.equal(db.memberships.size, 1);
  const mem = db.memberships.get(FIXTURE_ACCOUNTS.intendedRecipient.subjectId);
  assert.equal(mem.status, "active");
  assert.equal(db.invitation.status, "accepted");
});

test("F013 T042: 32-way concurrent race between accept and revoke produces deterministic outcome", async () => {
  const db = new RevokeRacesMock();
  const racers = [];

  // 16 accept attempts vs 16 revoke attempts
  for (let i = 0; i < 16; i++) {
    racers.push(
      db.accept({
        caller: FIXTURE_ACCOUNTS.intendedRecipient,
        expectedRevision: 1,
      }),
    );
    racers.push(
      db.revoke({
        caller: { ...FIXTURE_ACCOUNTS.inviterOwner, role: "owner" },
        expectedRevision: 1,
      }),
    );
  }

  // Shuffle racers
  racers.sort(() => Math.random() - 0.5);

  const results = await Promise.all(racers);

  const acceptWins = results.filter((r) => r.ok && r.effect === "accepted");
  const revokeWins = results.filter((r) => r.ok && r.effect === "revoked");

  // Exactly one winner overall
  assert.equal(acceptWins.length + revokeWins.length, 1);

  if (acceptWins.length === 1) {
    // If accept won, invitation is accepted and membership is active
    assert.equal(db.invitation.status, "accepted");
    assert.equal(db.memberships.size, 1);
  } else {
    // If revoke won, invitation is revoked and ZERO membership was created
    assert.equal(db.invitation.status, "revoked");
    assert.equal(db.memberships.size, 0);
  }
});
