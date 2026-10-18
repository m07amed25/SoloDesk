import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRequest,
  validateResponse,
  safeError,
} from "../../../app/shared/desktop-contracts.ts";
import { request } from "../fixtures/desktop.mjs";

test("version one accepts a closed empty window request", () => {
  assert.equal(validateRequest("window.getState", request({})).ok, true);
});

test("closed envelope and method reject before effect", () => {
  for (const bad of [
    { ...request(), extra: true },
    { ...request(), version: 2 },
    request({ extra: true }),
    { ...request(), requestId: "untyped" },
  ])
    assert.equal(validateRequest("window.minimize", bad).ok, false);
  assert.equal(validateRequest("native.raw", request()).ok, false);
});

test("hostile object and outer bounds are rejected without accessor execution", () => {
  let reads = 0;
  const payload = Object.defineProperty({}, "surprise", {
    enumerable: true,
    get() {
      reads++;
      return 1;
    },
  });
  assert.equal(validateRequest("window.getState", request(payload)).ok, false);
  assert.equal(reads, 0);
  assert.equal(
    validateRequest("window.getState", request({ huge: "x".repeat(262145) }))
      .ok,
    false,
  );
});

test("response alternatives and correlation are closed", () => {
  const id = request().requestId;
  assert.equal(
    validateResponse(
      {
        version: 1,
        requestId: id,
        status: "ok",
        data: {
          visible: true,
          minimized: false,
          maximized: false,
          focused: true,
        },
      },
      id,
    ).ok,
    true,
  );
  assert.equal(
    validateResponse(
      { version: 1, requestId: id, status: "ok", data: {}, extra: 1 },
      id,
    ).ok,
    false,
  );
  assert.equal(
    validateResponse(
      { version: 2, requestId: id, status: "accepted", transition: "closing" },
      id,
    ).ok,
    false,
  );
});

test("public error is bounded and redacted", () => {
  const error = safeError("FORBIDDEN");
  assert.equal(error.code, "FORBIDDEN");
  assert.equal(error.outcomeCertainty, "not_applied");
  assert.equal(JSON.stringify(error).includes("/home/"), false);
});
