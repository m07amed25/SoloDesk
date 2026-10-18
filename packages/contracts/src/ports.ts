import type { Id } from "../../domain/src/ids.ts";
import type { Result } from "../../domain/src/integers.ts";
import type { LookupTimeZone } from "../../domain/src/dates.ts";
import type { ScopedReference, Data } from "./validation.ts";

export interface Utf8Codec {
  encode(text: string): Uint8Array;
  decode(bytes: Uint8Array): string;
}

export interface TimeZonePorts {
  lookupTimeZone: LookupTimeZone;
}

export type TrustedContext = Readonly<{
  actorId: Id<"actor">;
  workspaceId: Id<"workspace">;
  deviceId?: Id<"device">;
  sessionObservation: string;
  authorityObservation: string;
}>;

export type Authority = Readonly<{
  status: "permitted" | "denied" | "revoked" | "expired" | "unavailable";
  observation: string;
}>;

export interface ResourcePorts {
  resolveResource(
    context: TrustedContext,
    reference: ScopedReference,
  ): Result<Readonly<{ reference: ScopedReference; revision: string }>>;
  authorizeAction(
    context: TrustedContext,
    action: "conformance.record",
    reference: ScopedReference,
  ): Authority;
}
export interface ReceiptPorts<T> {
  findOperationReceipt(
    context: TrustedContext,
    operationId: Id<"operation">,
  ): Result<T | null>;
  resolveOperationStatus(
    context: TrustedContext,
    operationId: Id<"operation">,
  ): Result<T | null>;
}
export interface ChangePorts<C extends Data, R extends Data> {
  saveLocalChange(context: TrustedContext, change: C): Result<R>;
  commitAuthorizedChange(
    context: TrustedContext,
    change: C,
    expectedRevision: string,
  ): Result<R>;
}
