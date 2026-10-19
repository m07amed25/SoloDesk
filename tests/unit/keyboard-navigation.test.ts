import test from "node:test";
import assert from "node:assert/strict";
import {
  isOsReservedShortcut,
  isCommandPaletteShortcut,
} from "../../app/renderer/lib/shortcuts.ts";

function createKeyEvent(init: {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}): KeyboardEvent {
  return init as unknown as KeyboardEvent;
}

test("detects OS reserved shortcuts across platforms", () => {
  // Alt+F4
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "F4", altKey: true })),
    true,
  );
  // Cmd+Q
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "q", metaKey: true })),
    true,
  );
  // Cmd+H
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "h", metaKey: true })),
    true,
  );
  // Alt+Tab
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "Tab", altKey: true })),
    true,
  );
  // Cmd+Tab
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "Tab", metaKey: true })),
    true,
  );
  // Ctrl+Alt+Delete
  assert.equal(
    isOsReservedShortcut(
      createKeyEvent({ key: "Delete", ctrlKey: true, altKey: true }),
    ),
    true,
  );
  // Windows key
  assert.equal(isOsReservedShortcut(createKeyEvent({ key: "Meta" })), true);
});

test("does not flag ordinary application keys as OS reserved", () => {
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "k", metaKey: true })),
    false,
  );
  assert.equal(
    isOsReservedShortcut(createKeyEvent({ key: "k", ctrlKey: true })),
    false,
  );
  assert.equal(isOsReservedShortcut(createKeyEvent({ key: "Tab" })), false);
  assert.equal(isOsReservedShortcut(createKeyEvent({ key: "Escape" })), false);
  assert.equal(isOsReservedShortcut(createKeyEvent({ key: "Enter" })), false);
});

test("detects Command Palette Mod+K invocation", () => {
  // macOS Cmd+K
  assert.equal(
    isCommandPaletteShortcut(createKeyEvent({ key: "k", metaKey: true })),
    true,
  );
  // Windows/Linux Ctrl+K
  assert.equal(
    isCommandPaletteShortcut(createKeyEvent({ key: "k", ctrlKey: true })),
    true,
  );
  // With Shift or Alt should not trigger simple Mod+K
  assert.equal(
    isCommandPaletteShortcut(
      createKeyEvent({ key: "k", ctrlKey: true, altKey: true }),
    ),
    false,
  );
  // Plain 'k' should not trigger
  assert.equal(isCommandPaletteShortcut(createKeyEvent({ key: "k" })), false);
});
