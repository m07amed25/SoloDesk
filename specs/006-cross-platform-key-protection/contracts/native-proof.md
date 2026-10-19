# Native Proof and F007 Handoff Contract

**Status**: Planned evidence contract. No target passes by virtue of this document.
**Trace**: FR-001–FR-013, A-01–A-17, SC-001–SC-007.

## Target declaration

Q-11 must declare the supported OS releases, CPU architectures, Linux desktop sessions, package forms and macOS/Windows signing conditions. Record each actual test environment. A matrix row may be `planned`, `blocked`, `failed` or `passed`; no row inherits a result from another OS, CPU or package mode.

## Minimum evidence for each row

| Evidence family        | Required observation                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build and legal        | Exact commit/build digest, Electron/native adapter versions and ABI, packaging/signing state, license/notice disposition                             |
| Positive protected use | Create, write, search, stage file, close, restart and byte-exact reopen with intended key                                                            |
| Raw surface inspection | Inventory every database/index/journal/temp/attachment/staging/rotation residue file after normal and abrupt exit; no readable fixture markers       |
| Key failures           | Locked, missing, denied, wrong key/identity and Linux unprotected backend where applicable; prior bytes unchanged and no plaintext/empty replacement |
| Key change             | Terminate/fail at each documented checkpoint; old or new complete version opens, and old key alone fails after committed completion                  |
| User recovery          | English/Arabic safe state and next action, keyboard access, truthful local-only versus cloud recovery limit                                          |
| Review                 | Expected versus observed result, fixture ID, commands/scenarios, redacted artifacts, defects, date, reviewer, Q-07/Q-11 disposition                  |

Use synthetic labeled fixtures only. A readable private fixture marker, usable key in evidence/logs, unprotected fallback, irreversible partial rotation or missing native result is a failed or blocked row, not a warning-only pass. A passing unit test or source inspection cannot upgrade a row to `passed`.

## F007 consumption gate

F007 may rely on the protection boundary only when Q-07 approves the chosen adapter, key policy and file format; the declared target rows pass; the license/distribution review is acceptable; and the interface/format version plus error and recovery rules are recorded. F007 must add its own atomic cache/outbox, migrations, permissions and corruption recovery evidence. F006 does not satisfy those later requirements by itself.
