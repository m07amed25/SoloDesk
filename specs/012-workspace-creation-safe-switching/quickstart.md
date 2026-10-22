# Quickstart Validation Guide: F012 — Workspace Creation and Safe Switching

This is the implementation-time validation/run guide. It does not claim that F012 exists or that any command below currently passes.

## 1. Prerequisites

Before running F012 acceptance:

- use Node.js 24 and the committed npm lockfile;
- have F003–F011 dependencies built and their required local checks available;
- run an isolated local Supabase/PostgreSQL stack with the F012 migration applied;
- use synthetic accounts, enrolled devices, two or more synthetic workspaces, and no customer data;
- inject an explicitly labeled synthetic creation policy (`XTS`, `UTC`, `en`, `ar`); never treat it as a production market policy;
- keep Q-06 offline lease disabled so offline selection is expected to lock/require online;
- use a test user-data directory and test OS-secret-store/key provider;
- record build/commit, schema/policy/protocol versions, OS/CPU, expected versus observed result, redacted artifacts, and defects; and
- do not report hosted/native/release readiness from an emulator or source inspection.

Authoritative behavior is in [the command contract](contracts/authoritative-workspace-commands.md), [the local-context contract](contracts/local-workspace-context.md), and [the data model](data-model.md).

## 2. Planned focused commands

```bash
npm run test:f012
npm run test:f012:contracts
npm run test:f012:service
npm run test:f012:switching
npm run test:f012:security
npm run test:f012:ui
```

Expected: the aggregate uses a fixed verification manifest and fails when a required suite, file, or evidence fixture is absent. Focused commands select registered suites rather than maintaining independent drifting file lists.

## 3. Contract and identifier suite

Run `npm run test:f012:contracts` and cover:

- exact method/request/response/state/reason/action allowlists and max/max+1 bounds;
- bare lowercase UUIDv4 for all newly created workspaces and deep links;
- legacy `ws_*` fixture IDs accepted only by explicit compatibility paths, never by new production creation;
- unknown keys, nested objects, malformed Unicode/control characters, overlong encoded inputs, unsafe diagnostics, and raw errors;
- creation digest equality and semantic changes to profile/policy/device fields;
- F010 identity contracts still reject workspace authority fields; and
- renderer DTOs contain no token, subject, path, key, queued payload, customer content, or hidden tenant data.

Expected: closed validation rejects malformed/unknown values; locale/display changes do not alter canonical IDs or digests.

## 4. Authoritative creation and reconciliation

Run `npm run test:f012:service` against real local PostgreSQL/Supabase.

### Successful and duplicate creation

1. Enroll a verified account/device.
2. Submit a valid English profile; repeat with Arabic and mixed-direction/emoji/combining-mark names.
3. Submit two concurrent identical requests with the same intent ID.
4. Retry after simulating a lost HTTP response.

Expected: exactly one workspace UUID, one active Owner membership, one committed intent/result, and one redacted `workspace_created` event. Every identical retry returns the same IDs. Display name is not used for reconciliation.

### Changed intent and rollback

1. Reuse the same intent ID with a changed profile/policy/device field.
2. Inject failures after intent claim, workspace insert, membership insert, and audit insert.
3. Try direct inserts as `anon` and `authenticated`; try direct execute on private functions/tables.

Expected: changed intent rejects; every failpoint rolls back all partial effects; direct mutation/private execution is denied.

### Current authority

Exercise expired/anonymous/wrong-issuer/wrong-audience access, removed `auth.sessions` row, wrong-account enrollment, unenrolled device, and authority loss between form load and submit.

Expected: no workspace effect. The service derives actor/session/device and never trusts renderer fields.

### Truthful options and input

Exercise absent/disabled/stale policy; removed currency; unsupported timezone; wrong locale; blank/max/max+1/control-character names; Arabic/Latin/emoji/combining marks; optional versus required legal/trade fields.

Expected: exact field issues and safe correction actions; valid non-secret input remains in the renderer; no false legal, tax, finance, team, or issuance readiness. Successful creation starts `setup_incomplete`.

## 5. Membership chooser and tenant privacy

Use accounts with member/non-member/revoked/suspended memberships and duplicate workspace display names.

Verify:

- list returns only current active selectable memberships and safe summary fields;
- target check is repeated after selection, not inferred from the earlier list;
- removing membership between list and activation returns generic unavailable;
- guessed/missing/foreign/revoked/closed IDs have indistinguishable public outcomes;
- no hidden name, existence, count, record, audit, file, search, notification, or status leaks;
- duplicate names have stable safe discriminators and are never confused; and
- RLS query plans use the account/status-leading membership index.

Also run Supabase security/performance advisors and the SQL/pgTAP privilege matrix. Expected: no direct workspace or membership self-grant path and no advisor finding left untriaged.

## 6. Pending edits and durable source work

Run `npm run test:f012:switching` with A current and B selectable. Register one dirty source editor and seed A with saved-local, queued, conflicted, staged, rejected, and outcome-unknown synthetic work.

Exercise:

1. choose B then `stay`;
2. choose B then `discard`;
3. choose B then eligible `save to A`;
4. inject a source save failure; and
5. switch with no unsaved memory but all durable statuses present.

Expected: stay leaves A untouched; discard affects only the chosen in-memory edit; save commits only to A before switching; failed save stays in A; durable items remain recoverable in A and do not appear in B. No item is relabeled, copied, deleted, or submitted as B.

## 7. Atomic switch and generation fencing

