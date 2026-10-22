# Feature Specification: F012 — Workspace Creation and Safe Switching

**Feature Branch**: `feat/f012-workspace-creation-and-safe-switching`

**Created**: 2026-10-21

**Status**: Draft — specification only; implementation and delivery claims require separate evidence and approval

**Input**: User description: "Create a spec for f012 in '/home/mohamed-s/Desktop/SoloDesk/plan.md'"

**Feature / Milestone**: F012 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: F010 browser sign-in and native enrollment. F012 consumes F010's verified account and protected local-profile boundary without reopening identity enrollment.

**Parent requirement**: PLT-003. Supporting constraints: D-10, D-11, D-14, D-15, D-17, A-01, A-03, A-10, Q-01, Q-02, Q-03, Q-06, Q-07, Q-08, and Constitution Principles I–III and V–VIII.

**Authority**: [F012 card](../../plan.md#f012), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [account workflow](../../docs/product/workflows.md), [workspace screens](../../docs/product/screens.md), [sync and tenant isolation](../../docs/architecture/sync-and-collaboration.md), [security and privacy](../../docs/architecture/security-and-privacy.md), [data model](../../docs/architecture/data-model.md), [UX and localization](../../docs/product/ux-and-localization.md), [test strategy](../../docs/quality/test-strategy.md), [decisions](../../docs/planning/decisions.md), and [constitution](../../.specify/memory/constitution.md).

F012 lets a verified, enrolled account create a workspace and select among workspaces where it has current membership. A solo freelancer and a team use the same tenant model; a newly created workspace begins with the creator as its sole owner. Creation records the workspace profile, timezone, currency, and language defaults needed to start later setup while keeping unresolved legal and financial choices visibly incomplete.

Safe switching is a security boundary, not only a navigation preference. The product must stop actions from the previous workspace, keep unsaved and queued work attached to its source, isolate locally retained records and live updates, activate only the selected workspace's protected context, and show the current workspace before consequential actions. Authentication alone never grants workspace access.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Workspace with Truthful Defaults (Priority: P1)

As a verified account holder with no workspace, I can create a solo or future-team workspace with clear profile defaults so that I have one isolated place to begin work without the product inventing legal or financial readiness.

**Why this priority**: A workspace is the tenant boundary for every later record and permission. If its identity or initial ownership is ambiguous, no downstream feature can safely determine where work belongs.

**Independent Test**: From an enrolled account with no membership, create a workspace using valid English and Arabic profile values. Verify one workspace and one owner membership result, the immutable workspace identity remains stable, duplicate submission has one effect, and failed or interrupted creation never appears as a successful empty workspace.

**Acceptance Scenarios**:

1. **A-01 — Start authorized creation**: **Given** a verified, enrolled account with current online authority, **When** the user starts workspace creation, **Then** the product shows the approved initial profile, timezone, currency, and language choices and does not infer them from another account or workspace.
2. **A-02 — Validate initial defaults**: **Given** the creation form contains missing, malformed, unsupported, or contradictory values, **When** the user submits it, **Then** no workspace is created, valid input is preserved, each problem is identified, and the user receives a specific correction action.
3. **A-03 — Create one isolated workspace**: **Given** valid initial values and current authority, **When** creation succeeds, **Then** exactly one workspace with an immutable identity and exactly one active owner membership for the creator becomes available.
4. **A-04 — Reconcile interruption or retry**: **Given** creation may have succeeded but its response was lost, **When** the user retries or restarts, **Then** the original creation is resolved and returned or proven not created without creating a duplicate workspace or owner membership.
5. **A-05 — Keep readiness truthful**: **Given** a selected legal, seller, tax, currency, or document profile requires information or approval not supplied during creation, **When** the workspace opens, **Then** the workspace remains clearly marked as incomplete for affected actions and the product does not claim compliance, issuance readiness, or configured team access.

---

### User Story 2 - Switch Workspaces Without Losing or Redirecting Work (Priority: P1)

As a person who belongs to multiple workspaces, I can deliberately switch to another authorized workspace while unfinished and locally saved work remains attached to its source so that nothing is lost, exposed, or submitted to the wrong tenant.

**Why this priority**: A switch can otherwise leak customer data or turn a valid action into a mutation against the wrong workspace. Isolation and explicit handling of pending work are the core F012 safety outcome.

**Independent Test**: Open workspace A, leave one unsaved edit and one durably saved queued change, then switch to workspace B. Exercise stay, discard, and eligible-save choices for the unsaved edit. Verify the queued change remains owned by A, B sees none of A's records, counts, notices, or live updates, and a stale action captured in A cannot execute after B becomes active.

**Acceptance Scenarios**:

1. **A-06 — List only authorized choices**: **Given** the account has current membership in two workspaces, **When** the switcher opens, **Then** it identifies the current workspace and shows only workspaces the account may select without exposing names, counts, or status from any other tenant.
2. **A-07 — Resolve unsaved edits before leaving**: **Given** workspace A has an in-memory edit not yet saved locally, **When** the user selects workspace B, **Then** the user can stay in A, discard that edit, or save it to A when the action is eligible; the edit is never rebound or copied to B.
3. **A-08 — Preserve queued source work**: **Given** workspace A contains durably saved work awaiting synchronization, **When** the user switches to B, **Then** the saved work remains recoverable and owned by A, does not block a safe switch unless its own workflow requires attention, and can never be submitted as B's work.
4. **A-09 — Commit one context change**: **Given** B remains selectable and its protected local context is available, **When** the switch completes, **Then** A stops accepting interactive actions and live updates before B is presented as current, and B opens with only B's permitted state.
5. **A-10 — Reject stale actions**: **Given** a dialog, command, deep link, delayed response, or background result was prepared under workspace A, **When** it arrives after B is current, **Then** it cannot act on B or silently reactivate A and must be rejected, refreshed, or require an explicit safe switch.
6. **A-11 — Fail without mixed context**: **Given** B becomes unavailable, membership changes, protected state cannot open, or the switch is interrupted, **When** the attempt fails, **Then** the product returns to a proven safe state—A if it is still valid or a locked chooser otherwise—without displaying a mixture of A and B.

---

### User Story 3 - Restart or Work Offline Without Tenant Crossover (Priority: P2)

As an enrolled user, I can restart and, where current offline policy permits, reopen a previously retained workspace without seeing another workspace's data or mistaking unavailable content for an empty tenant.

**Why this priority**: Desktop restarts and network loss are ordinary events. The remembered selection must never override account binding, local protection, membership, or later authorization checks.

**Independent Test**: Prepare distinct synthetic data and notices in workspaces A and B, restart on and offline, and alternate selections. Verify only the selected workspace becomes visible; unavailable, expired, revoked, unreadable, or uncached states remain locked and never fall back to the other workspace or a fabricated empty one.

**Acceptance Scenarios**:

1. **A-12 — Restore the matching selection**: **Given** the last selected workspace belongs to the verified account and its protected local state remains available, **When** the app restarts, **Then** it may restore that selection only after confirming the account/profile/workspace binding and applicable authorization state.
2. **A-13 — Bound offline selection**: **Given** the device is offline, **When** the user selects a previously retained workspace, **Then** it opens only if the approved local authorization state permits it; otherwise the product shows a locked or online-required state without revealing workspace content.
3. **A-14 — Handle an unavailable local workspace**: **Given** the selected workspace was never retained locally or its protected data is missing, locked, unreadable, or incompatible, **When** it is opened, **Then** the product fails closed with recovery guidance and does not create an empty replacement or borrow another workspace's data.
4. **A-15 — Apply changed membership on reconnection**: **Given** cached state previously allowed a workspace but current service authority now denies membership, **When** the device reconnects, **Then** new reads, live updates, and queued writes for that workspace stop or are rejected, the workspace becomes unavailable, and locally recoverable work is not reassigned or exposed elsewhere.

---

### User Story 4 - Confirm the Current Workspace Before Consequential Actions (Priority: P2)

As a user handling similar clients or workspace names, I can always tell which workspace is active before an action has business, sharing, export, or administrative consequences so that I do not act in the wrong tenant.

**Why this priority**: Isolation can be technically correct while still allowing a human to make a context mistake. Consequential actions need an unambiguous workspace cue at the decision point.

**Independent Test**: Create two authorized workspaces with identical display names but different stable identities. From notifications, deep links, search results, and representative confirmation screens, verify the product identifies the target workspace, requires a safe switch when needed, and never relies on display name alone.

**Acceptance Scenarios**:

1. **A-16 — Keep current context visible**: **Given** a workspace is active, **When** the user navigates or opens a consequential action, **Then** the current workspace is persistently identifiable and the action's confirmation identifies its workspace before commitment.
2. **A-17 — Disambiguate duplicate names**: **Given** two authorized workspaces share the same display name, **When** either appears in a switcher, notice, deep link, or confirmation, **Then** a safe additional label distinguishes them without exposing private content.
3. **A-18 — Route workspace-bound entry points safely**: **Given** a notification, search result, recent item, or deep link targets a workspace other than the current one, **When** the user opens it, **Then** the product verifies current membership and either performs an explicit safe switch or refuses access; it never opens the target inside the current workspace context.
4. **A-19 — Prevent hidden cross-workspace signals**: **Given** workspace B is current, **When** the interface shows counts, badges, recent items, search results, notifications, or background status, **Then** content from A is absent from every F012 surface.

---

### User Story 5 - Create and Switch Accessibly in English or Arabic (Priority: P2)

As an English- or Arabic-speaking keyboard or assistive-technology user, I can create and switch workspaces with the same safety information so that tenant isolation does not depend on language, reading direction, or pointer input.

**Why this priority**: Workspace identity is a security cue. Mistranslated warnings, reordered identifiers, or inaccessible switch controls increase the chance of acting in the wrong tenant.

**Independent Test**: Complete successful, invalid, interrupted, offline, duplicate-name, unsaved-edit, and unavailable-workspace paths in English and Arabic using keyboard-only and screen-reader navigation at 200% zoom.

**Acceptance Scenarios**:

1. **A-20 — Preserve bilingual meaning**: **Given** either supported language, **When** creation, switching, pending-work, incomplete-setup, failure, or recovery information is shown, **Then** the meaning, consequences, and available actions are equivalent with no untranslated user-facing content.
2. **A-21 — Keep mixed-direction identity unambiguous**: **Given** an Arabic right-to-left layout containing workspace names, currencies, account identifiers, or diagnostic references, **When** those values are displayed or entered, **Then** their character order and stored values remain intact and distinguishable.
3. **A-22 — Provide accessible context changes**: **Given** a keyboard or screen-reader user, **When** workspace creation or switching changes state, **Then** focus moves predictably, the old and new workspace state is announced without leaking hidden tenants, and every required action has a non-pointer path.

### Edge Cases

- Two create submissions, windows, or devices use the same client intent; at most one workspace and initial owner membership result.
- Creation succeeds while the response is lost, the app closes, or the submitted display name is later reused; reconciliation uses the stable workspace identity rather than name matching.
- The account loses authority between opening and submitting the creation form; the stale form cannot create a workspace.
- Timezone, currency, language, or seller defaults are unsupported, removed, or changed while the form is open; submission identifies the stale choice and preserves other valid input.
- A workspace display name contains Arabic and Latin text, emoji, combining marks, leading/trailing whitespace, or the maximum supported length; validation and display remain bounded and unambiguous.
- Workspace A has unsaved text, a local staged file, a queued mutation, a conflict, or an action awaiting an online result when the user requests B; each item remains owned by A and follows its existing recovery state.
- A delayed save, dialog confirmation, live update, notification action, or permission result from A arrives after B is active; the current context does not absorb it.
- The target workspace is deleted, closed, membership-revoked, or made unavailable between selection and activation; the switch ends locked or returns to a still-valid source without mixed content.
- Two windows request different workspaces at nearly the same time; the application exposes one coherent active local profile context and makes the superseded request stale.
- The application crashes after stopping A but before presenting B; restart resolves to one workspace or a locked chooser, never a composite state.
- A malicious or malformed deep link supplies a guessed workspace identity; it reveals no existence, name, membership, count, or record data.
- Two authorized workspaces have identical names and profile labels; the switcher and confirmations use a safe stable discriminator.
- The device clock or locale changes between sessions; stored workspace identity and authorization are unaffected, while displayed dates and defaults follow the declared preference rules.
- Offline authorization is expired or not yet implemented; the product remains locked and preserves recoverable local state rather than broadening access.
- The remembered workspace belongs to a different signed-in account or local OS profile; it is ignored without exposing that workspace.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Workspace creation MUST require a verified, enrolled account with current online authority and MUST NOT be approved from cached identity or caller-supplied account data. Acceptance: A-01, A-03.
- **FR-002**: The creation flow MUST collect and validate a bounded workspace display profile, timezone, supported currency defaults, and language preferences required by the active approved configuration. Acceptance: A-01, A-02.
- **FR-003**: Invalid or stale creation input MUST create no workspace, preserve valid non-secret input where safe, identify each problem, and provide a correction or retry action. Acceptance: A-02.
- **FR-004**: A successful creation MUST establish one immutable workspace identity and one active owner membership for the verified creator; solo and future-team workspaces MUST use the same isolation model. Acceptance: A-03.
- **FR-005**: Creation MUST have one authoritative effect under double submission, concurrency, timeout, response loss, restart, and retry; an unknown outcome MUST be reconciled before a replacement attempt can create another workspace. Acceptance: A-04.
- **FR-006**: Failed, cancelled, denied, or outcome-unknown creation MUST NOT appear as a successful workspace, a usable empty tenant, or an active membership. Acceptance: A-02, A-04.
- **FR-007**: Initial legal, seller, tax, currency, and document defaults MUST be treated as editable starting configuration, and missing approval or required fields MUST visibly block only the affected later actions without a false compliance or readiness claim. Acceptance: A-05.
- **FR-008**: The workspace chooser MUST disclose only workspaces for which the verified account has selectable membership under the available authority and MUST NOT leak hidden workspace names, metadata, counts, or existence. Acceptance: A-06.
- **FR-009**: The product MUST identify the current workspace persistently and MUST identify the target workspace at the confirmation point for consequential business, sharing, export, financial, or administrative actions. Acceptance: A-16.
- **FR-010**: Workspace display names MUST NOT be used as authority or unique identity; duplicate names MUST be distinguished with a safe non-content label wherever ambiguity could cause a wrong-workspace action. Acceptance: A-17.
- **FR-011**: Starting a switch MUST make the source workspace and selected target explicit and MUST recheck target selectability before activation. Acceptance: A-06, A-09, A-11.
- **FR-012**: Unsaved in-memory changes MUST be resolved before leaving through stay, discard, or eligible save-to-source choices; they MUST NOT be copied, relabeled, or saved into the target workspace. Acceptance: A-07.
- **FR-013**: Durably saved, queued, conflicted, staged, rejected, or outcome-unknown work MUST retain its original workspace identity through switching, restart, retry, export, reconciliation, and recovery. Acceptance: A-08, A-15.
- **FR-014**: A completed switch MUST leave exactly one active workspace context for the local profile and MUST prevent source records, views, counts, notifications, live updates, search results, actions, and protected state from appearing in the target context. Acceptance: A-09, A-19.
- **FR-015**: The product MUST invalidate or context-check every user action, dialog, delayed result, background result, and workspace-bound navigation prepared before a switch so stale source work cannot execute against the target or silently reverse the switch. Acceptance: A-10.
- **FR-016**: Switching MUST be atomic from the user's perspective: the product may show a neutral transition or locked state, but it MUST NOT expose an interactive mixed source/target state. Acceptance: A-09, A-11.
- **FR-017**: Interrupted, failed, superseded, or concurrent switches MUST converge on one proven current workspace or a locked chooser without duplicating, losing, or reassigning work. Acceptance: A-10, A-11.
- **FR-018**: The remembered workspace selection MUST be scoped to the verified account and protected local profile and MUST NOT itself grant membership, unlock protected data, or override current authorization. Acceptance: A-12.
- **FR-019**: Offline workspace selection MUST be limited to locally available workspaces allowed by the approved bounded authorization state; absence, expiry, revocation, or uncertainty MUST fail closed with an online or recovery action. Acceptance: A-13, A-15.
- **FR-020**: Missing, locked, unreadable, incompatible, or wrong-account protected workspace state MUST NOT be replaced with an empty workspace, opened with another workspace's protection, or exposed through recovery details. Acceptance: A-12, A-14.
- **FR-021**: Once current service authority reports that membership is removed or unavailable, new reads, live updates, and queued writes for that workspace MUST stop or be rejected without erasing, reassigning, or exposing locally recoverable work. Acceptance: A-15.
- **FR-022**: Workspace-bound notifications, search results, recent items, deep links, and other entry points MUST verify the intended workspace and current membership before revealing content or accepting action; a different target MUST require an explicit safe switch or refusal. Acceptance: A-18, A-19.
- **FR-023**: Workspace creation and switching evidence MUST retain safe account, workspace, actor, event, outcome, authoritative time, and correlation information without customer content, credentials, protection material, hidden tenant data, or queued payloads. Acceptance: A-03, A-04, A-09, A-11.
- **FR-024**: User-facing errors MUST distinguish invalid input, online-required, no membership, unavailable workspace, pending-work decision, locked protection, and unknown outcome when the user is permitted to know, while avoiding hidden-tenant disclosure and naming a safe next action. Acceptance: A-02, A-04, A-11, A-13–A-15.
- **FR-025**: All F012 states, actions, warnings, errors, confirmations, and recovery guidance MUST provide equivalent English and Arabic meaning, full right-to-left layout, safe mixed-direction rendering, keyboard operation, visible focus, semantic status announcements, contrast, and 200% zoom usability. Acceptance: A-20–A-22.
- **FR-026**: Locale, display formatting, or a later display-name edit MUST NOT change the immutable workspace identity, membership, saved record ownership, queued-work ownership, or authorization result. Acceptance: A-03, A-17, A-21.

### Scope Boundaries

**In scope**:

- Online creation of a solo or future-team workspace by a verified enrolled account.
- Initial workspace profile, timezone, currency, and language defaults with truthful readiness states.
- Initial creator owner membership and immutable workspace identity.
- Selection among authorized workspaces, including duplicate-name disambiguation and consequential-action context.
- Safe handling of unsaved, locally saved, queued, delayed, and workspace-bound entry points during a switch.
- Account/profile/workspace isolation across switching, restart, unavailable protection, and offline-safe states.
- English/Arabic, RTL, keyboard, screen-reader, focus, contrast, and zoom behavior for F012 surfaces.

**Out of scope**:

- Invitations, resend/revoke/accept behavior, or adding another member, owned by F013.
- Role templates, permission editing, project grants, ownership transfer, or final-owner safeguards, owned by F014 and later administration features.
- Additional-device enrollment, device listing, rotation, or revocation, owned by F015.
- Selecting the offline authorization duration or enabling a production offline lease, owned by Q-06 and F016.
- Durable synchronization, live push/pull protocol, conflicts, tombstones, and permission invalidation mechanics, owned by F017–F020; F012 only preserves workspace ownership and blocks crossover at its boundary.
- Full personal, device, and workspace settings editing after creation, owned by F021.
- Workspace closure, deletion, retention, export, billing, legal/tax compliance approval, provider provisioning, deployment, implementation, or release.
- Cross-workspace aggregation of records, search, notifications, or reporting; any later aggregate surface requires its own explicitly scoped authorization and labeling.

### Key Entities

- **Workspace**: The immutable tenant and collaboration boundary. It has a stable identity, editable display name, lifecycle/readiness state, created evidence, and one or more memberships. A one-person workspace follows the same isolation rules as a team workspace.
- **Workspace Profile**: The initial and later-editable business context for a workspace, including bounded display and seller/profile values, timezone, currency defaults, and language preferences. Its completeness does not by itself establish tax, legal, financial, or release approval.
- **Workspace Membership**: The authoritative relationship between one verified account and one workspace. F012 creates the initial owner membership and consumes current selectable status; invitation and detailed grant management belong to later features.
- **Active Workspace Selection**: The one workspace currently presented for a verified account and protected local profile, together with a selection generation that makes earlier actions stale. It is a preference and context marker, not authorization by itself.
- **Workspace Local Partition**: The protected, workspace-bound set of retained records, queued work, staged items, notices, search material, and recovery state. Its contents may be available only when both the account/profile binding and applicable authorization permit access.
- **Workspace Switch Attempt**: A bounded transition from a source context to one selected target. It records safe source/target references, pending-work decision, lifecycle, outcome, and correlation evidence without containing customer payloads.

### Lifecycle and State Rules

1. Workspace creation moves from `editing` to `submitting`, then to `active`, `failed`, `cancelled`, or `outcome_unknown`. Only a reconciled authoritative success creates the workspace and initial owner membership.
2. A workspace may be `setup_incomplete` for affected legal, seller, tax, currency, or document actions while remaining a valid isolated tenant. Later readiness changes do not change its immutable identity.
3. A local profile has either no active workspace, one active workspace, a bounded `switching` state, or a locked chooser. It never has two interactive workspace contexts.
4. A switch begins by binding the attempt to its source, target, verified account, local profile, and current selection generation. Any later generation makes the attempt and its captured actions stale.
5. Unsaved edits are resolved before leaving. Durable local work keeps the source workspace identity whether synchronized, queued, conflicted, rejected, staged, or outcome-unknown.
6. Target activation occurs only after selectability and protected-context checks succeed. Failure returns to a still-valid source or the locked chooser, never a mixed context.
7. A remembered selection can suggest which workspace to reopen but cannot establish membership, offline authority, data readability, or current permission.
8. Reconnection applies current service authority. A revoked or unavailable membership stops access and submission while preserving only the recovery options allowed by later retention and export policy.

### Dependencies and Entry Gates

- F010 supplies the verified account, enrolled native profile, account/profile isolation, and protected session boundary. F012 never turns authentication alone into workspace membership.
- F005 supplies the bilingual accessible shell and safe focus, right-to-left, mixed-direction, and navigation behavior inherited by F012 surfaces.
- F006/F007 supply approved protection and encrypted local-partition behavior. F012 must fail closed when the correct protected state cannot be opened and cannot claim customer-data readiness before Q-07 evidence passes.
- F008/F009 supply the tenant-isolation and authoritative one-effect/reconciliation foundations reached transitively through F010. Workspace creation and switch evidence do not weaken their current-authority or redaction rules.
- Q-01 and Q-03 remain the gates for production legal/seller/tax/currency/document policy. F012 records configurable starting values and explicit incompleteness rather than selecting those policies.
- Q-02 remains the gate for production hosting region, plan, capacity, and service promises. Specification acceptance may use controlled synthetic workspaces without implying deployment readiness.
- Q-06 and F016 must define and approve the production offline authorization period and expiry behavior. F012 permits offline selection only through whatever bounded state is approved; no unlimited offline access is assumed.
- Q-08 and F010 remain the identity entry gates. F012 does not select sign-in, MFA, recovery, or account-switch policy.
- F013–F021 own invitations, grants, devices, offline authorization, synchronization, conflicts, deletion/rejoin, and settings. Their absence must remain visible rather than being simulated by F012.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In 100% of successful creation tests, one accepted intent produces exactly one workspace with one immutable identity and one active owner membership for the verified creator.
- **SC-002**: In 100% of invalid, denied, cancelled, duplicate, interrupted, timed-out, and outcome-unknown creation tests, no duplicate workspace, duplicate owner membership, false empty tenant, or unproven success is shown.
- **SC-003**: Across all two-workspace isolation tests, zero records, field values, counts, badges, notices, search results, recent items, queued payloads, staged items, or live updates from the non-current workspace appear in the current workspace context.
- **SC-004**: In 100% of switches with unsaved, saved-local, queued, conflicted, staged, rejected, or outcome-unknown work, every item is either deliberately discarded where allowed or remains recoverable under its original workspace; zero items are lost or reassigned to the target.
- **SC-005**: In 100% of stale dialog, delayed response, background result, deep-link, notification-action, and concurrent-window tests, no action captured in one workspace changes another workspace or silently reverses the current selection.
- **SC-006**: In 100% of restart, offline, missing-key, unreadable-state, expired-authorization, wrong-account, and wrong-profile tests, the product restores at most one permitted matching workspace or a locked chooser and never fabricates or borrows workspace data.
- **SC-007**: In 100% of membership-removal tests, once current authority reports the removal, protected reads and new submissions stop, queued writes cannot gain authority from the earlier selection, and locally recoverable work is not exposed to another workspace.
- **SC-008**: At least 90% of first-time participants with approved required information create a workspace in under three minutes without assistance, measured separately in English and Arabic and excluding service outage time.
- **SC-009**: At least 95% of participants can switch between two locally available authorized workspaces in under 30 seconds while correctly resolving an unsaved-edit prompt and identifying the final active workspace.
- **SC-010**: At least 95% of participants shown two identically named workspaces select the intended one and correctly identify the workspace of a consequential confirmation without assistance.
- **SC-011**: Every tested failure or unavailable state offers a specific safe next action—correct input, stay, save to source, discard, retry, reconcile, unlock, reconnect, choose another workspace, or seek the approved recovery path—without false success or hidden-tenant disclosure.
- **SC-012**: 100% of F012 states and actions pass English/Arabic meaning parity, right-to-left and mixed-direction review, keyboard navigation, focus visibility, semantic status announcement, contrast, and 200% zoom checks with no blocking defect.

## Assumptions

- F012 is a documentation feature in this request. It does not authorize implementation, service provisioning, deployment, publication, customer-data activation, native QA claims, merge, or release.
- Workspace creation is online-authoritative. A new workspace starts with the verified creator as its sole owner and uses the same tenant model whether the creator remains solo or later invites a team.
- The smallest complete initial profile includes a bounded display name plus the active configuration's required seller/profile values, timezone, at least one default currency, and language preferences. Additional jurisdiction-specific fields and approvals remain explicit readiness gates.
- Workspace display names are editable and need not be globally unique. Stable identity and a safe secondary label prevent ambiguity.
- A workspace may exist while selected business actions remain unavailable because legal, financial, permission, device, offline, or synchronization setup is incomplete.
- Switching does not require all source work to synchronize. It requires unsaved in-memory work to be resolved and all durable work to retain its source workspace identity.
- Offline switching is allowed only for a matching protected local partition under the bounded authorization state approved by Q-06/F016. Until that capability exists or when it expires, a locked chooser is the expected safe outcome.
- Cross-workspace dashboards, search, notifications, and reports are excluded. Account-level navigation may list authorized workspace identities but not their private contents or counts unless a later feature explicitly authorizes aggregation.
- F013 and F014 will add members and detailed grants. F012 creates only the initial owner membership and does not use workspace creation as an invitation or permission shortcut.
