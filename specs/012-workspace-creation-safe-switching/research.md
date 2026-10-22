# Phase 0 Research: F012 — Workspace Creation and Safe Switching

## 1. Current scope and repository truth

**Decision**: Treat F012 as design-only in this workflow. The active Spec Kit feature is `specs/012-workspace-creation-safe-switching`, while the checked-out Git branch is still F011. Do not treat the root F012 card's implementation/QA wording as executed evidence.

**Rationale**: The F012 spec, product brief, code, and `app/main/main.ts` all show that real workspace creation/switching is absent; only a synthetic F007 workspace can open. Constitution I and VIII require plans, implementation, tests, and release evidence to remain distinct.

**Alternatives considered**: Repeating the root-card claim would be inaccurate. Editing unrelated root planning status is outside this planning command.

## 2. Reuse the existing vertical foundations

**Decision**: Reuse the F010 identity owner/session/enrollment, F007 one-active protected store, F008 tenant tables/RLS, F009 digest/evidence conventions, F004 bridge/link admission, and existing shell/localization components. Add no dependency or general framework.

**Rationale**: These boundaries already own the hard concerns F012 needs: current profile epoch, access token, device enrollment, physical profile/workspace partitioning, transactional local outbox, tenant membership, caller validation, and bilingual UI primitives. Extending them minimizes code and prevents competing owners.

**Alternatives considered**: A second session owner, generic workspace repository, event bus, separate web app, Redux/query library, or new modal/form package would duplicate established behavior without solving an F012 requirement.

## 3. Account-scoped authoritative creation and reconciliation

**Decision**: Follow F010's account-scoped RPC/transaction pattern, adapted to workspace creation. A tightly scoped authenticated RPC derives the current non-anonymous account, validates the extant `auth.sessions` row and enrolled device, loads the active creation policy, and invokes one private transaction. The transaction claims `(issuer, subject, workspace.create, intent_id)` plus a canonical digest, inserts one workspace, one active Owner membership, and redacted audit evidence, then stores the stable result. Identical retries return it; changed payload reuse rejects.

**Rationale**: F009's generic receipts require an existing workspace and membership, so they cannot create their own authority boundary. The F010 enrollment intent is the closest proven repository pattern. PostgreSQL transactions make the workspace/membership/audit effect atomic, while a unique intent key and `INSERT ... ON CONFLICT`/row lookup fence concurrency. Provider/network calls stay outside the database transaction. [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html), [INSERT / ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html), [PostgREST transactions](https://postgrest.org/en/stable/references/transactions.html).

**Alternatives considered**: Separate table inserts can leave an orphan tenant. Display-name reconciliation is invalid because names are editable/non-unique. Client UUID alone does not detect changed intent reuse. SERIALIZABLE isolation or a new distributed lock is unnecessary for a unique key in one short transaction.

## 4. Current session and membership authority

**Decision**: Creation/list/activation derive identity from the verified F010 token; creation additionally proves current session and enrolled device. Workspace listing and target checks read current active membership rows, never `user_metadata`, cached roles, or caller-supplied actor/workspace authority. Missing/foreign/revoked targets share one unavailable result.

