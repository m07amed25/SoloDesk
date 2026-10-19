import { test } from "node:test";
import assert from "node:assert/strict";
import { createF008Emulator } from "../../tooling/f008/emulator.mjs";
import { seedTenants } from "../../tooling/f008/seed-test-tenants.mjs";
import { handleSignedUrlRequest } from "../../supabase/functions/storage-signed-url/index.ts";

test("A-11: Signed URL token lifecycle enforces 900-second expiration and tamper resistance", async () => {
  const emulator = seedTenants(createF008Emulator());
  emulator.setAuth("usr_alice");

  const liveLookup = (wsId, userId) => {
    return emulator.rawDb
      .prepare(
        "SELECT role, status FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?",
      )
      .get(wsId, userId);
  };

  const filePath =
    "workspaces/ws_alpha_01/invoices/inv_01/obj_01-statement.pdf";

  // 1. Request signed URL via Edge Function handler
  const req = new Request(
    "http://localhost:54321/functions/v1/storage-signed-url",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer usr_alice",
        "X-Workspace-Id": "ws_alpha_01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storagePath: filePath }),
    },
  );

  const res = await handleSignedUrlRequest(req, liveLookup, emulator.storage);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.expiresInSeconds, 900);
  assert.ok(body.data.signedUrl);

  const url = new URL(body.data.signedUrl);
  const token = url.searchParams.get("token");
  assert.ok(token, "Token must be present in signed URL");

  // 2. Download with valid token at T = now (within 900 seconds) -> succeeds!
  const file = await emulator.storage
    .from("workspaces")
    .downloadWithToken(filePath, token, Date.now());
  assert.ok(file);
  assert.equal(file.contentType, "application/pdf");

  // 3. Download at T = 901 seconds (T + 901_000 ms) -> fails with ExpiredToken (HTTP 400)
  const expiredTime = Date.now() + 901 * 1000;
  await assert.rejects(
    async () => {
      await emulator.storage
        .from("workspaces")
        .downloadWithToken(filePath, token, expiredTime);
    },
    (err) => err.statusCode === 400 && err.code === "ExpiredToken",
    "Download after 900 seconds must fail with ExpiredToken",
  );

  // 4. Cross-tenant tampering: Attempting to request signed URL for Beta file with Alice's Alpha token -> 403 Forbidden
  const tamperReq = new Request(
    "http://localhost:54321/functions/v1/storage-signed-url",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer usr_alice",
        "X-Workspace-Id": "ws_alpha_01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storagePath:
          "workspaces/ws_beta_02/contracts/cnt_01/obj_02-agreement.pdf",
      }),
    },
  );

  const tamperRes = await handleSignedUrlRequest(
    tamperReq,
    liveLookup,
    emulator.storage,
  );
  assert.equal(
    tamperRes.status,
    403,
    "Cross-tenant signed URL request must return 403 Forbidden",
  );
  const tamperBody = await tamperRes.json();
  assert.equal(tamperBody.error.code, "FORBIDDEN");
});
