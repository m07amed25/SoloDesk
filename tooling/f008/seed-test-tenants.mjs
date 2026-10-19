// Synthetic multi-tenant test seeder for F008 verification
// Generates:
// - Workspace Alpha (ws_alpha_01): Owner (usr_alice), Contributor (usr_bob)
// - Workspace Beta (ws_beta_02): Owner (usr_charlie)
// Along with representative clients, projects, tasks, time entries, storage objects, and quota profiles.

import { createF008Emulator } from "./emulator.mjs";

export function seedTenants(emulator) {
  const db = emulator.rawDb;

  // 1. Tenants
  const insertTenant = db.prepare(`
    INSERT OR REPLACE INTO workspace_tenants (id, legal_name, trade_name, default_timezone, default_currency, default_locale, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTenant.run(
    "ws_alpha_01",
    "Alpha Consulting LLC",
    "Alpha Studio",
    "UTC",
    "USD",
    "en",
    "active",
  );
  insertTenant.run(
    "ws_beta_02",
    "Beta Systems FZ-LLC",
    "Beta Labs",
    "UTC",
    "EUR",
    "en",
    "active",
  );

  // 2. Memberships
  const insertMember = db.prepare(`
    INSERT OR REPLACE INTO workspace_memberships (workspace_id, user_id, role, status, invited_email)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMember.run(
    "ws_alpha_01",
    "usr_alice",
    "owner",
    "active",
    "alice@alpha.internal",
  );
  insertMember.run(
    "ws_alpha_01",
    "usr_bob",
    "contributor",
    "active",
    "bob@alpha.internal",
  );
  insertMember.run(
    "ws_beta_02",
    "usr_charlie",
    "owner",
    "active",
    "charlie@beta.internal",
  );

  // 3. Quota Profiles
  const insertQuota = db.prepare(`
    INSERT OR REPLACE INTO provider_quota_profiles
    (workspace_id, db_storage_bytes, object_storage_bytes, monthly_egress_bytes, db_storage_limit_bytes, object_storage_limit_bytes, monthly_egress_limit_bytes, quota_tier, provider_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuota.run(
    "ws_alpha_01",
    10485760,
    52428800,
    104857600,
    524288000,
    1073741824,
    5368709120,
    "normal",
    "operational",
  );
  insertQuota.run(
    "ws_beta_02",
    5242880,
    20971520,
    52428800,
    524288000,
    1073741824,
    5368709120,
    "normal",
    "operational",
  );

  // 4. Domain Data - Workspace Alpha
  const insertClient = db.prepare(`
    INSERT OR REPLACE INTO clients (workspace_id, id, name, currency, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertClient.run(
    "ws_alpha_01",
    "cli_alpha_01",
    "Acme Global",
    "USD",
    "active",
  );
  insertClient.run(
    "ws_beta_02",
    "cli_beta_01",
    "Beta Industries",
    "EUR",
    "active",
  );

  const insertProject = db.prepare(`
    INSERT OR REPLACE INTO projects (workspace_id, id, client_id, name, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertProject.run(
    "ws_alpha_01",
    "prj_alpha_01",
    "cli_alpha_01",
    "Alpha Web Redesign",
    "active",
  );
  insertProject.run(
    "ws_beta_02",
    "prj_beta_01",
    "cli_beta_01",
    "Beta ERP Integration",
    "active",
  );

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (workspace_id, id, project_id, title, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTask.run(
    "ws_alpha_01",
    "tsk_alpha_01",
    "prj_alpha_01",
    "Design wireframes",
    "todo",
  );
  insertTask.run(
    "ws_beta_02",
    "tsk_beta_01",
    "prj_beta_01",
    "Deploy schema",
    "todo",
  );

  const insertTime = db.prepare(`
    INSERT OR REPLACE INTO time_entries (workspace_id, id, task_id, user_id, duration_seconds, work_date, billable, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTime.run(
    "ws_alpha_01",
    "tim_alpha_01",
    "tsk_alpha_01",
    "usr_alice",
    3600,
    "2026-10-19",
    1,
    "draft",
  );

  // 5. Seed Files in Storage Emulator & Metadata Table
  const insertStorageObj = db.prepare(`
    INSERT OR REPLACE INTO tenant_storage_objects
    (id, workspace_id, bucket_id, storage_path, content_type, size_bytes, sha256_hash, access_tier, owning_entity_type, owning_entity_id, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStorageObj.run(
    "obj_01",
    "ws_alpha_01",
    "workspaces",
    "workspaces/ws_alpha_01/invoices/inv_01/obj_01-statement.pdf",
    "application/pdf",
    1024,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "private",
    "invoice",
    "inv_01",
    "usr_alice",
  );

  insertStorageObj.run(
    "obj_02",
    "ws_beta_02",
    "workspaces",
    "workspaces/ws_beta_02/contracts/cnt_01/obj_02-agreement.pdf",
    "application/pdf",
    2048,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "private",
    "contract",
    "cnt_01",
    "usr_charlie",
  );

  emulator.setAuth("usr_alice");
  emulator.storage
    .from("workspaces")
    .upload(
      "workspaces/ws_alpha_01/invoices/inv_01/obj_01-statement.pdf",
      Buffer.from("%PDF-1.4 synthetic alpha statement"),
      { contentType: "application/pdf" },
    );

  emulator.setAuth("usr_charlie");
  emulator.storage
    .from("workspaces")
    .upload(
      "workspaces/ws_beta_02/contracts/cnt_01/obj_02-agreement.pdf",
      Buffer.from("%PDF-1.4 synthetic beta contract"),
      { contentType: "application/pdf" },
    );

  // Clear auth context after seeding
  emulator.setAuth(null);
  return emulator;
}

// Standalone execution test
if (process.argv[1] && process.argv[1].endsWith("seed-test-tenants.mjs")) {
  const emulator = createF008Emulator();
  seedTenants(emulator);
  console.log(
    "✔ Successfully seeded synthetic tenants: Workspace Alpha (ws_alpha_01) and Beta (ws_beta_02)",
  );
}
