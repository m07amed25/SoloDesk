import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ProtectionOwner } from "../../app/main/protection/owner.ts";
import { PersistenceService } from "../../app/main/persistence/persistence-service.ts";
import { workspacePaths } from "../../app/main/persistence/workspace-storage-paths.ts";

export function fixture(options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "f007-"));
  const profileId = options.profileId ?? "default";
  const key = options.key ? Buffer.from(options.key) : randomBytes(32);
  const issued = [];
  let blocked = false;
  const provider = {
    assertAvailable() { if (blocked) throw new Error("vault_locked"); },
    async create(file) {
      this.assertAvailable();
      writeFileSync(file, "synthetic test envelope", { flag: "wx", mode: 0o600 });
      const copy = Buffer.from(key);
      issued.push(copy);
      return { key: copy, binding: {} };
    },
    async open() {
      this.assertAvailable();
      const copy = Buffer.from(key);
      issued.push(copy);
      return { key: copy, binding: {} };
    },
  };
  const owner = new ProtectionOwner({ profileId, epoch: 1 }, () => true, provider);
  const service = new PersistenceService(root, profileId, owner, options.steps, options.availableSpaceOverride);
  return {
    root, key, owner, service, provider, issued,
    paths: (workspaceId = "ws-test-alpha") => workspacePaths(root, profileId, workspaceId),
    block: (value = true) => { blocked = value; },
    cleanup: () => { owner.lock(); rmSync(root, { recursive: true, force: true }); },
  };
}

export async function createRecord(service, workspaceId, id, text) {
  return service.executeTransaction(workspaceId, async (tx) => {
    await tx.persistEntity("_entity_example", { id, workspaceId, expectedRevision: 0, dataPayload: text });
    await tx.enqueueOutboxOperation({ operationId: `op-${id}`, workspaceId, aggregateType: "task", aggregateId: id, operationType: "create", payload: { text }, expectedRevision: 0 });
  });
}
