import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "../fixtures.mjs";
import { DatabaseConnection } from "../../../app/main/persistence/database-connection.ts";
import { seedReferenceDataset, referenceDataset, referenceRecords } from "../../../tooling/f007/test-fixtures.mjs";
import { captureInvariants, reconcileInvariants, assertReconciled } from "../../../tooling/f007/invariant-checker.mjs";
import { steps } from "../migration-step.mjs";

test("two-workspace reference graph retains Arabic and exact integers through migration", async () => {
  const graph = ["ws-test-alpha", "ws-test-beta"].flatMap(referenceRecords);
  for (const [kind, count] of Object.entries({ settings: 2, profile: 4, client: 10, task: 50, time: 120, draft: 15, attachment: 5 }))
    assert.equal(graph.filter((row) => JSON.parse(row.dataPayload).kind === kind).length, count);
  const f = fixture({ steps });
  try {
    for (const workspaceId of ["ws-test-alpha", "ws-test-beta"]) {
      assert.equal((await f.service.openWorkspaceStore(workspaceId)).status, "ready");
      await f.service.closeWorkspaceStore(workspaceId);
      const beforeConnection = DatabaseConnection.open(f.paths(workspaceId).database, Buffer.from(f.key), true);
      seedReferenceDataset(beforeConnection.db, workspaceId);
      const before = captureInvariants(beforeConnection.db);
      beforeConnection.close();
      assert.equal((await f.service.openWorkspaceStore(workspaceId)).status, "ready");
      await f.service.closeWorkspaceStore(workspaceId);
      const afterConnection = DatabaseConnection.open(f.paths(workspaceId).database, Buffer.from(f.key), true);
      assertReconciled(reconcileInvariants(afterConnection.db, before));
      assert.equal(afterConnection.db.prepare("SELECT current_version FROM _schema_version").get().current_version, 2);
      assert.ok(before.entities.some((row) => row.data_payload.includes(referenceDataset.companyAr)));
      assert.ok(before.entities.some((row) => row.data_payload.includes(String(referenceDataset.usdMinorUnits))));
      afterConnection.close();
    }
  } finally { f.cleanup(); }
});
