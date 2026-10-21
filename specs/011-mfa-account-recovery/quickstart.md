# Quickstart and Acceptance Plan: F011 MFA and Account Recovery

**Status**: Planned verification only. Commands and expected results below are not evidence that implementation, provider setup, or native acceptance exists.

## 1. Entry-gate inventory

Before implementation, record:

- F010 merged implementation and evidence, including its separately hosted identity surface and UI/native callback suites;
- exact desktop build/commit, Node/Electron/SDK lockfile versions, Supabase Auth/project capability identity, region, redirect allowlist, and policy version;
- Q-08 approval for TOTP, mandatory/optional population, experimental provider recovery codes, reauthentication purposes, session consequences, retry/expiry limits, and escalation path;
- Q-02 hosting/cost/limit approval and verified sender/domain/SMTP/delivery/support readiness for public credential recovery;
- Q-07 local-key limits and F029 target callback/signing evidence; and
- synthetic isolated accounts/devices only, with a documented cleanup owner.

Expected: any missing prerequisite is a recorded blocker. Do not create F011 code, enable public recovery, or substitute a custom recovery-code store.

The current repository inspection found no `web/auth/` implementation and several F010 UI files referenced by verification tooling are absent. Recheck this at implementation time; do not assume the plan created them.

## 2. Provider recovery-code capability probe

Run a purpose-built probe in an isolated compatible Supabase project before ordinary F011 work. It must test the pinned SDK/server/project combination, not only TypeScript signatures.

Required observations:

1. `aal1` session enrolls and verifies one TOTP factor; current/next AAL changes are recorded.
2. Recovery-code generation at the required AAL returns plaintext once and safe status can be queried later without plaintext.
3. One valid recovery code verifies once, upgrades the intended current session to `aal2`, and replay fails.
4. Wrong-account, malformed, changed, expired/exhausted, and concurrent duplicate submissions change no other account/session/factor.
5. Regeneration requires approved authority, returns a new one-time set, and invalidates every prior unused code.
6. Factor unenrollment/replacement works only at the proven AAL and produces measured session consequences.
7. Recovery-code unenrollment/status semantics and provider rate-limit behavior match the adapter contract.
8. Provider verification timing relative to recovery-code acknowledgment is captured explicitly.

Expected: save redacted version/config/result evidence and a Q-08 decision. If any required operation is disabled, experimental/unstable beyond approval, ambiguous, or incompatible, stop. SDK types and documentation are not a pass.

## 3. Focused automated suites

