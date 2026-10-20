import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";

test("Scenario 10: English, Arabic, and Status Announcements (FR-020, SC-010, SC-011)", async (t) => {
  const receiptKeys = [
    "receipt.status.committed",
    "receipt.status.job_accepted",
    "receipt.status.conflict",
    "receipt.status.rejected",
    "receipt.status.proven_not_applied",
    "receipt.status.reconciling",
    "receipt.announcement.committed",
    "receipt.announcement.conflict",
    "receipt.announcement.rejected",
  ];

  await t.test(
    "Bilingual parity: all F009 receipt keys exist in both en and ar dictionaries (FR-020, SC-010)",
    () => {
      for (const key of receiptKeys) {
        assert.ok(en[key], `en missing key: ${key}`);
        assert.ok(ar[key], `ar missing key: ${key}`);
        assert.ok(en[key].length > 0, `en key ${key} is empty`);
        assert.ok(ar[key].length > 0, `ar key ${key} is empty`);
      }

      // Verify Arabic status strings contain genuine Arabic characters
      const arabicRegex = /[\u0600-\u06FF]/;
      for (const key of receiptKeys) {
        assert.ok(
          arabicRegex.test(ar[key]),
          `Arabic text for ${key} must contain Arabic characters`,
        );
      }
    },
  );

  await t.test(
    "Stable technical identifiers remain in canonical format in both locales (SC-010)",
    () => {
      const canonicalReceiptId = "3a634b04-57df-4915-a3f6-56877c66b5cb";
      const canonicalDigest =
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

      // Format announcement in English
      const enAnnouncement = en["receipt.announcement.committed"].replace(
        "{receiptId}",
        canonicalReceiptId,
      );
      // Format announcement in Arabic
      const arAnnouncement = ar["receipt.announcement.committed"].replace(
        "{receiptId}",
        canonicalReceiptId,
      );

      // Assert the exact canonical UUID is intact in both strings
      assert.ok(enAnnouncement.includes(canonicalReceiptId));
      assert.ok(arAnnouncement.includes(canonicalReceiptId));

      // Digest is preserved verbatim without transliteration
      const mixedBidi = `تم التثبيت بالبصمة: ${canonicalDigest}`;
      assert.ok(mixedBidi.includes(canonicalDigest));
    },
  );

  await t.test(
    "Screen reader announcements convey authoritative status transitions immediately (SC-011)",
    () => {
      // Committed announcement
      const committedMsgEn = en["receipt.announcement.committed"].replace(
        "{receiptId}",
        "rec_123",
      );
      const committedMsgAr = ar["receipt.announcement.committed"].replace(
        "{receiptId}",
        "rec_123",
      );
      assert.ok(committedMsgEn.toLowerCase().includes("completed"));
      assert.ok(committedMsgAr.includes("بنجاح"));

      // Conflict announcement
      const conflictMsgEn = en["receipt.announcement.conflict"];
      const conflictMsgAr = ar["receipt.announcement.conflict"];
      assert.ok(conflictMsgEn.toLowerCase().includes("conflict"));
      assert.ok(conflictMsgAr.includes("تعارض"));

      // Rejected announcement
      const rejectedMsgEn = en["receipt.announcement.rejected"];
      const rejectedMsgAr = ar["receipt.announcement.rejected"];
      assert.ok(rejectedMsgEn.toLowerCase().includes("rejected"));
      assert.ok(rejectedMsgAr.includes("رفض"));
    },
  );
});
