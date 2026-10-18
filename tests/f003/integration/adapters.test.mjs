import { test } from "node:test";
import assert from "node:assert/strict";
import { MapAdapter } from "../doubles/map-adapter.mjs";
import { JournalAdapter } from "../doubles/journal-adapter.mjs";
import { context, tagged, otherWorkspace } from "../fixtures/context.mjs";
import { recordRequest } from "../fixtures/operations.mjs";
for (const mode of [
  "commit",
  "lose_reply",
  "cancel_before",
  "cancel_after",
  "local",
  "queue",
  "job",
])
  test(`A-28 independent adapters agree: ${mode}`, () => {
    const a = new MapAdapter(),
      b = new JournalAdapter(),
      v = recordRequest();
    const first = a.apply(v, context, mode);
    assert.deepEqual(first, b.apply(v, context, mode));
    assert.equal(a.effects, b.effects);
    assert.equal(
      a.effects,
      ["commit", "lose_reply", "cancel_after"].includes(mode) ? 1 : 0,
    );
    const status = {
      commit: "authoritative_committed",
      lose_reply: "outcome_unknown",
      cancel_before: "rejected",
      cancel_after: "outcome_unknown",
      local: "local_saved",
      queue: "rejected",
      job: "job_accepted",
    }[mode];
    assert.equal(first.status, status);
  });
for (const action of [
  "revoked",
  "foreign",
  "opaque",
  "changed",
  "retry",
  "conflict",
  "status",
  "denied-status",
])
  test(`A-28 independent scenario ${action}`, () => {
    const a = new MapAdapter(),
      b = new JournalAdapter(),
      v = recordRequest();
    if (
      ["changed", "retry", "conflict", "status", "denied-status"].includes(
        action,
      )
    ) {
      a.apply(v, context);
      b.apply(v, context);
    }
    if (action === "revoked" || action === "denied-status") {
      a.permitted = false;
      b.permitted = false;
    }
    if (action === "foreign") v.payload.reference.workspaceId = otherWorkspace;
    if (action === "opaque") v.payload.reference.id = tagged("project", 66);
    if (action === "changed") v.payload.value.coefficient = "999";
    if (action === "conflict") v.operationId = tagged("operation", 9);
    if (action === "retry") v.requestId = tagged("request", 99);
    const results = ["status", "denied-status"].includes(action)
      ? [a.resolve(v, context), b.resolve(v, context)]
      : [a.apply(v, context), b.apply(v, context)];
    assert.deepEqual(...results);
    assert.equal(a.effects, b.effects);
    assert.ok(a.effects <= 1);
    const expected = {
      revoked: ["rejected", 0],
      foreign: ["rejected", 0],
      opaque: ["rejected", 0],
      changed: ["rejected", 1],
      retry: ["authoritative_committed", 1],
      conflict: ["conflict", 1],
      status: ["authoritative_committed", 1],
      "denied-status": ["rejected", 1],
    }[action];
    assert.equal(results[0].status, expected[0]);
    assert.equal(a.effects, expected[1]);
  });
