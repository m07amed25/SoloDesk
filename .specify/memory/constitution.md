# SoloDesk Constitution

## Core Principles

### I. Authorized Scope and Traceable Decisions

Work MUST remain within the user's authorized scope. Business-feature work is currently
documentation only; the previously authorized runnable welcome shell remains valid. A later user
request can authorize implementation for its stated scope. Specifications, skills, phase plans,
task lists and this constitution MUST NOT expand that authorization or trigger repeated requests
for permission already granted.

Contributors MUST read [AGENTS.md](../../AGENTS.md), [AGENT.md](../../AGENT.md), the
[product brief](../../PRODUCT.md), [documentation index](../../docs/README.md) and relevant
[decisions](../../docs/planning/decisions.md) before project work. A selected skill's actual
`SKILL.md` MUST be read before applying it. Confirmed decisions, recommendations, unresolved
questions and implemented behavior MUST remain distinguishable. Recommendations and provisional
defaults MUST NOT be represented as confirmed user choices or passed implementation gates.

Requirements MUST retain stable IDs. A change MUST identify affected specifications, phase,
states, data/API contracts, acceptance examples, risks and decisions, updating applicable links
within the authorized scope. Retired IDs MUST NOT be reused for unrelated behavior. This keeps
the client-to-payment workflow reviewable across documents and implementation.

### II. Desktop Platform and Explicit Trust Boundaries

SoloDesk MUST target Windows, macOS and Linux using Electron, React and TypeScript, with Tailwind
CSS and shadcn/ui. Electron Forge and Vite are the current tooling; exact installed versions MUST
come from the package manifests and lockfile rather than descriptive badges. Changes to confirmed
platform or UI requirements require an explicit product decision.

The renderer MUST remain unprivileged, with sandboxing, context isolation and no Node integration.
It MUST NOT access SQL, filesystem, shell, raw IPC or secrets directly. Preload MUST expose narrow,
typed methods; trusted handlers MUST validate sender, origin, payload and authority. Generic
execute/channel/path bridges and arbitrary remote executable content are prohibited.

Domain transitions and exact arithmetic MUST remain independent of UI, Electron, SQL and HTTP.
Adapters MUST enforce contracts without inventing policy. Server commands MUST revalidate trusted
inputs and current permissions; shared types and client validation do not replace those checks.
A later browser portal MUST use explicitly published projections and scoped guest actions.

Source: [architecture](../../docs/architecture/overview.md),
[API/IPC contracts](../../docs/architecture/api-contracts.md); NFR-015, D-02/D-03/D-07.

### III. Durable Offline Work with Cloud Authority

The first usable release MUST support freelancers and small teams, required managed-cloud
accounts, workspace tenancy and enrolled-device offline work. Initial sign-in/enrollment requires
connectivity. A solo freelancer MUST use the same workspace isolation model as a team.

Eligible offline edits MUST survive restart through atomic local change/outbox commits. Sync MUST
deduplicate retries, reject changed-payload reuse of an operation ID, and advance a pull cursor
only with its applied data. The interface MUST distinguish unsaved, saved locally, queued,
synchronized, conflicted, rejected and unavailable states. A local save MUST NOT imply upload.
Conflicts MUST preserve permitted candidates and recovery paths; device clocks MUST NOT be the
sole arbiter of accepted state.

The service MUST enforce current membership and resource/action authorization on replay. Cached
roles cannot restore revoked privileges. Offline access MUST use an explicitly approved bounded
authorization policy; its duration remains Q-06. Financial authority and allocation ownership
MUST NOT be inferred from an offline draft. Timer capture MUST preserve confirmed seconds and
expose uncertain gaps; cross-device overlaps MUST be reconciled before affected work is billed.

Source: [sync contract](../../docs/architecture/sync-and-collaboration.md),
[time specification](../../docs/specs/time-and-productivity.md); NFR-002, D-10/D-11/D-13/D-14.

### IV. Exact, Immutable Financial Evidence

