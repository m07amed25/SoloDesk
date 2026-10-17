# Security, privacy and trust model

Status: proposed controls, not current assurance. Confirmed model: required managed-cloud accounts, teams, offline support, encryption in transit/at rest, encrypted devices and controlled server access. No end-to-end encryption or AI is selected. P01 establishes trust boundaries; each later phase extends the threat model.

## Assets and adversaries

Protect identities/tokens, tenant records, private costs/notes, legal/financial snapshots, time evidence, attachments, encryption/signing keys, backups and provider credentials. Relevant adversaries include malicious client content/imports, another tenant, a removed collaborator, stolen device, compromised provider callback, malicious external URL, vulnerable dependency and privileged support misuse. Encryption at rest does not protect an unlocked endpoint from malware or prevent authorized exports.

## Threat/control/evidence matrix

| Threat | Required control | Verification |
| --- | --- | --- |
| Renderer compromise | Sandbox/context isolation/no Node, restrictive CSP, no remote executable content | Injected markup/URL cannot read DB, tokens, files or invoke arbitrary IPC |
| Cross-tenant/project access | Current server grants, RLS/constraints, filtered files/search/export/subscriptions | Guess IDs/alter workspace/sort/count/download; deny without leaking |
| Stale offline privilege | Signed bounded lease for local UX; server current authority on replay | Removed member's outbox never commits |
| Duplicate money actions | Transactional idempotency, unique source/number/provider constraints | Lost reply/double-click/reordered webhook has one effect |
| Stolen device/backup | Encrypted DB/files/index/outbox, wrapped keys, lock policy, encrypted backups | Raw cache cannot be read; missing key fails closed |
| Provider spoof/replay | Signed webhook verification, timestamp/replay bounds, immutable event IDs | Invalid signature/replayed event rejected or deduped |
| Malicious import/archive | Limits, traversal/link rejection, staged validation, inert attachments | Zip bomb/path traversal/schema poison cannot alter live data |
| Secret/PII leakage | Structured redaction, scoped telemetry, support preview, temporary-file controls | Fixtures contain no tokens/client content in default logs |
| Supply-chain/update attack | Dependency inventory, signed artifacts/manifests, protected release keys | Tampered installer/update rejected; recovery tested |
| Support/operator abuse | Least privilege, explicit time-limited support grant, audit and reauth | Support cannot assume tenant Owner invisibly |

## Electron and native boundaries

Renderer has no SQL/filesystem/shell/raw IPC access; preload exposes narrow validated methods. Main validates sender/frame/origin and payload, not only channel name. External navigation/window creation is allowlisted; `openExternal` validates allowed schemes/destinations and user intent. Never expose arbitrary file operations or trust a renderer path. PDFs render bounded sanitized snapshot content without arbitrary remote fetches. IPC errors return stable redacted codes. [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

CSP differs narrowly for local dev tooling versus release; release does not inherit unsafe development settings. Importing notes/HTML/code never executes them. Use utility/worker boundaries for heavy privileged jobs while preserving validation. Single-instance, callback/deep-link and protocol registration tests include malicious and unexpected targets.

## Identity, secrets and keys

Native sign-in uses system browser authorization code+PKCE/state checks and constrained callback; no client secret is embedded. Server verifies issuer/audience/expiry and current membership. MFA/recovery policies remain Q-08. Refresh credentials stay in approved OS secret storage; service/provider keys stay in server vault. Do not store tokens in renderer localStorage, ordinary SQLite columns, logs, backups or crash bundles.

Each enrolled device has independent wrapped data keys; encryption covers database pages/indices/WAL/temp data and local attachments/staging, not only selected string fields. Current better-sqlite3 does not satisfy this. Validate SQLCipher-compatible adapter, native Electron ABI, key wrapping, locked-key-store handling, rotation and atomic migration on all OSs. Linux unprotected secret-store fallback is refused; offer an approved password-derived local unlock/key wrapping path or explain the block. Key derivation parameters, algorithm/library and recovery flow require security review; no home-grown cryptography.

Account password reset cannot magically decrypt locally unsynced data when a device key is lost. Cloud-authoritative data can be re-fetched after identity recovery; lost unsynced capture needs a surviving device/backup key. Backup recovery keys are separate from cloud session credentials. Rotation is journaled/restart-safe; a failure must preserve the prior decryptable version. Screen lock/sign-out distinguish retaining encrypted cache from unlink/delete; unsynced work receives an explicit recovery choice.

## Cloud and data access

TLS for service connections, provider-at-rest encryption and private object storage are baseline. Project/tenant authorization still applies after authentication. Financial tables reject general client writes; restricted command transactions validate source/actor/current policy. Service-role credentials are server only. No unrestricted service key in the portal or Electron package. Scope provider secrets by workspace/connection, encrypt via managed vault/KMS and audit rotation/access.

User-generated schemas/automation expressions are data, never executable SQL/JavaScript/templates with arbitrary access. Validate bounds, approved operators, URL hosts, content types and uploads. Rate limits/quotas bound CPU, jobs, attachments, invites and unauthenticated callbacks. Cache/subscription invalidation follows permission changes, including hidden search counts and download links.

## Sharing, integrations and deterministic automation

Sharing is explicit, exact-version and recipient-scoped. Internal notes/costs and unselected files remain excluded. Connector setup declares account/scopes/fields/destination, enabled actions and disconnect consequences. Revocation removes credentials and cancels unsent jobs; it cannot recall data already delivered. Unknown provider outcome requires reconciliation before retry. Rules have owner/version/scope, bounded actions, audit and a stop switch.

**AI is excluded by D-16.** No model calls, embeddings, AI data transfer or autonomous agents belong to this plan. No keystroke/screenshots/source-code surveillance. Optional idle detection processes a minimal local signal with visible controls and does not claim to prove work or absence.

## Backups, exports, retention and support

Encrypted backups include records and required blobs/manifests, exclude active credentials and validate before isolated restore. Restored cloud snapshots never replay old outbox or downgrade numbering. CSV exports guard formula injection; PDFs test Arabic shaping and avoid hidden internal fields. Temporary plaintext exports are user-chosen artifacts with best-effort cleanup; secure deletion on SSD/cloud copies is not guaranteed.

Retention is per data class/tenant policy, with jurisdiction review for finance/contracts, deletion tombstones and legal holds. Delete requests distinguish contact notes, account identity, workspace data, exports, object bytes, audit and backups. Set and publish retention/grace/offline rejoin windows before production. Removing membership/revoking a device cannot guarantee deletion of an already held offline copy.

Product analytics/crash uploads are opt-in, distinct from essential operational metrics. Default support bundles preview redacted app/version/error IDs and omit databases, customer content, tokens, full environment dumps and raw crash memory. Crash dumps require separate explicit upload consent. Service audit is append-only for ordinary roles with protected retention; independently tamper-evident storage is a separate threat-driven enhancement, not an automatic claim.

## Release controls

P01 passes IPC, encrypted-cache, auth, tenant isolation, revocation, backup/restore and redaction tests. P05 proves financial authority/idempotency/correction protection. P07 proves connector scopes, callbacks, URL safety, rule bounds and disconnect. P08 proves guest isolation, exact publication and revoked links. Every release has dependency/license review and no unresolved exploitable critical/high finding without an explicit documented mitigation/owner decision. Follow [test strategy](../quality/test-strategy.md) and [operations](../operations/release-and-support.md).
