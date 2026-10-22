import {
  type WorkspaceCreationRequest,
  type WorkspaceCreationResult,
  type WorkspaceCreationPolicySafe,
  type WorkspaceSummary,
  type SafeReasonCode,
  type SafeActionCode,
  rejectProhibitedAuthority,
  isValidWorkspaceId,
  isValidUuidV4,
} from "../../shared/workspace-contracts.ts";

export type RpcExecutor = (
  functionName: string,
  params?: Record<string, unknown>,
  accessToken?: string,
) => Promise<unknown>;

export interface WorkspaceServiceConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly rpcExecutor?: RpcExecutor;
}

export function mapServiceErrorToSafeCode(error: unknown): {
  code: SafeReasonCode;
  recovery: SafeActionCode;
} {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("current account required") ||
    msg.includes("auth") ||
    msg.includes("JWT")
  ) {
    return { code: "auth_required", recovery: "sign_in_again" };
  }
  if (msg.includes("device_not_enrolled") || msg.includes("device")) {
    return { code: "device_not_enrolled", recovery: "reenroll_device" };
  }
  if (msg.includes("stale_creation_policy")) {
    return { code: "stale_creation_policy", recovery: "refresh_options" };
  }
  if (msg.includes("workspace_creation_unavailable")) {
    return {
      code: "workspace_creation_unavailable",
      recovery: "retry_or_contact_support",
    };
  }
  if (msg.includes("changed_intent")) {
    return { code: "changed_intent", recovery: "reconcile_creation" };
  }
  if (msg.includes("outcome_unknown")) {
    return { code: "outcome_unknown", recovery: "reconcile_creation" };
  }
  if (msg.includes("validation")) {
    return { code: "validation", recovery: "correct_input" };
  }
  if (msg.includes("upgrade")) {
    return { code: "upgrade_required", recovery: "upgrade" };
  }
  if (msg.includes("unavailable") || msg.includes("not found")) {
    return {
      code: "workspace_unavailable",
      recovery: "choose_another_workspace",
    };
  }
  return { code: "service_unavailable", recovery: "retry" };
}

export class WorkspaceService {
  private readonly config: WorkspaceServiceConfig;
  private readonly rpc: RpcExecutor;

  constructor(config: WorkspaceServiceConfig) {
    this.config = config;
    this.rpc =
      config.rpcExecutor ??
      (async (fn: string, params?: Record<string, unknown>, token?: string) => {
        const url = `${this.config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: this.config.supabaseAnonKey,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: params ? JSON.stringify(params) : "{}",
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(
            `RPC ${fn} failed (${resp.status}): ${text.slice(0, 200)}`,
          );
        }
        return resp.json();
      });
  }

  async getBootstrap(accessToken: string): Promise<{
    version: 1;
    creation: WorkspaceCreationPolicySafe;
    workspaces: readonly WorkspaceSummary[];
  }> {
    if (!accessToken) {
      throw new Error("auth_required");
    }
    try {
      const res = (await this.rpc(
        "solodesk_workspace_bootstrap",
        {},
        accessToken,
      )) as {
        version: 1;
        creation: WorkspaceCreationPolicySafe;
        workspaces: WorkspaceSummary[];
      };
      if (!res || typeof res !== "object") {
        throw new Error("invalid_bootstrap_response");
      }
      return Object.freeze({
        version: 1,
        creation: Object.freeze(res.creation),
        workspaces: Object.freeze(res.workspaces || []),
      });
    } catch (err) {
      const mapped = mapServiceErrorToSafeCode(err);
      throw new Error(mapped.code);
    }
  }

  async createWorkspace(
    accessToken: string,
    request: WorkspaceCreationRequest,
  ): Promise<WorkspaceCreationResult> {
    if (!accessToken) {
      return {
        status: "rejected",
        code: "auth_required",
        diagnosticId: "err-auth-req",
        recovery: "sign_in_again",
      };
    }
    rejectProhibitedAuthority(request as unknown as Record<string, unknown>);
    try {
      const res = (await this.rpc(
        "solodesk_create_workspace",
        { p_request: request },
        accessToken,
      )) as WorkspaceCreationResult;
      return res;
    } catch (err) {
      const mapped = mapServiceErrorToSafeCode(err);
      return {
        status: "rejected",
        code: mapped.code,
        diagnosticId: "err-rpc-create",
        recovery: mapped.recovery,
      };
    }
  }

  async reconcileCreation(
    accessToken: string,
    intentId: string,
  ): Promise<WorkspaceCreationResult> {
    if (!accessToken) {
      return {
        status: "rejected",
        code: "auth_required",
        diagnosticId: "err-auth-req",
        recovery: "sign_in_again",
      };
    }
    if (!isValidUuidV4(intentId)) {
      return {
        status: "rejected",
        code: "validation",
        diagnosticId: "err-invalid-intent",
        recovery: "correct_input",
      };
    }
    try {
      const res = (await this.rpc(
        "solodesk_reconcile_workspace_creation",
        { p_intent_id: intentId },
        accessToken,
      )) as WorkspaceCreationResult;
      return res;
    } catch (err) {
      const mapped = mapServiceErrorToSafeCode(err);
      return {
        status: "rejected",
        code: mapped.code,
        diagnosticId: "err-rpc-reconcile",
        recovery: mapped.recovery,
      };
    }
  }

  async listSelectable(
    accessToken: string,
  ): Promise<readonly WorkspaceSummary[]> {
    if (!accessToken) {
      throw new Error("auth_required");
    }
    try {
      const res = (await this.rpc(
        "solodesk_list_selectable_workspaces",
        {},
        accessToken,
      )) as WorkspaceSummary[] | { workspaces: WorkspaceSummary[] };
      const items = Array.isArray(res) ? res : res?.workspaces || [];
      return Object.freeze(items);
    } catch (err) {
      const mapped = mapServiceErrorToSafeCode(err);
      throw new Error(mapped.code);
    }
  }

  async checkSelectability(
    accessToken: string,
    workspaceId: string,
  ): Promise<
    | { status: "selectable"; workspace: WorkspaceSummary }
    | { status: "unavailable"; code: "workspace_unavailable" }
  > {
    if (!accessToken) {
      return { status: "unavailable", code: "workspace_unavailable" };
    }
    if (!isValidWorkspaceId(workspaceId, true)) {
      return { status: "unavailable", code: "workspace_unavailable" };
    }
    try {
      const res = (await this.rpc(
        "solodesk_check_workspace_selectability",
        { p_workspace_id: workspaceId },
        accessToken,
      )) as
        | { status: "selectable"; workspace: WorkspaceSummary }
        | { status: "unavailable"; code: "workspace_unavailable" };
      return res;
    } catch {
      return { status: "unavailable", code: "workspace_unavailable" };
    }
  }
}
