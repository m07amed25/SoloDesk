# Implementation Plan: F012 — Workspace Creation and Safe Switching

**Branch**: `feat/f012-workspace-creation-and-safe-switching` | **PR**: [#15](https://github.com/m07amed25/SoloDesk/pull/15) | **Date**: 2026-10-22 | **Spec**: [F012 feature specification](spec.md)

**Input**: Feature specification from `specs/012-workspace-creation-safe-switching/spec.md`

**Status**: PR [#15](https://github.com/m07amed25/SoloDesk/pull/15) opened; 100/100 tests pass across 5 verification suites in `tests/f012/`. Production cloud delivery, hosted sandbox deployment, and public release remain blocked behind open gates Q-01, Q-02, Q-03, Q-06, Q-07, and F029 (see [QA Report](../../docs/qa/F012.md) and [Feature Docs](../../docs/features/F012.md)).

## Summary

F012 lets a verified, enrolled account create one isolated workspace with truthful initial defaults, then select among current memberships without losing, exposing, or redirecting source-workspace data. Creation is an online, account-scoped, idempotent PostgreSQL transaction that creates the workspace, sole active Owner membership, intent result, and redacted audit evidence together. Switching is owned by one main-process coordinator that binds every action and event to an immutable workspace ID plus a monotonic selection generation, resolves renderer-owned unsaved edits before leaving, closes the source partition, rechecks target authority, opens only retained or explicitly newly created protected data, and exposes the target only after all checks pass.

The smallest complete design reuses F003 UUID/envelope rules, F004 caller admission and deep-link parser, F005 shell/localization primitives, F006/F007 protection and one-active-store behavior, F008 tenant tables/RLS, F009 digest/reconciliation conventions, and F010's current session/profile/device boundary. It adds no dependency, second session owner, sync engine, generic command bus, cross-workspace aggregation, invitation flow, role editor, or production offline lease.

## Technical Context

**Language/Version**: TypeScript 7.0.2; Node.js >=24 <25; Electron 44.8.0; PostgreSQL/Supabase migrations and PostgREST RPCs for authoritative creation and membership reads.

**Primary Dependencies**: Existing Electron Forge/Vite, React 19.3.1, Tailwind CSS 4.3.3, shadcn/Base UI components, `@supabase/supabase-js` 2.118.0, `better-sqlite3-multiple-ciphers` 13.0.3, F003 contract primitives, F004 bridge/link admission, F005 bilingual shell, F006/F007 protected persistence, F008 tenant isolation, F009 intent/evidence patterns, and F010 identity/session/enrollment. No new package is selected or installed.

**Storage**: Existing `public.workspace_tenants`, `public.workspace_memberships`, and `public.tenant_audit_events`; one private account-scoped workspace-creation intent/result table; additive truthful-profile columns and hardened grants/RLS helpers; one sealed profile/account-bound local selection record; existing physically partitioned encrypted workspace databases and outboxes.

**Testing**: Existing Node test coordinators, local PostgreSQL/Supabase verification, Electron Playwright harness, verification manifest, and English/Arabic UI tests. Planned focused suites cover contracts, creation transactions/reconciliation, RLS/privacy, local switch ordering/crash recovery, bridge/deep-link fencing, and renderer accessibility.

**Target Platform**: Electron desktop on Windows, macOS, and Linux with managed Supabase Auth/PostgreSQL. F012 does not provision or publish the service.

**Project Type**: Cross-platform desktop application with an unprivileged React renderer, trusted Electron main/preload boundary, encrypted local workspace partitions, and managed backend authority.

**Performance Goals**: Meet SC-008–SC-010 as measured usability outcomes; retain visible feedback within the existing cached-navigation proposal (p95 <=100 ms) and ordinary online-command proposal (p95 <=1 second on the declared test baseline) without converting proposals into guarantees. Security/integrity goals are zero cross-tenant signals, exactly one accepted creation effect, and zero stale-generation effects.

**Constraints**: Online-authoritative creation; one active interactive workspace; bare lowercase UUIDv4 for new workspace IDs; non-unique editable display names; active membership and live session rechecked by the service; no unlimited offline access; no local empty replacement for missing/unreadable targets; renderer has no SQL/filesystem/token access; no false legal/finance readiness; English/Arabic, RTL/bidi, keyboard, focus, semantic announcements, contrast, and 200% zoom parity.

**Scale/Scope**: One selected workspace per enrolled local profile; low-frequency create/switch operations; the existing single Electron window/profile owner; existing tenant tables and one new private intent relation. Invitations, grant editing, device administration, offline lease issuance, sync/conflicts, workspace settings/closure, provider Realtime implementation, and cross-workspace views are excluded.

**Open implementation/release gates (resolved as fail-closed behavior, not guessed values)**: Q-01 and Q-03 keep legal/finance readiness incomplete; Q-02 blocks provisioning/capacity promises; Q-06 means offline selection remains locked/online-required until F016 supplies an approved lease; Q-07 blocks customer-data/native protection readiness until all-target proof exists; Q-08/F010 remain identity prerequisites. F010's missing hosted/UI evidence and F006/F007 native proof remain delivery gates. Production creation policy must be explicitly configured; synthetic verification may use `XTS`, `UTC`, `en`, and `ar` without claiming market support.

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                                          | Pre-research gate                                                                                                                                                                          | Post-design disposition                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Authorized scope and traceability**           | **PASS**: The request authorizes planning artifacts only; PLT-003 and FR-001–FR-026 are the authority. Conflicting root-card delivery wording cannot be promoted to evidence.              | **PASS**: Only F012 design artifacts are added. FR/A/SC mapping, open decisions, prerequisites, migration impact, and excluded later features remain explicit.                                                                                            |
| **II. Desktop trust boundaries**                   | **PASS with obligation**: Renderer input cannot choose actor/profile authority, open paths, or bypass membership/generation checks.                                                        | **PASS as design**: Main owns one coordinator; preload exposes narrow typed methods; existing sender/frame/origin/profile-epoch admission is reused; domain state is independent of UI/SQL/HTTP.                                                          |
| **III. Durable offline work with cloud authority** | **PASS with obligation**: Durable source ownership, one-effect retry, current membership, and Q-06 bounds must survive switching.                                                          | **PASS as design**: Creation uses account+intent+digest reconciliation; durable work never rebinds; offline selection is locked until an approved lease exists; F017 sync is not simulated.                                                               |
| **IV. Exact, immutable financial evidence**        | **PASS with boundary**: A currency code/default must not choose precision, tax, numbering, issuance, or legal policy.                                                                      | **PASS as design**: Locale-independent currency identity and policy version are retained while finance/legal readiness stays incomplete under Q-01/Q-03. No money calculation is introduced.                                                              |
| **V. Fail-closed security**                        | **PASS with obligation**: Authentication/workspace ID alone is insufficient; hidden tenants, locked keys, unreadable partitions, stale commands, and revoked memberships must deny safely. | **PASS as design**: Service derives the current account/session/device, RLS and RPCs expose only current memberships, target activation rechecks authority, local open-only mode forbids empty replacement, and generation fencing covers actions/events. |
| **VI. English, Arabic and accessibility**          | **PASS with obligation**: Workspace identity and recovery meaning must not depend on language, direction, or pointer input.                                                                | **PASS as design**: Closed message keys, bidi-isolated identity values, logical layout, keyboard/focus/live-region behavior, zoom/contrast checks, and fluent Arabic/native-AT evidence are required.                                                     |
| **VII. Recoverable evolution**                     | **PASS with obligation**: Schema/local-format changes and switch interruption must preserve data and never fabricate success or an empty tenant.                                           | **PASS as design**: Backward-compatible/backfilled migration, versioned sealed selection record, explicit initialize-vs-open-retained APIs, crash convergence, and locked recovery state are specified.                                                   |
| **VIII. Evidence before completion**               | **PASS with obligation**: Transaction, tenant, crash, native, accessibility, and privacy evidence must remain separate from plans.                                                         | **PASS as design**: Quickstart defines focused and regression evidence; synthetic/local/hosted/native results are reported separately. No test or release pass is asserted.                                                                               |

**Gate Result**: The documentation design passes all constitutional gates with no exception. Implementation and release remain gated by the prerequisites above.

## Project Structure

### Documentation (this feature)

```text
specs/012-workspace-creation-safe-switching/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── authoritative-workspace-commands.md
    └── local-workspace-context.md
```

### Source Code Layout (proposed implementation; not created by this plan)

```text
app/
├── shared/workspace-contracts.ts
├── main/
│   ├── main.ts
│   ├── bridge.ts
│   ├── links.ts
│   ├── identity/protected-identity-store.ts
│   ├── persistence/persistence-service.ts
│   └── workspaces/
│       ├── coordinator.ts
│       └── workspace-service.ts
├── preload/preload.ts
└── renderer/
    ├── env.d.ts
    ├── shell/App.tsx
    ├── contexts/WorkspaceContext.tsx
    └── components/
        ├── shell/HeaderUtilities.tsx
        └── workspaces/
            ├── WorkspaceCreateDialog.tsx
            ├── WorkspaceSwitcher.tsx
            └── PendingWorkspaceSwitchDialog.tsx
packages/localization/src/shell/{en,ar,types}.ts
supabase/migrations/<timestamp>_f012_workspace_creation.sql
tooling/f012/{verify,evidence}.mjs
tests/f012/{unit,service,integration,ui,fixtures}/
tests/verification/desktop/f012-*.spec.mjs
verification/suites.v1.json
package.json
```

**Structure Decision**: Compose one `WorkspaceCoordinator` beneath the existing F010 `IdentityCoordinator` and current profile epoch. Reuse `PersistenceService` and the existing bridge/subscription admission rather than create a second owner or event bus. Use one F012 shared contract so F010's intentional rejection of `workspace*` identity fields stays intact. Use one migration and one private creation-intent relation; no new application, dependency, microservice, settings blob, or general repository layer.

## Design and Implementation Sequence

1. **Prerequisite and status guard**: Confirm F010 verified-account/enrollment behavior is present, record missing hosted/UI/native evidence, and correct any delivery report that treats the root F012 card as executed evidence. Keep implementation behind explicit authorization.
2. **Canonical identifiers and closed contracts**: Standardize newly created workspace IDs on bare lowercase UUIDv4, retain adapters for legacy synthetic `ws_*` fixtures only, and add bounded F012 DTOs, validators, reason/action codes, creation policy, workspace summaries, state, and selection generation.
3. **Tenant schema compatibility and hardening**: Backfill a non-unique `display_name`, permit truthful absence of `legal_name`, add `profile_version` and `readiness_state`, preserve existing IDs/relationships, add the private account-scoped intent/result relation, explicit indexes, RLS, grants/revokes, immutable workspace-ID enforcement, and hardened helper function search paths/privileges.
4. **Authoritative creation RPC**: Reuse F010's authenticated RPC style and private transaction pattern. Derive current non-anonymous account and extant session, require a matching enrolled device, load the active versioned creation policy, validate closed fields, claim account+intent+digest, create one workspace/Owner/audit result atomically, and return/reconcile the same safe result on identical retry. Changed intent reuse fails.
5. **Selectable-workspace service**: Return only current active memberships with safe identity/profile/readiness fields and a deterministic short discriminator. Recheck the exact target immediately before activation. Missing, revoked, closed, guessed, and foreign IDs share a non-enumerating unavailable result.
6. **Protected selection and persistence split**: Store one sealed versioned account/profile-bound selection record with generation and transition state. Split persistence opening into explicit `initializeAuthorizedWorkspace` for a just-authoritatively-created workspace and `openRetainedWorkspace` for switching/restart; the latter rejects `uninitialized`, missing, locked, corrupt, incompatible, or wrong-binding state without creating files.
7. **Main-process workspace coordinator**: Serialize create/switch/restart attempts; derive source/account/profile; increment generation before source quiescence; close source store/subscriptions; recheck target; open target; atomically persist and publish the new current state. On failure, reauthorize/reopen the still-valid source or enter a locked chooser. Concurrent/superseded work becomes stale.
8. **Narrow bridge and entry-point routing**: Add named state/list/create/reconcile/switch methods and one bounded state subscription under existing caller admission. Every workspace-bound command/result/event/deep link carries immutable `{workspaceId, selectionGeneration}` context. Wire `LinkRouter` to current membership and explicit safe switching; never auto-reactivate or disclose a guessed tenant.
9. **Renderer pending-work and accessible UI**: Add one `WorkspaceProvider` with an in-memory before-leave registry. Resolve stay/discard/eligible save-to-source before invoking main; remount workspace-bound UI by generation; replace the header placeholder with create/switch dialogs; show current/target/discriminator/readiness and neutral switching/locked states with English/Arabic parity and predictable focus/announcements.
10. **Verification, migration, and rollback evidence**: Register fixed F012 suites; exercise transaction failpoints, concurrent retries, RLS/privilege negatives, partition open/init distinction, generation races, restart/revocation/deep links, redaction, and accessible bilingual flows. Run F003–F011 regressions. Rollback disables F012 entry points and preserves created workspaces, memberships, intent evidence, and local partitions; additive schema is not destructively removed.

## Interface, Data and Failure Summary

- [Authoritative workspace commands](contracts/authoritative-workspace-commands.md) defines creation policy, account-scoped create/reconcile, selectable summaries, target recheck, transaction/privilege rules, and non-disclosing errors.
- [Local workspace context](contracts/local-workspace-context.md) defines the coordinator, sealed selection record, generation-bound methods/events/actions, initialize-versus-open-retained persistence, pending edits, switch ordering, deep links, UI, and recovery.
- [Data model](data-model.md) defines the server and local records, relationships, invariants, and creation/selection state transitions.
- Unknown create outcome remains `outcome_unknown` until the original intent is reconciled. A committed cloud workspace whose local initialization fails remains created but locked/recoverable; it is never reported as not created.
- Switching failure never exposes a mixed view: it returns to a reauthorized source or a locked chooser. Durable source work is not deleted, copied, or re-keyed.
- Q-06 absence maps to `online_required`, Q-07/protection failures map to locked recovery, and hidden/foreign membership maps to one `workspace_unavailable` response.

## Verification and Traceability

| Slice                                 | Requirements                                | Acceptance | Planned evidence                                                                                                                                             |
| ------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Creation and truthful defaults        | FR-001–FR-007, FR-023–FR-026                | A-01–A-05  | Current-session/device negatives, policy/input bounds, atomic workspace+Owner+audit, duplicate/concurrent/lost-reply reconciliation, readiness and redaction |
| Safe switch and pending work          | FR-011–FR-017, FR-023–FR-025                | A-06–A-11  | Stay/discard/save-to-source, durable-status preservation, close/open failpoints, concurrent/superseded generation, zero mixed source/target state            |
| Restart, local protection, revocation | FR-018–FR-021, FR-023–FR-025                | A-12–A-15  | Sealed selection binding, online/offline restart, uncached/open-only, wrong account/profile/key/schema, membership removal and retained-work checks          |
| Visible context and entry points      | FR-008–FR-010, FR-014–FR-015, FR-022–FR-026 | A-16–A-19  | Duplicate names/discriminator, consequential confirmation, deep-link/notification/search context, stale callback and zero cross-workspace signals            |
| Bilingual accessible behavior         | FR-025–FR-026                               | A-20–A-22  | EN/AR key parity, real Arabic/mixed bidi, keyboard/focus/live regions, contrast, reduced motion and 200% zoom plus fluent/native-AT review                   |

Planned implementation commands (future evidence, not results):

```bash
npm run test:f012
npm run test:f012:contracts
npm run test:f012:service
npm run test:f012:switching
npm run test:f012:security
npm run test:f012:ui
npm run test:f003 && npm run test:f004 && npm run test:unit
npm run test:f006 && npm run test:f007 && npm run test:f008
npm run test:f009 && npm run test:f010 && npm run test:f011
npm run typecheck && npm run lint && npm run build
npm run check:security && npm run check:docs && npm run test:desktop
```

Service acceptance must exercise a real local PostgreSQL/Supabase transaction boundary and current Auth session. In-memory emulators cannot prove RLS, grants, concurrency, or rollback. Native Windows/macOS/Linux observations, production policy approval, hosted readiness, and usability outcomes are recorded separately.

## Migration, Rollout and Rollback

1. Apply a backward-compatible forward migration that backfills `display_name` from current trade/legal names, adds version/readiness fields, relaxes `legal_name` only after the backfill, creates the private intent relation and indexes, and installs explicitly granted RPCs. Existing tenant IDs and relationships do not change.
2. Verify old F008/F009 rows and policies before enabling F012. New workspace IDs are UUIDv4; legacy synthetic IDs remain readable only through compatibility paths and are never regenerated as new production IDs.
3. Ship UI entry points disabled unless the verified F010 boundary, creation policy, migration compatibility, and protected storage prerequisites are available. No policy configuration means `workspace_creation_unavailable`, not invented defaults.
4. Rollback disables new create/switch entry points and RPC execute grants for public clients while retaining created tenants, Owner memberships, audit/intents, and local encrypted bytes. Do not drop columns/tables or delete user work to downgrade.

## Complexity Tracking

No constitutional violation or justified complexity exception is proposed. The two new main-process files, one shared contract, one migration, one protected record, and three small renderer components are the minimum complete surfaces needed for authority, recovery, and accessible interaction.
