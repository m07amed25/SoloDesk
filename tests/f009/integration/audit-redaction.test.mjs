import { test } from "node:test";
import assert from "node:assert/strict";
import { executeAuthoritativeCommand } from "../../../supabase/functions/_shared/authoritative-command.ts";
import {
  sanitizeAuditValue,
  projectCommandAudit,
} from "../../../supabase/functions/_shared/audit-projectors.ts";
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

test("Scenario 6: Audit Integrity, Redaction, and Access (A-14–A-18, A-24, SC-007, SC-008)", async (t) => {
  const registry = createTestRegistry();
  const wsId = makeId("workspace", FIXTURES.wsAlpha);
  const actorId = makeId("actor", FIXTURES.userAlice);

  const trustedContext = {
    actorId: actorId.value,
    workspaceId: wsId.value,
    sessionObservation: "obs_session_active",
    authorityObservation: "obs_role_owner",
  };

  await t.test(
    "Secrets, tokens, credentials, and raw payloads are completely redacted (A-14, SC-008)",
    async () => {
      const rawPayloadWithSecrets = {
        targetKind: "doc",
        targetId: "doc_alpha_01",
        action: "update",
        note: "Regular safe note",
        apiKey: "sample-test-key-redacted",
        token: "bearer-token-abcdef",
        password: "SuperSecretPassword123",
        authorization: "Bearer secret-auth-header",
        cookie: "session_id=secret_cookie_data",
        deepNested: {
          accessToken: "nested-secret-token",
          safeData: "hello",
        },
      };

      const sanitized = sanitizeAuditValue(rawPayloadWithSecrets);

      // Assert secret fields are redacted
      assert.equal(sanitized.apiKey, "[REDACTED]");
      assert.equal(sanitized.token, "[REDACTED]");
      assert.equal(sanitized.password, "[REDACTED]");
      assert.equal(sanitized.authorization, "[REDACTED]");
      assert.equal(sanitized.cookie, "[REDACTED]");
      assert.equal(sanitized.deepNested.accessToken, "[REDACTED]");
      assert.equal(sanitized.deepNested.safeData, "hello");

      // Project audit summary
      const projection = projectCommandAudit(
        "synthetic.mutate-target",
        rawPayloadWithSecrets,
        {
          kind: "doc",
          id: "doc_alpha_01",
        },
      );

      assert.equal(
        projection.summary.apiKey,
        undefined,
        "Unallowlisted secret keys must never be projected",
      );
      assert.equal(
        projection.summary.token,
        undefined,
        "Tokens must never be projected",
      );
      assert.equal(
        projection.summary.password,
        undefined,
        "Passwords must never be projected",
      );
      assert.equal(projection.summary.note, "Regular safe note");

      // Verify when command is executed, stored audit entry in database has zero secret material
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");
      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
        payload: rawPayloadWithSecrets,
      });

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });

      assert.equal(output.ok, true);
      const storedAudit = emulator.getAuditEntry(
        FIXTURES.wsAlpha,
        output.auditEntry.audit_entry_id,
      );
      assert.ok(storedAudit);
      assert.equal(storedAudit.summary.apiKey, undefined);
      assert.equal(storedAudit.summary.token, undefined);
      assert.equal(storedAudit.summary.password, undefined);
      assert.equal(storedAudit.summary.note, "Regular safe note");
    },
  );

  await t.test(
    "Append-only database triggers reject direct UPDATE and DELETE on audit entries (A-15)",
    async () => {
      const emulator = seedF009Fixtures();
      const opId = makeId("operation");
      const env = createTestEnvelope({
        workspaceId: wsId,
        operationId: opId,
        expectedRevision: "0",
      });

      const output = await executeAuthoritativeCommand(emulator, emulator, {
        rawRequest: env,
        trustedContext,
        registry,
      });
      assert.equal(output.ok, true);
      const auditId = output.auditEntry.audit_entry_id;

      // Direct UPDATE must be rejected by SQLite trigger
      let updateThrew = false;
      try {
        emulator.db
          .prepare(
            "UPDATE command_audit_entries SET reason_code = 'tampered' WHERE audit_entry_id = ?",
          )
          .run(auditId);
      } catch (err) {
        updateThrew = true;
        assert.ok(err.message.includes("Immutable evidence: UPDATE rejected"));
      }
      assert.equal(
        updateThrew,
        true,
        "UPDATE on command_audit_entries must be rejected by trigger",
      );

      // Direct DELETE must be rejected by SQLite trigger
      let deleteThrew = false;
      try {
        emulator.db
          .prepare("DELETE FROM command_audit_entries WHERE audit_entry_id = ?")
          .run(auditId);
      } catch (err) {
        deleteThrew = true;
        assert.ok(err.message.includes("Immutable evidence: DELETE rejected"));
      }
      assert.equal(
        deleteThrew,
        true,
        "DELETE on command_audit_entries must be rejected by trigger",
      );
    },
  );

  await t.test(
    "Audit queries support pagination, chronological ordering with stable ID tie breaker, and filtering (A-16)",
    async () => {
      const emulator = seedF009Fixtures();

      // Commit 5 commands
      for (let i = 0; i < 5; i++) {
        const opId = makeId("operation");
        const env = createTestEnvelope({
          workspaceId: wsId,
          operationId: opId,
          expectedRevision: String(i),
          payload: {
            targetKind: "doc",
            targetId: "doc_alpha_01",
            action: "update",
            delta: i + 1,
          },
        });

        const res = await executeAuthoritativeCommand(emulator, emulator, {
          rawRequest: env,
          trustedContext,
          registry,
        });
        assert.equal(res.ok, true);
      }

      const totalCount = emulator.countAuditEntries(FIXTURES.wsAlpha);
      assert.equal(totalCount, 5, "Must count exactly 5 audit entries");

      // List with pagination: limit 2, offset 0
      const page1 = emulator.listAuditEntries(FIXTURES.wsAlpha, {}, 2, 0);
      assert.equal(page1.length, 2);
      assert.equal(page1[0].progress_position, 1n);
      assert.equal(page1[1].progress_position, 2n);

      // List page 2: limit 2, offset 2
      const page2 = emulator.listAuditEntries(FIXTURES.wsAlpha, {}, 2, 2);
      assert.equal(page2.length, 2);
      assert.equal(page2[0].progress_position, 3n);
      assert.equal(page2[1].progress_position, 4n);

      // List with filter: fromPosition: 4
      const filtered = emulator.listAuditEntries(FIXTURES.wsAlpha, {
        fromPosition: 4n,
      });
      assert.equal(filtered.length, 2);
      assert.equal(filtered[0].progress_position, 4n);
      assert.equal(filtered[1].progress_position, 5n);
    },
  );

  await t.test(
    "Service audit access is gated and blocked by default without approved policy (A-18, A-24)",
    async () => {
      const emulator = seedF009Fixtures();

      const serviceAuth = await evaluateEvidenceAuthority(
        {
          verifiedActorId: "srv_system_operator",
          claimedWorkspaceId: FIXTURES.wsAlpha,
          requiredAction: "audit_read",
          isServiceOperator: true,
        },
        emulator,
      );

      assert.equal(
        serviceAuth.authorized,
        false,
        "Service operator access must be blocked by default",
      );
      assert.equal(serviceAuth.denialReason, "FORBIDDEN");
      assert.equal(
        serviceAuth.safeMessage,
        "Service audit access is disabled by policy",
      );
    },
  );
});
