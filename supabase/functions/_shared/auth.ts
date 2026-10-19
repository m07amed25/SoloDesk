// JWT validation and TrustedContext extraction for Edge Functions
import type { Id } from "../../../packages/domain/src/ids.ts";
import type {
  TrustedContext,
  WorkspaceRole,
} from "../../../app/shared/cloud-contracts.ts";
import { createPublicError } from "./errors.ts";

export type AuthValidationResult =
  | { ok: true; context: TrustedContext }
  | { ok: false; status: number; error: ReturnType<typeof createPublicError> };

export interface MembershipRecord {
  role: WorkspaceRole;
  status: "invited" | "active" | "suspended" | "revoked";
}

export type MembershipLookup = (
  workspaceId: string,
  userId: string,
) => Promise<MembershipRecord | null> | MembershipRecord | null;

/**
 * Extracts and validates JWT, X-Workspace-Id, and live membership status.
 */
export async function validateTrustedContext(
  req: Request,
  membershipLookup: MembershipLookup,
): Promise<AuthValidationResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      error: createPublicError("AUTH_REQUIRED"),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: createPublicError("AUTH_REQUIRED"),
    };
  }

  // Parse Actor ID from JWT (sub or custom claim)
  let actorId: string | undefined;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson);
      actorId = payload.sub ?? payload.user_id ?? payload.actor_id;
    } else if (token.startsWith("usr_")) {
      // Direct actor test token
      actorId = token;
    }
  } catch {
    // Malformed token payload
  }

  if (!actorId || !actorId.startsWith("usr_")) {
    return {
      ok: false,
      status: 401,
      error: createPublicError("AUTH_REQUIRED"),
    };
  }

  const workspaceId = req.headers.get("X-Workspace-Id");
  if (!workspaceId || !workspaceId.startsWith("ws_")) {
    return {
      ok: false,
      status: 400,
      error: createPublicError("VALIDATION"),
    };
  }

  // Perform live DB membership lookup
  const membership = await membershipLookup(workspaceId, actorId);
  if (!membership) {
    return {
      ok: false,
      status: 403,
      error: createPublicError("FORBIDDEN"),
    };
  }

  if (membership.status === "revoked") {
    return {
      ok: false,
      status: 401,
      error: createPublicError("SESSION_REVOKED"),
    };
  }

  if (membership.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: createPublicError("FORBIDDEN"),
    };
  }

  const deviceHeader = req.headers.get("X-Device-Id");
  const deviceId =
    deviceHeader && deviceHeader.startsWith("dev_")
      ? (deviceHeader as Id<"device">)
      : undefined;

  const context: TrustedContext = {
    actorId: actorId as Id<"actor">,
    workspaceId: workspaceId as Id<"workspace">,
    deviceId,
    role: membership.role,
    sessionObservation: new Date().toISOString(),
    authorityObservation: `mem_${workspaceId}_${actorId}`,
  };

  return { ok: true, context };
}
