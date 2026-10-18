import { test } from "node:test";
import assert from "node:assert/strict";
import { MapAdapter } from "../doubles/map-adapter.mjs";
import { recordRequest } from "../fixtures/operations.mjs";
import { context } from "../fixtures/context.mjs";
test("A-15 current permitted synthetic resource commits once", () =>
  assert.equal(
    new MapAdapter().apply(recordRequest(), context).status,
    "authoritative_committed",
  ));
import { tagged, otherWorkspace } from "../fixtures/context.mjs";
for (const [name, change] of [
  ["revoked", (a) => (a.permitted = false)],
  ["project denied", (a) => (a.projectAllowed = false)],
  ["authority unavailable", (a) => (a.available = false)],
])
  test(`A-16 ${name} blocks effects`, () => {
    const a = new MapAdapter();
    change(a);
    assert.equal(a.apply(recordRequest(), context).error.code, "FORBIDDEN");
    assert.equal(a.effects, 0);
  });
test("A-14 explicit foreign tenant rejected before lookup", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  v.payload.reference.workspaceId = otherWorkspace;
  assert.equal(a.apply(v, context).status, "rejected");
  assert.equal(a.lookups, 0);
});
test("A-15 opaque actual foreign ID cannot be authorized by claimed workspace", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  v.payload.reference.id = tagged("project", 66);
  assert.equal(a.apply(v, context).error.code, "RESOURCE_UNAVAILABLE");
  assert.equal(a.effects, 0);
});
test("A-17 missing and inaccessible results expose equal safe detail", () => {
  const a = new MapAdapter(),
    missing = recordRequest(),
    privateRef = recordRequest();
  missing.payload.reference.id = tagged("project", 77);
  privateRef.payload.reference.id = tagged("project", 66);
  assert.deepEqual(
    a.apply(missing, context).error,
    a.apply(privateRef, context).error,
  );
});
test("A-16 forged actor and stale role list cannot resurrect access", () => {
  const a = new MapAdapter();
  assert.equal(
    a.apply(recordRequest(), {
      ...context,
      actorId: tagged("actor", 91),
      roles: ["owner"],
    }).error.code,
    "FORBIDDEN",
  );
  assert.equal(a.effects, 0);
});
