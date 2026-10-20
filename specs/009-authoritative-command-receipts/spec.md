# Feature Specification: F009 — Authoritative Command Receipts and Audit

**Feature Branch**: `feat/f009-authoritative-command-receipts-and-audit`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Build a full specification for F009 — Authoritative command receipts and audit in plan.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Commit a Command Exactly Once (Priority: P1)

As an authorized workspace member, I can submit a consequential command and receive an authoritative receipt so that retries, delayed responses, and repeated clicks cannot create a second effect.

**Why this priority**: A durable one-effect result is the core trust guarantee needed before identity, synchronization, invoicing, payments, or other authoritative workflows can safely depend on the service.

**Independent Test**: Submit one valid command, deliberately lose its first response, and retry the identical command using the same operation identity. Verify that the member receives the original receipt and that exactly one business effect, one accepted event, and one audit record exist.

**Acceptance Scenarios**:

1. **A-01 — First authoritative commit**: **Given** an authenticated actor with current permission, a valid workspace-scoped command, and the current expected revision, **When** the actor submits the command, **Then** the system commits the business effect, authoritative receipt, accepted event, and redacted audit record together and returns the committed result.
2. **A-02 — Identical replay after response loss**: **Given** A-01 committed but the client did not receive the response, **When** the identical command is retried with the same operation identity, **Then** the system returns the original authoritative receipt without creating another effect, event, or audit record.
3. **A-03 — Changed-payload key reuse**: **Given** an operation identity already bound to an accepted or rejected command intent, **When** any authority-relevant or payload field changes while that identity is reused, **Then** the system rejects the request as an identity collision, reveals no prior private result to an unauthorized requester, and creates no business effect.
4. **A-04 — Atomic failure**: **Given** a failure while recording any required receipt, accepted event, or audit evidence, **When** the command attempts to commit, **Then** no business effect is committed and the result does not claim authoritative success.
5. **A-23 — Receipt archival boundary**: **Given** an operation whose directly queryable receipt has reached the end of its approved retention window, **When** the same operation identity or protected financial/source claim is presented again, **Then** archival does not permit a duplicate effect and the system returns a safe retained outcome or requires reconciliation without treating the identity as unused.

---

### User Story 2 - Reject Stale or Unauthorized Intent (Priority: P1)

As a workspace owner, I can rely on every authoritative command being evaluated against current membership, current grants, the real workspace of every referenced resource, and the expected record revision so that stale devices or forged identifiers cannot exercise old authority or overwrite newer work.

**Why this priority**: Exactly-once processing is unsafe if the one accepted effect belongs to the wrong actor, tenant, resource scope, or revision.

**Independent Test**: Exercise the same bounded command using a revoked actor, a cross-workspace target, a missing action grant, and a stale expected revision. Verify that every attempt is denied without a business effect or protected-information leak, while the stale revision produces an actionable conflict only to an actor still permitted to see it.

**Acceptance Scenarios**:

1. **A-05 — Verified authority**: **Given** a structurally valid command containing claimed actor or workspace information, **When** the trusted service evaluates it, **Then** authority comes only from verified identity and current workspace/resource/action grants, not from caller-supplied claims.
2. **A-06 — Revocation before execution**: **Given** an actor who was authorized when work was prepared but whose membership or grant is revoked before execution, **When** the command reaches authoritative processing, **Then** it is rejected with no effect and no exposure of inaccessible records.
3. **A-07 — Cross-workspace reference**: **Given** a valid actor and operation identity for workspace A, **When** the command references a target that actually belongs to workspace B, **Then** the command is rejected without confirming whether the foreign target exists.
4. **A-08 — Revision conflict**: **Given** a permitted actor whose expected revision is older than the current record revision, **When** the actor submits the command, **Then** no overwrite occurs and the actor receives a safe conflict result with only the current revision or recovery reference they are authorized to know.
5. **A-09 — Concurrent submissions**: **Given** two authorized commands competing for the same expected revision, **When** they execute concurrently, **Then** at most one commits against that revision and every other attempt receives a non-success outcome without a partial effect.

---

### User Story 3 - Resolve an Unknown Outcome Safely (Priority: P2)

As a member whose connection failed during a consequential command, I can check the original operation rather than create a replacement command so that I can recover confidently without duplicating work or money movement.

