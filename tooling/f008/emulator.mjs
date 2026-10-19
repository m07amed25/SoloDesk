import Database from "better-sqlite3-multiple-ciphers";
import crypto from "node:crypto";

export class PostgresError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PostgresError";
    this.code = code;
  }
}

export function createF008Emulator(options = {}) {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  // Track active authenticated user context
  let currentUserId = options.initialUserId ?? null;

  // Custom SQL functions
  db.function("current_user_id", () => currentUserId ?? "");
  db.function("has_active_membership", (workspaceId) => {
    if (!currentUserId) return 0;
    const row = db
      .prepare(
        "SELECT 1 FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
      )
      .get(workspaceId, currentUserId);
    return row ? 1 : 0;
  });
  db.function("get_workspace_role", (workspaceId) => {
    if (!currentUserId) return "";
    const row = db
      .prepare(
        "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
      )
      .get(workspaceId, currentUserId);
    return row ? row.role : "";
  });
  db.function("char_length", (str) =>
    typeof str === "string" ? str.length : 0,
  );
  db.function("clock_timestamp", () => new Date().toISOString());

  // Schema creation
  db.exec(`
    CREATE TABLE workspace_tenants (
      id TEXT PRIMARY KEY,
      legal_name TEXT NOT NULL,
      trade_name TEXT,
      default_timezone TEXT NOT NULL DEFAULT 'UTC',
      default_currency TEXT NOT NULL,
      default_locale TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE workspace_memberships (
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      invited_email TEXT,
      invitation_token TEXT UNIQUE,
      invitation_expires_at TEXT,
      granted_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE tenant_audit_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      actor_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_resource_type TEXT NOT NULL,
      target_resource_id TEXT NOT NULL,
      change_diff TEXT NOT NULL DEFAULT '{}',
      correlation_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT uq_audit_event_workspace UNIQUE (workspace_id, id)
    );

    CREATE TABLE clients (
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, id)
    );

    CREATE TABLE projects (
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, id),
      CONSTRAINT fk_projects_client FOREIGN KEY (workspace_id, client_id)
        REFERENCES clients(workspace_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE tasks (
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, id),
      CONSTRAINT fk_tasks_project FOREIGN KEY (workspace_id, project_id)
        REFERENCES projects(workspace_id, id) ON DELETE CASCADE
    );

    CREATE TABLE time_entries (
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      billable INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, id),
      CONSTRAINT fk_time_entries_task FOREIGN KEY (workspace_id, task_id)
        REFERENCES tasks(workspace_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE tenant_storage_objects (
      id TEXT NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      bucket_id TEXT NOT NULL DEFAULT 'workspaces',
      storage_path TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      access_tier TEXT NOT NULL DEFAULT 'private',
      owning_entity_type TEXT NOT NULL,
      owning_entity_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, id),
      CONSTRAINT uq_storage_path_workspace UNIQUE (workspace_id, storage_path)
    );

    CREATE TABLE provider_quota_profiles (
      workspace_id TEXT PRIMARY KEY REFERENCES workspace_tenants(id) ON DELETE RESTRICT,
      db_storage_bytes INTEGER NOT NULL DEFAULT 0,
      object_storage_bytes INTEGER NOT NULL DEFAULT 0,
      monthly_egress_bytes INTEGER NOT NULL DEFAULT 0,
      db_storage_limit_bytes INTEGER NOT NULL DEFAULT 524288000,
      object_storage_limit_bytes INTEGER NOT NULL DEFAULT 1073741824,
      monthly_egress_limit_bytes INTEGER NOT NULL DEFAULT 5368709120,
      quota_tier TEXT NOT NULL DEFAULT 'normal',
      provider_status TEXT NOT NULL DEFAULT 'operational',
      last_evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Triggers for workspace_id immutability
  const tenantTables = [
    "workspace_memberships",
    "clients",
    "projects",
    "tasks",
    "time_entries",
    "tenant_storage_objects",
  ];
  for (const table of tenantTables) {
    db.exec(`
      CREATE TRIGGER trg_immutable_workspace_${table}
      BEFORE UPDATE OF workspace_id ON ${table}
      FOR EACH ROW
      WHEN NEW.workspace_id IS NOT OLD.workspace_id
      BEGIN
        SELECT RAISE(ABORT, 'Immutable workspace_id: tenant ownership cannot be modified on existing records');
      END;
    `);
  }

  // Trigger for Last Owner Protection on workspace_memberships
  db.exec(`
    CREATE TRIGGER trg_prevent_last_owner_delete
    BEFORE DELETE ON workspace_memberships
    FOR EACH ROW
    WHEN OLD.role = 'owner' AND OLD.status = 'active'
    BEGIN
      SELECT CASE
        WHEN (SELECT count(*) FROM workspace_memberships WHERE workspace_id = OLD.workspace_id AND role = 'owner' AND status = 'active' AND user_id != OLD.user_id) < 1
        THEN RAISE(ABORT, 'Ownership continuity violation: cannot remove, revoke, or downgrade the sole workspace Owner. Ownership must be transferred to another active member first.')
      END;
    END;

    CREATE TRIGGER trg_prevent_last_owner_update
    BEFORE UPDATE ON workspace_memberships
    FOR EACH ROW
    WHEN OLD.role = 'owner' AND OLD.status = 'active' AND (NEW.role != 'owner' OR NEW.status != 'active')
    BEGIN
      SELECT CASE
        WHEN (SELECT count(*) FROM workspace_memberships WHERE workspace_id = OLD.workspace_id AND role = 'owner' AND status = 'active' AND user_id != OLD.user_id) < 1
        THEN RAISE(ABORT, 'Ownership continuity violation: cannot remove, revoke, or downgrade the sole workspace Owner. Ownership must be transferred to another active member first.')
      END;
    END;

    CREATE TRIGGER trg_append_only_audit_update
    BEFORE UPDATE ON tenant_audit_events
    FOR EACH ROW
    BEGIN
      SELECT RAISE(ABORT, 'Audit log is immutable and append-only: updates are prohibited');
    END;

    CREATE TRIGGER trg_append_only_audit_delete
    BEFORE DELETE ON tenant_audit_events
    FOR EACH ROW
    BEGIN
      SELECT RAISE(ABORT, 'Audit log is immutable and append-only: deletions are prohibited');
    END;
  `);

  // In-memory files storage for Supabase Storage emulator
  const storageFiles = new Map(); // path -> { content, size, contentType, createdAt }

  // Signed tokens store: token -> { path, expiresAt, workspaceId }
  const signedTokens = new Map();

  return {
    rawDb: db,
    setAuth(userId) {
      currentUserId = userId;
    },
    getAuth() {
      return currentUserId;
    },

    // RLS-enforced Query Interface
    from(tableName) {
      return createRlsQueryBuilder(db, tableName, () => currentUserId);
    },

    // Raw SQL execution with PostgreSQL error mapping
    execSql(sql, params = []) {
      try {
        const stmt = db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
          return stmt.all(...params);
        } else {
          return stmt.run(...params);
        }
      } catch (err) {
        if (err.message.includes("FOREIGN KEY constraint failed")) {
          throw new PostgresError(err.message, "23503");
        }
        if (
          err.message.includes("Immutable workspace_id") ||
          err.message.includes("Ownership continuity violation")
        ) {
          throw new PostgresError(err.message, "23514");
        }
        throw err;
      }
    },

    // Supabase Storage Emulator
    storage: {
      from(bucketId) {
        if (bucketId !== "workspaces")
          throw new Error("Unknown bucket: " + bucketId);
        return {
          async upload(filePath, content, options = {}) {
            if (!currentUserId) {
              const err = new Error(
                "403 Forbidden: Unauthenticated storage access",
              );
              err.statusCode = 403;
              throw err;
            }
            // Check regex
            const pathRegex =
              /^workspaces\/(ws_[a-zA-Z0-9_-]+)\/(invoices|receipts|contracts|projects|profiles)\/([a-zA-Z0-9_-]+)\/(obj_[a-zA-Z0-9_-]+)-[a-zA-Z0-9_.-]+$/;
            if (filePath.includes("..") || !pathRegex.test(filePath)) {
              const err = new Error(
                "Invalid storage path or path traversal detected",
              );
              err.statusCode = 400;
              throw err;
            }
            const match = filePath.match(pathRegex);
            const targetWorkspaceId = match[1];

            // Verify membership & role
            const membership = db
              .prepare(
                "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
              )
              .get(targetWorkspaceId, currentUserId);

            if (
              !membership ||
              !["owner", "admin", "manager", "contributor", "finance"].includes(
                membership.role,
              )
            ) {
              const err = new Error(
                "403 Forbidden: Insufficient storage privilege",
              );
              err.statusCode = 403;
              throw err;
            }

            // Quota pre-flight check
            const quota = db
              .prepare(
                "SELECT * FROM provider_quota_profiles WHERE workspace_id = ?",
              )
              .get(targetWorkspaceId);
            if (quota && quota.quota_tier === "exhausted_100") {
              const err = new Error("507 Storage Unavailable: Quota exhausted");
              err.statusCode = 507;
              err.code = "STORAGE_UNAVAILABLE";
              throw err;
            }

            const size = Buffer.isBuffer(content)
              ? content.length
              : Buffer.byteLength(content ?? "");
            storageFiles.set(filePath, {
              content,
              size,
              contentType: options.contentType || "application/octet-stream",
              createdAt: new Date().toISOString(),
            });
            return { data: { path: filePath }, error: null };
          },

          async createSignedUrl(filePath, expiresInSeconds = 900) {
            if (!currentUserId) {
              return {
                data: null,
                error: { message: "Unauthenticated", status: 401 },
              };
            }
            const pathRegex = /^workspaces\/(ws_[a-zA-Z0-9_-]+)\//;
            const match = filePath.match(pathRegex);
            if (!match) {
              return {
                data: null,
                error: { message: "Invalid path", status: 400 },
              };
            }
            const targetWorkspaceId = match[1];
            const membership = db
              .prepare(
                "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
              )
              .get(targetWorkspaceId, currentUserId);

            if (!membership) {
              return {
                data: null,
                error: { message: "Forbidden", status: 403 },
              };
            }

            const token = "sig_" + crypto.randomBytes(16).toString("hex");
            const expiresAt = Date.now() + expiresInSeconds * 1000;
            signedTokens.set(token, {
              filePath,
              expiresAt,
              workspaceId: targetWorkspaceId,
            });

            return {
              data: {
                signedUrl: `http://localhost:54321/storage/v1/object/sign/${filePath}?token=${token}`,
                expiresIn: expiresInSeconds,
              },
              error: null,
            };
          },

          async downloadWithToken(filePath, token, testTimeMs = Date.now()) {
            const entry = signedTokens.get(token);
            if (!entry || entry.filePath !== filePath) {
              const err = new Error("403 Forbidden: Invalid signature");
              err.statusCode = 403;
              throw err;
            }
            if (testTimeMs > entry.expiresAt) {
              const err = new Error(
                "400 ExpiredToken: The signed token has expired",
              );
              err.statusCode = 400;
              err.code = "ExpiredToken";
              throw err;
            }
            const file = storageFiles.get(filePath);
            if (!file) {
              const err = new Error("404 Not Found");
              err.statusCode = 404;
              throw err;
            }
            return file;
          },

          async delete(filePath) {
            if (!currentUserId) {
              const err = new Error("403 Forbidden");
              err.statusCode = 403;
              throw err;
            }
            const pathRegex = /^workspaces\/(ws_[a-zA-Z0-9_-]+)\//;
            const match = filePath.match(pathRegex);
            if (!match) throw new Error("Invalid path");
            const targetWorkspaceId = match[1];
            const membership = db
              .prepare(
                "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
              )
              .get(targetWorkspaceId, currentUserId);

            if (!membership || !["owner", "admin"].includes(membership.role)) {
              const err = new Error(
                "403 Forbidden: Insufficient privilege to delete storage object",
              );
              err.statusCode = 403;
              throw err;
            }
            storageFiles.delete(filePath);
            return { data: {}, error: null };
          },
        };
      },
    },
  };
}

