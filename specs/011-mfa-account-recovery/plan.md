# Implementation Plan: F011 — MFA and Account Recovery

**Branch**: `011-mfa-account-recovery` (Spec Kit identity; proposed delivery branch: `feat/f011-mfa-and-account-recovery`) | **Date**: 2026-10-21 | **Spec**: [F011 feature specification](spec.md)

**Input**: Feature specification from `specs/011-mfa-account-recovery/spec.md`

**Status**: Local implementation and verification complete (66 automated tests passing across 20 suites); production delivery blocked behind open release gates Q-08, Q-02, Q-07, and F029. See [QA report](../../docs/qa/F011.md) and [feature guide](../../docs/features/F011.md).

## Summary

F011 adds one configured TOTP factor, provider-owned one-time recovery codes, MFA challenge handling, purpose-bound reauthentication, primary-credential recovery, and truthful session/local-data consequences to F010's verified account boundary. Secret entry and one-time code display remain on the separately hosted identity surface. Electron main owns only safe status, browser-purpose launch, protected pending-handoff metadata, generation fencing, and reconciliation; renderer receives a small closed DTO and named actions.

The smallest complete design reuses F010's identity coordinator/session owner/protected store, F009's command idempotency and redacted evidence, and the existing command-gateway deployment. It adds no dependency, service, custom TOTP code, recovery-code database, or application rate-limit system. Supabase Auth remains the first adapter, but recovery codes are an experimental provider capability: implementation is blocked until an isolated capability probe proves the pinned SDK, deployed Auth server, and managed project support the required operations and Q-08 explicitly accepts that dependency.

## Technical Context

**Language/Version**: TypeScript 7.0.2; Node.js >=24 <25; Electron 44.8.0; PostgreSQL/Supabase schema and TypeScript Edge Functions for authoritative account-security state.

**Primary Dependencies**: Existing Electron/Forge/Vite, React 19.3.1, `@supabase/supabase-js` 2.118.0, F003 contract/error primitives, F004 caller/navigation boundary, F005 bilingual accessible shell, F006/F007 protected storage, F009 idempotent command/evidence pattern, and F010 identity coordinator/session/provider adapter. No new dependency is selected or installed.

**Storage**: Provider-owned factors, challenges, recovery codes, credentials, and sessions; private PostgreSQL account-security state, purpose-bound operation intents, and additive redacted evidence; one sealed main-process pending-handoff record containing references and safe metadata only. No recovery-code plaintext or digest is stored by SoloDesk.

**Testing**: Existing Node test coordinators and Playwright Electron harness; planned `tooling/f011/verify.mjs`, `tests/f011/{unit,integration,service,ui}`, local Supabase/PostgreSQL transaction tests, provider capability/contract tests, secret-surface scans, and Windows/macOS/Linux hosted/native acceptance. English/Arabic accessibility, recovery comprehension, and completion timing also require observed human evidence.

**Target Platform**: Electron desktop on Windows, macOS, and Linux; F010's separately hosted bilingual identity surface; managed Supabase Auth/PostgreSQL/Edge Functions. F029 owns packaged callback/signing proof.

**Project Type**: Cross-platform desktop application with a small hosted identity surface and managed backend authority.

**Performance Goals**: Meet SC-009–SC-011: at least 90% complete first enrollment/acknowledgment within three minutes, at least 95% complete a routine challenge within 90 seconds, and at least 90% correctly understand cloud/session/local-data consequences. Security goals are 100% no-effect for invalid/replayed/stale proof, at-most-one accepted effect under concurrency, and zero prohibited secret leakage.

**Constraints**: Online authority only; system-browser hosted secret entry; no recovery code, factor secret, password, reusable token, or raw provider payload in Electron renderer/IPC/log/evidence; exact account/purpose/session/security-generation binding; neutral public recovery response; fail closed on capability, AAL, session, generation, reconciliation, protection, or policy mismatch; cloud recovery never claims a local key or unsynchronized data; English/Arabic, RTL, keyboard, focus, screen-reader, contrast, and 200% zoom parity.

**Scale/Scope**: One configured additional factor and one provider recovery-code set per account in the first release; one current account-security generation; low-frequency security operations; one existing command-gateway deployment; one hosted security surface. Multiple factors, passkeys, remembered devices, workspace-specific MFA, custom recovery storage, support override, device administration, and business access are excluded.

**Open implementation/release gates (not placeholders)**: F010's hosted identity surface and referenced UI suites are not present in the current tree and must exist before F011 implementation. Q-08 must approve the production policy and experimental recovery-code dependency. The provider capability probe must pass. Q-02 and verified sender/domain/SMTP readiness gate public credential recovery. Q-07 gates local-key recovery claims. F029 and native evidence gate packaged delivery.

