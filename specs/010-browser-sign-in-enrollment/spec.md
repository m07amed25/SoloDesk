# Feature Specification: F010 — Browser Sign-in and Native Enrollment

**Feature Branch**: `feat/f010-browser-sign-in-and-native-enrollment`

**Created**: 2026-10-20

**Status**: Draft — specification only; implementation and delivery claims require separate evidence and approval

**Input**: User description: "Build a full specs for F010 in plan.md"

**Feature / Milestone**: F010 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisites**: F005 accessible application shell, F007 encrypted local persistence, and F009 authoritative command receipts and audit. F010 consumes the established secure desktop and native key-protection boundaries without reopening them.

**Parent requirements**: PLT-001 and PLT-002. Supporting constraints: NFR-004–NFR-007, NFR-010, NFR-012, D-02, D-03, D-10, D-11, D-14, D-15, A-01, A-10, Q-02, Q-07, Q-08, and Constitution Principles I–III, V–VIII.

**Authority**: [F010 card](../../plan.md#f010), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [account workflow](../../docs/product/workflows.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [sync and device identity](../../docs/architecture/sync-and-collaboration.md), [API contracts](../../docs/architecture/api-contracts.md), [acceptance](../../docs/quality/acceptance.md), [test strategy](../../docs/quality/test-strategy.md), [decisions](../../docs/planning/decisions.md), and [constitution](../../.specify/memory/constitution.md).

F010 establishes the first trusted relationship between a verified cloud account and one native SoloDesk installation. Credentials are entered only in a separate hosted browser surface. The desktop starts an attempt, validates the one-time return, obtains a verified account result, proves that protected local storage is available, and enrolls the current installation without exposing session secrets or another account's cache to the renderer or hosted page.

The feature does not grant workspace membership, offline authority, or access to business records merely because authentication succeeded. It ends with a signed-in, enrolled local profile that later features can associate with authorized workspaces and bounded offline leases.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sign In Through a Trusted Browser Flow (Priority: P1)

As a new or returning user, I can start sign-in from the locked desktop, authenticate in my system browser, and return to the same desktop attempt so that my credentials never enter the application renderer and an unrelated callback cannot sign me in.

**Why this priority**: Every later workspace and offline capability depends on establishing the correct identity through a boundary that resists callback forgery, replay, and account substitution.

**Independent Test**: Start sign-in for a verified test account, complete the configured hosted flow, and return once to the initiating desktop profile. Verify that the profile receives the correct verified account, the attempt is consumed once, and neither the renderer nor logs contain credentials or reusable session secrets.

**Acceptance Scenarios**:

1. **A-01 — Start trusted sign-in**: **Given** a locked desktop profile with network access, **When** the user chooses sign in, **Then** the app opens the approved hosted sign-in page in the system browser for one bounded attempt and shows a cancellable `signing_in` state without loading remote executable content inside the desktop renderer.
2. **A-02 — Complete matching callback**: **Given** one active attempt and a verified account completing the hosted flow, **When** the exact one-time return for that attempt reaches the initiating profile, **Then** the desktop validates the return, consumes the attempt, and advances only with the verified account result.
3. **A-03 — Reject forged or mismatched return**: **Given** a return with missing, changed, expired, replayed, or profile-mismatched attempt evidence, an unapproved destination, an error from an untrusted source, or a result for the wrong application, **When** it reaches the desktop, **Then** the app rejects it, creates no session or enrollment, reveals no account/cache data, and gives safe retry guidance.
4. **A-04 — Reject account substitution**: **Given** an attempt that began for a known returning local profile, **When** the hosted result identifies a different account, **Then** the app does not bind that account to the existing profile and requires an explicit isolated account-switch flow.
5. **A-05 — Consume return once**: **Given** a successfully completed attempt, **When** the same return is delivered again or concurrently, **Then** at most one completion is accepted and every duplicate has no additional effect.

---

### User Story 2 - Enroll the First Device Safely (Priority: P1)

As a verified account holder, I can enroll my current installation only when protected local storage is available so that the device can retain a session and encrypted profile without silently falling back to plaintext or inheriting another account's data.

**Why this priority**: Authentication alone is not sufficient for an offline-capable desktop product; the local installation must be bound to the correct account and protection boundary before any customer data can be cached.

**Independent Test**: On a clean installation with working protected storage, complete sign-in and first enrollment. Restart the application and verify the same account/profile binding is restored. Repeat with unavailable protection and with a pre-existing profile for another account; verify that enrollment fails closed and exposes no cached data.

**Acceptance Scenarios**:

1. **A-06 — First online enrollment**: **Given** a verified account, a clean native profile, current network access, and usable protected storage, **When** the user confirms enrollment, **Then** the service records one enrollment for the current installation and the desktop binds the protected local profile to that verified account.
2. **A-07 — Protection unavailable**: **Given** protected credential or key storage is missing, locked, rejected, or cannot be verified, **When** enrollment is attempted, **Then** enrollment and protected persistence remain unavailable, no secret is stored in plaintext, and the user receives truthful recovery guidance.
3. **A-08 — Existing foreign profile**: **Given** the installation contains an encrypted profile bound to account A, **When** account B signs in, **Then** account B cannot open, relabel, replace, or infer account A's cache and must use a distinct isolated profile.
4. **A-09 — Atomic enrollment failure**: **Given** enrollment fails after sign-in because the service, network, protected storage, or required evidence becomes unavailable, **When** the failure is reported, **Then** no partially enrolled profile is treated as ready and retry cannot create duplicate device identities.
5. **A-10 — Restart continuity**: **Given** a completed enrollment with a valid current session, **When** the desktop restarts, **Then** it restores the same account/profile binding from protected state and never displays a new empty workspace as a substitute for an unreadable or unavailable profile.

---

### User Story 3 - Recover from Interruptions Without Guessing (Priority: P2)

As a user whose browser flow, callback, network, or application was interrupted, I can see whether sign-in or enrollment completed and retry safely so that I do not create conflicting profiles or lose recoverable local work.

**Why this priority**: Browser-to-native handoff crosses processes and networks; interruption is expected and must resolve to an explicit state instead of an assumed success or destructive reset.

**Independent Test**: Interrupt the flow before authentication, after hosted authentication but before native return, during enrollment, and after server acceptance but before the desktop receives the result. Verify that each restart or retry resolves the original attempt or begins a clearly new one without duplicate enrollment, false success, or cache replacement.

**Acceptance Scenarios**:

1. **A-11 — Cancel or expire attempt**: **Given** a user cancels the browser flow or an unfinished attempt expires, **When** the desktop resumes, **Then** it returns to a locked recoverable state, clears unusable attempt material, and permits a deliberate new attempt.
2. **A-12 — Network unavailable**: **Given** first sign-in or enrollment requires online authority, **When** the network or identity service is unavailable, **Then** the app states that online access is required, retains any existing encrypted profile unchanged, and never presents an empty tenant as a successful result.
3. **A-13 — Callback without a live attempt**: **Given** no matching active attempt exists, **When** a callback arrives at launch, second launch, or while another profile is active, **Then** it is rejected before account or enrollment state changes and the app does not route it as a general deep link or privileged command.
4. **A-14 — Unknown enrollment outcome**: **Given** the service may have accepted enrollment but the response was lost, **When** the desktop reconnects or retries, **Then** it reconciles the original enrollment intent and converges on the existing result or a proven not-enrolled state without creating a second device identity.
5. **A-15 — Session rejected after restart**: **Given** a stored session is expired, invalid, or revoked when online validation occurs, **When** the app resumes, **Then** protected online actions stop, the profile returns to a sign-in-required state, and encrypted local data is neither exposed nor discarded.

---

### User Story 4 - Sign Out or Change Accounts Without Data Crossover (Priority: P2)

As a person who uses more than one account on the same computer, I can sign out and explicitly choose another account without one account inheriting the other's session, local profile, window context, or cached business data.

**Why this priority**: Shared computers and account mistakes are realistic; safe isolation is part of F010's explicit wrong-account and account-switch acceptance boundary.

**Independent Test**: Enroll account A, sign out, then sign in as account B. Verify B receives a separate profile and cannot see A's records, counts, labels, pending work, or notifications. Sign back into A and verify its unchanged protected profile is selected only after A is verified.

**Acceptance Scenarios**:

1. **A-16 — Explicit sign-out**: **Given** a signed-in enrolled profile, **When** the user signs out, **Then** active online authority and reusable session material are removed or invalidated, privileged work stops, and the app explains the difference between signing out, retaining an encrypted local profile, and deleting local data.
2. **A-17 — Isolated account switch**: **Given** account A is signed out and account B completes sign-in, **When** B becomes active, **Then** A's windows, subscriptions, in-memory views, profile keys, cache, outbox, counts, and notifications are unavailable to B.
3. **A-18 — Return to the original account**: **Given** a retained encrypted profile for account A, **When** A later signs in successfully, **Then** the app may reopen only A's matching profile after protection checks and does not merge it with B's profile.
4. **A-19 — Sign-out with recoverable local work**: **Given** the current profile may contain encrypted unsynchronized work, **When** the user signs out or starts an account switch, **Then** the app warns about the recoverable local state and does not silently erase, upload, reassign, or expose it.

---

### User Story 5 - Complete the Flow in English or Arabic (Priority: P2)

As an English- or Arabic-speaking user, I can understand and operate the hosted and native portions of sign-in and enrollment with keyboard and assistive technology so that security does not depend on using one language or a pointer.

**Why this priority**: English/Arabic parity, full RTL, and accessible recovery are first-release requirements and are especially important in a security-sensitive flow.

**Independent Test**: Complete successful, cancelled, invalid-return, offline, protection-unavailable, sign-out, and account-switch paths in English and Arabic using keyboard-only and screen-reader navigation. Verify equivalent meaning, logical focus, visible status, and correct mixed-direction handling for emails and identifiers.

**Acceptance Scenarios**:

1. **A-20 — Bilingual parity**: **Given** either supported language is active, **When** any F010 state or error is shown in the hosted page or desktop, **Then** the user receives equivalent instructions, status, and recovery actions without untranslated user-facing text.
2. **A-21 — RTL-safe identity display**: **Given** Arabic layout containing an email, device label, diagnostic reference, or other left-to-right identifier, **When** it is displayed, **Then** the identifier remains readable and unambiguous without changing its stored value.
3. **A-22 — Accessible handoff and recovery**: **Given** a keyboard or screen-reader user, **When** focus moves between launch, waiting, cancel, return, enrollment, error, and retry states, **Then** the state change is announced, focus lands predictably, and every action has a non-pointer path.

### Edge Cases

- Two sign-in attempts are started close together for one profile; only the latest explicitly active attempt may complete, and a late return from the other attempt is rejected.
- The browser completes authentication under a different OS user or sends a return to another running SoloDesk profile; the attempt/profile binding prevents acceptance.
- A callback contains extra fields, excessive length, malformed encoding, duplicate parameters, fragments, or a nested destination; validation rejects it before parsing data as an account or command.
- The desktop closes after hosted authentication but before processing the return; restart accepts only a still-valid matching attempt and otherwise provides a safe new-attempt path.
- The service accepts enrollment while the local protected write fails, or the protected write succeeds while service confirmation is unavailable; reconciliation never treats a partial state as ready or creates a duplicate enrollment.
- A returning user changes the hosted account after the attempt begins; the desktop requires explicit confirmation and profile isolation rather than silently rebinding a local profile.
- The device clock is wrong; attempt expiry and account/session validity are not trusted solely to local wall-clock time.
- The identity provider or hosted page is unavailable, rate-limited, misconfigured, or cannot deliver required verification email; the desktop remains locked and explains the retry/support path without promising that a message was sent.
- An enrollment response or diagnostic contains a token, authorization code, verifier, cookie, or private provider error; user-visible errors, logs, audit, analytics, crash data, and support bundles omit it.
- Sign-out occurs while a callback or enrollment response is in flight; the completed sign-out generation wins and the late response cannot restore authority silently.
- A user authenticates successfully but has no workspace yet; the result is an enrolled account awaiting F012 onboarding, not a fabricated empty workspace or an implicit membership.
- The app receives an F010 callback on a build whose packaged callback registration is unsupported or unverified; it fails closed and points to a supported recovery path rather than weakening validation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: First sign-in and first-device enrollment MUST require current network access and MUST distinguish identity-service failure, network failure, cancelled sign-in, and successful authentication; none of these failures may appear as a new empty workspace. Acceptance: A-01, A-11, A-12.
- **FR-002**: The desktop MUST launch the approved sign-in experience in the system browser and MUST NOT load the hosted sign-in page or other remote executable content inside the privileged desktop renderer. Acceptance: A-01.
- **FR-003**: Each sign-in start MUST create one bounded, profile-bound, attempt-specific proof using authorization-code protection and unpredictable state; no reusable application secret may be embedded in the desktop distribution. Acceptance: A-01–A-03.
- **FR-004**: A native return MUST be accepted only when its scheme/origin, route, application audience, destination, attempt state, profile binding, expiry, and result shape match the active attempt. Unknown fields or malformed, oversized, duplicated, nested, or ambiguous values MUST fail closed. Acceptance: A-02, A-03, A-13.
- **FR-005**: A successful hosted result MUST be exchanged and validated through a trusted boundary that verifies the identity issuer, application audience, expiry, one-time authorization result, and verified account identifier before local authority changes. Acceptance: A-02, A-03.
- **FR-006**: Each sign-in return MUST be consumable at most once; replayed, concurrent, late, cancelled, expired, or superseded returns MUST create no session or enrollment effect. Acceptance: A-03, A-05, A-11.
- **FR-007**: Callback data MUST be inert identity-return input only and MUST NOT invoke arbitrary navigation, filesystem access, shell behavior, general desktop commands, workspace actions, or business mutations. Acceptance: A-03, A-13.
- **FR-008**: F010 MUST support at least one explicitly approved and configured account sign-in method. Public self-registration or email verification MUST remain disabled when required sender/domain/delivery readiness has not been proven. Exact additional methods remain an identity release decision under Q-08. Acceptance: A-01, A-12.
- **FR-009**: Authentication success MUST establish only a verified account identity; it MUST NOT invent workspace membership, resource permission, an offline authorization lease, or access to cached business records. Acceptance: A-02, A-12.
- **FR-010**: First-device enrollment MUST require the verified account, current online authority, a unique enrollment intent, a supported app/device context, and a proven protected credential/key-storage path. Acceptance: A-06, A-07.
- **FR-011**: Enrollment MUST bind one stable local profile and one service-recognized device identity to the same verified account without accepting a caller-supplied account, role, workspace, device owner, or profile path as authority. Acceptance: A-06, A-08.
- **FR-012**: Enrollment completion MUST be idempotent and reconcilable: identical retries converge on the original enrollment, while changed-account or changed-device intent is rejected or requires a new explicit flow. Acceptance: A-09, A-14.
- **FR-013**: The service enrollment result, protected session write, protected profile/account binding, and readiness transition MUST not leave a partial state that can access protected data; any incomplete combination remains locked and recoverable. Acceptance: A-07, A-09, A-14.
- **FR-014**: Reusable session and enrollment secrets MUST remain outside renderer-readable storage, hosted-page storage accessible to the desktop, callback URLs, ordinary local data fields, logs, audit summaries, analytics, crash reports, exports, and support bundles. Acceptance: A-02, A-07.
- **FR-015**: If approved protected storage is unavailable, locked, loses its key, or would fall back to unprotected storage, the app MUST refuse session persistence and enrollment readiness without deleting or replacing an existing encrypted profile. Acceptance: A-07, A-10.
- **FR-016**: A local profile MUST retain a stable non-secret verified-account binding sufficient to detect a wrong-account return before protected cache access; account B MUST never open, relabel, merge, replace, count, search, or infer account A's profile data. Acceptance: A-04, A-08, A-17, A-18.
- **FR-017**: Restart with a valid enrolled session MUST restore only the matching protected profile; unreadable, missing, incompatible, or mismatched state MUST enter an explicit locked or recovery-required state rather than creating a replacement profile. Acceptance: A-10, A-15.
- **FR-018**: Sign-out MUST stop active online authority and protected operations, dispose account-bound in-memory contexts, and remove or invalidate reusable session material while clearly distinguishing retained encrypted local data from local-data deletion. Acceptance: A-16, A-19.
- **FR-019**: Account switching MUST be explicit and MUST close or isolate the prior account's windows, subscriptions, pending UI actions, memory, keys, cache, outbox, counts, notifications, and callback attempts before another account becomes active. Acceptance: A-04, A-17, A-18.
- **FR-020**: Sign-out, failed reauthentication, account switching, or a rejected session MUST NOT silently erase, upload, transfer, or reassign encrypted unsynchronized work; the user MUST receive accurate recovery guidance. Acceptance: A-15, A-16, A-19.
- **FR-021**: Interrupted or outcome-unknown enrollment MUST reconcile the original intent before starting a replacement; retry MUST not create duplicate device identities or claim readiness without authoritative evidence. Acceptance: A-09, A-14.
- **FR-022**: Security-relevant sign-in and enrollment events MUST produce bounded redacted evidence with a safe diagnostic reference, event type, outcome, relevant profile/device reference, and authoritative instant where available, without tokens, authorization codes, verifiers, cookies, passwords, full callback data, or unrestricted provider errors. Acceptance: A-03, A-06, A-09.
- **FR-023**: Sign-in start, callback handling, exchange, enrollment, retry, and diagnostic access MUST enforce bounded input, attempt lifetime, concurrency, and abuse controls; rate limiting MUST not reveal whether an unrelated account or profile exists. Acceptance: A-03, A-05, A-13.
- **FR-024**: All hosted and native F010 states, controls, errors, and recovery guidance MUST have equivalent English and Arabic meaning, full RTL-safe layout, isolated mixed-direction identifiers, keyboard operation, visible focus, semantic announcements, supported zoom, and non-color-only status. Acceptance: A-20–A-22.
- **FR-025**: F010 MUST expose an enrolled-account result to later features through a narrow identity/profile boundary; it MUST NOT enable workspace creation/switching, device-list management/revocation, MFA/recovery, offline leases, protected record deep links, sync, or business commands itself. Acceptance: A-06, A-10, A-17.

### Scope Boundaries

**In scope**:

- A separate hosted English/Arabic sign-in surface and system-browser handoff.
- One approved configured primary sign-in method, secure attempt creation, one-time native return validation, and verified-account establishment.
- First-device online enrollment, protected session/profile binding, atomic readiness, reconciliation, and restart continuity.
- Explicit sign-out, safe account-change isolation, wrong-account denial, and preservation of encrypted recoverable local work.
- Locked, signing-in, enrolling, enrolled, sign-in-required, protection-unavailable, and recovery-required presentation needed by this flow.
- Redacted security evidence, bounded errors, abuse controls, accessibility, RTL, and three-target native acceptance of the included behavior.

**Out of scope**:

- MFA enrollment/challenge, recovery codes, password/lost-session recovery, reauthentication policy, and session-list management (F011).
- Workspace creation, invitations, memberships, active-workspace switching, and tenant defaults (F012–F014).
- Device list, credential rotation, second-device administration, revocation, and remote-wipe policy (F015).
- Offline authorization lease duration, offline unlock, inactivity lock, and lease-expiry behavior (F016/Q-06).
- Sync, permission invalidation, conflict handling, attachments, and business-record access (F017 onward).
- Final packaged protocol registration, installer/signing/notarization feasibility, and distribution proof (F029), although F010 defines the callback behavior it must carry.
- Selection of additional social/SSO providers, mandatory MFA policy, or a public email sender before Q-08 and SMTP/domain readiness are approved.

### Key Entities

- **Sign-in Attempt**: One bounded browser handoff initiated by a specific local profile. It has an opaque attempt identity, one-time challenge/state evidence, approved return destination, created/expiry evidence, initiating profile/generation, and lifecycle (`pending`, `cancelled`, `expired`, `consumed`, `rejected`). It contains no password and grants no authority by itself.
- **Verified Account**: The provider-validated human account identity returned after successful exchange. It has a stable non-secret account identifier, verification status, safe display fields, identity issuer reference, and current session status. It is not a workspace membership or role.
- **Protected Session Binding**: The relationship among the verified account, local profile, protected credential reference, session generation, and validity status. Reusable secrets are referenced through protected storage rather than copied into general application data.
- **Device Enrollment**: The authoritative first-device registration for the verified account. It has a stable device identity, account identity, user-visible device label, platform/app-version evidence, enrollment status, enrollment/last-contact instants, originating operation reference, and protected-key proof reference without storing raw secrets.
- **Local Account Profile**: The isolated native data boundary for one verified account on one installation. It has a stable profile identity, non-secret account binding, protected storage/key reference, compatibility version, and lifecycle (`locked`, `signing_in`, `enrolling`, `enrolled`, `sign_in_required`, `recovery_required`). Workspace caches remain later-feature data within this boundary.
- **Identity Security Evidence**: A bounded redacted record of sign-in start/completion/rejection, enrollment, reconciliation, sign-out, or account change. It contains stable safe references and outcome metadata but never credentials or raw callback/provider payloads.

### Lifecycle and State Rules

1. A profile begins `locked`. Starting a valid online attempt moves it to `signing_in`; cancellation, expiry, or safe rejection returns it to `locked` without authority.
2. A verified account with no completed local binding moves to `enrolling`. Only authoritative enrollment plus a successful protected local commit moves it to `enrolled`.
3. Partial or outcome-unknown enrollment remains unavailable until reconciliation proves the result and the protected local binding is complete.
4. Restart restores `enrolled` only for the same verified account, current accepted session state, compatible profile, and usable protected storage. Otherwise the state is `sign_in_required`, `locked`, or `recovery_required` as appropriate.
5. Sign-out increments the profile/session generation, stops active authority, and returns the profile to `locked` or `sign_in_required`; late callbacks or responses from an older generation cannot reverse it.
6. Account switching never changes the account binding of an existing profile. It selects or creates a separate isolated profile only after the new identity is verified.

### Dependencies and Entry Gates

- F005 provides the bilingual accessible native shell and safe focus/navigation behavior.
- F007 provides encrypted profile persistence and the no-empty-replacement recovery behavior; F006's approved protected-key path remains a required inherited gate.
- F009 provides idempotent authoritative command/receipt and redacted audit foundations for enrollment intent and reconciliation.
- F004's callback/deep-link parser and profile-owner boundary must be extended narrowly; its arbitrary external navigation and protected-route denials remain intact.
- Q-08 must approve the enabled primary sign-in method, additional providers if any, and the identity release policy. F010 can be specified and tested with a configured sandbox method without claiming all Q-08 policy is settled.
- Q-02 must provide an approved hosted environment/region for deployment. Documentation and isolated sandbox validation do not constitute production hosting approval.
- Public email registration remains disabled until sender domain, delivery, abuse, bounce, and support readiness are verified. A pre-provisioned or otherwise approved sandbox identity may be used for acceptance.
- F029 must prove final packaged callback registration and signing behavior before supported distribution; F010's behavioral contract does not close that release gate.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of test returns with wrong, missing, expired, replayed, superseded, cross-profile, malformed, oversized, or unapproved callback evidence are rejected with zero session, enrollment, navigation, command, or protected-data effect.
- **SC-002**: Across the declared Windows, macOS, and Linux acceptance targets, 100% of clean first-enrollment runs either produce one verified account/device/profile binding or remain safely locked; no run creates duplicate or partial ready enrollments.
- **SC-003**: In 100% of wrong-account and account-switch tests, the new account observes zero records, fields, labels, counts, search results, notifications, pending operations, or keys from the prior account.
- **SC-004**: In 100% of protection-unavailable, corrupt-profile, and incompatible-profile tests, the app refuses protected readiness and preserves the existing encrypted profile without plaintext fallback or empty replacement.
- **SC-005**: In 100% of interrupted-flow tests—browser cancellation, callback loss, process restart, network loss, response loss, and duplicate retry—the user reaches a truthful retry, reconciliation, or recovery state without manual file deletion and without duplicate device enrollment.
- **SC-006**: 90% or more of first-time participants using a working configured identity can complete browser sign-in and enrollment in under three minutes without assistance, measured separately in English and Arabic after excluding provider-controlled waiting time.
- **SC-007**: 100% of user-facing F010 strings and recovery actions have English/Arabic parity, and all critical successful and failure paths pass keyboard, focus, semantic announcement, zoom, contrast, and RTL/mixed-direction review with no blocking defect.
- **SC-008**: Automated secret scans and inspected acceptance artifacts find zero passwords, reusable session secrets, authorization codes, challenge verifiers, cookies, raw callback payloads, or unrestricted provider errors in renderer-accessible state, URLs retained after completion, logs, audit, analytics, crash artifacts, exports, or support bundles.
- **SC-009**: After successful enrollment and restart, the correct protected local profile is identified and reaches its permitted signed-in state within 10 seconds on the declared reference environment in at least 95% of runs, excluding identity-service outages and deliberate reauthentication requirements.
- **SC-010**: Every failed sign-in or enrollment state offers a specific safe next action—retry, cancel, unlock protection, sign in again, choose an isolated account profile, upgrade, or contact support—and no tested failure shows a false empty workspace or unqualified success.

## Assumptions

- F010 is a documentation feature in this request. It does not authorize provider provisioning, email-domain configuration, package installation, deployment, implementation, or release.
- The product continues to require managed-cloud accounts and online first enrollment; native mobile and embedded desktop credential forms remain out of scope.
- One approved configured sandbox sign-in method is sufficient to validate this feature. The precise production method set, mandatory MFA, SSO/social providers, recovery policy, and invite expiry remain Q-08/F011 decisions.
- A successful F010 enrollment may end at an account-ready onboarding state because workspace creation and joining are owned by F012/F013. Authentication does not create a tenant implicitly.
- F007 and the approved F006 key-protection path provide recoverable encrypted local profiles. F010 uses their public protection result and does not define a new encryption scheme.
- The final native callback transport can vary by supported platform/package, but every transport must satisfy the same one-time, attempt-bound, profile-bound, inert return contract. F029 owns final distribution feasibility and registration evidence.
- Device display labels may default to a bounded, user-editable platform label, but they are not trusted identity, permission, or uniqueness evidence.
- Session validity and provider error details are determined by trusted online authority; the desktop may display only safe, localized outcomes and diagnostic references.
