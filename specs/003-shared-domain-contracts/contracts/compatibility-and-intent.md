# F003 Compatibility and Intent Identity

**Requirements**: FR-018–FR-024, FR-033. **Initial proposal**: protocol 1, operation/event schema 1, `F003-bounds-v1`, intent format `F003-intent-v1`. Approval before adoption remains required; this document records concrete design, not approval.

## Version Support

Publish a machine-readable supported-contract catalogue with each operation/event owner, protocol/payload versions, bounds profile, schema identity, allowed result alternatives and canonical intent version. Initial lists contain only 1. Versions are integer safe metadata; revision and financial profile IDs have separate types.

Unknown/missing versions, undeclared fields and unknown event kinds fail closed. No automatic v2→v1 conversion, latest-version fallback or empty replacement occurs. An additive optional field still breaks a closed old receiver unless a transition and supported fixtures explicitly demonstrate compatibility. F003 has no deployment requiring a historical version migration; a synthetic unsupported/older fixture demonstrates preservation obligations only.

## Receipt Scope and Canonical Intent

Receipt scope is the tuple `(workspace, verified actor, operation kind, operation ID)`. It is constructed from verified context and validated request, not a client actor claim. The canonical intent record includes:

- Intent/protocol/payload/bounds versions, operation kind and original operation identity.
- Workspace and verified actor; applicable stable device binding according to operation definition.
- Expected revision or its declared absence; referenced policy/profile versions.
- Normalized exact, validated closed payload and reference identities.
- Original occurred-at evidence whenever the operation definition gives it semantic meaning.

Exclude request correlation, retry attempt counters, transport start/end/received timestamps and diagnostics. Do not omit semantic occurrence evidence indiscriminately. The same actor/operation with new correlation bytes retains intent; changed expected revision, payload, currency/profile, source reference or semantic occurrence evidence changes it.

Canonical bytes use UTF-8, closed ASCII property names sorted by code-unit order, canonical JSON scalar escaping, no insignificant whitespace, exact numeric strings, bounded integer metadata and preserved array order. Strings are compared after JSON escape decoding but without Unicode/name normalization. Null and absence remain distinct. Duplicate decoded names, lone surrogates, exotic values and noncanonical numeric values fail before encoding. This is the project subset specified here, not a claim of implementing all RFC 8785 forms.

Provide independently authored golden bytes for reordered keys, equivalent escape spellings, exact decimals, Arabic combining text, array reordering, omission/null and new-correlation retries. In-memory doubles compare canonical bytes exactly. A future restricted digest port may compute a standard digest but hashing is not authentication, permission or unique-effect proof; durable adapters must follow their collision/retention threat model and preserve canonical original intent.

## Authoritative Processing Order

1. Validate structure, version, primitive bounds and scope; obtain current trusted actor/device/workspace/action context.
2. Check current access before disclosing existing private receipt/result data.
3. Find receipt under the scoped operation identity and compare validated canonical intent.
4. If equal, resolve the permitted original result; do not reject an already committed identical retry merely because its expected entity revision is now historical.
5. If changed, reject key reuse without a new effect. If no receipt exists, resolve current references/revision and authorize the new effect immediately before its owning transaction.

Tests require two independent synthetic receipt mechanisms and an effect counter. Actual receipt uniqueness, concurrency, transaction isolation, permanent financial effect constraints and retention belong to later features; F003 cannot prove those by keeping a map.

## Unknown Outcome and Cancellation

An attempt can transition from validated to locally saved/queued, committed, job accepted, rejected, conflicted or unknown. Unknown may later resolve to the original accepted/rejected/conflicted state through the same scoped operation identity. Timeout, disconnect or cancellation after possible dispatch cannot transition directly to `not_applied` without evidence. Retry guidance is same-operation reconciliation, never a fresh operation ID.

Cancellation before dispatch can produce a rejected/canceled-not-applied outcome only when the adapter establishes no effect. Cancellation does not erase local intent or prior receipts. A job accepted then canceled has separate job-state semantics owned by that feature; it cannot erase financial history.

## Compatibility Change and Recovery Record

Every proposed change records old/new schema/bounds/intent versions, affected consumers and pending data, exact field/semantic differences, positive/negative compatibility fixtures, rollout order and safe backout/forward repair. Preserve old original bytes, operation identity and policy references; never re-sign, relabel or rewrite old intent as newly accepted.

Backout is permitted only if all affected pending/accepted data remain interpretable by the restored consumers. Otherwise keep the last safe reader, stop incompatible writes and deliver forward repair. No profile widening, consumer downgrade, incompatible financial reinterpretation or skipped compatibility result may be hidden as a patch release. Actual migrations/backup/retention remain later-feature gates.