## Constitution Check

_GATE: assessed before Phase 0 research and re-checked after Phase 1 design._

| Principle                                 | Pre-research gate                                                                                                                                                | Post-design disposition                                                                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Authorized scope and traceability**  | **PASS**: The user authorized specification planning only; PLT-002 and FR-001–FR-028 are the authority.                                                          | **PASS**: Only F011 planning documents and the root plan link are changed. Requirements map to contracts and verification; implementation remains unauthorized.                                                 |
| **II. Desktop trust boundaries**          | **PASS with obligation**: Passwords, factor values, recovery codes, tokens, and raw provider artifacts cannot enter renderer or generic IPC.                     | **PASS as design**: Hosted Auth owns secret entry/display; main exposes named safe operations and reconciled DTOs only.                                                                                         |
| **III. Offline work and cloud authority** | **PASS with boundary**: MFA/recovery require online identity authority and cannot imply workspace/offline access.                                                | **PASS as design**: Recovery restores only verified cloud identity; membership, device approval, local key, offline lease, and business permissions are reevaluated separately.                                 |
| **IV. Exact financial evidence**          | **PASS**: No money, issuance, allocation, or financial state is in scope.                                                                                        | **PASS**: Contracts expose no financial or business command authority.                                                                                                                                          |
| **V. Fail-closed security**               | **PASS with obligation**: AAL, live session, purpose, generation, replay, abuse, provider capability, evidence redaction, and unknown outcomes must fail closed. | **PASS as design**: Provider proof is independently reconciled; stale and unknown operations grant nothing; unsupported experimental recovery codes block implementation rather than trigger a custom fallback. |
| **VI. English, Arabic and accessibility** | **PASS with obligation**: Every security and recovery state needs equivalent accessible meaning.                                                                 | **PASS as design**: Typed keys, bidi isolation, one logical code input, focus/status rules, and manual Arabic/native-AT evidence are specified.                                                                 |
| **VII. Recoverable evolution**            | **PASS with obligation**: Provider-first effects, restarts, response loss, schema changes, and incompatible local state cannot fabricate success or erase data.  | **PASS as design**: Versioned generation/operation records reconcile before retry; protected metadata is staged; no empty replacement or code redisplay is permitted.                                           |
| **VIII. Evidence before completion**      | **PASS with obligation**: Provider, service, native, privacy, abuse, accessibility, and recovery-comprehension evidence are required.                            | **PASS as design**: Quickstart separates capability, local service, hosted sandbox, and three-target observations. No pass is asserted.                                                                         |

**Gate Result**: The documentation design passes all constitutional gates. Implementation remains blocked by the missing F010 hosted prerequisite, the exact recovery-code capability/Q-08 decision, and the named deployment/native gates. No constitutional exception is proposed.

## Project Structure

### Documentation (this feature)

```text
specs/011-mfa-account-recovery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── provider-security-boundary.md
    ├── security-operations-and-reconciliation.md
    ├── hosted-native-security-handoff.md
    └── recovery-evidence-localization-and-errors.md
```

### Source Code Layout (proposed implementation; not created by this plan)

```text
app/
├── main/
│   ├── identity/
│   │   ├── coordinator.ts                 # compose F011 with the existing single identity owner
│   │   ├── account-security.ts            # generation/state/reconciliation coordinator
│   │   ├── account-security-service.ts    # bounded existing-gateway client
│   │   ├── provider-adapter.ts            # factor/AAL/recovery capability adapter
│   │   └── protected-identity-store.ts    # one sealed pending security-handoff record
│   └── bridge.ts                          # named safe account-security methods/events
├── preload/preload.ts                     # versioned renderer-safe facade
├── shared/identity-security-contracts.ts  # separate closed F011 DTOs and validators
├── renderer/components/identity/AccountSecurityPanel.tsx
└── renderer/env.d.ts
packages/localization/src/shell/{en,ar}.ts
web/auth/                                  # F010 prerequisite; add security/recovery purposes only
supabase/
├── migrations/<timestamp>_f011_identity_security.sql
└── functions/
    ├── command-gateway/index.ts           # add closed account-security dispatches
    └── _shared/account-security.ts
tooling/f011/verify.mjs
tests/f011/{unit,integration,service,ui}/
tests/verification/desktop/f011-*.spec.mjs
```

