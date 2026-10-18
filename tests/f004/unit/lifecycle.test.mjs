import test from "node:test";
import assert from "node:assert/strict";
import { LifecycleCoordinator } from "../../../app/main/lifecycle.ts";

test("app states move forward once and reject new work during drain", async () => {
  const lifecycle = new LifecycleCoordinator({ drainMs: 10 });
  assert.equal(lifecycle.state, "starting");
  lifecycle.ready();
  assert.equal(lifecycle.state, "ready");
  assert.equal(lifecycle.canAccept(), true);
  const result = await lifecycle.drain("quit");
  assert.equal(result.outcome, "completed");
  assert.equal(lifecycle.state, "closed");
  assert.equal(lifecycle.canAccept(), false);
  assert.equal((await lifecycle.drain("quit")).outcome, "completed");
});

test("unfinished synthetic work is reported as interrupted, never saved", async () => {
  const lifecycle = new LifecycleCoordinator({ drainMs: 2 });
  lifecycle.ready();
  lifecycle.track(new Promise(() => {}));
  const result = await lifecycle.drain("quit");
  assert.equal(result.outcome, "interrupted");
  assert.equal(result.saved, false);
  assert.equal(lifecycle.state, "closed");
});

test("failure does not transition to a successful empty profile", () => {
  const lifecycle = new LifecycleCoordinator();
  lifecycle.fail("renderer");
  assert.equal(lifecycle.state, "failed");
  assert.equal(lifecycle.canAccept(), false);
  assert.throws(() => lifecycle.ready());
});
