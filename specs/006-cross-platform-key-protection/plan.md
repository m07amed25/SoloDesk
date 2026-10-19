# Implementation Plan: F006 — Cross-Platform Key Protection and Encryption Proof

**Branch**: `feat/f005-accessible-english-arabic-application-shell` (current checkout; Spec Kit setup identity: `006-cross-platform-key-protection`; proposed F006 implementation branch in the root plan is not created here) | **Date**: 2026-10-19 | **Spec**: [F006 specification](spec.md)

**Input**: Feature specification from `specs/006-cross-platform-key-protection/spec.md`

**Status**: Phase 0 research and Phase 1 design complete as documentation. No F006 code, package installation, native proof or approval was produced by this planning request.

## Summary

F006 will prove an encrypted local data path before F007 persists account/workspace information. The proof uses synthetic records and staged files, a main-process-only key boundary, fail-closed storage states, cross-profile isolation, interruption-safe key change and per-target packaged native evidence. A SQLCipher-compatible adapter and Electron OS key wrapping are the first candidates for evaluation, **not approved Q-07 selections**. Native Electron 44 compatibility, all temp surfaces, attachment protection, license and distribution, recovery limits and the Q-11 target matrix must be proved or explicitly blocked. [Research](research.md) records the basis and alternatives; [data model](data-model.md), [contracts](contracts/) and [quickstart](quickstart.md) define the design and validation.

## Technical Context

**Language/Version**: Existing TypeScript 7.0.2, Node >=24 <25, Electron 44.8.0 per current package manifest. Exact candidate native binding and crypto package versions are unselected under Q-07.

**Primary Dependencies**: Existing Electron Forge/Vite 8.0.1, F004 trusted main/preload boundary and F002 verification harness. SQLCipher-compatible SQLite and Electron `safeStorage` are evaluation candidates. No new package is approved or installed by this plan.

**Storage**: Synthetic encrypted SQLite-compatible database, protected staged attachment fixture and non-secret key-binding/rotation metadata in an isolated test profile. Installed plain `better-sqlite3` is not an encryption solution. F007 owns production cache/schema/outbox and migrations.

**Testing**: Existing `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:f004`, `npm run test:desktop` and F002 verification/evidence runner. Planned F006 focused unit, storage integration, built desktop and native target trials cover raw bytes, key errors, profile substitution, interruption and bilingual recovery.

**Target Platform**: Windows, macOS and Linux. Exact OS/CPU/desktop-session/package/signing matrix is Q-11; each proposed supported combination needs its own evidence.

**Project Type**: Single Electron desktop application, with trusted main process, sandboxed preload and unprivileged React renderer. No service API.

**Performance Goals**: Preserve the proposed local search/cached feedback budgets in [test strategy](../../docs/quality/test-strategy.md) without reducing protection. Measure open/read/write/search/rekey on declared hardware and representative synthetic volume; no unmeasured timing or capacity promise.

**Constraints**: No plaintext fallback, unprotected Linux `basic_text`, renderer key/path/SQL access, home-grown cryptography, empty replacement on read failure or unapproved recovery promise. Keys/fixtures must not enter logs, support artifacts or test evidence. Protected temp/attachment coverage and native licensing/ABI proof are required.

**Scale/Scope**: One synthetic account/profile pair plus a second identity for isolation; representative records/search terms and staged files; Windows/macOS/Linux proof matrix. No customer data, cloud identity, persisted business workflow, full F007 migration, backup/restore product feature or release claim.

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                    | Pre-research gate                                                                                           | Post-design disposition                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Scope and traceability    | PASS: user requested planning, F006/PLT-007/NFR-005 and open Q-07/Q-11 identified.                          | PASS: documentation only; spec FR/A/SC IDs map to proof and contracts. No implementation authority inferred.                                                                   |
| II. Desktop trust            | PASS with obligation: renderer must remain unprivileged under F004.                                         | PASS as design: main-only protection owner, closed status surface, no generic key/path/SQL bridge. Runtime proof pending.                                                      |
| III. Offline/cloud authority | PASS with boundary: this is a synthetic local proof, not device authorization or server acceptance.         | PASS: no offline lease, cloud action or sync state asserted; F007/F016 retain their ownership.                                                                                 |
| IV. Financial evidence       | PASS: no financial data or issuance in scope.                                                               | PASS: synthetic fixture only; no money, invoice or authority transition introduced.                                                                                            |
| V. Fail-closed security      | PASS with obligation: installed adapter is plaintext; Linux downgrade and file surfaces are material risks. | PASS as design: deny unsafe key states, inventory all files, separate staged-file protection, negative proof and target-specific gate. Q-07 approval and test results pending. |
| VI. Arabic/accessibility     | PASS with obligation: recovery states need equivalent English/Arabic action and keyboard access.            | PASS as design: bounded safe state vocabulary and bilingual manual review; fluent review and usability results pending.                                                        |
| VII. Recoverable evolution   | PASS with obligation: lost key and interrupted change cannot fabricate recovery.                            | PASS as design: two-version proof, validate before selector switch, keep previous decryptable state; F007 migration and F025/F026 restore remain separate.                     |
| VIII. Evidence               | PASS with obligation: native packaged, negative, restart and license evidence required.                     | PASS as design: per-target proof record, exact build/environment/fixture/results/reviewer, failed target remains blocked. No passes asserted.                                  |

**Gate result**: No constitutional violation blocks this documentation plan. Q-07/Q-11 are explicit decisions and implementation/evidence gates, not technical placeholders silently resolved by research. F004 baseline and current code must be rechecked at implementation entry. F007 cannot consume an unapproved or unproved path.

## Project Structure

### Documentation (this feature)

