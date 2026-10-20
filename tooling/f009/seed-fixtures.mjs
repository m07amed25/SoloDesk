import { F009Emulator } from "./emulator.mjs";

export const FIXTURES = {
  wsAlpha: "00000001-1111-4111-8111-111111111111",
  wsBeta: "00000002-1111-4111-8111-111111111111",
  userAlice: "00000003-1111-4111-8111-111111111111",
  userAuditor: "00000004-1111-4111-8111-111111111111",
  userBob: "00000005-1111-4111-8111-111111111111",
  userRevoked: "00000006-1111-4111-8111-111111111111",
  userCharlie: "00000007-1111-4111-8111-111111111111",
  userDavid: "00000008-1111-4111-8111-111111111111",
};

export function seedF009Fixtures(emulator = new F009Emulator()) {
  // 1. Two Workspaces: Alpha and Beta
  emulator.addWorkspace(FIXTURES.wsAlpha, "Workspace Alpha");
  emulator.addWorkspace(FIXTURES.wsBeta, "Workspace Beta");

  // Set write state to ready
  emulator.setWriteState(FIXTURES.wsAlpha, "ready");
  emulator.setWriteState(FIXTURES.wsBeta, "ready");

  // 2. Memberships
  // Workspace Alpha
  emulator.addMember(FIXTURES.wsAlpha, FIXTURES.userAlice, "owner", "active");
  emulator.addMember(FIXTURES.wsAlpha, FIXTURES.userAuditor, "admin", "active");
  emulator.addMember(
    FIXTURES.wsAlpha,
    FIXTURES.userBob,
    "contributor",
    "active",
  );
  emulator.addMember(
    FIXTURES.wsAlpha,
    FIXTURES.userRevoked,
    "contributor",
    "revoked",
  );

  // Workspace Beta
  emulator.addMember(FIXTURES.wsBeta, FIXTURES.userCharlie, "owner", "active");
  emulator.addMember(FIXTURES.wsBeta, FIXTURES.userDavid, "admin", "active");

  // 3. Synthetic Revisioned Domain Targets
  emulator.addTarget(FIXTURES.wsAlpha, "doc", "doc_alpha_01", 0);
  emulator.addTarget(FIXTURES.wsBeta, "doc", "doc_beta_01", 0);

  // 4. Audit Access Grants (for auditor and export)
  const now = new Date();
  const future = new Date(Date.now() + 86400 * 1000 * 30); // +30 days

  emulator.addAuditGrant({
    grant_id: "grant_audit_read_alice",
    workspace_id: FIXTURES.wsAlpha,
    subject_kind: "member",
    subject_id: FIXTURES.userAlice,
    action: "audit_read",
    purpose_code: "internal_compliance",
    granted_by: FIXTURES.userAlice,
    starts_at: now.toISOString(),
    expires_at: future.toISOString(),
    policy_version: "v1",
  });

  emulator.addAuditGrant({
    grant_id: "grant_audit_export_alice",
    workspace_id: FIXTURES.wsAlpha,
    subject_kind: "member",
    subject_id: FIXTURES.userAlice,
    action: "audit_export",
    purpose_code: "tax_audit",
    granted_by: FIXTURES.userAlice,
    starts_at: now.toISOString(),
    expires_at: future.toISOString(),
    policy_version: "v1",
  });

  emulator.addAuditGrant({
    grant_id: "grant_audit_read_auditor",
    workspace_id: FIXTURES.wsAlpha,
    subject_kind: "member",
    subject_id: FIXTURES.userAuditor,
    action: "audit_read",
    purpose_code: "routine_audit",
    granted_by: FIXTURES.userAlice,
    starts_at: now.toISOString(),
    expires_at: future.toISOString(),
    policy_version: "v1",
  });

  return emulator;
}

// Standalone execution
if (process.argv[1]?.endsWith("seed-fixtures.mjs")) {
  seedF009Fixtures();
  console.log("F009 fixtures successfully seeded into in-memory database.");
}