**Structure Decision**: Extend the current F010 coordinator and provider adapter rather than create a second session owner. Keep F011 contracts separate so F010's version-1 secret-field denylist is not weakened. Reuse the command gateway's existing pre-workspace identity path and evidence conventions. Add one native panel and hosted route purposes, not a second app, microservice, factor store, generic IPC executor, or authentication framework.

## Design and Implementation Sequence

1. **Entry gates and capability proof**: Verify F010 hosted/native delivery exists; pin the exact SDK/Auth/project versions; enable the experimental surface only in an isolated sandbox; prove recovery-code generate/status/verify/regenerate/unenroll semantics, AAL transitions, code replay behavior, and session consequences; record Q-08 acceptance. A failed probe stops implementation.
2. **Closed policy and contracts**: Add a versioned identity-security policy and separate F011 validators for safe account state, operation purposes, session consequences, errors, and renderer actions. Production policy absence or inconsistency is a deployment block, never an implicit default.
3. **Provider adapter extension**: Reuse the F010 trusted session owner. Add only typed provider operations needed for TOTP enroll/challenge/verify/list/unenroll, AAL/session inspection, experimental recovery-code lifecycle, reauthentication, and credential recovery. Map provider failures to closed outcomes; do not expose raw errors or secrets.
4. **Purpose-bound hosted operations**: Add allowlisted hosted purposes for enrollment, challenge, code acknowledgment/rotation, lost-factor recovery, primary-credential recovery, and sensitive reauthentication. Each binds the verified account, current live session, purpose, expiry, operation ID, and expected security generation. Provider calls happen only on the hosted surface.
5. **Factor setup and recovery handoff**: Reauthenticate, enroll and verify one TOTP factor, generate one provider recovery set at `aal2`, display it once, and require explicit acknowledgment. Provider verification may make the factor usable before SoloDesk acknowledgment; product readiness remains `recovery_codes_pending`. If Q-08 requires literal provider activation only after acknowledgment, this adapter is incompatible and implementation must stop or the specification/provider must change.
6. **Authoritative operation ledger**: Add one private account-security row and one generic-but-closed operation table. The command gateway derives account/live session, validates purpose/generation/request digest, independently observes provider AAL/factor/recovery status, and commits one state transition plus redacted evidence. Identical retries converge; changed inputs or stale generations fail.
7. **Recovery and sensitive changes**: Let the provider verify a current unused recovery code, upgrading the current session to `aal2`; then use ordinary provider factor replacement and recovery-code regeneration. Password recovery stays in the provider's PKCE hosted flow with neutral request wording. Every accepted recovery/change advances SoloDesk's security generation and records actual session consequences.
8. **Native safe state and restart**: Compose one account-security coordinator into the existing identity coordinator. Store only an encrypted/profile-bound pending operation reference, expected generation, purpose, and safe lifecycle. On callback, restart, or lost response, reconcile provider/service state before emitting a result. Invalidate late results when profile/session/security generation changes.
9. **Accessible bilingual presentation**: Add one account-security panel using house controls and typed English/Arabic keys. Keep codes and identifiers LTR-isolated, support paste into one semantic code input, announce status without secrets, restore focus predictably, explain cloud/local/session consequences, and offer one safe next action.
10. **Verification, rollout, and rollback evidence**: Register focused F011 suites in the fixed verification manifest, run F003–F010 regressions, verify real PostgreSQL/provider behavior and secret absence, then perform hosted sandbox and packaged target acceptance. Rollback disables F011 entry points without deleting provider factors, recovery state, local profiles, or evidence; provider-side changes require explicit reconciled user action.

## Interface, Data and Failure Summary

- [Provider security boundary](contracts/provider-security-boundary.md) defines the provider capability gate, TOTP/recovery-code ownership, AAL/live-session checks, and the factor-verification/acknowledgment timing boundary.
- [Security operations and reconciliation](contracts/security-operations-and-reconciliation.md) defines purpose-bound operations, expected-generation idempotency, provider-first partial effects, authoritative state transitions, and retry rules.
- [Hosted/native security handoff](contracts/hosted-native-security-handoff.md) defines allowlisted browser purposes, protected local metadata, named preload/IPC operations, safe DTOs, and late-result fencing.
- [Recovery, evidence, localization and errors](contracts/recovery-evidence-localization-and-errors.md) defines neutral primary recovery, local-key limits, evidence redaction, safe errors/actions, session messaging, bilingual/RTL behavior, and accessibility.
- [Data model](data-model.md) defines the seven logical projections/entities and their transitions. Provider entities are projections, not new SoloDesk tables.

## Verification and Traceability