// RLS Query Builder executing statements under active user membership rules
function createRlsQueryBuilder(db, tableName, getCurrentUser) {
  return {
    select(columns = "*") {
      return {
        eq(col, val) {
          return this.filter(col, val);
        },
        filter(col, val) {
          const user = getCurrentUser();
          if (!user) return { data: [], count: 0, error: null };

          let sql = `SELECT ${columns} FROM ${tableName} WHERE ${col} = ?`;
          // Apply RLS policy filtering
          if (tableName === "workspace_tenants") {
            sql += ` AND id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
            const rows = db.prepare(sql).all(val, user);
            return { data: rows, count: rows.length, error: null };
          }

          if (tableName === "tenant_audit_events") {
            sql += ` AND workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active' AND role IN ('owner', 'admin'))`;
            const rows = db.prepare(sql).all(val, user);
            return { data: rows, count: rows.length, error: null };
          }

          sql += ` AND workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
          const rows = db.prepare(sql).all(val, user);
          return { data: rows, count: rows.length, error: null };
        },

        all() {
          const user = getCurrentUser();
          if (!user) return { data: [], count: 0, error: null };

          let sql = `SELECT ${columns} FROM ${tableName}`;
          if (tableName === "workspace_tenants") {
            sql += ` WHERE id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
            const rows = db.prepare(sql).all(user);
            return { data: rows, count: rows.length, error: null };
          }

          if (tableName === "tenant_audit_events") {
            sql += ` WHERE workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active' AND role IN ('owner', 'admin'))`;
            const rows = db.prepare(sql).all(user);
            return { data: rows, count: rows.length, error: null };
          }

          sql += ` WHERE workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
          const rows = db.prepare(sql).all(user);
          return { data: rows, count: rows.length, error: null };
        },

        count() {
          const user = getCurrentUser();
          if (!user) return { count: 0, error: null };

          let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
          if (tableName === "workspace_tenants") {
            sql += ` WHERE id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
            const row = db.prepare(sql).get(user);
            return { count: row.count, error: null };
          }

          sql += ` WHERE workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
          const row = db.prepare(sql).get(user);
          return { count: row.count, error: null };
        },

        search(col, query) {
          const user = getCurrentUser();
          if (!user) return { data: [], count: 0, error: null };

          let sql = `SELECT ${columns} FROM ${tableName} WHERE ${col} LIKE ?`;
          sql += ` AND workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = ? AND status = 'active')`;
          const rows = db.prepare(sql).all(`%${query}%`, user);
          return { data: rows, count: rows.length, error: null };
        },
      };
    },

    insert(record) {
      const user = getCurrentUser();
      if (!user) {
        const err = new PostgresError(
          "permission denied for table " + tableName,
          "42501",
        );
        return { data: null, error: err };
      }

      const workspaceId = record.workspace_id || record.id;
      // Evaluate live membership & role
      const member = db
        .prepare(
          "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
        )
        .get(workspaceId, user);

      if (!member) {
        const err = new PostgresError(
          "permission denied: not an active member of workspace",
          "42501",
        );
        return { data: null, error: err };
      }

      // Check role capability for insert
      if (tableName === "clients" || tableName === "projects") {
        if (!["owner", "admin", "manager"].includes(member.role)) {
          const err = new PostgresError(
            "insufficient privilege for role " + member.role,
            "42501",
          );
          return { data: null, error: err };
        }
      } else if (tableName === "tasks") {
        if (
          !["owner", "admin", "manager", "contributor"].includes(member.role)
        ) {
          const err = new PostgresError(
            "insufficient privilege for role " + member.role,
            "42501",
          );
          return { data: null, error: err };
        }
      } else if (tableName === "workspace_memberships") {
        if (!["owner", "admin"].includes(member.role)) {
          const err = new PostgresError(
            "insufficient privilege for role " + member.role,
            "42501",
          );
          return { data: null, error: err };
        }
      }

      const cols = Object.keys(record);
      const placeholders = cols.map(() => "?").join(", ");
      const values = cols.map((c) => record[c]);

      try {
        db.prepare(
          `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders})`,
        ).run(...values);
        return { data: record, error: null };
      } catch (e) {
        const code = e.message.includes("FOREIGN KEY")
          ? "23503"
          : e.message.includes("UNIQUE")
            ? "23505"
            : "42501";
        return { data: null, error: new PostgresError(e.message, code) };
      }
    },

    update(updates) {
      return {
        eq(col, val) {
          const user = getCurrentUser();
          if (!user) {
            return {
              error: new PostgresError("insufficient privilege", "42501"),
            };
          }

          // Fetch current row to verify workspace membership
          const existing = db
            .prepare(`SELECT * FROM ${tableName} WHERE ${col} = ?`)
            .get(val);
          if (!existing) {
            return { error: null, count: 0 };
          }

          const workspaceId = existing.workspace_id || existing.id;
          const member = db
            .prepare(
              "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
            )
            .get(workspaceId, user);

          if (!member) {
            return {
              error: new PostgresError(
                "insufficient privilege: cross-tenant access denied",
                "42501",
              ),
            };
          }

          const sets = Object.keys(updates)
            .map((k) => `${k} = ?`)
            .join(", ");
          const values = [...Object.values(updates), val];

          try {
            db.prepare(`UPDATE ${tableName} SET ${sets} WHERE ${col} = ?`).run(
              ...values,
            );
            return { error: null, count: 1 };
          } catch (e) {
            const code =
              e.message.includes("Immutable workspace_id") ||
              e.message.includes("Ownership continuity")
                ? "23514"
                : "42501";
            return { error: new PostgresError(e.message, code) };
          }
        },
      };
    },

    delete() {
      return {
        eq(col, val) {
          const user = getCurrentUser();
          if (!user) {
            return {
              error: new PostgresError("insufficient privilege", "42501"),
            };
          }

          const existing = db
            .prepare(`SELECT * FROM ${tableName} WHERE ${col} = ?`)
            .get(val);
          if (!existing) return { error: null, count: 0 };

          const workspaceId = existing.workspace_id || existing.id;
          const member = db
            .prepare(
              "SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
            )
            .get(workspaceId, user);

          if (!member || !["owner", "admin"].includes(member.role)) {
            return {
              error: new PostgresError("insufficient privilege", "42501"),
            };
          }

          try {
            db.prepare(`DELETE FROM ${tableName} WHERE ${col} = ?`).run(val);
            return { error: null, count: 1 };
          } catch (e) {
            const code = e.message.includes("Ownership continuity")
              ? "23514"
              : e.message.includes("FOREIGN KEY")
                ? "23503"
                : "42501";
            return { error: new PostgresError(e.message, code) };
          }
        },
      };
    },
  };
}
