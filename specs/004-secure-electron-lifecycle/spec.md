# Feature Specification: F004 — Secure Electron Lifecycle and Preload Bridge

**Feature Branch**: feat/f004-secure-electron-lifecycle-and-preload-bridge (proposed by root plan; no branch created here)

**Created**: 2026-10-18

**Status**: Draft — requirements quality reviewed and Phase 0/1 planning artifacts prepared; no implementation authorized by this request

**Input**: User description: "Build a full specs for F004 in plan.md"

**Feature / Milestone**: F004 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisite**: F003 shared domain contracts. Confirm the actual merged base and supported contract version before implementation.

**Parent requirements**: PLT-012 (one local-profile owner, safe links) and NFR-015 (unprivileged renderer, narrow trusted bridge). F004 supplies a desktop boundary for later features; it does not establish their business behavior.

**Authority**: [F004 card](../../plan.md#f004), [platform specification](../../docs/specs/platform-and-workspaces.md), [requirements](../../docs/product/requirements.md), [security](../../docs/architecture/security-and-privacy.md), [command contracts](../../docs/architecture/api-contracts.md), [constitution](../../.specify/memory/constitution.md), [decisions](../../docs/planning/decisions.md), [acceptance](../../docs/quality/acceptance.md) and [test strategy](../../docs/quality/test-strategy.md).

F004 gives each local profile one dependable application owner and protects the boundary between page content, operating-system input and privileged desktop actions. A user can reopen the app, use window controls and follow a permitted link without creating a second owner or granting the page access to files, commands, secrets or another workspace. The current shell and synthetic permitted actions can demonstrate this boundary before business features exist.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Keep One Owner for a Local Profile (Priority: P1)

As a user reopening SoloDesk, I see one active application for my profile. A second launch brings the existing window forward.

**Why this priority**: Competing owners could duplicate future timers, migrations or queued work.

**Independent Test**: Launch the same profile twice and two distinct test profiles, then inspect owners, activation and restart without business data.

**Acceptance Scenarios**:

1. **A-01 — Second launch**: **Given** one owner for a profile, **When** the profile is launched again, **Then** the original remains the only owner, receives one activation and presents a usable window; the second process starts no profile job.
2. **A-02 — Distinct profiles**: **Given** two local profiles, **When** both open, **Then** each has one owner and activation or links for one never open the other's content.
3. **A-03 — Restart**: **Given** an owner exits or crashes, **When** the same profile relaunches, **Then** a new owner starts without a permanent stale lock or overlapping owners.
4. **A-04 — Race**: **Given** simultaneous launches for one profile, **When** ownership is decided, **Then** exactly one becomes owner and losers perform no profile work.

---

### User Story 2 - Use Safe Desktop Actions (Priority: P1)

As a user, I can use permitted desktop actions while page content cannot gain arbitrary access to the computer or another account.

**Why this priority**: A compromised or malformed page must remain contained.

**Independent Test**: Exercise named shell actions with valid and hostile requests and callers, confirming effects and denials.

**Acceptance Scenarios**:

1. **A-05 — Permitted action**: **Given** an authentic application view and registered action, **When** a bounded valid request arrives, **Then** only its declared result or safe error is returned.
2. **A-06 — No broad privilege**: **Given** page content requesting arbitrary SQL, files, shell, secrets, raw message channels or unrestricted URL fetches, **When** it tries the bridge, **Then** no such operation is available or performed.
3. **A-07 — Bad request**: **Given** malformed, oversized, unsupported-version or unexpected-field input, **When** it reaches a trusted action, **Then** it is rejected before effect with a bounded redacted result.
4. **A-08 — Forged caller**: **Given** a subframe, unexpected origin, stale window or other sender, **When** it invokes a named action, **Then** it is denied even with a valid payload.
5. **A-09 — Current authority**: **Given** an action referring to a protected workspace or resource, **When** trusted current context does not authorize it, **Then** it is denied; a page claim cannot grant access. Synthetic authority is sufficient for F004 and does not certify later service rules.
6. **A-10 — Events**: **Given** a permitted event subscription, **When** its view closes, changes profile/workspace or unsubscribes, **Then** old-context delivery stops without disclosing another context.

---

### User Story 3 - Follow Only Intended Links (Priority: P1)

As a user following an application or external link, I reach a permitted destination in the right context without triggering an unexpected privileged command.

**Why this priority**: Operating-system links and page-supplied destinations are untrusted input.

**Independent Test**: Submit allowed and malicious links at cold start and second launch, including signed-out and wrong-workspace cases.

**Acceptance Scenarios**:

1. **A-11 — Allowed link**: **Given** an allowed route and record identifier for the active authorized workspace, **When** a link arrives, **Then** one appropriate window opens the destination after current access is checked.
2. **A-12 — Wrong context**: **Given** another workspace, signed-out/revoked context or a route not yet delivered, **When** a link arrives, **Then** no protected record opens and the user receives a safe sign-in, switch, unavailable or denial path without record leakage.
3. **A-13 — Hostile link**: **Given** malformed encoding, excessive length, unknown route, traversal, nested command or duplicate delivery, **When** it arrives, **Then** it causes no privileged action or duplicate handling.
4. **A-14 — External destination**: **Given** a request to open a website or other external destination, **When** evaluated, **Then** only approved schemes/destinations for a declared user purpose open; local files, script/data URLs and unexpected hosts are denied.
5. **A-15 — Navigation escape**: **Given** untrusted content trying to replace the app view or create a window, **When** navigation is requested, **Then** the trusted view remains and no unapproved window or executable remote content opens.

---

### User Story 4 - Close and Recover Predictably (Priority: P1)

As a user, I can close and reopen the window and understand whether the app remains active; a failed startup never silently replaces protected work.

**Why this priority**: Window lifecycle underpins later offline capture, migrations and background work.

**Independent Test**: Exercise native controls, quit, reopen and forced termination with synthetic in-flight work on each declared target.

**Acceptance Scenarios**:

1. **A-16 — Controls**: **Given** a visible application, **When** the user minimizes, restores, closes and reopens it, **Then** the documented platform behavior, keyboard access and focus work without extra owners.
2. **A-17 — Shutdown**: **Given** a synthetic job in progress, **When** quit begins, **Then** it completes or receives an explicit interruption/recovery result and new requests stop. This does not claim durable business writes.
3. **A-18 — Failure**: **Given** renderer failure or interrupted startup, **When** reopened, **Then** protected state is not presented as a new empty success and a safe restart/recovery path is available.
4. **A-19 — Hidden work**: **Given** the last window closes and no approved background policy exists, **When** close completes, **Then** the app does not claim a hidden timer or silently continue a privileged job. Timer/tray policy remains Q-04 and F036/F037.

---

### User Story 5 - Review Native Evidence (Priority: P2)

As a reviewer, I can inspect reproducible security and native-platform results before the user decides whether the feature PR may merge.

**Why this priority**: Source inspection or a single-platform launch cannot establish a cross-platform security claim.

**Independent Test**: Run the acceptance set on each declared Windows, macOS and Linux candidate build and compare observations with expected outcomes.

**Acceptance Scenarios**:

1. **A-20 — Native matrix**: **Given** a candidate build, **When** QA runs on each declared target, **Then** launch, second launch, focus, close/restart, keyboard controls and link outcomes have expected/observed records; unavailable targets remain gaps.
2. **A-21 — Snap case**: **Given** a supported Linux environment including the documented Snap integrated-terminal case, **When** the app starts and receives a second launch, **Then** it reaches a usable window without relaxing its security boundary; failure has recorded recovery guidance.
3. **A-22 — Bilingual failure**: **Given** a denied link or desktop action, **When** English or Arabic is selected, **Then** both explain the safe next step without internals; keyboard focus and mixed-direction identifiers remain usable.
4. **A-23 — Delivery record**: **Given** tests and agent QA, **When** reviewed, **Then** requirement/scenario IDs, build, OS/environment, results, defects and reviewer are recorded; implementation, verification, owner approval, merge and release are separate statuses.

### Edge Cases

- Concurrent cold-start links and second launches must not create two owners or duplicate effects.
- Invalid percent encoding, long links, control characters, nested URLs, fragments and route parameters must fail before navigation.
- A route may become inaccessible between receipt and use after sign-out, workspace switch or revocation.
- A sender may navigate, create a subframe or close between request and handling; old window identity grants no continuing authority.
- An event subscriber may outlive a view unless disposed; profile/workspace switches cannot carry its old context.
- An external URL may redirect or display a misleading host; it never becomes trusted app content.
- Startup/shutdown may fail during a later timer, outbox or migration. Their owners define durable recovery; F004 reports interruption.
- Linux display-server and Snap behavior may differ from ordinary development-terminal behavior; missing evidence stays a gap.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST allow at most one active owner per local profile across concurrent launches; nonowners MUST start no profile work. (A-01–A-04)
- **FR-002**: A second launch MUST transfer only bounded validated activation intent to the owner and present a usable window once; distinct profiles MUST remain isolated. (A-01–A-02, A-13)
- **FR-003**: After exit or crash, a profile MUST reopen without permanent stale ownership or overlapping owners. (A-03–A-04, A-18)
- **FR-004**: Page content MUST have no direct native runtime, database, filesystem, shell, raw desktop messaging or secret access. (A-05–A-06)
- **FR-005**: The bridge MUST expose only named, purpose-specific actions with bounded requests/results/events; generic channel, command, path or URL execution is forbidden. (A-05–A-07, A-10)
- **FR-006**: Each trusted action MUST reject invalid shape, size, version and unknown fields before effect, using applicable shared contract semantics. (A-07)
- **FR-007**: Each trusted action MUST check current expected sender, top-level frame and origin, rejecting stale, forged or unexpected callers. (A-08)
- **FR-008**: Protected actions MUST derive identity/profile/workspace authority from trusted current context, not a page claim, and deny mismatched or revoked context before effect. (A-09, A-12)
- **FR-009**: Page-visible failures MUST have stable redacted categories and safe English/Arabic guidance; internal exceptions, secrets, paths and protected details MUST NOT appear. (A-07–A-09, A-22)
- **FR-010**: Event delivery MUST be limited to the active permitted context and stop on unsubscribe, view closure, context change or authority loss. (A-10)
- **FR-011**: Application links MUST pass bounded syntax, route and identifier allowlists before navigation and MUST never directly invoke privileged operations. (A-11–A-13)
- **FR-012**: Protected links MUST resolve only after current identity, workspace, target access and route availability checks; denial MUST disclose no protected data. (A-11–A-12)
- **FR-013**: Cold-start and running-instance links MUST use the same safety rules and be handled at most once per delivered intent. (A-11, A-13)
- **FR-014**: External destinations MUST require approved schemes/destinations and a declared user purpose; unexpected navigation/window creation MUST be denied. (A-14–A-15)
- **FR-015**: The trusted view MUST reject executable remote content and preserve its declared isolation/sandbox boundary in development and release. (A-06, A-15, A-21)
- **FR-016**: Minimize, restore, close and reopen MUST follow a documented native policy on each declared platform and work with keyboard controls. (A-16, A-20)
- **FR-017**: Shutdown MUST stop new privileged work, expose a completion/interruption result for work in progress and permit its owning feature to recover. (A-17–A-18)
- **FR-018**: Closing the last window MUST NOT imply hidden timer/background processing without an approved visible policy; later work owners receive lifecycle signals needed for recovery. (A-17, A-19)
- **FR-019**: Failure recovery MUST preserve protected local state and MUST NOT present an empty replacement as successful recovery. (A-18)
- **FR-020**: Delivery evidence MUST cover security negatives and actual launch/window/keyboard/link QA on each declared Windows, macOS and Linux target, including Snap startup where applicable; missing access is a gap. (A-20–A-21)
- **FR-021**: Evidence MUST tie actual results to requirement/scenario, build, environment, expectation, defect and reviewer, while distinguishing tests from owner approval, merge and release. (A-20–A-23)

### Key Entities

- **Local profile**: Device-side ownership/isolation boundary with a stable identity and one active owner; not an authenticated workspace grant.
- **Application instance**: Owner or second-launch contender for one profile, with startup and shutdown state.
- **Application window**: Trusted view associated with a profile; its frame, origin and lifetime determine action eligibility.
- **Desktop action**: Named permitted request and bounded result under current caller context; later features supply domain effects.
- **Event subscription**: Filtered delivery relationship with a declared context and disposal point.
- **Link intent**: Untrusted navigation input with candidate destination and bounded identifiers; never grants authority.
- **Lifecycle state**: Observable startup, owner, window and shutdown status used by future recovery contracts.

### Scope, Dependencies and Decision Boundaries

**Included in F004 delivery**: One-owner lifecycle, narrow bridge and caller checks, safe links/external navigation, window/quit boundaries, and security/native evidence. Current shell and synthetic actions/routes can prove these foundations.

**Excluded from this specification request**: App/test implementation, package installation, branch/PR creation, deployment, external messages, technical plan/tasks and claims of passed runtime checks. This request produces the spec, quality checklist, active-feature pointer and root-card link.

**Excluded from F004 delivery**: Sign-in/token exchange (F010), packaged callback/signing (F029), encrypted cache/keys (F006/F007), service permissions (F008/F014), durable sync (F017–F020), complete bilingual shell (F005), actual timer/tray/idle capture (F036/F037), and business record routes. A safe entry point is not proof of those features.

**Authority and offline behavior**: Ownership, validation, window controls and safe denial work offline. Cached protected content may open only when later identity/lease/permission features provide permitted context. A link grants no cloud role, access lease, durable save or authoritative financial effect.

**Open decisions**: Q-04 owns timer reminder/tray/close policy; F004 proves baseline window behavior without inventing timer persistence. Q-11 owns exact OS/CPU/package/signing matrix; Linux-only QA cannot close it. F010/F029 own final callback policy. F003's approved bounds and versions are consumed without silent replacement.

**Recovery and compatibility**: F004 introduces no customer schema migration. Later changes to bridge or link shapes require a declared compatibility/upgrade path for supported callers and pending intents. Interrupted operations remain with their owning feature's durable recovery rules; restart never fabricates success or deletes protected state.

**Delivery evidence**: A future F004 PR includes docs/features/F004.md, docs/qa/F004.md and affected security, contract, operations and recovery guidance. Automated negatives and agent QA record candidate build, OS/CPU/display, locale, fixture, expected/observed result, redacted artifact, defect, reviewer and date. Owner approval is separate and required before merge.

### Acceptance and Constitution Traceability

| Requirements  | Scenarios       | Concern and evidence                                                              |
| ------------- | --------------- | --------------------------------------------------------------------------------- |
| FR-001–FR-003 | A-01–A-04, A-18 | I/II/III/VII: one owner, profile isolation and restart                            |
| FR-004–FR-010 | A-05–A-10, A-22 | II/V/VI: unprivileged page, caller and authority negatives, safe bilingual errors |
| FR-011–FR-015 | A-11–A-15, A-21 | II/V: hostile links, navigation and sandbox containment                           |
| FR-016–FR-019 | A-16–A-19       | III/VI/VII: controls, honest interruption and preserved protected state           |
| FR-020–FR-021 | A-20–A-23       | I/VIII: native QA, traceable evidence and separate approval                       |

Constitution I limits this request to documentation and stable IDs. II/V govern desktop trust. III/VII govern interruption and future durable work. VI governs bilingual failures and keyboard access. VIII requires observed evidence before completion claims. Later features retain their complete gates.

## Success Criteria _(mandatory)_

### Measurable Outcomes

These are future F004 targets, not results achieved by this specification.

- **SC-001**: In 100 simultaneous same-profile launch trials on each declared target, exactly one owner runs and zero duplicate profile jobs start; distinct test profiles have zero cross-profile activation.
- **SC-002**: Every registered action in the F004 set returns its declared result or safe error; all malformed, excessive, unsupported, forged-sender, wrong-frame and wrong-origin fixtures cause zero privileged effects and disclose zero protected fields.
- **SC-003**: All attempted arbitrary SQL/file/shell/secret/raw-message operations in the hostile-content set are unavailable or denied, and zero remote executable pages replace the trusted view.
- **SC-004**: Every allowed and denied link fixture gives the expected destination or safe denial at cold start and second launch; zero wrong-workspace records open and zero malformed/duplicate intents trigger privileged actions.
- **SC-005**: On each declared native target, 100% of launch, activate, minimize, restore, close, quit, crash/reopen and keyboard scenarios have recorded expected/observed outcomes; unavailable targets remain blocking gaps.
- **SC-006**: All synthetic interrupted-work/startup-failure trials have a stated completion, interruption or recovery state; zero show fabricated save, hidden timer or empty protected-data replacement.
- **SC-007**: Every selected denied-action/link message in English and Arabic states a safe next step without internals; representative reviewer trials can identify the next step by keyboard in 100% of cases. A fluent Arabic review is required for the Arabic quality claim.
- **SC-008**: Before delivery approval, all 23 acceptance scenarios and 21 functional requirements have linked observed evidence or an explicit blocker; the record separates automated checks, agent QA, owner approval, merge and release.

## Assumptions

- “F004 in plan.md” selects the existing F004 P01 card and does not request implementation or technical planning. Sequential numbering yields specs/004-secure-electron-lifecycle, independent of the proposed implementation branch.
- F003 provides the shared request/result vocabulary. F004 consumes applicable contracts only after its actual merged state and supported version are checked.
- Distinct local profiles can be created for testing; profile identity is not authenticated user/workspace authority.
- A minimal shell and synthetic purpose-specific actions/routes can prove F004. No client, project, invoice, timer, database, cloud account or file operation is presumed.
- Safe denial is the default when context, route, destination policy or authority is absent. Later features enable more actions only with their own acceptance and permissions.
- Baseline close behavior is documented per target. Hidden timer/tray continuation is not presumed while Q-04 remains open.
- Native targets follow confirmed D-02. Exact supported versions, architectures, packages and signing remain Q-11. Snap startup is a Linux regression requested by the card.
- A quality-checklist pass means the requirements are reviewable. It does not establish running controls, native QA, prerequisite merge, owner approval or release readiness.
