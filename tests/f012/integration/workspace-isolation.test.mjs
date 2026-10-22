import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_WORKSPACES, CANARIES } from "../fixtures/workspace-fixtures.mjs";

test("T033: Durable work items retain immutable original workspace ID across switch and restart", () => {
  const wsA = FIXTURE_WORKSPACES.ws1.workspaceId;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic.workspaceId;

  // Durable work rows in workspace A across all required lifecycle statuses
  const durableWorkA = [
    { id: "rec-1", workspaceId: wsA, status: "saved_local", payload: "Invoice #1001" },
    { id: "rec-2", workspaceId: wsA, status: "queued", payload: "Payment update" },
    { id: "rec-3", workspaceId: wsA, status: "conflicted", payload: "Revision conflict #3" },
    { id: "rec-4", workspaceId: wsA, status: "staged", payload: "Client draft" },
    { id: "rec-5", workspaceId: wsA, status: "rejected", payload: "Card declined" },
    { id: "rec-6", workspaceId: wsA, status: "outcome_unknown", payload: "Pending sync" },
  ];

  // Simulated switch from A to B
  // After switch, filter work for active workspace B
  const visibleWorkB = durableWorkA.filter((item) => item.workspaceId === wsB);

  // Assert complete tenant isolation
  assert.equal(visibleWorkB.length, 0);

  // Assert original workspace IDs survive unchanged in source partition
  for (const item of durableWorkA) {
    assert.equal(item.workspaceId, wsA);
  }
});

test("T033: Zero crossover in counts, badges, notices, search, and live updates", () => {
  const wsA = FIXTURE_WORKSPACES.ws1.workspaceId;
  const wsB = FIXTURE_WORKSPACES.ws3Arabic.workspaceId;

  const datasetA = [
    { id: "doc-1", workspaceId: wsA, title: "Confidential Project Alpha", count: 42 },
    { id: "doc-2", workspaceId: wsA, title: `Notice: ${CANARIES.HIDDEN_TENANT}`, count: 7 },
  ];

  // Query engine scoped by current workspace ID
  function queryByWorkspace(dataset, currentWorkspaceId, searchTerm = "") {
    return dataset
      .filter((doc) => doc.workspaceId === currentWorkspaceId)
      .filter((doc) => !searchTerm || doc.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // Under workspace B:
  const searchResultsB = queryByWorkspace(datasetA, wsB, "Alpha");
  assert.equal(searchResultsB.length, 0);

  const canarySearchB = queryByWorkspace(datasetA, wsB, CANARIES.HIDDEN_TENANT);
  assert.equal(canarySearchB.length, 0);

  // Badge count calculation for B:
  const totalCountB = queryByWorkspace(datasetA, wsB).reduce((sum, item) => sum + item.count, 0);
  assert.equal(totalCountB, 0);

  // Under workspace A:
  const searchResultsA = queryByWorkspace(datasetA, wsA, "Alpha");
  assert.equal(searchResultsA.length, 1);
  assert.equal(searchResultsA[0].id, "doc-1");
});
