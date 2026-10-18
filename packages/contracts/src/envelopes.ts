import {
  record,
  revision,
  ok,
  fail,
  type Result,
} from "../../domain/src/integers.ts";
import { id, type Id } from "../../domain/src/ids.ts";
import { instant } from "../../domain/src/dates.ts";
import { BOUNDS } from "./bounds.ts";
import { plainData, type Data } from "./validation.ts";
import { publicError } from "./errors.ts";
import type { Registry } from "./registry.ts";

export type Request = Readonly<{
  protocolVersion: 1;
  payloadVersion: 1;
  boundsProfile: "F003-bounds-v1";
  kind: "query" | "command";
  operation: string;
  requestId: Id<"request">;
  workspaceId: Id<"workspace">;
  deviceId?: Id<"device">;
  operationId?: Id<"operation">;
  expectedRevision?: string;
  occurredAt?: string;
  payload: Data;
}>;

export function request(input: unknown, registry: Registry): Result<Request> {
  const safe = plainData(input);
  if (!safe.ok) return safe;
  input = safe.value;
  if (
    !record(
      input,
      [
        "protocolVersion",
        "payloadVersion",
        "boundsProfile",
        "kind",
        "operation",
        "requestId",
        "workspaceId",
        "deviceId",
        "operationId",
        "expectedRevision",
        "occurredAt",
        "payload",
      ],
      [
        "protocolVersion",
        "payloadVersion",
        "boundsProfile",
        "kind",
        "operation",
        "requestId",
        "workspaceId",
        "payload",
      ],
    )
  )
    return fail("invalid_type");

  if (
    input.protocolVersion !== 1 ||
    input.payloadVersion !== 1 ||
    input.boundsProfile !== BOUNDS.id
  )
    return fail("invalid_format");

  if (typeof input.operation !== "string") return fail("invalid_type");

  const definition = registry.get(input.operation);

  if (!definition || input.kind !== definition.kind)
    return fail("invalid_format");

  const req = id(input.requestId, "request"),
    workspace = id(input.workspaceId, "workspace");

  if (!req.ok) return req;
  if (!workspace.ok) return workspace;
  if (definition.device !== Object.hasOwn(input, "deviceId"))
    return fail("invalid_format");
  if (definition.device && !id(input.deviceId, "device").ok)
    return fail("invalid_format");
  if (
    (definition.kind === "command") !== Object.hasOwn(input, "operationId") ||
    (definition.kind === "command" && !id(input.operationId, "operation").ok)
  )
    return fail("invalid_format");
  if (
    (definition.revision === "required") !==
      Object.hasOwn(input, "expectedRevision") ||
    (definition.revision === "required" && !revision(input.expectedRevision).ok)
  )
    return fail("invalid_format");
  if (
    Object.hasOwn(input, "occurredAt") &&
    (!definition.occurrence || !instant(input.occurredAt).ok)
  )
    return fail("invalid_format");

  const payload = definition.payload(input.payload, workspace.value);

  if (!payload.ok) return payload;

  const checked = plainData(payload.value);

  if (!checked.ok) return checked;

  return ok(
    Object.freeze({
      ...input,
      requestId: req.value,
      workspaceId: workspace.value,
      payload: checked.value,
    }) as Request,
  );
}

export const STATUSES = [
  "query_result",
  "rejected",
  "local_saved",
  "queued",
  "authoritative_committed",
  "job_accepted",
  "conflict",
  "outcome_unknown",
] as const;

const stageFields = {
  query_result: ["data", "freshness", "asOf", "revision"],
  rejected: ["error"],
  local_saved: ["receiptId", "localRevision"],
  queued: ["receiptId", "localRevision", "queueState"],
  authoritative_committed: [
    "receiptId",
    "committedRevision",
    "committedAt",
    "progressToken",
  ],
  job_accepted: ["receiptId", "acceptedAt", "jobState"],
  conflict: ["error", "currentRevision", "resolutionReference"],
  outcome_unknown: ["error", "reconciliation"],
} as const;

