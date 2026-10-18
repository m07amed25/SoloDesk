import {
  fail,
  ok,
  record,
  revision,
  type Result,
} from "../../domain/src/integers.ts";
import { id } from "../../domain/src/ids.ts";
import { instant } from "../../domain/src/dates.ts";
import { plainData, scopedReference, type Data } from "./validation.ts";
import { BOUNDS } from "./bounds.ts";
import type { Registry } from "./registry.ts";

export function supported(registry: Registry) {
  return Object.freeze(
    registry.catalogue().map((d) =>
      Object.freeze({
        ...d,
        protocolVersion: 1,
        boundsProfile: BOUNDS.id,
        intentVersion: "F003-intent-v1",
        eventVersions: Object.freeze([1]),
      }),
    ),
  );
}

export function acceptedEvent(
  input: unknown,
  eventKinds: readonly string[],
): Result<Data> {
  const safe = plainData(input);

  if (!safe.ok) return safe;

  input = safe.value;
  if (
    !record(
      input,
      [
        "protocolVersion",
        "eventVersion",
        "boundsProfile",
        "eventKind",
        "workspaceId",
        "entity",
        "revision",
        "operationId",
        "actorId",
        "committedAt",
        "progressToken",
        "payload",
        "occurredAt",
      ],
      [
        "protocolVersion",
        "eventVersion",
        "boundsProfile",
        "eventKind",
        "workspaceId",
        "entity",
        "revision",
        "operationId",
        "committedAt",
        "progressToken",
        "payload",
      ],
    )
  )
    return fail("invalid_type");

  if (
    input.protocolVersion !== 1 ||
    input.eventVersion !== 1 ||
    input.boundsProfile !== BOUNDS.id ||
    typeof input.eventKind !== "string" ||
    !eventKinds.includes(input.eventKind) ||
    input.eventKind.length > 64
  )
    return fail("invalid_format");

  const workspace = id(input.workspaceId, "workspace");

  if (!workspace.ok) return workspace;
  if (
    !scopedReference(input.entity, "project", workspace.value).ok ||
    !revision(input.revision).ok ||
    !id(input.operationId, "operation").ok ||
    !instant(input.committedAt).ok ||
    typeof input.progressToken !== "string" ||
    !input.progressToken
  )
    return fail("invalid_format");

  if (Object.hasOwn(input, "actorId") && !id(input.actorId, "actor").ok)
    return fail("invalid_format");

  if (Object.hasOwn(input, "occurredAt") && !instant(input.occurredAt).ok)
    return fail("invalid_format");

  return ok(input as Data);
}
