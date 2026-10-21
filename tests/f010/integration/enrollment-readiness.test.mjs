import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EnrollmentCoordinator } from "../../../app/main/identity/enrollment.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { ACCOUNT_A, ACCOUNT_B, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

function setup(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-"));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, overrides.protection, TEST_SECRET_PROTECTION);
  const service = overrides.service ?? {
    async enroll() {
      return {
        status: "enrolled",
        deviceEnrollmentId: "22222222-2222-4222-8222-222222222222",
        deviceId: "33333333-3333-4333-8333-333333333333",
        receiptId: "44444444-4444-4444-8444-444444444444",
      };
    },
    async result() { return null; },
  };
  const coordinator = new EnrollmentCoordinator({
    store,
    service,
    account: overrides.account ?? ACCOUNT_A,
    profile: { ...PROFILE_A, lifecycle: "enrolling" },
    sessionBinding: {
      binding_id: "55555555-5555-4555-8555-555555555555",
      profile_id: PROFILE_A.profile_id,
      profile_generation: 1,
      issuer_id: ACCOUNT_A.issuer_id,
      subject_id: ACCOUNT_A.subject_id,
      credential_reference: "cred-safe",
      session_generation: 1,
      status: "current",
      protected_write_status: "committed",
    },
    installationContextId: "installation-a",
    platform: "linux",
    architecture: "x64",
    appVersion: "0.0.0",
    protectionProofReference: "proof-a",
    ...overrides.options,
  });
  return { root, store, coordinator };
}

test("T027: enrollment becomes ready only after authoritative and protected commits", async (t) => {
  const { root, store, coordinator } = setup();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await coordinator.confirm("Workstation");
  assert.equal(result.status, "enrolled");
  assert.equal(store.loadProfile()?.lifecycle, "enrolled");
  assert.equal(store.loadSessionBinding()?.protected_write_status, "committed");
  assert.equal(store.loadEnrollmentIntent()?.status, "locally_committed");
});

test("T027: protection, account mismatch, and unknown outcomes fail closed", async (t) => {
  const denied = setup({ protection: { assertKeyAvailable() { throw new Error("locked"); } } });
  t.after(() => rmSync(denied.root, { recursive: true, force: true }));
  assert.equal((await denied.coordinator.confirm()).status, "protection_unavailable");

  const foreign = setup({ account: ACCOUNT_B });
  t.after(() => rmSync(foreign.root, { recursive: true, force: true }));
  assert.equal((await foreign.coordinator.confirm()).status, "recovery_required");

  const unknown = setup({ service: { async enroll() { return { status: "outcome_unknown" }; }, async result() { return null; } } });
  t.after(() => rmSync(unknown.root, { recursive: true, force: true }));
  assert.equal((await unknown.coordinator.confirm()).status, "outcome_unknown");
  assert.equal(unknown.store.loadProfile(), null);
  assert.equal(unknown.store.loadEnrollmentIntent()?.status, "outcome_unknown");
});

