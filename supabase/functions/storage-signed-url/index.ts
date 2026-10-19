import {
  validateTrustedContext,
  type MembershipLookup,
} from "../_shared/auth.ts";
import { parseStoragePath } from "../_shared/storage-path.ts";
import { jsonErrorResponse } from "../_shared/errors.ts";
import type { SignedUrlResponseDto } from "../../../app/shared/cloud-contracts.ts";

export interface StorageClientAdapter {
  from(bucket: string): {
    createSignedUrl(
      path: string,
      expiresIn: number,
    ):
      | Promise<{ data: { signedUrl: string } | null; error: any }>
      | { data: { signedUrl: string } | null; error: any };
  };
}

export async function handleSignedUrlRequest(
  req: Request,
  membershipLookup: MembershipLookup,
  storageClient: StorageClientAdapter,
): Promise<Response> {
  // 1. Validate caller authentication and active membership
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

  // 2. Extract requested storage path
  let storagePath: string | null = null;
  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { storagePath?: string };
      storagePath = body.storagePath || null;
    } catch {
      return jsonErrorResponse("VALIDATION", 400);
    }
  } else {
    const url = new URL(req.url);
    storagePath = url.searchParams.get("path");
  }

  if (!storagePath) {
    return jsonErrorResponse("VALIDATION", 400);
  }

  // 3. Parse and sanitize storage path
  let parsed;
  try {
    parsed = parseStoragePath(storagePath);
  } catch {
    return jsonErrorResponse("VALIDATION", 400);
  }

  // 4. Assert path belongs strictly to caller's workspace (cross-tenant denial)
  if (parsed.workspaceId !== context.workspaceId) {
    return jsonErrorResponse("FORBIDDEN", 403);
  }

  // 5. Generate signed URL with 15-minute (900-second) expiration
  const result = await storageClient
    .from("workspaces")
    .createSignedUrl(storagePath, 900);
  if (result.error || !result.data) {
    return jsonErrorResponse("RESOURCE_UNAVAILABLE", 404);
  }

  const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
  const responseDto: SignedUrlResponseDto = {
    signedUrl: result.data.signedUrl,
    expiresInSeconds: 900,
    expiresAt,
  };

  return new Response(JSON.stringify({ ok: true, data: responseDto }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    return jsonErrorResponse("SERVICE_UNAVAILABLE", 503);
  },
};
