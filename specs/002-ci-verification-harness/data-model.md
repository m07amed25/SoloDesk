# F002 Verification Record Model

**Status**: Phase 1 design; not implemented data or observed results.
**Authority**: [spec](spec.md), [plan](plan.md), [F001 record boundary](../001-delivery-governance/contracts/evidence-record.md).

## Record Families and Compatibility

Use UTF-8 JSON with exact top-level `schema: "solodesk.verification.<kind>"` and integer `schema_version: 1`. Kinds are policy, toolchain, suites, context, selection, run, provider, report, summary, review and adoption. Selection contains ApplicabilityDecision records; run contains VerificationRun/Attempt; provider contains ProviderObservation. Every family has a corresponding proposed schema and bounded validation owner in records.mjs. The family identifier prevents confusion with F001's independently versioned envelope. Unknown kinds/versions, duplicate JSON keys, malformed types and unknown security-sensitive fields fail closed with a repair message. No automatic rewrite/upgrader is introduced.

Each entity has a unique `id`; cross-record references require both family and identity. Timestamps are UTC ISO-8601, durations/bytes/counts are nonnegative safe integers, SHA values are observed full Git object identities rather than examples, and digests identify their framing/version. No floating values decide duration limits or counts. Limits apply before unbounded allocation. These are tooling records, not financial data.

## Entities

### VerificationPolicy

| Field                                 | Meaning / validation                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`, `revision`, `schema*`           | Immutable policy identity/version; revision is exact source commit, or declared bootstrap candidate identity |
| `authority`                           | `reviewed-base` or `bootstrap-candidate`; source path, commit and inspected review reference                 |
| `mandatory_checks`                    | Nonempty unique definitions; baseline cannot be waived by candidate additions                                |
| `risk_rules`                          | Ordered typed path/behavior rules, affected categories/targets and explicit unknown-path handling            |
| `targets`                             | OS/architecture/runner-image identities used for validation; not product support declarations                |
| `limits`                              | Exact [security-and-limits](contracts/security-and-limits.md) defaults or reviewed replacement               |
| `suite_manifest_ref`, `toolchain_ref` | Resolve to supported enrolled suite/toolchain records                                                        |
| `disposition_refs`                    | Scoped finding decisions with owner/reason/expiry; cannot waive constitutional blockers                      |

Candidate policy may extend obligations. Removing or weakening base obligations requires reviewed adoption into the base, not a self-declared local waiver. A changed policy is itself a high-risk subject. Bootstrap policy is visibly untrusted candidate material until independently reviewed; no authenticated base record is fabricated.

### ToolchainManifest

Fields: `id`, `runtime` (exact Node/npm), `packages` (locked name/version/integrity and native platform expectations), `actions` (repository/full commit SHA and reviewed purpose), `cli_binaries` (name/release/source/checksum/platform), `runner_images` (explicit label and observed release at execution), `review_ref` and `updated_at`.

Unresolved/floating action identities, unsigned assumptions about binaries, unverified checksums or unsupported required platforms block their dependent execution. Source/version/engine checks and actual native runs establish compatibility; manifest presence alone does not.

### SuiteManifest / CheckDefinition

Each suite definition contains `check_id`, `category`, `phase_ids`, `requirement_ids`, `scenario_ids`, `runner_kind`, explicit `entry_files`, a reviewed command identifier/argument array, required environment/targets, minimum executed tests where relevant, timeout, mandatory artifact kinds and applicability rule IDs. No shell strings or commands can be loaded from a report. Fixture trees are excluded from discovery.

Baseline check IDs: `typecheck`, `lint`, `build`, `launcher`, `governance-policy`, `governance-tests`, `documentation`, `verification-unit`, `verification-integration`, `secrets`, `dependencies`, `licenses`, `workflow-syntax`; native checks use `desktop:<target-id>`. Future suite IDs are unique and namespaced by their owning feature. An enabled required suite must have real entry files and positive/negative tests. Future categories without implemented behavior remain explicit deferred obligations, never empty passing suites.

### VerificationContext

| Field                                                 | Meaning / relationships                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`, `phase_ids`, `proposal`                         | Stable F-ID(s), repository identity, PR number if present; exactly one primary F002 proposal                               |
| `execution_mode`                                      | `local`, `hosted-pr` or `hosted-push`; local cannot impersonate hosted                                                     |
| `proposal_head_sha`, `base_sha`, `tested_sha`         | Separate proposal/base/executed commit identities; PR tested merge ref is explicit                                         |
| `working_tree`                                        | `clean` or local reviewed changed/new-file inventory and content digest; hosted execution requires clean checkout          |
| `policy_ref`, `policy_authority`, `workflow_identity` | Exact policy and workflow path/id/ref/blob digest as observed; bootstrap label required when applicable                    |
| `provider`                                            | Repository ID, event, raw provider `head_sha`, run ID/attempt, run URL, started time; absent for local mode                |
| `changed_paths`                                       | Complete bounded Git inventory with both sides of renames, deletions/new files and interpretation method                   |
| `environment`                                         | Actual OS/architecture/image, Node/npm/Electron where relevant, measured runner resources and nonsecret prerequisite state |

