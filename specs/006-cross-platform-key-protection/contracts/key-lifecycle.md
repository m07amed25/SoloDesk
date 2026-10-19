# Key Lifecycle and Recovery Contract

**Status**: Planned F006 proof state machine; final provider/algorithm/recovery policy remains Q-07.
**Trace**: FR-004–FR-010, FR-011; A-05–A-14.

## State admission

| Current state       | Event                                                  | Next state / required result                                                                     |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| No data set         | Approved protected provider and new synthetic identity | `sealed`; create only after key binding succeeds                                                 |
| No data set         | Missing/locked/denied/unprotected provider             | `recovery_required` or creation blocked; no protected file or plaintext substitute               |
| `sealed` / `locked` | Correct identity and available protected key           | `unlocked` only after authenticated data validation                                              |
| `sealed` / `locked` | Wrong identity/key, missing key or integrity failure   | `recovery_required`; bytes unchanged                                                             |
| `unlocked`          | Explicit lock/close                                    | `locked`; further reads/writes denied                                                            |
| `unlocked`          | Provider becomes unavailable                           | `locked` or `recovery_required`; committed data unchanged                                        |
| `unlocked`          | Begin approved key change                              | `rotation_pending`; prior generation remains decryptable                                         |
| `rotation_pending`  | Verified new generation and durable selection          | `unlocked` on new generation; old-key-only access denied after retirement                        |
| `rotation_pending`  | Crash, low space or denied write                       | Revalidate generations on restart; open only a complete verified one or show `recovery_required` |

Key handles are scoped to the trusted owner lifetime and exact local identity/data set. Account switching revokes access to the previous handle; it does not delete or rewrite the previous encrypted bytes. A copied wrapped key or data file in another profile cannot be accepted solely because it decrypts; identity binding must also match.

## Key-change checkpoint order

1. Confirm old generation decrypts and all staged files are accounted for.
2. Establish a new protected key binding without removing the old one.
3. Write a complete new encrypted candidate data set and protected files.
4. Authenticate/read back the candidate and verify fixture counts/digests.
5. Durably select the new generation.
6. Retire old access only after selection is re-readable.

Inject termination and storage failure before/after each checkpoint. A restart must find the old or new verified generation; it must never assume an incomplete candidate is current. The exact mechanism is chosen after Q-07 review and native testing.

## Recovery truth

- `vault_locked`: retry OS/user unlock; leave encrypted bytes intact.
- `key_missing`: explain that a surviving device or separately protected backup key may be needed for unsynced work. Cloud identity recovery may permit refetch of data that reached the service; it does not decrypt missing local-only data.
- `unprotected_backend`: explain protected storage is unavailable and do not offer a silent plaintext mode. A user-unlock alternative appears only if Q-07 approved and proved.
- `integrity_failed` or `interrupted_rotation`: preserve both candidate generations and present an explicit review/recovery path; do not overwrite with an empty data set.

Recovery presentation is bilingual and keyboard accessible. This contract does not implement account recovery, device enrollment or backup restore.
