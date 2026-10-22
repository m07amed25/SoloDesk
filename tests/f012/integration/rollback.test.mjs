import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_WORKSPACES } from "../fixtures/workspace-fixtures.mjs";
import { WorkspaceCoordinator } from "../../../app/main/workspaces/coordinator.ts";
import { WorkspaceService } from "../../../app/main/workspaces/workspace-service.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { TEST_SECRET_PROTECTION } from "../../f010/fixtures/identity-fixtures.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f012-rollback-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const identityStore = new ProtectedIdentityStore(
    root,
    "prof_a_00000000-0000-4000-8000-000000000001",
    undefined,
    TEST_SECRET_PROTECTION,
  );
  return { root, identityStore };
}

test("T065: Absent or disabled policy safely turns off creation without breaking reads", async (t) => {
  const { identityStore } = setup(t);
  const ws = FIXTURE_WORKSPACES.ws1;

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: {
            enabled: false,
            locales: ["en", "ar"],
            currencyCodes: ["USD"],
          },
          workspaces: [ws],
        };
      }
      if (fn === "solodesk_create_workspace") {
        return {
          status: "rejected",
          code: "workspace_creation_unavailable",
          recovery: "refresh_options",
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async openRetainedWorkspace() { return { status: "ready" }; },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: mockService,
  });

  const state = await coordinator.bootstrap();
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.creation?.enabled, false);

  // Creation attempt when disabled is rejected
  const res = await coordinator.create({
    displayName: "Forbidden Workspace",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    defaultLocale: "en",
    profileVersion: 1,
    creationPolicyVersion: "f012_v1_synthetic",
  });

  assert.equal(res.status, "rejected");
  assert.equal(res.code, "workspace_creation_unavailable");
});

test("T065: Re-enabling policy reconciles and restores creation capability", async (t) => {
  const { identityStore } = setup(t);
  const ws = FIXTURE_WORKSPACES.ws1;

  let policyEnabled = false;

  const mockService = new WorkspaceService({
    supabaseUrl: "https://auth.solodesk.test",
    supabaseAnonKey: "anon-key",
    rpcExecutor: async (fn) => {
      if (fn === "solodesk_workspace_bootstrap") {
        return {
          version: 1,
          creation: {
            enabled: policyEnabled,
            locales: ["en", "ar"],
            currencyCodes: ["USD"],
          },
          workspaces: [ws],
        };
      }
      throw new Error(`Unexpected rpc: ${fn}`);
    },
  });

  const coordinator = new WorkspaceCoordinator({
    profileId: "prof_a_00000000-0000-4000-8000-000000000001",
    getProfileGeneration: () => 1,
    getAccount: () => ({ issuerId: "https://auth.solodesk.test", subjectId: "a0000000-0000-4000-8000-000000000001" }),
    getAccessToken: async () => "token-user",
    getDeviceEnrollmentId: () => "d0000000-0000-4000-8000-000000000001",
    persistence: {
      async openRetainedWorkspace() { return { status: "ready" }; },
      async closeWorkspaceStore() {},
    },
    identityStore,
    workspaceService: mockService,
  });

  const stateDisabled = await coordinator.bootstrap();
  assert.equal(stateDisabled.creation?.enabled, false);

  // Policy re-enabled
  policyEnabled = true;
  const stateEnabled = await coordinator.bootstrap();
  assert.equal(stateEnabled.creation?.enabled, true);
});
