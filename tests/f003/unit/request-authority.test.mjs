import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "../../../packages/contracts/src/envelopes.ts";
import { registry, recordRequest } from "../fixtures/operations.mjs";
test("A-04 no synthetic dispatch on forged actor or privileged operation", () => {
  let effects = 0;
  for (const mutate of [
    (v) => (v.actor = "owner"),
    (v) => (v.operation = "shell.execute"),
    (v) => (v.permissions = ["all"]),
  ]) {
    const v = recordRequest();
    mutate(v);
    if (request(v, registry).ok) effects++;
  }
  assert.equal(effects, 0);
});
