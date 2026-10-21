# Implementation Plan: F010 — Browser Sign-in and Native Enrollment

**Branch**: `010-browser-sign-in-enrollment` (Spec Kit identity; proposed delivery branch: `feat/f010-browser-sign-in-and-native-enrollment`) | **Date**: 2026-10-20 | **Spec**: [F010 feature specification](spec.md)

**Input**: Feature specification from `specs/010-browser-sign-in-enrollment/spec.md`

**Status**: Phase 0 research and Phase 1 design complete as documentation. This plan does not implement F010, provision an identity provider, enable public registration, register a packaged callback, deploy a hosted surface, or claim native acceptance.

## Summary

F010 establishes a verified cloud account and one protected native device/profile binding without granting workspace membership, offline authority, or business-data access. The desktop main process creates a profile-generation-bound authorization-code/PKCE attempt, opens one allowlisted hosted sign-in purpose in the system browser, admits only a bounded inert return, validates/exchanges it at a trusted identity boundary, and coordinates an idempotent account-scoped enrollment with protected local session/profile commit. The renderer receives only closed status, safe display fields, localized errors, and named actions.

The smallest complete design extends the existing F004 single-instance/link/IPC boundary, F006/F007 protection and no-empty-replacement behavior, and F009 idempotency/receipt pattern. It adds no auth library: the installed `@supabase/supabase-js` client is the first adapter candidate, but implementation must keep its PKCE verifier and session storage in a main-only protected adapter and prove its issuer/audience/state behavior. Production sign-in methods, hosted region, exact callback transport, and packaged registration remain Q-08, Q-02, and F029 gates.

## Technical Context

**Language/Version**: TypeScript 7.0.2; Node.js >=24 <25; Electron 44.8.0; PostgreSQL/Supabase schema and TypeScript Edge Functions where server authority is required.

**Primary Dependencies**: Existing Electron/Forge/Vite, React 19.3.1, `@supabase/supabase-js` 2.118.0, F003 contract/error primitives, F004 desktop caller and activation boundary, F006 key protection, F007 encrypted persistence, and F009 authoritative receipt/reconciliation pattern. No new dependency is selected or installed by this plan.

**Storage**: A protected, main-process-only local identity profile containing attempt/session/profile metadata and opaque credential references; Supabase Auth for verified account/session authority; PostgreSQL account-scoped enrollment intent, device enrollment, receipt, and redacted evidence records. Workspace databases are not created or opened by authentication alone.

**Testing**: Existing Node test coordinators and Playwright Electron harness; planned `tooling/f010/verify.mjs`, `tests/f010/{unit,integration,service,ui}`, local Supabase/PostgreSQL transactional tests, secret-surface scans, and Windows/macOS/Linux native callback/restart/account-switch acceptance. English/Arabic accessibility and first-use timing require manual evidence in addition to automation.

**Target Platform**: Electron desktop on Windows, macOS, and Linux plus one separately hosted bilingual sign-in surface and managed identity/backend authority. F029 owns final installer/protocol registration and signing proof.

**Project Type**: Cross-platform desktop application with a small hosted authentication surface and managed backend.

**Performance Goals**: Meet SC-006 (at least 90% of first-time participants complete in under three minutes, excluding provider wait) and SC-009 (matching protected profile restored within 10 seconds in at least 95% of reference runs). Security and correctness targets are 100% rejection/no-effect for invalid returns, one enrollment effect under retries, and zero secret leakage per SC-001–SC-005 and SC-008.

**Constraints**: System browser only; authorization code with PKCE S256 and attempt-specific state/nonce; no embedded client secret; exact allowlisted return purpose; callback is inert data; main-only token/verifier handling; fail closed on protection or profile mismatch; account-scoped enrollment before any workspace exists; no empty replacement, cross-account inference, or false success; English/Arabic, RTL, keyboard, focus, screen-reader, zoom, and non-color status parity.

**Scale/Scope**: One active sign-in attempt per local profile generation, one verified account binding per immutable local profile, one idempotent first-device enrollment intent/result, and one configured sandbox sign-in method for validation. Workspace onboarding, MFA/recovery, later device administration, offline leases, sync, and business commands are excluded.

