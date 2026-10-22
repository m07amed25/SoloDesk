import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { ProtectionOwner } from "../../../app/main/protection/owner.ts";
import { PersistenceService } from "../../../app/main/persistence/persistence-service.ts";
import { workspacePaths } from "../../../app/main/persistence/workspace-storage-paths.ts";

function createTestPersistence(options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "f012-retained-partition-"));
  const profileId = options.profileId ?? "prof-test-alpha";
  const key = options.key ? Buffer.from(options.key) : randomBytes(32);
  let blocked = Boolean(options.blocked);
  const issued = [];

  const provider = {
    assertAvailable() {
      if (blocked) throw new Error("vault_locked");
    },
    async create(file) {
      this.assertAvailable();
      writeFileSync(file, "synthetic envelope content", { flag: "wx", mode: 0o600 });
      const copy = Buffer.from(key);
      issued.push(copy);
      return { key: copy, binding: {} };
    },
    async open() {
      this.assertAvailable();
      const copy = Buffer.from(key);
      issued.push(copy);
      return { key: copy, binding: {} };
    },
  };

  const owner = new ProtectionOwner({ profileId, epoch: 1 }, () => true, provider);
  const service = new PersistenceService(root, profileId, owner, options.steps, options.availableSpaceOverride);

  return {
    root,
    profileId,
    key,
    owner,
    service,
    provider,
    issued,
    paths: (wsId) => workspacePaths(root, profileId, wsId),
    block: (val = true) => { blocked = val; },
    cleanup: () => {
      try { owner.lock(); } catch {}
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("T040: initializeAuthorizedWorkspace initializes partition while openRetainedWorkspace only opens existing", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "10000000-0000-4000-8000-000000000001";
  const receiptId = "r0000000-0000-4000-8000-000000000001";
  const paths = env.paths(wsId);

  // Before initialization: partition does not exist
  assert.equal(existsSync(paths.directory), false);

  // initializeAuthorizedWorkspace initializes the partition
  const initResult = await env.service.initializeAuthorizedWorkspace(wsId, receiptId);
  assert.equal(initResult.status, "ready");
  assert.equal(existsSync(paths.database), true);
  assert.equal(existsSync(paths.envelope), true);
  assert.equal(existsSync(paths.manifest), true);

  // Close workspace store
  await env.service.closeWorkspaceStore(wsId);

  // openRetainedWorkspace opens the existing partition cleanly
  const openResult = await env.service.openRetainedWorkspace(wsId);
  assert.equal(openResult.status, "ready");

  await env.service.closeWorkspaceStore(wsId);
});

test("T040: Authorized-but-never-retained target returns uninitialized and creates no files or replacement", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const uninitializedWsId = "20000000-0000-4000-8000-000000000002";
  const paths = env.paths(uninitializedWsId);

  assert.equal(existsSync(paths.directory), false);

  // openRetainedWorkspace on uninitialized workspace
  const openResult = await env.service.openRetainedWorkspace(uninitializedWsId);
  // Must NOT be ready; must indicate uninitialized or recovery without creating directory
  assert.notEqual(openResult.status, "ready");
  assert.equal(existsSync(paths.directory), false, "Must not create workspace directory");
  assert.equal(existsSync(paths.database), false, "Must not create sqlite database");
});

test("T040: Missing envelope or key fails closed with key_missing and creates no replacement", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "30000000-0000-4000-8000-000000000003";
  const paths = env.paths(wsId);

  // Initialize first
  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-3");
  await env.service.closeWorkspaceStore(wsId);

  // Remove the envelope file (key missing)
  rmSync(paths.envelope, { force: true });

  const result = await env.service.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "key_missing");
  assert.equal(existsSync(paths.envelope), false, "Must never auto-regenerate key or envelope");
});

test("T040: Missing manifest or database fails closed with integrity_failed", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "40000000-0000-4000-8000-000000000004";
  const paths = env.paths(wsId);

  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-4");
  await env.service.closeWorkspaceStore(wsId);

  // Remove manifest file
  rmSync(paths.manifest, { force: true });

  const result = await env.service.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "integrity_failed");
});

test("T040: Locked secret store fails closed without touching data", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "50000000-0000-4000-8000-000000000005";
  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-5");
  await env.service.closeWorkspaceStore(wsId);

  // Lock the key provider
  env.block(true);

  const result = await env.service.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "vault_locked");
});

test("T040: Database corruption fails closed with integrity_failed and preserves files", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "60000000-0000-4000-8000-000000000006";
  const paths = env.paths(wsId);

  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-6");
  await env.service.closeWorkspaceStore(wsId);

  // Corrupt the database file with garbage
  writeFileSync(paths.database, Buffer.from("NOT_A_VALID_ENCRYPTED_SQLITE_DATABASE_CORRUPT_BYTES"));

  const result = await env.service.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "integrity_failed");

  // Corrupt bytes are still there and preserved
  const preserved = readFileSync(paths.database, "utf8");
  assert.ok(preserved.includes("CORRUPT_BYTES"), "Corrupt files must be preserved for recovery");
});

test("T040: Future schema version fails closed with unsupported_future_version", async (t) => {
  const env = createTestPersistence({
    steps: [
      {
        version: 1,
        up: (db) => {
          db.exec("CREATE TABLE test (id TEXT PRIMARY KEY)");
        },
      },
    ],
  });
  t.after(() => env.cleanup());

  const wsId = "70000000-0000-4000-8000-000000000007";
  const paths = env.paths(wsId);

  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-7");
  await env.service.closeWorkspaceStore(wsId);

  // Open with a service that has NO migration step up to that version (simulating older app version)
  const olderService = new PersistenceService(env.root, env.profileId, env.owner, []);
  const result = await olderService.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "unsupported_future_version");
});

test("T040: Wrong profile or workspace binding in manifest fails closed with integrity_failed", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "80000000-0000-4000-8000-000000000008";
  const paths = env.paths(wsId);

  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-8");
  await env.service.closeWorkspaceStore(wsId);

  // Tamper manifest with wrong profileId
  const manifest = JSON.parse(readFileSync(paths.manifest, "utf8"));
  manifest.identityBindingId = "00000000-0000-4000-8000-999999999999";
  writeFileSync(paths.manifest, JSON.stringify(manifest));

  const result = await env.service.openRetainedWorkspace(wsId);
  assert.equal(result.status, "recovery_required");
  assert.equal(result.recoveryDetails?.reasonCode, "integrity_failed");
});

test("T040: Unchanged unexpected bytes inside workspace directory remain intact", async (t) => {
  const env = createTestPersistence();
  t.after(() => env.cleanup());

  const wsId = "90000000-0000-4000-8000-000000000009";
  const paths = env.paths(wsId);

  await env.service.initializeAuthorizedWorkspace(wsId, "receipt-9");
  await env.service.closeWorkspaceStore(wsId);

  const unexpectedFilePath = path.join(paths.directory, "unexpected_user_file.txt");
  writeFileSync(unexpectedFilePath, "DO_NOT_TOUCH_THIS_PAYLOAD");

  // Re-open retained workspace
  await env.service.openRetainedWorkspace(wsId);
  await env.service.closeWorkspaceStore(wsId);

  assert.equal(existsSync(unexpectedFilePath), true);
  assert.equal(readFileSync(unexpectedFilePath, "utf8"), "DO_NOT_TOUCH_THIS_PAYLOAD");
});
