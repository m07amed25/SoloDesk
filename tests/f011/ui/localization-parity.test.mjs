import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";

describe("T049: Typed Bilingual Localization Parity & Secret-Safe Wording", () => {
  const arabicRegex = /[\u0600-\u06FF]/;
  const rawProviderJargonRegex =
    /\b(supabase|gotrue|jwt|access_token|refresh_token|invalid_grant|401|429|500)\b/i;

  it("enforces exact 1-to-1 key parity between English and Arabic dictionaries for identity.security", () => {
    const enSecurityKeys = Object.keys(en).filter((k) =>
      k.startsWith("identity.security."),
    );
    const arSecurityKeys = Object.keys(ar).filter((k) =>
      k.startsWith("identity.security."),
    );

    assert.ok(
      enSecurityKeys.length >= 15,
      `Expected at least 15 identity.security keys, got ${enSecurityKeys.length}`,
    );
    assert.deepEqual(
      enSecurityKeys.sort(),
      arSecurityKeys.sort(),
      "EN and AR identity.security keys must match exactly",
    );

    for (const key of enSecurityKeys) {
      const enVal = en[key];
      const arVal = ar[key];

      assert.ok(
        enVal && enVal.trim().length > 0,
        `English string for ${key} must not be empty`,
      );
      assert.ok(
        arVal && arVal.trim().length > 0,
        `Arabic string for ${key} must not be empty`,
      );

      // Arabic text must contain genuine Arabic glyphs
      assert.ok(
        arabicRegex.test(arVal),
        `Arabic translation for ${key} must contain Arabic script, got: "${arVal}"`,
      );

      // Translations must never leak raw provider errors or technical jargon
      assert.equal(
        rawProviderJargonRegex.test(enVal),
        false,
        `English translation for ${key} leaked raw provider jargon: "${enVal}"`,
      );
      assert.equal(
        rawProviderJargonRegex.test(arVal),
        false,
        `Arabic translation for ${key} leaked raw provider jargon: "${arVal}"`,
      );
    }
  });

  it("provides honest, actionable guidance for failure and outcome-unknown states", () => {
    const failureKeys = [
      "identity.security.error.verification_failed",
      "identity.security.status.challenge_expired",
      "identity.security.status.rate_limited",
    ];

    for (const key of failureKeys) {
      assert.ok(en[key], `Missing English key ${key}`);
      assert.ok(ar[key], `Missing Arabic key ${key}`);
      // Must not make false claims or mention provider names
      assert.equal(en[key].includes("database"), false);
      assert.equal(ar[key].includes("قاعدة بيانات"), false);
    }
  });
});
