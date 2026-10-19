import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-01: Denied cross-workspace read queries return empty results without leaking existence", () => {
  const emulator = seedTenants(createF008Emulator());

  // Authenticate as Alice in Workspace Alpha
  emulator.setAuth("usr_alice");

  // Querying Alpha client succeeds
  const alphaResult = emulator
    .from("clients")
    .select("*")
    .eq("id", "cli_alpha_01");
  assert.equal(alphaResult.data.length, 1, "Alice must see Alpha's client");
  assert.equal(alphaResult.data[0].id, "cli_alpha_01");

  // Attempting to read Beta client by ID returns empty set (0 rows)
  const betaResult = emulator
    .from("clients")
    .select("*")
    .eq("id", "cli_beta_01");
  assert.equal(
    betaResult.data.length,
    0,
    "Alice must NOT see Beta's client; returns empty set",
  );

  // Attempting to read Beta project by ID returns empty set
  const betaProject = emulator
    .from("projects")
    .select("*")
    .eq("id", "prj_beta_01");
  assert.equal(betaProject.data.length, 0, "Alice must NOT see Beta's project");

  // Attempting to read Beta task by ID returns empty set
  const betaTask = emulator.from("tasks").select("*").eq("id", "tsk_beta_01");
  assert.equal(betaTask.data.length, 0, "Alice must NOT see Beta's task");

  // Unauthenticated query returns empty set
  emulator.setAuth(null);
  const anonResult = emulator
    .from("clients")
    .select("*")
    .eq("id", "cli_alpha_01");
  assert.equal(
    anonResult.data.length,
    0,
    "Unauthenticated queries must return empty set",
  );
});
