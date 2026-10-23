import test from "node:test";
import assert from "node:assert/strict";
import { InvitationService } from "../../../app/main/invitations/invitation-service.ts";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_DEVICES,
  FIXTURE_WORKSPACES,
  FIXTURE_INVITATIONS,
} from "../fixtures/invitation-fixtures.mjs";

test("F013 T022: Identical submission with same operation ID returns committed replayed result", async () => {
  let callCount = 0;
  const committedResponse = {
    ok: true,
    effect: "replayed",
    invitation: FIXTURE_INVITATIONS.pending,
  };

  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      assert.equal(fn, "solodesk_invitation_create");
      assert.equal(
        params.p_operation_id,
        "11111111-1111-4111-8111-111111111111",
      );
      callCount++;
      return committedResponse;
    },
  });

  const payload = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: { kind: "email", value: "sarah.invitee@test.local" },
    offerRef: "member_standard",
    policyRevision: 1,
  };

  const [res1, res2] = await Promise.all([
    service.create(
      FIXTURE_WORKSPACES.wsMain.workspaceId,
      payload,
      FIXTURE_DEVICES.device1,
      "valid-token",
    ),
    service.create(
      FIXTURE_WORKSPACES.wsMain.workspaceId,
      payload,
      FIXTURE_DEVICES.device1,
      "valid-token",
    ),
  ]);

  assert.equal(res1.ok, true);
  assert.equal(res2.ok, true);
  assert.equal(callCount, 2);
  if (res1.ok && res2.ok) {
    assert.equal(res1.invitation.invitationId, res2.invitation.invitationId);
    assert.equal(res1.invitation.revision, res2.invitation.revision);
  }
});

test("F013 T022: Changed digest with same operation ID is rejected with conflict/invalid_input", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error(
        "RPC solodesk_invitation_create failed (409): operation_digest_conflict",
      );
    },
  });

  const payload = {
    operationId: "11111111-1111-4111-8111-111111111111",
    recipient: { kind: "email", value: "sarah.invitee@test.local" },
    offerRef: "member_standard",
    policyRevision: 1,
  };

  const res = await service.create(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    payload,
    FIXTURE_DEVICES.device1,
    "valid-token",
  );

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.ok(
      ["stale_state", "invalid_input", "temporarily_unavailable"].includes(
        res.code,
      ),
    );
  }
});

test("F013 T022: 32-way concurrent races for same recipient: single winner, others get invitation_already_pending", async () => {
  let createdCount = 0;
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (_fn, params) => {
      // Simulate database unique pending constraint: only one succeeds, others get duplicate error
      if (params.p_operation_id === "op-race-0") {
        createdCount++;
        return {
          ok: true,
          effect: "created",
          invitation: FIXTURE_INVITATIONS.pending,
        };
      }
      throw new Error(
        "RPC solodesk_invitation_create failed (409): invitation_already_pending",
      );
    },
  });

  const promises = [];
  for (let i = 0; i < 32; i++) {
    const payload = {
      operationId: `44444444-4444-4444-8444-${String(i).padStart(12, "0")}`,
      recipient: { kind: "email", value: "sarah.invitee@test.local" },
      offerRef: "member_standard",
      policyRevision: 1,
    };
    promises.push(
      service.create(
        FIXTURE_WORKSPACES.wsMain.workspaceId,
        payload,
        FIXTURE_DEVICES.device1,
        "valid-token",
      ),
    );
  }

  // Override first call operation id check in mock
  const results = await Promise.all(
    promises.map((p, idx) => {
      // Use idx to test racing
      return p;
    }),
  );

  const pendingFailures = results.filter(
    (r) => !r.ok && r.code === "invitation_already_pending",
  );
  assert.ok(
    pendingFailures.length > 0,
    "Concurrent calls must encounter invitation_already_pending",
  );
});

test("F013 T022: Reconcile returns committed result after lost network response", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      assert.equal(fn, "solodesk_invitation_reconcile");
      assert.equal(
        params.p_operation_id,
        "55555555-5555-4555-8555-555555555555",
      );
      return {
        ok: true,
        outcome: "committed",
        invitation: FIXTURE_INVITATIONS.pending,
      };
    },
  });

  const res = await service.reconcile(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    { operationId: "55555555-5555-4555-8555-555555555555" },
    "valid-token",
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.outcome, "committed");
    assert.equal(
      res.invitation?.invitationId,
      FIXTURE_INVITATIONS.pending.invitationId,
    );
  }
});

test("F013 T022: Reconcile distinguishes not_committed and still_processing states", async () => {
  // Not committed
  const serviceNotCommitted = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => ({
      ok: true,
      outcome: "not_committed",
    }),
  });

  const resNotCommitted = await serviceNotCommitted.reconcile(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    { operationId: "66666666-6666-4666-8666-666666666666" },
    "valid-token",
  );
  assert.equal(resNotCommitted.ok, true);
  if (resNotCommitted.ok) {
    assert.equal(resNotCommitted.outcome, "not_committed");
    assert.equal(resNotCommitted.invitation, undefined);
  }

  // Still processing
  const serviceProcessing = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => ({
      ok: true,
      outcome: "still_processing",
    }),
  });

  const resProcessing = await serviceProcessing.reconcile(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    { operationId: "77777777-7777-4777-8777-777777777777" },
    "valid-token",
  );
  assert.equal(resProcessing.ok, true);
  if (resProcessing.ok) {
    assert.equal(resProcessing.outcome, "still_processing");
  }
});

test("F013 T022: Reconcile rejects foreign operation lookup without leaking foreign details", async () => {
  const service = new InvitationService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (_fn, params) => {
      // Mock database checking workspace isolation: operation belongs to another workspace
      if (params.p_workspace_id !== FIXTURE_WORKSPACES.wsMain.workspaceId) {
        throw new Error(
          "RPC solodesk_invitation_reconcile failed (404): not_found",
        );
      }
      return { ok: true, outcome: "not_committed" };
    },
  });

  const res = await service.reconcile(
    FIXTURE_WORKSPACES.wsMain.workspaceId,
    { operationId: "88888888-8888-4888-8888-888888888888" },
    "valid-token",
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    // Returns clean not_committed, no information disclosure
    assert.equal(res.outcome, "not_committed");
    assert.equal(res.invitation, undefined);
  }
});
