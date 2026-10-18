# F003 Commands, Results and Events

**Version**: proposed protocol 1, payload/event schema 1. **Requirements**: FR-001–FR-010, FR-018–FR-021, FR-025. [Data model](../data-model.md), [bounds](primitives-and-bounds.md), [authority](ports-and-authority.md) and [evolution](compatibility-and-intent.md) are part of this contract.

## Admission Pipeline

1. Receive bounded raw UTF-8 bytes or an already structured-cloned plain-data value at a trusted adapter boundary.
2. Enforce encoded bytes; tokenize text with depth/node/member/string counters; reject malformed UTF-8, lone surrogates, duplicate decoded property names and disallowed JSON numbers before ordinary mapping loses information.
3. Validate the closed envelope, explicit version/bounds profile, registered operation and payload schema. No coercion, unknown-key dropping or dynamic executable schema.
4. Validate runtime ID tags, scoped-reference consistency, exact primitives and operation-specific bounds. Build a fresh immutable validated value; never retain mutable caller input as receipt intent.
5. Trusted receiver obtains current context and resolves actual references/permissions before any effect or private receipt disclosure. Structural success is reported only as structural success.

The text decoder accepts only JSON primitives/arrays/objects under the profile. The object entry point rejects undefined, functions, symbols, BigInt, Date/class instances, nonplain prototypes, dangerous keys and accessors. It is intended for data produced by a trusted clone/codec, not an execution sandbox for arbitrary live Proxy objects. Do not read accessor values; proxy/trap failures yield safe validation failure. Arbitrary JavaScript objects never cross a production IPC/network contract by reference.

## Runtime Identities

An ID is `{kind, value}`. `kind` is one closed literal: `workspace`, `actor`, `device`, `project`, `resource`, `operation`, `request`, `receipt`, `diagnostic` or an explicitly registered future resource kind. `value` is canonical lowercase UUIDv4 with RFC variant bits; nil/max/other versions and display document numbers fail. No generation or cryptographic implementation lives in the pure module; later composition roots use approved generators.

`ScopedReference` is `{kind, id, workspaceId}` with tagged resource identity and tagged workspace identity. Kind must agree with the resource ID's runtime tag and operation's expected resource kind. Claimed tags are not ownership evidence; trusted resolution checks actual kind/workspace/current access. A forged but well-formed tag cannot pass the authoritative resolver merely because its syntax is valid.

## Request Envelope

| Field              | Required semantics                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `protocolVersion`  | Integer literal 1                                                                                   |
| `payloadVersion`   | Integer in operation's explicit support list; initial 1                                             |
| `boundsProfile`    | Literal `F003-bounds-v1` after approved adoption                                                    |
| `kind`             | `query` or `command`                                                                                |
| `operation`        | Registered named kind, maximum 64 ASCII characters; no caller-chosen privileged channel             |
| `requestId`        | Tagged request ID, per transport attempt                                                            |
| `workspaceId`      | Tagged workspace ID; required for tenant-scoped F003 fixtures                                       |
| `deviceId`         | Tagged device ID if definition requires enrolled capture/device binding; otherwise absent, not null |
| `operationId`      | Tagged operation ID required only for commands                                                      |
| `expectedRevision` | Canonical nonnegative revision text when required by definition; create commands explicitly omit it |
| `occurredAt`       | Optional canonical instant only if definition supports occurrence evidence; semantic when declared  |
| `payload`          | Closed validated operation-specific object; fields own null/empty/omission rules                    |

Actor, role/grant arrays, tokens, raw paths, SQL and unrestricted URLs are not envelope authority fields. Each operation definition has an owner, accepted kind/versions, required context/ref types, named payload validator, result alternatives, narrower field bounds, intent projection and documented side-effect authority. A generic registry decoder is a pure codec; it must not expose a generic execution method to the renderer.

F003 registers no production client/task/invoice/provider commands. Conformance-only definitions are `conformance.echo` (query, exact values/text round-trip) and `conformance.record` (command, scoped synthetic resource, expected revision and exact payload). They are under test fixtures and never wired into native/service production handlers. Later feature owners register their actual bounded use cases with their own requirements and tests.

## Result Envelope and Closed Alternatives

All results carry protocol/payload version, request correlation, operation kind, workspace and a `status` discriminator. Command results identify the original operation ID; receipts are not invented for queries. Success/result payloads are closed and versioned.

| `status`                  | Required data                                                                                               | Forbidden implications                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `query_result`            | Validated permitted data; freshness `current` or `cached`; optional as-of instant/revision if substantiated | No mutation, commit or durable-save claim                                                   |
| `rejected`                | Safe public error, certainty `not_applied` only if established                                              | No receipt/commit revision or partial success                                               |
| `local_saved`             | Local receipt identity and local revision                                                                   | No server revision/cursor/commit timestamp; future adapter must actually persist atomically |
| `queued`                  | Existing local receipt identity, local revision and queue state                                             | No upload acknowledgment or financial authority                                             |
| `authoritative_committed` | Authoritative receipt, committed revision and service commit instant; permitted progress token if relevant  | No provider-delivery/completion claim                                                       |
| `job_accepted`            | Authoritative job/receipt reference, acceptance instant and job state                                       | No sent/delivered/settled flag or completed external effect                                 |
| `conflict`                | Safe REVISION_CONFLICT error; permitted current revision and opaque resolution reference when authorized    | No private candidate leak or automatic overwrite                                            |
| `outcome_unknown`         | OUTCOME_UNKNOWN error and same-operation reconciliation reference                                           | No claim that cancellation/timeout prevented the effect                                     |

Unexpected metadata on a result alternative fails validation. A command response whose operation identity differs from its request fails correlation. Service/adapter failures map to a safe alternative using observed certainty; a generic failure never proves no effect. Results cannot label incomplete/partial-batch acceptance as all-success; a later batch contract must enumerate per-operation results.

## Event Envelope

Initial accepted-event fixtures contain `protocolVersion`, `eventVersion`, `boundsProfile`, registered `eventKind`, workspace, tagged entity reference, accepted entity revision, original operation ID, verified actor reference where publicly permitted, service commit instant, opaque progress token and a minimal closed payload. Client occurrence evidence is a separate optional field. The event's revision/cursor is not accepted merely because its schema passes.

Unknown versions/kinds/fields stop that stream before applying data or advancing progress. The raw pending/event content remains available to the owning adapter for protected recovery. F003 models this behavior in doubles; real pull+cursor atomicity and event retention belong to F018. Public event projections never contain tokens, private fields or arbitrary executable payloads.

## Required Rejection Evidence

Cover null versus absence, unknown operation/field/version, wrong nested types, decoded duplicate keys, numeric float payloads, identity-kind substitution, declared/actual tenant mismatches, changed result correlation, illegal success metadata and unsupported events. Keep public errors bounded and content-free. Representative request/result/event fixtures must round-trip with unchanged exact values and Unicode in all declared runtimes.