**Open release gates (not technical placeholders)**: Q-08 must approve production methods, registration/MFA/recovery policy and callback choice; Q-02 must approve hosted region/cost/limits; Q-07/F006 must approve the protected credential path; F029 must prove packaged callback registration on each supported target. The plan resolves the logical design while leaving those product/deployment decisions explicit.

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                                 | Pre-research gate                                                                                                                                       | Post-design disposition                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Authorized scope and traceability**  | **PASS**: User requested planning only; PLT-001/PLT-002 and FR-001–FR-025 are the authority.                                                            | **PASS**: Only feature documentation was added. Requirements map to contracts and validation scenarios; Q-02/Q-07/Q-08/F029 remain explicit gates.                                                 |
| **II. Desktop trust boundaries**          | **PASS with obligation**: Credentials/tokens cannot enter renderer, generic IPC, or arbitrary external navigation.                                      | **PASS as design**: Main owns attempts, session adapter, external launch, callback parsing, and enrollment; preload exposes named safe DTOs/actions only.                                          |
| **III. Offline work and cloud authority** | **PASS with boundary**: Initial identity/enrollment is online and must not invent tenant or offline authority.                                          | **PASS as design**: Result is an enrolled account profile awaiting F012; no workspace DB, membership, lease, or sync is created.                                                                   |
| **IV. Exact financial evidence**          | **PASS**: No money, issuance, allocation, or financial state is in scope.                                                                               | **PASS**: Contracts expose no business command or financial authority.                                                                                                                             |
| **V. Fail-closed security**               | **PASS with obligation**: PKCE/state, issuer/audience validation, secret isolation, protected persistence, replay defense, and redaction are mandatory. | **PASS as design**: Invalid/late/cross-profile returns have no effect; readiness requires authoritative enrollment and protected local commit; secrets are excluded from public/evidence surfaces. |
| **VI. English, Arabic and accessibility** | **PASS with obligation**: Hosted/native success and recovery need equivalent accessible behavior.                                                       | **PASS as design**: Closed state/error/action keys, bidi isolation, focus/announcement rules, and separate manual fluent-Arabic/native-AT evidence are specified.                                  |
| **VII. Recoverable evolution**            | **PASS with obligation**: Restart, unknown enrollment outcome, unreadable profile, and schema mismatch cannot fabricate an empty profile.               | **PASS as design**: Protected attempt/session/profile records are versioned; unknown/partial states remain locked and reconcile without replacement.                                               |
| **VIII. Evidence before completion**      | **PASS with obligation**: Native callback, provider, transaction, redaction, isolation, accessibility, and timing evidence are required.                | **PASS as design**: Quickstart separates local, hosted sandbox, and three-target packaged evidence; no implementation pass is asserted.                                                            |

**Gate Result**: The documentation design passes all constitutional gates. Implementation/release remain blocked until prerequisite features and named Q/F029 decisions have actual evidence. No constitutional exception is proposed.

## Project Structure

### Documentation (this feature)

```text
specs/010-browser-sign-in-enrollment/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── browser-handoff-and-callback.md
    ├── trusted-identity-and-session.md
    ├── device-enrollment-and-reconciliation.md
    ├── native-profile-and-renderer-boundary.md
    └── security-evidence-localization-and-errors.md
```

### Source Code Layout (proposed implementation; not created by this plan)

```text
app/
├── main/
│   ├── identity/
│   │   ├── auth-attempts.ts       # PKCE/state attempt lifecycle and callback consumption
│   │   ├── session-owner.ts       # main-only provider client and protected session lifecycle
│   │   └── enrollment.ts          # account-scoped enrollment/reconciliation coordinator
│   ├── links.ts                   # separate inert auth-return parser
│   ├── bridge.ts                  # named identity methods/events using existing caller admission
│   └── main.ts                    # per-profile composition and teardown ordering
├── preload/preload.ts             # renderer-safe identity facade only
├── shared/identity-contracts.ts   # closed v1 commands, DTOs, validators and safe states
└── renderer/shell/SignInEnrollmentView.tsx
packages/localization/src/shell/{en,ar}.ts
web/auth/                          # smallest separately built bilingual hosted surface
supabase/
├── migrations/<timestamp>_device_enrollment.sql
└── functions/command-gateway/     # pre-workspace enrollment handler
tooling/f010/verify.mjs
tests/f010/{unit,integration,service,ui}/
tests/verification/desktop/f010-*.spec.mjs
```

