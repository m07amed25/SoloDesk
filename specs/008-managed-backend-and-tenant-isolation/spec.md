# Feature Specification: F008 — Managed Backend and Tenant Isolation

**Feature Branch**: `feat/f008-managed-backend-and-tenant-isolation` (proposed in the root plan; no branch created here)

**Created**: 2026-10-19

**Status**: Draft — specification only; implementation and release require separate evidence and approval

**Input**: User description: "Make a spec for f008 at @[/home/mohamed-s/Desktop/SoloDesk/plan.md]"

**Feature / Milestone**: F008 / P01 — Secure desktop, identity, teams and offline cloud foundation

**Prerequisites**: F003 shared domain contracts, primitives, and envelope error models. F008 provides the authoritative cloud database schema, tenant isolation, Row Level Security baseline, private object storage, and bounded server function entry points required by subsequent features, including F009 (authoritative command receipts and audit), F010 (browser sign-in and device enrollment), F017 (durable outbox push), and F018 (incremental pull sync).

**Parent requirements**: PLT-003, PLT-005, NFR-004, NFR-009. Supporting constraints: PLT-001, PLT-004, PLT-006, PLT-014, D-10, D-11, D-14, D-15, D-18, D-19, A-01, A-03, A-04, Q-02, and Constitution Principles I, II, III, V, and VIII.

