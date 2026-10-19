import { ProtectionOwner } from "../../app/main/protection/owner.ts";
import { PersistenceService } from "../../app/main/persistence/persistence-service.ts";

const [root, workspaceId, mode] = process.argv.slice(2);
if (!root || !workspaceId || !["before", "after"].includes(mode) || !/^[0-9a-f]{64}$/.test(process.env.F007_SYNTHETIC_KEY ?? ""))
  throw new Error("invalid synthetic crash worker input");
const provider = {
  assertAvailable() {},
  async create() { throw new Error("key_missing"); },
  async open() { return { key: Buffer.from(process.env.F007_SYNTHETIC_KEY, "hex"), binding: {} }; },
};
const owner = new ProtectionOwner({ profileId: "default", epoch: 1 }, () => true, provider);
const service = new PersistenceService(root, "default", owner);
const opened = await service.openWorkspaceStore(workspaceId);
if (opened.status !== "ready") throw new Error(`open failed: ${opened.recoveryDetails?.reasonCode}`);
await service.executeTransaction(workspaceId, async (tx) => {
  await tx.persistEntity("_entity_example", { id: `crash-${mode}`, workspaceId, expectedRevision: 0, dataPayload: `value-${mode}` });
  await tx.enqueueOutboxOperation({ operationId: `op-crash-${mode}`, workspaceId, aggregateType: "task", aggregateId: `crash-${mode}`, operationType: "create", payload: { value: mode }, expectedRevision: 0 });
  if (mode === "before") process.kill(process.pid, "SIGKILL");
});
process.kill(process.pid, "SIGKILL");
