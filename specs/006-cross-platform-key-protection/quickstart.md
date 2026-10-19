# Quickstart Validation Guide: F006

**Status**: Phase 1 validation plan, not executed F006 evidence. Use synthetic data only. See [specification](spec.md), [data model](data-model.md) and [native proof contract](contracts/native-proof.md).

## Prerequisites

1. Work from the repository root with the Node version required by `package.json`, installed lockfile dependencies and the F004 desktop boundary available.
2. Agree Q-07 proof criteria and candidate license review with engineering/security before evaluation; final Q-07 approval follows successful proof. Any Linux alternate unlock requires security approval before use. Obtain a provisional Q-11 native OS/CPU/session/package/signing test matrix and access to each target; final support approval follows evidence.
3. Use a disposable test profile and uniquely labeled synthetic fixtures. Do not use customer data, real credentials or production key stores for destructive fault injection.
4. Record the candidate commit, build digest, dependency and format versions before every run. Keep all output redacted.

## Existing baseline commands

These commands exist today and check the repository baseline; **none proves F006 encryption**:

```bash
node -v
npm -v
npm run typecheck
npm run lint
npm run build
npm run test:f004
npm run test:desktop
```

Run them on each relevant native host after the candidate is implemented. A test runner can fail or be unavailable in a restricted environment; record the actual outcome, not an inferred pass. The planned F006-focused command (`npm run test:f006`) and native fixture tooling must be added during authorized implementation before they can be run.

## Validation sequence for the future F006 candidate

1. **Declare environment**: Capture OS/release, CPU, Linux session and key backend when applicable, package/signing state, Electron/native adapter ABI, build digest and Q-07/Q-11 disposition. If the target is outside the approved matrix, mark it blocked.
2. **Protected round-trip (A-01–A-04)**: In the disposable profile, create synthetic records containing distinct English, Arabic and mixed markers; build a search index; stage a binary file; close and reopen normally, then repeat after forced process exit. Compare exact record/file contents and query results. Inventory every application-controlled file listed in [protection boundary](contracts/protection-boundary.md), scanning raw bytes without a key. Expected: no readable marker, no usable plain database, intact authorized data.
3. **Unsafe key states (A-05–A-08)**: Lock and remove access to the approved key provider, deny permission and present an unprotected Linux `basic_text` backend. Attempt first creation, reopen and write. Compare file inventory/hashes before and after each failure. Expected: no plaintext file, no empty substitute, prior encrypted bytes intact, explicit English/Arabic guidance and keyboard-accessible recovery action.
4. **Identity isolation (A-09–A-11)**: Create synthetic A and B data sets, swap copied database/files and wrapped-key references, switch profiles and restart. Expected: neither identity reads the other's data; ordinary logs and evidence reveal no usable key; correct identities still reopen their own unchanged data.
5. **Key change and loss (A-12–A-14)**: Terminate at every checkpoint in [key lifecycle](contracts/key-lifecycle.md), including low-space and denied-write stages; restart and validate both candidate generations. After a successful change, test old-key-only access. Then remove the sole local key from a disposable fixture. Expected: one complete decryptable generation survives each interruption, old key alone fails after completion, and recovery guidance accurately separates cloud-refetchable from local-only data.
6. **Native acceptance (A-15–A-17)**: Repeat the applicable cases in the packaged application for every Q-11 matrix row, including macOS Keychain/signing continuity and Windows credential behavior; on Linux include approved/unprotected/locked secret-store states and declared desktop sessions. Record exact expected/observed results, failures and reviewer. A row without direct native evidence remains blocked.
7. **Bilingual review (SC-007)**: Conduct at least ten English and ten Arabic comprehension trials of the recovery message and next action, plus keyboard-only completion of each offered path. A fluent Arabic reviewer checks phrasing. Count successful identification of the local-only recovery limit; target at least nine per language.

## Evidence and stopping rules

Use the [proof record](data-model.md#protectionproofrecord) for each target and map results to FR-001–FR-013, A-01–A-17 and SC-001–SC-007. Attach redacted file inventories, marker-scan outputs, hashes, screenshots and native logs without keys, customer text or secret-store dumps. Preserve failed attempts and defects.

Stop and mark the target failed or blocked for any readable fixture marker, unprotected fallback, usable key in logs, altered prior data after failure, partial unreadable rotation, missing license approval or absent native observation. Do not hand F006 to F007 until the [consumption gate](contracts/native-proof.md#f007-consumption-gate) passes. Owner approval, merge and release remain separate root-plan gates.
