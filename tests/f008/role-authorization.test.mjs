import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isActionAuthorized,
  assertActionAuthorized,
} from "../../supabase/functions/command-gateway/role-authorizer.ts";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-05: Unit test for authoritative role capability evaluation matrix across all 6 roles", () => {
  // 1. Owner permissions
  assert.equal(isActionAuthorized("owner", "workspace.settings"), true);
  assert.equal(
    isActionAuthorized("owner", "workspace.transfer_ownership"),
    true,
  );
  assert.equal(isActionAuthorized("owner", "membership.invite"), true);
  assert.equal(isActionAuthorized("owner", "invoice.issue"), true);
  assert.equal(isActionAuthorized("owner", "audit.read"), true);

  // 2. Admin permissions
  assert.equal(isActionAuthorized("admin", "workspace.settings"), true);
  assert.equal(
    isActionAuthorized("admin", "workspace.transfer_ownership"),
    false,
    "Admin cannot transfer ownership",
  );
  assert.equal(isActionAuthorized("admin", "membership.invite"), true);
  assert.equal(
    isActionAuthorized("admin", "invoice.issue"),
    false,
    "Admin cannot issue invoices (financial lock)",
  );
  assert.equal(isActionAuthorized("admin", "audit.read"), true);

  // 3. Manager permissions
  assert.equal(isActionAuthorized("manager", "workspace.settings"), false);
  assert.equal(isActionAuthorized("manager", "client.create"), true);
  assert.equal(isActionAuthorized("manager", "project.create"), true);
  assert.equal(isActionAuthorized("manager", "task.create"), true);
  assert.equal(isActionAuthorized("manager", "invoice.draft"), true);
  assert.equal(isActionAuthorized("manager", "invoice.issue"), false);
  assert.equal(isActionAuthorized("manager", "audit.read"), false);

  // 4. Contributor permissions
  assert.equal(
    isActionAuthorized("contributor", "client.create"),
    false,
    "Contributor cannot create clients",
  );
  assert.equal(isActionAuthorized("contributor", "project.create"), false);
  assert.equal(isActionAuthorized("contributor", "task.create"), true);
  assert.equal(isActionAuthorized("contributor", "time.create_own"), true);
  assert.equal(isActionAuthorized("contributor", "time.approve_others"), false);
  assert.equal(isActionAuthorized("contributor", "invoice.draft"), false);

  // 5. Finance permissions
  assert.equal(isActionAuthorized("finance", "invoice.draft"), true);
  assert.equal(isActionAuthorized("finance", "invoice.issue"), true);
  assert.equal(isActionAuthorized("finance", "cost_rates.view"), true);
  assert.equal(isActionAuthorized("finance", "client.create"), false);
  assert.equal(isActionAuthorized("finance", "task.create"), false);

  // 6. Viewer permissions
  assert.equal(isActionAuthorized("viewer", "client.create"), false);
  assert.equal(isActionAuthorized("viewer", "task.create"), false);
  assert.equal(isActionAuthorized("viewer", "invoice.issue"), false);
  assert.equal(isActionAuthorized("viewer", "storage.upload"), false);

  // Test assertActionAuthorized throwing
  assert.throws(() => {
    assertActionAuthorized("contributor", "workspace.settings");
  }, /Forbidden/);
});

test("A-05: Real-time role promotion in live database takes effect immediately", () => {
  const emulator = seedTenants(createF008Emulator());

  // Authenticated as Bob (contributor)
  emulator.setAuth("usr_bob");

  // Bob attempts to create a client -> rejected by RLS with 42501
  const failResult = emulator.from("clients").insert({
    workspace_id: "ws_alpha_01",
    id: "cli_bob_denied",
    name: "Bob Client",
    currency: "USD",
    status: "active",
  });
  assert.ok(failResult.error);
  assert.equal(failResult.error.code, "42501");

  // Alice (owner) promotes Bob to manager
  emulator.setAuth("usr_alice");
  const promoteResult = emulator
    .from("workspace_memberships")
    .update({ role: "manager" })
    .eq("user_id", "usr_bob");
  assert.equal(promoteResult.count, 1);

  // Bob immediately retries identical insert -> succeeds!
  emulator.setAuth("usr_bob");
  const successResult = emulator.from("clients").insert({
    workspace_id: "ws_alpha_01",
    id: "cli_bob_promoted",
    name: "Bob Approved Client",
    currency: "USD",
    status: "active",
  });
  assert.ok(
    !successResult.error,
    "Promoted manager must be able to insert clients",
  );
  assert.equal(successResult.data.id, "cli_bob_promoted");
});
