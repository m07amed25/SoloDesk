import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20261023000013_f013_member_invitations.sql",
    import.meta.url,
  ),
  "utf8",
);
const digestSearchPathRepair = readFileSync(
  new URL(
    "../../../supabase/migrations/20261023000014_f013_invitation_digest_search_path.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("T018: F013 Member Invitations Schema, Constraints and Security", () => {
  it("creates private.invitation_policies with immutable revision, offer_ref bounds, and revoked public access", () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.invitation_policies/);
    assert.match(sql, /policy_id uuid PRIMARY KEY/);
    assert.match(sql, /revision bigint NOT NULL CHECK \(revision > 0\)/);
    assert.match(sql, /offer_ref text NOT NULL CHECK \(char_length\(offer_ref\) BETWEEN 1 AND 64\)/);
    assert.match(sql, /role_ref text NOT NULL CHECK \(char_length\(role_ref\) BETWEEN 1 AND 64\)/);
    assert.match(sql, /scope_ref text NOT NULL CHECK \(char_length\(scope_ref\) BETWEEN 1 AND 64\)/);
    assert.match(sql, /CONSTRAINT uq_invitation_policy_workspace_rev_offer UNIQUE \(workspace_id, revision, offer_ref\)/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.invitation_policies FROM PUBLIC, anon, authenticated;/);
  });

  it("creates private.workspace_invitations with single binding form, lifecycle check, and partial pending index", () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.workspace_invitations/);
    assert.match(sql, /invitation_id uuid PRIMARY KEY/);
    assert.match(sql, /recipient_binding_key bytea NOT NULL/);
    assert.match(sql, /CONSTRAINT chk_invitation_expiry CHECK \(expires_at > created_at\)/);
    assert.match(sql, /CONSTRAINT chk_invitation_binding CHECK/);
    assert.match(sql, /CONSTRAINT chk_invitation_status_lifecycle CHECK/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_pending/);
    assert.match(sql, /WHERE status = 'pending'/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_workspace_invitations_cursor/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expiry/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.workspace_invitations FROM PUBLIC, anon, authenticated;/);
  });

  it("creates private.invitation_generations with unique selector, one current generation, and digest comparison", () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.invitation_generations/);
    assert.match(sql, /generation_id uuid PRIMARY KEY/);
    assert.match(sql, /selector text NOT NULL CHECK \(char_length\(selector\) BETWEEN 16 AND 64\)/);
    assert.match(sql, /secret_digest bytea NOT NULL/);
    assert.match(sql, /CONSTRAINT uq_invitation_generation_selector UNIQUE \(selector\)/);
    assert.match(sql, /CONSTRAINT uq_invitation_generation_num UNIQUE \(invitation_id, generation_number\)/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_generations_current/);
    assert.match(sql, /WHERE status = 'current'/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.invitation_generations FROM PUBLIC, anon, authenticated;/);
  });

  it("creates delivery and redemption attempts tables with constraints and revoked public access", () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.invitation_delivery_attempts/);
    assert.match(sql, /CONSTRAINT uq_delivery_attempt_gen_num UNIQUE \(generation_id, attempt_number\)/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.invitation_delivery_attempts FROM PUBLIC, anon, authenticated;/);

    assert.match(sql, /CREATE TABLE IF NOT EXISTS private\.invitation_redemption_attempts/);
    assert.match(sql, /continuation_digest bytea NOT NULL UNIQUE/);
    assert.match(sql, /CONSTRAINT chk_redemption_expiry CHECK \(expires_at > created_at\)/);
    assert.match(sql, /REVOKE ALL ON TABLE private\.invitation_redemption_attempts FROM PUBLIC, anon, authenticated;/);
  });

  it("extends public.workspace_memberships with provenance, provenance constraints, and hardens legacy rows", () => {
    assert.match(sql, /ALTER TABLE public\.workspace_memberships/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS account_issuer text/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS accepted_invitation_id uuid/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS accepted_generation_id uuid/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS accepted_policy_id uuid/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS accepted_policy_revision bigint/);
    assert.match(sql, /chk_memberships_accepted_provenance/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_accepted_invitation/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_accepted_generation/);
    assert.match(sql, /UPDATE public\.workspace_memberships\s+SET invitation_token = NULL/);
    assert.match(sql, /UPDATE public\.workspace_memberships\s+SET status = 'revoked'\s+WHERE status = 'invited'/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.workspace_memberships FROM PUBLIC, anon, authenticated;/);
  });

  it("defines restricted RPC functions with search_path = '' and explicit grants", () => {
    const rpcs = [
      "solodesk_invitation_get_policy",
      "solodesk_invitation_create",
      "solodesk_invitation_resend",
      "solodesk_invitation_revoke",
      "solodesk_invitation_list",
      "solodesk_invitation_reconcile",
      "solodesk_invitation_exchange",
      "solodesk_invitation_review",
      "solodesk_invitation_accept",
    ];

    for (const rpc of rpcs) {
      assert.match(sql, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${rpc}`));
    }

    const matches = [...sql.matchAll(/SET search_path = ''/g)];
    assert.ok(matches.length >= 9);

    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.solodesk_invitation_get_policy\(text\) TO authenticated;/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.solodesk_invitation_exchange\(text, bytea, bytea\) TO anon, authenticated;/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.solodesk_invitation_accept\(bytea, uuid, text, bigint\) TO authenticated;/);
  });

  it("makes pgcrypto available to invitation creation through trusted schemas only", () => {
    assert.match(
      digestSearchPathRepair,
      /ALTER FUNCTION public\.solodesk_invitation_create\([\s\S]*\) SET search_path = pg_catalog, extensions;/,
    );
    assert.doesNotMatch(digestSearchPathRepair, /\bpublic\s*(?:,|;)/i);
  });

  it("does not leak plaintext credentials, tokens, or private secrets in migration SQL", () => {
    assert.doesNotMatch(sql, /\b(access_token|refresh_token|raw_password|private_key)\b/i);
  });
});
