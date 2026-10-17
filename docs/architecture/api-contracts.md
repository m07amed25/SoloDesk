# Command, query, IPC and synchronization contracts

Status: logical API specification, no endpoints or preload API implemented. P01 owns transport/error conventions; each domain spec owns business validation. Concrete OpenAPI/JSON schemas are an implementation deliverable after rules are approved.

## Common request/result envelope

Authenticated server requests contain protocol version, request/correlation ID, operation/idempotency ID for writes, workspace ID, device ID, expected entity revision where applicable, and bounded domain payload. Actor is derived from verified credentials, never accepted from a client field as authority. Record client occurred-at separately from server received/committed-at. IDs are opaque stable UUID-style values; never use sequential display invoice numbers as primary keys.

Responses contain success/accepted state, operation result identity, committed revision/cursor, server timestamp and explicit local-versus-authoritative status. A pending local command has a local receipt; it must not pretend to have a server acknowledgment. Idempotency key scope is workspace+actor+operation type; storing a request digest rejects the same key with changed payload. Receipts persist at least through the supported retry/offline window; financial effects remain permanently uniquely constrained even after receipt archival.

## Command families

| Command family | Key inputs / prerequisites | Authority and result |
| --- | --- | --- |
| Account/device/workspace | Identity callback/session, invite token, enrollment challenge | Online; current membership/device result, no raw refresh token to renderer |
| Member/role/grant changes | Target identity, capabilities, expected revision, reauth where required | Online server; audit + permission invalidation; no final-owner removal |
| Client/project/task mutation | Domain fields, parent/client scope, base revision | Eligible local write+outbox; server validates scope/revision/relationships |
| Timer start/switch/stop/recovery | Session ID, segment evidence, expected timer revision | Local durable capture; server accepts entries and flags overlap, never loses raw evidence |
| Draft document/expense | Lines/parties/policy references, source candidates, expected revision | Local draft allowed; source reservation authoritative only when acknowledged |
| Issue invoice/credit | Draft revision, preview digest, policy version, operation ID | Online; one transaction for snapshot/number/allocations/audit/receipt/outbox |
| Post payment/refund/credit allocation | Currency/amount, source/reference, eligible target revisions, reason | Online; immutable posting + balanced allocations; no automatic provider action |
| Publish/send/provider command | Exact artifact/version/recipient, enabled rule or user authority | Online; durable job receipt; accepted job is not proof of delivery |
| Import/restore/export | Manifest/mapping/scope, preview revision, safe file token | Staged validation and scoped job; restore cannot replace cloud via desktop IPC |
| Automation rule | Typed trigger/conditions/actions, scope, owner, version | Online approval/enable; worker rechecks current grants and target revision |

Preload mirrors permitted use cases, not all server internals. Native save/open dialog returns an opaque handle/capability bound to the requested operation. No renderer-supplied arbitrary file path, SQL, shell command or URL fetch endpoint. Main validates expected sender/frame/origin and payload on every handler. Subscriptions return filtered events and an unsubscribe mechanism; workspace changes dispose old subscriptions.

## Error taxonomy

| Code | Behavior |
| --- | --- |
| VALIDATION | Bounded field issues with stable keys; preserve valid input |
| AUTH_REQUIRED / SESSION_REVOKED | Stop protected online writes, retain encrypted unsynced work, offer sign-in/recovery |
| FORBIDDEN / RESOURCE_UNAVAILABLE | No inaccessible field/identity/count leakage; refresh permissions |
| REVISION_CONFLICT | Current permitted revision plus conflict token/candidates; no silent overwrite |
| FINANCIAL_LOCK / ALLOCATION_CONFLICT | Explain authorized conflicting source/document and allowed correction path |
| ONLINE_REQUIRED | Keep draft; explain why authoritative commit is unavailable |
| OUTCOME_UNKNOWN | Query operation status before retrying with the same key |
| RATE_LIMITED | Retry-after with bounded backoff; keep durable work |
| UPGRADE_REQUIRED / SCHEMA_UNSUPPORTED | Preserve data/outbox and show required version; stop unsafe stream |
| STORAGE_UNAVAILABLE / KEY_UNAVAILABLE | No fake empty database or plaintext fallback; recovery options |
| PROVIDER_FAILURE / SERVICE_UNAVAILABLE | Retry or reconcile according to operation type; human-readable action |

Errors carry machine codes and redacted diagnostic IDs, not SQL, stack traces, tokens or untranslated exception text. English/Arabic UI resolves message keys and parameters; business enums remain locale independent. Logs carry correlation IDs without copying document content.

## Queries, search and files

Lists use stable cursor pagination with deterministic sort and bounded page sizes; filters/sort are allowlisted. Counts and search results are authorization-filtered. Financial sums group currency and state/basis; pending local changes are separate. Queries identify data revision/as-of/complete-or-cached status. A new mutation may invalidate cursors; the UI handles refresh without duplicating rows.

Attachment access binds workspace/object/version/permission, expires quickly and cannot be widened by editing URL parameters. Uploads enforce declared size/type/quota and verify content hash before committing a reference. Downloads recheck permission; URLs are excluded from ordinary analytics/logs. Exports run against a consistent permitted snapshot and record content/renderer version.

## Sync invariants and acceptance

Push of a local dependency graph orders creates before references; partial batch acceptance reports per operation, never an ambiguous all-success. Pull applies data and cursor atomically. Lost response returns the same receipt; reordered events cannot regress a revision. Role downgrades invalidate affected projections/subscriptions. Rejected operations are quarantined with recoverable local content and safe export options according to current policy.

Acceptance fixtures: duplicate issue command; changed payload with reused key; request while role is revoked; cross-tenant object ID in a valid tenant request; expired signed file link; unknown event version; interrupted push/pull; Arabic validation; cursor refresh during edits; offline stop retry. These join the [test strategy](../quality/test-strategy.md).
