import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { computeCreationRequestDigest } from "../../../app/shared/workspace-contracts.ts";

test("WorkspaceService rejects missing access token before making RPC calls", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
  });

  const req = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    requestDigest: "sha256-v1:abc",
    profile: {
      displayName: "Acme Studio",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const res = await service.createWorkspace("", req);
  assert.equal(res.status, "rejected");
  assert.equal(res.code, "auth_required");
  assert.equal(res.recovery, "sign_in_again");
});

test("Simultaneous identical submissions return the same committed result", async () => {
  let callCount = 0;
  const committedResponse = {
    status: "committed",
    workspace: {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      displayName: "Acme Studio",
      discriminator: "1111",
      role: "owner",
      membershipStatus: "active",
      workspaceStatus: "active",
      readinessState: "setup_incomplete",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      authorityVersion: 1,
      checkedAt: "2026-10-21T12:00:00.000Z",
    },
    membership: { role: "owner", status: "active" },
    receiptId: "r0000000-0000-4000-8000-000000000001",
    committedAt: "2026-10-21T12:00:00.000Z",
    readinessState: "setup_incomplete",
  };

  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn, params) => {
      assert.equal(fn, "solodesk_create_workspace");
      callCount++;
      return committedResponse;
    },
  });

  const req = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    requestDigest: "sha256-v1:test",
    profile: {
      displayName: "Acme Studio",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const [res1, res2] = await Promise.all([
    service.createWorkspace("valid-token", req),
    service.createWorkspace("valid-token", req),
  ]);

  assert.equal(res1.status, "committed");
  assert.equal(res2.status, "committed");
  assert.equal(res1.workspace.workspaceId, res2.workspace.workspaceId);
  assert.equal(res1.receiptId, res2.receiptId);
  assert.equal(callCount, 2);
});

test("Changed digest with existing intent is safely rejected", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      return {
        status: "rejected",
        code: "changed_intent",
        diagnosticId: "diag-123",
        recovery: "reconcile_creation",
      };
    },
  });

  const req = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    requestDigest: "sha256-v1:changed",
    profile: {
      displayName: "Modified Name",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const res = await service.createWorkspace("token", req);
  assert.equal(res.status, "rejected");
  assert.equal(res.code, "changed_intent");
  assert.equal(res.recovery, "reconcile_creation");
});

test("Service failure maps safely without exposing database internals", async () => {
  const service = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async () => {
      throw new Error("PGRST500: internal database failure in transaction");
    },
  });

  const req = {
    version: 1,
    intentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    deviceEnrollmentId: "d0000000-0000-4000-8000-000000000001",
    requestDigest: "sha256-v1:test",
    profile: {
      displayName: "Acme",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
      profileVersion: 1,
      creationPolicyVersion: "f012_v1_synthetic",
    },
  };

  const res = await service.createWorkspace("token", req);
  assert.equal(res.status, "rejected");
  assert.equal(res.code, "service_unavailable");
  assert.equal(res.recovery, "retry");
  assert.doesNotMatch(JSON.stringify(res), /PGRST500/);
});
