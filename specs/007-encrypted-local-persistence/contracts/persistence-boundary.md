# Contract: Persistence Boundary & IPC Surface

**Feature**: F007 Encrypted Local Persistence and Migrations
**Scope**: Electron Main Process Storage Architecture, Trusted Boundary, and Renderer IPC Surface

---

## 1. Architectural Boundary

In accordance with Constitution Principle II and F004 process isolation rules:

- All database connections, SQL queries, encryption keys, and filesystem operations MUST execute exclusively within the **Electron Main Process**.
- The **Renderer Process** remains completely unprivileged: it has no Node integration, no filesystem access, and no SQL execution channel.
- Communication between Main and Renderer occurs strictly through narrow, validated IPC channels defined in preload.

---

## 2. Main Process Persistence Service Contract

The internal main process interface exposed to domain and application services:

```typescript
export interface PersistenceService {
  /**
   * Opens and decrypts the workspace database.
   * Performs schema version verification and executes migrations if required.
   * Fails closed if keys are missing, database is corrupt, or schema is unsupported.
   */
  openWorkspaceStore(
    workspaceId: string,
    keyBinding: KeyBindingToken,
  ): Promise<StorageOpenResult>;

  /**
   * Flushes WAL commits, checkpoints the database, closes connections,
   * and wipes cached cryptographic keys and memory buffers.
   */
  closeWorkspaceStore(workspaceId: string): Promise<void>;

  /**
   * Executes a unit of work inside an ACID SQLite transaction.
   * If the callback throws or process crashes, changes roll back completely.
   */
  executeTransaction<T>(
    workspaceId: string,
    operation: (tx: TransactionScope) => Promise<T>,
  ): Promise<T>;

  /**
   * Retrieves the current diagnostic persistence state for a workspace.
   */
  getPersistenceState(workspaceId: string): PersistenceState;
}

export interface TransactionScope {
  /**
   * Inserts or updates a domain entity record.
   */
  persistEntity<T extends BaseEntity>(table: string, entity: T): Promise<void>;

  /**
   * Enqueues an outbound synchronization operation atomically with entity mutation.
   */
  enqueueOutboxOperation(operation: OutboxOperationInput): Promise<void>;

  /**
   * Executes a typed query within the active transaction scope.
   */
  query<T>(query: TypedQuery<T>): Promise<T[]>;
}
```

---

## 3. Renderer IPC Channel Specification

Preload exposes only safe, high-level status inquiries and recovery triggers. It exposes **zero SQL execution bridges or filesystem paths**.

### 3.1 Preload Facade Surface (`window.solodesk.persistence`)

```typescript
export interface RendererPersistenceBridge {
  /**
   * Returns current storage status for the active workspace.
   */
  getState: (workspaceId: string) => Promise<PersistenceStatusDto>;

  /**
   * Requests a retry of workspace store initialization after resolving
   * a locked vault or freeing disk space.
   */
  retryOpen: (workspaceId: string) => Promise<PersistenceStatusDto>;

  /**
   * Subscribes to storage status change notifications (e.g., transition to recovery_required).
   */
  onStateChanged: (
    callback: (status: PersistenceStatusDto) => void,
  ) => () => void;
}
```

### 3.2 IPC Data Transfer Object (`PersistenceStatusDto`)

```typescript
export interface PersistenceStatusDto {
  workspaceId: string;
  status:
    | "uninitialized"
    | "opening"
    | "ready"
    | "recovery_required"
    | "closed";
  recoveryDetails?: {
    reasonCode:
      | "vault_locked"
      | "key_missing"
      | "integrity_failed"
      | "disk_full"
      | "interrupted_migration"
      | "unsupported_future_version"
      | "io_error";
    isRecoverable: boolean;
    unsyncedWorkRetained: boolean;
    requiredFreeSpaceMb?: number;
    availableFreeSpaceMb?: number;
    localizedTitle: {
      en: string;
      ar: string;
    };
    localizedMessage: {
      en: string;
      ar: string;
    };
    localizedGuidance: {
      en: string;
      ar: string;
    };
    permittedActions: Array<"retry" | "unlock" | "export_backup" | "quit">;
  };
}
```

---

## 4. Error Sanitization & Security Rules

1. **Path Redaction**: Full filesystem paths (e.g. `/home/user/.../store.db`) MUST NEVER be transmitted over IPC or rendered in error dialogs.
2. **Key Redaction**: Encryption keys, passphrases, and raw memory hex dumps MUST NEVER be logged or serialized.
3. **Closed Error Codes**: All errors must map to defined `reasonCode` values. Raw native SQLite error codes (`SQLITE_CORRUPT`, `SQLITE_IOERR`) must be translated into structured domain diagnostics before crossing boundaries.
4. **Fail-Closed Guarantee**: Any uncaught storage exception closes active statements, aborts the transaction, and locks the store. No data is written in plain text.
