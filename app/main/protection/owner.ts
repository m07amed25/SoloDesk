import type { KeyContext, KeyHandle } from "./key-provider.ts";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  openDatabase,
  type ProtectedDatabase,
} from "./database.ts";
import { sealStagedFile, openStagedFile } from "./files.ts";
import {
  isSupportedFormat,
  PROTECTION_FORMAT_VERSION,
  type ProtectedDataSet,
  type ProtectedStagedFile,
  type RecoveryState,
} from "./types.ts";
import { reconcileRotation } from "./rotation.ts";

export type EstablishedIdentity = Readonly<{
  profileId: string;
  epoch: number;
}>;
export type KeyBoundary = Readonly<{
  assertAvailable(): void;
  create(envelopePath: string, context: KeyContext): Promise<KeyHandle>;
  open(envelopePath: string, context: KeyContext): Promise<KeyHandle>;
}>;

/** F004 must establish the identity before constructing this owner. No renderer ID is accepted. */
export class ProtectionOwner {
  private active:
    | {
        key: Buffer;
        db?: ProtectedDatabase;
        dataSet?: ProtectedDataSet;
        root?: string;
        storage?: string;
      }
    | undefined;
  private readonly identity: EstablishedIdentity;
  private readonly knownProfile: (profileId: string, epoch: number) => boolean;
  private readonly keys: KeyBoundary;
  constructor(
    identity: EstablishedIdentity,
    knownProfile: (profileId: string, epoch: number) => boolean,
    keys: KeyBoundary,
  ) {
    this.identity = identity;
    this.knownProfile = knownProfile;
    this.keys = keys;
    if (!this.validIdentity()) throw new Error("protection_denied");
  }

  private validIdentity(): boolean {
    return (
      /^[a-z][a-z0-9-]{0,31}$/.test(this.identity.profileId) &&
      Number.isSafeInteger(this.identity.epoch) &&
      this.identity.epoch > 0 &&
      this.knownProfile(this.identity.profileId, this.identity.epoch)
    );
  }
  private requireIdentity(): void {
    if (!this.validIdentity()) {
      this.lock();
      throw new Error("protection_denied");
    }
  }
  async createKey(
    envelopePath: string,
    dataSetId: string,
    generation: string,
  ): Promise<KeyHandle> {
    this.requireIdentity();
    const handle = await this.keys.create(
      envelopePath,
      this.context(dataSetId, generation),
    );
    this.retain(handle.key);
    return handle;
  }
  async openKey(
    envelopePath: string,
    dataSet: ProtectedDataSet,
  ): Promise<KeyHandle> {
    this.requireIdentity();
    if (!isSupportedFormat(dataSet.formatVersion))
      throw new Error("unsupported_format");
    if (dataSet.identityBindingId !== this.identity.profileId)
      throw new Error("protection_denied");
    const handle = await this.keys.open(
      envelopePath,
      this.context(dataSet.dataSetId, dataSet.activeGeneration),
    );
    this.retain(handle.key);
    return handle;
  }
  lock(): void {
    this.active?.db?.close();
    this.active?.key.fill(0);
    this.active = undefined;
  }

  /** Whether a data set has been opened (or created) in this session. */
  hasActiveDataSet(): boolean {
    return this.active?.dataSet !== undefined;
  }

