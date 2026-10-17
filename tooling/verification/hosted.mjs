import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { envelope, readRecord, canonicalJSON } from "./records.mjs";
import {
  allocate,
  writeRecord,
  safePath,
  validateArtifact,
  redact,
  digest,
} from "./artifacts.mjs";
import { makeContext, git } from "./context.mjs";
import { selectChecks } from "./selection.mjs";
import { executeGroup } from "./run-suite.mjs";
import { aggregate } from "./aggregate.mjs";
import { inspectProvider } from "./inspect-provider.mjs";
const root = process.cwd(),
  mode = process.argv[2];
function event() {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file || fs.statSync(file).size > 2097152)
    throw new Error("provider-event-required");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function trustedDispatch() {
  if (
    !["context", "aggregate"].includes(mode) ||
    process.env.F002_TRUSTED_DISPATCH === "1"
  )
    return false;
  const e = event(),
    base = e.pull_request?.base.sha || e.before;
  if (!/^[a-f0-9]{40,64}$/.test(base || "")) throw new Error("base-required");
  const exists =
    git(root, "ls-tree", "--name-only", base, "verification/policy.v1.json") ===
    "verification/policy.v1.json";
  if (!exists) return false;
  git(root, "cat-file", "-e", `${base}:tooling/verification/hosted.mjs`);
  const relative = ".verification/trusted-base",
    dest = safePath(root, relative);
  fs.mkdirSync(dest, { recursive: true, mode: 0o700 });
  const archive = execFileSync(
    "git",
    [
      "archive",
      base,
      "tooling/verification",
      "schema/verification",
      "verification",
    ],
    { cwd: root, timeout: 10000, maxBuffer: 33554432 },
  );
  execFileSync("tar", ["-x", "-C", dest], { input: archive, timeout: 10000 });
  const r = spawnSync(
    process.execPath,
    [path.join(dest, "tooling/verification/hosted.mjs"), mode],
    {
      cwd: root,
      env: {
        ...process.env,
        F002_TRUSTED_DISPATCH: "1",
        F002_BASE_POLICY: `${relative}/verification/policy.v1.json`,
      },
      stdio: "inherit",
      timeout: 110000,
    },
  );
  process.exitCode = r.status ?? 2;
  return true;
}
function collect(relative) {
  const files = [];
  let visited = 0;
  function walk(dir, depth = 0) {
    if (depth > 32) throw new Error("import-depth-limit");
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (++visited > 2048) throw new Error("import-collection-limit");
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) throw new Error("unsafe-import");
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name.endsWith(".json")) files.push(p);
      if (files.length > 512) throw new Error("import-limit");
    }
  }
  walk(safePath(root, relative));
  return files;
}
async function main() {
  if (trustedDispatch()) return;
  if (mode === "context") {
    const e = event(),
      c = makeContext(root, {
        mode:
          process.env.GITHUB_EVENT_NAME === "pull_request"
            ? "hosted-pr"
            : "hosted-push",
        event: e,
      });
    const policy = readRecord(path.join(root, "verification/policy.v1.json")),
      manifest = readRecord(path.join(root, "verification/suites.v1.json"));
    const base = process.env.F002_BASE_POLICY
      ? readRecord(safePath(root, process.env.F002_BASE_POLICY))
      : undefined;
    c.policy_authority = base ? "reviewed-base" : "bootstrap-candidate";
    const baseManifest = base
      ? readRecord(
          safePath(
            root,
            ".verification/trusted-base/verification/suites.v1.json",
          ),
        )
      : undefined;
    const selection = selectChecks(c, policy, manifest, {
      basePolicy: base,
      baseManifest,
    });
    allocate(root, "shared");
    writeRecord(root, ".verification/shared/context.json", c);
    writeRecord(root, ".verification/shared/selection.json", selection);
    const desktop = selection.checks.some(
      (c) => c.selected && c.group === "desktop",
    );
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `desktop=${desktop}\n`);
    console.log(
      JSON.stringify({
        context_ref: c.id,
        authority: c.policy_authority,
        desktop,
        findings: selection.findings,
      }),
    );
    process.exitCode = selection.findings.length ? 1 : 0;
    return;
  }
  if (["baseline", "security", "desktop"].includes(mode)) {
    const c = readRecord(safePath(root, ".verification/shared/context.json"));
    for (const [file, sha] of Object.entries(
      c.manifest_digests?.values || {},
    )) {
      if (
        digest(
          "F002-json-v1\0" + canonicalJSON(readRecord(safePath(root, file))),
        ) !== sha
      )
        throw new Error("producer-manifest-mismatch");
    }
    const r = await executeGroup(root, mode, c, {
      target: mode === "desktop" ? process.env.F002_TARGET : undefined,
    });
    allocate(root, "publish");
    let size = 0;
    for (const report of r.reports) {
      for (const a of report.artifacts) {
        validateArtifact(root, a.path, a);
        const dest = `.verification/publish/${report.check_id.replace(/:/g, "-")}-${path.basename(a.path)}`;
        fs.copyFileSync(safePath(root, a.path), safePath(root, dest));
        a.path = dest;
        size += a.bytes;
      }
      const value = JSON.stringify(report);
      if (redact(value) !== value) throw new Error("producer-redaction-failed");
      size += Buffer.byteLength(value);
      if (size > (mode === "desktop" ? 20971520 : 10485760))
        throw new Error("producer-artifact-limit");
      writeRecord(
        root,
        `.verification/publish/${report.check_id.replace(/:/g, "-")}.json`,
        report,
      );
    }
    console.log(
      JSON.stringify(
        r.reports.map((r) => ({
          check_id: r.check_id,
          status: r.status,
          counts: r.counts,
        })),
      ),
    );
    process.exitCode = r.reports.every((r) => r.status === "passed") ? 0 : 1;
    return;
  }
  if (mode === "aggregate") {
    const files = collect(".verification/imported"),
      contexts = files.filter((p) => path.basename(p) === "context.json"),
      selections = files.filter((p) => path.basename(p) === "selection.json");
    if (contexts.length !== 1 || selections.length !== 1)
      throw new Error("context-artifact-missing-or-duplicate");
    const context = readRecord(contexts[0]),
      selection = readRecord(selections[0]),
      reports = [];
    let bytes = 0;
    for (const file of files) {
      bytes += fs.statSync(file).size;
      if (bytes > 33554432) throw new Error("import-byte-limit");
      const v = readRecord(file, { validate: false });
      if (v.schema === "solodesk.verification.report") reports.push(v);
    }
    const provider = await inspectProvider(context, {
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      prNumber: context.proposal.number,
    });
    let artifactsTotal = 0;
    for (const r of reports)
      for (const a of r.artifacts || []) {
        const matches = [];
        const search = (dir) => {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isSymbolicLink()) throw new Error("artifact-symlink");
            if (e.isDirectory()) search(p);
            else if (e.name === path.basename(a.path)) matches.push(p);
          }
        };
        search(safePath(root, ".verification/imported"));
        if (matches.length !== 1)
          throw new Error("artifact-missing-or-duplicate");
        const relative = path
          .relative(root, matches[0])
          .split(path.sep)
          .join("/");
        validateArtifact(root, relative, a);
        artifactsTotal += a.bytes;
      }
    if (artifactsTotal > 104857600) throw new Error("run-artifact-limit");
    const value = aggregate(context, selection, reports, { provider });
    const needs = JSON.parse(process.env.F002_NEEDS || "{}");
    for (const group of ["context", "baseline", "security"])
      if (needs[group]?.result !== "success")
        value.findings.push({ code: "producer-unsuccessful", check_id: group });
    if (
      selection.checks.some((c) => c.selected && c.group === "desktop") &&
      needs.desktop?.result !== "success"
    )
      value.findings.push({
        code: "producer-unsuccessful",
        check_id: "desktop",
      });
    value.automated_ready = value.findings.length === 0;
    allocate(root, "gate");
    const runRecord = envelope("run", value.run_ref, {
      context_ref: context.id,
      provider_run_id: Number(process.env.GITHUB_RUN_ID),
      attempt_number: Number(process.env.GITHUB_RUN_ATTEMPT),
      started_at:
        reports.map((r) => r.started_at).sort()[0] ||
        context.provider.started_at,
      finished_at: new Date().toISOString(),
      state: value.automated_ready ? "completed" : "failed",
      selection_digest: digest("F002-json-v1\0" + canonicalJSON(selection)),
      limits: readRecord(safePath(root, "verification/policy.v1.json")).limits,
      scratch: ".verification/gate",
      reports: reports.map((r) => ({
        id: r.id,
        check_id: r.check_id,
        status: r.status,
      })),
      cleanup: {
        status: reports.every((r) => r.cleanup?.status === "completed")
          ? "completed"
          : "failed",
      },
    });
    writeRecord(root, ".verification/gate/run.json", runRecord);
    writeRecord(root, ".verification/gate/summary.json", value);
    console.log(JSON.stringify(value, null, 2));
    process.exitCode = value.automated_ready ? 0 : 1;
    return;
  }
  throw new Error("invalid-hosted-command");
}
try {
  await main();
} catch (error) {
  console.error(
    JSON.stringify(
      envelope("summary", "hosted-incomplete", {
        automated_ready: false,
        findings: [
          {
            code: /^[a-z-]+$/.test(error.message)
              ? error.message
              : "hosted-failed",
          },
        ],
      }),
    ),
  );
  process.exitCode = 2;
}
