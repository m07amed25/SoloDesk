import test from "node:test";
import assert from "node:assert/strict";
import {
  PreferencesManager,
  DEFAULT_USER_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  type StorageAdapter,
} from "../../app/renderer/lib/preferences.ts";

function createMockStorage(
  initial: Record<string, string> = {},
): StorageAdapter & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

test("returns default preferences when storage is empty", () => {
  const mock = createMockStorage();
  const manager = new PreferencesManager(mock);
  const prefs = manager.load();
  assert.equal(prefs.schemaVersion, 1);
  assert.equal(prefs.locale, "en");
  assert.equal(prefs.theme, "system");
  assert.equal(prefs.sidebarCollapsed, false);
});

test("fails closed to defaults on corrupted JSON", () => {
  const mock = createMockStorage({ [PREFERENCES_STORAGE_KEY]: "invalid{json" });
  const manager = new PreferencesManager(mock);
  const prefs = manager.load();
  assert.deepEqual(prefs, DEFAULT_USER_PREFERENCES);
});

test("fails closed on schema version mismatch", () => {
  const mock = createMockStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({
      schemaVersion: 2,
      locale: "ar",
      theme: "dark",
      sidebarCollapsed: true,
      lastUpdated: "2026-10-18T00:00:00.000Z",
    }),
  });
  const manager = new PreferencesManager(mock);
  const prefs = manager.load();
  assert.deepEqual(prefs, DEFAULT_USER_PREFERENCES);
});

test("fails closed on invalid locale or theme values", () => {
  const mock = createMockStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({
      schemaVersion: 1,
      locale: "fr",
      theme: "neon",
      sidebarCollapsed: false,
    }),
  });
  const manager = new PreferencesManager(mock);
  const prefs = manager.load();
  assert.deepEqual(prefs, DEFAULT_USER_PREFERENCES);
});

test("loads and saves valid preferences", () => {
  const mock = createMockStorage();
  const manager = new PreferencesManager(mock);
  const saved = manager.save({
    locale: "ar",
    theme: "dark",
    sidebarCollapsed: true,
  });
  assert.equal(saved.locale, "ar");
  assert.equal(saved.theme, "dark");
  assert.equal(saved.sidebarCollapsed, true);

  const reloaded = manager.load();
  assert.equal(reloaded.locale, "ar");
  assert.equal(reloaded.theme, "dark");
  assert.equal(reloaded.sidebarCollapsed, true);
});
