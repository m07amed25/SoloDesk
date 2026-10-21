import {
  validateTrustedContext,
  type MembershipLookup,
} from "../_shared/auth.ts";
import { jsonErrorResponse } from "../_shared/errors.ts";
import {
  executeAuthoritativeCommand,
  reconcileOperation,
  type AuthoritativeDatabase,
  type TrustedContext,
} from "../_shared/authoritative-command.ts";
import { request } from "../../../packages/contracts/src/envelopes.ts";
import { id } from "../../../packages/domain/src/ids.ts";
import { isValidOperationType } from "../../../packages/contracts/src/authoritative-commands.ts";
import type { Registry } from "../../../packages/contracts/src/registry.ts";
import type { DatabaseMembershipReader } from "../_shared/evidence-authorization.ts";
import type { VerifiedIdentityContext } from "../_shared/identity-auth.ts";
import { identityRuntimeOptions } from "../_shared/identity-runtime.ts";
import {
  parseDeviceEnrollmentRequest,
  type DeviceEnrollmentDatabase,
} from "../_shared/device-enrollment.ts";

export interface F009GatewayOptions {
  // Must verify credentials and derive workspace/device authority on the service.
  authenticate?: (req: Request) => Promise<TrustedContext | null>;
  db?: AuthoritativeDatabase;
  membershipReader?: DatabaseMembershipReader;
  registry?: Registry;
  authenticateIdentity?: (req: Request) => Promise<VerifiedIdentityContext | null>;
  enrollmentDb?: DeviceEnrollmentDatabase;
}

export async function handleCommandGateway(
  req: Request,
  membershipLookup: MembershipLookup,
  commandDispatcher?: (
    command: string,
    payload: Record<string, unknown>,
    context: any,
  ) => Promise<unknown>,
  f009Options?: F009GatewayOptions,
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonErrorResponse("VALIDATION", 405);
  }

  let body: any;
  try {
    body = await req.json();
    if (!body || typeof body !== "object") {
      return jsonErrorResponse("VALIDATION", 400);
    }
  } catch {
    return jsonErrorResponse("VALIDATION", 400);
  }

  if (body.command === "device.enroll" || body.command === "device.enrollmentResult") {
    if (!f009Options?.authenticateIdentity || !f009Options.enrollmentDb) {
      return jsonErrorResponse("SERVICE_UNAVAILABLE", 503);
    }
    const identity = await f009Options.authenticateIdentity(req);
    if (!identity) return jsonErrorResponse("AUTH_REQUIRED", 401);
    if (body.command === "device.enroll") {
      const payload = await parseDeviceEnrollmentRequest(body.payload);
      if (!payload) return jsonErrorResponse("VALIDATION", 400);
      const data = await f009Options.enrollmentDb.enroll(identity, payload);
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (
      !body.payload ||
      typeof body.payload !== "object" ||
      Object.keys(body.payload).length !== 1 ||
      typeof body.payload.enrollmentIntentId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.payload.enrollmentIntentId)
    ) return jsonErrorResponse("VALIDATION", 400);
    const data = await f009Options.enrollmentDb.result(
      identity,
      body.payload.enrollmentIntentId,
    );
    const safeData =
      data &&
      typeof data === "object" &&
      "status" in data &&
      ["enrolled", "not_enrolled", "outcome_unknown", "rejected"].includes(
        String(data.status),
      )
        ? data
        : { status: "outcome_unknown" };
    return new Response(JSON.stringify({ ok: true, data: safeData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // F009 Authoritative Command / Query branch
  if (
    body.protocolVersion === 1 ||
    body.boundsProfile === "F003-bounds-v1" ||
    body.kind === "command" ||
    body.kind === "query"
  ) {
    if (!f009Options?.db || !f009Options.registry || !f009Options.membershipReader || !f009Options.authenticate) {
      return jsonErrorResponse("SERVICE_UNAVAILABLE", 503);
    }
    {
      const trustedCtx = await f009Options.authenticate(req);
      if (!trustedCtx) return jsonErrorResponse("AUTH_REQUIRED", 401);
      const membershipReader = f009Options.membershipReader;
      const parsed = request(body, f009Options.registry);
      if (!parsed.ok || parsed.value.workspaceId.value !== trustedCtx.workspaceId) {
        return jsonErrorResponse("VALIDATION", 400);
      }
      // Handle reconciliation query operation
      if (body.kind === "query" && body.operation === "command.reconcile") {
        const payload = parsed.value.payload as Record<string, unknown>;
        if (!isValidOperationType(payload.originalOperation) || !id({ kind: "operation", value: payload.originalOperationId }, "operation").ok) {
          return jsonErrorResponse("VALIDATION", 400);
        }
        const reconResult = await reconcileOperation(
          f009Options.db,
          membershipReader,
          trustedCtx.workspaceId,
          trustedCtx.actorId,
          payload.originalOperation as string,
          payload.originalOperationId as string,
        );

        return new Response(
          JSON.stringify({
            ok:
              reconResult.outcome === "committed" ||
              reconResult.outcome === "job_accepted",
            status: reconResult.outcome,
            data: reconResult,
          }, (_key, value) => typeof value === "bigint" ? value.toString() : value),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Handle authoritative command
      const output = await executeAuthoritativeCommand(
        f009Options.db,
        membershipReader,
        {
          rawRequest: body,
          trustedContext: trustedCtx,
          registry: f009Options.registry,
        },
      );

      const httpStatus = output.ok
        ? 200
        : output.status === "conflict"
          ? 409
          : 400;
      return new Response(
        JSON.stringify({
          ok: output.ok,
          status: output.status,
          receipt: output.receipt,
          event: output.event,
          error: output.error,
          currentRevision: output.currentRevision,
          progressToken: output.progressToken,
        }, (_key, value) => typeof value === "bigint" ? value.toString() : value),
        {
          status: httpStatus,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // F008 legacy command branch
  const authResult = await validateTrustedContext(req, membershipLookup);
  if (!authResult.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: authResult.error }),
      {
        status: authResult.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { context } = authResult;


  if (typeof body.command !== "string") {
    return jsonErrorResponse("VALIDATION", 400);
  }

  if (commandDispatcher) {
    try {
      const data = await commandDispatcher(body.command, body.payload, context);
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      if (err.statusCode === 403) {
        return jsonErrorResponse("FORBIDDEN", 403);
      }
      if (err.statusCode === 507 || err.code === "STORAGE_UNAVAILABLE") {
        return jsonErrorResponse("STORAGE_UNAVAILABLE", 507);
      }
      return jsonErrorResponse("PROVIDER_FAILURE", 500);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, data: { status: "accepted", context } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export default {
  async fetch(req: Request): Promise<Response> {
    const runtime = (globalThis as unknown as { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
    const env = Object.fromEntries(
      ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "SOLODESK_AUTH_AUDIENCE"]
        .map((key) => [key, runtime?.env.get(key)]),
    );
    try {
      return await handleCommandGateway(req, async () => null, undefined, identityRuntimeOptions(req, env));
    } catch {
      return jsonErrorResponse("SERVICE_UNAVAILABLE", 503);
    }
  },
};
