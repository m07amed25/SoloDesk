import test from "node:test";
import assert from "node:assert/strict";
import { DesktopBridge } from "../../../app/main/bridge.ts";
import { recoveryStatus } from "../../../app/main/persistence/recovery-state.ts";
import { isPersistenceRequest, sanitizePersistenceStatus } from "../../../app/shared/persistence-contracts.ts";

test("persistence IPC validates exact requests, binding and sanitized responses", async () => {
  const frame = { url: "solodesk-app://ui/index.html", isDestroyed: () => false };
  const sent = [];
  const contents = { mainFrame: frame, isDestroyed: () => false, getURL: () => frame.url, once() {}, on() {}, send(_channel, item) { sent.push(item); } };
  const window = { webContents: contents, once() {}, isDestroyed: () => false };
  const expected = recoveryStatus("ws-test-alpha", "integrity_failed");
  const bridge = new DesktopBridge({
    state: () => "ready", epoch: () => 1,
    persistenceState: async (_profile, _epoch, workspaceId) => workspaceId === "ws-test-alpha" ? { ...expected, rawPath: "/home/private/store.db" } : null,
    activePersistenceState: () => expected,
  });
  bridge.bind(window, "default", 1, "solodesk-app://ui", frame.url);
  const event = { sender: contents, senderFrame: frame };
  assert.equal(isPersistenceRequest({ workspaceId: "ws-test-alpha" }), true);
  assert.equal(isPersistenceRequest({ workspaceId: "../secret" }), false);
  assert.equal((await bridge.invokePersistence("getState", event, { workspaceId: "../secret" })).status, "rejected");
  assert.equal((await bridge.invokePersistence("getState", { ...event, senderFrame: {} }, { workspaceId: "ws-test-alpha" })).status, "rejected");
  const response = await bridge.invokePersistence("getState", event, { workspaceId: "ws-test-alpha" });
  assert.equal(response.status, "ok");
  assert.equal(JSON.stringify(response).includes("/home/private"), false);
  assert.equal((await bridge.invokePersistence("getState", event, { workspaceId: "ws-test-beta" })).status, "rejected");
  const subscription = bridge.subscribePersistence(event);
  assert.ok(subscription?.subscriptionId);
  await Promise.resolve();
  assert.equal(sent.at(-1)?.data?.status, "recovery_required");
  assert.equal(sanitizePersistenceStatus({ ...expected, unknown: "secret" })?.unknown, undefined);
});
