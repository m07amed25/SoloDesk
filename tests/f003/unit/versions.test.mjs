import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptedEvent,
  supported,
} from "../../../packages/contracts/src/versions.ts";
import { registry, recordRequest } from "../fixtures/operations.mjs";
import { reference, workspace, tagged } from "../fixtures/context.mjs";
import { MapAdapter } from "../doubles/map-adapter.mjs";
import { context } from "../fixtures/context.mjs";
const event = () => ({
  protocolVersion: 1,
  eventVersion: 1,
  boundsProfile: "F003-bounds-v1",
  eventKind: "conformance.recorded",
  workspaceId: workspace,
  entity: reference,
  revision: "1",
  operationId: tagged("operation", 7),
  committedAt: "2026-10-18T01:02:04.000Z",
  progressToken: "opaque-1",
  payload: {},
});
test("A-19 explicit supported catalogue", () => {
  assert.equal(supported(registry).length, 2);
  assert.deepEqual(supported(registry)[0].versions, [1]);
});
test("A-19 accepted supported event", () =>
  assert.equal(acceptedEvent(event(), ["conformance.recorded"]).ok, true));
for (const [label, change] of [
  ["protocol", (v) => (v.protocolVersion = 2)],
  ["schema", (v) => (v.eventVersion = 2)],
  ["kind", (v) => (v.eventKind = "unknown")],
  ["field", (v) => (v.extra = true)],
])
  test(`A-18 unknown event ${label} preserves pending and cursor`, () => {
    const v = event();
    change(v);
    const original = JSON.stringify(v);
    let cursor = "old";
    if (acceptedEvent(v, ["conformance.recorded"]).ok) cursor = v.progressToken;
    assert.equal(cursor, "old");
    assert.equal(JSON.stringify(v), original);
  });
test("A-20 local and queue do not become authoritative", () => {
  const a = new MapAdapter(),
    v = recordRequest();
  assert.equal(a.apply(v, context, "local").status, "local_saved");
  const q = a.apply(v, context, "queue");
  assert.equal(q.status, "queued");
  assert.equal(Object.hasOwn(q, "committedAt"), false);
  assert.equal(a.effects, 0);
});
test("A-20 job acceptance is not delivery", () => {
  const a = new MapAdapter();
  const v = a.apply(recordRequest(), context, "job");
  assert.equal(v.status, "job_accepted");
  assert.equal(Object.hasOwn(v, "delivered"), false);
  assert.equal(a.effects, 0);
});
