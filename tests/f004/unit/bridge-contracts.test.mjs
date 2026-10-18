import test from "node:test";
import assert from "node:assert/strict";
import { METHODS, validateRequest, validateResponse } from "../../../app/shared/desktop-contracts.ts";
import { request } from "../fixtures/desktop.mjs";

test("only reviewed desktop methods are exposed", () => {
  assert.deepEqual(METHODS, [
    "window.getState",
    "window.minimize",
    "window.restore",
    "window.requestClose",
    "lifecycle.onState",
    "links.onDecision",
  ]);
  for (const method of METHODS) assert.equal(validateRequest(method, request()).ok, true);
  assert.equal(validateRequest("external.openApproved", request()).ok, false);
  assert.equal(validateRequest("ipc.invoke", request()).ok, false);
});

test("result alternatives stay closed", () => {
  const requestId = request().requestId;
  assert.equal(validateResponse({ version: 1, requestId, status: "accepted", transition: "closing" }, requestId).ok, true);
  assert.equal(validateResponse({ version: 1, requestId, status: "accepted", transition: "closed" }, requestId).ok, false);
});