**Why this priority**: Connectivity failures are normal in a desktop product with offline support; users need an honest recovery state that never guesses whether a command was applied.

**Independent Test**: Interrupt communication before the client can distinguish success from failure, then reconcile using the same operation identity. Verify that the result resolves to the original committed receipt or a proven not-applied outcome and never causes a second effect.

**Acceptance Scenarios**:

1. **A-10 — Outcome remains unknown**: **Given** the service cannot prove whether a submitted command committed, **When** it reports the attempt, **Then** the result is explicitly outcome-unknown, includes a safe way to reconcile the same operation, and does not claim success, rejection, or cancellation.
2. **A-11 — Reconcile committed operation**: **Given** an outcome-unknown command that did commit, **When** an authorized actor reconciles the original operation, **Then** the original authoritative receipt and current result are returned without repeating the effect.
3. **A-12 — Reconcile not-applied operation**: **Given** an outcome-unknown command that can later be proven not applied, **When** an authorized actor reconciles it, **Then** the result states that it was not applied and clearly permits a deliberate new attempt with a new operation identity.
4. **A-13 — Unauthorized receipt lookup**: **Given** a valid operation identity from another workspace or actor scope, **When** a requester tries to reconcile it without current access, **Then** no receipt, target, payload, or existence detail is disclosed.

---

### User Story 4 - Review a Trustworthy Audit Trail (Priority: P2)

As an authorized workspace auditor, I can review a chronological, redacted history of accepted commands so that I can establish who performed an operation, against which target and revision, when it occurred and committed, and which receipt and correlation trail explain it.

**Why this priority**: Receipts prove individual outcomes; a protected workspace history makes those outcomes reviewable for security, support, dispute, and financial-control purposes.

**Independent Test**: Execute accepted and denied commands with sensitive payload fields, then review the audit history as an authorized auditor, an ordinary contributor, and a user from another workspace. Verify complete traceability for the auditor and zero mutation or unauthorized disclosure for the others.

**Acceptance Scenarios**:

1. **A-14 — Trace accepted command**: **Given** an accepted command, **When** an authorized auditor views its audit entry, **Then** the entry identifies the verified actor, workspace, operation type, target, prior and committed revisions where applicable, client occurrence evidence when supported, service receipt and commit instants, reason where required, correlation identity, receipt identity, and a redacted change summary.
2. **A-15 — Redaction**: **Given** a command containing credentials, tokens, private document content, unrestricted diagnostics, or other excluded fields, **When** its audit entry and receipt are viewed or exported, **Then** those values are absent and the remaining summary is sufficient to identify the action without reproducing the sensitive payload.
3. **A-16 — Append-only history**: **Given** any ordinary workspace role, including Owner, **When** that actor attempts to update or delete an audit entry or rewrite a receipt, **Then** the attempt is rejected and the original evidence remains unchanged.
4. **A-17 — Scoped read and export**: **Given** an actor without the separate audit-read or audit-export grant, **When** the actor requests audit records, counts, search results, or an export, **Then** the request reveals no protected audit information; an authorized actor receives only records within the granted workspace and resource scope.
5. **A-18 — Removed actor attribution**: **Given** an accepted command whose actor is later removed or pseudonymized, **When** an authorized auditor reviews the event, **Then** the evidence retains a stable non-reassignable actor reference and does not falsely attribute the action to another person.
6. **A-24 — Temporary service audit access**: **Given** a named service operator with an approved, unexpired minimum-scope audit grant, **When** the operator accesses permitted evidence for the stated purpose, **Then** only that scope is disclosed and the access is itself audited; absent, expired, or broader access is denied without Owner impersonation.

---

### User Story 5 - Continue from an Ordered Accepted Event (Priority: P3)

As an authorized synchronization consumer, I can continue from the authoritative progress position returned with accepted commands so that later changes are read in commit order without skipping or inventing accepted work.

**Why this priority**: F009 establishes the accepted event position that later synchronization depends on, while full incremental pull and client application remain owned by F018.

**Independent Test**: Accept several commands with reordered client occurrence times, then inspect their accepted events and progress positions. Verify that service commit order is stable, every event points to its original operation and receipt, and an audit failure advances neither business state nor progress.

**Acceptance Scenarios**:

