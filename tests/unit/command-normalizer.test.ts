import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSearchQuery,
  matchesQuery,
} from "../../app/renderer/lib/command-registry.ts";

test("strips Arabic diacritics (Harakat / Tashkeel)", () => {
  // مَشْرُوع -> مشروع
  const withTashkeel = "\u0645\u064E\u0634\u0652\u0631\u064F\u0648\u0639";
  const normalized = normalizeSearchQuery(withTashkeel);
  assert.equal(normalized, "مشروع");
});

test("normalizes Alef variants to bare Alef", () => {
  // آ (Alef Madda), أ (Alef Hamza Above), إ (Alef Hamza Below), ٱ (Alef Wasla)
  assert.equal(normalizeSearchQuery("إعدادات"), "اعدادات");
  assert.equal(normalizeSearchQuery("أعمالي"), "اعمالي");
  assert.equal(normalizeSearchQuery("آلية"), "اليه");
});

test("normalizes Ta Marbuta to Ha", () => {
  // نظرة عامة -> نظره عامه
  assert.equal(normalizeSearchQuery("نظرة عامة"), "نظره عامه");
});

test("normalizes Latin search queries", () => {
  assert.equal(normalizeSearchQuery("  InVoice-2026 "), "invoice-2026");
});

test("matchesQuery matches normalized Arabic and English queries", () => {
  assert.equal(matchesQuery("مشاريع", "مشروع"), false);
  assert.equal(matchesQuery("إعدادات", "اعداد"), true);
  assert.equal(matchesQuery("نظرة عامة", "نظره"), true);
  assert.equal(matchesQuery("Projects", "proj"), true);
  assert.equal(matchesQuery("Overview", "VIEW"), true);
});
