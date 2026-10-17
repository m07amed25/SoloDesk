# Backend selection and cost profile

Updated 17 October 2026. Confirmed: managed cloud, required accounts, teams, offline desktop, online invoice finalization, encrypted storage, no AI, and the lowest practical cost. Regions, launch markets, budget ceiling and scale remain undecided. No service is provisioned or purchased.

## Recommended initial stack

| Component | Recommendation | Responsibility |
| --- | --- | --- |
| Identity | Supabase Auth | Sign-in, verification, sessions/MFA capabilities; workspace grants remain application data |
| Authority | Supabase PostgreSQL | Transactions, constraints, tenant policies, accepted revisions, financial records |
| Private files | Supabase Storage | Versioned objects and scoped access; blob backup separate from DB backup |
| Domain API | TypeScript Supabase Edge Functions | Authenticated command/query boundary and provider callbacks; validate payload and current grants |
| Financial commit | Restricted PostgreSQL transactional functions invoked through the authorized service | Atomic number/snapshot/allocation/settlement/receipt/audit changes; no unrestricted client table writes |
| Durable jobs | Postgres job/outbox tables + Cron invoking short Edge Function batches | Leases, retries, deduplication, dead letters, schedules while desktop is closed |
| Desktop cache | Encrypted SQLite-compatible adapter; SQLCipher candidate | Local replicas/outbox/search; adapter/native build/licensing proof required |
| PDF/export initially | Sandboxed desktop rendering from saved snapshot | English/Arabic and offline export; unattended cloud rendering is a separate proof/gate |
| Hosted sign-in UI (P01) / later portal (P08) | Separate bilingual React/TypeScript web build; Cloudflare Pages static hosting candidate | Supabase is an identity API, so provide an actual browser sign-in/recovery screen and validated app callback; portal routes added later |

Supabase documents relational Postgres and row-level security; RLS policies require explicit allow/deny tests. [Postgres](https://supabase.com/docs/guides/database/overview), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Functions use a TypeScript-compatible edge runtime; pure shared domain/contracts must run without Node/Electron-specific APIs. [Edge Functions](https://supabase.com/docs/guides/functions).

This avoids an additional always-on API/worker bill initially. Scheduled invocation uses supported Postgres scheduling, but SoloDesk must still implement durable job semantics. [Scheduling functions](https://supabase.com/docs/guides/functions/schedule-functions). Function execution is bounded; chunk/resume jobs and persist progress. Heavy PDF/large import workloads cannot assume an unlimited background process. [Runtime limits](https://supabase.com/docs/guides/functions/limits).

## Free development/pilot profile

Provider snapshot below is from 17 October 2026; recheck before provisioning. It is not a capacity promise for SoloDesk.

| Supabase Free item | Published allowance/condition |
| --- | --- |
| Subscription | USD 0/month |
| Database | 500 MB |
| File storage | 1 GB |
| Egress | 5 GB, with separately listed cached egress allowance |
| Monthly active users | 50,000 |
| Project activity | Pauses after one week of inactivity; two active projects |
| Automatic backup / PITR | Not included on Free |

These quotas are provider allowances, not supported user counts or an availability guarantee. Pro starts at a published USD 25/month before relevant extras/overages; no upgrade is authorized here. [Current pricing and limits](https://supabase.com/pricing).

Use local development emulators where practical, one isolated cloud pilot, synthetic staging data, compressed bounded attachments, delta sync and pagination. Alert at proposed 70%/85%/95% quota consumption; warn before upload exhaustion and preserve local work. Never silently delete finance/audit data to fit a quota. Do not misuse artificial activity to evade provider pausing.

Default Auth SMTP is restricted and unsuitable as a general production email service. Configure a proper SMTP/provider before public email enrollment/invitations; any free allowance needs its own current verification. [Auth SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp). Domain registration, email volume, signing certificates, independent backups and support can cost money even when database hosting is free.

## Production upgrade triggers

Upgrade or redesign before promising non-pausing service, stronger backup retention/PITR, higher quotas, unattended heavy rendering, paid support or agreed availability. Required-account users cannot finalize invoices during a paused/unavailable service; the UI preserves offline drafts and shows the dependency. A limited pilot explicitly accepts these constraints; public release still must meet the chosen operations gates. Free hosting is not a substitute for recoverability.

If edge limits are exceeded, add a managed TypeScript/Fastify API or durable Node worker (Render is a candidate), keeping domain/contract boundaries portable. This is a future cost decision, not the default deployment. [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [Render workers](https://render.com/docs/background-workers). Do not add Redis, Elasticsearch, Kubernetes, a data warehouse or multiple microservices without measured need.

## Alternatives and proof

Firebase provides useful offline document capabilities, but its described last-write-wins behavior alone does not satisfy explicit conflicts/financial invariants; an authoritative domain service remains necessary. [Firestore offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline). Fully self-hosting increases operator responsibility and is not the selected first model. Managed Postgres with separate auth/files adds vendors before a demonstrated need.

P01 must prove tenant isolation, restricted transaction entry points, auth/native callback, lost-response idempotency, permitted incremental sync, denied stale-role replay and encrypted local restart. Region, quota model, vendor terms, backup/key recovery and export must be reviewed before real data. DB backups do not include stored file bytes; back up/restore both. [Backup scope](https://supabase.com/docs/guides/platform/backups).

SQLCipher is a candidate for encrypted SQLite, not an installed compatible adapter. [SQLCipher](https://www.zetetic.net/sqlcipher/). OS key storage wraps keys, not the full database; Linux `basic_text` is not acceptable protected storage. Check APIs against the pinned Electron runtime. [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

The hosted sign-in frontend is required in P01 for the system-browser flow; it is not deferred with the full portal. It carries public configuration only and calls the authorized backend. Cloudflare Pages documents a free plan with deployment/usage limits; validate current terms, custom-domain/DNS costs, callback origins and regional requirements before selection. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/). This adds a small static surface rather than an always-on API bill.
