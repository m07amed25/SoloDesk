import test from "node:test";
import assert from "node:assert/strict";
import { en } from "../../packages/localization/src/shell/en.ts";
import { ar } from "../../packages/localization/src/shell/ar.ts";

test("localization dictionaries have 100% key parity", () => {
  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();

  assert.deepEqual(
    enKeys,
    arKeys,
    "English and Arabic dictionaries must have identical keys",
  );
  assert.ok(enKeys.length > 25, "Dictionary must contain shell keys");
});

test("no empty strings in English or Arabic dictionaries", () => {
  for (const [key, value] of Object.entries(en)) {
    assert.ok(
      typeof value === "string" && value.trim().length > 0,
      `Key "${key}" in English dictionary must not be empty`,
    );
  }

  for (const [key, value] of Object.entries(ar)) {
    assert.ok(
      typeof value === "string" && value.trim().length > 0,
      `Key "${key}" in Arabic dictionary must not be empty`,
    );
  }
});

test("interpolation parameter tokens match between English and Arabic strings", () => {
  const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;

  for (const key of Object.keys(en) as Array<keyof typeof en>) {
    const enParams = Array.from(en[key].matchAll(paramRegex))
      .map((m) => m[1])
      .sort();
    const arParams = Array.from(ar[key].matchAll(paramRegex))
      .map((m) => m[1])
      .sort();

    assert.deepEqual(
      enParams,
      arParams,
      `Parameter tokens for key "${key}" must match between English and Arabic`,
    );
  }
});
