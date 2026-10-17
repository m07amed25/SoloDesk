import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { envelope, readRecord, validateRecord } from "./records.mjs";
import {
  redact,
  safePath,
  allocate,
  writeRecord,
  artifact,
} from "./artifacts.mjs";
import { makeContext } from "./context.mjs";
export function childEnvironment(extra = {}) {
  const keys = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "HOMEDRIVE",
    "HOMEPATH",
    "SystemRoot",
    "COMSPEC",
    "PATHEXT",
    "TMP",
    "TEMP",
    "TMPDIR",
    "DISPLAY",
    "WAYLAND_DISPLAY",
    "XAUTHORITY",
    "XDG_RUNTIME_DIR",
    "DBUS_SESSION_BUS_ADDRESS",
    "LANG",
    "LC_ALL",
  ];
  const env = {};
  for (const key of keys) if (process.env[key]) env[key] = process.env[key];
  return { ...env, ...extra };
}
export function runProcess(
  exe,
  args,
  { cwd, timeout = 300000, maxBytes = 2097152, env = childEnvironment() } = {},
) {
  return new Promise((resolve) => {
    let child,
      stdout = "",
      stderr = "",
      bytes = 0,
      reason = "",
      closed = false,
      finishing = false,
      hard,
      cleanupDeadline;
    const started = Date.now();
    const timers = [];
    const kill = (signal) => {
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else if (signal === "SIGKILL")
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            shell: false,
          });
        else child.kill(signal);
      } catch {
        /* Already closed. */
      }
    };
    const alive = () => {
      if (!child?.pid || process.platform === "win32") return false;
      try {
        process.kill(-child.pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    const stop = (why) => {
      if (reason) return;
      reason = why;
      kill("SIGTERM");
      hard = setTimeout(() => kill("SIGKILL"), 10000);
      cleanupDeadline = setTimeout(() => finish(2, "cleanup-failed"), 20000);
    };
    const signal = () => stop("canceled");
    function finish(code, forced) {
      if (closed) return;
      closed = true;
      for (const t of timers) clearTimeout(t);
      clearTimeout(hard);
      clearTimeout(cleanupDeadline);
      process.off("SIGTERM", signal);
      process.off("SIGINT", signal);
      resolve({
        code: code ?? 2,
        reason: forced || reason,
        stdout: redact(stdout),
        stderr: redact(stderr),
        elapsed_ms: Date.now() - started,
      });
    }
    try {
      child = spawn(exe, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        detached: process.platform !== "win32",
      });
    } catch {
      finish(2, "unavailable");
      return;
    }
    timers.push(setTimeout(() => stop("timed-out"), timeout));
    process.once("SIGTERM", signal);
    process.once("SIGINT", signal);
    const capture = (stream) => (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        stop("output-limit");
        return;
      }
      if (stream === "out") stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.on("data", capture("out"));
    child.stderr.on("data", capture("err"));
    child.on("error", () => finish(2, "unavailable"));
    child.on("close", (code) => {
      if (closed || finishing) return;
      finishing = true;
      if (!alive()) {
        finish(code);
        return;
      }
      stop(reason || "leftover-owned-process");
      const until = Date.now() + 20000;
      const poll = () => {
        if (closed) return;
        if (!alive()) {
          finish(code);
          return;
        }
        if (Date.now() >= until) {
          finish(2, "cleanup-failed");
          return;
        }
        timers.push(setTimeout(poll, 50));
      };
      poll();
    });
  });
}
export function testCounts(text, min = 1) {
  const get = (key) => {
    const matches = [
      ...text.matchAll(new RegExp(`(?:#|ℹ) ${key} (\\d+)`, "g")),
    ];
    return matches.length ? Number(matches.at(-1)[1]) : null;
  };
  const executed = get("tests"),
    passed = get("pass"),
    failed = get("fail"),
    skipped = get("skipped") ?? 0,
    todo = get("todo") ?? 0,
    canceled = get("cancelled") ?? 0;
  if (
    executed === null ||
    passed === null ||
    failed === null ||
    executed < min ||
    passed !== executed ||
    failed ||
    skipped ||
    todo ||
    canceled
  )
    throw new Error("suite-empty-or-incomplete");
  return { kind: "tests", executed, passed, failed, skipped, todo };
}
export async function runCheck(root, check, context, run, remaining = 300000) {
  const started = new Date().toISOString();
  const args = check.argv.map((x) => (x === "$NODE" ? process.execPath : x));
  const exe =
    check.executable === "$NODE" ? process.execPath : check.executable;
  const result = await runProcess(exe, args, {
    cwd: root,
    timeout: Math.min(check.timeout_ms || 300000, remaining),
  });
  let status =
      result.reason === "unavailable"
        ? "unavailable"
        : result.code === 0 && !result.reason
          ? "passed"
          : "failed",
    counts = { kind: "commands", executed: 1 },
    reason = result.reason;
  if (status === "passed" && check.kind === "tests") {
    try {
      counts = testCounts(result.stdout, check.min_tests || 1);
    } catch {
      status = "failed";
      reason = "suite-empty-or-incomplete";
    }
  }
  const artifacts = [],
    tool_versions = { node: process.versions.node };
  let scannerFindings = [];
  if (check.group === "desktop" || check.group === "security") {
    try {
      const data = JSON.parse(result.stdout);
      if (data.status === "unavailable") {
        status = "unavailable";
        reason = data.code || "scanner-unavailable";
      }
      if (check.group === "desktop") {
        if (data.counts) counts = { kind: "tests", ...data.counts, todo: 0 };
        tool_versions.electron = data.electron || "unavailable";
        if (status === "passed") {
          if (
            !counts.executed ||
            counts.passed !== counts.executed ||
            counts.failed ||
            counts.skipped ||
            !data.screenshots?.length
          )
            throw new Error("native-incomplete");
          for (const file of data.screenshots)
            artifacts.push(artifact(root, file, context.id, run, check.id));
        }
      } else {
        if (data.inputs) counts = { kind: "inputs", executed: data.inputs };
        scannerFindings = data.findings || [];
        tool_versions[check.id] = data.version || "unavailable";
        if (
          status === "passed" &&
          (!data.inputs || data.status !== "passed" || scannerFindings.length)
        )
          throw new Error("scanner-incomplete");
      }
    } catch {
      if (status === "passed") {
        status = "failed";
        reason = "required-evidence-incomplete";
      }
    }
  }
  return validateRecord(
    envelope("report", `${run}:${check.id}`, {
      context_ref: context.id,
      run_ref: run,
      check_id: check.id,
      target_id: check.target || null,
      command_id: check.id,
      argv: [exe, ...args].map(redact),
      producer: {
        mode: context.execution_mode,
        job: process.env.GITHUB_JOB || "local",
      },
      started_at: started,
      finished_at: new Date().toISOString(),
      status,
      reason_code: reason || null,
      expected:
        check.kind === "tests"
          ? "Nonzero complete independent assertions"
          : "Declared command succeeds",
      observed: {
        exit: result.code,
        reason,
        elapsed_ms: result.elapsed_ms,
        stdout: result.stdout,
        stderr: result.stderr,
      },
      counts,
      artifacts,
      findings:
        status === "passed"
          ? []
          : [...scannerFindings, { code: reason || "check-failed" }],
      cleanup: { status: reason === "cleanup-failed" ? "failed" : "completed" },
      tool_versions,
    }),
  );
}
export async function executeGroup(
  root,
  group,
  context,
  { target, runRef, deadline = Date.now() + 2700000 } = {},
) {
  const manifest = readRecord(path.join(root, "verification/suites.v1.json"));
  const id =
    runRef ||
    (context.provider
      ? `run-${context.provider.run_id}-${context.provider.attempt}`
      : `run-${crypto.randomUUID()}`);
  const scratch = allocate(
    root,
    `${id}-${group}-${target || "local"}-${crypto.randomUUID()}`,
  );
  writeRecord(root, `${scratch}/context.json`, context);
  const checks = manifest.checks.filter(
    (c) => c.group === group && (!target || c.target === target),
  );
  if (!checks.length) throw new Error("group-unavailable");
  const reports = [];
  deadline = Math.min(
    deadline,
    Date.now() +
      ({ baseline: 900000, security: 600000, desktop: 1200000 }[group] ||
        300000),
  );
  for (const check of checks) {
    if (Date.now() + 20000 >= deadline) throw new Error("coordinator-timeout");
    const report = await runCheck(
      root,
      check,
      context,
      id,
      deadline - Date.now() - 20000,
    );
    writeRecord(root, `${scratch}/${check.id.replace(/:/g, "-")}.json`, report);
    reports.push(report);
  }
  return { reports, runRef: id, scratch };
}
export async function command(root, o, output) {
  const manifest = readRecord(path.join(root, "verification/suites.v1.json"));
  const context = o.context
    ? readRecord(safePath(root, o.context))
    : makeContext(root, { base: o.base, mode: "local" });
  const policy = readRecord(path.join(root, "verification/policy.v1.json"));
  const { selectChecks } = await import("./selection.mjs");
  const selection = selectChecks(context, policy, manifest);
  const group = o.group || (o.profile === "desktop" ? "desktop" : "baseline");
  if (
    !["baseline", "security", "desktop"].includes(group) ||
    (o.profile && !["baseline", "desktop", "all"].includes(o.profile))
  )
    throw new Error("invalid-group");
  if (o.profile === "all") {
    const reports = [],
      runRef = `run-${crypto.randomUUID()}`,
      deadline = Date.now() + 2700000;
    for (const next of ["baseline", "security", "desktop"]) {
      const defs = manifest.checks.filter(
        (c) =>
          c.group === next &&
          selection.checks.some((s) => s.selected && s.check_id === c.id),
      );
      if (!defs.length) continue;
      const target =
        next === "desktop"
          ? `${process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"}-${process.arch}`
          : undefined;
      const result = await executeGroup(root, next, context, {
        runRef,
        target,
        deadline,
      });
      reports.push(...result.reports);
    }
    const { aggregate } = await import("./aggregate.mjs");
    const value = aggregate(context, selection, reports, { root, runRef });
    return {
      exit: value.automated_ready ? 0 : 1,
      value: output(root, o.out, value),
    };
  }
  const result = await executeGroup(root, group, context, { target: o.target });
  const failed = result.reports.some((r) => r.status !== "passed");
  const value = {
    scope_complete: group,
    full_verification: "incomplete",
    automated_ready: false,
    context_ref: context.id,
    run_ref: result.runRef,
    scratch: result.scratch,
    reports: result.reports.map((r) => ({
      check_id: r.check_id,
      status: r.status,
      reason: r.reason_code,
      counts: r.counts,
    })),
    selected_required: selection.checks
      .filter((c) => c.selected)
      .map((c) => c.check_id),
  };
  return { exit: failed ? 1 : 0, value: output(root, o.out, value) };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const suite = process.argv[2];
  const manifest = readRecord(
    path.join(process.cwd(), "verification/suites.v1.json"),
  );
  const c = manifest.checks.find((x) => x.id === suite);
  if (!c) throw new Error("unknown-suite");
  const r = await runProcess(
    c.executable === "$NODE" ? process.execPath : c.executable,
    c.argv,
    { cwd: process.cwd(), timeout: c.timeout_ms },
  );
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (c.kind === "tests" && r.code === 0) {
    try {
      testCounts(r.stdout, c.min_tests);
    } catch {
      r.code = 1;
    }
  }
  process.exitCode = r.reason ? 2 : r.code;
}
