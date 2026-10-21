# F010 Validation Quickstart

**Purpose**: Runnable validation guide for a future authorized F010 implementation. This document does not claim that the commands or hosted/native evidence exist yet.

## Prerequisites

Before any acceptance run, record:

- repository commit, Node/npm/Electron versions, build mode and feature protocol version;
- selected pre-provisioned sandbox identity method, expected issuer/audience, hosted origin, exact callback transport/destination, and redacted configuration digest;
- protected credential/key-store adapter and current F006/F007 proof status;
- local Supabase/PostgreSQL version and clean synthetic database state;
- test OS/CPU/desktop session/package/signing details for native evidence;
- English or Arabic locale, assistive technology and reviewer where applicable.

Q-08 must approve the sandbox method. Keep public registration and email delivery disabled unless sender/domain/delivery/abuse/support readiness is separately proven. Do not use real customer accounts or secrets in fixtures/evidence.

## 1. Static and focused verification

After F010 implementation and F002 manifest enrollment:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run check:security
npm run check:docs
npm run test:f010
```

Expected:

- fixed F010 suites are enrolled and fail on missing/zero tests;
- built renderer/preload assets contain no provider/service secret, password, token, authorization code, verifier, raw callback, cookie, or unrestricted provider error;
- the only renderer surface is the named identity facade in [native profile contract](contracts/native-profile-and-renderer-boundary.md);
- documentation checks resolve all feature links and requirement/scenario IDs.

## 2. Callback parser, replay and browser-launch suite

```bash
npm run test:f010:attempts
```

Required fixtures:

- valid current attempt;
- wrong/missing state, nonce/result binding, issuer/audience, route/destination, profile and generation;
- cancelled, expired, consumed and superseded attempt;
- duplicate/concurrent delivery;
- duplicate/unknown query keys, fragment, control characters, malformed/ambiguous encoding, nested destination, maximum bytes and maximum+1;
- cold start, running owner/second instance, and macOS event adapter;
- untrusted hosted/external URL.

Expected: exactly one valid delivery acquires exchange ownership. Every invalid/duplicate case returns a safe result and causes zero session, enrollment, navigation, command, workspace, profile-open, or protected-data effect. Main opens only the configured HTTPS hosted purpose. See [browser handoff contract](contracts/browser-handoff-and-callback.md).

## 3. Trusted identity and secret-surface suite

Run the configured sandbox identity emulator/provider tests under the focused suite, then a real sandbox journey:

```bash
npm run test:f010
npm run check:security
```

Exercise valid exchange plus invalid signature/key, issuer, audience/authorized party, expiry/issued-at, response issuer, nonce, one-time code, redirect destination, account substitution, provider unavailable, network unavailable, and cancelled authentication.

Expected:

- stable account identity is `(issuer, subject)` and safe display fields are non-authoritative;
- no workspace/membership/lease/cache is created;
- secrets remain only in the approved main/protected adapter and are absent from renderer state, URLs retained after completion, logs, database evidence, analytics/crash/support/export fixtures;
- safe localized errors distinguish cancelled, network, provider, invalid return, and sign-in required.

## 4. Enrollment transaction and reconciliation suite

Start the local Supabase/PostgreSQL stack using the repository's approved F008/F009 emulator workflow, apply the future F010 migration, and run:

```bash
npm run test:f010:enrollment
```

Exercise:

- one verified account/installation/protection proof;
- concurrent identical requests;
- identical retry after lost response;
- changed payload/account/installation context with reused intent ID;
- failure before claim, after claim, before enrollment insert, before receipt/evidence, and before commit;
- authoritative commit followed by local protected-write failure;
- response loss followed by status reconciliation;
- lookup using another account.

Expected: one device enrollment, one immutable receipt and one redacted evidence result for the accepted intent; rollback leaves none; identical retries return the original result; changed reuse is rejected; other-account lookup reveals nothing; unknown outcome never creates a second device ID. Validate against [enrollment contract](contracts/device-enrollment-and-reconciliation.md) and [data model](data-model.md).

## 5. Protection, restart and recovery suite

```bash
npm run test:f010:recovery
npm run test:f006
npm run test:f007
```

Fault at every boundary: missing/locked/unprotected key store, protected credential write failure, profile-binding write failure, corrupt/incompatible profile, restart with a still-valid protected attempt, restart after service acceptance, session rejection/revocation, and lost key.

Expected:

- `enrolled` appears only when every atomic-readiness term is proven;
- partial/unknown states stay locked, protection-unavailable, or recovery-required;
- the same enrollment intent/result resumes after restart;
- existing encrypted bytes are unchanged and no empty replacement profile/workspace is created;
- a callback cannot be accepted when its required attempt secret was not safely preserved.

## 6. Account isolation and sign-out suite

```bash
npm run test:f010:isolation
```

Enroll synthetic account A, create distinguishable encrypted pending fixtures, sign out, enroll B in an isolated profile, then return to A. Race sign-out/switch against callback, refresh and enrollment completion.

Expected: generation invalidation wins every race. B observes zero A records, fields, labels, counts, searches, notifications, pending operations, windows, subscriptions, keys, or diagnostic identity. A's profile is neither relabelled nor erased and reopens only after A is verified and protection passes. Sign-out guidance distinguishes retained encrypted work from deletion.

## 7. English/Arabic and accessibility suite

```bash
npm run test:f010:ui
npm run test:desktop
```

In both languages, cover success, waiting/cancel, invalid return, expiry, offline/provider unavailable, protection unavailable, unknown enrollment, restart rejection, sign-out and account switch. Check keyboard-only flow, visible focus, browser-open notice, focus return, live announcements, zoom/reflow, contrast, reduced motion, and mixed-direction email/device/diagnostic display.

Expected: localization key and parameter parity is complete; no provider raw text appears; identifiers remain readable with bidi isolation; every failure offers one named safe next action; no critical keyboard/screen-reader/RTL defect remains. Record fluent Arabic and native assistive-technology review separately from automation.

## 8. Full regression

```bash
npm run test:f003
npm run test:f004
npm run test:f006
npm run test:f007
npm run test:f008
npm run test:f009
npm run test:f010
npm run typecheck
npm run lint
npm run build
npm run check:security
npm run check:docs
```

Expected: F010 does not weaken F004 navigation/caller admission, F006 protection, F007 no-empty-replacement/atomic persistence, F008 tenant isolation, or F009 receipt/audit behavior.

## 9. Native and hosted acceptance matrix

Run a packaged candidate on each declared Windows, macOS and Linux target. For each, capture exact installer/package/signature, callback transport/registration proof, OS/CPU/session, default browser, build commit, issuer/config digest, expected versus observed result, redacted artifacts, defects and reviewer.

Required journeys:

1. Clean sign-in and first enrollment, restart within SC-009.
2. Cancel/expire and deliberate retry.
3. Callback cold start, running instance and replay.
4. Network loss before exchange, during enrollment and after service commit.
5. Protection unavailable and corrupt/incompatible profile.
6. Account A sign-out, isolated B enrollment, return to A.
7. English/Arabic keyboard and screen-reader critical paths.
8. First-time completion timing for SC-006, excluding provider-controlled wait.

Expected: SC-001–SC-010 are reported individually. A failed/unavailable callback registration, provider method, protected store, Arabic review or target host is a blocker—not a reason to broaden destinations or claim another target passed.

## Evidence rule

Record observed results only. Separate unit/local service checks, real hosted sandbox behavior, and packaged native observations. Redact all prohibited secret fields before saving evidence. Completion, PR merge, deployment, provider production enablement, and public release remain later approval/gate decisions.
