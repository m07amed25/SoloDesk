import { Registry } from "../../packages/contracts/src/registry.ts";
import { ok, fail } from "../../packages/domain/src/integers.ts";
import crypto from "node:crypto";

export function createTestRegistry() {
  return new Registry([
    {
      owner: "F009",
      name: "synthetic.mutate-target",
      kind: "command",
      versions: [1],
      device: false,
      revision: "required",
      occurrence: true,
      payload: (input) => {
        if (!input || typeof input !== "object") return fail("invalid_type");
        return ok(input);
      },
    },
    {
      owner: "F009",
      name: "synthetic.device-bound-command",
      kind: "command",
      versions: [1],
      device: true,
      revision: "absent",
      occurrence: false,
      payload: (input) => ok(input || {}),
    },
    {
      owner: "F009",
      name: "client.create",
      kind: "command",
      versions: [1],
      device: false,
      revision: "absent",
      occurrence: false,
      payload: (input) => {
        if (!input || typeof input !== "object") return fail("invalid_type");
        const inp = input;
        return ok({
          clientId: String(inp.clientId || "cli_01"),
          name: String(inp.name || "Client 01"),
          currency: String(inp.currency || "USD"),
        });
      },
    },
    {
      owner: "F009",
      name: "command.reconcile",
      kind: "query",
      versions: [1],
      device: false,
      revision: "absent",
      occurrence: false,
      payload: (input) => {
        if (!input || typeof input !== "object") return fail("invalid_type");
        const inp = input;
        return ok({
          originalOperation: String(inp.originalOperation),
          originalOperationId: String(inp.originalOperationId),
        });
      },
    },
    {
      owner: "F009",
      name: "audit.get",
      kind: "query",
      versions: [1],
      device: false,
      revision: "absent",
      occurrence: false,
      payload: (input) => ok(input || {}),
    },
  ]);
}

export function makeId(kind, uuid = crypto.randomUUID()) {
  return Object.freeze({ kind, value: uuid });
}

export function createTestEnvelope(overrides = {}) {
  const reqId = makeId("request");
  const wsId = overrides.workspaceId
    ? typeof overrides.workspaceId === "string"
      ? makeId("workspace", overrides.workspaceId)
      : overrides.workspaceId
    : makeId("workspace");
  const opId = overrides.operationId
    ? typeof overrides.operationId === "string"
      ? makeId("operation", overrides.operationId)
      : overrides.operationId
    : makeId("operation");

  return {
    protocolVersion: 1,
    payloadVersion: 1,
    boundsProfile: "F003-bounds-v1",
    kind: "command",
    operation: overrides.operation || "synthetic.mutate-target",
    requestId: reqId,
    workspaceId: wsId,
    operationId: opId,
    expectedRevision:
      overrides.expectedRevision !== undefined
        ? String(overrides.expectedRevision)
        : "0",
    occurredAt: overrides.occurredAt || new Date().toISOString(),
    payload: overrides.payload || {
      targetKind: "doc",
      targetId: "doc_alpha_01",
      action: "update",
      delta: 1,
      safeNote: "Authorized synthetic update",
    },
    ...overrides,
  };
}
