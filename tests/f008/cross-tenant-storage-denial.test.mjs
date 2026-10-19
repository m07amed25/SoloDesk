import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-12: Cross-tenant file manipulation is denied; Alpha members cannot overwrite or delete Beta files", async () => {
  const emulator = seedTenants(createF008Emulator());

  const betaFilePath =
    "workspaces/ws_beta_02/contracts/cnt_01/obj_02-agreement.pdf";

  // 1. Authenticate as Alice (Workspace Alpha Owner)
  emulator.setAuth("usr_alice");

  // Attempt to overwrite Beta's agreement file
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .upload(betaFilePath, Buffer.from("malicious overwrite by Alice"), {
          contentType: "application/pdf",
        });
    },
    (err) => err.statusCode === 403,
    "Alice must NOT be able to overwrite Beta's file (403 Forbidden)",
  );

  // Attempt to delete Beta's agreement file
  await assert.rejects(
    async () => {
      await emulator.storage.from("workspaces").delete(betaFilePath);
    },
    (err) => err.statusCode === 403,
    "Alice must NOT be able to delete Beta's file (403 Forbidden)",
  );

  // 2. Authenticate as Charlie (Workspace Beta Owner)
  // Verify Beta file remains intact
  emulator.setAuth("usr_charlie");
  const signedResult = await emulator.storage
    .from("workspaces")
    .createSignedUrl(betaFilePath, 900);
  assert.ok(signedResult.data.signedUrl);

  const url = new URL(signedResult.data.signedUrl);
  const token = url.searchParams.get("token");
  const downloaded = await emulator.storage
    .from("workspaces")
    .downloadWithToken(betaFilePath, token);
  assert.match(downloaded.content.toString(), /synthetic beta contract/);
});