1. **A-19 — Authoritative ordering**: **Given** multiple accepted commands whose client clocks disagree, **When** their events are observed, **Then** each has a unique authoritative commit position independent of client wall-clock order.
2. **A-20 — Receipt-event correlation**: **Given** an accepted event, **When** an authorized consumer traces it, **Then** its workspace, operation, target revision, receipt, and audit correlation agree with the committed command.
3. **A-21 — No cursor gap on rollback**: **Given** a command whose required evidence cannot be committed, **When** the transaction rolls back, **Then** no accepted event is published and the authoritative progress position does not advance for that failed effect.
4. **A-22 — Unsupported event consumer**: **Given** a consumer that does not understand an accepted event version, **When** it encounters the event, **Then** it stops safely without advancing its progress position or discarding the unprocessed event.
5. **A-25 — Recovery integrity mismatch**: **Given** a restored or migrated environment in which a business effect, receipt, audit entry, accepted event, or progress position is missing or inconsistent, **When** authoritative readiness is checked, **Then** authoritative writes remain unavailable until the evidence is reconciled or recovered.

### Edge Cases

- A command is retried concurrently from two devices with the same operation identity and identical payload; both callers must converge on one authoritative receipt and one effect.
- The same operation identity is reused with a changed expected revision, target, actor context, reason, or omitted field; intent comparison treats any authority-relevant difference as changed payload and rejects it.
- A command is structurally valid but the target is deleted, archived, moved out of scope, or its permission changes between validation and commit; authority and target state are rechecked at commit.
- A request arrives after the original receipt has passed its approved online lookup period; the system must still protect permanent uniqueness and financial/source-ownership invariants, and must never infer that reuse is safe merely because a receipt was archived.
- A client-supplied occurrence time is missing, in the future, or far older than receipt retention; service received/commit time and authoritative order remain trusted, while client time is only bounded evidence.
- Audit summary generation encounters an unknown or sensitive field; the command fails closed or uses an approved minimal summary without copying the raw payload.
- An audit viewer loses permission during pagination or export; every page and artifact is reauthorized, and the operation stops without exposing later records.
- Audit export is requested in English or Arabic with mixed-direction identifiers; localized labels and layout must not alter stable IDs, instants, revisions, or evidence meaning.
- Storage or service recovery restores business data but not matching receipts, audit, and progress evidence; the recovered environment remains unavailable for authoritative writes until integrity is reconciled.
- An accepted command initiates a later external job; the receipt proves only authoritative job acceptance, not delivery, settlement, or provider completion.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every authoritative command MUST carry a stable operation identity, bounded operation type, workspace scope, request correlation identity, and expected target revision whenever the operation changes an existing revision. Acceptance: A-01, A-08.
- **FR-002**: The system MUST derive the actor from verified credentials and MUST re-evaluate current workspace membership, resource scope, and action grant at execution time; caller-supplied actor, role, or workspace claims MUST NOT grant authority. Acceptance: A-05, A-06, A-07.
- **FR-003**: The system MUST bind each operation identity to a canonical representation of the complete command intent, including every authority-relevant field, and MUST reject reuse with any changed intent. Acceptance: A-03.
- **FR-004**: An identical replay of a completed operation by an actor currently permitted to see its result MUST return the original authoritative outcome and receipt without repeating the effect. Acceptance: A-02, A-11.
- **FR-005**: Receipt lookup and replay results MUST apply current authorization and MUST NOT disclose the existence, target, payload, actor, or outcome of another tenant's or inaccessible operation. Acceptance: A-03, A-13, A-17.
- **FR-006**: Command execution MUST enforce expected revisions and domain invariants at commit so that stale or concurrent commands cannot silently overwrite accepted state. Acceptance: A-08, A-09.
- **FR-007**: The business effect, resulting revision, command receipt, redacted audit entry, and accepted event/progress position MUST commit atomically; failure of any required part MUST roll back all parts. Acceptance: A-01, A-04, A-21.
- **FR-008**: An authoritative receipt MUST identify the operation, workspace, operation type, result target, committed revision where applicable, authoritative commit instant, correlation identity, and accepted event position where applicable, without reproducing secret or private payload content. Acceptance: A-01, A-15, A-20.
- **FR-009**: The system MUST distinguish authoritative commit, rejection proven not applied, revision conflict, accepted background work, and outcome unknown; it MUST NOT label local persistence, queued work, timeout, or job acceptance as a completed business or provider effect. Acceptance: A-01, A-08, A-10, A-12.
- **FR-010**: Outcome-unknown results MUST direct the client to reconcile the same operation identity before any replacement attempt, and reconciliation MUST resolve to the original receipt or a proven not-applied result when evidence becomes available. Acceptance: A-10, A-11, A-12.
- **FR-011**: Every accepted command MUST append exactly one audit entry containing the verified actor reference, workspace, operation, target, applicable prior/committed revisions, supported client occurrence evidence, authoritative received/commit instant, required reason, correlation and receipt references, and a bounded redacted change summary. Acceptance: A-14, A-18, A-20.
- **FR-012**: Audit records and authoritative receipts MUST be append-only for ordinary workspace roles; no Owner, Admin, or other ordinary member role may update or delete historical evidence. Corrections MUST be represented by linked new commands and audit entries. Acceptance: A-16.
- **FR-013**: Audit reads, counts, search, and exports MUST require separate current grants, enforce workspace and resource scope on every access, and preserve stable evidence values across English and Arabic presentation. Acceptance: A-17.
- **FR-014**: Audit and receipt projections MUST exclude credentials, session material, secrets, unrestricted diagnostic data, raw request payloads, and protected content not required for the approved redacted summary. Acceptance: A-15.
- **FR-015**: Accepted events MUST have an authoritative progress position based on service commit order, correlate to the original operation and receipt, and remain independent of untrusted client clock ordering. Acceptance: A-19, A-20.
- **FR-016**: Consumers encountering an unsupported event kind or version MUST stop before applying the event or advancing progress, while preserving the event for an upgrade or recovery path. Acceptance: A-22.
- **FR-017**: Receipts MUST remain directly reconcilable for at least the approved maximum retry and supported offline window; archival MUST NOT remove permanent uniqueness, financial-effect, or source-ownership protections. The exact retention periods MUST remain configurable and unclaimed until approved under the F009 entry gate. Acceptance: A-02, A-11, A-23.
- **FR-018**: Service or support access to audit evidence MUST be disabled unless a separately approved policy grants a named operator the minimum workspace scope, purpose, duration, and action; every such access MUST itself be auditable and MUST NOT confer workspace Owner authority. Acceptance: A-17, A-24.
- **FR-019**: Recovery and migration procedures MUST verify that business effects, receipts, audit records, accepted events, and progress positions remain mutually consistent before authoritative writes resume. Acceptance: A-20, A-21, A-25.
- **FR-020**: User-visible receipt, conflict, rejection, outcome-unknown, and audit-review states introduced by this feature MUST have equivalent English and Arabic meaning, full RTL-safe presentation, keyboard access, semantic focus behavior, and recovery guidance without translating or reordering stable evidence values. Acceptance: A-08, A-10, A-14, A-17.

