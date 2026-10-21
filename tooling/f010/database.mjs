import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

process.loadEnvFile(".env.local");
const [mode, host] = process.argv.slice(2);
if (!["inspect", "deploy", "verify"].includes(mode) || !host?.endsWith(".pooler.supabase.com"))
  throw new Error("usage: node tooling/f010/database.mjs inspect|deploy|verify <session-pooler-host>");
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
if (mode === "inspect") {
  console.log(query("BEGIN READ ONLY; SELECT version(); SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('private','supabase_migrations') ORDER BY 1,2; COMMIT;"));
} else if (mode === "deploy") {
  const migrations = [
    ["20261020000009", "device_enrollment"],
    ["20261020000010", "f010_authenticated_runtime"],
  ];
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  const chunks = [
    "BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s';",
    "SELECT pg_advisory_xact_lock(hashtextextended('solodesk-f010-migrations',0));",
    "CREATE SCHEMA IF NOT EXISTS supabase_migrations;",
    "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text);",
  ];
  for (const [version, name] of migrations) {
    const sql = readFileSync(`supabase/migrations/${version}_${name}.sql`, "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const existing = query(`SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL;`);
    if (existing === "t") {
      const applied = query(`SELECT COALESCE(array_to_string(statements,E'\\n'),'') FROM supabase_migrations.schema_migrations WHERE version=${quote(version)};`);
      if (applied && applied.trim() !== sql.trim()) throw new Error(`migration_drift_${version}`);
    }
    chunks.push(`SELECT NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=${quote(version)}) AS apply_${version} \\gset`);
    chunks.push(`\\if :apply_${version}`, sql,
      `INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES (${quote(version)},${quote(name)},ARRAY[${quote(sql)}]);`,
      "\\endif");
    console.log(JSON.stringify({ migration: version, sha256: checksum }));
  }
  chunks.push("COMMIT;");
  query(chunks.join("\n"));
  console.log("F010 migrations committed atomically.");
}
if (mode !== "inspect") {
  console.log(query(`BEGIN READ ONLY;
    SELECT version, name FROM supabase_migrations.schema_migrations WHERE version IN ('20261020000009','20261020000010') ORDER BY version;
    SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='private' AND relkind='r' ORDER BY relname;
    SELECT has_function_privilege('anon','public.solodesk_enroll_device(jsonb)','EXECUTE') AS anon_enroll,
      has_function_privilege('authenticated','public.solodesk_enroll_device(jsonb)','EXECUTE') AS signed_in_enroll,
      has_function_privilege('authenticated','private.enroll_device(text,text,uuid,text,bigint,text,text,text,text,text,text,text,text,smallint)','EXECUTE') AS direct_private_enroll;
    DO $$ BEGIN
      PERFORM public.solodesk_enrollment_result('00000000-0000-4000-8000-000000000001');
      RAISE EXCEPTION 'missing-session check failed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
    COMMIT;`));
}
