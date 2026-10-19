# Technical Research: F008 — Managed Backend and Tenant Isolation

**Date**: 2026-10-19  
**Feature**: [F008 — Managed Backend and Tenant Isolation](spec.md)  
**Status**: Complete — Phase 0 research findings for technical implementation planning

---

## 1. Multi-Tenant Relational Database Architecture

### Decision

Implement a **shared database, shared schema architecture with row-level tenant discrimination (`workspace_id`)**, enforced by PostgreSQL Row Level Security (RLS) policies and composite relational integrity constraints. Every tenant-scoped table carries an immutable `workspace_id` column as a mandatory component of its primary key or primary composite uniqueness constraint.

### Rationale

- **Product and Cost Alignment**: Per decisions D-10 (freelancers and small teams from first release), D-19 (lowest practical cost, efficient free/pilot options), and A-01 (Supabase PostgreSQL), SoloDesk must support thousands of individual solo freelancers and collaborative small teams efficiently on managed cloud infrastructure without incurring per-tenant database or schema overhead.
- **Architectural Parity**: Single-member freelancer workspaces use the exact same relational isolation model as multi-member team workspaces (Constitution Principle III). A solo workspace is simply a workspace tenant with exactly one member holding the `owner` role.
- **Engine-Level Defense**: Tenant isolation cannot rely on application-level `WHERE workspace_id = ?` clauses that can be omitted by software bugs or query alterations. Enforcing isolation at the PostgreSQL database engine level guarantees that even raw queries or compromised application code cannot breach tenant boundaries.

### Alternatives Considered

- **Database-per-tenant**: Provisioning a distinct PostgreSQL database or cluster per tenant. _Rejected_: Financially prohibitive on managed cloud infrastructure (incompatible with D-19 free/pilot allowance); introduces immense operational complexity for connection pooling, cross-tenant migrations, and backup coordination.
- **Schema-per-tenant (PostgreSQL search_path)**: Creating a separate PostgreSQL schema per workspace within a shared database. _Rejected_: PostgreSQL does not optimize thousands of distinct schemas well; migration scripts become slow and complex; connection poolers (e.g., Supabase Supavisor) do not dynamically isolate schemas cleanly; and dynamic DDL execution carries high operational risk.
- **Application-only isolation (no RLS)**: Filtering tenant data purely through application query builders. _Rejected_: Violates Constitution Principle II and V; creates severe vulnerability to developer oversight, injection vulnerabilities, and cross-tenant leakage.

---

## 2. Primary Keys, Identifiers, and Composite Constraints

### Decision

1. **Identifier Strategy**: Use canonical, URL-safe text identifiers with semantic type prefixes (e.g., `ws_` for workspaces, `usr_` for users, `mem_` for memberships, `cli_` for clients, `prj_` for projects, `tsk_` for tasks, `tim_` for time entries, `aud_` for audit events, `obj_` for storage objects), generated using base32/UUIDv7 time-ordered algorithms conforming to F003 `Id<T>` domain primitive rules.
2. **Composite Uniqueness**: Every tenant table enforces `UNIQUE (workspace_id, id)` or defines a composite primary key `PRIMARY KEY (workspace_id, id)`.
3. **Composite Foreign Keys**: All child-to-parent relational links MUST use composite foreign keys:
   ```sql
   FOREIGN KEY (workspace_id, parent_id)
   REFERENCES parent_table(workspace_id, id)
   ON DELETE RESTRICT -- or CASCADE where explicitly governed
   ```

### Rationale

- **Cross-Tenant Pointer Poisoning Defense**: A standard single-column foreign key `FOREIGN KEY (client_id) REFERENCES clients(id)` permits a compromised or buggy client to insert a project with `workspace_id = 'ws_alpha'` but `client_id = 'cli_beta'`. Composite foreign keys `FOREIGN KEY (workspace_id, client_id) REFERENCES clients(workspace_id, id)` make cross-tenant entity linking mathematically impossible at the relational algebra level, completely independent of RLS policies.
- **Domain Compatibility**: Typed semantic prefixes match the existing F003 domain contracts (`packages/domain/src/ids.ts`), making identifiers human-readable, diagnostic-friendly, and immune to polymorphic entity confusion.
- **Index Locality**: Composite indexes on `(workspace_id, ...)` ensure that PostgreSQL query plans naturally prune index scans to the tenant's exact pages, preventing full-table index bloat.

