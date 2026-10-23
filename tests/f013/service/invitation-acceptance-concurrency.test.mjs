import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";

class ConcurrentDatabaseMock {
  constructor() {
    this.invitation = {
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      workspace_id: FIXTURE_WORKSPACES.wsMain.workspaceId,
      policy_id: FIXTURE_POLICIES.synthetic.policyId,
      policy_revision: 1,
      role_ref: "contributor",
      scope_ref: "workspace_read_write",
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
          generation_number: 1,
        },
      ],
    ]);

    this.operations = new Map(); // operationId -> result
    this.memberships = new Map(); // "workspace_id:user_id" -> membership
    this.isLocked = false;
  }

  async accept({
    operationId,
    generationId,
    expectedRevision,
    caller = FIXTURE_ACCOUNTS.intendedRecipient,
  }) {
    // Check operation idempotency
    if (this.operations.has(operationId)) {
      const prior = this.operations.get(operationId);
      return {
        ...prior,
        effect: "replayed",
      };
    }

    // Mutex lock simulation (PostgreSQL row-level lock serialization)
    while (this.isLocked) {
      await new Promise((r) => setImmediate(r));
    }
    this.isLocked = true;

    try {
      // Re-read under lock
      if (
        this.invitation.status !== "pending" ||
        this.invitation.expires_at <= Date.now() ||
        this.invitation.revision !== expectedRevision
      ) {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }

      const gen = this.generations.get(generationId);
      if (!gen || gen.status !== "current") {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }

      // Insert membership (ON CONFLICT DO NOTHING)
      const memKey = `${this.invitation.workspace_id}:${caller.subjectId}`;
      if (!this.memberships.has(memKey)) {
        this.memberships.set(memKey, {
          workspace_id: this.invitation.workspace_id,
          user_id: caller.subjectId,
          role: this.invitation.role_ref,
          status: "active",
        });
      }

      // Consume generation
      gen.status = "consumed";

      // Consume invitation
      this.invitation.status = "accepted";
      this.invitation.current_generation_id = null;
      this.invitation.accepted_membership_id = caller.subjectId;
      this.invitation.revision += 1;

      const result = {
        ok: true,
        effect: "accepted",
        membershipRef: `mem_${caller.subjectId.slice(0, 8)}`,
        workspaceLabel: "Acme Production",
        roleLabelKey: `roles.${this.invitation.role_ref}`,
        scopeLabelKey: `scopes.${this.invitation.scope_ref}`,
      };

      this.operations.set(operationId, result);
      return result;
    } finally {
      this.isLocked = false;
    }
  }

  // Admin resend: rotates generation and increments revision
  resend() {
    this.invitation.revision += 1;
    const oldGen = this.generations.get(this.invitation.current_generation_id);
    if (oldGen) {
      oldGen.status = "superseded";
    }
    const newGenId = "g0000000-0000-4000-8000-000000000002";
    this.generations.set(newGenId, {
      generation_id: newGenId,
      status: "current",
      generation_number: 2,
    });
    this.invitation.current_generation_id = newGenId;
  }

  // Admin revoke: marks invitation terminal and supersedes generations
  revoke() {
    this.invitation.status = "revoked";
    this.invitation.revision += 1;
    for (const gen of this.generations.values()) {
      if (gen.status === "current") {
        gen.status = "superseded";
      }
    }
  }
}

test("F013 T034: 32-way concurrent acceptance race yields exactly one membership and one accepted invitation", async () => {
  const db = new ConcurrentDatabaseMock();
  const concurrencyCount = 32;

  const promises = [];
  for (let i = 0; i < concurrencyCount; i++) {
    const opId = crypto.randomUUID();
    promises.push(
      db.accept({
        operationId: opId,
        generationId: "g0000000-0000-4000-8000-000000000001",
        expectedRevision: 1,
      }),
    );
  }

  const results = await Promise.all(promises);

  const acceptedResults = results.filter(
    (r) => r.ok && r.effect === "accepted",
  );
  const unavailableResults = results.filter(
    (r) => !r.ok && r.code === "invitation_unavailable",
  );

  // Exactly one winner
  assert.equal(acceptedResults.length, 1);
  // Exactly 31 safe rejections
  assert.equal(unavailableResults.length, 31);
  // Exactly one membership created
  assert.equal(db.memberships.size, 1);
  // Invitation is consumed
  assert.equal(db.invitation.status, "accepted");
  assert.equal(db.invitation.revision, 2);
});

test("F013 T034: Idempotent replay with same operationId returns replayed result", async () => {
  const db = new ConcurrentDatabaseMock();
  const opId = crypto.randomUUID();

  const first = await db.accept({
    operationId: opId,
    generationId: "g0000000-0000-4000-8000-000000000001",
    expectedRevision: 1,
  });
  assert.equal(first.ok, true);
  assert.equal(first.effect, "accepted");

  // Replay
  const second = await db.accept({
    operationId: opId,
    generationId: "g0000000-0000-4000-8000-000000000001",
    expectedRevision: 1,
  });
  assert.equal(second.ok, true);
  assert.equal(second.effect, "replayed");
  assert.equal(second.membershipRef, first.membershipRef);
  // Memberships count still 1
  assert.equal(db.memberships.size, 1);
});

test("F013 T034: Acceptance race against resend invalidates older generation", async () => {
  const db = new ConcurrentDatabaseMock();

  // Admin resends, superseding generation 1
  db.resend();

  // Recipient attempts to accept old generation 1 with stale revision 1
  const result = await db.accept({
    operationId: crypto.randomUUID(),
    generationId: "g0000000-0000-4000-8000-000000000001",
    expectedRevision: 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "invitation_unavailable");
  assert.equal(db.memberships.size, 0);
  assert.equal(db.invitation.status, "pending");
});

test("F013 T034: Acceptance race against revoke invalidates outstanding acceptance", async () => {
  const db = new ConcurrentDatabaseMock();

  // Admin revokes
  db.revoke();

  const result = await db.accept({
    operationId: crypto.randomUUID(),
    generationId: "g0000000-0000-4000-8000-000000000001",
    expectedRevision: 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "invitation_unavailable");
  assert.equal(db.memberships.size, 0);
  assert.equal(db.invitation.status, "revoked");
});
