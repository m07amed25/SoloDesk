import { envelope, readRecord, validateRecord } from "./records.mjs";
import { safePath } from "./artifacts.mjs";
export function selectChecks(
  context,
  policy,
  manifest,
  { basePolicy, baseManifest } = {},
) {
  validateRecord(policy);
  validateRecord(manifest);
  if (basePolicy) validateRecord(basePolicy);
  if (baseManifest) validateRecord(baseManifest);
  if (manifest.checks.length > 512) throw new Error("definition-limit");
  if (
    context.execution_mode !== "local" &&
    (!context.manifest_digests || !context.workflow_identity?.git_blob)
  )
    throw new Error("context-digests-required");
  const definitions = new Map(),
    findings = [];
  for (const c of manifest.checks) {
    if (
      !c.id ||
      definitions.has(c.id) ||
      !["baseline", "security", "desktop"].includes(c.group) ||
      c.executable !== "$NODE" ||
      !Array.isArray(c.argv) ||
      c.argv.some((a) => typeof a !== "string")
    )
      throw new Error("invalid-suite-definition");
    const builtin = [
      "typecheck",
      "lint",
      "build",
      "build-renderer",
      "build-preload",
      "lint-f004",
      "launcher",
      "governance-policy",
      "governance-tests",
      "documentation",
      "verification-unit",
      "verification-integration",
      "secrets",
      "dependencies",
      "licenses",
      "workflow-syntax",
      "ui-configuration",
    ];
    if (
      !builtin.includes(c.id) &&
      !c.id.startsWith("desktop:") &&
      (!/^F\d{3,}:[a-z][a-z0-9-]*$/.test(c.id) ||
        !c.phase_ids?.some((f) => c.id.startsWith(f + ":")) ||
        c.kind !== "tests" ||
        !c.entry_files?.length ||
        !Number.isSafeInteger(c.min_tests) ||
        c.min_tests < 1)
    )
      throw new Error("suite-enrollment-invalid");
    definitions.set(c.id, c);
  }
  if (baseManifest) {
    for (const base of baseManifest.checks) {
      const current = definitions.get(base.id);
      if (
        !current ||
        current.executable !== base.executable ||
        current.group !== base.group ||
        current.target !== base.target ||
        current.min_tests < base.min_tests ||
        base.argv.some((a, i) => current.argv[i] !== a) ||
        (current.argv.length > base.argv.length &&
          (base.kind !== "tests" ||
            current.argv
              .slice(base.argv.length)
              .some((a) => !/^tests\/[\w./-]+\.test\.mjs$/.test(a))))
      )
        findings.push({ code: "suite-downgrade", check_id: base.id });
    }
  }
  const floor = basePolicy?.mandatory_checks || policy.mandatory_checks;
  if (basePolicy && floor.some((id) => !policy.mandatory_checks.includes(id)))
    findings.push({ code: "policy-downgrade" });
  const mandatory = new Set([
    ...floor,
    ...policy.mandatory_checks,
    ...manifest.checks
      .filter((c) => c.group === "baseline" || c.group === "security")
      .map((c) => c.id),
  ]);
  const risk = context.changed_paths.some(
    (p) =>
      /^(app\/|tooling\/|tests\/|verification\/|schema\/|\.github\/workflows\/|\.specify\/memory\/|package(?:-lock)?\.json$|vite\.|forge\.|playwright\.|\.oxlint|\.gitignore)/.test(
        p,
      ) ||
      !(
        /\.md$/.test(p) &&
        /^(docs\/|specs\/|README|PRODUCT|DESIGN|AGENT|plan)/.test(p)
      ),
  );
  const checks = [...mandatory].map((id) => {
    const c = definitions.get(id);
    if (!c) findings.push({ code: "required-suite-missing", check_id: id });
    return {
      check_id: id,
      selected: true,
      group: c?.group || "unavailable",
      target_id: c?.target || null,
      expected_argv: c?.argv || [],
      min_tests: c?.kind === "tests" ? c.min_tests : null,
      reason: c ? "mandatory-baseline" : "required-suite-missing",
    };
  });
  const targets = new Map((basePolicy?.targets || []).map((t) => [t.id, t]));
  for (const t of policy.targets) {
    if (
      targets.has(t.id) &&
      JSON.stringify(targets.get(t.id)) !== JSON.stringify(t)
    )
      findings.push({ code: "target-policy-downgrade", target_id: t.id });
    targets.set(t.id, t);
  }
  if (
    basePolicy?.targets.some((t) => !policy.targets.some((c) => c.id === t.id))
  )
    findings.push({ code: "target-policy-downgrade" });
  for (const target of targets.values()) {
    const id = `desktop:${target.id}`,
      c = definitions.get(id);
    if (risk && !c)
      findings.push({ code: "required-suite-missing", check_id: id });
    checks.push({
      check_id: id,
      selected: risk,
      group: "desktop",
      target_id: target.id,
      expected_argv: c?.argv || [],
      min_tests: null,
      reason: risk
        ? "native-or-unclassified-impact"
        : "unchanged-runtime-documents",
    });
  }
  for (const category of [
    "bilingual",
    "finance",
    "authorization",
    "sync",
    "documents",
    "storage",
    "provider",
    "release",
  ])
    checks.push({
      check_id: `specialist:${category}`,
      selected: false,
      group: "specialist",
      target_id: null,
      reason: `F002 does not implement ${category} product behavior; later authorized feature must enroll and execute its own suite`,
    });
  return envelope("selection", `selection-${context.id}`, {
    context_ref: context.id,
    policy_ref: policy.id,
    authority: basePolicy ? "reviewed-base" : policy.authority,
    checks,
    review_required: risk,
    findings,
  });
}
export async function command(root, o, output) {
  if (!o.context) throw new Error("context-required");
  const context = readRecord(safePath(root, o.context));
  const policy = readRecord(safePath(root, "verification/policy.v1.json"));
  const manifest = readRecord(
    safePath(root, o.suites || "verification/suites.v1.json"),
  );
  const basePolicy = o.policy
    ? readRecord(safePath(root, o.policy))
    : undefined;
  const value = selectChecks(context, policy, manifest, { basePolicy });
  return {
    exit: value.findings.length ? 1 : 0,
    value: output(root, o.out, value),
  };
}