Authoritative posted amounts MUST use currency minor units with explicit currency precision.
Quantities, rates, percentages and exchange rates MUST use exact decimal or rational values;
binary floating-point MUST NOT determine authoritative money. Source duration MUST remain exact
integer seconds. Display rounding or translation MUST NOT change stored values. Calculation,
rounding, tax, discount and rate policies MUST be versioned, previewed and approved before use;
the unresolved choices in Q-03 MUST NOT be silently replaced with proposed defaults.

Invoice drafting MUST work offline; final invoice issuance MUST require online server authority.
Issuance MUST atomically validate current draft/source revisions, recompute totals, allocate a
unique number, freeze parties/lines/policies/totals, acquire billable-source ownership and record
audit/idempotency evidence. Lost replies MUST resolve the original operation before retrying.
Authoritative financial postings MUST have one effect under retries and concurrency.

Issued documents and posted financial facts MUST NOT be edited, deleted or merged by
last-write-wins. Corrections MUST retain originals and use linked, audited compensating records
under the approved jurisdiction policy. Allocations, credits, refunds, deposits and retainers
MUST conserve exact value and prevent double consumption or rebilling. A credit or refund MUST
NOT automatically make previously billed work available again. Reports MUST disclose their
basis and MUST NOT sum unlike currencies into an unlabeled total.

Configurable finance MUST NOT bypass these invariants. Unresolved legal profiles MUST remain
disabled for affected issuance; configurable fields alone are not evidence of legal compliance.

Source: [finance specification](../../docs/specs/finance.md),
[data model](../../docs/architecture/data-model.md); NFR-001, D-12/D-13, Q-01/Q-03.

### V. Fail-Closed Security and Least Privilege

Data MUST be encrypted in transit and at rest, including device databases, attachments, indexes,
outbox and staging data, with controlled server access. The installed `better-sqlite3` package
MUST NOT be treated as an encryption implementation. An encrypted adapter and key-storage path
MUST pass native proof on every supported OS before the foundation gate passes. Missing or
locked protection MUST fail closed without silent plaintext fallback or home-grown cryptography.

Refresh credentials MUST stay in approved OS secret storage; server/provider/signing secrets
MUST NOT enter renderer storage, desktop/portal bundles, ordinary database fields, logs or
backups. Authorization MUST deny by default and enforce tenant, project/object and action scopes
for records, counts, search, files, exports, notifications and subscriptions. Authentication or a
supplied workspace ID alone is insufficient. Permission changes MUST invalidate cached access.

Sharing MUST be explicit, recipient-scoped and bound to exact versions. Internal notes/costs MUST
remain private. Support access MUST have tenant authorization, purpose, minimum scope, duration
and audit. Diagnostics MUST be redacted; product analytics and crash uploads MUST be opt-in.
Device revocation MUST NOT be advertised as guaranteed deletion of an already held offline copy.

Source: [security/privacy](../../docs/architecture/security-and-privacy.md); NFR-004/NFR-005/NFR-012,
D-15. Encryption adapter, recovery and identity policy choices remain Q-07/Q-08.

### VI. English, Arabic and Accessible Interaction

English and Arabic with full RTL MUST ship in the first release and every enabled workflow.
Coverage MUST include forms, validation, errors, empty states, menus/tray, notifications, emails,
PDFs, onboarding and updater messages. Layout MUST use logical direction and isolate mixed
identifiers, emails, URLs and code. Locale changes MUST NOT rewrite user-entered legal names,
document identities or amounts. Document locale MUST be frozen with its issued snapshot.

Numeric entry MUST support declared Arabic/Latin digit and separator formats, exposing ambiguity
before financial commit. Arabic review MUST include a fluent reviewer; exported artifacts MUST
verify shaping, embedded fonts, selectable text, pagination, privacy and snapshot totals.

Enabled interfaces MUST be checked against the documented WCAG 2.2 AA target and native desktop
requirements: keyboard access, visible focus, semantic screen-reader behavior, contrast, zoom,
reduced motion and alternatives to drag, hover, shortcuts and tray actions. Automated checks
MUST supplement manual verification. Errors MUST preserve valid input and name a recovery action;
demo data MUST remain isolated and clearly labeled.

