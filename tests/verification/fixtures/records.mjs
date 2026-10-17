export const shaA = "a".repeat(40),
  shaB = "b".repeat(40),
  shaC = "c".repeat(40);

export const context = () => ({
  schema: "solodesk.verification.context",
  schema_version: 1,
  id: "context-synthetic",
  phase_ids: ["F002"],
  proposal: { repository: "example/synthetic", number: 2 },
  execution_mode: "local",
  proposal_head_sha: shaA,
  base_sha: shaB,
  tested_sha: shaC,
  working_tree: { state: "clean", files: [] },
  policy_ref: "policy-synthetic",
  policy_authority: "bootstrap-candidate",
  workflow_identity: { path: ".github/workflows/verify.yml" },
  changed_paths: [],
  environment: { os: "linux", arch: "x64" },
});

export const policy = () => ({
  schema: "solodesk.verification.policy",
  schema_version: 1,
  id: "policy-synthetic",
  authority: "bootstrap-candidate",
  mandatory_checks: ["typecheck"],
  risk_rules: [],
  targets: [
    { id: "linux-x64", os: "linux", arch: "x64", label: "ubuntu-24.04" },
  ],
  limits: { hosted_ms: 3000000 },
  suite_manifest_ref: "suites-synthetic",
  toolchain_ref: "tools-synthetic",
  disposition_refs: [],
});

export const manifest = () => ({
  schema: "solodesk.verification.suites",
  schema_version: 1,
  id: "suites-synthetic",
  checks: [
    {
      id: "typecheck",
      group: "baseline",
      executable: "$NODE",
      argv: ["synthetic.mjs"],
      kind: "command",
    },
    {
      id: "desktop:linux-x64",
      group: "desktop",
      target: "linux-x64",
      executable: "$NODE",
      argv: ["synthetic-desktop.mjs"],
      kind: "tests",
    },
  ],
});

export const report = () => ({
  schema: "solodesk.verification.report",
  schema_version: 1,
  id: "report-synthetic",
  context_ref: "context-synthetic",
  run_ref: "run-synthetic",
  check_id: "typecheck",
  target_id: null,
  command_id: "typecheck",
  producer: { mode: "local", job: "baseline" },
  started_at: "2026-10-18T00:00:00Z",
  finished_at: "2026-10-18T00:00:01Z",
  status: "passed",
  expected: "Synthetic pass",
  observed: { exit: 0 },
  counts: { kind: "inputs", executed: 1 },
  artifacts: [],
  findings: [],
  cleanup: { status: "completed" },
  tool_versions: { node: "24.21.0" },
});