At every step—generation advance, source event detach, source close/checkpoint, target authority check, target open, selection-record write, and target publish—inject interruption, exception, process close, and lost reply.

Also deliver after the switch:

- an A dialog confirmation;
- delayed A service/persistence results;
- an A background callback/event;
- an A deep link/notification action;
- two windows requesting different targets; and
- a superseded switch completion.

Expected: B is never published before its checks pass; exactly one generation/context is interactive; stale A work has zero effect on B and cannot silently reactivate A. Failure returns to a freshly authorized/readable A or locked chooser. Restart after a crash converges to one context, never a composite.

## 8. Local partition and restart matrix

Cover:

- a just-created workspace initialized with its authoritative receipt;
- retained A and B partitions with distinct synthetic data/outbox/notices;
- an authorized but never-retained target;
- missing envelope/key/manifest/database;
- locked secret store;
- corrupt manifest/database;
- unsupported future local schema;
- wrong profile/account/workspace binding;
- restart online and offline; and
- remembered selection from another account/profile.

Expected: only explicit post-create initialization creates a namespace. Switching/restart uses retained-only open and never creates an empty substitute. Wrong/missing/unreadable/incompatible state locks with safe recovery. No partition borrows another profile/workspace key or data.

## 9. Revocation and connectivity

1. Open A online, then remove/suspend its membership.
2. Attempt new reads, local-to-service submissions, delayed commands, and event delivery.
3. Disconnect before selecting B with no approved offline lease.
4. Reconnect and refresh selectable workspaces.

Expected: once current authority reports removal, generation advances and new A access/submission/events stop; recoverable A work remains A-owned and hidden from B. Offline selection is `online_required`/locked, not unlimited access. Reconnection uses current membership and does not resurrect cached roles.

F012 uses provider-neutral fake subscriptions only to prove teardown/generation behavior. Actual Supabase Realtime/sync/reconnect acceptance belongs to F017 and is not claimed here.

## 10. Deep links and consequential actions

With two authorized workspaces sharing a display name:

- open current-workspace and other-workspace deep links;
- try malformed/guessed/foreign IDs;
- switch during a pending link action;
- confirm a representative business/share/export/admin action; and
- inspect switcher, breadcrumb/header, dialog, search/recent/notification placeholders.

Expected: current and target workspace identity is explicit with discriminator; another workspace requires explicit safe switching; guessed/foreign targets disclose nothing; every captured action checks workspace+generation; no non-current counts/signals appear.

## 11. English, Arabic and accessibility

Run `npm run test:f012:ui` and packaged/native observations in both languages for creation, validation, duplicate names, pending work, successful/failed switch, locked protection, online-required, unknown creation result, and recovery.

Check:

- localization key/parameter parity and no raw provider/database wording;
- real Arabic plus mixed Arabic/Latin/emoji/combining names;
- logical RTL layout and bidi isolation for names, currency, UUID discriminator, and diagnostics;
- keyboard-only create/switch/prompt/recovery paths;
- visible focus, dialog trap/restore, target heading focus, and restrained live announcements;
- semantic names/roles/states, non-color status, contrast, reduced motion, and 200% zoom/reflow; and
- duplicate-name choice and consequence understanding.

Expected: no blocking English/Arabic, RTL/bidi, keyboard, screen-reader, focus, contrast, or zoom defect. Record fluent Arabic and NVDA/VoiceOver/Linux assistive-technology observations separately from automated results.

## 12. Usability outcomes

After functional/accessibility gates pass, run the approved study protocol separately in English and Arabic:

- SC-008: at least 90% create within three minutes, excluding service outage time;
- SC-009: at least 95% switch and resolve one unsaved edit within 30 seconds; and
- SC-010: at least 95% choose and confirm the intended duplicate-name workspace.

Record participants, environment, timing method, exclusions, and observed result. Automated test duration is not usability evidence.

## 13. Regression and build

```bash
npm run test:f003
npm run test:f004
npm run test:unit
npm run test:f006
npm run test:f007
npm run test:f008
npm run test:f009
npm run test:f010
npm run test:f011
npm run test:f012
npm run typecheck
npm run lint
npm run build
npm run check:security
npm run check:docs
npm run test:desktop
```

Expected: F012 does not weaken F003 IDs/digests, F004 caller/link admission, F005 shell accessibility/RTL, F006 protection, F007 atomic/no-empty-replacement guarantees, F008 isolation/RLS, F009 receipts/evidence, or F010/F011 identity/session/security boundaries.

## 14. Rollout and rollback drill

1. Migrate an existing F008 dataset and verify `display_name` backfill, nullable truthful legal field, unchanged IDs/relationships, current policies, and old-row readability.
2. Start with no production creation policy: creation must be disabled with safe guidance.
3. Enable an approved test policy and complete create/switch/restart.
4. Disable F012 UI/RPC access as rollback without dropping schema or deleting cloud/local data.
5. Re-enable and reconcile the original intent/selection.

Expected: downgrade/disablement preserves workspaces, Owner memberships, immutable evidence, creation intents/results, and encrypted local partitions. No rollback deletes or silently reassigns work.

## 15. Evidence report

For each layer, record:

- requirement/scenario/SC IDs;
- build/commit and schema/protocol/policy versions;
- exact command or manual journey;
- platform/database/provider/test fixture;
- expected and observed result;
- redacted artifact location;
- defects and disposition; and
- reviewer/date.

Keep local synthetic, hosted sandbox, packaged native, usability, owner approval, merge, and release evidence separate. A green local suite is not a release claim.
