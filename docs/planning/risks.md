# Risk and dependency register

Status: planning, 17 October 2026. Severity is proposed, not a quantitative forecast. A risk is closed only with evidence and a named owner.

| Risk | Impact | Prevention / detection | Gate / owner |
| --- | --- | --- | --- |
| Tenant/project scope leak | Confidential client/financial exposure | Current server authorization, RLS/constraints, denied read/search/count/export/file tests | P01; security |
| Offline revoked user | Stale access/unauthorized queued writes | Bounded lease, current replay checks, cache invalidation, explicit recovery | P01; product/security |
| Plaintext local fallback | Violates confirmed encryption | Encrypted adapter/key-store proof; fail closed; key-loss tests | P01; desktop/security |
| Custom sync conflict loss | Lost edits, stale resurrection | Outbox/cursors, causal revisions, retained candidates, tombstone window/resnapshot | P01; backend |
| Duplicate billing/settlement | Financial harm | Server transaction, operation receipts, unique source/provider IDs, property/retry tests | P05; finance/backend |
| Generic tax profile mistaken as compliance | Wrong legal document/totals | Country gates, approved fixtures/templates/retention and local reviewer | P05; product/finance |
| Backup includes DB but misses files/keys | Incomplete recovery | Manifest inventories, independent blob backups and restore drills | P01/P09; operations |
| Old restore replays money/jobs | Duplicate charge/send/number | Isolated recovery, current authority rejoin and external-event reconciliation | P05/P09; operations |
| Arabic/RTL PDF defect | Unreadable invoices and exclusion | Fluent review, shaping/embedded-font/multipage/keyboard fixtures | Every phase; UX/QA |
| Free-tier pause/quota/runtime limit | Online issuance/jobs unavailable | Honest pilot limits, quota alerts, short batches, paid/worker triggers | P01/P07/P09; operations |
| Public signup email restrictions | Users cannot enroll/invite | SMTP/provider setup and delivery tests before public release | P01/P09; operations |
| Unbounded advanced scope | Delayed/incoherent first release | Vertical core pilot, advanced slices, explicit dependencies and switches | P00; product |
| Provider callback/retry mismatch | Duplicate or unmatched financial effects | Verified callbacks, durable event inbox, unknown-outcome reconciliation | P07; integrations |
| Malicious imports/URLs/files | Code execution, SSRF, resource exhaustion | Inert staged imports, bounds, traversal/redirect validation, private files | P01/P07/P08; security |
| Account/device key loss | Unsynced work unrecoverable | Recovery keys/backup, clear limits, tested rotation/unlock | P01; security |
| Incompatible update/migration | Unusable cache or corrupt data | Expand/contract protocols, backups, staged release/forward repair | P09; release |
| Stale report/incorrect currency mix | Bad business decisions | Versioned definitions, grouped currencies, as-of/coverage and drill-down | P06; analytics |
| Dependency/native adapter licensing/security | Unsafe/unbuildable release | Pin/review licenses/CVEs, Electron ABI per OS, signed builds | P01/P09; engineering |

Open decision IDs and blockers are in [decisions](decisions.md). Each phase records relevant prerequisites; reducing cost does not close a security, financial or recovery risk by itself.
