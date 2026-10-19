import test from "node:test";
import assert from "node:assert/strict";
import { isolateBidi, isLtrToken } from "../../app/renderer/lib/bidi.ts";

test("identifies LTR tokens correctly", () => {
  assert.equal(isLtrToken("INV-2026-001"), true);
  assert.equal(isLtrToken("user@example.com"), true);
  assert.equal(isLtrToken("https://solodesk.app"), true);
  assert.equal(isLtrToken("USD 1,250.00"), true);
  assert.equal(isLtrToken("مرحبا بالعالم"), false);
});

test("isolateBidi wraps text with Unicode LTR marks", () => {
  const input = "INV-2026-001";
  const isolated = isolateBidi(input);
  assert.equal(isolated.startsWith("\u200E"), true, "Should start with LRM");
  assert.equal(isolated.endsWith("\u200E"), true, "Should end with LRM");
  assert.equal(isolated, `\u200E${input}\u200E`);
});

test("isolateBidi preserves original string content unaltered", () => {
  const email = "finance@company.com";
  const isolated = isolateBidi(email);
  // Unwrapping LRM marks yields the exact original string
  const unwrapped = isolated.replace(/\u200E/g, "");
  assert.equal(unwrapped, email);
});
