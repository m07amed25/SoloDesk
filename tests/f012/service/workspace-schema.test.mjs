import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20261021000012_f012_workspace_creation.sql",
    import.meta.url,
  ),
  "utf8",
);
const productionPolicySql = readFileSync(
  new URL(
    "../../../supabase/migrations/20261021233124_f012_production_creation_policy.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("T017: Workspace Creation Schema, Constraints and Security", () => {
  it("extends workspace_tenants with display_name, profile_version, creation_policy_version, readiness_state", () => {
    assert.match(sql, /ALTER TABLE public\.workspace_tenants/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS display_name text/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS profile_version integer/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS creation_policy_version text/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS readiness_state text/);
    assert.match(
      sql,
      /CHECK \(readiness_state IN \('setup_incomplete', 'ready'\)\)/,
    );
  });

  it("safely backfills display_name before enforcing NOT NULL and permits nullable legal_name", () => {
    assert.match(sql, /UPDATE public\.workspace_tenants/);
    assert.match(
      sql,
      /SET display_name = COALESCE\(NULLIF\(TRIM\(trade_name\), ''\), NULLIF\(TRIM\(legal_name\), ''\), 'Workspace'\)/,
    );
    assert.match(sql, /ALTER COLUMN display_name SET NOT NULL/);
    assert.match(sql, /ALTER COLUMN legal_name DROP NOT NULL/);
    assert.match(sql, /chk_workspace_tenants_display_name/);
    assert.match(sql, /char_length\(display_name\) BETWEEN 1 AND 120/);
    assert.match(sql, /display_name !~ '\[\[:cntrl:\]\]'/);
  });

  it("creates private.workspace_creation_policies and private.workspace_creation_intents", () => {
    assert.match(
      sql,
      /CREATE TABLE IF NOT EXISTS private\.workspace_creation_policies/,
    );
    assert.match(
      sql,
      /CREATE TABLE IF NOT EXISTS private\.workspace_creation_intents/,
    );
    assert.match(
      sql,
      /PRIMARY KEY \(issuer_id, subject_id, operation_type, intent_id\)/,
    );
    assert.match(
      sql,
      /CHECK \(status IN \('submitted', 'committed', 'proven_not_created', 'rejected', 'outcome_unknown'\)\)/,
    );
    assert.match(
      sql,
      /REVOKE ALL ON TABLE private\.workspace_creation_policies FROM PUBLIC, anon, authenticated;/,
    );
    assert.match(
      sql,
      /REVOKE ALL ON TABLE private\.workspace_creation_intents FROM PUBLIC, anon, authenticated;/,
    );
  });

  it("hardens RPC functions with search_path='', revokes PUBLIC/anon, and grants only authenticated", () => {
    const rpcs = [
      "solodesk_workspace_bootstrap",
      "solodesk_create_workspace",
      "solodesk_reconcile_workspace_creation",
      "solodesk_list_selectable_workspaces",
      "solodesk_check_workspace_selectability",
    ];

    for (const rpc of rpcs) {
      assert.match(
        sql,
        new RegExp(`CREATE OR REPLACE FUNCTION public\\.${rpc}`),
      );
      assert.match(
        sql,
        new RegExp(
          `REVOKE ALL ON FUNCTION public\\.${rpc}.*FROM PUBLIC, anon;`,
        ),
      );
      assert.match(
        sql,
        new RegExp(
          `GRANT EXECUTE ON FUNCTION public\\.${rpc}.*TO authenticated;`,
        ),
      );
    }

    // search_path = ''
    const matches = [...sql.matchAll(/SET search_path = ''/g)];
    assert.ok(matches.length >= 6);
  });

  it("prohibits sensitive credentials and tokens in migration SQL", () => {
    assert.doesNotMatch(
      sql,
      /\b(access_token|refresh_token|raw_password|secret_key|private_key)\b/i,
    );
  });

  it("does not install the synthetic creation policy in production migrations", () => {
    assert.doesNotMatch(sql, /f012_v1_synthetic/);
  });

  it("installs the approved single production policy with IANA timezone validation", () => {
    assert.match(productionPolicySql, /'f012_v1_prod'/);
    assert.match(
      productionPolicySql,
      /ARRAY\['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'\]/,
    );
    assert.match(productionPolicySql, /'IANA'/);
    assert.match(
      productionPolicySql,
      /uq_workspace_creation_policies_single_enabled/,
    );
    assert.match(productionPolicySql, /pg_catalog\.pg_timezone_names/);
    assert.doesNotMatch(productionPolicySql, /\bXTS\b/);
  });
});
