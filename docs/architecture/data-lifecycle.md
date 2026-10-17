# Persistence, import/export, backups and recovery

Status: proposed P01/P05/P09 design. Required encryption and cloud authority are confirmed. This is not implemented backup functionality.

## Persistence and migration

Persist eligible local changes and outbox atomically. Server accepts domain mutation, audit, receipt and change cursor atomically. Enforce foreign keys, revision and uniqueness constraints; read failure never creates an empty replacement database. Maintain separate versioned local/cloud migrations and protocol compatibility. Migration flow: check space/keys/version → verified backup → lock writers → migrate/reconcile counts/invariants → mark ready → resume. Failure retains old data or enters explicit recovery; rollback is used only if schema/data compatibility is proved, otherwise forward repair.

## Backup classes and contents

| Backup | Scope / owner | Restore authority |
| --- | --- | --- |
| Device recovery | Encrypted permitted cache + unsynced capture, local files, manifest; user/device | Isolated recovery profile, never overwrite tenant |
| Workspace export | Authorized complete logical records/snapshots/files with manifest and policy versions | Reviewed import/fork/rejoin, no credential resurrection |
| Cloud recovery | Server DB, private object bytes, required key/config metadata and job receipts | Operator incident procedure with consistency validation |

Every archive has format/schema/app version, workspace scope, as-of/cursor, record/blob counts, checksums, encryption metadata, policy versions and excluded data. No access/refresh/provider/signing secrets. Encryption uses a reviewed authenticated format and user-managed recovery option. DB backup alone is insufficient for object files. Cloud sync alone is insufficient for historical recovery.

Schedule/retention depend on operational budget; proposed daily independent backup and monthly restore drill are targets requiring Q-16. Free-tier lack of automatic backups must be addressed by explicit encrypted exports, secure off-platform storage and restore evidence before real financial reliance. A failed backup raises a visible operator alert; “export file created” is not proof it can restore.

## Restore state machine

Selected → Decrypted → Manifest checked → Staged → Integrity validated → Previewed → Recovery opened → Optional reviewed rejoin. Reject bad checksum/password/version/size, path traversal/symlinks, unexpected executable data and broken references before touching active data. Show record counts, timestamp, missing blobs, compatibility and financial conflicts. Do not delete the current profile before verification and a safety export.

Old backups cannot know later-issued invoices or changed grants. Restore receives a new device/session identity, does not replay old commands, and cannot decrement cloud sequence. Rejoin compares current authority and submits explicitly reviewed eligible changes. Historical finance imports become non-issuing evidence or validated opening balances with source IDs; never generate a fresh collectible duplicate. Revoked membership/session remains revoked. Service-wide recovery additionally reconciles provider callbacks/payments/jobs that occurred after the DB restore point.

## Import pipeline

Supported initial portable formats: UTF-8 CSV for clients/tasks/time/expenses, documented JSON logical export and archive manifests/files. Provider-specific imports need a mapping spec. Pipeline: upload/open inert file → detect encoding/delimiter/locale → map fields/units/timezone/currency → preview rows/errors/duplicates → authorize → commit in batches with stable batch/row IDs → summary/reconciliation.

Preserve original source/file hash/external ID. Exact reimport is idempotent; changed matching rows require explicit update/skip/new decisions. Duplicate names are suggestions, not merge authority. Invalid rows are excluded with downloadable redacted errors; partial acceptance is explicit. If parent rows fail, dependent rows cannot silently attach elsewhere. Batch rollback is allowed only before later dependencies/financial postings; otherwise use an audited compensating import.

Financial imports require country/profile/currency/series review, unique historic document identities and opening balances; totals/references must reconcile. Import does not send invoices, charge clients, create timer activity or claim legal acceptance. Spreadsheet text is not executable. Row/column/blob/archive limits are configurable and validated before memory exhaustion. Arabic names/digits and mixed-locale numeric ambiguity need preview, not guessed conversion.

## Export and portability

Export formats: scoped CSV, exact logical JSON/archive, and human-readable PDF documents/reports. Include stable IDs, references, exact amounts/currency, dates/timezone, source policy/version and as-of; explain omitted fields and cache incompleteness. Exporting sensitive private fields requires explicit permission and preview. Disable spreadsheet formula execution in output text without modifying source data. Files use safe names and explicit overwrite choice.

Portable exports preserve issued snapshots, receipts, linked credits/refunds, source allocations, attachments and audit provenance. Schema docs/migration path make vendor exit possible. Product-plan cancellation must retain a defined read/export grace path; exact duration is Q-12/Q-13. Users can export own permitted unsynced work subject to the approved revocation policy, not bypass server financial history.

## Deletion and acceptance

Archive hides from active workflows while preserving references. Soft deletion creates tombstones; purge waits for retention/legal hold and supported device-cursor windows. Large file garbage collection uses committed references plus backup retention, not filenames. Old clients past the window resnapshot before writing.

Required scenarios: encrypted round trip with files; wrong key/corrupt archive; full disk/interrupted restore; unsupported migration; old snapshot after new invoices; revoked user recovery; missing receipt file; repeated import with changed row; non-Latin CSV; cloud DB restore with later provider payments. Validate integrity, balances, numbering and duplicate prevention, and record actual RPO/RTO from drills.
