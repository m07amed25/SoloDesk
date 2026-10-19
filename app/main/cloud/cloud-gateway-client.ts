import type {
  CommandGatewayRequest,
  CommandGatewayResponse,
} from "../../shared/cloud-contracts.ts";

export interface CloudGatewayClientOptions {
  gatewayUrl?: string;
  authToken?: string;
  workspaceId: string;
  fetchFn?: typeof fetch;
}

export class CloudGatewayClient {
  private gatewayUrl: string;
  private authToken?: string;
  private workspaceId: string;
  private fetchFn: typeof fetch;

  constructor(options: CloudGatewayClientOptions) {
    this.gatewayUrl =
      options.gatewayUrl ||
      "http://127.0.0.1:54321/functions/v1/command-gateway";
    this.authToken = options.authToken;
    this.workspaceId = options.workspaceId;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  setWorkspaceId(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  async executeCommand<T = unknown>(
    command: string,
    payload: Record<string, unknown>,
  ): Promise<CommandGatewayResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Workspace-Id": this.workspaceId,
      };

      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      const body: CommandGatewayRequest = { command, payload };
      const res = await this.fetchFn(this.gatewayUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errJson: any;
        try {
          errJson = await res.json();
        } catch {
          errJson = null;
        }

        if (errJson && errJson.error) {
          return { ok: false, error: errJson.error };
        }

        const fallbackCode =
          res.status === 507
            ? "STORAGE_UNAVAILABLE"
            : res.status === 503
              ? "SERVICE_UNAVAILABLE"
              : res.status === 403
                ? "FORBIDDEN"
                : "PROVIDER_FAILURE";

        return {
          ok: false,
          error: {
            code: fallbackCode as any,
            messageKey: `error.${fallbackCode.toLowerCase()}`,
            params: Object.freeze({}),
            diagnosticId: `dia_${Date.now()}` as any,
            recovery: "recover_storage" as any,
            outcomeCertainty: "not_applied",
          },
        };
      }

      const data = await res.json();
      return data;
    } catch (networkErr: any) {
      // Complete network loss or server unreachable
      return {
        ok: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          messageKey: "error.service_unavailable",
          params: Object.freeze({}),
          diagnosticId: `dia_net_${Date.now()}` as any,
          recovery: "reconcile_operation",
          outcomeCertainty: "not_applied",
        },
      };
    }
  }
}
