# F001 Evidence Record Contract — Version 1

**Status**: Design for future records; no actual delivery results or approval asserted.
**Requirements**: FR-009–FR-014, FR-017–FR-018, FR-022, FR-024–FR-026.
**Related**: [field model and transitions](../data-model.md),
[checker interface](local-validation.md), [approval policy](review-policy.md).

## Envelope

The future JSON sidecar is UTF-8 with `schema_version: 1` and a unique top-level `pack_id`.
Its top-level sections are `phase`,
`proposal`, `snapshot`, `categories`, `evidence`, `findings`, `decisions`, `approval` and
`transitions`. Every section is present; arrays can be empty only where current phase state allows.
The model defines individual fields and meaning; this contract adds validation boundaries.

- `phase` and `proposal` identify F001/P00/NFR-014, scoped local requirements and one primary PR.
- `snapshot.id` is the unambiguous target of this pack's `snapshot_ref` values; `snapshot` also
  captures actual observed head/base, reviewed-path digest, working-tree state and
  explicitly excluded evidence containers; no mutable record claims to contain its own final hash.
- Pack references resolve to `pack_id`; historical cross-pack references identify the prior pack
  and snapshot explicitly. Unknown, duplicated or dangling pack/snapshot identities are findings.
- `categories` enumerates required review subjects and individual applicability reasons.
- `evidence` provides expected/observed outcomes tied to scenario, requirement and snapshot IDs.
- `findings` preserves defects, ownership, next actions and observed closure.
- `decisions` preserves confirmed/recommended/open governance decisions; no open product answer is
  inserted merely to make validation succeed.
- `approval` is a pending or attributed decision reference. The checker never authenticates it.
- `transitions` preserves actual events; synthetic transition demonstrations must be labeled as
  fixtures rather than mistaken for the real phase lifecycle.

No field named `approved: true`, `source_verified: true` or `merge_authorized: true` establishes
consent. Explicit provenance can only be assessed in trusted current review context.

## Required Review Subjects

| Category | F001 expected applicability |
| --- | --- |
| Documentation, sources and stable/local IDs | Required: actual governance artifacts, links, references and stale-source reconciliation |
| Evidence/result/status and approval rules | Required: record validity, ten approval cases and no undocumented bypass |
| Existing shell regression | Required by root minimum contract: actual launcher, typecheck and build results at delivery |
| Application domain/storage/contracts | Not applicable if no application model/storage/command changed; name the unchanged subject |
| Tenant/project authorization | Not applicable to runtime if no runtime permissions changed; governance owner/provenance checks remain required |
| Offline/retry/recovery | Governance stale/retry/repair states required; product outbox/timer/finance journeys inapplicable without those changes |
| Bilingual UI/accessibility and PDF/CSV | Product paths inapplicable if unchanged; documentation remains readable and directions/IDs unambiguous |
| Native platform/distribution | No new native claim; product OS/signing journeys inapplicable without native changes |
| Migration and financial arithmetic | Inapplicable to application data when no schema/calculation changed; constitutional protection still reviewed |
| Secrets/dependency/license and redaction | Review changed content/fixtures for sensitive data and verify no dependency/license change; unavailable external scans are not invented passes |

Applicability must be reassessed if implementation changes scope. A `not applicable` reason names
the specific unchanged subject. It is invalid for required policy, evidence or approval checks.
No blanket "docs only" exclusion for the entire table is accepted.

## Coverage and Freshness

All FR-001–FR-026 map to recorded scenarios, review observations or edge-case findings. All
A-01–A-22 have independently defined expected outcomes and actual observations at delivery.
Synthetic A-20 merged/released cases are labeled policy classification tests; the real merge event
is recorded only after it occurs. Seven SC outcomes reference their supporting evidence, and the
ten SC-004 cases remain identifiable rather than collapsed into a single unexplained pass.

A passing command with no evidence for a claimed scenario is not that scenario's proof. Evidence
references exact measured context; a current pack may link unaffected older results only with
an explicit carry-forward assessment naming old/new context and reviewer. Missing required artifacts,
changed reviewed content or unknown impact make dependent evidence incomplete/stale.

The reviewed-path set includes all changed non-evidence F001 files, including checker, tests and
fixtures, plus the required governance documents. Only the two named evidence containers may be
excluded from the digest. Validate omissions against base/current and uncommitted/new changes;
do not let a caller hide a material tooling change by leaving it out. Use the deterministic
SHA-256 byte/path framing specified in the record model; a different or unknown digest format is
not silently equivalent.

Pure report/sidecar transcription changes do not grant unlimited carry-forward. Describe what
changed, verify content against original observations and assess whether policy or conclusions
changed. Material changes require repeated affected checks and current owner confirmation.

## Status and Failure Rules

Use exactly `passed`, `failed`, `not run`, `unavailable`, `stale`, `not applicable` for results.
Failed/unrun/unavailable/stale applicable required evidence prevents readiness. Individual justified
inapplicability is neither failure nor pass. Missing artifact access produces an unavailable or
incomplete result; a URL or command name alone is never inspected evidence.

Reject duplicate record IDs, unresolved references, unknown schema versions, invalid transitions,
unknown F/local/stable IDs, blanket waiver, missing expected/observed fields for claimed passes,
misrepresented real/synthetic events, and unverified approvals represented as established fact.
Diagnostics identify record, violated rule and next action without reproducing sensitive values.

## Security and Compatibility

Records are inert data. Do not execute recorded commands, fetch URLs or import paths as code.
Local artifact references stay within the repository's declared review/artifact area; a path that
escapes or resolves through an out-of-root symlink is rejected. External artifacts are references
requiring explicit inspection, not downloader inputs. Enforce documented size/count bounds in
[the CLI contract](local-validation.md) before reading large records.

Use synthetic tenants/names and safe placeholders in fixtures. Do not embed live tokens/customer
content for negative tests. Unknown record versions fail with a repair message and do not modify
files. F002 may extend the contract with explicit compatibility decisions; no implicit schema
upgrade or application database migration is introduced by F001.
