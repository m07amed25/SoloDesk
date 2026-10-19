import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudGatewayClient } from "../../app/main/cloud/cloud-gateway-client.ts";
import { DegradedModeManager } from "../../app/main/cloud/degraded-mode-manager.ts";

test("A-18: DegradedModeManager commits to local encrypted SQLite outbox during cloud disconnection", async () => {
  const enqueuedOutbox = [];

  // Mock persistence outbox adapter (mimicking F007 local encrypted persistence)
  const mockPersistence = {
    async executeTransaction(workspaceId, fn) {
      const tx = {
        async enqueueOutboxOperation(op) {
          enqueuedOutbox.push(op);
          return { outboxId: `ob_${Date.now()}` };
        },
      };
      return fn(tx);
    },
  };

  // Mock fetch that simulates network disconnect / cloud outage (503 Service Unavailable)
  let cloudOnline = false;
  const mockFetch = async (url, init) => {
    if (!cloudOnline) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Cloud upstream unavailable or paused",
          },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: { id: "res_online_123" },
      }),
    };
  };

  const gatewayClient = new CloudGatewayClient({
    workspaceId: "ws_alpha_01",
    gatewayUrl: "http://127.0.0.1:54321/command-gateway",
    fetchFn: mockFetch,
  });

  const degradedManager = new DegradedModeManager(
    gatewayClient,
    mockPersistence,
  );

  const stateTransitions = [];
  degradedManager.onStateChange((payload) => {
    stateTransitions.push(payload.state);
  });

  // 1. Initially operational
  assert.equal(degradedManager.getState(), "operational");

  // 2. Submit while cloud is offline
  const offlineResult = await degradedManager.submitCommandWithFallback(
    "ws_alpha_01",
    {
      operationId: "op_offline_001",
      aggregateType: "client",
      aggregateId: "cli_acme",
      operationType: "create",
      payload: { name: "Acme Corp Offline", currency: "USD" },
      expectedRevision: 0,
    },
  );

  // Must fall back to local encrypted outbox
  assert.equal(offlineResult.delivered, "local_outbox");
  assert.equal(enqueuedOutbox.length, 1);
  assert.equal(enqueuedOutbox[0].operationId, "op_offline_001");
  assert.equal(enqueuedOutbox[0].workspaceId, "ws_alpha_01");
  assert.equal(enqueuedOutbox[0].payload.name, "Acme Corp Offline");

  // Manager state must have transitioned to offline_degraded
  assert.equal(degradedManager.getState(), "offline_degraded");
  assert.ok(stateTransitions.includes("offline_degraded"));

  // 3. Bring cloud back online and submit another operation
  cloudOnline = true;
  const onlineResult = await degradedManager.submitCommandWithFallback(
    "ws_alpha_01",
    {
      operationId: "op_online_002",
      aggregateType: "client",
      aggregateId: "cli_online",
      operationType: "create",
      payload: { name: "Online Client", currency: "USD" },
      expectedRevision: 1,
    },
  );

  assert.equal(onlineResult.delivered, "cloud");
  assert.equal(degradedManager.getState(), "operational");
  assert.equal(
    enqueuedOutbox.length,
    1,
    "No extra outbox item added when cloud succeeded",
  );
});
