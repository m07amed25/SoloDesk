# Implementation Plan: F004 — Secure Electron Lifecycle and Preload Bridge

**Branch**: main (current checkout; Spec Kit setup identity: 004-secure-electron-lifecycle; proposed future implementation branch: feat/f004-secure-electron-lifecycle-and-preload-bridge) | **Date**: 2026-10-18 | **Spec**: [F004 specification](spec.md)

**Input**: Feature specification from specs/004-secure-electron-lifecycle/spec.md

**Status**: Phase 0 research and Phase 1 design complete as documentation. This plan does not authorize implementation, a branch/PR, native QA, merge or release.

## Summary

F004 establishes one trusted Electron process with one logical owner per local profile, a narrow versioned preload surface, mandatory per-call sender/frame/origin/context checks, a bounded link parser and explicit window/shutdown behavior. The release renderer is served from a bundled-asset-only secure custom origin; development remains restricted to the known loopback origin. Production protected-record routes, external destinations, auth callbacks, tray/timer work and customer persistence remain disabled until their owning features and decisions are ready. The design extends the existing welcome shell and F002 verification harness, and consumes F003's bounds/error vocabulary without exposing its synthetic domain registry as generic IPC.

The design decisions and alternatives are in [research.md](research.md); state and validation rules are in [data-model.md](data-model.md); interface contracts are in [contracts/](contracts/); runnable validation is in [quickstart.md](quickstart.md). F004 requirements FR-001–FR-021 and scenarios A-01–A-23 are the acceptance source, not implementation claims.

## Technical Context

**Language/Version**: TypeScript 7.0.2 and Node 24 (engine >=24 <25), as declared in the current package manifest; Electron 44.8.0 embeds its own runtime. Version drift requires lockfile/runtime review before implementation.

**Primary Dependencies**: Existing Electron 44.8.0, Electron Forge/Vite plugin 8.0.1, Vite 8.3.4, React 19.3.1, F003 pure contracts/localization, and the existing Playwright Electron/F002 verification harness. No new package is required by this plan.

**Storage**: No customer-data schema or persistent F004 profile catalogue. App-owned profile registry and link/subscription state are in memory. Each profile view gets an in-memory isolated Electron session; no persistent Chromium partition or plaintext customer cache is introduced. Later F006/F007 own protected persistence.

**Testing**: Existing npm typecheck, lint, build, launcher, unit/integration, desktop, security and baseline commands. Planned focused F004 parser/handler/registry tests and built-Electron Playwright cases join the existing harness; actual Windows/macOS/Linux evidence must be recorded per target.

**Target Platform**: Windows, macOS and Linux desktop, with provisional hosted QA on Windows x64, macOS arm64 and Linux x64 plus documented Linux Snap launcher regression. Exact supported OS/CPU/package matrix remains Q-11.

**Project Type**: Electron desktop application with main, sandboxed preload and React renderer; no new web service.

**Performance Goals**: One owner in 100 concurrent launch trials per declared target; no duplicate processing. Focus/restore and link decisions should remain responsive under declared test hardware and measured p95; no unmeasured time guarantee is claimed. Link and bridge processing must be bounded before effects.

**Constraints**: Renderer has no Node/SQL/filesystem/shell/raw IPC/secret access. Main rejects unknown callers, payloads, navigation and external destinations by default. The release renderer cannot load remote executable content. Offline-safe local lifecycle only; no authoritative workspace action is inferred from a link. English/Arabic safe errors, keyboard access, redaction and actual native evidence apply.

**Scale/Scope**: One app-wide process owner; multiple independent local profile contexts/windows; a small closed initial action and route catalogue. No business records, persistent sync, encryption adapter, remote auth or installer is delivered by F004.

## Constitution Check

_GATE: checked before Phase 0 research and re-checked after Phase 1 design._

