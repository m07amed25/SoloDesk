import type { CloudGatewayClient } from "./cloud-gateway-client.ts";

export type DegradedModeState =
  | "operational"
  | "offline_degraded"
  | "quota_exhausted";

export interface DegradedStatePayload {
  state: DegradedModeState;
  reason?: string;
  lastAttemptAt: string;
}

export interface PersistenceOutboxAdapter {
  executeTransaction<T>(
    workspaceId: string,
    fn: (tx: any) => Promise<T> | T,
  ): Promise<T>;
}

export class DegradedModeManager {
  private currentState: DegradedModeState = "operational";
  private listeners: Set<(payload: DegradedStatePayload) => void> = new Set();
  private gatewayClient: CloudGatewayClient;
  private persistence?: PersistenceOutboxAdapter;

  constructor(
    gatewayClient: CloudGatewayClient,
    persistence?: PersistenceOutboxAdapter,
  ) {
    this.gatewayClient = gatewayClient;
    this.persistence = persistence;
  }

  getState(): DegradedModeState {
    return this.currentState;
  }

  onStateChange(listener: (payload: DegradedStatePayload) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: DegradedModeState, reason?: string) {
    if (this.currentState !== state) {
      this.currentState = state;
      const payload: DegradedStatePayload = {
        state,
        reason,
        lastAttemptAt: new Date().toISOString(),
      };
      for (const listener of this.listeners) {
        try {
          listener(payload);
        } catch {
          // Prevent listener exceptions from breaking coordinator
        }
      }
    }
  }

  /**
   * Dispatches a command to cloud gateway. If cloud is paused, unavailable, or quota exhausted,
   * safely persists the operation to the local encrypted SQLite outbox (F007) without data loss.
   */
  async submitCommandWithFallback(
    workspaceId: string,
    operation: {
      operationId: string;
      aggregateType: string;
      aggregateId: string;
      operationType: "create" | "update" | "delete";
      payload: Record<string, unknown>;
      expectedRevision: number;
    },
  ): Promise<{ delivered: "cloud" | "local_outbox"; response?: any }> {
    const cloudResult = await this.gatewayClient.executeCommand(
      `${operation.aggregateType}.${operation.operationType}`,
      operation.payload,
    );

    if (cloudResult.ok) {
      this.setState("operational");
      return { delivered: "cloud", response: cloudResult.data };
    }

    const errCode = cloudResult.error?.code;

    // Detect cloud outage or quota lock
    if (errCode === "STORAGE_UNAVAILABLE") {
      this.setState("quota_exhausted", "Quota capacity reached 100%");
    } else if (
      errCode === "SERVICE_UNAVAILABLE" ||
      errCode === "PROVIDER_FAILURE"
    ) {
      this.setState("offline_degraded", "Cloud service paused or unreachable");
    }

    // Fallback: Commit to local encrypted SQLite outbox (F007)
    if (this.persistence) {
      await this.persistence.executeTransaction(workspaceId, async (tx) => {
        if (tx.enqueueOutboxOperation) {
          await tx.enqueueOutboxOperation({
            operationId: operation.operationId,
            workspaceId,
            aggregateType: operation.aggregateType,
            aggregateId: operation.aggregateId,
            operationType: operation.operationType,
            payload: operation.payload,
            expectedRevision: operation.expectedRevision,
          });
        }
      });
    }

    return { delivered: "local_outbox" };
  }
}
