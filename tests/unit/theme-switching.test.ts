import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme, getNextThemeMode } from "../../app/renderer/lib/theme.ts";

test("resolves theme based on user mode and OS system preference", () => {
  // Explicit light mode
  assert.equal(resolveTheme("light", false), "light");
  assert.equal(resolveTheme("light", true), "light");

  // Explicit dark mode
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("dark", true), "dark");

  // System mode
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
});

test("cycles theme modes in predictable sequence (system -> light -> dark -> system)", () => {
  assert.equal(getNextThemeMode("system"), "light");
  assert.equal(getNextThemeMode("light"), "dark");
  assert.equal(getNextThemeMode("dark"), "system");
});