### Scope Boundaries

**In scope**:

- The authoritative processing contract for workspace-scoped commands.
- Operation identity, canonical intent binding, replay handling, expected revisions, and safe outcome reconciliation.
- Atomic authoritative receipts, redacted append-only audit evidence, accepted events, and progress positions.
- Authorization rules for receipt reconciliation and audit read/search/export.
- Retention and service-access policy gates needed to prevent unsafe production claims.

**Out of scope**:

- Local outbox persistence and push orchestration (F017), incremental event pull and permission invalidation (F018), and end-user conflict resolution (F019).
- Browser sign-in, device enrollment, and session recovery (F010–F016), except for consuming their verified identity and current grants when available.
- Domain-specific business rules for invoices, payments, proposals, files, jobs, or provider delivery; those features use this foundation and remain responsible for their own validation and evidence.
- An independently tamper-evident external audit archive, security-information event platform, or unrestricted support impersonation.
- Final retention durations, legal-hold periods, jurisdictional audit obligations, or production support staffing; these require explicit owner and legal/operations approval.

### Key Entities

- **Command Intent**: The bounded requested authoritative action. Key attributes: operation identity, operation type and version, workspace, request correlation, expected revision where required, target reference, supported client occurrence evidence, and canonical intent digest. The actor is verified separately and is not trusted from caller data.
- **Authoritative Command Receipt**: Durable evidence of a command's authoritative outcome. Key attributes: receipt identity, original operation identity, verified workspace and actor scope, operation type, result status, target/result identity, committed revision, service received/commit instant, correlation identity, accepted event position, and retention class.
- **Audit Entry**: Append-only redacted evidence explaining an accepted command or approved audit-access action. Key attributes: workspace, stable actor reference, operation, target, before/after revisions, supported occurrence and commit instants, reason, correlation and receipt references, redacted change summary, and retention class.
- **Accepted Event**: Ordered evidence that an authoritative state transition committed. Key attributes: event identity and version, workspace, target and accepted revision, original operation and receipt references, verified actor reference when permitted, service commit instant, authoritative progress position, and a bounded non-secret projection.
- **Authoritative Progress Position**: An opaque position in accepted commit order used by later synchronization. It is not a wall-clock time, money value, entity revision, or proof that an external provider completed work.
- **Reconciliation Reference**: A safe reference allowing an authorized client to resolve an outcome-unknown attempt using the original operation identity without creating a replacement effect.
- **Audit Access Grant**: A separate permission describing who may read, search, or export audit evidence and, for service operators, the approved purpose, minimum workspace scope, duration, and access audit trail.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Across all tested identical retries, concurrent duplicates, and lost-response scenarios, 100% converge on exactly one business effect, one authoritative receipt, one accepted event, and one accepted-command audit entry.
- **SC-002**: Across all changed-intent reuse tests, 100% are rejected with zero additional business effects and zero protected receipt or payload disclosure.
- **SC-003**: Across revoked-member, missing-grant, cross-workspace, stale-revision, and concurrent-revision tests, 100% of unauthorized or losing attempts commit no partial business effect.
- **SC-004**: In 100% of injected failures while writing required receipt, audit, or accepted-event evidence, the associated business change is absent and the authoritative progress position does not advance.
- **SC-005**: In 100% of response-loss tests, an authorized user can resolve the original operation to its committed receipt or a proven not-applied result without creating a replacement effect.
- **SC-006**: In audit privacy tests covering ordinary members, cross-workspace users, revoked users, and expired service access, zero protected audit rows, counts, search matches, export fields, or receipt-existence details are disclosed.
- **SC-007**: In 100% of accepted-command samples, an authorized reviewer can trace actor, workspace, operation, target, revisions, authoritative timing, correlation, receipt, and accepted event while excluded secret/private fields remain absent.
- **SC-008**: In 100% of mutation attempts by ordinary workspace roles, existing receipts and audit entries remain unchanged; corrections appear only as linked new evidence.
- **SC-009**: In 100% of recovery and migration verification fixtures, authoritative writes remain disabled whenever business state, receipt, audit, event, or progress evidence does not reconcile.
- **SC-010**: All user-visible F009 states and recovery actions pass equivalent English/Arabic meaning, RTL, keyboard, focus, and screen-reader review with stable identifiers, revisions, and timestamps preserved exactly.
- **SC-011**: During representative usability QA, at least 90% of participants correctly distinguish committed, rejected, conflict, job-accepted, and outcome-unknown results on the first attempt and choose reconciliation rather than creating a duplicate command after an unknown outcome.

