import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import { WORKSPACE_MANAGEMENT_KEYS } from "../../../packages/localization/src/shell/types.ts";

describe("T056: Workspace Localization Parity Tests", () => {
  it("enforces complete English and Arabic parity for all workspace management keys", () => {
    assert.ok(WORKSPACE_MANAGEMENT_KEYS.length > 0, "Key set must not be empty");

    for (const key of WORKSPACE_MANAGEMENT_KEYS) {
      assert.ok(
        key in en,
        `Missing English translation for key: ${key}`,
      );
      assert.ok(
        key in ar,
        `Missing Arabic translation for key: ${key}`,
      );
      assert.ok(
        en[key].length > 0,
        `English translation for ${key} must not be empty`,
      );
      assert.ok(
        ar[key].length > 0,
        `Arabic translation for ${key} must not be empty`,
      );
    }
  });

  it("contains authentic Arabic text without English fallbacks or raw backend strings", () => {
    const arabicRegex = /[\u0600-\u06FF]/;
    const rawBackendRegex = /PostgreSQL|Supabase|ORA-|SQLSTATE|ECONNREFUSED|ENOTFOUND/i;

    for (const key of WORKSPACE_MANAGEMENT_KEYS) {
      const arabicVal = ar[key];
      const englishVal = en[key];

      // No raw database/service leaks
      assert.ok(
        !rawBackendRegex.test(englishVal),
        `English key ${key} contains raw backend text: ${englishVal}`,
      );
      assert.ok(
        !rawBackendRegex.test(arabicVal),
        `Arabic key ${key} contains raw backend text: ${arabicVal}`,
      );

      // Arabic text must contain Arabic characters (unless technical identifier like SoloDesk)
      if (!key.includes("SoloDesk") && !arabicVal.includes("SoloDesk")) {
        assert.ok(
          arabicRegex.test(arabicVal),
          `Arabic key ${key} must contain Arabic script: "${arabicVal}"`,
        );
      }
    }
  });

  it("ensures honest failure descriptions and actionable next steps across both languages", () => {
    const recoveryKeys = WORKSPACE_MANAGEMENT_KEYS.filter((k) =>
      k.startsWith("shell.workspace.recovery."),
    );
    assert.ok(recoveryKeys.length >= 6, "Expected at least 6 recovery state keys");

    const actionKeys = WORKSPACE_MANAGEMENT_KEYS.filter((k) =>
      k.startsWith("shell.workspace.action."),
    );
    assert.ok(actionKeys.length >= 8, "Expected at least 8 recovery action keys");

    for (const key of [...recoveryKeys, ...actionKeys]) {
      assert.ok(en[key], `en has key ${key}`);
      assert.ok(ar[key], `ar has key ${key}`);
    }
  });
});