| Principle                    | Pre-research gate                                                                                     | Post-design disposition                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Scope and traceability    | PASS: user requested planning; F004/PLT-012/NFR-015 and open decisions identified.                    | PASS: only documentation artifacts and F004 root-card correction; no code or remote mutation. FR/A/SC mapping remains in spec and quickstart.                 |
| II. Desktop trust            | PASS with design obligation: current sandbox/isolation exists, but preload/ownership are absent.      | PASS as a plan: named bridge, app owner/profile registry, custom trusted origin and per-call caller checks; no generic execution. Runtime proof pending.      |
| III. Offline/cloud authority | PASS with boundary: F004 local lifecycle must not claim service authority or durable business writes. | PASS: protected links disabled without later current identity/lease/resource authority; no local receipt/financial claim.                                     |
| IV. Exact financial evidence | PASS: no money/timer math or issuance in scope.                                                       | PASS: no financial operation, rounding, posting or invoice route enabled.                                                                                     |
| V. Fail-closed security      | PASS with obligation: sender/origin/payload, URL and diagnostic threats identified.                   | PASS as a design: default-deny navigation/external catalogue, bounded admission, isolated nonpersistent sessions and redaction. No encryption claim.          |
| VI. Arabic and accessibility | PASS with obligation: focused bilingual errors and native keyboard behavior are applicable.           | PASS as a design: paired error mapping, mixed-direction display and keyboard/native QA; F005 owns complete shell. Fluent Arabic review remains evidence gate. |
| VII. Recoverable evolution   | PASS with boundary: no customer schema; interrupted later work cannot be fabricated as saved.         | PASS: explicit lifecycle states, versioned action/link contracts and no empty-state replacement. Future owners define durable recovery.                       |
| VIII. Evidence               | PASS with obligation: native and negative cases required; current F004 has no observed result.        | PASS as a plan: quickstart records actual target/build/fixture outcomes and blockers; owner approval/merge/release separate.                                  |

**Gate result**: No constitutional violation or unresolved technical clarification blocks this documentation plan. Implementation remains gated by authorized scope, actual merged F003 dependency/contract version, entry review, and the test/owner-approval rules. Q-04, Q-11, F010/F029 callback and later identity/encryption decisions remain explicit dependent-feature or release gates, not decisions made here.

## Project Structure

### Documentation (this feature)

```text
specs/004-secure-electron-lifecycle/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── desktop-bridge.md
│   ├── links-and-navigation.md
│   └── ownership-and-lifecycle.md
└── tasks.md                  # later speckit-tasks output; not created here
```

### Source Code (repository root; planned implementation layout)

```text
app/
├── main/
│   ├── main.ts               # composition/startup; exists
│   ├── profiles.ts           # app lock and per-profile owner registry; planned
│   ├── windows.ts            # isolated trusted windows and asset origin; planned
│   ├── bridge.ts             # registered handlers and current caller checks; planned
│   ├── links.ts              # ingress and route decisions; planned
│   └── lifecycle.ts          # drain, close, failure signals; planned
├── preload/
│   └── preload.ts            # narrow sandbox-compatible exposure; planned
├── shared/
│   └── desktop-contracts.ts  # pure F004 version/bounds/action/event/link shapes; planned
└── renderer/
    └── shell/App.tsx         # existing welcome shell; only focused safe failure UI if needed

forge.config.mjs            # existing; add preload build target
vite.main.config.mts        # existing; main bundle stays separate
vite.preload.config.mts     # planned preload bundle
vite.config.mts             # existing renderer CSP/bundle origin adjustments
playwright.config.mjs      # existing; enroll F004 desktop scenarios
tooling/verification/       # existing F002 runner/selection/evidence integration
tests/
├── f004/
│   ├── unit/                # pure link/action/profile state rules
│   └── integration/         # handler/context/authority/window doubles
└── verification/desktop/   # built Electron and native F004 security/lifecycle cases
```

**Structure Decision**: Retain the existing single desktop app layout and F003 pure packages. Keep F004's native composition in app/main, its exposure in app/preload and its closed pure shapes in app/shared. Do not move domain contracts into Electron or expose F003's fixture registry. Add tests to the existing verification family; do not create a parallel framework. Exact filenames may be refined when authorized tasks are generated, but boundaries and contract obligations remain.

## Design and Implementation Sequence

