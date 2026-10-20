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

export interface F009GatewayOptions {
  // Must verify credentials and derive workspace/device authority on the service.
  authenticate?: (req: Request) => Promise<TrustedContext | null>;
  db?: AuthoritativeDatabase;
  membershipReader?: DatabaseMembershipReader;
  registry?: Registry;
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
    return handleCommandGateway(req, async () => null);
  },
};