```text
specs/006-cross-platform-key-protection/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── protection-boundary.md
│   ├── key-lifecycle.md
│   └── native-proof.md
└── tasks.md                       # later speckit-tasks output; not created here
```

### Source Code (repository root; proposed implementation layout)

```text
app/
├── main/
│   ├── main.ts                    # existing F004 composition; future protected owner wiring
│   ├── bridge.ts                  # existing F004 checked caller boundary; closed status extension only
│   └── protection/               # planned native adapter, key binding, file protection and rotation
├── preload/preload.ts            # existing narrow facade; planned safe status/action addition if needed
├── shared/                       # planned closed protection-state/result types
└── renderer/shell/               # planned bilingual locked/recovery-required presentation only
tooling/f006/                    # planned focused verifier and fixture setup
tests/f006/                      # planned pure and storage integration cases
tests/verification/desktop/      # existing native/built Electron harness; planned F006 cases
tooling/verification/            # existing evidence pipeline; planned F006 enrollment
forge.config.mjs                 # existing native rebuild/package configuration; evaluate if candidate needs change
```

**Structure Decision**: Keep one desktop app and reuse F004's trusted main boundary and F002's evidence pipeline. Put native keys/database/files behind one protection owner in main; expose only a closed, safe status and recovery action where UI needs it. The concrete binding/layout can change after Q-07 selection without changing the contract invariants.

## Design and Implementation Sequence

1. **Entry and decision gate**: Confirm F004 state on the implementation base, current lockfile, Q-07 evaluation criteria and Q-11 test matrix/access. Record component license and distribution obligations. Unresolved approval leaves the candidate in proof-only mode; no business persistence.
2. **Threat/file inventory**: List all application-controlled database, index, journal, temp, attachment, staging, rotation and crash-residue paths and the expected protection for each. Use distinctive synthetic markers and key-free raw inspection. Treat missing evidence as failure.
3. **Native adapter candidate**: Prove encrypted open/write/search/close/reopen on actual Electron ABI and packaged target builds. Show wrong-key/corrupt/header cases fail before write. Prevent or protect file-based temp output; confirm indexes and auxiliary files by inspection. Do not replace the app's plain adapter by assumption.
4. **Key binding**: Generate separate data keys for isolated synthetic identities. Wrap through an approved OS/user unlock path; reject Linux `basic_text`, locked/missing/denied backends and key substitution. Prevent key/path/SQL access from renderer and logs. Establish the actual protection boundary, including same-OS-user limits.
5. **Staged file protection**: Use a reviewed authenticated file format and separate identity binding for synthetic attachment bytes. Handle partial writes without plaintext residue. F023 later owns real attachment lifecycle and cloud references.
6. **Lock/recovery states**: On unavailable protection, preserve existing bytes and display safe English/Arabic locked/recovery-required guidance. Never create an empty replacement; distinguish cloud-refetchable data from unsynced local-only loss without implementing F010/F025 recovery.
7. **Interruption-safe key change**: Stage a new complete version, verify its database and files, commit the selector, then retire the old key. Fault-inject before/after every durable transition and on low space/denied access; show either old or new complete state on restart and old-key rejection after success.
8. **Evidence and handoff**: Run focused and native suites on every Q-11 target, capture exact build/ABI/OS/CPU/session/signing, fixture, path inventory, redacted outcomes, license review, defects and reviewers. Update F006 feature/QA docs and F007 entry contract only after Q-07 approval and observed pass. User final approval/merge/release remain separate gates in the root plan.

## Interface, Data and Failure Summary

- [Protection boundary](contracts/protection-boundary.md) specifies main-only operations, caller admission and raw-file invariants.
- [Key lifecycle](contracts/key-lifecycle.md) defines lock/unlock, identity binding, rotation and recovery outcomes.
- [Native proof](contracts/native-proof.md) defines test records, pass/fail/block rules and downstream F007 handoff.
- [Data model](data-model.md) describes proof-only metadata and states; it is not a production customer schema.
- Denied/unavailable/corrupt outcomes preserve prior bytes. An uncertain in-flight change is explicitly `recovery_required`, never labelled discarded or complete without validation.

## Verification and Traceability

| Slice                      | FR                            | Acceptance      | Planned evidence                                                                             |
| -------------------------- | ----------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| Database and file surfaces | FR-001–FR-003                 | A-01–A-04       | Packaged native round-trip, search, raw-byte inventory and abrupt-exit inspection            |
| Unsafe states and UI       | FR-004–FR-006, FR-008, FR-011 | A-05–A-08, A-10 | Locked/missing/denied/`basic_text` negatives, no byte change, English/Arabic keyboard review |
| Identity and key change    | FR-007, FR-009–FR-010         | A-09, A-11–A-14 | A/B substitution, restart, every rotation fail point, honest key-loss guidance               |
| Native approval            | FR-012–FR-013                 | A-15–A-17       | Per-target build/environment/ABI/license/defect/reviewer evidence and Q-07/Q-11 disposition  |

The seven success criteria SC-001–SC-007 are future acceptance targets. See [quickstart](quickstart.md) for commands and expected outcomes. This plan runs no F006 feature test.

## Rollout, Compatibility and Recovery

Keep the protection proof isolated from customer data. F007 may adopt only an approved versioned protection contract with recorded target coverage and an explicit migration/upgrade path. An unsupported format or unavailable key opens a locked/recovery-required state; it never creates a new empty data set. Preserve the prior decryptable version through interrupted key change. If a candidate fails licensing, native build or protection checks, retain the current shell without protected persistence and evaluate another candidate under the same contracts. No production local data conversion is authorized by this plan.

## Complexity Tracking

No constitutional exception is proposed. The separate file protection and two-version rotation proof are necessary because database encryption alone does not cover staged attachments or guarantee crash-safe key metadata changes. They remain small synthetic proof components until Q-07 review.
