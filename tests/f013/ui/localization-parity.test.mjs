import test from "node:test";
import assert from "node:assert/strict";
import { INVITATION_KEYS } from "../../../packages/localization/src/shell/types.ts";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";

test("F013 T061: Localization keys completeness and exact parity between en and ar", () => {
  assert.ok(INVITATION_KEYS.length > 0, "INVITATION_KEYS must not be empty");

  const missingEn = [];
  const missingAr = [];
  const arabicCharRegex = /[\u0600-\u06FF]/;
  const untranslatedKeys = [];

  for (const key of INVITATION_KEYS) {
    if (!Object.hasOwn(en, key) || typeof en[key] !== "string" || en[key].trim().length === 0) {
      missingEn.push(key);
    }
    if (!Object.hasOwn(ar, key) || typeof ar[key] !== "string" || ar[key].trim().length === 0) {
      missingAr.push(key);
    } else {
      // Must contain authentic Arabic characters
      if (!arabicCharRegex.test(ar[key])) {
        untranslatedKeys.push(key);
      }
    }
  }

  assert.deepEqual(missingEn, [], `English translation missing keys: ${missingEn.join(", ")}`);
  assert.deepEqual(missingAr, [], `Arabic translation missing keys: ${missingAr.join(", ")}`);
  assert.deepEqual(
    untranslatedKeys,
    [],
    `Arabic translation contains untranslated text for: ${untranslatedKeys.join(", ")}`
  );
});

test("F013 T061: No raw database, Auth, provider, or technical error text in user-facing strings", () => {
  const prohibitedPatterns = [
    /postgres/i,
    /pg_/i,
    /sql/i,
    /supabase/i,
    /resend\.com/i,
    /sendgrid/i,
    /mailgun/i,
    /500 internal/i,
    /fatal error/i,
    /stack trace/i,
    /auth\.uid/i,
    /recipient_binding_key/i,
  ];

  for (const key of INVITATION_KEYS) {
    const enVal = en[key];
    const arVal = ar[key];

    for (const pattern of prohibitedPatterns) {
      assert.ok(
        !pattern.test(enVal),
        `Prohibited pattern ${pattern} detected in en[${key}]: ${enVal}`
      );
      assert.ok(
        !pattern.test(arVal),
        `Prohibited pattern ${pattern} detected in ar[${key}]: ${arVal}`
      );
    }
  }
});

test("F013 T061: Interpolation variables are safe and consistent between en and ar", () => {
  const interpolationRegex = /\{([a-zA-Z0-9_]+)\}/g;

  for (const key of INVITATION_KEYS) {
    const enVal = en[key];
    const arVal = ar[key];

    const enVars = [...enVal.matchAll(interpolationRegex)].map((m) => m[1]).sort();
    const arVars = [...arVal.matchAll(interpolationRegex)].map((m) => m[1]).sort();

    assert.deepEqual(
      enVars,
      arVars,
      `Interpolation parameter mismatch for key ${key}: en has [${enVars}], ar has [${arVars}]`
    );
  }
});
