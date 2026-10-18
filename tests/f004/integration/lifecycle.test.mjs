import test from "node:test";
import assert from "node:assert/strict";
import { LifecycleCoordinator } from "../../../app/main/lifecycle.ts";

test("drain notifies owners, settles observed work and disposes subscribers", async () => {
  const events = [];
  const lifecycle = new LifecycleCoordinator({ drainMs: 50 });
  lifecycle.onState((state) => events.push(state));
  lifecycle.ready();
  lifecycle.track(Promise.resolve());
  const outcome = await lifecycle.drain("last-window");
  assert.equal(outcome.outcome, "completed");
  assert.deepEqual(events, ["ready", "draining", "closed"]);
  assert.equal(lifecycle.track(Promise.resolve()), false);
});

test("startup failure remains failed and cannot claim recovery", async () => {
  const lifecycle = new LifecycleCoordinator();
  lifecycle.fail("asset");
  assert.equal(lifecycle.state, "failed");
  assert.rejects(lifecycle.drain("quit"));
});