**Structure Decision**: Reuse existing composition roots and verification patterns. Do not create a generic auth gateway, renderer Supabase client, second domain framework, workspace placeholder, or new encryption scheme. The pre-workspace enrollment handler may share the existing command-gateway deployment and F009 transaction conventions, but it requires a distinct verified-account context and account-scoped uniqueness; F009's workspace-scoped claim cannot be reused by inventing a workspace.

## Design and Implementation Sequence

1. **Entry gates and exact configuration**: Confirm prerequisite feature states, selected sandbox identity method, approved issuer/audience, hosted origin, callback transport and exact destination, attempt/bounds policy, and protected credential adapter. Keep public registration and unproved email delivery disabled.
2. **Closed identity contracts**: Add versioned validators for renderer commands, safe state/events, attempt metadata, provider result mapping, enrollment intent/result, and errors. Reuse F003 IDs/bounds/PublicError; omit every secret/raw callback field.
3. **Main-owned attempt and browser handoff**: Generate PKCE S256 verifier/challenge plus independent unpredictable state and OIDC nonce, bind them to profile generation/audience/destination, retain protected restart material only for the bounded lifetime, and open only the configured HTTPS hosted purpose through main. A new attempt supersedes the old one atomically.
4. **Inert callback admission**: Extend F004 activation handling with a separate exact auth-return grammar before ordinary routing. Apply raw byte/character/field/duplicate/fragment/nested-destination bounds, then compare-and-set consume once against the live attempt. Cold start, second instance, and macOS `open-url` use the same parser and profile-generation check.
5. **Trusted exchange and session owner**: Exchange the code only from main/trusted service using the protected verifier; validate configured issuer, audience/client, expiry, one-time result, response issuer where supported, nonce, and verified `(issuer, subject)` account identity. Store refresh/session material only through the approved protected adapter; expose safe account fields and status to renderer.
6. **Account-scoped enrollment transaction**: Derive account from the verified session, generate one enrollment intent/operation ID and request digest, verify protection/app/device context, and commit one device enrollment plus immutable receipt/redacted evidence. Identical retries converge; changed intent is rejected; unknown outcome reconciles before replacement.
7. **Atomic local readiness**: Stage protected session and immutable profile/account binding, reconcile the authoritative device result, then transition to `enrolled` only when every prerequisite is committed for the current generation. Any failure stays locked/protection-unavailable/recovery-required and preserves prior encrypted data.
8. **Sign-out and account switch**: Invalidate generation first, cancel attempts, stop subscriptions/requests, close workspace persistence if any, zero/lock keys and sessions, close account-bound views, then select or create a separate profile after the new account is verified. Retained unsynchronized encrypted work is never erased or reassigned silently.
9. **Hosted/native accessible presentation**: Implement only the states/actions in the contracts, with English/Arabic parity, logical RTL, bidi isolation, keyboard paths, focus restoration, live announcements, zoom/reflow, and provider-controlled limitations stated truthfully.
10. **Verification and evidence**: Enroll F010 suites in the F002 fixed manifest; run focused unit/service/integration/UI checks, regression suites F003–F009, build/type/lint/security/docs checks, real hosted sandbox sign-in, and target-specific native callback/restart/account-switch trials. Record blockers rather than weakening validation.

## Interface, Data and Failure Summary

