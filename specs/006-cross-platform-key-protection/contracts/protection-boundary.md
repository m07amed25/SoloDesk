# Protection Boundary Contract

**Status**: Planned F006 internal boundary; no implementation claim.
**Trace**: FR-001–FR-008, FR-011; A-01–A-11.

## Ownership

- Trusted main-process protection owner holds key references, opens the candidate encrypted data set, stages protected files and performs raw-file inventory. The renderer and preload never receive raw keys, plaintext storage paths, arbitrary SQL or generic file/encryption commands.
- The owner accepts only an app-established local identity/profile context from F004. A caller-supplied data-set ID or workspace ID cannot grant access.
- If a user-facing control is needed, extend F004's closed versioned bridge with named status/retry/lock actions. Main repeats exact sender/frame/origin/profile-epoch checks for every call. A status result contains only a safe state, reason category, permitted next action and correlation ID.

## Internal operation outcomes

| Operation                             | Successful outcome                                                                         | Denied/unavailable outcome                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `createSyntheticDataSet(context)`     | New identity-bound protected fixture generation, after approved key protection is verified | `protection_unavailable`; no file/key set is created                                                            |
| `openProtected(context, binding)`     | Authenticated existing generation for exact identity                                       | `locked`, `key_missing`, `wrong_identity`, `integrity_failed` or `unsupported_format`; existing bytes unchanged |
| `writeSyntheticRecord(context, data)` | Complete protected commit visible after reopen                                             | `not_applied` only when proved; otherwise `outcome_unknown` with recovery validation, never plaintext fallback  |
| `stageSyntheticFile(context, bytes)`  | Sealed authenticated bytes, exact round-trip                                               | Rejected/interrupted stage remains protected and is never exposed as complete                                   |
| `lockProtected(context)`              | Current read/write lease ends; later operations require unlock                             | Idempotent locked state; do not discard encrypted data                                                          |

These are design-level operations, not renderer or public APIs. Concrete parameter types and cryptographic primitives follow Q-07 approval. A call cannot expose a raw storage directory or key handle to a renderer.

## File-surface invariant

For each test, inventory the main database, search/index content, WAL/rollback/statement journals, temp stores, staged/retained attachments, rotation candidates and abandoned crash residue. Plaintext fixture markers must be absent from every surviving application-controlled raw file. A candidate that creates unprotected file-based temp output fails. An encrypted database header alone is insufficient proof; the authorized round-trip and wrong-key rejection must both succeed.

## Failure and diagnostic rules

- Key store locked/missing/denied, Linux `basic_text`, unsupported format, corrupt header or wrong identity fail before opening an empty replacement or mutating the prior generation.
- Do not log usable keys, passphrases, record text, full paths, staged bytes or raw crash memory. Diagnostics use reason codes and redacted correlation IDs.
- Error messages have equivalent English/Arabic meaning and a reachable keyboard action. Locally unsynced work is never declared recovered by account password reset.
- F007 may consume this contract only after Q-07 approval and the [native proof gate](native-proof.md) for its declared targets.
