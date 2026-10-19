# Decision register

Updated 17 October 2026. **Confirmed** records user choices. **Recommended** records design choices made for this documentation. **Open** is not permission to guess. Documentation can describe a blocked capability without implementing it.

## Confirmed decisions

| ID | Decision |
| --- | --- |
| D-01 | Initial domain: freelance software engineering work |
| D-02 | Desktop targets Windows, macOS, and Linux |
| D-03 | Electron desktop application |
| D-04 | Priorities include projects, tasks, time tracking, invoices |
| D-05 | Business implementation deferred; this task is documentation only |
| D-06 | Earlier stack installation authorized |
| D-07 | Tailwind CSS and shadcn/ui required |
| D-08 | Earlier minimal runnable shell authorized |
| D-09 | Full advanced project documentation organized into phases; ask about complex decisions |
| D-10 | Freelancers and small teams from the first release |
| D-11 | Cloud account required, with offline support |
| D-12 | Document all financial features as configurable |
| D-13 | Draft invoices offline; finalize invoices online |
| D-14 | Managed cloud service first |
| D-15 | Encryption in transit/at rest, encrypted device storage, controlled server access |
| D-16 | No AI features for now |
| D-17 | English and Arabic in the first release, including full RTL |
| D-18 | Choose and document a recommended backend with tradeoffs |
| D-19 | Prefer the lowest practical cost; use efficient free options where available. Region, budget ceiling and scale remain undecided |

## Recommended design decisions

| ID | Recommendation | Rationale / gate |
| --- | --- | --- |
| A-01 | Supabase Auth, PostgreSQL, private Storage, TypeScript Edge Functions and short Cron/job batches; free development/pilot profile first | Relational financial transactions; service-enforced tenant scopes; managed operations. Region/cost review before provisioning |
| A-02 | Encrypted local SQLite cache and durable outbox, application-level sync | Offline edits without treating a shared database file as a sync protocol. Encryption adapter proof required |
| A-03 | Server authority for memberships, document issuance, financial postings, number/allocation ownership | Prevents stale offline permissions and duplicate financial effects |
| A-04 | Owner/Admin/Manager/Contributor/Finance/Viewer role templates plus scoped capabilities | Solo and small-team support without giving every member financial access |
| A-05 | One active timer per user/device; reconcile cross-device overlaps before billing | Global exclusivity cannot be guaranteed while disconnected |
| A-06 | Exact integer source seconds; versioned rational/decimal prices; final amounts in currency minor units | Prevents display rounding from changing billing. Detailed rounding profile remains open |
| A-07 | Immutable issued financial snapshots with linked corrections | Changes remain explainable and historical documents reproducible |
| A-08 | Deterministic automation creates drafts by default; sending/issuing require separately enabled rules | Clear authority, retries, recipients, and audit |
| A-09 | Restore cloud backups under service recovery procedures; device backups open isolated before rejoining | Avoids replaying old writes or invoice sequences |
| A-10 | Local secret-store encryption must fail closed when protection is unavailable | Required encrypted device storage cannot silently downgrade |

## Complex decisions still open

| ID | Question / provisional position | Blocks | Owner |
| --- | --- | --- | --- |
| Q-01 | Launch countries, seller registrations, e-invoice mandates, invoice/contract retention; configurable fields alone are insufficient | Jurisdiction profile and legal claims | Product owner + local accountant/legal reviewer |
| Q-02 | Cloud region/data residency, monthly budget, expected active users/workspaces, storage and support hours | Provisioning, plan selection, operational promises | Product owner |
| Q-03 | Exact time rounding, grouping, minimums, tax/discount order, currency precision, numbering series | Approval of financial fixtures | Product owner + finance reviewer |
| Q-04 | Sleep/idle defaults, timer reminders/tray close, maximum manually entered duration | Final timer UX | Product owner |
| Q-05 | Role templates, time/expense approval rules, project grants, financial dual approval | Permission matrix sign-off | Product owner |
| Q-06 | Maximum offline authorization period and handling after expiry; proposed seven days subject to risk review | Device enrollment/offline access contract | Product + security |
| Q-07 | Encryption adapter (better-sqlite3-multiple-ciphers SQLCipher v4), authenticated staged files, fail-closed Linux basic_text rejection, and local-only recovery limits evaluated under F006. Production approval pending final security sign-off and multi-target native host proof | P01 encrypted cache proof | Engineering + security |
| Q-08 | Mandatory MFA policies, SSO/social providers, account recovery, invite expiry | Identity release | Product + security |
| Q-09 | First connector/provider list: GitHub/GitLab, calendar, email, payments, accounting; operator credentials and countries | P07 connector commitments | Product owner |
| Q-10 | Portal login versus expiring verified links; legal signature provider, signatory evidence, branding | P02 signatures / P08 portal | Product + legal/security |
| Q-11 | Provisional native matrix defined (Linux x86_64, Windows x64, macOS arm64). Linux headless verified fail-closed on basic_text; Windows/macOS native host proof remains blocked pending accessible target hosts | P09 supported distribution | Engineering + product |
| Q-12 | Product pricing/license, trials, seat billing, subscription grace and export on cancellation | Commercial launch, not core domain modeling | Product owner |
| Q-13 | Maximum offline retention window, tombstone period, account deletion and backup expiry | Deletion/rejoin guarantees | Product + operations/legal |
| Q-14 | Capacity calendars, working days, cost-rate visibility, reporting basis and FX feed | P03/P06 forecasts | Product owner |
| Q-15 | Existing import sources, historic issued numbers, opening receivables/credits/retainers | Migration/import launch scope | Product owner |
| Q-16 | Hosting availability target, incident response, RPO/RTO and independently stored blob backups | Production service readiness | Product + operations |

Provisional values must be shown in the UI/specification and tested, not silently treated as confirmed. Unresolved legal rules disable affected issuance profiles; unresolved optional connectors stay disabled.

## Superseded earlier proposals

Single-user/local-only/no-account operation is superseded by D-10/D-11. Full-payment-only billing is superseded by D-12. Optional basic team/sync architecture is superseded by mandatory P01 team/sync foundations. Unrestricted offline finalization is excluded by D-13. AI exploration is excluded by D-16. The old small first-version limits do not govern this expanded roadmap.

For each future change record date, decision maker, rationale, impacted requirement IDs, schema/API compatibility, migration and test consequences. A decision being documented never marks its implementation complete.
