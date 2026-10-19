import type { TrustedContext } from "../../../app/shared/cloud-contracts.ts";

export interface BatchEntityOperation {
  table: string;
  data: {
    workspace_id: string;
    id: string;
    [key: string]: unknown;
  };
}

export interface BatchDbAdapter {
  transaction<T>(fn: () => T): () => T;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
  };
}

export function executeUniformTenantBatch(
  db: BatchDbAdapter,
  context: TrustedContext,
  operations: readonly BatchEntityOperation[],
): { success: true; executedCount: number } {
  if (operations.length === 0) {
    return { success: true, executedCount: 0 };
  }

  // 1. Verify uniform tenant attribution across 100% of operations
  for (const op of operations) {
    if (!op.data || typeof op.data !== "object") {
      throw new Error("Invalid operation payload in batch transaction");
    }

    if (op.data.workspace_id !== context.workspaceId) {
      const err = new Error(
        `Cross-tenant batch transaction rejected: entity '${op.data.id}' has workspace '${op.data.workspace_id}' differing from caller workspace '${context.workspaceId}'`,
      );
      (err as any).statusCode = 403;
      (err as any).code = "23503";
      throw err;
    }
  }

  // 2. Execute atomically inside transaction
  const tx = db.transaction(() => {
    for (const op of operations) {
      const cols = Object.keys(op.data);
      const placeholders = cols.map(() => "?").join(", ");
      const values = cols.map((c) => op.data[c]);

      const sql = `INSERT INTO ${op.table} (${cols.join(", ")}) VALUES (${placeholders})`;
      db.prepare(sql).run(...values);
    }

    return {
      success: true as const,
      executedCount: operations.length,
    };
  });

  return tx();
}