| Slice                                 | Requirements                                         | Acceptance            | Planned evidence                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Policy, enrollment, acknowledgment    | FR-001–FR-007                                        | A-01–A-06             | Exact capability probe, TOTP/AAL contract tests, interruption/restart/concurrency, one-time display scan, product-readiness reconciliation |
| MFA challenge and anti-abuse          | FR-008–FR-011                                        | A-07–A-11             | Account/purpose/attempt/generation negatives, replay/expiry/revocation, provider rate-limit boundary, online-only tests                    |
| Cloud account recovery                | FR-012–FR-016, FR-019–FR-022                         | A-12–A-17             | Provider code consume/rotate, neutral password recovery, response-loss reconciliation, local-key and membership separation                 |
| Reauthentication and security changes | FR-002, FR-007, FR-015, FR-017–FR-018, FR-023–FR-024 | A-18–A-22             | Fresh/stale AAL and live-session checks, generation races, actual sign-out scopes, evidence/notification redaction                         |
| Privacy, bilingual and accessible UX  | FR-014, FR-018–FR-020, FR-025–FR-028                 | A-14, A-16, A-21–A-25 | Secret scans, neutral response/timing review, EN/AR parity, RTL/bidi, keyboard/focus/live region/zoom plus fluent/native-AT review         |

Planned implementation commands:

```bash
npm run test:f011
npm run test:f011:policy
npm run test:f011:mfa
npm run test:f011:recovery
npm run test:f011:security
npm run test:f011:reconciliation
npm run test:f011:boundary
npm run test:f011:privacy
npm run test:f011:ui
npm run test:f003 && npm run test:f004 && npm run test:f005 && npm run test:f006
npm run test:f007 && npm run test:f008 && npm run test:f009 && npm run test:f010
npm run typecheck && npm run lint && npm run build
npm run check:security && npm run check:docs && npm run test:desktop
```

These are future commands, not reported results. Service acceptance must exercise real local PostgreSQL/Supabase transactions and an isolated compatible Auth project; in-memory provider doubles alone cannot prove recovery-code or AAL behavior. Windows/macOS/Linux and English/Arabic observations remain separate evidence.

## Rollout, Compatibility and Recovery

Use only synthetic sandbox accounts until the recovery-code gate, Q-08 policy, sender/domain delivery, abuse/support readiness, and provider limits are approved. Start with one TOTP factor and provider-owned recovery codes; no silent fallback is permitted. Version the policy, security state, operations, local handoff, renderer contract, and evidence additions. An unsupported version or provider capability enters `upgrade_required`/`recovery_required` and preserves prior protected state.

Deploy the additive database migration and service handling before exposing hosted/native controls. Roll out to internal sandbox users first, then a bounded pilot after observed recovery/restart/session-consequence results. Disable the feature at the policy/entry-point layer for rollback. Do not delete or automatically unenroll a provider factor, rotate codes, invalidate sessions, or overwrite local profiles to imitate rollback. Unknown provider outcomes retain the original operation and reconcile before any replacement.

Existing F010 callers remain compatible because their v1 contract and secret-name denylist are unchanged. F011 uses a separate versioned contract and composes with the existing identity owner. The current F010 evidence table is enrollment-specific (`enrollment_intent_reference` and a closed event constraint); the implementation migration must add compatible nullable identity-operation linkage and closed F011 event types without weakening immutability or retroactively rewriting rows.

## Delivery Gates and Stop Conditions

- **Stop before implementation** if the F010 hosted identity surface/tests are still absent, the provider recovery-code probe fails, or Q-08 does not accept the experimental dependency. Do not replace it with custom recovery crypto under this plan.
- **Stop before public recovery** if sender/domain/redirect allowlists, neutral response behavior, abuse limits, support path, region/cost, and delivery evidence are unapproved.
- **Stop before marking setup complete** if factor/recovery status, code acknowledgment, live session, or security generation cannot be reconciled. Provider verification and SoloDesk readiness must be described separately.
- **Stop before release** on secret leakage, account enumeration, replay/stale-generation effect, local-profile replacement, untranslated critical content, blocking accessibility defects, or missing target-native evidence.
- Completion still requires implementation evidence, documentation/runbook updates, user final approval, and the root F011 exit gate. This plan alone changes none of those statuses.

## Complexity Tracking

No constitutional violation or additional architecture is proposed. The only new persistence is account-security readiness/generation plus one purpose-bound operation ledger; provider-owned MFA/recovery state remains at the provider, and the existing identity coordinator, command gateway, protected store, UI system, localization, and verification harness are reused.