### Alternatives Considered

- **Surrogate UUIDv4 Primary Keys with Independent FKs**: Using bare UUIDv4 strings for IDs and standard single-column foreign keys, relying entirely on application logic or RLS for isolation. _Rejected_: Fails to prevent cross-tenant graph references (A-13 violation); single-column FKs do not enforce tenant consistency across related tables.
- **Integer BigSerial / Auto-incrementing IDs**: Using sequential numeric integers for primary keys. _Rejected_: Exposes sequential enumeration and tenant volume metrics to external observers; incompatible with client-side offline ID generation (required by F007/F017).

---

## 3. Workspace Identifier Immutability

### Decision

Enforce immutability of the `workspace_id` column across all tenant tables using a universal PostgreSQL `BEFORE UPDATE` trigger function (`reject_workspace_id_mutation`):

```sql
CREATE OR REPLACE FUNCTION reject_workspace_id_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'Immutable workspace_id: cannot transfer records across workspaces (old: %, new: %)',
      OLD.workspace_id, NEW.workspace_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Rationale

- **Prevention of Accidental or Malicious Re-parenting**: If an existing record in Workspace Alpha could have its `workspace_id` updated to Workspace Beta, records could be silently transferred or stolen across tenant boundaries.
- **Relational Consistency**: Changing `workspace_id` on a parent record would either break composite foreign keys on all child records or require complex cascading updates that could violate RLS on dependent entities.
- **Direct Requirement Traceability**: Directly satisfies FR-002 and Acceptance Scenario A-04.

### Alternatives Considered

- **PostgreSQL Column Privileges (`REVOKE UPDATE (workspace_id)`)**: Removing update privileges on the column. _Rejected_: Does not protect against service-role functions or automated migration scripts; triggers provide an unconditional, fail-closed guardrail regardless of connection privilege.
- **Application Validation Only**: Relying on TypeScript backend code to omit `workspace_id` from update payloads. _Rejected_: Fails defense-in-depth requirements; does not prevent raw SQL or edge function mistakes.

---

## 4. Row Level Security (RLS) Policy Design and Real-Time Evaluation

### Decision

1. **Default Fail-Closed**: Every tenant table has RLS enabled and forced:
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
   ```
   `FORCE ROW LEVEL SECURITY` ensures policies apply even to table owners, protecting against accidental bypass.
2. **Context Helper Functions**: Provide optimized, cached PostgreSQL functions with `SECURITY DEFINER` and `SET search_path = public`:
   - `current_user_id()`: Returns `auth.uid()::text`.
   - `current_workspace_id()`: Reads the active workspace identity asserted in the session or validated request header.
   - `has_active_membership(p_workspace_id text)`: Checks if `current_user_id()` holds an `active` status membership in `p_workspace_id`.
   - `get_workspace_role(p_workspace_id text)`: Returns the acting user's verified role (`owner`, `admin`, `manager`, `contributor`, `finance`, `viewer`) in the workspace.
3. **Live Membership Verification**: RLS policies evaluate against the live `workspace_memberships` table rather than trusting cached JWT claims (`auth.jwt() -> 'app_metadata'`), guaranteeing that permission revocations and role downgrades take effect **immediately** on the very next query without awaiting JWT expiry (satisfying FR-005, FR-006, and Acceptance A-05, A-06).
4. **Aggregate & Search Protection**: PostgreSQL RLS is evaluated in the query execution tree before `COUNT(*)`, `SUM()`, `AVG()`, window functions, and `tsvector` full-text search operators execute. A query `SELECT count(*) FROM clients` executed by a member of Tenant Alpha will return _only_ the count of clients in Tenant Alpha, with zero knowledge or existence leakage of other tenants (satisfying A-01, A-03).

### Rationale

- **Sub-Millisecond Policy Execution**: By marking helper functions `STABLE` and indexing `(user_id, workspace_id, status)`, PostgreSQL evaluates the user's membership once per statement or query plan, caching results for the query duration while retaining real-time accuracy across transactions.
- **Defense Against Stale Tokens**: Standard JWT tokens typically have a lifespan of 1 hour. If membership revocation relied on token re-issuance, a removed team member could continue reading or mutating confidential client data for up to 60 minutes. Live table evaluation eliminates this security vulnerability entirely.

