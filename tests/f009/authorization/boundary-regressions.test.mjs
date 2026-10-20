import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthoritativeCommand } from '../../../supabase/functions/_shared/authoritative-command.ts';
import { evaluateEvidenceAuthority } from '../../../supabase/functions/_shared/evidence-authorization.ts';
import { projectCommandAudit } from '../../../supabase/functions/_shared/audit-projectors.ts';
import { handleCommandGateway } from '../../../supabase/functions/command-gateway/index.ts';
import { seedF009Fixtures, FIXTURES } from '../../../tooling/f009/seed-fixtures.mjs';
import { createTestRegistry, createTestEnvelope, makeId } from '../../../tooling/f009/test-helpers.mjs';

const context = { actorId: FIXTURES.userAlice, workspaceId: FIXTURES.wsAlpha, sessionObservation: 'active', authorityObservation: 'owner' };
const envelope = () => createTestEnvelope({ workspaceId: makeId('workspace', FIXTURES.wsAlpha) });

test('transaction rejects missing, suspended and asynchronous live membership', async () => {
  for (const live of [null, { role: 'owner', status: 'suspended' }, Promise.resolve({ role: 'owner', status: 'active' })]) {
    const db = seedF009Fixtures();
    let reads = 0;
    const reader = { getMembership: () => ++reads === 1 ? { role: 'owner', status: 'active' } : live };
    const result = await executeAuthoritativeCommand(db, reader, { rawRequest: envelope(), trustedContext: context, registry: createTestRegistry() });
    assert.equal(result.ok, false);
    assert.equal(db.getProgress(FIXTURES.wsAlpha), 0n);
    db.db.close();
  }
});

test('audit grant cannot cross workspace, actor, action, purpose or resource boundaries', async () => {
  const base = { workspace_id: FIXTURES.wsAlpha, subject_id: FIXTURES.userBob, subject_kind: 'member', action: 'audit_read', starts_at: '2020-01-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z' };
  for (const mismatch of [{ workspace_id: FIXTURES.wsBeta }, { subject_id: FIXTURES.userAlice }, { action: 'audit_export' }, { resource_id: 'private' }, { resource_kind: 'doc' }, { purpose_code: 'support' }, { expires_at: 'invalid' }]) {
    const result = await evaluateEvidenceAuthority({ verifiedActorId: FIXTURES.userBob, claimedWorkspaceId: FIXTURES.wsAlpha, requiredAction: 'audit_read' }, { getMembership: () => ({ role: 'contributor', status: 'active' }), getAuditGrant: () => ({ ...base, ...mismatch }) });
    assert.equal(result.authorized, false);
  }
});

test('unknown audit projectors copy no arbitrary payload fields', () => {
  assert.deepEqual(projectCommandAudit('unknown', { name: 'secret', customId: 'secret', action: 'secret' }).summary, {});
});

test('gateway requires verified credentials and serializes bigint receipts exactly', async () => {
  const db = seedF009Fixtures();
  const body = envelope();
  const request = () => new Request('https://example.test', { method: 'POST', body: JSON.stringify(body) });
  const options = { db, registry: createTestRegistry(), membershipReader: db, authenticate: async () => context };
  assert.equal((await handleCommandGateway(request(), () => null)).status, 503);
  assert.equal((await handleCommandGateway(request(), () => null, undefined, { ...options, authenticate: async () => null })).status, 401);
  const response = await handleCommandGateway(request(), () => null, undefined, options);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.receipt.progress_position, '1');
  assert.equal(data.receipt.actor_id, FIXTURES.userAlice);
  assert.throws(() => db.db.prepare("UPDATE command_receipts SET archived_at = ?, correlation_id = 'tampered'").run(new Date().toISOString()), /Immutable/);
  db.db.close();
});

test('revision and progress integers above Number.MAX_SAFE_INTEGER remain exact', async () => {
  const db = seedF009Fixtures();
  const revision = 9007199254740993n;
  db.updateTargetRevision(FIXTURES.wsAlpha, 'doc', 'doc_alpha_01', revision);
  db.db.prepare('INSERT INTO workspace_command_progress (workspace_id, last_position, updated_at) VALUES (?, ?, ?)').run(FIXTURES.wsAlpha, revision, new Date().toISOString());
  const rawRequest = createTestEnvelope({ workspaceId: makeId('workspace', FIXTURES.wsAlpha), expectedRevision: String(revision) });
  const result = await executeAuthoritativeCommand(db, db, { rawRequest, trustedContext: context, registry: createTestRegistry() });
  assert.equal(result.ok, true);
  const receipt = db.getReceiptById(FIXTURES.wsAlpha, result.receipt.receipt_id);
  assert.equal(receipt.prior_revision, revision);
  assert.equal(receipt.committed_revision, revision + 1n);
  assert.equal(receipt.progress_position, revision + 1n);
  db.db.close();
});