Source: [UX/localization](../../docs/product/ux-and-localization.md); NFR-006/NFR-007, D-17.

### VII. Recoverable Data and Compatible Evolution

Local/cloud migrations and protocols MUST declare supported versions and preserve data on
failure. Migrations MUST verify space, keys and a recoverable backup before changing active data,
then validate integrity before resuming. Unknown fields/events or unsupported clients MUST enter
an explicit upgrade/recovery path rather than silently discard data. Read failure MUST NOT
create an empty replacement database.

Backups MUST cover required records, blobs, manifests and recovery metadata, exclude active
credentials, and prove restoration. Sync alone is not historical backup. Restores MUST open in
isolation, validate integrity and compare with current cloud authority before reviewed rejoin.
They MUST NOT replay stale outbox operations, restore revoked grants/credentials, decrement
invoice sequences or duplicate later payments. Cloud recovery MUST reconcile external effects
after the restore point.

Imports/exports MUST preserve exact values, provenance and permitted relationships. Imports MUST
be inert, previewed, bounded and idempotent; they MUST NOT implicitly send documents, charge
clients or establish acceptance. Deletion MUST respect references, tombstones, approved retention
and legal holds. Portable export and recovery paths MUST remain defined for closure/vendor exit;
durations and recovery objectives remain Q-12/Q-13/Q-16.

Source: [data lifecycle](../../docs/architecture/data-lifecycle.md); NFR-003/NFR-010/NFR-013.

### VIII. Evidence Before Completion or Release

Specifications, implementation, executed tests and release assurance MUST be reported separately.
A build or shell launch MUST NOT be represented as proof of finance, encryption, authorization,
Arabic, synchronization or supported distribution. Phase checkboxes MUST stay incomplete until
their required evidence exists. Disabled capabilities MUST be explicit.

Verification MUST match the change and risk. Finance needs independently approved fixtures and
conservation/concurrency tests; authorization needs negative scope tests; persistence/sync needs
restart, loss, duplicate, revocation and restore scenarios. Relevant UI changes need bilingual,
RTL and accessibility checks. Supported releases need native OS, signing/update, compatibility,
backup/restore, dependency/license and operational evidence. Performance claims MUST name the
hardware, data, environment and measured result; proposed budgets are not current guarantees.

Release MUST be blocked by tenant leakage, unauthorized/duplicate financial effects, unrecoverable
loss, plaintext fallback, broken critical keyboard/Arabic workflows or destructive incompatible
migration. Security findings require documented triage and mitigation/owner decisions. Evidence
MUST identify requirement/scenario IDs, build and policy/schema versions, environment, expected
versus observed results, redacted artifacts, defects, reviewer and date.

Source: [acceptance](../../docs/quality/acceptance.md),
[test strategy](../../docs/quality/test-strategy.md); NFR-008/NFR-011/NFR-014.

## Product and Operational Constraints

- The product MUST connect client acquisition, agreed scope, delivery, time, billing, collections
  and business review. The first usable release MUST include secure cloud/team foundations and
  a coherent basic client-to-payment path; advanced feature breadth cannot substitute for it.
- AI product features MUST remain excluded under D-16: no model calls, embeddings, AI data
  sharing or autonomous product agents. Deterministic automation remains in scope. This rule
  does not prohibit assistants or tools used for development/documentation.
- Rules and connectors MUST have explicit owners/scopes, bounded actions, audit, retry and stop
  controls. Draft creation is the documented default; issuing/sending needs separately enabled
  authority and current validation. Unknown provider outcomes MUST reconcile before retry.
- Managed cloud is confirmed; Supabase-first is a documented recommendation, not provisioned
  infrastructure or a permanent provider mandate. Low-cost/free options MUST be evaluated
  against quotas, recovery and operational needs. Region, budget, capacity and availability
  promises MUST be decided before dependent deployment; limits MUST be verified then.
