import { createHash } from "node:crypto";

export const referenceDataset = Object.freeze({
  companyAr: "شركة الأفق الرقمي للتطوير والحلول البرمجية ذ.م.م",
  taskAr: "إعداد وتجهيز البيئة السحابية وتكامل قواعد البيانات المشفرة",
  mixedBidi:
    "تحديث إعدادات API endpoint إلى https://api.solodesk.app/v1 وتأكيد الرموز.",
  usdMinorUnits: 1250050,
  kwdMinorUnits: 350750,
  seconds: Object.freeze([7200, 86399, 1]),
  emoji: "💼 ⏱️ 📊 🔒",
});

/** Deterministic, synthetic graph used to qualify each candidate migration. */
export function referenceRecords(workspaceId = "ws-test-alpha") {
  const rows = [];
  const add = (kind, count, make) => {
    for (let index = 0; index < count; index++) {
      rows.push({
        id: `${kind}-${index}`,
        workspaceId,
        parentId: kind === "task" && index > 0 ? `task-${index - 1}` : null,
        dataPayload: JSON.stringify({ kind, index, ...make(index) }),
      });
    }
  };
  add("settings", 1, () => ({ currencies: ["USD", "KWD", "JPY"], locale: "ar" }));
  add("profile", 2, (index) => ({ name: index === 0 ? "محمد أحمد" : "Sara Jones" }));
  add("client", 5, (index) => ({ name: index === 0 ? referenceDataset.companyAr : `Client ${index}` }));
  add("task", 25, (index) => ({ title: index === 0 ? referenceDataset.taskAr : `Task ${index}`, note: referenceDataset.mixedBidi }));
  add("time", 60, (index) => ({ seconds: index === 0 ? 7200 : index === 1 ? 86399 : index + 1 }));
  add("draft", workspaceId === "ws-test-alpha" ? 8 : 7, (index) => ({ minorUnits: index === 0 ? 1250050 : index === 1 ? 350750 : index * 100, currency: index === 1 ? "KWD" : "USD" }));
  add("attachment", workspaceId === "ws-test-alpha" ? 3 : 2, (index) => ({ mime: "application/octet-stream", bytes: index + 100, emoji: referenceDataset.emoji }));
  return rows;
}

export function seedReferenceDataset(db, workspaceId = "ws-test-alpha") {
  const rows = referenceRecords(workspaceId);
  db.transaction(() => {
    const insert = db.prepare("INSERT INTO _entity_example (id, workspace_id, parent_id, revision, sync_state, data_payload, created_at, updated_at) VALUES (?, ?, ?, 1, 'synced', ?, ?, ?)");
    const now = "2026-10-19T00:00:00.000Z";
    for (const row of rows) insert.run(row.id, workspaceId, row.parentId, row.dataPayload, now, now);
    const outbox = db.prepare("INSERT INTO outbox_operations (operation_id, workspace_id, aggregate_type, aggregate_id, operation_type, payload_json, payload_hash, expected_revision, status, created_at, updated_at) VALUES (?, ?, 'task', ?, 'update', ?, ?, 1, 'queued', ?, ?)");
    for (let index = 0; index < 15; index++) {
      const payload = JSON.stringify({ title: index === 0 ? referenceDataset.taskAr : `Queued ${index}` });
      const hash = hashPayload(payload);
      outbox.run(`operation-${index}`, workspaceId, `task-${index % 25}`, payload, hash, now, now);
    }
  })();
  return rows;
}

function hashPayload(value) {
  // SHA-256 is the same digest format used by the production outbox helper.
  return createHash("sha256").update(value, "utf8").digest("hex");
}
