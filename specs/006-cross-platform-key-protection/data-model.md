# Data Model: F006 Protection Proof

**Status**: Phase 1 design. These are proof-only logical entities and metadata, not a production customer schema. F007 owns production persistence.

## ProtectedDataSet

| Field               | Meaning / rule                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `dataSetId`         | Opaque local identifier; unique and never accepted as authorization by itself.                                                  |
| `identityBindingId` | Stable opaque binding to the intended local identity/profile.                                                                   |
| `formatVersion`     | Explicit protected-format version; unknown versions open recovery/upgrade state, not an empty replacement.                      |
| `activeGeneration`  | Identifier of the last verified committed encrypted generation.                                                                 |
| `state`             | `sealed`, `unlocked`, `locked`, `rotation_pending` or `recovery_required`.                                                      |
| `fixtureDigest`     | Test-only expected content digest kept outside customer data; never a substitute for authenticated decryption/integrity checks. |

Contains synthetic record/index content and zero or more `ProtectedStagedFile` records. A data set has exactly one active generation. Its marker/metadata must not contain plaintext fixture terms or usable key material.

## DeviceKeyBinding

| Field                            | Meaning / rule                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `bindingId`                      | Opaque reference to an approved protected key entry.                              |
| `identityBindingId`, `dataSetId` | Exact pair the key may open; mismatch denies before file mutation.                |
| `generation`                     | Protected data generation served by this binding.                                 |
| `providerClass`                  | Reviewed protected OS/user-unlock class; `unprotected` is never valid for access. |
| `availability`                   | `available`, `locked`, `missing`, `denied` or `unprotected`.                      |

The model contains references and state only. Raw keys and recovery secrets are never serialized into the ordinary data model, logs or proof records. A lost binding does not authorize a fresh key to overwrite the same data set.

## ProtectedStagedFile

| Field                         | Meaning / rule                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `fileId`                      | Opaque local identifier bound to one data set and identity.                                   |
| `generation`                  | Protection generation required to read bytes.                                                 |
| `lifecycle`                   | `staging`, `sealed`, `interrupted` or `rejected`.                                             |
| `byteCount`, `expectedDigest` | Test-only round-trip and completeness checks; no customer filename/content in proof metadata. |

An interrupted stage must remain encrypted or be removed without exposure; it cannot be treated as a completed attachment. F023 later owns real attachment semantics.

## RotationAttempt

| Field                            | Meaning / rule                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `attemptId`                      | Unique attempt identifier for fault injection and proof trace.                                        |
| `fromGeneration`, `toGeneration` | Old committed and new candidate versions; both belong to the same identity/data set.                  |
| `phase`                          | `prepared`, `candidate_written`, `candidate_verified`, `selected`, `retired` or `recovery_required`.  |
| `validationResult`               | Records whether the new database and staged files were fully authenticated/readable before selection. |

Transition order is monotonic. Before `selected`, the old generation remains the active decryptable version. After `selected`, the new generation must be complete and decryptable. Old key retirement cannot precede verification and selector commitment. Failure at an unknown point requires recovery validation of both candidates; never assume one succeeded.

## RecoveryState

| Field             | Meaning / rule                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reason`          | Closed category: `vault_locked`, `key_missing`, `protection_denied`, `unprotected_backend`, `integrity_failed`, `interrupted_rotation`, `unsupported_format`. |
| `dataDisposition` | `intact_locked`, `prior_generation_available`, `new_generation_available` or `unverified`. No `lost` claim without evidence.                                  |
| `nextAction`      | Closed safe action such as retry unlock, restore provider, contact support or inspect surviving backup/device.                                                |
| `localeKey`       | Stable English/Arabic message identity; no raw path, key, fixture or private content.                                                                         |

Account password reset is not represented as a local decrypt action. Cloud refetch is a later authorized identity flow and cannot be presented as recovery of unsynced local bytes.

## ProtectionProofRecord

| Field                                                                     | Meaning / rule                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `candidateId`, `buildCommit`, `buildDigest`                               | Exact candidate and executable identity.                                                           |
| `os`, `osRelease`, `cpu`, `desktopSession`, `packageMode`, `signingState` | Actual native environment; values not observed remain `unverified`.                                |
| `adapterVersion`, `formatVersion`, `providerClass`                        | Reviewed compatibility context, excluding secrets.                                                 |
| `scenarioIds`, `fixtureId`, `fileInventory`, `expected`, `observed`       | Trace to A-01–A-17 and exact redacted evidence.                                                    |
| `licenseDisposition`, `defects`, `reviewer`, `reviewedAt`                 | Required decision trail.                                                                           |
| `status`                                                                  | `planned`, `failed`, `blocked` or `passed`; `passed` requires all mandatory cases for that target. |

A proof record never contains usable keys, customer content or full unredacted fixture bytes. A target pass does not confer a pass on another target.

## Invariants and transitions

1. ProtectedDataSet and DeviceKeyBinding are one-to-one per active generation; identity/data-set mismatch denies access.
2. `locked` and `recovery_required` deny protected reads/writes and never create a new empty data set at the old path.
3. `unprotected` provider class cannot transition to `unlocked`; Linux `basic_text` maps to this class.
4. A file is readable only when `sealed`, authenticated and bound to the current authorized generation.
5. Rotation may expose at most one selected generation; the unselected prior generation remains available until new-version verification and durable selection succeed.
6. A target's proof status can become `passed` only after native packaged, negative, file-surface, interruption, license and reviewer evidence is complete.

See [key lifecycle](contracts/key-lifecycle.md), [protection boundary](contracts/protection-boundary.md) and [native proof](contracts/native-proof.md) for interface and evidence rules.
