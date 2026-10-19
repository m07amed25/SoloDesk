import {
  validateTrustedContext,
  type MembershipLookup,
} from "../_shared/auth.ts";
import { jsonErrorResponse, createPublicError } from "../_shared/errors.ts";
import type { CommandGatewayRequest } from "../../../app/shared/cloud-contracts.ts";

export async function handleCommandGateway(
  req: Request,
  membershipLookup: MembershipLookup,
  commandDispatcher?: (
    command: string,
    payload: Record<string, unknown>,
    context: any,
  ) => Promise<unknown>,
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonErrorResponse("VALIDATION", 405);
  }

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

  let body: CommandGatewayRequest;
  try {
    body = (await req.json()) as CommandGatewayRequest;
    if (!body || typeof body.command !== "string") {
      return jsonErrorResponse("VALIDATION", 400);
    }
  } catch {
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