**Rationale**: Supabase documents that authorization data in `user_metadata` is user-editable, JWT/app metadata may be stale until refresh, and a signed-out access token can otherwise remain valid until expiry. F010 already demonstrates an `auth.sessions` correlation for stricter current-session checks. Membership-table state is the live tenant authority. [Auth users](https://supabase.com/docs/guides/auth/users), [Auth sessions](https://supabase.com/docs/guides/auth/sessions), [RLS and JWT freshness](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Alternatives considered**: JWT workspace arrays or renderer-selected account IDs are stale/self-asserted. Direct authenticated workspace/membership inserts could allow self-granting authority in arbitrary tenants.

## 5. RLS, functions, grants, and 2026 Supabase changes

**Decision**: Keep exposed RPCs closed and intentional: `search_path=''`, fully qualified relations, explicit account checks, revoke `EXECUTE` from `PUBLIC`/`anon`, grant only `authenticated`, and return bounded DTOs. Keep private transaction functions/tables inaccessible to public client roles. Harden existing F008 helper function search paths/privileges before relying on them, use `(select auth.uid())`, explicit `TO authenticated`, and indexes led by membership policy columns. Bundle explicit table/function grants and revokes with the migration.

**Rationale**: Current Supabase guidance warns that `SECURITY DEFINER` functions bypass RLS, functions are executable by `PUBLIC` by default, and public-schema definer functions need explicit caller checks and privileges. RLS needs grants as well as policies; a `(workspace_id,user_id)` primary key does not index `user_id`-first chooser queries. Supabase's Data API change makes new public tables opt-in by default on 2026-10-30, so project defaults cannot be assumed. [Database functions](https://supabase.com/docs/guides/database/functions), [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API security](https://supabase.com/docs/guides/api/securing-your-api), [breaking-change index](https://supabase.com/changelog?types=breaking-change).

**Alternatives considered**: Copying F008's exposed `SECURITY DEFINER SET search_path=public` helpers would preserve avoidable search-path and privilege risk. Permissive direct table grants plus client filtering do not meet tenant isolation.

## 6. Truthful profile evolution

**Decision**: Extend the existing tenant row instead of adding a generic settings document. Add/backfill non-unique `display_name`, add closed `readiness_state` and `profile_version`, and allow `legal_name` to remain absent when the active approved policy does not have truthful legal data. Reuse timezone, one uppercase currency code, default locale, tenant status, and existing audit relation. A versioned server creation policy supplies approved choices; absent production policy disables creation. Synthetic verification uses only labeled `XTS`/`UTC`/English/Arabic values.

**Rationale**: The current schema has most F012 fields but conflates required `legal_name` with display identity and cannot represent setup incompleteness. A placeholder legal name would falsely claim readiness. Q-01/Q-03/Q-02 prohibit inventing markets, financial precision, or deployment support.

**Alternatives considered**: A JSON settings blob weakens validation and indexing. A separate profile table adds a one-to-one relation without current need. Hardcoding a market currency list would silently close open product decisions.

## 7. Canonical workspace identifier

**Decision**: All newly created production workspaces use bare lowercase UUIDv4, generated once inside the authoritative transaction. This is the F003 typed ID and F004 record-link form. F007's path validator already accepts it. Existing `ws_*` F008 fixture IDs remain legacy synthetic compatibility data, not a second production format.

**Rationale**: The repository currently mixes bare UUID contracts with `ws_*` examples. Choosing the stricter already implemented domain/deep-link contract prevents translation loss and keeps IDs independent of names, locales, and clocks.

**Alternatives considered**: Relaxing F003 IDs or introducing prefixed IDs would ripple through envelopes and deep links. Converting existing fixture IDs is unrelated migration risk.

## 8. One coordinator and monotonic selection generation

**Decision**: Add one per-profile main-process workspace coordinator under the existing identity owner. It serializes create/switch/restart, persists one sealed account/profile-bound selection record, increments generation before quiescing the source, validates target membership/protection, opens the target, and only then publishes current. Every action/result/event/deep link captures `{workspaceId, selectionGeneration}` and is rejected if stale.

**Rationale**: The main process already owns profile epoch, protection, persistence, and trusted callers. A generation makes delayed renderer/dialog/background work harmless without cancelling every promise. Persisting the bounded transition lets restart converge to a current source/target or locked chooser after a crash.

**Alternatives considered**: Mutating one shared `CloudGatewayClient.workspaceId` is unsafe because a delayed A call can read B's mutable value. Renderer-only selection cannot protect local files, subscriptions, or IPC. Two concurrently active contexts violate FR-014/FR-016.

## 9. Split local initialization from retained opening

**Decision**: Preserve `openWorkspaceStore()` compatibility for existing F007 callers, but add explicit coordinator paths: initialize only immediately after an authoritative create result; switch/restart uses open-retained-only and rejects `uninitialized`. Missing, locked, corrupt, future-schema, or wrong-binding state enters recovery/locked UI and never creates files.

**Rationale**: Current `openWorkspaceStore()` intentionally initializes a new namespace when absent. That is valid for trusted creation but violates A-14 for an arbitrary switch target. The distinction fixes the root cause without rewriting persistence.

**Alternatives considered**: Checking directory existence in the coordinator duplicates persistence trust logic and races. Always initializing would fabricate an empty tenant; never initializing would prevent a new authoritative workspace from obtaining local storage.

## 10. Offline and live-update boundary

**Decision**: Until Q-06/F016 supplies an approved authorization lease, offline selection is locked/online-required. F012 defines provider-neutral source subscription teardown and generation fencing but does not implement Supabase Realtime or F017 synchronization. Any later adapter may resubscribe only the current generation after authoritative refetch.

**Rationale**: F012 must stop existing/future source signals, but Realtime delivery mechanics belong to F017. Supabase private Broadcast authorization is cached for a connection and may continue after membership removal until token refresh/expiry; the 2026 Realtime schema is locked except for allowed policy management. These facts make a casual F012 channel implementation unsafe. [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [subscribing to changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [Realtime schema breaking change](https://supabase.com/changelog/realtime-schema-locked-down-against-modification).

**Alternatives considered**: Inventing a seven-day lease would close Q-06. Treating channel membership as fresh authority would violate FR-021. Building the sync engine early would expand F012 into F017–F020.

## 11. Pending edits and accessible presentation

**Decision**: Renderer owns a small in-memory before-leave registry because unsaved edits exist only there. It offers stay, discard, or eligible save-to-source, then invokes the trusted switch. Workspace-bound UI remounts by generation. Reuse house `Dialog`, `Button`, `BdiText`, localization, and shell focus/live-region patterns; identify duplicate names with a deterministic short opaque-ID discriminator.

**Rationale**: Main cannot inspect unsaved React state, while renderer cannot authorize a target. The split keeps user-data decisions close to the editor and security decisions in main. The existing UI components already supply the accessible primitives required by F012.

**Alternatives considered**: Autosaving before every switch can persist unwanted edits. Copying drafts to the target violates source ownership. A new form/state library is unnecessary.

## 12. Verification and rollback

**Decision**: Use focused F012 contract/service/switch/security/UI suites plus F003–F011 regressions. PostgreSQL tests must exercise real constraints/RLS/concurrency/rollback; Electron tests cover protected partitions, restart, stale events, focus, RTL, and deep links. Rollback disables entry points without deleting created cloud/local data or immutable evidence.

**Rationale**: Emulators can check pure logic but cannot prove PostgreSQL privileges, transaction rollback, or native protection. A destructive down migration would risk user data and violate Constitution VII/VIII.

**Alternatives considered**: Unit-only proof is insufficient. Dropping F012 tables/columns or local partitions on rollback would destroy or orphan valid work.
