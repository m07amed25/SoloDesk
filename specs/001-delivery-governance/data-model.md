# F001 Review Record Model

**Status**: Design only. These are repository review records, not application tables or migrations.
**Authority**: [specification FR-001–FR-026](spec.md), [research R-04–R-07](research.md).
**Serialization**: Human-readable Markdown plus the version-1 JSON sidecar defined in
[the evidence contract](contracts/evidence-record.md). Trusted source verification remains outside
self-reported records.

## Shared Types and Invariants

- `phase_id`: an existing root-plan `F###` identity; F001 here. `requirement_ids` resolve to their
  owning register; F001-local FRs and A scenarios always identify this feature as their namespace.
- `record_id`: nonempty, unique within the evidence pack; references must resolve to one record.
- `timestamp`: ISO 8601 date/time with timezone; document-created dates use `YYYY-MM-DD`.
- `revision`: actual Git commit identity, or an explicitly labeled uncommitted snapshot consisting
  of observed head, comparison base and digest of the declared reviewed files. A snapshot must
  never masquerade as a committed/published revision.
- `artifact_reference`: bounded repository-relative file, or an explicit external evidence/source
  reference. Existence of a URL is not proof of its content, availability or authenticity.
- `classification`: `confirmed`, `recommended`, `open`; the last two never imply user adoption.
- IDs, findings and historical review events are not reused or silently overwritten. Corrections
  add new records linked to superseded ones. No sensitive environment dump or credentials belong
  in any record. Pending real-world facts remain null with an honest explanation.

## 1. Feature Phase

| Field | Rule |
| --- | --- |
| `id`, `milestone`, `parent_requirements` | F001, P00 and NFR-014 for this delivery; required |
| `outcome`, `included_scope`, `excluded_scope` | Concrete bounded result; nonempty |
| `prerequisites` | Existing F-IDs; empty for F001; no self/cyclic dependencies |
| `blocking_decisions` | Existing decision references plus blocked action/owner; empty only when none block current scope |
| `responsible_roles` | Contributor, reviewing agent and user/owner; independent reviewer only when actually required |
| `delivery_state` | One lifecycle value from the transition table below |
| `condition` | `active`, `blocked` or `failed`; blocked/failed require reason, owner and next action |
| `last_valid_state`, `history_refs` | Preserve recovery context and supporting transitions |

**Relationships**: One primary proposal per delivered phase; many evidence/findings/transitions.
A maintenance phase links the original rather than mutating its completed delivery history.
**Validation**: No transition from specification checklist state to delivered/merged. Prerequisite
merge evidence and decision resolution are assessed at actual implementation entry.

## 2. Change Proposal

| Field | Rule |
| --- | --- |
| `phase_id`, `title`, `branch`, `target` | One F-ID; `[F###] <outcome>`; `feat/f###-short-slug`; target `main` |
| `pr_url` | Null while merely proposed; actual primary PR URL once open; no fake number derived from F-ID |
| `problem`, `result`, `scope`, `doc_refs` | Required description contract; references resolve |
| `head_revision`, `base_revision`, `snapshot_ref` | Real review identity; pending explicitly before capture |
| `impact`, `recovery`, `limitations` | Each category has a concrete explanation or individual inapplicability reason |
| `remote_constraints_ref` | Delivery-time observation of mandatory checks/reviews; unknown is not satisfied |
| `fix_of`, `maintenance_of` | Optional linked records; fixes before merge stay in the same primary PR |

**Relationships**: Belongs to one phase; reviewed with one current snapshot and one current
applicable evidence pack. Historical packs remain accessible. One proposal may have many owner
decisions over time; only a current trusted decision can satisfy final approval.

## 3. Review Snapshot and Evidence Pack

| Field | Rule |
| --- | --- |
| `pack_id`, `schema_version`, `snapshot.id` | Unique envelope pack ID, schema version 1 and unique snapshot ID within the pack |
| `observed_head`, `comparison_base` | Actual identities against which evidence was gathered |
| `reviewed_paths`, `content_digest` | Complete declared scope plus every changed non-evidence F001 file; reproducible SHA-256 digest; paths cannot escape repository |
| `working_tree_state` | `clean` or `uncommitted`; dirty content must identify the reviewed snapshot honestly |
| `created_at`, `supersedes` | Timestamp and optional preceding pack reference |
| `carry_forward` | Prior evidence IDs, new snapshot, unchanged subjects, impact assessment and reviewer/date |

