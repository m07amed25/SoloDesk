import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";

test("A-09: Private storage by default rejects unauthenticated requests with 403 Forbidden", async () => {
  const emulator = seedTenants(createF008Emulator());

  // Ensure unauthenticated context
  emulator.setAuth(null);

  // Attempt upload without authentication -> 403 Forbidden
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .upload(
          "workspaces/ws_alpha_01/invoices/inv_01/obj_test-file.pdf",
          Buffer.from("unauthenticated payload"),
        );
    },
    (err) => err.statusCode === 403 || err.message.includes("403 Forbidden"),
    "Unauthenticated upload must be rejected with 403 Forbidden",
  );

  // Attempt to delete without authentication -> 403 Forbidden
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .delete("workspaces/ws_alpha_01/invoices/inv_01/obj_01-statement.pdf");
    },
    (err) => err.statusCode === 403,
    "Unauthenticated delete must be rejected with 403 Forbidden",
  );

  // Authenticate as Alice (Owner of Alpha) -> upload succeeds
  emulator.setAuth("usr_alice");
  const uploadResult = await emulator.storage
    .from("workspaces")
    .upload(
      "workspaces/ws_alpha_01/invoices/inv_01/obj_alice_01-receipt.pdf",
      Buffer.from("alice valid file"),
      { contentType: "application/pdf" },
    );
  assert.ok(uploadResult.data.path);
});
