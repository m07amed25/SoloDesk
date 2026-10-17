# F001 Local Governance Validation Interface

**Status**: Implemented CLI and fixture contract; observed results are in `docs/qa/F001.md`.
**Requirements**: FR-002, FR-009–FR-014, FR-017–FR-018, FR-024–FR-026.
**Related**: [research R-02–R-05](../research.md), [record model](../data-model.md),
[evidence envelope](evidence-record.md), [manual review](review-policy.md).

## Commands and Inputs

From the repository root, the interface is:

```bash
node tooling/check-governance.mjs
node tooling/check-governance.mjs --evidence docs/qa/F001.evidence.json --format json
node --test tooling/check-governance.test.mjs
```

Default mode inspects the declared policy artifact set. `--evidence <repository-relative-file>`
adds version-1 evidence diagnostics. `--format json` emits one structured result; otherwise emit
compact human-readable findings. A test-only explicit `--root <fixture-root>` selects an isolated
synthetic repository; normal usage resolves the current checkout root. Do not infer a root or
read arbitrary paths from recorded commands. Reject unknown/missing/conflicting arguments.

No option approves, merges, writes records, executes recorded procedures, downloads artifacts,
queries remote identity or modifies Git/service settings. Never add a bypass option such as
`--assume-owner-approved`. Test data source assumptions are fixtures, not CLI authority flags.

## Declared Policy Set and Reference Scope

Required artifacts are the reviewed constitution, AGENT/AGENTS entry guidance, root F001
contract, F001 spec, operational governance guide, PR template and F001 feature/QA records.
README/docs index are checked where their new governance links are introduced. The checker reads
owning requirement/coverage registers for reference definitions. Missing required artifacts fail;
future paths described in this plan are not required to exist until F001 implementation.

Supported references:

- Inline Markdown links/images and reference-style links in actual prose, with repository-relative
  targets, optional fragment and angle-bracket path syntax. Decode percent-encoded local paths
  safely; reject traversal/absolute required-governance paths escaping the root.
- Explicit HTML `id` anchors and ATX Markdown heading fragments using documented GitHub-style
  heading normalization, including repeated headings and Unicode fixture coverage. Cover the
  actual supported syntax in tests; report relevant unsupported constructs for manual repair.
- Relative links inside installed skill catalogues are not recursively crawled. Machine-specific
  absolute links in the declared session-skill catalogue are reported as external/nonportable
  references, with no read or validity claim outside the checkout. This exception cannot hide a
  missing required governance source.
- Fenced examples and inline code paths declaring future deliverables are not asserted to be live
  links. Explicit linked required artifacts remain real requirements, even inside descriptive docs.
- External HTTP(S)/app/source references are listed for manual inspection, not fetched. Their
  presence is not a successful network check or proof of human approval.

IDs resolve by ownership: F-IDs/prerequisites against root-plan phase definitions; stable product
IDs against requirement/coverage definitions; F001-local FR-001–FR-026, A-01–A-22 and SC-001–SC-007
against the F001 spec. Do not treat pattern notation (`F###`, `FR-xxx`) as a real ID, local FRs as
new global requirements, or repeated references as duplicate authoritative definitions.

## Output and Exit Codes

JSON output contains `schema_version`, `mode`, `checked_paths`, `snapshot`, `findings`,
`external_references` and `summary`. A finding has stable code, severity, safe path/record ID,
affected rule and repair action. Summary describes `valid` or `blocked` documentary structure,
result counts and an explicit `owner_source_verification: required` notice for approval records.
Do not emit an affirmative merge/owner-authorized flag from self-reported input.

| Exit | Meaning |
| --- | --- |
| `0` | Requested local policy/evidence checks satisfied; manual QA, trusted approval and remote constraints remain independent |
| `1` | Governance/reference/evidence findings prevent documentary readiness |
| `2` | Invalid invocation, unsupported record version, unsafe/oversized input, unreadable root or tool failure |

Pending owner approval is a normal pre-approval record state and does not by itself make a
structurally valid QA pack invalid. Output must explicitly say authorization is still pending/
unverified. Missing required approval record fields for a claimed approved state, stale approval
references or misclassified reviews are findings. Never interpret exit 0 as merge eligibility.

## Evidence and State Diagnostics

Validate field completeness, unique IDs, resolvable cross-references, all required coverage,
honest six-state results, category-specific inapplicability and required artifact availability.
Check snapshot/baseline correspondence and any explicit carry-forward assessment. Reject unsupported
assertions of passed/merged/released without required evidence; never manufacture those events.
A URL's syntax may be checked, but remote contents/currentness stay unobserved until inspected.

Resolve the envelope `pack_id` and `snapshot.id` references unambiguously, including explicit
historical pack links. Verify the reviewed-path set includes all changed non-evidence F001 files,
including checker/tests/fixtures and new uncommitted files, as well as required policy inputs.
Omitted changed subjects, digest mismatches and unknown framing versions are findings. Use the
record model's canonical SHA-256 path/byte framing; never trust a caller-supplied digest alone.

Approval provenance cannot be authenticated from a JSON string or prose. Tests must demonstrate
that documentary validity does not create owner authority. The actual AP-01–AP-10 classification
is a manual contract backed by synthetic expected-case tests and real source inspection.

Automated clause/field tests catch missing required approval rules and known bypass formulations;
they do not prove the meaning of arbitrary Markdown. Agent QA must inspect the actual policy,
including newly introduced exceptions, even when structural checks pass.

## Safety and Bounds

No runtime dependencies beyond Node built-ins. Use platform-portable path handling; local
references must resolve within the selected checkout/fixture root after symlink resolution.
Treat records and Markdown as inert text. Never shell-execute their content, import them as code,
follow arbitrary filesystem links, or fetch network URLs. Output rule/location, not secret values.

Initial defensive checker limits: 2 MiB per document/record file, 32 MiB cumulative input,
512 selected local targets and 2,048 records per collection. Exceeding a limit produces exit 2
with a scope/limit explanation. These are local tooling protections, not product storage or team
capacity promises. Fixture files remain small and labeled synthetic.

## Required Meaningful Fixtures and Handoff

Independently expected fixtures cover: missing file/anchor; unsupported relevant syntax; traversal/
symlink escape; unknown/reused ID; malformed/unknown-version record; missing artifact; omitted
coverage; failed/unavailable/stale applicable results; blanket waiver; changed head/base with and
without justified carry-forward; ten approval cases; false independent review; absent real
merge/release event; material change preserving history; no network/record-command execution.
Include a positive bounded policy set and pre-owner evidence pack. Failures name the affected rule
and repair; do not write tests that merely echo implementation helpers.

Include independently expected digest fixtures for ordering/Unicode/raw line endings, omitted
changed tooling/new files, explicit evidence-container exclusions and dangling pack/snapshot IDs.

F002 can invoke this interface and extend it through documented compatibility changes. F001 adds
no CI workflow, required remote status, action pin, external scanner or signing/deployment code.
The local check is advisory evidence; future enforcement and authenticated provider integration
remain separate, explicitly authorized work.
