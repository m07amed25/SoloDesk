import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import {
  sanitizeFilename,
  buildStoragePath,
  parseStoragePath,
} from "../../supabase/functions/_shared/storage-path.ts";

test("A-10: Storage path partitioning and traversal defense blocks malicious segments and foreign tenant prefixes", async () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  // 1. Path traversal via '..' segment must be rejected
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .upload(
          "workspaces/ws_alpha_01/invoices/../../etc/passwd/obj_01-bad.pdf",
          Buffer.from("malicious"),
        );
    },
    (err) => err.statusCode === 400 || err.message.includes("traversal"),
    "Path traversal must be rejected",
  );

  // 2. Uploading targeting Workspace Beta while authenticated as Alice -> rejected with 403 Forbidden
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .upload(
          "workspaces/ws_beta_02/invoices/inv_01/obj_01-intruder.pdf",
          Buffer.from("intruder payload"),
        );
    },
    (err) => err.statusCode === 403,
    "Targeting foreign tenant prefix must be rejected with 403 Forbidden",
  );

  // 3. Filename sanitizer blocks slashes and parent directory navigation
  assert.throws(() => sanitizeFilename("../escape.pdf"), /path traversal/);
  assert.throws(() => sanitizeFilename("foo/bar.pdf"), /path traversal/);
  assert.equal(
    sanitizeFilename(" invoice final  (2026).pdf "),
    "invoice_final_2026_.pdf",
  );

  // 4. Canonical path builder enforces format
  const validPath = buildStoragePath({
    workspaceId: "ws_alpha_01",
    entityType: "invoices",
    entityId: "inv_123",
    fileId: "obj_999",
    filename: "contract.pdf",
  });
  assert.equal(
    validPath,
    "workspaces/ws_alpha_01/invoices/inv_123/obj_999-contract.pdf",
  );

  // 5. Parse canonical path extracts correct tenant
  const parsed = parseStoragePath(validPath);
  assert.equal(parsed.workspaceId, "ws_alpha_01");
  assert.equal(parsed.entityType, "invoices");
  assert.equal(parsed.entityId, "inv_123");
  assert.equal(parsed.fileId, "obj_999");
});
