import fs from "node:fs";
import path from "node:path";
import { envelope, validateRecord, readRecord } from "./records.mjs";
import { safePath, digest } from "./artifacts.mjs";
import { inspectProvider } from "./inspect-provider.mjs";
export function aggregate(
  context,
  selection,
  reports,
  { provider, root, runRef } = {},
) {
  const findings = [...(selection.findings || [])],
    add = (code, check) => findings.push({ code, check_id: check });
  const expected = selection.checks.filter((c) => c.selected),
    seen = new Set(),
    recordIds = new Set();
  const run = runRef || reports[0]?.run_ref || "unobserved";
  if (selection.context_ref !== context.id) add("selection-context-stale");
  for (const report of reports) {
    const key = report.check_id;
    if (seen.has(key)) add("duplicate-result", key);
    seen.add(key);
    if (recordIds.has(report.id)) add("duplicate-record-id", key);
    recordIds.add(report.id);
    if (report.command_id !== key) add("command-binding", key);
    try {
      validateRecord(report);
    } catch {
      add("report-invalid", key);
    }
  }
  if (context.execution_mode !== "local" && !provider?.authenticated)
    add("provider-unavailable");
  for (const c of expected) {
    const r = reports.find((r) => r.check_id === c.check_id);
    if (!r) {
      add("required-missing", c.check_id);
      continue;
    }
    if (
      c.expected_argv &&
      JSON.stringify(r.argv?.slice(1)) !== JSON.stringify(c.expected_argv)
    )
      add("command-binding", c.check_id);
    if (
      c.min_tests &&
      (r.counts?.kind !== "tests" || r.counts.executed < c.min_tests)
    )
      add("suite-incomplete", c.check_id);
    if (r.target_id !== (c.target_id || null))
      add("target-binding", c.check_id);
    if (r.context_ref !== context.id || r.run_ref !== run)
      add("context-stale", c.check_id);
    if (
      r.status !== "passed" ||
      r.cleanup?.status !== "completed" ||
      r.findings?.length
    )
      add("required-unsuccessful", c.check_id);
    if (context.execution_mode !== "local") {
      const name =
        c.group === "desktop"
          ? `F002 / desktop (${c.target_id})`
          : `F002 / ${c.group}`;
      if (
        !provider?.jobs.some(
          (j) => j.name === name && j.conclusion === "success",
        )
      )
        add("producer-unsuccessful", c.check_id);
      if (
        provider?.current_head !== context.proposal_head_sha ||
        provider?.current_base !== context.base_sha ||
        provider?.tested_sha !== context.tested_sha
      )
        add("provider-context-stale", c.check_id);
    }
    for (const a of r.artifacts || []) {
      if (
        a.context_ref !== context.id ||
        a.run_ref !== run ||
        Date.parse(a.expires_at) <= Date.now()
      )
        add("artifact-stale", c.check_id);
      if (root) {
        try {
          const file = safePath(root, a.path),
            bytes = fs.readFileSync(file);
          if (bytes.length !== a.bytes || digest(bytes) !== a.sha256)
            throw new Error("mismatch");
        } catch {
          add("artifact-missing-or-unsafe", c.check_id);
        }
      }
    }
  }
  if (context.execution_mode !== "local") {
    const runId = context.provider?.run_id,
      attempt = context.provider?.attempt;
    const names = new Set([`F002-context-${runId}-${attempt}`]);
    for (const c of expected)
      names.add(
        `F002-reports-${runId}-${attempt}-${c.group}${c.group === "desktop" ? "-" + c.target_id : ""}`,
      );
    let total = 0;
    for (const name of names) {
      const matches = provider?.artifacts?.filter((a) => a.name === name) || [];
      if (
        matches.length !== 1 ||
        matches[0].expired ||
        !Number.isFinite(Date.parse(matches[0].expires_at)) ||
        Date.parse(matches[0].expires_at) <= Date.now()
      )
        add("provider-artifact-unavailable", name);
      else {
        total += matches[0].size_bytes;
        const cap = name.includes("-desktop-") ? 20971520 : 10485760;
        if (matches[0].size_bytes > cap) add("provider-artifact-limit", name);
      }
    }
    if (total > 104857600) add("run-artifact-limit");
  }
  for (const r of reports)
    if (
      !expected.some((c) => c.check_id === r.check_id) &&
      !selection.checks.some(
        (c) =>
          c.check_id === r.check_id &&
          !c.selected &&
          r.status === "not applicable",
      )
    )
      add("unexpected-result", r.check_id);
  return envelope("summary", `summary-${run}`, {
    context_ref: context.id,
    run_ref: run,
    policy_ref: selection.policy_ref,
    checks: selection.checks,
    reports: reports.map((r) => ({
      id: r.id,
      check_id: r.check_id,
      status: r.status,
    })),
    provider_conclusions: provider?.jobs || [],
    artifacts: reports.flatMap((r) => r.artifacts || []),
    findings,
    automated_ready: findings.length === 0,
    human_stages: {
      agent_qa: "pending",
      owner: "pending",
      merge: "not performed",
      release: "not performed",
    },
  });
}
function readReports(root, relative) {
  const dir = safePath(root, relative);
  const out = [];
  let total = 0;
  function walk(p) {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const file = path.join(p, entry.name);
      if (entry.isSymbolicLink()) throw new Error("artifact-symlink");
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".json") && entry.name !== ".owner.json") {
        total += fs.statSync(file).size;
        if (total > 33554432 || out.length >= 2048)
          throw new Error("report-input-limit");
        const value = readRecord(file, { validate: false });
        if (value.schema === "solodesk.verification.report")
          out.push(validateRecord(value));
      }
    }
  }
  walk(dir);
  return out;
}
export async function command(root, o, output) {
  if (!o.context || !o.selection || !o.reports)
    throw new Error("aggregate-input-required");
  const context = readRecord(safePath(root, o.context)),
    selection = readRecord(safePath(root, o.selection)),
    reports = readReports(root, o.reports);
  let provider;
  if (context.execution_mode !== "local")
    provider = await inspectProvider(context, {
      runId: context.provider.run_id,
      attempt: context.provider.attempt,
      prNumber: context.proposal.number,
    });
  const value = aggregate(context, selection, reports, { provider, root });
  return {
    exit: value.automated_ready ? 0 : 1,
    value: output(root, o.out, value),
  };
}
