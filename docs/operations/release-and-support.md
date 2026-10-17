# Distribution, service operations and support

Status: proposed P09 release policy applied throughout development. No installer, backend, signing pipeline or public service exists. Core cloud/team release cannot rely on Linux welcome-shell startup evidence alone.

## Environments, build and release

Separate local/dev/staging/production tenants, secrets, storage and provider credentials. Repository holds deterministic dependency locks, migrations, tests, artifact manifests and configuration schema, never production secrets. CI proposal: documentation/schema lint → domain/property tests → storage/API/authorization tests → OS desktop builds/tests → document/RTL/accessibility checks → dependency/license/security scan → signed staged artifacts → migration/restore rehearsal → approved rollout.

Publish supported OS/CPU versions and installer choices after Q-11. Candidate Windows signed installer, macOS signed/notarized DMG/ZIP, Linux AppImage and selected distro package need native proof and update strategy. The present Forge config has no makers. Track runtime/security support lifecycle and native encryption ABI for each package. Verify installation path permissions, app data, URL protocol callbacks, key store, clean uninstall choices and user data preservation.

Updates have signed metadata/artifacts, checksum/build identity, channel (development/pilot/stable), release notes, minimum compatible API/schema, staged rollout and pause/revoke control. Never update halfway through financial commit, key rotation or migration. Timer capture survives restart/update with explicit prompt. Invalid/older incompatible update is refused. Downgrade only if local/cloud data compatibility is proved; otherwise forward repair/recovery version. Code signing keys and account access use restricted roles/MFA and rotation/runbooks.

## Low-cost deployment and quotas

Use [recommended initial stack](../architecture/backend-stack.md). Free development/pilot profile has limited quotas, pauses and no automatic backup guarantee. Before public financial reliance, accept a bounded pilot policy or fund the required backup/availability capacity. Do not advertise an SLA or uninterrupted scheduled jobs on a profile that cannot supply it. Server jobs are short leased batches with receipts; long PDF/import work needs a runtime proof or approved worker.

Monitor database/blob/egress/function/auth/email quotas, job backlog and estimated spend. Proposed 70/85/95% alerts; owner sets caps and escalation. Degrade nonessential reports/previews/connectors before authoritative writes, preserve offline drafts/capture, and show upload/sync limits. Never silently drop data, bill twice, delete legal records or change a number to avoid a quota. Pricing/limits are checked at provisioning, not copied as permanent promises.

## Observability and incident response

Collect essential redacted service metrics: API error/latency, auth failures, denied tenant access, sync lag/conflicts/rejections, job retries/dead letters, provider callback health, backup age/restore success, key failures and quota usage. Correlation IDs join user-visible failures to logs without client content. Product analytics/crash memory upload is opt-in and distinct from essential operations. Define retention/access before enabling external monitoring.

Incident flow: detect/triage → appoint responder → contain (pause unsafe financial/provider action, revoke compromised credentials, isolate tenant where justified) → preserve audit/evidence → communicate through approved status/support channels → repair/reconcile → validate recovery → post-incident actions. Data leak/duplicate money/irrecoverable corruption are highest severity; exact paging/support hours are Q-16. This document does not authorize sending messages now.

Recovery runbook checks DB, object bytes, keys/config, command receipts, sequence/source ownership, scheduler leases and provider events after restore point. Do not blindly replay external side effects. Target RPO/RTO depend on plan and operator coverage; proposed daily independent exports and monthly restore drill are not a guaranteed production SLA. Record measured values and backup failures. Cloud recovery may need a temporary finance read-only mode while external events reconcile.

## Support and user guidance

Ship English/Arabic guides for enrollment/MFA recovery, invite/role management, offline lease and sync conflicts, timers/sleep recovery, draft/issue/payment/corrections, exports/imports/backup rejoin, provider revoke and account/workspace closure. Explain saved locally versus synchronized, online-only finance, available profile limits, unsynced-key recovery and data already shared with clients.

Support bundles preview redacted versions/error IDs/health; databases, environment dumps, tokens, private paths, customer documents and raw dumps are excluded by default. Temporary support access requires tenant authorization, purpose, duration, minimum scope and audit. Staff cannot silently impersonate Owner. Track bugs by severity, reproduced build/OS and relevant requirement IDs; verified fixes update user-facing limitations.

## Retention, portability and vendor exit

Publish account/workspace deletion, contact/private-note deletion, legal holds, audit/blob/backups expiry and unsupported-device resnapshot windows. Export includes logical data and document/files with schema/manifest. Device revoke is future-access control, not guaranteed remote wipe. Practice moving DB/files/auth mapping/jobs to a new service without renumbering invoices or losing credentials provenance; active secrets rotate instead of exporting them into ordinary archives.

## Commercial product decisions

If SoloDesk is sold, separate product plan/seat subscription from clients' service subscriptions/invoices. Define seat counting (active member, guest, suspended user), limits, entitlement changes, trials, cancellation grace, refunds and tax policy. Server enforces entitlements while preserving read/export/financial history and offline recovery; downgrade cannot silently delete projects or make issued documents inaccessible. Pricing/license/model remain Q-12 and do not block a private limited pilot. No payment subscription or billing provider has been purchased/configured.

## Release checklist

- [ ] Included requirement IDs and disabled features/profiles declared; country-specific documents validated.
- [ ] Required OS install/upgrade/uninstall, signed-update, migration/recovery and encrypted-cache tests pass.
- [ ] Tenant/project/guest access, financial retry/correction, offline/sync and bilingual accessibility gates pass.
- [ ] DB+blob backups restore; RPO/RTO, provider-event reconciliation and incident ownership evidenced.
- [ ] Supported platform/browser/provider matrix, service/quotas and privacy/retention/export policies published.
- [ ] Known defects triaged; no unresolved release-blocking data/finance/security defect.

Each item is a future gate requiring build-specific evidence; none is marked complete today.