- [Browser handoff and callback](contracts/browser-handoff-and-callback.md) defines system-browser launch, exact inert native return grammar, profile/generation binding, cancellation/supersession, and one-time consumption.
- [Trusted identity and session](contracts/trusted-identity-and-session.md) defines trusted exchange, verified-account projection, protected session handling, restart validation, and sign-out without workspace authority.
- [Device enrollment and reconciliation](contracts/device-enrollment-and-reconciliation.md) defines account-scoped intent idempotency, authoritative result/receipt, outcome-unknown reconciliation, and the atomic local-readiness fence.
- [Native profile and renderer boundary](contracts/native-profile-and-renderer-boundary.md) defines named IPC/preload operations, safe DTOs, isolation, and teardown ordering.
- [Security evidence, localization and errors](contracts/security-evidence-localization-and-errors.md) defines redaction, safe diagnostics, abuse behavior, next actions, and English/Arabic/accessibility semantics.
- [Data model](data-model.md) defines the seven logical entities and state transitions. It is a design contract, not a committed migration.

## Verification and Traceability

| Slice                                      | Requirements           | Acceptance                   | Planned evidence                                                                                                |
| ------------------------------------------ | ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Browser handoff and one-use return         | FR-001–FR-007, FR-023  | A-01–A-05, A-11, A-13        | Parser/property negatives, replay/concurrency, cold/second-instance/native delivery, external-launch allowlist  |
| Verified identity without tenant authority | FR-005, FR-008, FR-009 | A-02, A-04, A-12             | Issuer/audience/expiry/account checks, provider/network/cancel mapping, zero workspace/cache creation           |
| Protected first-device enrollment          | FR-010–FR-015, FR-021  | A-06–A-10, A-14              | Real PostgreSQL transaction/idempotency/failpoints, protected-write faults, restart reconciliation              |
| Restart, sign-out and account isolation    | FR-015–FR-020, FR-025  | A-10, A-15–A-19              | A/B profile raw/logical isolation, generation races, secret invalidation, retained-work guidance                |
| Evidence, bounds and abuse safety          | FR-022–FR-023          | A-03, A-05, A-06, A-09, A-13 | Secret scanners, log/support fixtures, rate/bounds tests, non-enumerating errors                                |
| English/Arabic and accessibility           | FR-024                 | A-20–A-22                    | Localization parity, RTL/bidi, keyboard/focus/live region/zoom/contrast automation plus fluent/native-AT review |

Focused commands planned for implementation:

```bash
npm run test:f010
npm run test:f010:attempts
npm run test:f010:enrollment
npm run test:f010:isolation
npm run test:f010:recovery
npm run test:f010:ui
npm run test:f003 && npm run test:f004 && npm run test:f006 && npm run test:f007
npm run test:f008 && npm run test:f009
npm run typecheck && npm run lint && npm run build
npm run check:security && npm run check:docs && npm run test:desktop
```

These are future validation commands, not results. Service acceptance must use real local PostgreSQL/Supabase transactions rather than only in-memory doubles; Windows/macOS/Linux packaged results remain distinct evidence.

## Rollout, Compatibility and Recovery

Use only synthetic/pre-provisioned sandbox identities until Q-08 and SMTP/domain/abuse/support readiness are approved. Version attempt, profile, session-binding, enrollment, and evidence records. A client encountering an unsupported version preserves protected bytes and enters upgrade/recovery guidance. Do not migrate or relabel an existing account profile; verified account mismatch selects a separate profile. Rollback disables the F010 entry point and hosted method while retaining encrypted profiles and server enrollment evidence; it never deletes local work or device rows to simulate reversal.

Provider/session failures map to closed safe outcomes. If service acceptance may have occurred, keep the original enrollment intent and reconcile it; do not generate a replacement device identity. If protected local commit fails after service acceptance, remain locked until the same authoritative result can be committed or explicitly recovered. Callback transport failure remains an F029/platform block, not permission to accept a broader URI.

## Complexity Tracking

| Necessary complexity                                                   | Why the simpler alternative is unsafe                                                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate hosted surface and main-only session owner                    | Renderer-hosted credentials or browser storage would expose secrets across the least-trusted boundary.                                                |
| Account-scoped enrollment receipt beside workspace-scoped F009 records | No workspace exists yet; fabricating one would grant/infer authority and corrupt tenant semantics.                                                    |
| Distinct sign-in attempt, enrollment intent, and final binding states  | Browser return, server acceptance, and protected local commit can fail independently and must reconcile without duplicate devices or false readiness. |

No speculative provider matrix, MFA/recovery, device management, workspace onboarding, offline lease, sync, or generic identity framework is included.
