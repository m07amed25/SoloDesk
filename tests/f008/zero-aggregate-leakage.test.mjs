import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-03: Zero aggregate count and search leakage across tenants", () => {
  const emulator = seedTenants(createF008Emulator());

  // Add more records to Alpha and Beta to verify aggregate counts
  emulator.setAuth("usr_alice");
  emulator.from("clients").insert({
    workspace_id: "ws_alpha_01",
    id: "cli_alpha_02",
    name: "Alpha Corp Acme Subsidiary",
    currency: "USD",
    status: "active",
  });

  emulator.setAuth("usr_charlie");
  emulator.from("clients").insert({
    workspace_id: "ws_beta_02",
    id: "cli_beta_02",
    name: "Beta Acme Partner",
    currency: "EUR",
    status: "active",
  });

  // Now authenticate as Alice (Workspace Alpha)
  emulator.setAuth("usr_alice");

  // 1. Total count of clients: Alice must see exactly 2 (Alpha clients), NOT 4 (Alpha + Beta)
  const clientCount = emulator.from("clients").select().count();
  assert.equal(
    clientCount.count,
    2,
    "Alice count must reflect exclusively Alpha's 2 clients",
  );

  // 2. Full-text / LIKE search for "Acme":
  // In Alpha: cli_alpha_01 ("Acme Global") and cli_alpha_02 ("Alpha Corp Acme Subsidiary")
  // In Beta: cli_beta_02 ("Beta Acme Partner")
  const searchResults = emulator
    .from("clients")
    .select()
    .search("name", "Acme");
  assert.equal(
    searchResults.data.length,
    2,
    "Search must return exclusively Alpha's matches",
  );
  for (const item of searchResults.data) {
    assert.equal(item.workspace_id, "ws_alpha_01", "Item must belong to Alpha");
    assert.notEqual(item.id, "cli_beta_02", "Must not leak Beta's Acme record");
  }

  // 3. Authenticate as Charlie (Workspace Beta)
  emulator.setAuth("usr_charlie");
  const charlieClientCount = emulator.from("clients").select().count();
  assert.equal(
    charlieClientCount.count,
    2,
    "Charlie count must reflect exclusively Beta's 2 clients",
  );

  const charlieSearchResults = emulator
    .from("clients")
    .select()
    .search("name", "Acme");
  assert.equal(
    charlieSearchResults.data.length,
    1,
    "Charlie must see only Beta's Acme partner",
  );
  assert.equal(charlieSearchResults.data[0].id, "cli_beta_02");
});
