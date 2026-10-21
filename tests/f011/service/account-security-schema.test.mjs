import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20261021000011_f011_identity_security.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("T017: Account Security Schema and Constraints", () => {
  it("creates account_security_state and identity_security_operations in private schema", () => {
    assert.match(
      sql,
      /CREATE TABLE IF NOT EXISTS private\.account_security_state/,
    );
    assert.match(
      sql,
      /CREATE TABLE IF NOT EXISTS private\.identity_security_operations/,
    );
    assert.match(sql, /PRIMARY KEY \(issuer_id, subject_id\)/);
    assert.match(sql, /operation_id uuid PRIMARY KEY/);
    assert.match(
      sql,
      /FOREIGN KEY \(issuer_id, subject_id\)[\s\n]+REFERENCES private\.account_security_state \(issuer_id, subject_id\)/,
    );
  });

  it("enforces closed states, purposes, and operation constraints", () => {
    // 9 setup states
    assert.match(sql, /'factor_not_configured'/);
    assert.match(sql, /'factor_setup_required'/);
    assert.match(sql, /'enrollment_pending'/);
    assert.match(sql, /'recovery_codes_pending'/);
    assert.match(sql, /'ready'/);
    assert.match(sql, /'factor_reset_required'/);
    assert.match(sql, /'reconciliation_required'/);
    assert.match(sql, /'recovery_required'/);
    assert.match(sql, /'upgrade_required'/);

    // 10 purposes
    assert.match(sql, /'factor_enroll'/);
    assert.match(sql, /'mfa_challenge'/);
    assert.match(sql, /'recovery_codes_acknowledge'/);
    assert.match(sql, /'recovery_codes_regenerate'/);
    assert.match(sql, /'lost_factor_recover'/);
    assert.match(sql, /'primary_credential_recover'/);
    assert.match(sql, /'factor_disable'/);
    assert.match(sql, /'factor_replace'/);
    assert.match(sql, /'primary_credential_change'/);
    assert.match(sql, /'recovery_identity_change'/);

    // Time constraints
    assert.match(sql, /CONSTRAINT check_operation_expiry CHECK \(expires_at > created_at\)/);
    assert.match(sql, /CONSTRAINT check_terminal_completed_at CHECK/);
  });

  it("extends identity_security_evidence with event-family linkage", () => {
    assert.match(sql, /ALTER TABLE private\.identity_security_evidence/);
    assert.match(sql, /identity_operation_reference uuid/);
    assert.match(sql, /policy_version text/);
    assert.match(sql, /security_generation bigint/);
    assert.match(sql, /session_consequence text/);
    assert.match(sql, /CONSTRAINT check_evidence_event_family_linkage/);
    assert.match(sql, /reject_identity_evidence_mutation/);
  });

  it("configures indexes, idempotency, and defense-in-depth RLS / revokes", () => {
    assert.match(sql, /idx_identity_security_ops_reconcile/);
    assert.match(sql, /idx_identity_security_ops_expires/);
    assert.match(sql, /idx_identity_security_ops_idempotent/);
    assert.match(sql, /idx_identity_evidence_operation/);

    assert.match(sql, /REVOKE ALL ON TABLE private\.account_security_state FROM PUBLIC, anon, authenticated;/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.identity_security_operations FROM PUBLIC, anon, authenticated;/);
    assert.match(sql, /ALTER TABLE private\.account_security_state ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /ALTER TABLE private\.identity_security_operations ENABLE ROW LEVEL SECURITY;/);

    // Prohibits secret fields in table definitions
    assert.doesNotMatch(sql, /\b(raw_secret|raw_code|raw_password|access_token|refresh_token)\b/i);
  });
});
