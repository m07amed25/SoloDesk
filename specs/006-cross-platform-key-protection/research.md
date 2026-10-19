# Phase 0 Research: F006 Key Protection and Encryption Proof

**Date**: 2026-10-19
**Status**: Technical design direction resolved for planning; Q-07 and Q-11 remain approval/evidence gates, not assumed product decisions.

Research uses the repository's pinned Electron 44.8.0 and installed `better-sqlite3` 13.0.3 as of this plan. No dependency was installed and no native behavior was tested by this research.

## R-01 — Encrypted local database candidate

**Decision**: Evaluate a SQLCipher-compatible native SQLite adapter as the first proof candidate. Keep the adapter behind a narrow main-process boundary; do not treat installed `better-sqlite3` as encrypted or select the final adapter before Q-07 review and three-target native proof.

**Rationale**: SoloDesk's offline model expects SQLite-compatible transactions, while [SQLCipher's design](https://www.zetetic.net/sqlcipher/design/) describes encrypted database pages plus WAL and rollback/statement journals. Its [Electron guidance](https://www.zetetic.net/sqlcipher/sqlcipher-electron/) does not supply a turnkey current-Electron package; the published example targets an older Electron version. The [native module guidance](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules/) requires an Electron-target build and per-platform compatibility checks. The exact binding, Electron 44 ABI, packaging and signed distribution must therefore be demonstrated, not inferred.

**Alternatives considered**: Plain `better-sqlite3` fails NFR-005; selected-field encryption leaves pages/indexes/auxiliary files exposed; a custom codec would violate the no home-grown cryptography rule; a different encrypted SQLite adapter can be compared under the same proof and license gates if the initial candidate fails.

**Remaining gate**: Q-07 must approve the adapter, license/notice obligations, build/distribution path and fallback choice. [SQLCipher Community licensing](https://www.zetetic.net/sqlcipher/community/) and [commercial terms](https://www.zetetic.net/sqlcipher/license/) require explicit review for the chosen package and distribution.

## R-02 — Complete file-surface protection

**Decision**: Define the proof boundary as database pages, indexes, WAL/rollback journals, file-based temporary material, attachment/staging bytes and abandoned copies. Require file-based temp material to be prevented or protected, and inspect raw files after normal and forced exits. Attachment bytes need a separate reviewed authenticated protection format because database encryption alone does not cover them.

**Rationale**: [SQLCipher's design](https://www.zetetic.net/sqlcipher/design/) explicitly says some transient files are not encrypted. A database product claim cannot establish coverage for every file SoloDesk creates. A memory-only temporary-store configuration is a candidate mitigation, subject to native proof, workload bounds and crash inspection. Search/index behavior and journaling configuration also require verification with representative fixtures.

**Alternatives considered**: Assuming all SQLite transient files are encrypted is contradicted by the vendor design. Deleting plaintext temp files afterward cannot guarantee that bytes were never exposed. Field-only attachment encryption is inadequate if file names, thumbnails or staging copies reveal content.

**Remaining gate**: Q-07 security review selects the attachment format, key separation and temp policy. F007 later owns production file lifecycle and migration.

## R-03 — OS key protection and Linux downgrade

**Decision**: Use a main-process-only key-wrapping abstraction for the proof. Treat Electron `safeStorage` as a candidate wrapper for a generated data key, never as a database encryption adapter. Deny key creation/open when the chosen backend is unavailable, locked or unprotected. On Linux, reject `basic_text`; do not infer that merely seeing a secret service or a general availability flag proves protected storage.

**Rationale**: [Electron 44.8.0 safeStorage](https://raw.githubusercontent.com/electron/electron/v44.8.0/docs/api/safe-storage.md) encrypts strings through DPAPI on Windows, Keychain on macOS and desktop secret providers on Linux. Its `basic_text` Linux backend uses a hardcoded plaintext password. The asynchronous API has additional provider/fallback behavior, so the selected provider needs direct native observation. Windows protection is at OS-user granularity; this is not a defense against arbitrary same-user processes. Stable macOS signing is relevant to Keychain continuity.

**Alternatives considered**: Storing the data key in a config file or relying on an unprotected Linux fallback violates A-10. A user passphrase-derived unlock may be an approved alternative under Q-07, but its derivation parameters, usability and recovery must be security-reviewed and proved; it is not a silent fallback.

**Remaining gate**: Q-07 chooses wrapping/unlock policy and local-only recovery terms. Q-11 declares the OS/CPU/session/signing matrix to test.

## R-04 — Key change and failure recovery

**Decision**: Plan a two-version, restart-safe proof: prepare a new encrypted candidate, verify it with the new key, atomically select the completed candidate, then retire the old access path. A fail point at every transition must leave either the intact old version or the verified new version. The durable selector and key references must not reveal usable keys.

**Rationale**: [SQLCipher's rekey API](https://www.zetetic.net/sqlcipher/sqlcipher-api/) exposes a key-change operation, but that alone does not prove crash-atomic coordination with the OS key wrapper, attachment files or manifest. The project [security rule](../../docs/architecture/security-and-privacy.md) requires a failure to preserve the prior decryptable version. An account password reset cannot restore a lost local data key.

**Alternatives considered**: In-place rekey with early deletion of the old key risks irrecoverable partial state; a plaintext export/import stage violates the at-rest guarantee. A backup flow belongs to F025/F026, not this proof.

**Remaining gate**: Actual algorithm, key hierarchy, rotation metadata and recovery options require Q-07 review. The proof must test power-loss-equivalent process termination and disk-full/permission failures at stages; no crash-safety result is asserted here.

## R-05 — Desktop integration and native evidence

**Decision**: Keep key and file operations in the trusted main-process layer. Expose only closed, safe status and recovery actions through F004's checked preload boundary if UI needs them. Reuse F002's verification/evidence pipeline, add focused F006 suites and packaged native trials for every declared target. A target stays blocked until its own passing record exists.

**Rationale**: F004 already enforces sender, frame, origin and profile epoch on bridge calls; the renderer must not receive filesystem paths, raw keys or generic encryption operations. [Electron's native-module guidance](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules/) and [Forge's build lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle) explain rebuild responsibility, but do not prove this project's candidate works on all targets. Q-11 remains the owner of exact supported versions and architectures.

**Alternatives considered**: Renderer-side database access violates the constitution. A Linux development run cannot substitute for Windows/macOS packaged evidence. A separate new test framework would duplicate the F002 harness without resolving native risk.

## Research disposition

The technical path for a reviewable proof is clear, and no design-template placeholder remains unresolved. The **final technology approval and native support promise remain open**: Q-07 and Q-11 must be resolved before protected persistence is relied upon by F007 or asserted ready for release. Research decisions above are proof-design choices, not passed tests or owner approvals.
