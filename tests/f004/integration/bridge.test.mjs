import test from "node:test";
import assert from "node:assert/strict";
import {
  admitCaller,
  DesktopBridge,
  SubscriptionRegistry,
} from "../../../app/main/bridge.ts";
import { request } from "../fixtures/desktop.mjs";

function fixture() {
  const frame = {
    url: "solodesk-app://ui/index.html",
    isDestroyed: () => false,
  };
  const contents = {
    mainFrame: frame,
    isDestroyed: () => false,
    getURL: () => frame.url,
  };
  const binding = {
    contents,
    frame,
    origin: "solodesk-app://ui",
    documentUrl: frame.url,
    profileId: "default",
    epoch: 3,
  };
  return {
    frame,
    contents,
    binding,
    event: { sender: contents, senderFrame: frame },
  };
}

test("caller admission requires the exact current top-level document and epoch", () => {
  const { frame, binding, event } = fixture();
  const context = { state: "ready", epoch: 3, authority: true };
  assert.equal(admitCaller(event, binding, context), true);
  assert.equal(
    admitCaller({ ...event, senderFrame: { ...frame } }, binding, context),
    false,
  );
  assert.equal(admitCaller(event, binding, { ...context, epoch: 4 }), false);
  assert.equal(
    admitCaller(event, binding, { ...context, authority: false }),
    false,
  );
  assert.equal(
    admitCaller(event, binding, { ...context, state: "draining" }),
    false,
  );
  frame.url = "https://evil.example/";
  assert.equal(admitCaller(event, binding, context), false);
});

test("subscriptions stop after unsubscribe or context invalidation", () => {
  const subscriptions = new SubscriptionRegistry();
  const { binding } = fixture();
  const first = subscriptions.add(binding, "lifecycle");
  assert.equal(
    subscriptions.deliver(binding, "lifecycle", { state: "ready" }).length,
    1,
  );
  subscriptions.remove(first, binding);
  assert.equal(
    subscriptions.deliver(binding, "lifecycle", { state: "ready" }).length,
    0,
  );
  subscriptions.add(binding, "links");
  subscriptions.invalidate(binding);
  assert.equal(
    subscriptions.deliver(binding, "links", { status: "denied" }).length,
    0,
  );
});

test("handler denies malformed and forged calls before native effect", async () => {
  const { frame, contents, event } = fixture();
  let effects = 0;
  contents.once = () => {};
  contents.on = () => {};
  const window = {
    webContents: contents,
    once() {},
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    isMaximized: () => false,
    isFocused: () => true,
    minimize: () => {
      effects++;
    },
  };
  const bridge = new DesktopBridge({ state: () => "ready", epoch: () => 3 });
  bridge.bind(window, "default", 3, "solodesk-app://ui", frame.url);
  assert.equal(
    (await bridge.invoke("window.minimize", event, request())).status,
    "ok",
  );
  assert.equal(effects, 1);
  assert.equal(
    (
      await bridge.invoke("window.minimize", event, {
        ...request(),
        unexpected: true,
      })
    ).status,
    "rejected",
  );
  assert.equal(
    (
      await bridge.invoke(
        "window.minimize",
        { ...event, senderFrame: {} },
        request(),
      )
    ).status,
    "rejected",
  );
  assert.equal(effects, 1);
  const revoked = new DesktopBridge({
    state: () => "ready",
    epoch: () => 3,
    authority: () => false,
  });
  revoked.bind(window, "default", 3, "solodesk-app://ui", frame.url);
  assert.equal(
    (await revoked.invoke("window.minimize", event, request())).status,
    "rejected",
  );
  assert.equal(effects, 1);
});

test("link denial before renderer subscription is delivered to the first current subscriber", async () => {
  const { frame, contents, event } = fixture();
  const sent = [];
  contents.once = () => {};
  contents.on = () => {};
  contents.send = (_channel, payload) => sent.push(payload);
  const window = { webContents: contents, once() {}, isDestroyed: () => false };
  const bridge = new DesktopBridge({ state: () => "ready", epoch: () => 3 });
  bridge.bind(window, "default", 3, "solodesk-app://ui", frame.url);
  bridge.emit(contents, "links", { status: "denied" });
  assert.equal(sent.length, 0);
  const subscribed = await bridge.invoke("links.onDecision", event, request());
  assert.equal(subscribed.status, "ok");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].data, { status: "denied" });
  bridge.emit(contents, "links", { status: "unavailable" });
  assert.equal(sent.length, 2);
});