Currentness is a comparison with inspected current PR head/base and actual run association, not timestamp recency alone. Preserve raw provider fields even when they differ from executed merge SHA. Missing ancestry/ref/context is blocked rather than reconstructed from a mutable branch name. Never print token values, inherited environment dumps or customer paths.

### ApplicabilityDecision

Fields: `id`, `context_ref`, `check_id`, `target_id`, `selected` boolean, `policy_rule_refs`, `changed_subjects`, `reason`, `review_required`, and required producer/artifact IDs. Unselected items have a category-specific reason and remain visible. Required baseline definitions cannot be unselected. Contradictory/duplicate decisions block.

Unknown paths choose all available relevant checks or stop selection for review. Unknown future behavior requiring a nonexistent suite is a gap, not an automatic not-applicable decision.

### VerificationRun / Attempt

Fields: `id`, `context_ref`, `provider_run_id`, `attempt_number`, `started_at`, `finished_at`, `supersedes`, `state`, selected-check manifest digest, applied limits, owned scratch root, safe result references and cleanup result. Provider attempts remain distinct. Local runs use separately namespaced IDs.

Execution states: `prepared → running → completed`; terminal alternatives `failed`, `canceled`, `timed-out`, `superseded`, `unavailable`. A completed coordinator does not imply all checks passed. Retries create a new attempt; zero automatic retries initially. Never delete the old attempt to repair a result.

### CheckReport

Fields: `id`, `context_ref`, `run_ref`, `check_id`, `target_id`, `command_id`, actual safe argv reference, `producer` (local or provider job/step), `started_at`, `finished_at`, `status`, `reason_code`, `expected`, `observed`, `counts`, `artifacts`, `findings`, `cleanup` and `tool_versions`.

Status vocabulary remains F001-compatible: `passed`, `failed`, `not run`, `unavailable`, `stale`, `not applicable`. Detailed terminal reasons preserve canceled/timed-out/superseded/unexpected-skip/crash/collection-error distinctions. Passing tests require independently observed nonzero counts and no required skips/TODO/failures. Build/lint/scanner checks use their own input counts/outcomes rather than pretending they are test assertions.

Reports cannot override provider job conclusions. A report with successful counts from a failed/canceled provider job remains blocking. A missing required report cannot be synthesized by aggregation as an observed pass.

### ArtifactManifestEntry

Fields: `id`, `context_ref`, `run_ref`, `check_ref`, allowlisted `kind`, safe relative path or inspected provider artifact ID, SHA-256 content digest, bytes, `collection_status`, `redaction_status`, `created_at`, `expires_at` and access observation.

Only allowlisted files inside the owned scratch root are collected; traversal, absolute/out-of-root/symlink targets, active markup/executables and unsafe encodings are rejected. External URLs are references, never execution or downloader instructions. Required artifact expiry/access loss blocks current evidence, even if the historic test result remains true.

### ProviderObservation