### Alternatives Considered

- **JWT Claims Only (app_metadata)**: Embedding the user's role and workspace list directly in the Supabase Auth JWT. _Rejected_: Stale token vulnerability (A-06 violation); cannot enforce immediate revocation; token size exceeds cookie/header limits when a user belongs to multiple workspaces.
- **Manual Application WHERE Injection**: Manually injecting `where("workspace_id", workspaceId)` in TypeScript query builders. _Rejected_: Violates fail-closed security (Constitution Principle V); error-prone and vulnerable to omission.

---

## 5. Protected Workspace Ownership Continuity

### Decision

Implement an immutable constraint and PostgreSQL trigger on `workspace_memberships` that strictly forbids deleting, revoking, or downgrading the role of the last remaining active `owner` in any workspace:

```sql
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_count int;
BEGIN
  -- Triggered on DELETE or UPDATE when changing role or status from 'owner'/'active'
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner' AND OLD.status = 'active') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND OLD.status = 'active' AND
      (NEW.role <> 'owner' OR NEW.status <> 'active')) THEN

    SELECT count(*) INTO v_owner_count
    FROM workspace_memberships
    WHERE workspace_id = OLD.workspace_id
      AND role = 'owner'
      AND status = 'active'
      AND user_id <> OLD.user_id;

    IF v_owner_count < 1 THEN
      RAISE EXCEPTION 'Ownership continuity violation: cannot remove, revoke, or downgrade the sole workspace Owner. Ownership must be transferred to another active member first.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Rationale

- **Orphan Prevention**: A workspace without an active Owner cannot perform administrative tasks, manage billing, invite members, or authorize data export.
- **Account Abandonment Protection**: Direct satisfaction of FR-007, Acceptance Scenario A-07, and Constitution Principle III.
- **Atomic Ownership Transfer**: Facilitates a clean ownership transfer pattern where the new owner is promoted to `owner` first, followed by downgrading or removing the previous owner in a single atomic database transaction.

### Alternatives Considered

- **Application-Layer Validation in Edge Functions**: Validating owner count in TypeScript before executing a delete. _Rejected_: Concurrency races (two admins demoting owners simultaneously); does not protect against direct database management or internal tools.

---

## 6. Private Object Storage Architecture & Scoped Signed Access

### Decision

1. **Private Buckets**: Configure the Supabase Storage bucket (`workspaces`) with `public = false`. All unauthenticated public requests are rejected with HTTP 403 Forbidden by default.
2. **Tenant Path Partitioning**: Every file stored in the bucket adheres to a strict canonical path structure:
   ```text
   workspaces/{workspace_id}/{entity_type}/{entity_id}/{file_id}-{sanitized_name}
   ```
3. **Storage RLS Policies**: Implement RLS policies on the `storage.objects` table in PostgreSQL:
   - `SELECT`: Allowed only if `(storage.foldername(name))[1] = 'workspaces'` AND `has_active_membership((storage.foldername(name))[2])`.
   - `INSERT`: Allowed only if the user holds an active membership with appropriate role (`owner`, `admin`, `manager`, `contributor`, `finance`) in `(storage.foldername(name))[2]`.
   - `DELETE`: Allowed only if the user holds `owner` or `admin` role, or is the original uploader within the active workspace.
4. **Time-Limited Signed Download URLs**: Access to private files is never granted via persistent public URLs. The backend domain gateway validates that the acting user currently possesses read permission for the owning business entity (invoice, receipt, contract, project), then calls Supabase Storage's `createSignedUrl(path, expiresIn)` with a maximum TTL of **15 minutes (900 seconds)** (FR-011, Acceptance A-11).
5. **Path Traversal Sanitization**: File names and entity identifiers are strictly sanitized using regular expressions (`^[a-zA-Z0-9_\-\.]+$`), rejecting any path component containing `..`, leading/trailing slashes, or null bytes before storage interaction.

### Rationale

- **Confidential Business Data Protection**: Commercial proposals, invoice PDFs, expense receipts, and customer agreements contain sensitive financial and personal data. Private-by-default storage prevents unauthorized scraping or accidental data leakage.
- **Short-Lived Access**: If a signed URL is forwarded or leaked, its exposure window is strictly limited to 15 minutes. After 15 minutes, the token becomes completely invalid.
- **Referential Integrity**: Storing file metadata in a tenant-scoped database table (`tenant_storage_objects`) with composite foreign keys ensures that if an owning entity is deleted, file references are accounted for, and orphaned storage can be safely purged.

### Alternatives Considered

- **Public Buckets with Cryptographic UUID File Names**: Storing files publicly but using unguessable random URLs. _Rejected_: Violates Constitution Principle V (Fail-Closed Security); URLs remain cached in proxies, browser histories, and referer headers; cannot enforce time-limited expiry or permission revocations.
- **Streaming All File Bytes Through Edge Functions**: Proxying entire file streams through TypeScript edge functions. _Rejected_: Incurs massive egress and execution-duration overhead on edge functions; hits edge function memory limits on large attachments; Supabase Storage signed URLs utilize direct CDN/S3 presigned mechanisms with zero compute overhead.

---

## 7. Domain Command Gateway (Edge Functions) and Secret Boundaries

### Decision

1. **Execution Boundary**: Server-side business commands and authenticated operations execute within bounded TypeScript Supabase Edge Functions (Deno runtime).
2. **Trusted Context Extraction**: The gateway parses the incoming request, validates the Supabase Auth JWT, extracts the actor identity (`usr_...`), validates active workspace membership in the requested `workspace_id`, and constructs an immutable `TrustedContext` object (conforming to `packages/contracts/src/ports.ts`).
3. **Unified Envelope Error Model**: All errors returned by Edge Functions use the canonical F003 `PublicError` schema (`packages/contracts/src/errors.ts`), mapping database exceptions and authorization denials to structured codes (`VALIDATION`, `AUTH_REQUIRED`, `SESSION_REVOKED`, `FORBIDDEN`, `RESOURCE_UNAVAILABLE`, `RATE_LIMITED`, `STORAGE_UNAVAILABLE`, `SERVICE_UNAVAILABLE`) with unique `diagnosticId` UUIDs.
4. **Strict Secret Vault Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY`: Stored exclusively in secure cloud environment variables on the backend server / Edge Function environment.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key): The only key bundled with desktop or web clients. Public clients execute queries strictly through RLS-enforced database connections and authenticated Edge Function endpoints.
   - Any client distribution containing service-role or administrative credentials immediately fails security qualification (FR-012, SC-009).

