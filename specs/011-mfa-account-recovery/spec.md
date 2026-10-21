# Feature Specification: F011 — MFA and Account Recovery

**Feature Branch**: `feat/f011-mfa-and-account-recovery`

**Created**: 2026-10-21

**Status**: Draft — specification only; implementation and delivery claims require separate evidence and approval

**Input**: User description: "Create a spec for F011 from `/home/mohamed-s/Desktop/SoloDesk/plan.md`"

**Feature / Milestone**: F011 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: F010 browser sign-in and native enrollment. F011 uses F010's verified account, protected local profile, and trusted hosted identity boundary without redefining them.

**Parent requirement**: PLT-002. Supporting constraints: NFR-004–NFR-007, NFR-010, NFR-012, D-02, D-10, D-11, D-15, D-17, A-01, A-10, Q-07, Q-08, and Constitution Principles I–III and V–VIII.

**Authority**: [F011 card](../../plan.md#f011), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [account workflow](../../docs/product/workflows.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [acceptance](../../docs/quality/acceptance.md), [test strategy](../../docs/quality/test-strategy.md), [decisions](../../docs/planning/decisions.md), and [constitution](../../.specify/memory/constitution.md).

F011 lets a verified SoloDesk account enroll and use a configured additional authentication factor, retain one-time recovery codes, reauthenticate before sensitive account-security changes, and recover cloud account access after a lost session, password, or factor. Every recovery result must be explicit about which sessions changed and what the user must do next.

Account recovery restores verified cloud identity only. It does not recreate a missing device-encryption key, decrypt an unreadable local profile, assign local unsynchronized work to another account, restore revoked workspace authority, or prove that data absent from the cloud can be recovered.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enroll a Configured Additional Factor (Priority: P1)

As a verified account holder, I can enroll an approved additional factor and save one-time recovery codes so that my account has the protection required by the current identity policy without risking an incomplete setup.

**Why this priority**: A factor must be verified and its recovery path understood before the product can rely on it during sign-in or sensitive actions.

**Independent Test**: Sign in to a verified test account, begin factor enrollment, verify the factor, acknowledge the newly issued recovery codes, and sign in again using the factor. Repeat with an interrupted setup and an invalid verification response; only the fully completed setup may become active.

**Acceptance Scenarios**:

1. **A-01 — Apply the configured policy**: **Given** an enrolled account and the current approved identity policy, **When** the security setup is opened, **Then** the user sees whether an additional factor is required or optional, which approved enrollment choices are available, and what actions remain unavailable until required setup is complete.
2. **A-02 — Require recent identity proof**: **Given** a signed-in user whose recent identity proof is absent or too old for security changes, **When** factor enrollment begins, **Then** the user must reauthenticate before enrollment material or recovery codes are issued.
3. **A-03 — Verify before activation**: **Given** a pending factor enrollment, **When** the user supplies valid proof from that factor within the allowed attempt, **Then** the factor is marked verified but is not represented as fully recoverable until the recovery-code acknowledgment is completed.
4. **A-04 — Complete recovery-code handoff**: **Given** a newly verified factor, **When** the user is shown one fresh recovery-code set and acknowledges that it has been saved, **Then** the factor becomes active and the codes cannot be displayed again.
5. **A-05 — Preserve the previous security state on failure**: **Given** enrollment is cancelled, expires, is interrupted, or fails verification, **When** the account security state is reviewed, **Then** the incomplete factor grants no authentication authority and any previously active factor and recovery path remain unchanged.
6. **A-06 — Avoid duplicate activation**: **Given** the same enrollment completion is delivered twice or concurrently, **When** both results are processed, **Then** at most one active factor and one current recovery-code set result.

---

### User Story 2 - Complete an MFA Challenge Safely (Priority: P1)

As an account holder subject to an additional-factor challenge, I can prove possession of my enrolled factor and continue the exact sign-in or reauthentication attempt without another account or replay gaining access.

**Why this priority**: The enrolled factor has value only if every challenge is bound to the intended account and attempt and fails safely under replay, expiry, revocation, and repeated guesses.

**Independent Test**: Challenge an account with an active factor during sign-in and reauthentication. Verify one valid response continues the intended attempt, while wrong, expired, replayed, cross-account, rate-limited, and revoked-session responses produce no authority.

**Acceptance Scenarios**:

1. **A-07 — Complete the matching challenge**: **Given** one live challenge for account A and a permitted sign-in or reauthentication attempt, **When** account A supplies valid current factor proof, **Then** only that attempt advances and the proof cannot authorize a different attempt or account.
2. **A-08 — Reject invalid or replayed proof**: **Given** missing, malformed, incorrect, expired, already consumed, or superseded proof, **When** verification is attempted, **Then** no session or sensitive action is authorized and the response does not reveal secret factor data.
3. **A-09 — Bound repeated failures**: **Given** repeated invalid challenge attempts, **When** the configured safe limit is reached, **Then** further attempts are delayed or blocked according to the approved policy, the account is not disclosed to an unauthenticated observer, and the user receives a usable recovery path.
4. **A-10 — Respect session revocation**: **Given** the originating session or security generation is revoked while a challenge is pending, **When** otherwise valid proof arrives, **Then** the stale attempt is rejected and cannot recreate the revoked authority.
5. **A-11 — Require online authority**: **Given** the identity service cannot be reached, **When** an MFA challenge or security reauthentication is required, **Then** the app does not accept a local guess or cached success and explains that the action requires connectivity.

---

### User Story 3 - Recover Cloud Account Access (Priority: P1)

As an account holder who lost a session, password, or enrolled factor, I can use an approved one-time recovery path to regain my verified cloud account and understand which sessions and local data remain accessible.

**Why this priority**: Recovery is an alternate authentication boundary and must resist replay and account takeover while clearly separating cloud identity recovery from device-key and unsynchronized-data recovery.

**Independent Test**: Recover an account once with an unused recovery code and once through the configured lost-credential recovery path. Repeat with expired, replayed, changed, wrong-account, and concurrent recovery evidence; only one valid attempt may change the account security state, and it must not unlock a profile whose local key is unavailable.

**Acceptance Scenarios**:

1. **A-12 — Use a recovery code once**: **Given** an active recovery-code set and a matching account recovery attempt, **When** one unused code is accepted, **Then** that code is consumed exactly once and the user advances to the required security reset or re-enrollment step.
2. **A-13 — Reject replay and wrong-account recovery**: **Given** a used, expired, malformed, changed, or account-mismatched code or recovery artifact, **When** it is submitted, **Then** no account, factor, session, profile, or workspace authority changes.
3. **A-14 — Request lost-credential recovery privately**: **Given** a person supplies an account identifier to the configured recovery entry point, **When** recovery is requested, **Then** the visible result does not reveal whether the account exists, and any issued recovery artifact is time-bounded, one-time, and tied to that recovery intent.
4. **A-15 — Complete verified recovery**: **Given** a live recovery intent and valid approved identity proof, **When** recovery completes, **Then** obsolete recovery artifacts are invalidated, the account enters the configured factor reset or re-enrollment state, and the user receives the exact session consequences.
5. **A-16 — Preserve cloud/local distinction**: **Given** cloud identity recovery succeeds but the current device's protected local key is missing or unusable, **When** the user returns to SoloDesk, **Then** cloud-authoritative data may be fetched only after current authorization, while the unreadable local profile and unsynchronized local-only work are not claimed as recovered, replaced, or reassigned.
6. **A-17 — Recover from interruption**: **Given** recovery may have completed but the response was lost or the app closed, **When** the user resumes with the same recovery intent, **Then** the product resolves its current status without issuing a second reset or presenting stale success.

---

### User Story 4 - Reauthenticate for Security Changes (Priority: P2)

As a signed-in account holder, I must prove my identity again before changing factors, recovery codes, password, email, or account ownership information so that possession of an unattended session is insufficient to weaken account security.

**Why this priority**: Sensitive changes can defeat MFA or redirect future recovery unless they require current, purpose-bound proof and invalidate stale work.

**Independent Test**: Attempt each supported security change with a fresh valid reauthentication, a stale session, an expired challenge, a recovery-limited session, and a concurrently revoked session. Only fresh sufficient proof may commit one change.

**Acceptance Scenarios**:

1. **A-18 — Require purpose-bound reauthentication**: **Given** a signed-in user requests factor disablement or replacement, recovery-code regeneration, password or email change, or another supported identity change, **When** recent proof is insufficient, **Then** the action remains pending until fresh approved proof for that purpose succeeds.
2. **A-19 — Rotate recovery codes atomically**: **Given** successful reauthentication and an existing recovery-code set, **When** the user regenerates codes, **Then** one new set is shown once and every old unused code becomes invalid as part of the same accepted change.
3. **A-20 — Reject stale security changes**: **Given** the account security generation changes through recovery, reset, factor update, or session revocation, **When** an older pending security action completes, **Then** it is rejected without reversing or weakening the newer state.
4. **A-21 — Explain session consequences**: **Given** a security change or recovery succeeds, **When** the result is shown, **Then** the user is told whether the current session continues, which other sessions were ended or require reauthentication, and what action is required on other devices without claiming remote deletion of downloaded data.
5. **A-22 — Notify without leaking secrets**: **Given** a factor, recovery-code set, primary credential, or recovery identity changes, **When** security evidence and user notification are created, **Then** they identify the type and time of change and a safe response path without including codes, credentials, raw provider artifacts, or private local-data details.

---

### User Story 5 - Recover in English or Arabic Accessibly (Priority: P2)

As an English- or Arabic-speaking user, I can complete MFA and recovery with a keyboard and assistive technology so that account security does not depend on one language, reading direction, or pointer input.

**Why this priority**: F011 is a high-stress first-release workflow; mistranslated consequences, reordered codes, or inaccessible errors can lock out users or cause unsafe choices.

**Independent Test**: Complete enrollment, challenge, code recovery, failed recovery, regeneration, reauthentication, and local-key limitation paths in English and Arabic with keyboard-only and screen-reader navigation at 200% zoom.

**Acceptance Scenarios**:

1. **A-23 — Preserve bilingual meaning**: **Given** either supported language, **When** any F011 instruction, warning, error, session consequence, or recovery action is shown, **Then** its security meaning and available actions are equivalent with no untranslated user-facing content.
2. **A-24 — Keep codes and identifiers unambiguous**: **Given** an Arabic right-to-left layout, **When** a verification code, recovery code, email, diagnostic reference, or time is displayed or entered, **Then** its characters remain in the intended order and its underlying value is not changed by presentation.
3. **A-25 — Provide accessible status and recovery**: **Given** a keyboard or screen-reader user, **When** challenge, success, expiry, rate limit, error, or recovery state changes, **Then** focus moves predictably, the status is announced without exposing a secret, and every required action has a non-pointer path.

### Edge Cases

- A user begins factor enrollment in two windows or devices; completing one security generation makes the other attempt stale without deleting the newly active factor.
- A recovery code contains characters that could be confused visually, is pasted with surrounding whitespace, or is displayed inside Arabic text; bounded normalization never changes the code's meaningful character sequence.
- Recovery-code regeneration succeeds but the response is lost; reconciliation reveals that the old set is invalid without displaying the new set a second time, and the user must deliberately generate another set after reauthentication.
- A password reset and a factor challenge complete concurrently; only the result valid for the latest accepted security generation may establish authority.
- The account has no active additional factor under a policy that now requires one; ordinary account security setup remains available, while protected product actions follow the configured restriction until enrollment completes.
- The user loses every approved factor and all recovery codes; there is no silent support bypass, and the configured verified account-recovery or manual escalation policy is followed without guaranteeing success.
- A recovery link or code is opened on another device, profile, OS user, or account; recovery may continue only after verifying the intended account and must never attach another account's local profile.
- The service reports success after the local app was closed; restart resolves current account state and does not repeat reset, code consumption, or factor activation.
- The device clock is incorrect; challenge and recovery validity are not trusted solely to the device's wall clock.
- Recovery delivery is delayed, unavailable, rate-limited, or misconfigured; the product does not promise that a message was sent and retains a safe retry/support path.
- An account identifier is unknown, disabled, or already recovered; unauthenticated responses remain neutral while authorized support evidence stays redacted and separately controlled.
- Security notifications arrive after a legitimate account change; their links can start a safe review or recovery flow but cannot directly undo state or grant a session.
- A recovered account no longer has a current workspace membership; recovery authenticates the account but does not restore revoked membership, roles, grants, offline leases, or queued-write authority.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The product MUST apply the current approved identity policy to determine whether an additional factor is unavailable, optional, or required and MUST show the resulting restriction before the user attempts a protected action.
- **FR-002**: Starting factor enrollment, disabling or replacing a factor, regenerating recovery codes, changing a primary credential or recovery identity, and other supported security changes MUST require recent approved reauthentication.
- **FR-003**: Factor enrollment MUST be bound to one verified account and one bounded enrollment attempt and MUST expose only factor choices approved by the current policy.
- **FR-004**: A factor MUST NOT become active until the account proves possession through the pending enrollment attempt.
- **FR-005**: Activating the first or replacement factor MUST produce one fresh set of one-time recovery codes, display the plaintext codes only during that handoff, and require explicit saved-code acknowledgment before setup is complete.
- **FR-006**: Each recovery code MUST be accepted at most once, MUST be bound to one account and current code-set generation, and MUST remain unavailable for later plaintext viewing.
- **FR-007**: Recovery-code regeneration MUST create one new set and invalidate every prior unused code as one security-state change; an unknown outcome MUST be reconciled before another regeneration.
- **FR-008**: Every MFA challenge MUST be bound to the intended verified account, purpose, originating attempt, expiry, and current security generation and MUST grant authority only to that attempt.
- **FR-009**: Missing, malformed, incorrect, expired, consumed, superseded, replayed, cross-account, or cross-purpose factor and recovery proof MUST produce no authentication or security-state effect.
- **FR-010**: Repeated enrollment, challenge, and recovery failures MUST be bounded by an approved anti-abuse policy while preserving a legitimate recovery route and avoiding account-existence disclosure.
- **FR-011**: MFA challenge, factor enrollment, recovery-code use, primary credential recovery, and security-state changes MUST require current online authority; offline state MUST never substitute cached success.
- **FR-012**: Lost-session or lost-primary-credential recovery MUST use a bounded one-time recovery intent and approved identity proof and MUST not collect primary credentials inside the desktop application surface.
- **FR-013**: Lost-factor recovery MUST require an unused current recovery code or another approved verified account-recovery method; an existing session alone MUST NOT silently reset or disable a factor.
- **FR-014**: A recovery request initiated with an account identifier MUST return a neutral public result regardless of whether that account exists, is disabled, or is ineligible.
- **FR-015**: Successful account recovery MUST invalidate all artifacts made obsolete by the recovery, advance the account security generation, apply the configured session consequences, and require factor reset or re-enrollment when policy demands it.
- **FR-016**: Failed, cancelled, expired, replayed, rate-limited, or outcome-unknown recovery MUST NOT be represented as success and MUST provide a bounded retry, reconciliation, or support path.
- **FR-017**: Sensitive account changes MUST be purpose-bound and MUST be rejected if their session, challenge, recovery authority, or security generation becomes stale before commitment.
- **FR-018**: The product MUST state the session consequences of every successful recovery or sensitive security change and MUST NOT imply that ending a session erases encrypted data already held by another device.
- **FR-019**: Cloud account recovery MUST be distinct from local key, encrypted-profile, backup, and unsynchronized-data recovery; missing local protection MUST fail closed without empty-profile replacement, plaintext fallback, or reassignment to the recovered account.
- **FR-020**: Recovering identity MUST NOT restore revoked workspace membership, roles, grants, device approval, offline authorization, or rejected queued operations without their own current authority.
- **FR-021**: Interrupted or duplicate enrollment, challenge, code regeneration, and recovery results MUST reconcile to one authoritative current state without duplicate factor, code set, reset, or session effect.
- **FR-022**: Security events MUST retain redacted evidence of account, event type, safe factor label where permitted, outcome, authoritative time, session consequence, correlation, and current security generation without credentials or raw recovery material.
- **FR-023**: Passwords, factor enrollment secrets, verification values, recovery codes, reusable session credentials, and raw recovery artifacts MUST NOT appear in ordinary application data, user-visible URLs after completion, logs, audit text, diagnostics, analytics, crash reports, exports, or support bundles.
- **FR-024**: User-facing security errors MUST preserve non-secret valid input when safe, avoid confirming hidden account details, distinguish expired/invalid/unavailable/revoked outcomes when the authenticated user may know them, and name a safe next action.
- **FR-025**: All F011 flows, errors, warnings, notifications, and session consequences MUST provide equivalent English and Arabic meaning, full right-to-left layout, safe mixed-direction rendering, keyboard operation, visible focus, semantic status announcements, contrast, and 200% zoom usability.
- **FR-026**: Verification and recovery inputs MUST have explicit length and character bounds, safe paste behavior, and unambiguous direction; presentation or locale normalization MUST NOT change the meaningful code value.
- **FR-027**: A valid MFA or recovery result MUST establish only the identity/session authority allowed by the current attempt; it MUST NOT by itself create a workspace, grant membership, enroll or revoke a device, unlock a missing device key, or authorize a business action.
- **FR-028**: Account-security notifications MUST describe the change, time, expected session impact, and safe response path without including secrets or turning a notification action into direct privileged state change.

### Scope Boundaries

**In scope**:

- Configured additional-factor enrollment, proof, challenge, replacement, and disablement safeguards.
- One-time recovery-code issue, acknowledgment, use, rotation, and replay prevention.
- Lost-session, lost-primary-credential, and lost-factor account recovery through approved identity proof.
- Purpose-bound reauthentication for supported account-security changes and truthful session consequences.
- Interruption/replay/abuse handling, redacted security evidence, and English/Arabic accessible recovery guidance.

**Out of scope**:

- Selecting production identity providers, factor types, mandatory-MFA population, support escalation proof, or exact abuse thresholds before Q-08 approval.
- Browser sign-in and first native enrollment behavior owned by F010, except for consuming its verified account and session boundary.
- Device listing, additional-device enrollment, device credential rotation, or device revocation owned by F015.
- Recreating device-encryption keys, decrypting an unreadable local cache, or recovering unsynchronized local-only work owned by F006/F007 and approved backup/recovery flows.
- Workspace creation, membership, roles, grants, invitations, offline authorization, synchronization, or business-feature access.
- Provider provisioning, message-sender setup, implementation, deployment, public support promises, or production release.

### Key Entities

- **Identity Security Policy**: The approved account-security profile governing whether an additional factor is optional or required, approved factor and recovery methods, challenge purposes, attempt limits, validity windows, session consequences, and escalation path. Q-08 must approve production values.
- **Factor Enrollment**: A bounded attempt to attach one approved additional factor to one verified account. It has a safe attempt reference, account, factor category and user-visible label, created/expiry evidence, security generation, verification status, and lifecycle (`pending`, `verified`, `completed`, `cancelled`, `expired`, `rejected`). It does not retain displayable factor secrets after setup.
- **Authentication Factor**: The account-bound record that an approved additional proof method was verified. It has a stable non-secret identity, category, safe label, enrolled and last-used evidence, status (`active`, `replacement_pending`, `disabled`, `revoked`), and security generation.
- **MFA Challenge**: One purpose-bound request for current additional-factor proof. It has a safe challenge reference, account, originating attempt and purpose, created/expiry evidence, allowed failure state, consumption state, and security generation; it grants no authority by itself.
- **Recovery Code Set**: One account-bound generation of one-time codes. It records generation, issue/acknowledgment evidence, aggregate remaining/consumed status where safe, replacement status, and no later-retrievable plaintext code values.
- **Account Recovery Intent**: A bounded attempt to regain one verified cloud account. It has a safe reference, recovery category, requested/expiry/completion evidence, security generation, neutral public status, verified-proof status, and lifecycle (`requested`, `proof_pending`, `completed`, `expired`, `cancelled`, `rejected`, `outcome_unknown`).
- **Security Generation**: The current account-security revision used to make older pending challenges, resets, and sensitive changes stale after an accepted recovery or security update.
- **Session Consequence**: The authoritative result describing which session classes continue, end, or require reauthentication after a recovery or security change. It does not claim remote deletion of already downloaded data.
- **Identity Security Evidence**: A redacted record of enrollment, challenge, code rotation/use, recovery, reauthentication, sensitive change, or session consequence. It contains safe references and outcome metadata but no credentials, factor secrets, verification values, recovery codes, or raw provider artifacts.

### Lifecycle and State Rules

1. An account under optional policy may remain `factor_not_configured`; an account under required policy enters `factor_setup_required` for restricted actions until one factor completes enrollment.
2. Enrollment moves from `pending` to `verified` only after valid factor proof and to `completed` only after the fresh recovery-code handoff is acknowledged. Cancellation, expiry, or rejection leaves the prior active security state unchanged.
3. A challenge grants authority once only while its originating attempt, purpose, session, expiry, account, and security generation all remain current.
4. Recovery codes belong to one current generation. Consumption changes one code from unused to used; regeneration replaces the entire generation without a period in which old and new sets are both valid.
5. Account recovery remains `proof_pending` until approved proof commits. Lost response produces `outcome_unknown` for reconciliation, not a second reset. Completion advances the security generation and applies session consequences.
6. Factor reset, credential change, email/account-identity change, recovery-code rotation, and factor disablement require fresh purpose-bound reauthentication. A concurrent newer security generation makes the pending action stale.
7. Successful cloud identity recovery can move a profile to `sign_in_required`, `factor_setup_required`, `local_unlock_required`, or `local_recovery_required`; it cannot move an unreadable protected profile directly to ready.

### Dependencies and Entry Gates

- F010 supplies the verified account, trusted hosted identity entry point, account/profile isolation, and protected session binding. F011 does not weaken F010 callback or renderer-secret boundaries.
- F005 supplies the bilingual accessible shell and safe focus, right-to-left, and mixed-direction behavior inherited by native F011 surfaces.
- F006/F007 supply approved key protection and encrypted profile recovery behavior. F011 may describe the limitation but cannot claim that account recovery recreates a lost local key.
- F009 supplies authoritative one-effect processing, reconciliation, and redacted evidence foundations for consequential security changes when implemented.
- Q-08 must approve the production factor methods, mandatory-MFA population, primary-credential recovery proof, manual escalation policy, attempt/expiry limits, and session invalidation rules. This specification supports a configured approved policy without treating provisional values as confirmed.
- Q-02 and verified sender/delivery readiness must be satisfied before a public recovery channel is promised. A controlled sandbox identity may be used for specification acceptance without implying production delivery readiness.
- Q-07 remains the gate for local key recovery limits; successful identity recovery is not evidence that protected device data can be recovered.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In 100% of tested factor enrollments, only a verified enrollment with acknowledged recovery-code handoff becomes active; cancellation, expiry, interruption, invalid proof, and duplicate completion leave no partially active factor.
- **SC-002**: In 100% of missing, malformed, incorrect, expired, consumed, superseded, replayed, cross-account, cross-purpose, stale-session, and stale-generation challenge tests, zero unauthorized sessions or security changes result.
- **SC-003**: Across duplicate and concurrent enrollment, challenge, recovery-code rotation, and account-recovery tests, every accepted intent produces at most one factor, code-set generation, recovery completion, and configured session effect.
- **SC-004**: In 100% of recovery-code tests, a code succeeds at most once, a rotated set invalidates every prior unused code, and no plaintext code can be viewed again after its original handoff.
- **SC-005**: In 100% of unauthenticated recovery-request tests covering existing, absent, disabled, rate-limited, and ineligible accounts, visible responses disclose no account-existence difference beyond the approved neutral wording and timing tolerance.
- **SC-006**: In 100% of successful recovery and sensitive-change tests, the documented session consequences occur, obsolete recovery artifacts fail, and stale pending security actions cannot restore the earlier state.
- **SC-007**: In 100% of lost-key and unreadable-profile recovery tests, cloud identity recovery neither claims recovery of unsynchronized local-only work nor replaces, relabels, or exposes the protected local profile.
- **SC-008**: Automated secret scans and inspected acceptance artifacts find zero passwords, factor enrollment secrets, verification values, recovery codes, reusable session credentials, or raw recovery artifacts in prohibited application data, logs, diagnostics, audit text, analytics, crash artifacts, exports, or support bundles.
- **SC-009**: At least 90% of first-time participants with a working approved factor complete routine MFA enrollment and save-code acknowledgment in under three minutes without assistance, measured separately in English and Arabic and excluding provider-controlled delivery time.
- **SC-010**: At least 95% of participants with valid current proof complete a routine MFA challenge in under 90 seconds and select the correct next action after an expired or rejected challenge.
- **SC-011**: At least 90% of participants completing a recovery scenario correctly identify whether cloud access, current sessions, and local unsynchronized data were recovered, unavailable, or require further action.
- **SC-012**: 100% of F011 states and actions pass English/Arabic meaning parity, right-to-left and mixed-direction review, keyboard navigation, focus visibility, semantic status announcement, contrast, and 200% zoom checks with no blocking defect.
- **SC-013**: Every tested failure and outcome-unknown state offers a specific safe next action—retry after the allowed interval, reauthenticate, use an unused code, start approved recovery, reconcile, unlock local protection, or contact the approved support path—without false success or an empty replacement profile.

## Assumptions

- F011 is a documentation feature in this request. It does not authorize implementation, provider or sender configuration, provisioning, deployment, publication, support access, or release.
- The exact production factor methods, mandatory-MFA population, attempt limits, recovery proof, manual escalation process, and session invalidation policy remain Q-08 decisions. The feature is specified against a configured approved policy so planning can proceed without inventing those values.
- One approved additional factor plus one-time recovery codes is the smallest complete F011 capability. Multiple simultaneously active factors, passkeys, enterprise federation, remembered-device exceptions, and workspace-specific MFA policy are not assumed.
- A configured primary sign-in method may not use a password. Password recovery requirements apply when that method has a recoverable password; otherwise the approved equivalent primary-credential recovery path applies.
- Recovery requires current connectivity and trusted online authority. Cached offline authorization cannot approve an identity reset or security change.
- F010 continues to own first sign-in, hosted/native handoff, first-device enrollment, sign-out, and account/profile isolation; F015 owns broader device and session administration.
- Successful identity recovery permits only a new verified session. Workspace authority, local protection, device approval, and business permissions are evaluated separately and currently.
- Security notifications are evidence and guidance, not proof that an account change was fraudulent or a privileged undo mechanism.