- Configurable features MUST validate prerequisites on enablement and preserve history,
  balances, obligations and export on disablement. No switch may bypass constitutional rules.
- Native mobile, a first-release self-hosted edition, full general ledger/payroll, raw-card
  collection, surveillance, unrestricted plugin/script execution and automatic legal/tax
  compliance MUST NOT become implicit commitments. Portal/providers require separate release gates.

Source: [product brief](../../PRODUCT.md), [requirements](../../docs/product/requirements.md),
[backend recommendation](../../docs/architecture/backend-stack.md),
[roadmap](../../docs/planning/roadmap.md).

## Development Workflow and Quality Gates

1. Establish current authorization and applicable confirmed decisions. Select only relevant
   skills/specifications; verify workflow prerequisites and active artifact paths. Missing tools
   or credentials MUST be reported accurately rather than replaced with invented results.
2. Before dependent implementation, review requirement IDs, actors, fields, lifecycle/transitions,
   permission/offline behavior, failure/retry/recovery, audit, acceptance and migration impacts.
   Resolve blocking Q decisions with the responsible owner; safe independent documentation can
   proceed. A recommendation MUST NOT silently close an open decision.
3. Apply a constitution compliance check during specification/plan review and before completion
   or release. Record applicable principles, evidence, unresolved blockers and disabled features.
   Follow the selected workflow; do not silently mix Spec Kit and OpenSpec lifecycles.
4. Implement only authorized slices in dependency order. P01 trust/encryption/sync foundations
   precede business authority; immutable snapshots precede publication. Run appropriate targeted
   checks, broadening when new changes, failures or remaining risks justify it.
5. Report what changed, what was actually checked and remaining limitations. Maintain traceability
   and user/support guidance. P09 release/operations gates apply before every public release;
   their placement at the end of the roadmap does not defer them until after shipping.

No plan, phase entry or quality gate authorizes package installation, paid service signup,
provisioning, deployment, publication or external communication by itself. Apply the user's
existing authorization to necessary actions and request only genuinely missing authority.

## Governance

This constitution establishes project-wide rules for planning, implementation, review and
release. It MUST be applied within system/developer instructions and the user's current scope;
it does not supersede them. [AGENT.md](../../AGENT.md) routes agent work;
[PRODUCT.md](../../PRODUCT.md) and the [decision register](../../docs/planning/decisions.md)
record product authority. Detailed specifications define their domain contracts. Summaries,
badges, templates and examples MUST NOT override confirmed decisions or these safeguards.

An amendment MUST state its rationale, changed principles, affected requirements/contracts,
migration/compatibility consequences, verification impact and unresolved decisions. Changes to
confirmed product choices require explicit product-owner authorization recorded in the decision
register; engineering/security/finance/legal reviewers participate where the affected gate
requires their review. A user request expressly authorizing a bounded constitution amendment is
sufficient authority to perform that documentation work; no redundant approval step is required.
If conflicting documents cannot be reconciled through confirmed decisions, preserve the issue
and resolve it before dependent work rather than silently choosing a new policy.

Versions MUST follow semantic versioning: MAJOR for incompatible removal/redefinition of rules;
MINOR for added principles/sections or materially expanded guidance; PATCH for non-semantic
clarifications/corrections. Every amendment MUST update the version and last-amended date while
preserving the original ratification date. Version 1.0.0 is the initial adoption, replacing the
unratified placeholder scaffold on 2026-10-17.

Every relevant plan/review MUST check compliance and document deviations. Complexity or a
proposed exception MUST have rationale and impact evidence; a violated MUST remains a blocker
until the design complies or an authorized amendment changes the rule. Templates and commands
consume this file at runtime; constitution updates MUST NOT rewrite template layers. Applicable
cross-document changes MUST be identified for coordinated work within the authorized scope.

Temporary Sync Impact Reports used during amendment review MUST be removed before committing;
they are not permanent governance content.

**Version**: 1.0.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-17
