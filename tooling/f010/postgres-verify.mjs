import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const root = mkdtempSync(path.join(tmpdir(), "solodesk-f010-postgres-"));
const binaries = process.env.F010_POSTGRES_BIN || "/usr/lib/postgresql/18/bin";
const env = { ...process.env, PGHOST: root, PGPORT: "5432", PGUSER: process.env.USER, PGDATABASE: "postgres" };
function run(name, args, input) {
  const result = spawnSync(path.join(binaries, name), args, { env, input, encoding: "utf8", timeout: 30000 });
  if (result.status !== 0) throw new Error(`${name}: ${result.stderr || result.stdout || result.error}`);
  return result.stdout.trim();
}
function sql(input) { return run("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], input); }
let started = false;
try {
  run("initdb", ["-D", path.join(root, "data"), "-A", "trust", "--no-locale", "-E", "UTF8"]);
  run("pg_ctl", ["-D", path.join(root, "data"), "-l", path.join(root, "server.log"), "-o", `-F -k ${root} -c listen_addresses=''`, "-w", "start"]);
  started = true;
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS
      $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid NOT NULL);`);
  for (const file of [
    "supabase/migrations/20261020000009_device_enrollment.sql",
    "supabase/migrations/20261020000010_f010_authenticated_runtime.sql",
  ]) sql(readFileSync(file, "utf8"));

  const subject = crypto.randomUUID(), session = crypto.randomUUID();
  const claims = JSON.stringify({ iss: "https://project.supabase.co/auth/v1", sub: subject, role: "authenticated", session_id: session });
  sql(`INSERT INTO auth.sessions VALUES ('${session}','${subject}');`);
  const input = {
    profileReference: "profile:postgres-test", profileGeneration: 1,
    installationContextId: "installation-postgres", deviceContextDigest: "b".repeat(64),
    deviceLabel: "جهاز Test", platform: "linux", architecture: "x64", appVersion: "0.0.0",
    protectionProofReference: "os-protection:test", payloadVersion: 1,
  };
  const request = {
    ...input, enrollmentIntentId: crypto.randomUUID(),
    requestDigest: crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))))).digest("hex"),
  };
  const invoke = (statement, jwt = claims) => JSON.parse(sql(`SET request.jwt.claims = '${jwt}'; SET ROLE authenticated; ${statement}`).split("\n").at(-1));
  const enroll = `SELECT public.solodesk_enroll_device('${JSON.stringify(request)}'::jsonb);`;
  const first = invoke(enroll), replay = invoke(enroll);
  assert.equal(first.status, "enrolled");
  assert.deepEqual(replay, first);
  assert.deepEqual(invoke(`SELECT public.solodesk_enrollment_result('${request.enrollmentIntentId}');`), first);
  assert.match(sql("SELECT count(*) FROM private.device_enrollments;"), /^1$/);
  assert.equal(sql("SELECT has_function_privilege('anon','public.solodesk_enroll_device(jsonb)','EXECUTE');"), "f");
  assert.equal(sql("SELECT has_function_privilege('authenticated','private.enroll_device(text,text,uuid,text,bigint,text,text,text,text,text,text,text,text,smallint)','EXECUTE');"), "f");
  const foreign = crypto.randomUUID(), foreignSession = crypto.randomUUID();
  sql(`INSERT INTO auth.sessions VALUES ('${foreignSession}','${foreign}');`);
  assert.deepEqual(invoke(`SELECT public.solodesk_enrollment_result('${request.enrollmentIntentId}');`,
    JSON.stringify({ iss: "https://project.supabase.co/auth/v1", sub: foreign, role: "authenticated", session_id: foreignSession })), { status: "outcome_unknown" });
  assert.throws(() => invoke(enroll, JSON.stringify({ iss: "https://project.supabase.co/auth/v1", sub: subject, role: "authenticated", session_id: crypto.randomUUID() })), /current account required/);
  assert.throws(() => invoke(`SELECT public.solodesk_enroll_device('${JSON.stringify({ ...request, deviceLabel: "changed" })}'::jsonb);`), /invalid request digest/);
  const changed = { ...input, deviceLabel: "changed" };
  const changedRequest = { ...request, ...changed, requestDigest: crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(changed).sort(([a], [b]) => a.localeCompare(b))))).digest("hex") };
  assert.throws(() => invoke(`SELECT public.solodesk_enroll_device('${JSON.stringify(changedRequest)}'::jsonb);`), /changed enrollment intent/);
  assert.match(sql("SELECT count(*) FROM private.device_enrollment_receipts;"), /^1$/);
  console.log("F010 PostgreSQL: actual migrations, enrollment, replay, reconciliation, foreign account, revoked session, changed digest and privileges passed.");
} finally {
  if (started) run("pg_ctl", ["-D", path.join(root, "data"), "-m", "fast", "-w", "stop"]);
  rmSync(root, { recursive: true, force: true });
}
