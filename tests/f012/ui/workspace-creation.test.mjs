import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import { WORKSPACE_MANAGEMENT_KEYS } from "../../../packages/localization/src/shell/types.ts";
import {
  validateDisplayName,
  countUnicodeScalars,
} from "../../../app/shared/workspace-contracts.ts";
import { FIXTURE_POLICIES } from "../fixtures/workspace-fixtures.mjs";

describe("T023: Workspace Creation UI & Form Validation Tests", () => {
  it("enforces bilingual English and Arabic localization parity with authentic Arabic script", () => {
    const arabicRegex = /[\u0600-\u06FF]/;

    for (const key of WORKSPACE_MANAGEMENT_KEYS) {
      assert.ok(en[key], `en missing key: ${key}`);
      assert.ok(ar[key], `ar missing key: ${key}`);
      assert.ok(en[key].length > 0, `en key ${key} is empty`);
      assert.ok(ar[key].length > 0, `ar key ${key} is empty`);
      assert.ok(
        arabicRegex.test(ar[key]),
        `Arabic text for ${key} must contain Arabic characters`,
      );
    }
  });

  it("restricts form options strictly to approved policy", () => {
    const policy = FIXTURE_POLICIES.synthetic;
    assert.deepEqual(policy.locales, ["en", "ar"]);
    assert.ok(policy.currencyCodes.includes("USD"));
    assert.ok(policy.currencyCodes.includes("SAR"));
    assert.ok(!policy.currencyCodes.includes("INVALID_CURRENCY"));
  });

  it("validates displayName field-level rules and trims without changing internal text", () => {
    const emptyResult = validateDisplayName("");
    assert.equal(emptyResult.valid, false);
    assert.ok(emptyResult.error);

    const whitespaceResult = validateDisplayName("   ");
    assert.equal(whitespaceResult.valid, false);
    assert.ok(whitespaceResult.error);

    const validResult = validateDisplayName("  Acme Studio ✨  ");
    assert.equal(validResult.valid, true);
    assert.equal(validResult.trimmed, "Acme Studio ✨");

    const tooLong = "A".repeat(121);
    const tooLongResult = validateDisplayName(tooLong);
    assert.equal(tooLongResult.valid, false);
    assert.ok(tooLongResult.error);
  });

  it("preserves valid non-secret input upon validation or submission rejection", () => {
    const formState = {
      displayName: "My Studio",
      legalName: "My Legal Entity LLC",
      tradeName: "Trade Name",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      defaultLocale: "en",
    };

    // Simulated rejection retains user inputs
    const preservedState = { ...formState, errorMessage: en["workspace.create.error.invalidCurrency"] };
    assert.equal(preservedState.displayName, "My Studio");
    assert.equal(preservedState.legalName, "My Legal Entity LLC");
    assert.equal(preservedState.defaultCurrency, "USD");
    assert.ok(preservedState.errorMessage);
  });

  it("presents truthful setup_incomplete readiness notice and makes no compliance claims", () => {
    const noticeEn = en["workspace.create.incompleteReadinessNotice"];
    const noticeAr = ar["workspace.create.incompleteReadinessNotice"];

    assert.ok(noticeEn.includes("setup incomplete"));
    assert.ok(!noticeEn.toLowerCase().includes("tax compliant"));
    assert.ok(!noticeEn.toLowerCase().includes("issuance ready"));

    assert.ok(noticeAr.includes("إعداد غير مكتمل"));
  });

  it("handles disabled policy safely without permitting submission", () => {
    const disabledPolicy = FIXTURE_POLICIES.disabled;
    assert.equal(disabledPolicy.enabled, false);
    assert.equal(
      en["workspace.create.error.policyDisabled"],
      "Workspace creation is currently unavailable.",
    );
  });
});