Planned package entries:

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
```

Expected: `test:f011` is the fixed-manifest aggregate and fails when a required suite/file/evidence fixture is missing. Focused scripts select real registered suites rather than maintaining independent drifting lists.

## 4. Policy and contract suite

```bash
npm run test:f011:policy
```

Cover:

- unavailable/optional/required factor policy and protected-action restriction;
- absent, unknown, contradictory, stale, or unapproved production policy;
- exact closed purpose/action/state/error/consequence validators and maximum/max+1 bounds;
- unsupported protocol/policy/capability versions;
- separate F010/F011 contracts, ensuring F010's secret-field denylist remains intact;
- unknown keys and secret-shaped password/code/token/seed/QR/callback/provider fields; and
- out-of-scope factor types, multiple factors, remembered devices, arbitrary URLs and generic operations.

Expected: policy/configuration fails closed; no renderer or gateway caller can select authority-bearing identity fields.

## 5. MFA enrollment and challenge suite

```bash
npm run test:f011:mfa
```

Cover one verified account and one TOTP factor:

- recent proof required before enrollment;
- enrollment attempt account/purpose/expiry/security-generation binding;
- valid verification, invalid/malformed/expired proof, cancellation and supersession;
- duplicate/concurrent verification and two-window/device generation races;
- provider-verified/recovery-codes-pending state versus SoloDesk `ready`;
- one-time recovery-code display and explicit acknowledgment;
- close/restart/lost response before and after provider verification/generation/acknowledgment;
- valid challenge advances only its originating sign-in/reauth attempt;
- replay, cross-account, cross-purpose, revoked-session, stale-generation and offline denial; and
- provider limit boundary, boundary+1, backoff and safe recovery route.

Expected: at most one accepted SoloDesk transition/evidence effect; no incomplete state is presented as fully recoverable. The observed fact that provider verification may make the factor usable before SoloDesk acknowledgment is surfaced, not hidden.

## 6. Account recovery suite

```bash
npm run test:f011:recovery
```

Recovery-code cases:

- one current unused code succeeds once for the matching account and upgrades only the intended session;
- replay, wrong account, changed characters, whitespace outside permitted normalization, Arabic presentation, expired/exhausted set, and concurrent duplicate have no additional effect;
- deliberate regeneration at `aal2` invalidates every old unused code;
- lost regeneration response reconciles without redisplay and blocks another rotation until resolved;
- successful lost-factor recovery enters the required reset/re-enrollment state; and
- no local session alone/admin shortcut silently removes a factor.

Primary-credential cases:

- existing, absent, disabled, ineligible, and rate-limited account identifiers receive the approved neutral visible response/timing tolerance;
- recovery artifacts are one-time, bounded, exact-destination, and absent from native bridge/evidence/logs;
- response loss/restart resumes the same intent and reconciles rather than repeating reset;
- concurrent password recovery/factor challenge obeys latest accepted security generation; and
- configured passwordless methods use only their approved provider equivalent.

Expected: one accepted provider/SoloDesk recovery effect, obsolete artifacts fail, exact session consequences are shown, and unavailable recovery ends in an honest approved path.

## 7. Sensitive-change and service suite

```bash
npm run test:f011:security
```

Use real local PostgreSQL/Supabase transactions for:

- `getState`, `begin`, `observe`, and `acknowledgeRecoveryCodes` request validation;
- derivation of account/live session/AAL instead of trusting client fields;
- identical operation retry convergence and changed digest/account/purpose/generation rejection;
- fresh versus stale/expired/wrong-purpose reauthentication;
- factor disable/replace, recovery-code regenerate, password/email/recovery-identity change;
- row-lock races where the first accepted operation increments generation and the second becomes stale;
- one state/evidence/session-consequence commit in a short transaction;
- explicit constraints, RLS/revokes, privilege denial for `PUBLIC`/`anon`/`authenticated`, and foreign-key/index plans;
- F010 evidence-row compatibility and retained immutability; and
- actual consequence mapping without relying on default sign-out scope.

Expected: no provider call occurs inside a database transaction; no direct client access or service credential leaks; stale work cannot weaken a newer security state.

## 8. Reconciliation and failure-injection suite

```bash
npm run test:f011:reconciliation
```

Inject failure before/during/after each provider and server boundary:

1. protected handoff staging;
2. browser launch;
3. provider verification or recovery-code generation/use/rotation;
4. inert return delivery;
5. trusted provider observation;
6. operation/state/evidence transaction; and
7. protected local final state/event delivery.

Also cover app close, OS restart, second instance, stale native callback, session revocation, profile/account switch, policy/capability change, service timeout, database response loss, provider timeout, and device clock skew.

Expected: the original operation is retained; a provably applied result converges, a provably not-applied result permits only the approved retry, and ambiguity stays `outcome_unknown`/`reconciliation_required`. No secret proof is persisted for replay and no empty profile replaces unreadable state.

## 9. Hosted/native boundary suite

```bash
npm run test:f011:boundary
```

Cover:

- exact allowlisted hosted purpose/destination and F010 callback grammar;
- oversize, duplicate, unknown, fragment, nested URL, ambiguous encoding, secret-shaped and arbitrary-purpose inputs;
- renderer/preload sender/frame/origin/document/profile-generation admission;
- plain-data cloning, DTO/event limits, subscription disposal, and late response suppression;
- account A pending flow during sign-out/switch to B and return to A;
- protected handoff corruption/version mismatch and no-empty-replacement behavior;
- no workspace/cache/membership/offline authority created by recovery; and
- local key unavailable after cloud recovery, with encrypted bytes preserved.

Expected: only safe status/actions cross IPC. Codes, passwords, seeds, tokens, cookies, provider payloads, account recovery identifiers, and raw errors never appear.

## 10. Privacy and secret-surface suite

```bash
npm run test:f011:privacy
npm run check:security
```

Seed unique canaries for passwords, TOTP seeds/values, recovery codes, tokens, cookies, recovery links, provider responses/errors, and public account identifiers. Exercise success, failure, cancellation, rate limit, crash, restart, screenshots, analytics, logs, database/evidence, support bundle, export, notifications, browser/native handoff, and test artifacts.

Expected: zero canary occurrence outside the provider-owned live hosted surface where a value is legitimately entered/shown. Evidence contains only the explicit allowlist. Neutral public recovery responses do not differ in wording/status/redirect/shape beyond approved timing tolerance.

## 11. English/Arabic and accessibility suite

```bash
npm run test:f011:ui
npm run test:desktop
```

In English and Arabic, cover enrollment, verification, code handoff/acknowledgment, challenge, invalid/rate-limited proof, recovery-code use/rotation, primary recovery, reauthentication, session consequences, local-key limitation, outcome unknown, and support/upgrade states.

Check:

- typed localization key/parameter parity and no raw provider text;
- logical RTL layout and LTR isolation for codes/emails/diagnostics/times;
- one semantic paste-friendly code input with intact value/order;
- keyboard-only operation, visible focus, dialog focus trap/restore, browser context announcement, result focus, and status live regions;
- non-color status, contrast, reduced motion, and 200% zoom/reflow; and
- user comprehension of cloud access, current/other sessions, workspace revalidation, local key, and unsynchronized data.

Expected: no blocking English/Arabic, keyboard, screen-reader, RTL, bidi, zoom, or comprehension defect. Record fluent Arabic and native assistive-technology observations separately from automated results.

## 12. Full regression

```bash
npm run test:f003
npm run test:f004
npm run test:f005
npm run test:f006
npm run test:f007
npm run test:f008
npm run test:f009
npm run test:f010
npm run test:f011
npm run typecheck
npm run lint
npm run build
npm run check:security
npm run check:docs
```

Expected: F011 does not weaken F004 caller/navigation admission, F005 accessibility/RTL, F006 protection, F007 atomic/no-empty replacement, F008 isolation, F009 idempotency/evidence, or F010 account/session/profile boundaries.

## 13. Hosted and native acceptance matrix

After automated/local checks pass, run a packaged candidate on each declared Windows, macOS, and Linux target against the approved isolated hosted project. Record target/OS/CPU, package/signature, default browser, callback registration, build/commit, provider/policy/capability digest, language/AT, expected versus observed result, redacted artifacts, defects, and reviewer.

Required journeys:

1. First TOTP enrollment through recovery-code acknowledgment and later sign-in challenge.
2. Interrupt/close/restart at every setup boundary, including provider-verified but not acknowledged.
3. Valid/invalid/replayed/rate-limited challenges and stale session/generation.
4. Lost-factor recovery with one code, factor replacement, and new code-set acknowledgment.
5. Primary-credential recovery with neutral request, lost response, and current/other-session consequences.
6. Recovery when local key is present versus missing/unreadable; verify no unsynchronized-data recovery claim.
7. Account A/B isolation and revoked workspace membership after recovery.
8. English/Arabic keyboard and native screen-reader critical paths at 200% zoom.
9. SC-009 enrollment time, SC-010 challenge time/next-action accuracy, and SC-011 consequence comprehension with the required sample/protocol.

Expected: SC-001–SC-013 are reported individually. Provider-controlled wait is separated from SC-009. An unavailable target, signer, callback, provider capability, fluent review, native assistive technology, or sender is a blocker, never an inferred pass.

## 14. Rollback and recovery drill

Disable F011 policy/entry points after creating real sandbox provider state. Confirm:

- existing F010 sign-in/profile behavior remains intact;
- provider factors/codes/sessions are not deleted or changed merely to imitate rollback;
- server operation/evidence records remain readable/immutable and private;
- pending local handoff becomes safe unavailable/reconciliation guidance without replacing the protected profile; and
- re-enable with the same compatible version reconciles current provider/server state before exposing actions.

Expected: rollback is reversible at the feature-entry layer and causes no identity, local-profile, workspace, or evidence data loss. Any provider-side rollback action is a separate explicit, authenticated, reconciled operation.

## Evidence rule

Record observed results only. Keep provider capability evidence, local/service automation, hosted sandbox behavior, and packaged native observations distinct. Redact prohibited secret values before saving artifacts. Completion, merge, provider production enablement, sender activation, support promise, and public release remain separate approvals.
