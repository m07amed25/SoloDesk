import test from "node:test";
import assert from "node:assert/strict";
import { PendingWorkRegistry } from "../../../app/renderer/contexts/pending-work-registry.ts";

const SOURCE_ENVELOPE_A = Object.freeze({
  profileReference: "prof_a",
  profileGeneration: 1,
  workspaceId: "11111111-1111-4111-8111-111111111111",
  selectionGeneration: 1,
});

const TARGET_ENVELOPE_B = Object.freeze({
  profileReference: "prof_a",
  profileGeneration: 1,
  workspaceId: "22222222-2222-4222-8222-222222222222",
  selectionGeneration: 2,
});

test("T030: Bounded editor registration captures source envelope", () => {
  const registry = new PendingWorkRegistry();
  let focused = false;

  const unregister = registry.register({
    editorKey: "doc-editor-1",
    envelope: SOURCE_ENVELOPE_A,
    canSave: true,
    onSave: async () => true,
    onDiscard: () => {},
    onFocus: () => {
      focused = true;
    },
  });

  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), true);
  assert.equal(registry.hasPendingWork(TARGET_ENVELOPE_B), false);

  registry.focusFirst(SOURCE_ENVELOPE_A);
  assert.equal(focused, true);

  unregister();
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), false);
});

test("T030: Registry enforces maximum bounded registrations", () => {
  const registry = new PendingWorkRegistry();

  for (let i = 0; i < 32; i++) {
    registry.register({
      editorKey: `editor-${i}`,
      envelope: SOURCE_ENVELOPE_A,
      canSave: true,
      onSave: async () => true,
      onDiscard: () => {},
    });
  }

  assert.throws(
    () => {
      registry.register({
        editorKey: "editor-overflow",
        envelope: SOURCE_ENVELOPE_A,
        canSave: true,
        onSave: async () => true,
        onDiscard: () => {},
      });
    },
    /pending_editors_exceeded/,
  );
});

test("T030: Discard action calls onDiscard and clears pending registrations", () => {
  const registry = new PendingWorkRegistry();
  let discarded = false;

  registry.register({
    editorKey: "editor-1",
    envelope: SOURCE_ENVELOPE_A,
    canSave: true,
    onSave: async () => true,
    onDiscard: () => {
      discarded = true;
    },
  });

  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), true);
  registry.discardAll(SOURCE_ENVELOPE_A);

  assert.equal(discarded, true);
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), false);
});

test("T030: Save action verifies durable completion and clears; failure preserves work", async () => {
  const registry = new PendingWorkRegistry();

  let saveCalled = false;
  let saveSuccess = false;

  registry.register({
    editorKey: "editor-saveable",
    envelope: SOURCE_ENVELOPE_A,
    canSave: true,
    onSave: async () => {
      saveCalled = true;
      return saveSuccess;
    },
    onDiscard: () => {},
  });

  // First attempt: save fails
  const attempt1 = await registry.saveAll(SOURCE_ENVELOPE_A);
  assert.equal(saveCalled, true);
  assert.equal(attempt1, false);
  // Editor registration must still be present
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), true);

  // Second attempt: save succeeds
  saveSuccess = true;
  const attempt2 = await registry.saveAll(SOURCE_ENVELOPE_A);
  assert.equal(attempt2, true);
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), false);
});

test("T030: Ineligible save refuses to save and keeps work in source context", async () => {
  const registry = new PendingWorkRegistry();

  registry.register({
    editorKey: "editor-ineligible",
    envelope: SOURCE_ENVELOPE_A,
    canSave: false, // E.g. invalid form or read-only failure
    onSave: async () => true,
    onDiscard: () => {},
  });

  const res = await registry.saveAll(SOURCE_ENVELOPE_A);
  assert.equal(res, false);
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), true);
});

test("T030: Registry cleanup on generation advance does not leak to target", () => {
  const registry = new PendingWorkRegistry();

  registry.register({
    editorKey: "editor-gen1",
    envelope: SOURCE_ENVELOPE_A,
    canSave: true,
    onSave: async () => true,
    onDiscard: () => {},
  });

  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), true);
  assert.equal(registry.hasPendingWork(TARGET_ENVELOPE_B), false);

  // Generation unmount cleanup
  registry.clearForGeneration(SOURCE_ENVELOPE_A.selectionGeneration);
  assert.equal(registry.hasPendingWork(SOURCE_ENVELOPE_A), false);
  assert.equal(registry.hasPendingWork(TARGET_ENVELOPE_B), false);
});
