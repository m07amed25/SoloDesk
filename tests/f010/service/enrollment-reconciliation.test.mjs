import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EnrollmentCoordinator } from "../../../app/main/identity/enrollment.ts";
import { ProtectedIdentityStore } from "../../../app/main/identity/protected-identity-store.ts";
import { handleCommandGateway } from "../../../supabase/functions/command-gateway/index.ts";
import { EnrollmentEmulator } from "../../../tooling/f010/enrollment-emulator.mjs";
import { ACCOUNT_A, PROFILE_A, TEST_SECRET_PROTECTION } from "../fixtures/identity-fixtures.mjs";

const enrolled = Object.freeze({
  status: "enrolled",
  deviceEnrollmentId: "22222222-2222-4222-8222-222222222222",
  deviceId: "33333333-3333-4333-8333-333333333333",
  receiptId: "44444444-4444-4444-8444-444444444444",
});

function setup(t, service) {
  const root = mkdtempSync(join(tmpdir(), "solodesk-f010-reconcile-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProtectedIdentityStore(root, PROFILE_A.profile_id, undefined, TEST_SECRET_PROTECTION);
  const coordinator = new EnrollmentCoordinator({
    store,
    service,
    account: ACCOUNT_A,
    profile: { ...PROFILE_A, lifecycle: "enrolling" },
    sessionBinding: {
      binding_id: "55555555-5555-4555-8555-555555555555",
      profile_id: PROFILE_A.profile_id,
      profile_generation: 1,
      issuer_id: ACCOUNT_A.issuer_id,
      subject_id: ACCOUNT_A.subject_id,
      credential_reference: "credential-a",
      session_generation: 1,
      status: "current",
      protected_write_status: "committed",
    },
    installationContextId: "installation-a",
    platform: "linux",
    architecture: "x64",
    appVersion: "0.0.0",
    protectionProofReference: "proof-a",
  });
  return { store, coordinator };
}

test("T038/T042: unknown enrollment reuses its original intent until committed", async (t) => {
  let lookup = { status: "outcome_unknown" };
  const { store, coordinator } = setup(t, {
    async enroll() { throw new Error("network_lost_after_submit"); },
    async result() { return lookup; },
  });
  assert.equal((await coordinator.confirm("Workstation")).status, "outcome_unknown");
  const original = store.loadEnrollmentIntent();
  assert.equal(original?.status, "outcome_unknown");
  assert.equal((await coordinator.reconcile()).status, "outcome_unknown");
  assert.equal(store.loadEnrollmentIntent()?.enrollmentIntentId, original?.enrollmentIntentId);
  assert.equal(store.loadEnrollmentIntent()?.requestDigest, original?.requestDigest);

  lookup = enrolled;
  assert.equal((await coordinator.reconcile()).status, "enrolled");
  assert.equal(store.loadEnrollmentIntent()?.status, "locally_committed");
  assert.equal(store.loadEnrollmentIntent()?.enrollmentIntentId, original?.enrollmentIntentId);
});

test("T038/T042: authoritative not-enrolled and rejection are terminal", async (t) => {
  for (const status of ["not_enrolled", "rejected"]) {
    const current = setup(t, {
      async enroll() { return { status: "outcome_unknown" }; },
      async result() { return { status }; },
    });
    await current.coordinator.confirm();
    assert.equal((await current.coordinator.reconcile()).status, status);
    assert.equal(
      current.store.loadEnrollmentIntent()?.status,
      status === "not_enrolled" ? "reconciled_not_enrolled" : "rejected",
    );
  }
});

test("T038/T041: lookup is account-scoped, closed, and absence stays unknown", async () => {
  const identity = {
    issuerId: ACCOUNT_A.issuer_id,
    subjectId: ACCOUNT_A.subject_id,
    sessionObservedAt: new Date().toISOString(),
  };
  const intentId = "11111111-1111-4111-8111-111111111111";
  for (const databaseResult of [null, { status: "internal_detail", secret: "no" }]) {
    const response = await handleCommandGateway(
      new Request("https://service.test/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "device.enrollmentResult", payload: { enrollmentIntentId: intentId } }),
      }),
      async () => null,
      undefined,
      {
        authenticateIdentity: async () => identity,
        enrollmentDb: { async enroll() {}, async result() { return databaseResult; } },
      },
    );
    assert.deepEqual((await response.json()).data, { status: "outcome_unknown" });
  }

  const unauthorized = await handleCommandGateway(
    new Request("https://service.test/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "device.enrollmentResult", payload: { enrollmentIntentId: intentId } }),
    }),
    async () => null,
    undefined,
    {
      authenticateIdentity: async () => null,
      enrollmentDb: { async enroll() {}, async result() { return enrolled; } },
    },
  );
  assert.equal(unauthorized.status, 401);

  const sql = readFileSync("supabase/migrations/20261020000009_device_enrollment.sql", "utf8");
  assert.match(sql, /get_device_enrollment_result/);
  assert.match(sql, /ELSE 'outcome_unknown'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION private\.get_device_enrollment_result/);
});

test("T038: concurrent original requests converge and foreign accounts cannot inspect them", async () => {
  const emulator = new EnrollmentEmulator();
  const account = { issuerId: ACCOUNT_A.issuer_id, subjectId: ACCOUNT_A.subject_id };
  const request = {
    enrollmentIntentId: "11111111-1111-4111-8111-111111111111",
    requestDigest: "a".repeat(64),
    installationContextId: "installation-a",
  };
  const [left, right] = await Promise.all([
    emulator.enroll(account, request),
    emulator.enroll(account, request),
  ]);
  assert.equal(left.deviceEnrollmentId, right.deviceEnrollmentId);
  assert.equal(await emulator.result({ issuerId: account.issuerId, subjectId: "foreign" }, request.enrollmentIntentId), null);
});
