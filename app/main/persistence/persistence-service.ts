import { randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import type { NativeDatabase } from "better-sqlite3-multiple-ciphers";
import type { ProtectionOwner } from "../protection/owner.ts";
import type { ProtectedDataSet } from "../protection/types.ts";
import { PROTECTION_FORMAT_VERSION } from "../protection/types.ts";
import {
  isWorkspaceId,
  type PersistenceStatusDto,
} from "../../shared/persistence-contracts.ts";
import { DatabaseConnection } from "./database-connection.ts";
import {
  MigrationCoordinator,
  type MigrationStep,
} from "./migration-coordinator.ts";
import { payloadDigest } from "./schema/outbox-schema.ts";
import { classifyStorageError, recoveryStatus } from "./recovery-state.ts";
import { probeStorage } from "./storage-probe.ts";
import {
  assertPathComponentsSafe,
  ensurePrivateDirectories,
  workspacePaths,
  type WorkspacePaths,
} from "./workspace-storage-paths.ts";

export type LocalEntityInput = Readonly<{
  id: string;
  workspaceId: string;
  expectedRevision: number;
  dataPayload: string;
  parentId?: string;
  deletedAt?: string;
}>;
export type OutboxOperationInput = Readonly<{
  operationId: string;
  workspaceId: string;
  aggregateType: string;
  aggregateId: string;
  operationType: "create" | "update" | "delete" | "execute";
  payload: unknown;
  expectedRevision: number;
}>;
export type TypedQuery<T> = Readonly<{
  kind: "entityById" | "outboxById";
  id: string;
}> & { readonly __result?: T };
export interface TransactionScope {
  persistEntity(
    table: "_entity_example",
    entity: LocalEntityInput,
  ): Promise<void>;
  enqueueOutboxOperation(operation: OutboxOperationInput): Promise<void>;
  query<T>(query: TypedQuery<T>): Promise<T[]>;
}

type ActiveStore = {
  workspaceId: string;
  connection: DatabaseConnection;
  key: Buffer;
  paths: WorkspacePaths;
};
type StoreManifest = ProtectedDataSet & { workspaceId: string };

export class PersistenceService {
  private active?: ActiveStore;
  private busy = false;
  private closing = false;
  private idle: Promise<void> | null = null;
  private releaseIdle?: () => void;
  private readonly states = new Map<string, PersistenceStatusDto>();
  private readonly listeners = new Set<(state: PersistenceStatusDto) => void>();
  private readonly userData: string;
  private readonly profileId: string;
  private readonly protection: ProtectionOwner;
  private readonly steps?: readonly MigrationStep[];
  private readonly availableSpaceOverride?: number;
  get activeWorkspaceId(): string | undefined {
    return this.active?.workspaceId;
  }
  constructor(
    userData: string,
    profileId: string,
    protection: ProtectionOwner,
    steps?: readonly MigrationStep[],
    availableSpaceOverride?: number,
  ) {
    if (!isWorkspaceId(profileId)) throw new Error("invalid_namespace");
    this.userData = userData;
    this.profileId = profileId;
    this.protection = protection;
    this.steps = steps;
    this.availableSpaceOverride = availableSpaceOverride;
  }

  onStateChanged(listener: (state: PersistenceStatusDto) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private setState(state: PersistenceStatusDto): PersistenceStatusDto {
    this.states.set(state.workspaceId, state);
    for (const listener of this.listeners) listener(state);
    return state;
  }
  getPersistenceState(workspaceId: string): PersistenceStatusDto {
    if (!isWorkspaceId(workspaceId)) throw new Error("invalid_namespace");
    return (
      this.states.get(workspaceId) ?? { workspaceId, status: "uninitialized" }
    );
  }

  async openWorkspaceStore(
    workspaceId: string,
    keyBinding: ProtectionOwner = this.protection,
  ): Promise<PersistenceStatusDto> {
    if (!isWorkspaceId(workspaceId) || keyBinding !== this.protection)
      throw new Error("protection_denied");
    if (this.busy || this.closing) throw new Error("store_busy");
    if (this.active?.workspaceId === workspaceId)
      return this.getPersistenceState(workspaceId);
    if (this.active) await this.closeWorkspaceStore(this.active.workspaceId);
    this.setState({ workspaceId, status: "opening" });
    const paths = workspacePaths(this.userData, this.profileId, workspaceId);
    let connection: DatabaseConnection | undefined;
    let createdNamespace = false;
    try {
      assertPathComponentsSafe(this.userData, paths);
      const probe = probeStorage(paths);
      if (probe === "key_missing" || probe === "integrity_failed")
        throw new Error(probe);
      let key: Buffer;
      if (probe === "uninitialized") {
        this.protection.assertKeyAvailable();
        ensurePrivateDirectories(this.userData, paths);
        createdNamespace = true;
        const manifest: StoreManifest = {
          workspaceId,
          dataSetId: randomUUID(),
          identityBindingId: this.profileId,
          formatVersion: PROTECTION_FORMAT_VERSION,
          activeGeneration: randomUUID(),
          state: "sealed",
        };
        const handle = await this.protection.createKey(
          paths.envelope,
          manifest.dataSetId,
          manifest.activeGeneration,
        );
        key = handle.key;
        connection = DatabaseConnection.open(paths.database, key, false);
        new MigrationCoordinator(
          paths,
          this.steps,
          this.availableSpaceOverride,
        ).initializeNew(connection);
        writeFileSync(paths.manifest, JSON.stringify(manifest), {
          flag: "wx",
          mode: 0o600,
        });
      } else {
        const manifest = JSON.parse(
          readFileSync(paths.manifest, "utf8"),
        ) as StoreManifest;
        if (
          manifest.workspaceId !== workspaceId ||
          manifest.identityBindingId !== this.profileId
        )
          throw new Error("integrity_failed");
        const handle = await this.protection.openKey(paths.envelope, manifest);
        key = handle.key;
        connection = DatabaseConnection.open(paths.database, key, true);
        // Existing files are never initialized or replaced after a read failure.
        connection = await new MigrationCoordinator(
          paths,
          this.steps,
          this.availableSpaceOverride,
        ).migrate(connection, key);
      }
      this.active = { workspaceId, connection, key, paths };
      return this.setState({ workspaceId, status: "ready" });
    } catch (error) {
      try {
        connection?.close();
      } catch {
        /* Keep the original failure for recovery. */
      }
      this.protection.lock();
      if (createdNamespace && !existsSync(paths.database)) {
        // The key provider can fail after creating a fresh empty directory. Only
        // remove paths created by this attempt and only when no data file exists.
        try {
          if (
            readdirSync(paths.attachments).length === 0 &&
            readdirSync(paths.migration).length === 0
          ) {
            rmSync(paths.envelope, { force: true });
            rmdirSync(paths.attachments);
            rmdirSync(paths.migration);
            rmdirSync(paths.directory);
          }
        } catch {
          /* Preserve unexpected content for recovery. */
        }
      }
      const reason = classifyStorageError(error);
      const details =
        error && typeof error === "object"
          ? (error as Record<string, unknown>)
          : {};
      return this.setState(
        recoveryStatus(workspaceId, reason, {
          ...(typeof details.required === "number"
            ? { requiredFreeSpaceBytes: details.required }
            : {}),
          ...(typeof details.available === "number"
            ? { availableFreeSpaceBytes: details.available }
            : {}),
        }),
      );
    }
  }

  async closeWorkspaceStore(workspaceId: string): Promise<void> {
    if (!this.active || this.active.workspaceId !== workspaceId) return;
    const active = this.active;
    this.active = undefined;
    this.closing = true;
    if (this.busy) await this.idle;
    let failure: unknown;
    try {
      active.connection.checkpoint();
    } catch (error) {
      failure = error;
    }
    try {
      active.connection.close();
    } catch (error) {
      failure ??= error;
    }
    active.key.fill(0);
    this.protection.lock();
    this.setState(
      failure
        ? recoveryStatus(workspaceId, classifyStorageError(failure))
        : { workspaceId, status: "closed" },
    );
    this.closing = false;
    if (failure) throw failure;
  }

  async closeActiveStore(): Promise<void> {
    if (this.active) await this.closeWorkspaceStore(this.active.workspaceId);
  }

  async executeTransaction<T>(
    workspaceId: string,
    operation: (tx: TransactionScope) => Promise<T>,
  ): Promise<T> {
    const active = this.active;
    if (
      !active ||
      active.workspaceId !== workspaceId ||
      this.busy ||
      this.closing
    )
      throw new Error("vault_locked");
    this.busy = true;
    this.idle = new Promise((resolve) => {
      this.releaseIdle = resolve;
    });
    const db = active.connection.db;
    const mutations = new Map<string, number>();
    const enqueued = new Set<string>();
    let transactionStarted = false;
    let scopeActive = true;
    try {
      db.exec("BEGIN IMMEDIATE");
      transactionStarted = true;
      const tx: TransactionScope = {
        persistEntity: async (table, entity) => {
          if (!scopeActive) throw new Error("transaction_closed");
          if (
            table !== "_entity_example" ||
            entity.workspaceId !== workspaceId ||
            !isWorkspaceId(entity.id) ||
            !Number.isSafeInteger(entity.expectedRevision) ||
            entity.expectedRevision < 0 ||
            typeof entity.dataPayload !== "string" ||
            Buffer.byteLength(entity.dataPayload) > 1_000_000
          )
            throw new Error("invalid_entity");
          const now = new Date().toISOString();
          if (entity.parentId) {
            const parent = db
              .prepare("SELECT workspace_id FROM _entity_example WHERE id = ?")
              .get(entity.parentId) as { workspace_id: string } | undefined;
            if (!parent || parent.workspace_id !== workspaceId)
              throw new Error("invalid_parent");
          }
          if (entity.expectedRevision === 0) {
            db.prepare(
              "INSERT INTO _entity_example (id, workspace_id, parent_id, revision, sync_state, data_payload, created_at, updated_at, deleted_at) VALUES (?, ?, ?, 1, 'locally_created', ?, ?, ?, ?)",
            ).run(
              entity.id,
              workspaceId,
              entity.parentId ?? null,
              entity.dataPayload,
              now,
              now,
              entity.deletedAt ?? null,
            );
          } else
            active.connection.updateEntityRevision(
              workspaceId,
              entity.id,
              entity.expectedRevision,
              entity.dataPayload,
              now,
            );
          mutations.set(entity.id, entity.expectedRevision);
        },
        enqueueOutboxOperation: async (item) => {
          if (!scopeActive) throw new Error("transaction_closed");
          if (
            item.workspaceId !== workspaceId ||
            !mutations.has(item.aggregateId) ||
            item.expectedRevision !== mutations.get(item.aggregateId) ||
            !isWorkspaceId(item.operationId) ||
            !isWorkspaceId(item.aggregateType) ||
            !["create", "update", "delete", "execute"].includes(
              item.operationType,
            ) ||
            !Number.isSafeInteger(item.expectedRevision) ||
            item.expectedRevision < 0
          )
            throw new Error("invalid_outbox_operation");
          const payloadJson = JSON.stringify(item.payload);
          if (
            typeof payloadJson !== "string" ||
            Buffer.byteLength(payloadJson) > 1_000_000
          )
            throw new Error("invalid_outbox_operation");
          const now = new Date().toISOString();
          db.prepare(
            "INSERT INTO outbox_operations (operation_id, workspace_id, aggregate_type, aggregate_id, operation_type, payload_json, payload_hash, expected_revision, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)",
          ).run(
            item.operationId,
            workspaceId,
            item.aggregateType,
            item.aggregateId,
            item.operationType,
            payloadJson,
            payloadDigest(payloadJson),
            item.expectedRevision,
            now,
            now,
          );
          enqueued.add(item.aggregateId);
        },
        query: async <R>(query: TypedQuery<R>): Promise<R[]> => {
          if (!scopeActive) throw new Error("transaction_closed");
          if (!isWorkspaceId(query.id)) throw new Error("invalid_query");
          const statement =
            query.kind === "entityById"
              ? "SELECT * FROM _entity_example WHERE workspace_id = ? AND id = ?"
              : query.kind === "outboxById"
                ? "SELECT * FROM outbox_operations WHERE workspace_id = ? AND operation_id = ?"
                : null;
          if (!statement) throw new Error("invalid_query");
          return db.prepare(statement).all(workspaceId, query.id) as R[];
        },
      };
      const result = await operation(tx);
      scopeActive = false;
      if ([...mutations.keys()].some((id) => !enqueued.has(id)))
        throw new Error("missing_outbox_operation");
      db.exec("COMMIT");
      return result;
    } catch (error) {
      scopeActive = false;
      if (transactionStarted && db.inTransaction) {
        try { db.exec("ROLLBACK"); } catch { /* Native fault still forces store closure. */ }
      }
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (/^(SQLITE_(IOERR|CORRUPT|NOTADB|FULL)|EIO|ENOSPC)/.test(code)) {
        try { active.connection.close(); } catch { /* Fail closed even if native close fails. */ }
        active.key.fill(0);
        this.protection.lock();
        this.active = undefined;
        this.setState(recoveryStatus(workspaceId, classifyStorageError(error)));
      }
      throw error;
    } finally {
      this.busy = false;
      this.releaseIdle?.();
      this.releaseIdle = undefined;
      this.idle = null;
    }
  }

  /** Main-process test/qualification access; never exposed by the preload bridge. */
  inspectForVerification(
    workspaceId: string,
    query: "entities" | "outbox" | "foreign_keys",
  ): unknown[] {
    if (!this.active || this.active.workspaceId !== workspaceId)
      throw new Error("vault_locked");
    const db: NativeDatabase = this.active.connection.db;
    if (query === "foreign_keys")
      return db.pragma("foreign_key_check") as unknown[];
    return db
      .prepare(
        query === "entities"
          ? "SELECT * FROM _entity_example WHERE workspace_id = ?"
          : "SELECT * FROM outbox_operations WHERE workspace_id = ?",
      )
      .all(workspaceId);
  }
}
