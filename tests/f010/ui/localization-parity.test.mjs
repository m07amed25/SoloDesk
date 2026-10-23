import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";

describe("T054: English/Arabic Localization Parity for F010", () => {
  it("enforces exact 1:1 key parity between en and ar dictionaries", () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();

    const missingInAr = enKeys.filter((k) => !(k in ar));
    const extraInAr = arKeys.filter((k) => !(k in en));

    assert.deepEqual(
      missingInAr,
      [],
      `Keys present in en but missing in ar: ${missingInAr.join(", ")}`,
    );
    assert.deepEqual(
      extraInAr,
      [],
      `Keys present in ar but missing in en: ${extraInAr.join(", ")}`,
    );
    assert.equal(enKeys.length, arKeys.length);
  });

  it("ensures all F010 auth, identity, profile and device keys exist in both locales with non-empty text", () => {
    const requiredKeys = [
      "auth.title",
      "auth.description",
      "auth.menuDescription",
      "auth.google",
      "auth.signIn",
      "auth.signUp",
      "auth.account",
      "auth.profile",
      "auth.signOut",
      "auth.signingOut",
      "auth.notSignedIn",
      "auth.signedInAs",
      "auth.deviceEnrolled",
      "auth.deviceNotEnrolled",
      "auth.protectionReady",
      "auth.protectionBlocked",
      "auth.sessionActive",
      "auth.manageAccount",
      "auth.enrollDevicePrompt",
      "auth.enrollment.title",
      "auth.enrollment.description",
      "auth.enrollment.deviceLabel",
      "auth.enrollment.confirm",
      "shell.identity.accountMismatch",
      "shell.identity.action.chooseIsolatedProfile",
      "settings.account.title",
      "settings.account.description",
      "settings.account.profileName",
      "settings.account.identifier",
      "settings.account.device",
      "settings.account.protection",
      "settings.account.status",
    ];

    for (const key of requiredKeys) {
      assert.ok(key in en, `Key ${key} missing in en`);
      assert.ok(key in ar, `Key ${key} missing in ar`);
      assert.ok(
        typeof en[key] === "string" && en[key].trim().length > 0,
        `en[${key}] is empty`,
      );
      assert.ok(
        typeof ar[key] === "string" && ar[key].trim().length > 0,
        `ar[${key}] is empty`,
      );
    }
  });

  it("ensures parameter placeholders match between English and Arabic", () => {
    const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;

    for (const [key, enText] of Object.entries(en)) {
      const enParams = [...enText.matchAll(paramRegex)].map((m) => m[1]).sort();
      const arText = ar[key];
      const arParams = [...arText.matchAll(paramRegex)].map((m) => m[1]).sort();

      assert.deepEqual(
        enParams,
        arParams,
        `Parameter mismatch for key "${key}": en has ${enParams.join(", ")}, ar has ${arParams.join(", ")}`,
      );
    }
  });

  it("prohibits raw token or secret leaks in user-facing localization strings", () => {
    const prohibitedWords = ["servicerole", "service_role", "bearer ", "raw_secret"];
    for (const [key, text] of Object.entries(en)) {
      const lower = text.toLowerCase();
      for (const word of prohibitedWords) {
        assert.ok(
          !lower.includes(word),
          `en string for ${key} contains prohibited word "${word}"`,
        );
      }
    }
    for (const [key, text] of Object.entries(ar)) {
      const lower = text.toLowerCase();
      for (const word of prohibitedWords) {
        assert.ok(
          !lower.includes(word),
          `ar string for ${key} contains prohibited word "${word}"`,
        );
      }
    }
  });
});
