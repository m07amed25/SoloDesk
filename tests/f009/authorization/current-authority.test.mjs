import { test } from "node:test";
import assert from "node:assert/strict";
import { executeAuthoritativeCommand } from "../../../supabase/functions/_shared/authoritative-command.ts";
import { evaluateEvidenceAuthority } from "../../../supabase/functions/_shared/evidence-authorization.ts";
import {
  seedF009Fixtures,
  FIXTURES,
} from "../../../tooling/f009/seed-fixtures.mjs";
import {
  createTestRegistry,
  createTestEnvelope,
  makeId,
} from "../../../tooling/f009/test-helpers.mjs";

test("Scenario 5: Current Authority and Zero Leakage (A-05–A-08, A-13, SC-003, SC-006)", async (t) => {
  const registry = createTestRegistry();
  const wsAlphaId = makeId("workspace", FIXTURES.wsAlpha);
  const aliceId = makeId("actor", FIXTURES.userAlice);
  const revokedId = makeId("actor", FIXTURES.userRevoked);
  const outsiderId = makeId("actor"); // Unknown actor UUID

  await t.test(
    "Revoked member rejected with non-disclosing error and zero domain effect (A-05, SC-003)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");

      const env = createTestEnvelope({
        workspaceId: wsAlphaId,
        operationId: opId,
        expectedRevision: "0",
        payload: {
          targetKind: "doc",
          targetId: "doc_alpha_01",
          action: "update",
          delta: 1,
        },
      });

      const trustedContext = {
        actorId: revokedId.value,
        workspaceId: wsAlphaId.value,
        sessionObservation: "obs_revoked",
        authorityObservation: "obs_revoked",
      };

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, false);
      assert.equal(output.status, "rejected");
      assert.equal(output.error.code, "SESSION_REVOKED");
      assert.equal(output.error.outcomeCertainty, "not_applied");

      // Zero domain effect
      const target = emulator.getTarget(
        FIXTURES.wsAlpha,
        "doc",
        "doc_alpha_01",
      );
      assert.equal(target.revision, 0n);
      assert.equal(emulator.getProgress(FIXTURES.wsAlpha), 0n);
    },
  );

  await t.test(
    "Outsider non-member denied with zero leakage (A-06, SC-006)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");

      const env = createTestEnvelope({
        workspaceId: wsAlphaId,
        operationId: opId,
        expectedRevision: "0",
      });

      const trustedContext = {
        actorId: outsiderId.value,
        workspaceId: wsAlphaId.value,
        sessionObservation: "obs_anon",
        authorityObservation: "obs_none",
      };

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, false);
      assert.equal(output.status, "rejected");
      assert.equal(output.error.code, "FORBIDDEN");
      assert.equal(output.error.outcomeCertainty, "not_applied");
    },
  );

  await t.test(
    "Cross-workspace target access rejected without disclosing existence (A-07, SC-006)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");

      // Alice is a member of Alpha. Attempts to target Beta's target 'doc_beta_01'
      const env = createTestEnvelope({
        workspaceId: wsAlphaId,
        operationId: opId,
        expectedRevision: "0",
        payload: {
          targetKind: "doc",
          targetId: "doc_beta_01", // Foreign target that exists in ws_beta
          action: "update",
          delta: 1,
        },
      });

      const trustedContext = {
        actorId: aliceId.value,
        workspaceId: wsAlphaId.value,
        sessionObservation: "obs_active",
        authorityObservation: "obs_owner",
      };

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, false);
      assert.equal(output.status, "rejected");
      assert.equal(output.error.code, "RESOURCE_UNAVAILABLE");
      assert.equal(output.error.outcomeCertainty, "not_applied");

      // Foreign target in Beta remains unmutated
      const betaTarget = emulator.getTarget(
        FIXTURES.wsBeta,
        "doc",
        "doc_beta_01",
      );
      assert.equal(betaTarget.revision, 0n);
    },
  );

  await t.test(
    "Audit access evaluation requires valid unexpired grant (A-08, A-17)",
    async () => {
      const emulator = seedF009Fixtures();

      // Alice has audit_read grant in Alpha
      const aliceReadAuth = await evaluateEvidenceAuthority(
        {
          verifiedActorId: FIXTURES.userAlice,
          claimedWorkspaceId: FIXTURES.wsAlpha,
          requiredAction: "audit_read",
        },
        emulator,
      );
      assert.equal(aliceReadAuth.authorized, true);

      // Bob has NO audit grant in Alpha
      const bobReadAuth = await evaluateEvidenceAuthority(
        {
          verifiedActorId: FIXTURES.userBob,
          claimedWorkspaceId: FIXTURES.wsAlpha,
          requiredAction: "audit_read",
        },
        emulator,
      );
      assert.equal(bobReadAuth.authorized, false);
      assert.equal(bobReadAuth.denialReason, "FORBIDDEN");

      // Auditor has audit_read but NOT audit_export
      const auditorExportAuth = await evaluateEvidenceAuthority(
        {
          verifiedActorId: FIXTURES.userAuditor,
          claimedWorkspaceId: FIXTURES.wsAlpha,
          requiredAction: "audit_export",
        },
        emulator,
      );
      assert.equal(auditorExportAuth.authorized, false);
      assert.equal(auditorExportAuth.denialReason, "FORBIDDEN");
    },
  );
});
