# F004 Quickstart — Candidate Validation

**Status**: Phase 1 validation guide for a future F004 candidate. The F004 implementation and focused tests do not exist in the checked-out baseline, so these are expected procedures, not passed results.  
**Source**: [spec](spec.md), [plan](plan.md), [data model](data-model.md), [bridge](contracts/desktop-bridge.md), [links](contracts/links-and-navigation.md), [lifecycle](contracts/ownership-and-lifecycle.md), [F002 verification guide](../../docs/features/F002.md).

## Preconditions

1. Confirm the user has authorized F004 implementation when that work begins, and verify F003's actual merged/approved contract version. Record the candidate commit/build identity and an actual comparison base. Do not use a proposed branch name as evidence of merge.
2. Use Node 24 and the checked-in npm lockfile; install existing dependencies by the repository's documented setup. Run only with synthetic profiles and no customer credentials/data. Do not disable Electron sandbox or reuse a real userData directory for tests.
3. Confirm the F004 candidate includes a built preload, the internal asset-origin handler, focused F004 test files and F002 desktop test enrollment. The present checkout lacks these; a missing file or suite is a blocker, not a pass.
4. Select actual host targets. Existing hosted smoke targets are a provisional evidence matrix: Linux x64, Windows x64 and macOS arm64. Record exact OS/build/CPU/display and any missing target; Q-11 remains open. Linux Snap integrated-terminal startup requires a real applicable environment.

## Local commands for an implemented candidate

From the repository root, run the existing commands in this order:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:launcher
npm run test:desktop
npm run check:security
npm run check:docs
npm run verify -- --profile baseline --base <actual-comparison-base>
```

Replace the angle-bracket base with the actual reviewed merge base before running the final command. The existing desktop runner builds evidence for its configured cases; ensure playwright.config.mjs and F002 selection register F004 cases before treating its result as F004 evidence. The F004 unit/integration files planned under tests/f004 can be run with the existing Node test runner after they exist:

```bash
node --test tests/f004/unit/*.test.mjs tests/f004/integration/*.test.mjs
```

A future package script may wrap that focused command, but no F004 script exists now. Do not count a shell/F003-only desktop pass as F004. Preserve output in the existing owned F002 evidence area and add reviewed summary records to docs/qa/F004.md.

## Scenario walkthrough

| Step                      | Fixture/action                                                                                                                            | Expected observation                                                                                                                              | Source                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1. Ownership race         | Start the built candidate twice against the same isolated test profile, including 100 repeated concurrent trials.                         | One app lock holder/profile owner; contender performs zero profile jobs and activates/focuses the owner's window.                                 | A-01, A-03–A-04; ownership contract |
| 2. Profile isolation      | Open seeded synthetic profiles A and B in the one app owner, then activate A while B is focused.                                          | Two distinct profile contexts/windows/sessions; A activation never reveals or focuses B's content as A.                                           | A-02, A-10                          |
| 3. Bridge happy path      | Invoke named window.getState and window.minimize/restore from the authentic top-level view.                                               | Version/correlation and safe state match; only that window changes.                                                                               | A-05, A-16; bridge contract         |
| 4. Bridge negatives       | Submit unknown method/version/field, at/beyond bounds, proxy/accessor, forged webContents, iframe, wrong origin and stale window/context. | Every case rejects before native effect with bounded safe code; arbitrary SQL/file/shell/secret/raw IPC stays unavailable.                        | A-06–A-09, A-15                     |
| 5. Event cleanup          | Subscribe to lifecycle/link decision, then unsubscribe, close, navigate-deny, switch profile and revoke synthetic authority.              | No callback after invalidation; zero A/B cross-profile delivery.                                                                                  | A-10                                |
| 6. Application links      | Send home and hostile links at first launch and second launch; exercise macOS open-url on a native macOS target.                          | Only enabled home destination opens once in the right profile; malformed, duplicate, foreign, unsupported and protected record links safely deny. | A-11–A-13; link contract            |
| 7. External/nav negatives | Try unapproved HTTPS host, file/javascript/data/custom scheme, popup, subframe, redirect and remote script load.                          | No unapproved OS opener, new window or remote executable app content. Production F004 destination catalogue is empty.                             | A-14–A-15                           |
| 8. Lifecycle              | Minimize/restore/close/reopen/quit with keyboard and native controls; inject renderer/startup failure and synthetic in-flight work.       | Documented OS policy, safe recovery/interruption, no second owner, empty replacement or hidden timer claim.                                       | A-16–A-19                           |
| 9. Bilingual denial       | Review representative denied link/action in English and Arabic with keyboard-only focus and mixed-direction diagnostic ID.                | Same safe meaning/next step, no stack/path/secret; fluent Arabic quality review is recorded separately.                                           | A-22                                |
| 10. Native evidence       | Repeat applicable launch/link/window cases on each declared host; launch Linux from VS Code Snap integrated terminal when applicable.     | Actual expected/observed records for each target; unavailable target remains a gap.                                                               | A-20–A-21, A-23                     |

For scenario details and allowed outcomes, use the three contracts rather than inventing a new test interpretation. Tests should compare independent expected outcomes, not merely snapshots of the implementation.

## Evidence record

For each scenario, record:

- F004 requirement and acceptance IDs, SC target, candidate commit/build hash and relevant F003 contract/bounds version.
- Native OS/version/CPU/display/architecture, packaged-versus-built-development mode, locale and synthetic profile.
- Exact command or UI steps, injected failure/fixture, expected outcome, observed outcome, safe artifact path/hash, pass/fail and defect ID.
- Reviewer and date. For Arabic quality claims, identify a fluent reviewer; agent visual inspection alone is not that approval.
- Explicit missing Windows/macOS/Linux/Snap evidence, unresolved Q-04/Q-11 decision, or prerequisite failure as blockers.

The future F004 PR also needs docs/features/F004.md and docs/qa/F004.md, affected security/API/operations guidance and compatibility/recovery notes. Automated checks and agent QA precede the user's final PR approval; none of these steps alone means merged or released.

## Failure and repair

A forbidden native effect, wrong-profile disclosure, sandbox relaxation, remote executable content or unrecoverable protected-state claim blocks delivery. Preserve the failing fixture and redacted evidence, repair in the same future F004 PR, rerun the affected focused cases and the required baseline/native checks, and update observed results. If a native host is unavailable, leave its result unverified; do not infer it from Linux or source review. No implementation is rolled out or approved by following this planning guide.
