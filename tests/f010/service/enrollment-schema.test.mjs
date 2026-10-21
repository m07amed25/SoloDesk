import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20261020000009_device_enrollment.sql", import.meta.url),
  "utf8",
);

test("T025: enrollment schema is account-scoped, immutable, and secret-free", () => {
  for (const table of [
    "enrollment_intents",
    "device_enrollments",
    "device_enrollment_receipts",
    "identity_security_evidence",
  ]) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS private\\.${table}`));

  assert.match(sql, /UNIQUE \(issuer_id, subject_id, enrollment_intent_id\)/);
  assert.match(sql, /UNIQUE \(originating_intent_id\)/);
  assert.match(sql, /UNIQUE \(issuer_id, subject_id, installation_context_id\)/);
  assert.match(sql, /request_digest = p_request_digest/);
  assert.match(sql, /reject_identity_evidence_mutation/);
  assert.match(sql, /REVOKE ALL .* anon, authenticated/);
  assert.doesNotMatch(sql, /\b(workspace_id|role|refresh_token|access_token|profile_path|raw_key)\b/i);
});

