import test from "node:test";
import assert from "node:assert/strict";
import { isMatchingContextEnvelope } from "../../../app/shared/workspace-contracts.ts";

test("T050: isMatchingContextEnvelope requires exact match on all 4 envelope dimensions", () => {
  const current = {
    profileReference: "prof-1",
    profileGeneration: 1,
    workspaceId: "11111111-1111-4111-8111-111111111111",
    selectionGeneration: 2,
  };

  // Exact match
  assert.equal(isMatchingContextEnvelope({ ...current }, current), true);

  // Mismatched workspaceId
  assert.equal(
    isMatchingContextEnvelope(
      { ...current, workspaceId: "22222222-2222-4222-8222-222222222222" },
      current,
    ),
    false,
  );

  // Mismatched selectionGeneration (stale generation)
  assert.equal(
    isMatchingContextEnvelope(
      { ...current, selectionGeneration: 1 },
      current,
    ),
    false,
  );

  // Mismatched profileReference
  assert.equal(
    isMatchingContextEnvelope(
      { ...current, profileReference: "prof-other" },
      current,
    ),
    false,
  );

  // Mismatched profileGeneration
  assert.equal(
    isMatchingContextEnvelope(
      { ...current, profileGeneration: 2 },
      current,
    ),
    false,
  );

  // Null or undefined
  assert.equal(isMatchingContextEnvelope(null, current), false);
  assert.equal(isMatchingContextEnvelope(undefined, current), false);
  assert.equal(isMatchingContextEnvelope(current, null), false);
});

test("T050: Cross-workspace projections drop mismatches and never rewrite to current tenant", () => {
  const activeEnvelope = {
    profileReference: "prof-1",
    profileGeneration: 1,
    workspaceId: "11111111-1111-4111-8111-111111111111",
    selectionGeneration: 3,
  };

  const incomingSignals = [
    { id: "sig-1", envelope: { ...activeEnvelope }, payload: "Active item" },
    {
      id: "sig-2",
      envelope: {
        profileReference: "prof-1",
        profileGeneration: 1,
        workspaceId: "22222222-2222-4222-8222-222222222222", // Different workspace
        selectionGeneration: 3,
      },
      payload: "Foreign tenant item",
    },
    {
      id: "sig-3",
      envelope: {
        profileReference: "prof-1",
        profileGeneration: 1,
        workspaceId: "11111111-1111-4111-8111-111111111111",
        selectionGeneration: 2, // Stale generation
      },
      payload: "Stale generation item",
    },
  ];

  // Projection admission filter
  const admitted = incomingSignals.filter((signal) =>
    isMatchingContextEnvelope(signal.envelope, activeEnvelope),
  );

  assert.equal(admitted.length, 1);
  assert.equal(admitted[0].id, "sig-1");
  assert.equal(admitted[0].payload, "Active item");

  // Foreign items are completely excluded, never rewritten
  const foreignItem = incomingSignals.find((s) => s.id === "sig-2");
  assert.equal(foreignItem?.envelope.workspaceId, "22222222-2222-4222-8222-222222222222");
});
