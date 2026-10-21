import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateIdentityRequest,
  isRendererIdentityState,
} from "../../../app/shared/identity-contracts.ts";

const requestId = { kind: "request", value: "11111111-1111-4111-8111-111111111111" };

test("T028: enrollment IPC accepts only an optional bounded display label", () => {
  const valid = validateIdentityRequest("identity.confirmEnrollment", {
    version: 1,
    requestId,
    payload: { label: "حاسوب العمل" },
  });
  assert.equal(valid.ok, true);
  for (const key of ["issuer_id", "subject_id", "device_id", "profile_path", "workspace_id", "role"]) {
    assert.equal(validateIdentityRequest("identity.confirmEnrollment", {
      version: 1,
      requestId,
      payload: { [key]: "caller-value" },
    }).ok, false);
  }
});

test("T028: renderer state exposes a narrow enrolled result and preload has named methods", () => {
  assert.equal(isRendererIdentityState({
    version: 1,
    lifecycle: "enrolled",
    profileReference: "profile:safe",
    safeDeviceLabel: "Workstation",
    protectionStatus: "ready",
    sessionStatus: "current",
    enrollmentStatus: "enrolled",
    diagnosticId: "22222222-2222-4222-8222-222222222222",
    messageKey: "shell.identity.enrolled",
    actionKey: "shell.identity.action.none",
    retainedWork: "none",
    nextActions: [],
  }), true);
  const preload = readFileSync(new URL("../../../app/preload/preload.ts", import.meta.url), "utf8");
  assert.match(preload, /confirmEnrollment/);
  assert.match(preload, /retryReconciliation/);
  assert.doesNotMatch(preload, /identity:\s*Object\.freeze\([\s\S]*openExternal/);
});

