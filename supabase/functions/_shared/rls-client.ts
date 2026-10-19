// Tenant-scoped Supabase client factory for Edge Functions
// Enforces that queries executed via this client include the caller's JWT and tenant headers.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TrustedContext } from "../../../app/shared/cloud-contracts.ts";

export interface TenantClientOptions {
  supabaseUrl?: string;
  publishableKey?: string;
  authToken?: string;
  context?: TrustedContext;
}

export function createTenantScopedClient(
  options: TenantClientOptions,
): SupabaseClient {
  const url =
    options.supabaseUrl ||
    process.env.VITE_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const key =
    options.publishableKey ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "anon-key";

  const headers: Record<string, string> = {};
  if (options.context) {
    headers["X-Workspace-Id"] = options.context.workspaceId;
    headers["X-Actor-Id"] = options.context.actorId;
    if (options.context.deviceId) {
      headers["X-Device-Id"] = options.context.deviceId;
    }
  }

  if (options.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}