## Assumptions

- F008 supplies the prerequisite authoritative tenant boundary and current membership/grant checks. F009 does not mark F008 complete or replace its delivery evidence and approval gates.
- F003 supplies shared bounded request/result/event vocabulary and exact identifiers. F009 adds durable authoritative behavior; it does not treat structural validation as permission or proof of persistence.
- Consequential commands require online authority. Later offline-capable features may prepare and queue eligible intent, but a local or queued receipt is never an F009 authoritative receipt.
- Operation identity is scoped tightly enough to prevent collision across workspace, verified actor, and operation type while remaining stable across retries of the same intent.
- A safe default is to retain directly queryable receipts for at least the approved retry/offline compatibility window and to preserve permanent uniqueness for financial effects after archival. Exact receipt, audit, backup, and legal-hold durations remain an explicit F009 entry decision and must be approved before production.
- Workspace audit read and export are separate grants. Temporary service/support audit access is off by default and cannot be enabled for production until its approver, purpose, duration, scope, redaction, notification, and review policy are approved.
- An append-only audit trail protected from ordinary roles is required. Independently tamper-evident storage is a separate, threat-driven enhancement and is not claimed by this feature.
- F009 is a documentation specification under the current authorization. It does not authorize additional implementation, provisioning, deployment, publication, or changes to the open PR described in `plan.md`.