  /**
   * Build the structured RecoveryState for a given failure reason.
   * dataDisposition follows the data-model contract:
   * - intact_locked: encrypted bytes exist, key is temporarily unavailable
   * - unverified: bytes may or may not exist, state unknown after provider denial/format issue
   * Never creates an empty replacement or claims data is lost without evidence.
   */
  recoveryStateFor(
    reason: RecoveryState["reason"],
    hadPriorData: boolean,
  ): RecoveryState {
    const RECOVERY_MAP: Record<
      RecoveryState["reason"],
      {
        dispositionWithData: RecoveryState["dataDisposition"];
        dispositionWithout: RecoveryState["dataDisposition"];
        nextAction: RecoveryState["nextAction"];
      }
    > = {
      vault_locked: {
        dispositionWithData: "intact_locked",
        dispositionWithout: "unverified",
        nextAction: "retry_unlock",
      },
      key_missing: {
        dispositionWithData: "intact_locked",
        dispositionWithout: "unverified",
        nextAction: "restore_provider",
      },
      protection_denied: {
        dispositionWithData: "intact_locked",
        dispositionWithout: "unverified",
        nextAction: "contact_support",
      },
      unprotected_backend: {
        dispositionWithData: "intact_locked",
        dispositionWithout: "unverified",
        nextAction: "contact_support",
      },
      integrity_failed: {
        dispositionWithData: "unverified",
        dispositionWithout: "unverified",
        nextAction: "contact_support",
      },
      interrupted_rotation: {
        dispositionWithData: "prior_generation_available",
        dispositionWithout: "unverified",
        nextAction: "inspect_surviving_copy",
      },
      unsupported_format: {
        dispositionWithData: "unverified",
        dispositionWithout: "unverified",
        nextAction: "contact_support",
      },
    };
    const entry = RECOVERY_MAP[reason];
    return Object.freeze({
      reason,
      dataDisposition: hadPriorData
        ? entry.dispositionWithData
        : entry.dispositionWithout,
      nextAction: entry.nextAction,
      localeKey: `protection.${reason}`,
    });
  }
  private retain(key: Buffer): void {
    this.lock();
    this.active = { key };
  }
  private context(dataSetId: string, generation: string): KeyContext {
    return {
      identityBindingId: this.identity.profileId,
      dataSetId,
      generation,
    };
  }
  private generationDirectory(root: string, generation: string): string {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        generation,
      )
    )
      throw new Error("unsupported_format");
    return path.join(root, "generations", generation);
  }

  async createSyntheticDataSet(
    root: string,
    records: readonly string[],
  ): Promise<ProtectedDataSet> {
    this.requireIdentity();
    if (
      !Array.isArray(records) ||
      records.length > 100 ||
      records.some((r) => typeof r !== "string")
    )
      throw new Error("protection_denied");
    const dataSet: ProtectedDataSet = Object.freeze({
      dataSetId: randomUUID(),
      identityBindingId: this.identity.profileId,
      formatVersion: PROTECTION_FORMAT_VERSION,
      activeGeneration: randomUUID(),
      state: "sealed",
    });
    // The provider checks availability before creating its envelope. This directory
    // contains no protected content if the provider refuses the operation.
    this.keys.assertAvailable();
    await mkdir(root, { recursive: false, mode: 0o700 });
    const storage = this.generationDirectory(root, dataSet.activeGeneration);
    await mkdir(storage, { recursive: true, mode: 0o700 });
    let handle: KeyHandle;
    try {
      handle = await this.createKey(
        path.join(storage, "key.envelope"),
        dataSet.dataSetId,
        dataSet.activeGeneration,
      );
    } catch (error) {
      await rm(root, { recursive: true, force: true });
      throw error;
    }
    let db: ProtectedDatabase;
    try {
      db = createDatabase(
        path.join(storage, "data.db"),
        handle.key,
        this.context(dataSet.dataSetId, dataSet.activeGeneration),
      );
    } catch (error) {
      this.lock();
      throw error;
    }
    try {
      for (const record of records) db.writeRecord(record);
      await writeFile(
        path.join(root, "dataset.json"),
        JSON.stringify(dataSet),
        { flag: "wx", mode: 0o600 },
      );
      this.active = { key: handle.key, db, dataSet, root, storage };
      return dataSet;
    } catch (error) {
      db.close();
      this.lock();
      throw error;
    }
  }

  async openProtected(root: string): Promise<ProtectedDataSet> {
    this.requireIdentity();
    const reconciliation = await reconcileRotation(root, this.keys);
    if (reconciliation.status === "recovery_required") {
      throw new Error("interrupted_rotation");
    }
    let dataSet: ProtectedDataSet;
    try {
      dataSet = JSON.parse(
        await readFile(path.join(root, "dataset.json"), "utf8"),
      ) as ProtectedDataSet;
    } catch {
      throw new Error("integrity_failed");
    }
    if (!isSupportedFormat(dataSet.formatVersion))
      throw new Error("unsupported_format");
    if (
      dataSet.identityBindingId !== this.identity.profileId ||
      typeof dataSet.dataSetId !== "string" ||
      typeof dataSet.activeGeneration !== "string"
    )
      throw new Error("protection_denied");
    const storage = this.generationDirectory(root, dataSet.activeGeneration);
    const handle = await this.openKey(
      path.join(storage, "key.envelope"),
      dataSet,
    );
    try {
      const db = openDatabase(
        path.join(storage, "data.db"),
        handle.key,
        this.context(dataSet.dataSetId, dataSet.activeGeneration),
      );
      this.active = { key: handle.key, db, dataSet, root, storage };
      return dataSet;
    } catch (error) {
      this.lock();
      throw error;
    }
  }

  allRecords(): string[] {
    return this.requireActive().db.allRecords();
  }
  search(term: string): string[] {
    return this.requireActive().db.search(term);
  }
  writeSyntheticRecord(body: string): void {
    this.requireActive().db.writeRecord(body);
  }
  async stageSyntheticFile(bytes: Buffer): Promise<ProtectedStagedFile> {
    const active = this.requireActive();
    return sealStagedFile(
      active.storage,
      active.key,
      this.context(active.dataSet.dataSetId, active.dataSet.activeGeneration),
      bytes,
    );
  }
  async readSyntheticFile(file: ProtectedStagedFile): Promise<Buffer> {
    const active = this.requireActive();
    return openStagedFile(
      active.storage,
      active.key,
      this.context(active.dataSet.dataSetId, active.dataSet.activeGeneration),
      file,
    );
  }
  private requireActive(): {
    key: Buffer;
    db: ProtectedDatabase;
    dataSet: ProtectedDataSet;
    root: string;
    storage: string;
  } {
    this.requireIdentity();
    if (
      !this.active?.db ||
      !this.active.dataSet ||
      !this.active.root ||
      !this.active.storage
    )
      throw new Error("vault_locked");
    return this.active as {
      key: Buffer;
      db: ProtectedDatabase;
      dataSet: ProtectedDataSet;
      root: string;
      storage: string;
    };
  }
}