**Authority**: [F008 card](../../plan.md#f008), [platform and workspaces](../../docs/specs/platform-and-workspaces.md), [backend selection and cost profile](../../docs/architecture/backend-stack.md), [security, privacy and trust model](../../docs/architecture/security-and-privacy.md), [conceptual data model](../../docs/architecture/data-model.md), [API contracts](../../docs/architecture/api-contracts.md), [requirements](../../docs/product/requirements.md), [decisions](../../docs/planning/decisions.md), [acceptance](../../docs/quality/acceptance.md), [test strategy](../../docs/quality/test-strategy.md), and [constitution](../../.specify/memory/constitution.md).

F008 defines the authoritative cloud backend structure and multi-tenant security architecture for SoloDesk. In a managed cloud environment hosting data for independent freelancers and collaborative teams, every database query, mutation, aggregate calculation, search index, and file storage access must be strictly isolated by workspace. A user belonging to one workspace must never be able to view, mutate, enumerate, or deduce the existence of records or files belonging to another workspace, even when attempting forged parameters, manipulated requests, or direct API access.

F008 establishes the relational schema, tenant key constraints, database-level Row Level Security (RLS) policies, private object storage containers, least-privilege role validation, and bounded edge function execution boundaries. Solo freelancers and multi-member teams share the exact same tenant isolation architecture (a single-member workspace uses the identical isolation model as a team workspace). F008 also establishes operational quota monitoring and graceful degraded-mode handling, ensuring that provider limits and unexpected cloud outages preserve uncommitted local work without data loss.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Strict Multi-Tenant Data Isolation and Cross-Workspace Boundary Defense (Priority: P1)

As a freelancer or team member storing confidential client, project, financial, and time-tracking data on managed cloud infrastructure, I need my workspace data to be strictly isolated at the database level from all other tenants so that no other user or organization can read, alter, count, or discover my records under any circumstance.

**Why this priority**: Cross-tenant data leakage is an existential security and privacy violation that breaches client confidentiality, professional trust, and data protection regulations. Tenant isolation must be fail-closed and enforced at the database engine level, not merely through client-side filtering or application conventions.

**Independent Test**: Provision two completely separate test workspaces (Tenant Alpha and Tenant Beta) with distinct user accounts. Seed both workspaces with representative clients, projects, tasks, and time entries. Using direct authenticated API requests as a member of Tenant Alpha, attempt to read records from Tenant Beta by ID, query lists with Tenant Beta's workspace identifier, execute aggregate counts (`COUNT`, `SUM`), perform fuzzy searches, and submit batch update or delete operations targeting Tenant Beta. Verify that 100% of unauthorized cross-tenant requests fail closed, returning empty or forbidden responses without revealing the existence, schema structure, or record count of Tenant Beta.

**Acceptance Scenarios**:

1. **A-01 — Denied cross-workspace read queries**: **Given** an authenticated user belonging exclusively to Workspace Alpha, **When** they submit a query requesting a record ID that belongs to Workspace Beta, **Then** the database denies access and returns a resource-unavailable or forbidden response without revealing whether the record ID exists.
2. **A-02 — Denied cross-workspace mutations**: **Given** an authenticated user belonging exclusively to Workspace Alpha, **When** they attempt an insert, update, or delete operation specifying Workspace Beta's identifier or modifying a record in Workspace Beta, **Then** the operation is rejected by the database security policy and zero rows are modified.
3. **A-03 — Zero leakage in search and aggregations**: **Given** records across multiple workspaces containing identical search keywords or numeric values, **When** a user in Workspace Alpha performs text searches, summary calculations, or record counts, **Then** results reflect only records within Workspace Alpha, with zero aggregate or count leakage from other tenants.
4. **A-04 — Immutable workspace identifier**: **Given** an existing record in Workspace Alpha, **When** any update mutation attempts to alter its `workspace_id` column to a different workspace, **Then** the relational engine rejects the change with an integrity violation.

---

### User Story 2 - Least-Privilege Role Authorization and Ownership Continuity (Priority: P1)

As a workspace administrator or owner, I need every server-side command and data query to validate the acting user's current workspace membership and role permissions (Owner, Admin, Manager, Contributor, Finance, Viewer) so that team members can only access capabilities within their granted scope, permission revocations take effect immediately, and the workspace is protected against accidental abandonment.

**Why this priority**: Role-based access control protects sensitive financial, contractual, and administrative operations from unauthorized internal modification. Immediate enforcement ensures that removed or downgraded members cannot exploit stale sessions, and mandatory owner transfer prevents orphaned workspaces.

**Independent Test**: Configure a test workspace with users assigned to each supported role template. Attempt role-restricted actions (e.g., viewing financial summaries as a Contributor, updating workspace profile defaults as a Viewer, issuing an invoice as a Manager, altering role assignments as an Admin). Revoke a member's access while their session is active and verify that subsequent requests are immediately blocked. Attempt to remove the sole workspace Owner or have the sole Owner leave without transferring ownership, verifying that the operation is strictly rejected.

**Acceptance Scenarios**:

5. **A-05 — Authoritative real-time role evaluation**: **Given** an authenticated user submitting a service command, **When** the backend evaluates the request, **Then** authorization is determined by the user's current verified membership and capability grants in the database, rejecting client-asserted roles or cached privilege claims.
6. **A-06 — Immediate enforcement of revocation and downgrades**: **Given** a user whose membership is revoked or whose role is downgraded by a workspace administrator, **When** the user attempts further operations using an existing authenticated session, **Then** the backend immediately rejects the request with an authorization failure.
7. **A-07 — Protected workspace ownership continuity**: **Given** a workspace with a single user holding the Owner role, **When** an attempt is made to delete that owner's membership, downgrade their role, or have them leave the workspace, **Then** the backend rejects the action with an explicit requirement to transfer ownership to another eligible member first.
8. **A-08 — Auditable membership and permission modifications**: **Given** an authorized administrator updating a member's role or inviting a new member, **When** the change is committed, **Then** an immutable audit entry records the acting user, target user, workspace, timestamp, and permission delta.

---

### User Story 3 - Private Object Storage and Scoped Asset Access (Priority: P1)

As a user uploading invoices, signed agreements, expense receipts, and project attachments, I need my files stored in private cloud storage containers where every file is partitioned by workspace and accessible only through time-limited, authenticated access tokens granted after verifying current workspace permissions.

**Why this priority**: Business attachments often contain confidential financial, legal, and personal data. Unprotected cloud storage buckets or guessable public URLs create severe data leakage vulnerabilities.

**Independent Test**: Upload attachments into Workspace Alpha's storage bucket. Attempt direct unauthenticated HTTP access to the raw storage URL. Attempt access using valid authentication credentials from Workspace Beta. Tamper with signed download URL tokens, path parameters, and query strings. Verify that all unauthenticated and cross-tenant access attempts are rejected, and authorized downloads succeed only with valid, time-limited tokens generated after verifying workspace membership.

**Acceptance Scenarios**:

9. **A-09 — Private storage by default**: **Given** files stored in cloud object storage, **When** any request attempts access without a valid authenticated signature, **Then** the storage service denies access with an HTTP unauthorized or forbidden status code.
10. **A-10 — Tenant-partitioned storage hierarchy**: **Given** an authorized file upload, **When** the file is placed into cloud storage, **Then** its storage path strictly incorporates the immutable `workspace_id` as the top-level path prefix, preventing path traversal outside the tenant boundary.
11. **A-11 — Time-limited, permission-verified download links**: **Given** an authenticated user requesting access to an attachment, **When** the backend verifies that the user currently possesses read permission for the owning entity in that workspace, **Then** it generates a short-lived, signed download URL that expires after a bounded duration (default 15 minutes) and cannot be reused across tenants.
12. **A-12 — Denied cross-tenant file manipulation**: **Given** an authenticated user in Workspace Alpha, **When** they attempt to delete, overwrite, or reference a file path belonging to Workspace Beta, **Then** the storage security policy blocks the operation and leaves the target file unmodified.

---

### User Story 4 - Relational Integrity and Cross-Tenant Constraint Defense (Priority: P1)

As a system architect and data steward, I need the database schema to enforce relational foreign keys and composite tenant constraints at the engine level so that corrupted payloads, software bugs, or malicious attempts cannot create cross-tenant links or orphaned entities.

**Why this priority**: Application-layer checks can have flaws; database-level foreign key and uniqueness constraints provide an impenetrable second layer of defense, ensuring that data relationships remain mathematically consistent within a single tenant boundary.

**Independent Test**: Attempt to insert a project in Workspace Alpha referencing a client in Workspace Beta. Attempt to insert a task in Workspace Alpha referencing a project in Workspace Beta. Attempt to link a time entry in Workspace Alpha to a task in Workspace Beta. Attempt to insert an entity with an unrecognized or mismatched `workspace_id`. Verify that composite foreign key constraints `(workspace_id, parent_id)` reject 100% of cross-tenant reference attempts at the database level.

**Acceptance Scenarios**:

13. **A-13 — Composite tenant foreign key enforcement**: **Given** any child entity with a foreign key relationship to a parent entity (e.g., project to client, task to project, time entry to task), **When** a record is created or updated, **Then** the database enforces composite foreign keys including `workspace_id`, rejecting any attempt to link entities across different workspaces.
14. **A-14 — Orphan prevention across tenant graphs**: **Given** a deletion or archival of a parent record, **When** foreign key constraints are evaluated, **Then** dependent child records are handled according to strict referential integrity rules within the tenant boundary, preventing orphaned or disconnected data.
15. **A-15 — Uniform tenant attribution**: **Given** complex multi-entity transactions, **When** records are persisted across related tables, **Then** the database verifies that all created or updated records share the identical, verified `workspace_id`.

---

### User Story 5 - Quota Visibility, Provider Limits, and Graceful Degraded Operation (Priority: P2)

As a freelancer or team administrator operating on managed cloud infrastructure with defined resource allowances, I need clear visibility into database storage, file storage, and egress consumption, with proactive threshold alerts and graceful degradation to local offline operation during outages or quota exhaustion without losing work.

**Why this priority**: Resource-constrained tiers (such as development, pilot, or free-tier allowances) have strict database size, storage volume, and activity limits. Users must understand their quota status before limits are hit, and temporary cloud unavailability must never crash the app or destroy unpushed local drafts.

**Independent Test**: Simulate approaching provider capacity thresholds (70%, 85%, 95%, and 100% utilization of database and file storage). Simulate cloud service unavailability (provider maintenance, network failure, or inactivity pause). Verify that the system delivers clear, bilingual status messages in English and Arabic, stops cloud uploads safely when quotas are exhausted without deleting existing records, and allows users to continue working in local offline mode with full draft retention.

**Acceptance Scenarios**:

16. **A-16 — Proactive quota threshold alerts**: **Given** a workspace approaching provider storage or egress limits, **When** resource utilization reaches configured warning thresholds (70%, 85%, 95%), **Then** the interface displays informative, bilingual notifications in English and Arabic detailing current usage and recommended actions.
17. **A-17 — Safe behavior on quota exhaustion**: **Given** a workspace that has reached 100% of its storage or egress quota, **When** a user attempts to upload new files or create records requiring cloud storage, **Then** the system rejects the cloud write cleanly, explains the quota limit in English and Arabic, and retains local drafts safely in the local offline outbox without data loss.
18. **A-18 — Non-destructive operation during cloud unavailability**: **Given** a managed cloud provider outage, project pause, or network disconnection, **When** the client application cannot reach backend services, **Then** the system transitions gracefully to offline mode, clearly indicates the degraded status, and allows continued local drafting without displaying empty screens or discarding existing data.

---

### Edge Cases

- **Forged workspace identifier in API payload**: If a malicious client passes `workspace_id = 'tenant-beta'` while authenticated as `tenant-alpha`, the backend extracts the verified workspace identity from the user's active session and database membership, rejecting the mismatched payload with `FORBIDDEN`.
- **Direct database access attempt using client credentials**: The database denies direct connections from public clients; access is restricted exclusively to authenticated requests evaluated against Row Level Security policies, with superuser and service-role credentials strictly withheld from client distribution.
- **Concurrent membership revocation during active transaction**: If an administrator revokes a user's membership while a multi-statement transaction is executing, the database transaction validates membership at execution time; uncommitted statements are rejected and rolled back.
- **Cross-tenant file path traversal in attachment references**: If a client attempts to supply a storage path containing relative segments (e.g., `../../workspace-beta/contracts/file.pdf`), path sanitization and strict prefix validation reject the path before storage interaction.
- **Identical search terms across multiple tenants**: Full-text search and vector indices partition index queries by `workspace_id`, ensuring that query execution plans incorporate tenant filters before computing relevance rankings or candidate matches.
- **Attempted deletion of the sole workspace owner**: Database triggers and constraints reject the removal or role change of the last remaining Owner in a workspace, requiring explicit transfer of the Owner role to another active member as a prerequisite.
- **Provider inactivity auto-pause on development instances**: When operating against a paused pilot or development instance, the client application recognizes the inactive/unreachable state, avoids corrupting local state or displaying false empty databases, and provides clear diagnostic guidance.
- **Storage quota exhausted mid-upload**: If a file upload exceeds available bucket quota during streaming, the storage gateway halts the transfer, removes partial/orphaned chunks, and returns a quota-exceeded error with the file retained in the local staging queue.
- **Bilingual and mixed-direction data in workspace profiles**: Workspace legal entity names, currency symbols, and address fields containing mixed English and Arabic bidirectional text are stored in canonical UTF-8 with zero data truncation, preserving correct reading order and formatting.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The backend database MUST enforce tenant isolation across 100% of workspace tables using Row Level Security (RLS) policies that default to deny-all and permit access only when the verified authenticated user possesses an active membership in the matching `workspace_id`. Acceptance: A-01, A-02.
- **FR-002**: Every tenant-scoped table MUST include an immutable `workspace_id` column as part of its primary key or primary composite uniqueness constraint, and the system MUST reject any mutation that attempts to alter the `workspace_id` of an existing record. Acceptance: A-04.
- **FR-003**: The database MUST enforce composite foreign key constraints combining `(workspace_id, parent_id)` on all relational child entities, strictly preventing any reference from crossing workspace boundaries. Acceptance: A-13, A-15.
- **FR-004**: Database-level Row Level Security policies MUST apply to all query types, including `SELECT`, `INSERT`, `UPDATE`, `DELETE`, aggregate calculations (`COUNT`, `SUM`, `AVG`), and full-text search queries, preventing any cross-tenant data leakage or existence inference. Acceptance: A-01, A-02, A-03.
- **FR-005**: The backend MUST validate the acting user's current workspace membership and role grants (Owner, Admin, Manager, Contributor, Finance, Viewer) dynamically on every service command and restricted query, rejecting stale or cached client permissions. Acceptance: A-05.
- **FR-006**: Membership revocations and role downgrades MUST take effect immediately on all subsequent requests, terminating access without requiring session token expiration. Acceptance: A-06.
- **FR-007**: The system MUST enforce workspace owner continuity at the database constraint level, preventing the sole remaining Owner of a workspace from being deleted, leaving, or having their role downgraded without prior ownership transfer. Acceptance: A-07.
- **FR-008**: All changes to workspace membership, role assignments, and ownership MUST generate immutable, append-only audit log records containing the actor, target identity, workspace, timestamp, and permission delta. Acceptance: A-08.
- **FR-009**: Cloud object storage containers MUST be private by default, rejecting all unauthenticated public requests and enforcing tenant isolation through storage-level security policies. Acceptance: A-09.
- **FR-010**: All stored file objects MUST use path structures prefixed by the verified `workspace_id`, and storage policies MUST reject any upload, read, or deletion attempt outside the user's authorized workspace path prefix. Acceptance: A-10, A-12.
- **FR-011**: Attachment downloads MUST require short-lived, permission-verified signed access tokens that expire after a bounded duration (default 15 minutes) and are granted only after confirming the user's current read access to the owning entity. Acceptance: A-11.
- **FR-012**: Service-role and superuser database credentials MUST be stored exclusively in secure server-side secret vaults and MUST NEVER be bundled, distributed, or exposed to desktop client applications or web browser contexts. Acceptance: A-01, A-02, A-09.
- **FR-013**: The backend MUST provide resource quota tracking for database storage, object storage, and data egress, exposing current utilization and delivery warnings at defined thresholds (70%, 85%, 95%). Acceptance: A-16.
- **FR-014**: When storage or egress quotas are exhausted, the backend MUST reject new cloud writes cleanly with descriptive errors while preserving all existing stored records and files intact. Acceptance: A-17.
- **FR-015**: The client application MUST handle cloud service unavailability, provider pauses, and quota rejections non-destructively, gracefully transitioning to local offline operation and preserving pending edits in the local outbox. Acceptance: A-17, A-18.
- **FR-016**: All error responses, quota notifications, and recovery states generated by backend services MUST provide localized text in both English and Arabic with full RTL support and WCAG 2.2 AA accessibility compliance. Acceptance: A-16, A-17, A-18.

### Key Entities

- **Workspace Tenant**: The authoritative boundary of isolation representing an independent organization, business entity, or solo freelancer account. Key attributes: immutable workspace identifier, legal entity name, default timezone, default currencies, default locale (English/Arabic), creation instant, and lifecycle state (`active`, `suspended`, `closing`, `archived`).
- **Membership & Role Grant**: The binding between an authenticated user identity and a workspace tenant. Key attributes: workspace identifier, user identifier, role template (`owner`, `admin`, `manager`, `contributor`, `finance`, `viewer`), custom capability grants, membership status (`active`, `invited`, `suspended`, `revoked`), granted-by actor reference, and granted instant.
- **Tenant Storage Bucket & Object**: A cloud object storage container and its contained assets. Key attributes: bucket identifier, tenant path prefix (`workspaces/{workspace_id}/...`), object identifier, content type, content size in bytes, SHA-256 integrity hash, access tier (`private`), upload instant, and owning entity reference.
- **Domain Command Gateway**: The bounded serverless edge function execution boundary handling authenticated commands and queries. Key attributes: protocol version, correlation identifier, idempotency token, verified actor identity, verified workspace identifier, execution duration limit, and error envelope.
- **Tenant Audit Event**: An immutable record of an administrative or high-consequence workspace action. Key attributes: event identifier, workspace identifier, actor identity, action type (`membership_grant`, `role_change`, `owner_transfer`, `member_revoke`, `policy_update`), target resource reference, occurred instant, and redacted change diff.
- **Provider Quota Profile & Health State**: The operational tracking structure monitoring resource usage against provider allowances. Key attributes: workspace identifier, database storage used bytes, object storage used bytes, monthly egress used bytes, quota limits, current utilization percentage, alert threshold tier (`normal`, `warning_70`, `warning_85`, `critical_95`, `exhausted_100`), provider operational status (`operational`, `degraded`, `paused`, `maintenance`), and last checked instant.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of unauthorized cross-tenant read, write, count, and search attempts in automated security tests are rejected by database Row Level Security policies with zero rows leaked, modified, or revealed.
- **SC-002**: 100% of relational foreign key constraint tests reject attempts to link child records in one workspace to parent records in a different workspace.
- **SC-003**: In 100% of tested permission revocation and role downgrade scenarios, subsequent requests using existing session tokens are immediately denied without requiring token expiration.
- **SC-004**: In 100% of simulated attempts to remove or downgrade the sole workspace Owner, the database rejects the operation and preserves ownership continuity.
- **SC-005**: 100% of cloud storage objects are private by default, and unauthorized or cross-tenant download attempts are rejected with zero bytes leaked.
- **SC-006**: 100% of authorized file download tokens expire within their configured lifespan (maximum 15 minutes) and are completely unusable after expiration.
- **SC-007**: In 100% of induced cloud service outages, project pauses, and quota exhaustion events, client applications transition to offline mode without crashing, without displaying empty replacement states, and with zero loss of uncommitted local drafts.
- **SC-008**: 100% of quota alerts, authorization errors, and degraded mode diagnostics provide complete, accurate text in both English and Arabic with appropriate RTL presentation.
- **SC-009**: 100% of client application builds and distributions contain zero service-role keys, database superuser credentials, or unrestricted cloud admin tokens.

## Assumptions

- F008 builds upon the domain primitives and envelope error contracts established in F003 and provides the cloud persistence and authorization foundation required by F009 (command receipts and audit), F010 (browser sign-in), and F017/F018 (sync outbox/pull).
- Supabase (PostgreSQL, Supabase Auth, Supabase Storage, and TypeScript Edge Functions) is the documented recommended backend architecture per decision A-01 and `docs/architecture/backend-stack.md`; however, all specification requirements and success criteria are formulated in technology-agnostic terms of relational database constraints, Row Level Security, private object storage, and bounded server functions.
- Solo freelancers and multi-member teams utilize the identical tenant architecture; a solo workspace is simply a workspace with exactly one member holding the Owner role.
- Initial development and continuous integration testing utilize local emulated backend services (e.g., Supabase local CLI / PostgreSQL test containers) with synthetic data, avoiding paid cloud signups or premature cloud provisioning in accordance with decisions D-19 and Q-02.
- The cloud database acts as the authoritative source for accepted business records, user memberships, and document numbering; local desktop persistence (F007) acts as an encrypted offline cache and outbox.
- Storage and egress quotas reflect the provider's documented allowances (e.g., 500 MB database, 1 GB file storage, 5 GB egress for development/pilot profiles), and production deployments will establish capacity thresholds based on the resolution of decision Q-02.
