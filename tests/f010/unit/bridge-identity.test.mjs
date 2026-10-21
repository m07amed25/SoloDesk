import test from "node:test";
import assert from "node:assert/strict";
import { DesktopBridge } from "../../../app/main/bridge.ts";
import {
  isRendererIdentityState,
  sanitizeRendererState,
  validateIdentityRequest,
} from "../../../app/shared/identity-contracts.ts";
import { ACCOUNT_A, PROFILE_A, LABELS } from "../fixtures/identity-fixtures.mjs";

test("T024: DesktopBridge identity IPC validates requests, admission, and sanitized responses", async () => {
  const frame = { url: "solodesk-app://ui/index.html", isDestroyed: () => false };
  const sent = [];
  const contents = {
    mainFrame: frame,
    isDestroyed: () => false,
    getURL: () => frame.url,
    once() {},
    on() {},
    send(_channel, item) {
      sent.push(item);
    },
  };
  const window = { webContents: contents, once() {}, isDestroyed: () => false };

  const sampleState = {
    version: 1,
    lifecycle: "enrolling",
    profileReference: `profile:${PROFILE_A.profile_id}`,
    displayName: ACCOUNT_A.displayName,
    displayIdentifier: ACCOUNT_A.displayIdentifier,
    safeDeviceLabel: LABELS.enStandard,
    protectionStatus: "ready",
    sessionStatus: "current",
    enrollmentStatus: "pending",
    diagnosticId: "12345678-1234-4234-8234-123456789abc",
    messageKey: "shell.identity.verifiedWaitingEnrollment",
    actionKey: "shell.identity.action.confirmEnrollment",
    retainedWork: "none",
    nextActions: ["reconcile"],
  };

  const bridge = new DesktopBridge({
    state: () => "ready",
    epoch: () => 1,
    identityState: (profileId, epoch) => {
      if (profileId === "default" && epoch === 1) return sampleState;
      return null;
    },
    startSignIn: async (profileId, epoch) => {
      if (profileId === "default" && epoch === 1) {
        return {
          ...sampleState,
          lifecycle: "signing_in",
          nextActions: ["cancel"],
        };
      }
      return null;
    },
    cancelSignIn: async (profileId, epoch) => {
      if (profileId === "default" && epoch === 1) {
        return {
          ...sampleState,
          lifecycle: "sign_in_required",
          nextActions: ["sign_in_again"],
        };
      }
      return null;
    },
  });

  bridge.bind(window, "default", 1, "solodesk-app://ui", frame.url);
  const event = { sender: contents, senderFrame: frame };

  // 1. getState
  const validRequest = {
    version: 1,
    requestId: { kind: "request", value: "req-1" },
    payload: {},
  };
  const stateRes = await bridge.invokeIdentity("identity.getState", event, validRequest);
  assert.equal(stateRes.status, "ok");
  assert.equal(stateRes.data.lifecycle, "enrolling");
  assert.equal(stateRes.data.profileReference, `profile:${PROFILE_A.profile_id}`);

  // 2. startSignIn
  const startRes = await bridge.invokeIdentity("identity.startSignIn", event, validRequest);
  assert.equal(startRes.status, "ok");
  assert.equal(startRes.data.lifecycle, "signing_in");

  // 3. cancelSignIn
  const cancelRes = await bridge.invokeIdentity("identity.cancelSignIn", event, validRequest);
  assert.equal(cancelRes.status, "ok");
  assert.equal(cancelRes.data.lifecycle, "sign_in_required");

  // 4. Reject prohibited secret keys in payload
  const secretRequest = {
    version: 1,
    requestId: { kind: "request", value: "req-secret" },
    payload: { token: "secret_leak" },
  };
  const secretRes = await bridge.invokeIdentity("identity.getState", event, secretRequest);
  assert.equal(secretRes.status, "error");
  assert.equal(secretRes.error.code, "VALIDATION");

  // 5. Reject unadmitted frame / foreign origin
  const foreignEvent = { sender: contents, senderFrame: { url: "https://evil.test" } };
  const foreignRes = await bridge.invokeIdentity("identity.getState", foreignEvent, validRequest);
  assert.equal(foreignRes.status, "error");
  assert.equal(foreignRes.error.code, "FORBIDDEN");

  // 6. Subscription delivers sanitized state
  const sub = bridge.subscribeIdentity(event);
  assert.ok(sub?.subscriptionId);
  await new Promise((r) => setTimeout(r, 10));
  const delivered = sent.find((s) => s.family === "identity");
  assert.ok(delivered);
  assert.equal(delivered.data.lifecycle, "enrolling");
  assert.equal(isRendererIdentityState(delivered.data), true);
});
