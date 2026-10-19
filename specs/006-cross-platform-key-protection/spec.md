# Feature Specification: F006 — Cross-Platform Key Protection and Encryption Proof

**Feature Branch**: `feat/f006-cross-platform-key-protection-and-encryption-proof` (proposed in the root plan; no branch created here)

**Created**: 2026-10-19

**Status**: Draft — specification only; implementation and release require separate evidence and approval

**Input**: User description: "Build a full specs for F006 in plan.md"

**Feature / Milestone**: F006 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: F004 secure desktop lifecycle and privilege boundary. F007 depends on F006 before persisting account or workspace data.

**Parent requirements**: PLT-007 and NFR-005. Supporting constraints: D-02, D-03, D-15, D-17, A-02, A-10, and Constitution Principles II, V, VI, VII and VIII.

**Authority**: [F006 card](../../plan.md#f006), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [data lifecycle](../../docs/architecture/data-lifecycle.md), [requirements](../../docs/product/requirements.md), [decisions](../../docs/planning/decisions.md), [acceptance](../../docs/quality/acceptance.md), [test strategy](../../docs/quality/test-strategy.md), and [constitution](../../.specify/memory/constitution.md).

F006 qualifies a protected local data path on Windows, macOS and Linux. A person must be able to trust that copied application files do not reveal cached work, and must receive an honest recovery path when device protection cannot be used. This feature proves encryption and key handling with synthetic data. F007 owns the full local cache, schema, transactions and migrations; F010/F015 own sign-in and enrollment; F016 owns offline authorization policy; F025/F026 own backup and restore workflows. F006 does not assert that those later capabilities are complete.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Protect local work throughout its lifecycle (Priority: P1)

As a freelancer or team member, I need local records and staged files to remain unreadable if someone copies the device's application files, including files created during work or left after an abrupt exit.

**Why this priority**: Local confidentiality is a confirmed condition for offline work. Protecting only the main record file leaves private content in auxiliary files.

**Independent Test**: On each target operating system, store distinctive synthetic records and files, exercise reads, searches, writes and abrupt exit, then inspect all resulting application-managed data surfaces without the key. Reopen the same fixture with the intended key.

**Acceptance Scenarios**:

1. **A-01**: **Given** an approved protection path, **When** a synthetic record is stored and reopened, **Then** the authorized session reads unchanged content and raw copied files reveal neither its content nor a usable unprotected data set.
2. **A-02**: **Given** records with distinctive private search terms, **When** writes, searches and normal or abrupt closes occur, **Then** database pages, indexes, journals, write-ahead data, temporary data and recoverable side files contain no readable fixture content.
3. **A-03**: **Given** an attachment is staged locally, **When** staging is interrupted or completed, **Then** pending and retained bytes remain protected at rest and the authorized session recovers the original bytes intact.
4. **A-04**: **Given** a protection path that passes in development, **When** it is exercised in packaged native applications on Windows, macOS and Linux, **Then** each target demonstrates the same protected write, reopen and failure behavior or its feature gate remains unmet.

---

### User Story 2 - Refuse unsafe storage and explain the block (Priority: P1)

As a user whose device vault is locked, missing or unprotected, I need SoloDesk to stop protected persistence and tell me how to regain access without creating an empty replacement or storing private data in plain text.

**Why this priority**: A hidden downgrade defeats encryption expectations and can lose unsynced work.

**Independent Test**: Repeat first use, reopen and write attempts with a locked vault, removed key, denied access and an unprotected Linux secret store. Inspect disk state and English/Arabic recovery guidance.

**Acceptance Scenarios**:

1. **A-05**: **Given** a protected local data set and an unavailable or locked key, **When** it is opened, **Then** the data remains unchanged and inaccessible, no empty replacement is created, and a locked or recovery-required state offers a safe next action.
2. **A-06**: **Given** only unprotected secret storage, including Linux `basic_text`, **When** protected data would be created or unlocked, **Then** that path is rejected; an alternative unlock method requires explicit security approval and equivalent protection proof.
3. **A-07**: **Given** protection becomes unavailable during a write or restart, **When** the operation fails, **Then** no plaintext copy, temporary file or key is left behind and the last committed protected data remains available after safe access returns.
4. **A-08**: **Given** a blocking key or storage error, **When** the user changes language, **Then** the state and recovery choices remain equivalent in English and Arabic and are usable with keyboard and assistive access.

---

### User Story 3 - Keep keys tied to the right device and data (Priority: P1)

As a person sharing a computer or switching accounts, I need each protected data set to open only under its intended local identity so another profile cannot expose my cached work.

**Why this priority**: Device encryption has limited value if keys can be substituted, reused across accounts or exposed through ordinary application storage.

**Independent Test**: Create two synthetic identities on one device; copy files between profiles and test key substitution, account switching and restart. Inspect user-accessible files and diagnostics for key material.

**Acceptance Scenarios**:

1. **A-09**: **Given** two local identities, **When** one opens, copies or substitutes the other's protected files or key reference, **Then** the other's content is not disclosed or adopted.
2. **A-10**: **Given** a device key in use, **When** the application locks or closes the data set, **Then** further protected reads and writes require valid unlock and ordinary files, logs, diagnostics and support artifacts contain no usable key.
3. **A-11**: **Given** a restart and the intended key still available, **When** the correct profile reopens, **Then** only its original data opens without plaintext recovery material.

---

### User Story 4 - Recover safely from rotation, interruption and key loss (Priority: P1)

As a user with locally unsynced work, I need a key change or failure to preserve the last decryptable version, and I need a truthful explanation of what can and cannot be recovered after key loss.

**Why this priority**: Losing the only local key may permanently affect work that never reached the cloud. A password reset is not a substitute for that key.

**Independent Test**: Interrupt key change before, during and after its commit boundary; restart each time. Remove the sole key and review recovery guidance.

**Acceptance Scenarios**:

1. **A-12**: **Given** protected test data, **When** key change is interrupted at any recorded stage, **Then** restart can open the intact prior version or the completed new version, never an unreadable partial version or empty replacement.
2. **A-13**: **Given** key change completed, **When** only the old key is supplied, **Then** it cannot open the new version, while the intended current key recovers all committed content.
3. **A-14**: **Given** loss of the sole local key, **When** recovery is entered, **Then** guidance does not promise to decrypt local-only work through account password reset; it explains surviving-device or separately protected backup options, if available, and that cloud-authoritative data can be fetched again after identity recovery.

---

### User Story 5 - Make the protection decision reviewable (Priority: P2)

As an engineering and security reviewer, I need comparable native evidence for all three platforms before protected persistence depends on the chosen path.

**Why this priority**: A source-level test or one operating-system run does not establish native compatibility or fail-closed behavior for all supported desktops.

**Independent Test**: Review proof records for each platform, including build, environment, key path, positive and negative cases, raw-file inspection, interruption, licensing/distribution status, defects and reviewer decisions.

**Acceptance Scenarios**:

1. **A-15**: **Given** a candidate local protection path, **When** reviewers assess the proof, **Then** evidence covers packaged native operation, restart, locked/missing keys, rejected unprotected storage, raw files, interrupted key change and recovery on Windows, macOS and Linux.
2. **A-16**: **Given** a target without a passing approved key path or acceptable distribution/license position, **When** proof is reviewed, **Then** that target remains blocked for protected persistence rather than inheriting another target's result.
3. **A-17**: **Given** unresolved Q-07 or Q-11 choices, **When** F006 is considered for dependent work or release, **Then** the owner, impact and required decision are explicit in the proof record.

### Edge Cases

- An existing protected data set remains after vault lock, key removal, account switch, crash, low disk space or denied file access. None may trigger an empty replacement or plaintext downgrade.
- Journals, search indexes, file staging, crash artifacts and abandoned temporary files may outlive a normal session; they remain within the inspection boundary.
- A key reference points to another account or stale material after rotation; access fails without overwriting either data set.
- A Linux secret service exists but reports unprotected `basic_text`; service presence alone is not proof of protection.
- Native behavior differs across OS releases, CPU architectures, desktop sessions or signed builds; development success does not establish support for an untested combination.
- Cloud-recoverable records and locally unsynced work have different recovery limits; guidance must distinguish them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The feature MUST demonstrate a protected local data path for each approved desktop target before F007 uses it for account or workspace data. Acceptance: A-01, A-04.
- **FR-002**: The path MUST keep record contents, search/index content and database auxiliary, recoverable temporary and write-ahead content unreadable from raw application-managed files without the intended key. Acceptance: A-01, A-02.
- **FR-003**: Locally staged and retained attachment test files MUST remain unreadable without the key and round-trip without byte changes when authorized. Acceptance: A-03.
- **FR-004**: Usable data keys MUST have approved device-bound or user-unlocked protection and MUST NOT appear as readable values in ordinary files, logs, support artifacts or crash diagnostics. Acceptance: A-10.
- **FR-005**: The path MUST fail closed when key protection is locked, unavailable, denied, missing or unprotected; it MUST NOT create an empty substitute or plaintext fallback. Acceptance: A-05, A-07.
- **FR-006**: An unprotected Linux `basic_text` path MUST be refused. Any alternative user-unlock path is conditional on Q-07 security approval and equivalent proof. Acceptance: A-06.
- **FR-007**: Protected data and keys MUST remain isolated by local identity and data set; swapping, copying or reusing one identity's material MUST NOT disclose another's content. Acceptance: A-09, A-11.
- **FR-008**: A locked data set MUST deny protected reads and writes until valid unlock while preserving its last committed protected state. Acceptance: A-05, A-10.
- **FR-009**: The key-change proof MUST preserve a decryptable prior or completed version after interruption, validate the new version before retiring old access, and reject old-key-only access after completion. Acceptance: A-12, A-13.
- **FR-010**: Missing-key guidance MUST distinguish cloud-refetchable data from locally unsynced work requiring a surviving key or separately protected backup; it MUST NOT claim password reset decrypts local-only work. Acceptance: A-14.
- **FR-011**: Lock, failure and recovery states MUST be understandable and operable in English and Arabic, including keyboard and assistive access. Acceptance: A-08.
- **FR-012**: Proof records MUST identify each tested OS/CPU combination, packaged build, protection mode, expected and observed results, raw-file inspection, restart/interruption results, license/distribution review, defects and reviewers. Acceptance: A-15, A-16.
- **FR-013**: A target without passing native/security evidence MUST remain blocked for protected persistence; unresolved Q-07/Q-11 decisions MUST be visible and cannot count as approval. Acceptance: A-16, A-17.

### Key Entities

- **Protected data set**: Synthetic local records and files for one test identity, with protection state and last committed version.
- **Device key binding**: The approved association between local identity, protected data set and usable key; tracks availability and rotation state without exposing secret material.
- **Staged file**: A local attachment candidate whose protected bytes and recovery status remain testable before later upload work.
- **Protection proof record**: Per-target evidence of positive, negative and interruption cases, environment, build identity, findings and reviewer disposition.
- **Recovery state**: A visible locked or recovery-required condition with a reason category and safe next action.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On every target operating system approved for F006, 100% of prescribed synthetic records and staged files reopen unchanged with the intended key after normal and abrupt restart.
- **SC-002**: In 100% of prescribed raw-file inspections across the three target systems, distinctive fixture content is absent from readable record, index, journal, temporary and staged-file surfaces.
- **SC-003**: In 100% of locked, missing, denied and unprotected-key trials, protected persistence is blocked without plaintext or empty replacement and the prior committed data remains intact.
- **SC-004**: At every recorded key-change interruption point, at least one complete decryptable version survives; after successful completion, the prior key alone opens zero protected data sets.
- **SC-005**: All tested account-switch and key-substitution cases disclose zero records from the other synthetic identity.
- **SC-006**: Every target proposed as supported has a reviewable proof record covering all required cases and zero unresolved critical protection failures before F007 depends on it.
- **SC-007**: In bilingual recovery review, at least 9 of 10 English and 9 of 10 Arabic participants identify the safe next action and local-only recovery limit; every tested path is completable by keyboard.

## Assumptions

- F006 is a qualification proof using synthetic data. It does not enroll real users, persist business records, implement full local migrations, create backups or authorize cloud access.
- F004's secure desktop boundary hosts the proof. F007 consumes its approved outcome and owns durable cache, transactions and migrations.
- Windows, macOS and Linux are confirmed; exact minimum releases, CPU variants and signing/distribution combinations remain Q-11. Evidence records the actual matrix and blocks untested targets.
- Q-07 remains an engineering/security decision gate for the final encryption component, license, key wrapping, any Linux alternative and local-only recovery. This specification sets required outcomes without selecting an implementation or promising recovery without a surviving key.
- Application-controlled storage surfaces are within the proof boundary. The feature does not promise secure erasure of copied files, system backups or already exfiltrated data; security review must document these limits.
- English/Arabic recovery text is required even if full account recovery arrives later. Unavailable actions must say so plainly.
