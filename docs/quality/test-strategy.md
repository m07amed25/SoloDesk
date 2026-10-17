# Verification strategy and evidence gates

Status: future verification specification. Existing shell/launcher checks remain recorded separately in development/setup.md. No product feature, cloud, finance, Arabic, encryption, installer or service gate below has passed merely because it is documented.

## Test layers

| Layer | Target | Necessary failures/properties |
| --- | --- | --- |
| Pure domain/property | Money, seconds, allocation intervals, state machines, dates, tax/discount/credit math | Conservation, exact bounds, nonoverlap, reversal identity, locale independence, invalid transition rejection |
| Storage integration | Local encryption/outbox, server transactions/constraints, migrations, files | Kill at commit boundaries; disk full/key failure; unique/cross-tenant constraints; no partial finance effect |
| API/IPC/auth | Schema bounds, sender/session/role scopes, receipts/cursors | Forged actor/tenant, stale role, changed payload with same key, unauthorized search/export/download |
| Sync/model | Two+ devices, accepted event logs and conflict candidates | Duplication/reorder/loss/partition/clock skew/tombstones/old-client/resnapshot; deterministic convergence where merge is defined |
| Desktop end-to-end | Real Electron app/native OS integration | Install, sign-in, file dialogs, tray/close, crash/sleep/restart, native controls, Snap terminal startup |
| Server/jobs/providers | Short batch runtime, leases, scheduler, callbacks, data recovery | Lost reply, lease expiry, duplicate/out-of-order webhook, revoked connection, dead letter, provider pause/quota |
| UI/a11y/localization | English/Arabic, RTL, keyboard/screen readers, zoom | Mixed bidi content, focus, long forms/drag alternatives, Arabic numeric parsing and errors |
| Document artifacts | Invoice/proposal/credit/report PDF + CSV/archive | Saved snapshot reconciliation, Arabic shaping/font embedding, multipage clipping, safe CSV, privacy filtering |
| Release/operations | Signed installer/update, migration/restore, alerts | Tampered update, supported old versions, DB+blob restore, key recovery, independent export/vendor exit |

Financial fixtures include currencies with 0/2/3 decimal exponents; quantity/rate rational precision; half ties; many tiny lines; inclusive/exclusive taxes; document discount allocation; multiple partial credits exhausting original components; overpayment/unapplied credit; refunds with/without debt adjustment; FX/fees; deposit/final bill; retainers/overages and proration. Expected outcomes are approved independently of implementation. Use generated/property-based tests for conservation and example fixtures for policy interpretation.

## End-to-end release journeys

1. Owner enrolls, creates workspace, invites Contributor and Finance, configures language and client. Contributor cannot view private rates or all-client billing.
2. Manager creates scoped project/dependencies/deliverable; Contributor works offline, records/reviews time and reconnects. Conflicts preserve evidence; approvals reference exact revisions.
3. Finance creates draft offline, previews correct sources online, issues once despite response loss, exports Arabic/English PDF and records partial payment/credit/refund with conserved balance.
4. Client sees only published portal version, requests changes/approves once, and cannot enumerate sibling/other-client files. New version does not inherit acceptance silently.
5. Removed offline member reconnects with queued mutations; service rejects them and applies approved local recovery policy without privilege resurrection.
6. Restore old device/cloud snapshots after new invoices/provider payments; recover files/keys, reconcile subsequent events and prevent stale number/outbox replay.

## Platform and environment matrix

Required desktop platforms: Windows, macOS, Linux. Exact minimum versions/architectures remain Q-11. Test current supported builds per architecture, OS secret stores, scaling and native dialogs. Linux matrix includes GNOME/KDE where supported, Wayland/X11, missing/locked key store and VS Code Snap integrated-terminal startup. macOS covers signed/notarized Keychain behavior; Windows covers signing/permissions/credential protection. Browser portal has a separate declared browser matrix.

Use isolated development/staging/provider sandboxes and synthetic labeled data. Fixtures include Arabic/Latin/mixed names, Unicode, long/unbreakable strings, deleted users, missing costs/rates/files, zero data, large values, DST/clock jumps, offline for beyond retention, corrupted archives, malicious markup/URLs/CSV, revoked scopes and quota exhaustion. No customer credentials or full live dataset in test logs.

## Proposed performance budgets

Reference hardware must be agreed before a claim: proposed 4-core CPU, 8 GB RAM, SSD, current supported OS; record actual model and power mode. Dataset proposal: 50 members, 500 clients/projects, 10,000 tasks, 100,000 time entries and 10,000 issued financial documents with representative attachments. This is a benchmark fixture, not a supported service/seat limit.

| Measurement | Proposed target / measurement |
| --- | --- |
| Cold desktop cached workspace usable | p95 ≤ 3 seconds over 30 launches, excluding first online enrollment |
| Local filtered page/search | p95 ≤ 300 ms over 200 representative queries |
| Cached navigation/form response | p95 ≤ 100 ms for visible feedback; heavy work off UI thread |
| Online accepted ordinary command | p95 ≤ 1 second on declared 50-ms RTT baseline, excluding provider jobs |
| Memory/CPU | Record idle/timer/import peak and leaks over 8-hour run; set numeric budgets from prototype measurements |
| Sync catch-up / PDF / import | Benchmark by records/bytes/pages and publish limits; no invented unlimited throughput |

Free shared services may not meet these service budgets; record measured behavior and adjust deployment or supported pilot promises. Do not weaken finance/security checks to improve timing. Performance regressions require evidence, not optimistic screenshots.

## Definition of done and release evidence

A feature needs approved rules/fields/states, complete role/offline behavior, migration plan, positive/negative/retry/recovery tests, bilingual/RTL/accessibility checks, telemetry/redaction, user/support guidance and traceable IDs. Required release evidence records build/git identity where available, OS/CPU, database/protocol/policy versions, fixtures, exact commands/scenarios, result artifacts and unresolved defects. Phase checkboxes stay unchecked until evidence exists.

Block release for tenant leakage, unauthorized financial effect, duplicate issue/settlement, unrecoverable data loss, plaintext fallback, broken critical keyboard/Arabic flow or incompatible destructive migration. Security findings need risk triage; no silent waivers. Run targeted suites on every relevant change, full platform/provider/recovery gates before each supported release and scheduled restore drills during operation. [Acceptance matrix](acceptance.md) owns user-visible scenarios.