1. **Prerequisite and baseline gate**: Confirm F003's actual merged/approved contract version and current main/lockfile; review F002 runner enrollment and current shell protection. Do not erase existing working tree changes. Fix any baseline discrepancy before implementing F004.
2. **Pure contracts first**: Implement closed F004 action/event/link version 1 and bounded validation using F003 primitives where applicable. Accept only structured-cloned plain data; no generic operation names or tenant envelope for unauthenticated desktop actions. Write independent negative fixtures before native wiring.
3. **Process/profile ownership**: Acquire the app lock before creating windows or starting jobs. Register second-instance and macOS open-url listeners early. Parse only bounded activation intent, then route through an atomic per-profile registry. Keep profile A/B sessions/windows separate and never infer workspace access from profile identity.
4. **Trusted content and preload**: Add a bundled preload target with an absolute runtime path. Serve release assets under the internal secure origin with path containment and a restrictive CSP; allow only exact loopback development content. Preserve sandbox, context isolation, no Node integration, denied permissions, denied popups and navigation. Test actual dev/built behavior.
5. **Main handlers and events**: Register only reviewed F004 methods. Validate sender webContents, top-level frame, origin/document, current profile/authority epoch and closed payload before effects. Scope subscriptions to that context and dispose them on close/navigation/switch/revocation. Map errors to safe paired messages and redacted diagnostics.
6. **Links and external destinations**: Normalize one link-intent grammar across cold-start, second-instance and macOS ingress. Production F004 routes only to the shell home/activation; protected routes and auth callbacks are test-only or disabled until owning features. External opening requires a static approved purpose catalogue; never forward a page URL.
7. **Window/quit and recovery**: Preserve native platform conventions while making last-window, explicit Quit and process failure states explicit. Stop new work during drain, give synthetic work bounded completion/interruption outcomes and avoid any hidden timer/tray claim. Later owners attach durable checkpoints under their features.
8. **Verification and delivery documentation**: Extend F002 suites and built-Electron Playwright, run negative/race/restart/RTL tests, collect per-target native evidence, and write docs/features/F004.md plus docs/qa/F004.md with honest gaps. Repair findings in the same future F004 PR; user final approval remains required before merge.

## Interface, Data and Failure Summary

- [Desktop bridge contract](contracts/desktop-bridge.md) defines named methods, closed version/payload/result shapes, sender admission, event lifetime and safe errors.
- [Link/navigation contract](contracts/links-and-navigation.md) defines link grammar, route states, external destination catalogue and denial behavior.
- [Ownership/lifecycle contract](contracts/ownership-and-lifecycle.md) defines process/profile/window states, activation ordering, shutdown and interruption.
- [Data model](data-model.md) defines in-memory entities, relationships and transitions. It is not a customer database schema.
- Invalid, denied, stale, unsupported or unavailable outcomes fail before effect. A possible in-flight effect with unknown completion is never labelled not-applied without evidence. Native failures and missing target observations remain blockers, not inferred passes.

## Verification and Traceability

| Slice                         | FR            | Acceptance      | Planned evidence                                                                                 |
| ----------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| Ownership/profile isolation   | FR-001–FR-003 | A-01–A-04, A-18 | Concurrent real process launches, A/B contexts, crash/restart                                    |
| Named bridge/authority/events | FR-004–FR-010 | A-05–A-10, A-22 | Built-preload surface inspection, hostile caller/payload negatives, bilingual error/focus review |
| Links/navigation/asset origin | FR-011–FR-015 | A-11–A-15, A-21 | Cold/second/macOS ingress, traversal/URL negatives, custom asset protocol/CSP                    |
| Controls/shutdown             | FR-016–FR-019 | A-16–A-19       | Native window controls, keyboard, synthetic drain/interruption, protected-state failure          |
| Native evidence/approval      | FR-020–FR-021 | A-20–A-23       | F002 reports and per-target manual QA; exact build/OS/locale/defect/reviewer/date                |

Use [quickstart.md](quickstart.md) for candidate commands and expected outcomes. SC-001–SC-008 remain future acceptance targets; this plan runs no feature test. F004 does not close Q-04/Q-11 or certify F005/F006/F010/F029/F036.

## Rollout, Compatibility and Recovery

F004 is introduced behind its closed versioned bridge and disabled route/destination catalogues. No customer migration is planned. Keep old callers rejected with a safe upgrade path if later bridge versions change; supported call versions are explicit, not inferred. A security regression returns to the prior reviewed candidate without deleting profile data or reinterpreting pending intents; any future persisted-state incompatibility requires a forward repair designed by its owning feature. Product release still requires encryption, identity, team, localization, signed distribution and P09 gates.

## Complexity Tracking

No constitutional deviation is proposed. The separate internal asset protocol and per-profile session/registry add bounded complexity because the feature requires exact trusted origin and simultaneous profile isolation; [research.md](research.md) records the alternatives and proof obligations.
