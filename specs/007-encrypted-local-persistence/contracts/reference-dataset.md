# Contract: Reference Dataset & Invariant Reconciliation

**Feature**: F007 Encrypted Local Persistence and Migrations
**Scope**: Standardized Baseline Dataset, Multilingual Integrity Fixtures, and Post-Migration Reconciliation Rules

---

## 1. Purpose of the Reference Dataset

In accordance with the F007 card requirements:

> _"Entry decisions/limits: Approve local migration recovery and reference dataset."_

The **Reference Dataset** serves as a permanent, standardized baseline for testing persistence, encoding integrity, query efficiency, and schema migration correctness. Every candidate migration script MUST be applied against this dataset and prove 100% invariant reconciliation before approval.

---

## 2. Dataset Entity Composition

The reference dataset populates a comprehensive, realistic multi-entity graph:

| Aggregate / Entity     | Record Count  | Key Invariants Tested                                                                      |
| :--------------------- | :------------ | :----------------------------------------------------------------------------------------- |
| **Workspace Settings** | 2 workspaces  | Currency precision (USD 2-dec, KWD 3-dec, JPY 0-dec), tax profiles, Arabic default locale. |
| **User Profiles**      | 4 profiles    | Bilingual full names, RTL layout preferences, role templates.                              |
| **Clients & Contacts** | 10 clients    | Arabic company names, localized addresses, mixed phone formatting.                         |
| **Projects & Tasks**   | 50 tasks      | Hierarchy (parent-child), foreign key integrity, task status enum constraints.             |
| **Time Entries**       | 120 entries   | Exact integer source seconds (e.g. 1843s, not float minutes), ISO UTC instants.            |
| **Draft Invoices**     | 15 drafts     | Unissued drafts, exact minor-unit money integers, multi-line items.                        |
| **Outbox Operations**  | 30 operations | Serialized JSON payloads with Arabic Unicode, SHA-256 payload digests, revision numbers.   |
| **Staged Attachments** | 5 attachments | Authenticated `.stage` file metadata, byte sizes, MIME types, content hashes.              |

---

## 3. Stress & Character Invariant Fixtures

The reference dataset includes explicit edge-case values to verify that storage encoding and migrations do not truncate or corrupt data:

1. **Arabic and RTL Strings**:
   - Company: `شركة الأفق الرقمي للتطوير والحلول البرمجية ذ.م.م`
   - Task Title: `إعداد وتجهيز البيئة السحابية وتكامل قواعد البيانات المشفرة`
   - Description with mixed bidirectional text: `تحديث إعدادات API endpoint إلى https://api.solodesk.app/v1 وتأكيد الرموز.`
2. **Exact Numeric & Money Primitives**:
   - Currency Minor Units: `1250050` minor units ($12,500.50 USD), `350750` minor units (350.750 KWD).
   - Exact Integer Seconds: `7200` seconds (2 hours), `1` second, `86399` seconds.
3. **Special & Unicode Characters**:
   - Multi-byte emoji: 💼 ⏱️ 📊 🔒
   - Quotation marks, SQL escape characters, and newlines in text notes.

---

## 4. Invariant Reconciliation Assertions

Following any schema migration test, the verification engine runs automated invariant reconciliation:

```typescript
export interface InvariantReconciliationResult {
  totalEntitiesBefore: number;
  totalEntitiesAfter: number;
  mismatchedCounts: Array<{
    table: string;
    expected: number;
    actual: number;
  }>;
  brokenForeignKeys: Array<{
    table: string;
    column: string;
    missingParentId: string;
  }>;
  corruptedUnicodeFields: Array<{
    table: string;
    column: string;
    recordId: string;
    error: string;
  }>;
  arithmeticMismatches: Array<{
    table: string;
    column: string;
    recordId: string;
    expectedValue: number | string;
    actualValue: number | string;
  }>;
}
```

### Mandatory Pass Criteria:

1. `mismatchedCounts.length === 0`: Zero rows dropped or duplicated.
2. `brokenForeignKeys.length === 0`: Foreign key relations strictly preserved.
3. `corruptedUnicodeFields.length === 0`: Arabic and UTF-8 strings round-trip identically.
4. `arithmeticMismatches.length === 0`: Integer minor units and seconds values preserved without float coercion or precision truncation.