### Rationale

- **Least Privilege**: The renderer and desktop processes operate as untrusted clients. By withholding service-role keys from client bundles, a compromised desktop client or malicious user can never bypass Row Level Security.
- **Diagnostic Traceability**: Standardized `PublicError` envelopes ensure that frontend clients receive actionable recovery instructions (`recoveryFor(code)`) in both English and Arabic while logging sanitized diagnostic IDs for backend error correlation.

### Alternatives Considered

- **Direct Database Connections from Electron Client**: Connecting directly from Electron to PostgreSQL over TCP port 5432 using `pg` or `postgres.js`. _Rejected_: Exposes PostgreSQL connection pool to client dropouts; requires exposing direct database port to the internet; bypasses edge API rate limiting and audit logging.

---

## 8. Provider Quota Tracking, Limit Detection, and Degraded Offline Mode

### Decision

1. **Quota Metric Tracking**: The backend tracks three core operational metrics per workspace:
   - `db_storage_bytes`: Sum of relation, index, and TOAST table bytes attributed to the workspace (computed via periodic background inspection or transactional increment estimates).
   - `object_storage_bytes`: Sum of file sizes in `tenant_storage_objects` for the workspace.
   - `monthly_egress_bytes`: Cumulative bytes transferred via storage downloads and API responses in the current billing cycle.
2. **Threshold Tiers & Proactive Warnings**:
   - `normal`: Utilization $< 70\%$.
   - `warning_70`: Utilization $\ge 70\%$, $< 85\%$. Triggers bilingual informational banner in the desktop UI.
   - `warning_85`: Utilization $\ge 85\%$, $< 95\%$. Triggers prominent warning dialog with storage cleanup recommendations.
   - `critical_95`: Utilization $\ge 95\%$, $< 100\%$. Triggers high-priority alert advising that cloud writes will halt soon.
   - `exhausted_100`: Utilization $\ge 100\%$. Triggers write-lock state.
