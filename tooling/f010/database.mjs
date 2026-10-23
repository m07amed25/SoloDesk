import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import crypto from "node:crypto";

process.loadEnvFile(".env.local");
const [mode, host] = process.argv.slice(2);
if (!["inspect", "plan", "deploy", "verify"].includes(mode) || !host?.endsWith(".pooler.supabase.com"))
  throw new Error("usage: node tooling/f010/database.mjs inspect|plan|deploy|verify <session-pooler-host>");
const project = new URL(process.env.VITE_SUPABASE_URL).hostname.split(".")[0];
if (!process.env.DATABASE_PASSWORD) throw new Error("missing_database_password");
const env = {
  ...process.env, PGHOST: host, PGPORT: "5432", PGDATABASE: "postgres",
  PGUSER: `postgres.${project}`, PGPASSWORD: process.env.DATABASE_PASSWORD,
  PGSSLMODE: "verify-full", PGSSLROOTCERT: process.env.SUPABASE_SSL_ROOT_CERT || ".verification/supabase-root-ca.crt", PGCONNECT_TIMEOUT: "10",
};
function query(input) {
  const result = spawnSync("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    env, input, encoding: "utf8", timeout: 60000,
  });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error || "database_failed"));
  return result.stdout.trim();
}
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const migrations = readdirSync("supabase/migrations")
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort()
  .map((file) => {
    const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/);
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    return { version, name, sql, sha256: crypto.createHash("sha256").update(sql).digest("hex") };
  });

if (mode === "inspect") {
  console.log(query("BEGIN READ ONLY; SELECT version(); SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version; SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('private','supabase_migrations') ORDER BY 1,2; COMMIT;"));
} else if (mode === "plan" || mode === "deploy") {
  const chunks = [
    "BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s';",
    "SELECT pg_advisory_xact_lock(hashtextextended('solodesk-migrations',0));",
    "CREATE SCHEMA IF NOT EXISTS supabase_migrations;",
    "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text);",
  ];
  for (const { version, name, sql, sha256 } of migrations) {
    const existing = query(`SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL;`);
    let status = "apply";
    if (existing === "t") {
      const recorded = query(`SELECT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=${quote(version)});`);
      if (recorded !== "t" && recorded !== "f") throw new Error("migration_history_read_failed");
      const applied = query(`SELECT COALESCE(array_to_string(statements,E'\\n'),'') FROM supabase_migrations.schema_migrations WHERE version=${quote(version)};`);
      if (applied && applied.trim() !== sql.trim()) throw new Error(`migration_drift_${version}`);
      if (recorded === "t") status = "skip";
    }
    console.log(JSON.stringify({ migration: version, status, sha256 }));
    if (status === "apply") {
      chunks.push(sql,
        `INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES (${quote(version)},${quote(name)},ARRAY[${quote(sql)}]);`);
    }
  }
  chunks.push("COMMIT;");
  if (mode === "deploy") {
    query(chunks.join("\n"));
    console.log("Pending migrations committed atomically.");
  }
}
if (mode === "deploy" || mode === "verify") {
  console.log(query(`BEGIN READ ONLY;
    SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='private' AND relkind='r' ORDER BY relname;
    SELECT count(*) FILTER (WHERE enabled) AS enabled_creation_policies,
      count(*) FILTER (WHERE version ILIKE '%synthetic%' OR version ILIKE '%test%') AS synthetic_creation_policies
      FROM private.workspace_creation_policies;
    SELECT version, enabled, array_to_string(locales, ','),
      array_to_string(currency_codes, ','), timezone_catalogue,
      array_to_string(required_profile_fields, ',')
      FROM private.workspace_creation_policies WHERE enabled ORDER BY created_at DESC;
    SELECT has_function_privilege('anon','public.solodesk_enroll_device(jsonb)','EXECUTE') AS anon_enroll,
      has_function_privilege('authenticated','public.solodesk_enroll_device(jsonb)','EXECUTE') AS signed_in_enroll,
      has_function_privilege('authenticated','private.enroll_device(text,text,uuid,text,bigint,text,text,text,text,text,text,text,text,smallint)','EXECUTE') AS direct_private_enroll;
    SELECT p.proname, p.prosecdef,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN (
        'solodesk_workspace_bootstrap', 'solodesk_create_workspace',
        'solodesk_reconcile_workspace_creation', 'solodesk_list_selectable_workspaces',
        'solodesk_check_workspace_selectability'
      ) ORDER BY p.proname;
    SELECT p.proname, array_to_string(p.proconfig, ',') AS function_config
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='solodesk_invitation_create';
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
      ORDER BY c.relname;
    DO $$ BEGIN
      PERFORM public.solodesk_enrollment_result('00000000-0000-4000-8000-000000000001');
      RAISE EXCEPTION 'missing-session check failed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
    COMMIT;`));
  console.log(query(`BEGIN;
    DO $$ BEGIN
      INSERT INTO public.workspace_tenants (
        id, display_name, default_timezone, default_currency, default_locale
      ) VALUES (
        lower(gen_random_uuid()::text), 'Timezone verification',
        'Not/A_Real_Timezone', 'EGP', 'en'
      );
      RAISE EXCEPTION 'timezone validation missing';
    EXCEPTION WHEN check_violation THEN NULL; END $$;
    ROLLBACK;`));
}
