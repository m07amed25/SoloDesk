import { test } from "node:test";
import assert from "node:assert/strict";
import { canonical, intent } from "../../../packages/contracts/src/intent.ts";
import { MapAdapter } from "../doubles/map-adapter.mjs";
import { registry, recordRequest } from "../fixtures/operations.mjs";
import { context, tagged } from "../fixtures/context.mjs";
import { goldens } from "../fixtures/intent-goldens.mjs";
for (const [input, expected] of goldens)
  test(`A-21 golden ${expected}`, () =>
    assert.equal(canonical(input).value, expected));
test("A-21 correlation excluded but semantic revision/time/value included", () => {
  const a = recordRequest(),
    base = intent(a, context, registry).value.canonical;
  a.requestId = tagged("request", 99);
  assert.equal(intent(a, context, registry).value.canonical, base);
  for (const change of [
    (v) => (v.expectedRevision = "1"),
    (v) => (v.occurredAt = "2026-10-18T01:02:04.000Z"),
    (v) => (v.payload.value.coefficient = "124"),
  ]) {
    const b = recordRequest();
    change(b);
    assert.notEqual(intent(b, context, registry).value.canonical, base);
  }
});
test("A-21 identical replay resolves before stale revision check", () => {
  const a = new MapAdapter(),
    v = recordRequest(),
    first = a.apply(v, context);
  v.requestId = tagged("request", 99);
  const second = a.apply(v, context);
  assert.equal(second.status, "authoritative_committed");
  assert.deepEqual(second.receiptId, first.receiptId);
  assert.equal(a.effects, 1);
});
test("A-21 changed reuse rejected without a second effect", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  a.apply(v, context);
  v.payload.value.coefficient = "999";
  assert.equal(a.apply(v, context).error.code, "VALIDATION");
  assert.equal(a.effects, 1);
});
for (const mode of ["lose_reply", "cancel_after"])
  test(`A-22 ${mode} reconciles same operation`, () => {
    const a = new MapAdapter(),
      v = recordRequest();
    assert.equal(a.apply(v, context, mode).status, "outcome_unknown");
    assert.equal(a.resolve(v, context).status, "authoritative_committed");
    assert.equal(a.apply(v, context).status, "authoritative_committed");
    assert.equal(a.effects, 1);
  });
test("A-22 before-dispatch cancellation proves no effect", () => {
  const a = new MapAdapter();
  assert.equal(
    a.apply(recordRequest(), context, "cancel_before").error.outcomeCertainty,
    "not_applied",
  );
  assert.equal(a.effects, 0);
});
test("A-22 new operation stale revision conflicts", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  a.apply(v, context);
  v.operationId = tagged("operation", 8);
  assert.equal(a.apply(v, context).status, "conflict");
  assert.equal(a.effects, 1);
});
test("A-16 revoked receipt access cannot disclose original", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  a.apply(v, context);
  a.permitted = false;
  assert.equal(a.resolve(v, context).error.code, "FORBIDDEN");
});
test("A-21 caller mutation cannot rewrite stored original", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  a.apply(v, context);
  v.payload.value.coefficient = "321";
  assert.equal(
    a.apply(recordRequest(), context).status,
    "authoritative_committed",
  );
  assert.equal(a.effects, 1);
});
test("A-21 null/absence and array order remain meaningful", () => {
  assert.notEqual(canonical({ a: null }).value, canonical({}).value);
  assert.notEqual(
    canonical({ a: [1, 2] }).value,
    canonical({ a: [2, 1] }).value,
  );
});
import { Registry } from "../../../packages/contracts/src/registry.ts";
import { plainData } from "../../../packages/contracts/src/validation.ts";
test("A-21 policy/currency/source/device and verified actor change semantic identity", () => {
  const profileRegistry = new Registry([
    {
      owner: "F003",
      name: "conformance.profile",
      kind: "command",
      versions: [1],
      device: true,
      revision: "required",
      occurrence: true,
      payload: plainData,
    },
  ]);
  const v = {
    ...recordRequest(),
    operation: "conformance.profile",
    payload: {
      currency: "XTS",
      profileVersion: "synthetic-v1",
      seconds: "120",
    },
  };
  const base = intent(v, context, profileRegistry).value;
  for (const [field, value] of [
    ["currency", "XXX"],
    ["profileVersion", "synthetic-v2"],
    ["seconds", "121"],
  ]) {
    const changed = structuredClone(v);
    changed.payload[field] = value;
    assert.notEqual(
      intent(changed, context, profileRegistry).value.canonical,
      base.canonical,
    );
  }
  const alternate = { ...context, actorId: tagged("actor", 99) };
  assert.notEqual(
    intent(v, alternate, profileRegistry).value.scope,
    base.scope,
  );
  const changed = { ...v, deviceId: tagged("device", 99) };
  assert.equal(intent(changed, context, profileRegistry).ok, false);
  assert.notEqual(
    intent(changed, { ...context, deviceId: changed.deviceId }, profileRegistry)
      .value.canonical,
    base.canonical,
  );
});