3. **Safe Behavior on 100% Exhaustion**:
   - Cloud write mutations (inserts, file uploads) are cleanly rejected with `UPGRADE_REQUIRED` or `STORAGE_UNAVAILABLE` error envelopes.
   - Existing records and files are **100% preserved**; the system NEVER silently drops or deletes data to fit a quota (FR-014).
   - The desktop client catches quota rejection, informs the user in English and Arabic, and safely retains pending drafts in the encrypted local outbox (F007) without data loss (FR-015, A-17).
4. **Degraded Mode During Cloud Outages / Project Pauses**:
   - When the cloud backend is unreachable (network failure, provider maintenance, or inactivity pause on free development instances), the client application transitions gracefully into `offline_degraded` status.
   - The UI displays an accessible status banner ("Cloud service paused/unavailable — working locally in offline mode"), preserves all existing cached views, and queues all new entries in local SQLite storage (A-18, SC-007).

### Rationale

- **Free-Tier Protection**: Development and pilot environments operate under strict limits (e.g., Supabase Free tier: 500 MB DB, 1 GB Storage, 5 GB Egress). Proactive threshold alerts give users advance notice before operations are impacted.
- **Resilience and Trust**: Freelancers and small businesses cannot afford to lose hours of work because of an unexpected cloud outage or quota limit. Decoupling local drafting from immediate cloud availability upholds Constitution Principle III.

### Alternatives Considered

- **Automatic FIFO Purging**: Automatically deleting the oldest records or file attachments when storage reaches 100%. _Rejected_: Catastrophic data loss; violates legal and financial record retention requirements (Constitution Principle IV and VII).
- **Hard Application Crashing**: Allowing network/storage exceptions to crash the renderer or corrupt local state. _Rejected_: Unacceptable failure mode; violating NFR-008 and acceptance criteria.

---

## 9. Technology Stack Choices Summary

| Category                   | Technology / Pattern Chosen                                 | Rationale                                                                                     |
| :------------------------- | :---------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Relational Database**    | PostgreSQL 16+ (Supabase)                                   | Robust ACID transactions, native Row Level Security, composite FKs, rich JSON/text search     |
| **Tenant Isolation Model** | Shared DB, Shared Schema, Row Level Discriminator           | Cost-effective for thousands of freelancers and teams; engine-enforced via RLS                |
| **Key Generation**         | Semantic Prefixed Base32/UUIDv7 (`ws_...`, `usr_...`)       | Human-readable, diagnostic-safe, time-ordered index locality, matches F003 `Id<T>`            |
| **Security Enforcement**   | Postgres RLS (`ENABLE & FORCE`) + PL/pgSQL helper functions | Fail-closed at engine level; evaluated live per query without stale JWT claims                |
| **File Storage**           | Supabase Storage (Private S3-compatible)                    | S3-backed scalability, private by default, tenant path partitioning, 15-min signed URLs       |
| **Serverless API Gateway** | Deno / TypeScript Edge Functions                            | Standard TypeScript, fast cold starts, consumes F003 domain contracts, service-role isolation |
| **Error Format**           | F003 `PublicError` Envelope                                 | Standardized error codes, diagnostic UUIDs, recovery guidance, bilingual EN/AR strings        |
| **Local Offline Cache**    | Encrypted SQLite (`better-sqlite3-multiple-ciphers`)        | F007 local persistence; retains drafts and outbox during cloud outages or quota exhaustion    |

---

## 10. Research Conclusion & Next Steps

All technical unknowns and clarifications for F008 have been comprehensively researched and resolved. The architecture strictly satisfies Constitution Principles I (Authorized Scope), II (Desktop Platform & Trust Boundaries), III (Durable Offline Work with Cloud Authority), V (Fail-Closed Security), VI (English, Arabic and Accessible Interaction), and VIII (Evidence Before Completion).

Proceed to **Phase 1: Design & Contracts**:

1. `data-model.md`: Define concrete PostgreSQL schema DDL, composite keys, constraints, triggers, and state machines.
2. `contracts/`: Generate formal contracts for Relational Schema (`tenant-relational-schema.md`), Private Storage Protocol (`private-storage-protocol.md`), Domain Gateway Boundary (`domain-gateway-boundary.md`), and Quota & Degraded Mode (`quota-and-degraded-mode.md`).
3. `quickstart.md`: Define runnable verification scenarios proving end-to-end multi-tenant isolation, composite constraints, role evaluations, signed URLs, quota handling, and secret isolation.
