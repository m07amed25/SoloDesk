import { validateIdentityAccount } from "./identity-auth.ts";
import type { F009GatewayOptions } from "../command-gateway/index.ts";

export function identityRuntimeOptions(req: Request, env: Record<string, string | undefined>): F009GatewayOptions | undefined {
  const url = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return undefined;
  const issuer = `${url.replace(/\/$/, "")}/auth/v1`;
  const headers = {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: req.headers.get("authorization") || "",
  };
  const rpc = async (name: string, body: Record<string, unknown>) => {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST", headers, body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000), redirect: "error",
    });
    if (!response.ok) throw new Error("identity_service_unavailable");
    return response.json();
  };
  return {
    authenticateIdentity: (request) => validateIdentityAccount(request, { issuer, audience: env.SOLODESK_AUTH_AUDIENCE || "authenticated" }),
    enrollmentDb: {
      enroll: (_identity, request) => rpc("solodesk_enroll_device", { p_request: request }),
      result: (_identity, id) => rpc("solodesk_enrollment_result", { p_intent_id: id }),
    },
  };
}