Fields: read-only inspection identity/time, repository/run/attempt/workflow/job IDs, raw conclusions, expected check names, current PR head/base, executed association evidence, safe artifact metadata and mismatches. Source is the authenticated provider API plus inspected workflow blob, not editable report assertions. Pagination and API errors are bounded and visible. Inspecting provider metadata does not prove the truth of arbitrary candidate test code or owner consent.

### AggregateSummary

Fields: `id`, `context_ref`, `run_ref`, policy digest/source, required/applicable check inventory, provider conclusions, report IDs, per-target outcomes, safe artifact availability, blocking findings, `automated_ready`, and separate human-stage references/statuses.

`automated_ready` is true only under [gate contract](contracts/evidence-and-gate.md). There is no `merge_authorized: true` derived from CI input. Agent QA/owner approval may be pending in a structurally valid automated summary. A future claimed human completion references an actual inspected source and still needs current-context review.

### Finding / ReviewRecord

Fields: `id`, phase/requirement/scenario/check refs, severity, blocking rule, safe diagnostic, responsible role, concrete next action, evidence refs, status, reviewer/time and resolution observation. Status: open, mitigated-awaiting-verification, closed or individually accepted limitation where policy allows. Exposure, privilege bypass, data-loss and other constitutional blockers cannot be accepted away by JSON.

Review records distinguish agent QA, owner authorization and mandatory independent platform review; source authenticity stays outside self-reported claims. Withdrawal/staleness preserves history. F002 evidence links to F001's governing approval rules without overwriting F001's pack.

### EnforcementAdoptionRecord

Fields: observed repository/default branch/settings/access/entitlement, expected exact check identities, before/proposed/after configuration, authority source, prerequisite/check availability evidence, recovery steps, outcome, operator/time and residual gaps. States: prepared, blocked, authorized, activated, verified or reverted. Authorization and verified activation require actual sources/outcomes; a plan or HTTP payload does not satisfy them.

## Relationships and Invariants

- One context binds one selection and many run attempts; one attempt has exactly one result per selected check/target and one aggregate. Duplicate/conflicting reports block.
- Each selected check resolves to a supported suite definition and declared producer; each required artifact resolves to its actual producer/context, not an artifact from another revision or target.
- The aggregate compares complete expected versus observed sets. Matrix outputs must cover every selected target independently.
- Provider conclusion, report status and artifact status are separate. None can silently overwrite another; the strongest blocking gap remains visible.
- Records are parsed as inert data with explicit enums/field bounds. No command, URL, path or markup is evaluated as code.
- Head/base/policy/workflow changes make dependent results stale. Only governance-permitted unchanged-subject carry-forward has explicit old/new identities, reviewer/date and rationale. Owner approval never transfers automatically.
- Hosted results cannot use local dirty-tree content sealing to substitute an uncommitted subject. F001's content-bound pre-approval rule remains limited to its documented use.
- Compact QA summaries outlive hosted retention but cannot turn a missing required artifact into current proof. Regeneration/restoration requires actual verification.

## State Projection

| Input / event                                              | Automated projection                               | Delivery consequence                      |
| ---------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Required check selected but not concluded                  | Pending/non-ready                                  | Stay at incomplete automated verification |
| All required valid current checks/evidence pass            | Automated ready                                    | Agent QA still needs actual completion    |
| Required failure/unavailable/missing/skip/timeout/conflict | Blocked with exact reason                          | Repair dependent check; preserve history  |
| Supersession or head/base change                           | Canceled/stale/non-ready                           | New attempt/current assessment required   |
| Actual agent QA succeeds                                   | Automated result unchanged; QA separately complete | Await current owner decision              |
| Owner decision absent/unverified/stale/withdrawn           | No invented automated failure/pass                 | Merge readiness remains false             |
| All delivery gates and current owner authority satisfied   | No auto-merge                                      | Actual authorized merge remains separate  |

F002 introduces no customer data lifecycle or rollback of financial state. Version compatibility, scratch cleanup, currentness and evidence repair are its data-evolution responsibilities.