**Validation**: No copying an old measured SHA into a new record to imply rerun. Material policy,
scope, behavior or acceptance changes require affected verification and current final approval.
Base changes require impact assessment; absent assessment makes dependent evidence stale.
Evidence-only changes can carry forward unaffected checks only with the specified assessment.
**Identity and scope**: `pack_id` is the top-level envelope identity; `snapshot.id` identifies its
snapshot. Evidence/approvals use `pack_id` or `evidence_pack_ref` for that envelope and `snapshot_ref`
for that exact snapshot ID. Reject dangling or cross-pack references without an explicit historical
pack reference. Required review paths include the declared governance set and every changed
non-evidence F001 file, including checker, tests, fixtures and planning/contracts when changed.
Compare with the recorded base and include changed uncommitted/new files; an omitted changed
subject makes the snapshot incomplete rather than magically unaffected. Unrelated working changes
are explicitly inventoried outside F001 scope and preserved, not silently ignored or included.

**Digest format**: Use SHA-256 over `F001-review-v1` plus a newline, followed by each reviewed file
ordered lexicographically by its UTF-8 repository-relative POSIX path bytes. For each file append
the decimal path-byte length, a colon, path bytes, a newline, the decimal raw-content byte length,
a colon, raw file bytes and a newline. Hash raw bytes without line-ending normalization. Reject
duplicate/escaping paths and include every nonexcluded changed subject; the versioned format
permits fixtures to verify deterministic results across platforms.

**Self-reference**: The digest excludes only the explicitly named mutable evidence containers
`docs/qa/F001.md` and `docs/qa/F001.evidence.json`; it does not exclude whole directories, tooling
or root policy files. Record those two as reviewed evidence containers, not hashed policy content.
Changes to their substantive claims still require review. Freeze the
actual PR head before asking for final approval; do not commit a transcription of approval and
pretend the new head was the approved one.

## 4. Evidence Record

| Field | Rule |
| --- | --- |
| `id`, `pack_id`, `scenario_ids`, `requirement_ids` | Unique and resolvable; coverage maps A-01–A-22 and FRs to NFR-014 |
| `category`, `subject`, `applicable` | Declared category and concrete inspected/unchanged subject |
| `snapshot_ref`, `environment` | Current identity plus runtime/OS/locale or document-review environment |
| `fixtures_or_documents`, `procedure` | Synthetic fixture/document inputs; exact steps or commands |
| `expected`, `observed`, `status` | Independent expectation, actual observation and one allowed result status |
| `artifact_refs`, `reviewer`, `recorded_at` | Safe references, actual reviewing identity/type and timestamp |
| `finding_refs`, `supersedes`, `applicability_reason` | Links; reason required for each inapplicable category |

Allowed result values preserve the specification's six meanings:

| Value | Meaning and readiness consequence |
| --- | --- |
| `passed` | Actual expected outcome observed for the identified current subject; counts only if applicable and current |
| `failed` | Observed mismatch; repair and repeat affected checks |
| `not run` | Planned/procedural description only; cannot count as success |
| `unavailable` | Required access/tool/quota/artifact unavailable; blocker for applicable required evidence |
| `stale` | Prior result exists but cannot support the current revision/baseline |
| `not applicable` | Individually justified unchanged subject; not a pass and cannot waive a required governance check |

**Validation**: Applicable required evidence cannot be absent, missing required artifacts or
`not applicable`. An external artifact needs a recorded inspection outcome; URL syntax alone is
insufficient. Native/Arabic/application journeys cannot be inferred from a documentation audit.

## 5. Review Finding

| Field | Rule |
| --- | --- |
| `id`, `evidence_refs`, `affected_requirements` | Unique with resolvable affected records/rules |
| `severity`, `blocking` | `blocker`, `major` or `minor`; known governance/constitutional/approval bypasses block |
| `observation`, `owner`, `next_action` | Concrete problem and responsible repair role |
| `disposition`, `closure_evidence`, `supersedes` | `open`, `fixed` or `accepted limitation`; closure requires observed evidence |