function sameId(input: unknown, expected: Id): boolean {
  const checked = id(input, expected.kind);
  return checked.ok && checked.value.value === expected.value;
}

export function response(input: unknown, original: Request): Result<Data> {
  const safe = plainData(input);

  if (!safe.ok) return safe;
  input = safe.value;

  const common = [
    "protocolVersion",
    "payloadVersion",
    "boundsProfile",
    "requestId",
    "workspaceId",
    "operation",
    "operationId",
    "status",
  ];

  if (
    !record(
      input,
      [...common, ...Object.values(stageFields).flat()],
      common.filter((k) => k !== "operationId"),
    )
  )
    return fail("invalid_type");

  if (
    input.protocolVersion !== 1 ||
    input.payloadVersion !== 1 ||
    input.boundsProfile !== BOUNDS.id ||
    input.operation !== original.operation ||
    !sameId(input.requestId, original.requestId) ||
    !sameId(input.workspaceId, original.workspaceId)
  )
    return fail("invalid_format");

  if (
    original.kind === "command"
      ? !original.operationId ||
        !sameId(input.operationId, original.operationId)
      : Object.hasOwn(input, "operationId")
  )
    return fail("invalid_format");

  if (!(STATUSES as readonly unknown[]).includes(input.status))
    return fail("invalid_format");

  const status = input.status as (typeof STATUSES)[number];
  if (
    !record(
      input,
      [...common, ...stageFields[status]],
      common.filter((k) => k !== "operationId"),
    )
  )
    return fail("invalid_format");

  if (status === "query_result" && original.kind !== "query")
    return fail("invalid_format");

  if (
    original.kind === "query" &&
    status !== "query_result" &&
    status !== "rejected"
  )
    return fail("invalid_format");

  if (
    status === "query_result" &&
    (!Object.hasOwn(input, "data") ||
      !["current", "cached"].includes(String(input.freshness)))
  )
    return fail("invalid_format");

  if (
    [
      "local_saved",
      "queued",
      "authoritative_committed",
      "job_accepted",
    ].includes(status) &&
    !id(input.receiptId, "receipt").ok
  )
    return fail("invalid_format");

  if (
    ["local_saved", "queued"].includes(status) &&
    !revision(input.localRevision).ok
  )
    return fail("invalid_format");

  if (status === "queued" && input.queueState !== "pending")
    return fail("invalid_format");

  if (
    status === "authoritative_committed" &&
    (!revision(input.committedRevision).ok || !instant(input.committedAt).ok)
  )
    return fail("invalid_format");

  if (
    status === "job_accepted" &&
    (!instant(input.acceptedAt).ok || input.jobState !== "accepted")
  )
    return fail("invalid_format");

  if (["rejected", "conflict", "outcome_unknown"].includes(status)) {
    const error = publicError(input.error);
    if (!error.ok) return error;
    if (status === "conflict" && error.value.code !== "REVISION_CONFLICT")
      return fail("invalid_format");

    if (
      status === "outcome_unknown" &&
      (error.value.code !== "OUTCOME_UNKNOWN" ||
        !id(input.reconciliation, "operation").ok ||
        !original.operationId ||
        !sameId(input.reconciliation, original.operationId))
    )
      return fail("invalid_format");
  }

  for (const key of ["revision", "currentRevision"])
    if (Object.hasOwn(input, key) && !revision(input[key]).ok)
      return fail("invalid_format");

  if (Object.hasOwn(input, "asOf") && !instant(input.asOf).ok)
    return fail("invalid_format");

  for (const key of ["progressToken", "resolutionReference"])
    if (
      Object.hasOwn(input, key) &&
      (typeof input[key] !== "string" || !input[key])
    )
      return fail("invalid_format");

  return ok(input as Data);
}
