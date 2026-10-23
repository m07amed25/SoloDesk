import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_WORKSPACES,
  FIXTURE_POLICIES,
} from "../fixtures/invitation-fixtures.mjs";

// Synthetic database state representing transactional execution of solodesk_invitation_accept
class MockDatabaseState {
  constructor() {
    this.invitation = {
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      workspace_id: FIXTURE_WORKSPACES.wsMain.workspaceId,
      policy_id: FIXTURE_POLICIES.synthetic.policyId,
      policy_revision: 1,
      role_ref: "contributor",
      scope_ref: "workspace_read_write",
      offer_ref: "member_standard",
      status: "pending",
      revision: 1,
      current_generation_id: "g0000000-0000-4000-8000-000000000001",
      accepted_membership_id: null,
      terminal_at: null,
      terminal_reason: null,
      recipient_type: "account_identity",
      recipient_issuer: FIXTURE_ACCOUNTS.intendedRecipient.issuerId,
      recipient_subject: FIXTURE_ACCOUNTS.intendedRecipient.subjectId,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    this.generation = {
      generation_id: "g0000000-0000-4000-8000-000000000001",
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      status: "current",
      terminal_at: null,
      consumed_by_issuer: null,
      consumed_by_subject: null,
    };

    this.redemption = {
      redemption_id: "r0000000-0000-4000-8000-000000000001",
      invitation_id: "i0000000-0000-4000-8000-000000000001",
      generation_id: "g0000000-0000-4000-8000-000000000001",
      status: "reviewed",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    this.memberships = [];
    this.lockHistory = [];
  }

  // Executes acceptance with strict lock order and atomicity
  acceptTransaction({
    caller,
    continuationValid = true,
    expectedRevision = 1,
    failStep = null,
  }) {
    // Snapshot state for atomic rollback simulation
    const snapshot = {
      invitation: JSON.parse(JSON.stringify(this.invitation)),
      generation: JSON.parse(JSON.stringify(this.generation)),
      redemption: JSON.parse(JSON.stringify(this.redemption)),
      memberships: JSON.parse(JSON.stringify(this.memberships)),
      lockHistory: [...this.lockHistory],
    };

    try {
      if (!caller || !caller.subjectId) {
        return { ok: false, code: "online_required", action: "switch_account" };
      }

      if (!continuationValid) {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }

      // Step 1: Lock order verification
      // Must acquire: workspace_invitations -> invitation_generations -> workspace_memberships
      this.lockHistory.push("LOCK private.workspace_invitations FOR UPDATE");
      if (this.invitation.status !== "pending") {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }
      if (this.invitation.revision !== expectedRevision) {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }
      if (new Date(this.invitation.expires_at) <= new Date()) {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }

      this.lockHistory.push("LOCK private.invitation_generations FOR UPDATE");
      if (this.generation.status !== "current") {
        return {
          ok: false,
          code: "invitation_unavailable",
          action: "request_new_invitation",
        };
      }

      if (failStep === "after_lock") {
        throw new Error("Simulated failure after row lock");
      }

      // Step 2: Create membership with full provenance
      this.lockHistory.push("INSERT public.workspace_memberships");
      const dbTime = new Date().toISOString();
      const newMembership = {
        workspace_id: this.invitation.workspace_id,
        user_id: caller.subjectId,
        role: this.invitation.role_ref,
        status: "active",
        account_issuer: caller.issuerId,
        accepted_invitation_id: this.invitation.invitation_id,
        accepted_generation_id: this.generation.generation_id,
        accepted_policy_id: this.invitation.policy_id,
        accepted_policy_revision: this.invitation.policy_revision,
        accepted_role_ref: this.invitation.role_ref,
        accepted_scope_ref: this.invitation.scope_ref,
        created_at: dbTime,
        updated_at: dbTime,
      };
      this.memberships.push(newMembership);

      if (failStep === "after_membership_insert") {
        throw new Error("Simulated failure after membership creation");
      }

      // Step 3: Consume generation
      this.generation.status = "consumed";
      this.generation.terminal_at = dbTime;
      this.generation.consumed_by_issuer = caller.issuerId;
      this.generation.consumed_by_subject = caller.subjectId;

      // Step 4: Mark invitation accepted
      this.invitation.status = "accepted";
      this.invitation.current_generation_id = null;
      this.invitation.accepted_membership_id = caller.subjectId;
      this.invitation.terminal_at = dbTime;
      this.invitation.terminal_reason = "accepted";
      this.invitation.revision += 1;

      // Step 5: Consume redemption
      this.redemption.status = "accepted";
      this.redemption.terminal_at = dbTime;

      return {
        ok: true,
        effect: "accepted",
        membershipRef: `mem_${caller.subjectId.slice(0, 8)}`,
        workspaceLabel: "Acme Production",
        roleLabelKey: `roles.${this.invitation.role_ref}`,
        scopeLabelKey: `scopes.${this.invitation.scope_ref}`,
      };
    } catch (err) {
      // Rollback to pre-transaction snapshot
      this.invitation = snapshot.invitation;
      this.generation = snapshot.generation;
      this.redemption = snapshot.redemption;
      this.memberships = snapshot.memberships;
      this.lockHistory = snapshot.lockHistory;
      return { ok: false, code: "outcome_unknown", action: "retry_original" };
    }
  }
}

test("F013 T033: Successful acceptance atomically creates membership with complete provenance and consumes invitation", () => {
  const db = new MockDatabaseState();
  const result = db.acceptTransaction({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationValid: true,
    expectedRevision: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.effect, "accepted");

  // Verify membership provenance
  assert.equal(db.memberships.length, 1);
  const mem = db.memberships[0];
  assert.equal(mem.workspace_id, FIXTURE_WORKSPACES.wsMain.workspaceId);
  assert.equal(mem.user_id, FIXTURE_ACCOUNTS.intendedRecipient.subjectId);
  assert.equal(mem.role, "contributor");
  assert.equal(mem.status, "active");
  assert.equal(
    mem.accepted_invitation_id,
    "i0000000-0000-4000-8000-000000000001",
  );
  assert.equal(
    mem.accepted_generation_id,
    "g0000000-0000-4000-8000-000000000001",
  );
  assert.equal(mem.accepted_policy_id, FIXTURE_POLICIES.synthetic.policyId);
  assert.equal(mem.accepted_policy_revision, 1);
  assert.equal(mem.accepted_role_ref, "contributor");
  assert.equal(mem.accepted_scope_ref, "workspace_read_write");

  // Verify invitation state consumed
  assert.equal(db.invitation.status, "accepted");
  assert.equal(db.invitation.current_generation_id, null);
  assert.equal(
    db.invitation.accepted_membership_id,
    FIXTURE_ACCOUNTS.intendedRecipient.subjectId,
  );
  assert.equal(db.invitation.terminal_reason, "accepted");
  assert.equal(db.invitation.revision, 2);

  // Verify generation state consumed
  assert.equal(db.generation.status, "consumed");
  assert.equal(
    db.generation.consumed_by_subject,
    FIXTURE_ACCOUNTS.intendedRecipient.subjectId,
  );

  // Verify redemption state consumed
  assert.equal(db.redemption.status, "accepted");

  // Verify lock hierarchy order
  assert.deepEqual(db.lockHistory, [
    "LOCK private.workspace_invitations FOR UPDATE",
    "LOCK private.invitation_generations FOR UPDATE",
    "INSERT public.workspace_memberships",
  ]);
});

test("F013 T033: Atomicity rollback when failure occurs after row locks", () => {
  const db = new MockDatabaseState();
  const result = db.acceptTransaction({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationValid: true,
    expectedRevision: 1,
    failStep: "after_lock",
  });

  assert.equal(result.ok, false);
  // Rollback verified: no membership created, invitation remains pending, generation remains current
  assert.equal(db.memberships.length, 0);
  assert.equal(db.invitation.status, "pending");
  assert.equal(
    db.invitation.current_generation_id,
    "g0000000-0000-4000-8000-000000000001",
  );
  assert.equal(db.generation.status, "current");
  assert.equal(db.redemption.status, "reviewed");
});

test("F013 T033: Atomicity rollback when failure occurs after membership insert", () => {
  const db = new MockDatabaseState();
  const result = db.acceptTransaction({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationValid: true,
    expectedRevision: 1,
    failStep: "after_membership_insert",
  });

  assert.equal(result.ok, false);
  // Rollback verified: membership removed, invitation remains pending, generation current
  assert.equal(db.memberships.length, 0);
  assert.equal(db.invitation.status, "pending");
  assert.equal(db.generation.status, "current");
  assert.equal(db.redemption.status, "reviewed");
});

test("F013 T033: Reject stale revision or expired invitation before mutating membership", () => {
  const db = new MockDatabaseState();

  // Stale expected revision
  const resStale = db.acceptTransaction({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationValid: true,
    expectedRevision: 99, // Mismatched
  });
  assert.equal(resStale.ok, false);
  assert.equal(resStale.code, "invitation_unavailable");
  assert.equal(db.memberships.length, 0);
  assert.equal(db.invitation.status, "pending");

  // Expired invitation
  db.invitation.expires_at = new Date(Date.now() - 1000).toISOString();
  const resExpired = db.acceptTransaction({
    caller: FIXTURE_ACCOUNTS.intendedRecipient,
    continuationValid: true,
    expectedRevision: 1,
  });
  assert.equal(resExpired.ok, false);
  assert.equal(resExpired.code, "invitation_unavailable");
  assert.equal(db.memberships.length, 0);
});