An accepted limitation cannot waive a constitutional MUST, missing required evidence or final
user approval. Closing a finding preserves original observations and references the repair.

## 6. Owner Decision / Approval Record

| Field | Rule |
| --- | --- |
| `id`, `phase_id`, `pr_url`, `snapshot_ref`, `evidence_pack_ref` | Identifies the concrete result; approval of a proposed/nonexistent PR cannot authorize merge |
| `decision` | `pending`, `approved`, `changes requested`, `rejected` or `withdrawn` |
| `decision_maker`, `decided_at`, `source_reference` | Required for a non-pending decision; actual human identity/time/source, not an agent transcription alone |
| `kind` | `owner authorization` or `independent platform review`; never conflate them |
| `supersedes`, `limitations` | Preserve prior decisions and any conditions |

Validity is assessed as `unverified`, `current`, `stale`, `withdrawn` or `rejected` by inspecting the
trusted source and current context; a JSON value asserting validity is not proof. A local checker
may validate record structure and detect stale/contradictory references only. The actual source
may be a direct identifiable human message or authenticated PR record. A synthetic source is valid
only in a labeled test case, never for a real phase. Owner authorization does not remove existing
mandatory remote constraints or authorize deployment.

## 7. Transition and Governance Decision

A **Transition** has unique ID, phase, prior/next state, timestamp/actor, event/source references,
current snapshot/evidence, and reason. It may record invalidation and return to the earliest
unmet review stage; historic later states remain superseded records, not current readiness.

A **Governance Decision** has ID, classification, owner, rationale, affected principles/requirements,
compatibility/migration and verification consequences, authorization reference and version/date.
Only an actual authorized amendment changes confirmed policy. Mechanical corrections to stale
observations do not invent a new product choice or require a semantic constitution bump.

## Lifecycle Transitions

| Target state | Required supporting event/evidence |
| --- | --- |
| `planned` | Phase exists; delivery remains unimplemented |
| `decision-ready` | Scope/prerequisites reviewed; no blocking decision for the authorized slice |
| `building` | Implementation authorized and begun on the one primary branch |
| `PR open/draft` | Real primary PR identity, bounded docs/scope and target recorded |
| `automated checks passed` | Every applicable required current automated result passes; no blanket waiver |
| `agent QA passed` | Actual policy/scenario observations, repaired blocking findings and current coverage |
| `awaiting user approval` | Concrete current result/evidence presented; actual owner decision still absent |
| `approved` | Current trusted explicit owner decision; any independent review remains separate |
| `merged` | Actual authorized merge event/identity and all readiness gates satisfied |
| `released` | Actual separately authorized rollout and required release evidence |

Blocked/failed overlays retain last valid state, owner and next action. Material head changes
invalidate affected verification and approval; pure evidence/format updates need documented
carry-forward assessment. Rejected/withdrawn approval removes current approval and returns to
repair or awaiting-owner review after gates pass. No CLI changes state or performs these events.

## Versioning and Retention

Schema version 1 is a small feature-review format, not a published product protocol. Unknown schema
versions fail validation with a repair/migration message and no rewrite. Future compatible optional
fields require documented acceptance; unknown required semantics never pass silently. Keep historical
packs/findings/decisions necessary to explain delivery. This plan introduces no customer retention
period and does not resolve Q-13. Remove secrets from shareable artifacts through the existing
security process, retaining safe incident references rather than leaked content.

## Implemented serialization clarification

Version 1 uses `reviewer: {id, kind}` for evidence, `decision_maker: {id, kind}` and
`source_reference: {kind, reference}` for an attributed approval, and `from`/`to` in transitions.
Kinds are explicit; editing these values never authenticates a source. Pending real decisions
retain null maker/time/source values. `pack_id` and every record `id` are distinct.

An explicit pre-approval carry-forward assessment may use `new_head: "content-bound"` only to seal
an uncommitted, pending-owner snapshot's unchanged reviewed bytes. It retains old head/base,
new base, digest, reviewer/time/reason and prior evidence IDs. The CLI independently resolves and
reports the actual current Git head and verifies ancestry, complete scope and digest; it never
carries owner approval. Exact revision assessments remain available. See the
[implemented content-sealing rule](../../docs/development/delivery-governance.md#local-commands-and-content-sealing).
