import {
  publicError,
  recoveryFor,
} from "../../../packages/contracts/src/errors.ts";
import { response } from "../../../packages/contracts/src/envelopes.ts";
import { tagged } from "./context.mjs";
export function error(code, certainty = "not_applied", extra = {}) {
  const r = publicError({
    code,
    messageKey: `error.${code.toLowerCase()}`,
    params: {},
    diagnosticId: tagged("diagnostic", 90),
    recovery: recoveryFor(code),
    outcomeCertainty: certainty,
    ...extra,
  });
  if (!r.ok) throw new Error("invalid synthetic error");
  return r.value;
}
export function result(request, status, fields) {
  const value = {
    protocolVersion: 1,
    payloadVersion: 1,
    boundsProfile: "F003-bounds-v1",
    operation: request.operation,
    requestId: request.requestId,
    workspaceId: request.workspaceId,
    ...(request.operationId ? { operationId: request.operationId } : {}),
    status,
    ...fields,
  };
  const valid = response(value, request);
  if (!valid.ok) throw new Error(`invalid fixture response: ${valid.issue}`);
  return valid.value;
}

export const rawError = (code = "VALIDATION") => ({
  code,
  messageKey: `error.${code.toLowerCase()}`,
  params: {},
  diagnosticId: tagged("diagnostic", 90),
  recovery: recoveryFor(code),
  outcomeCertainty:
    code === "OUTCOME_UNKNOWN" ||
    code === "PROVIDER_FAILURE" ||
    code === "SERVICE_UNAVAILABLE"
      ? "unknown"
      : "not_applied",
  ...(code === "RATE_LIMITED" ? { retryAfterMs: 1000 } : {}),
});
