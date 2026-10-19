import { redact } from "./artifacts.mjs";

function collectTests(suites, output = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.at(-1);
        output.push({
          file: spec.file || suite.file || "desktop test",
          line: spec.line,
          title: spec.title,
          status: test.status,
          duration: result?.duration,
          errors: result?.errors || (result?.error ? [result.error] : []),
        });
      }
    }
    collectTests(suite.suites, output);
  }
  return output;
}

function shortError(error) {
  const message = redact(error?.message || error?.stack || error?.value || "Unknown failure");
  return message.split("\n").slice(0, 8).join("\n").slice(0, 1600);
}

function groupFor(file) {
  const feature = /^(f\d{3})-/i.exec(file);
  return feature ? feature[1].toUpperCase() : "Shell";
}

export function desktopColorEnabled(env, isTTY) {
  const forced = Boolean(env.FORCE_COLOR && env.FORCE_COLOR !== "0");
  if (forced) return true;
  if (Object.hasOwn(env, "NO_COLOR") || env.FORCE_COLOR === "0")
    return false;
  return Boolean(isTTY) && env.TERM !== "dumb";
}

export function formatDesktopHuman(
  result,
  report,
  reportPath,
  { color = false, debug = false } = {},
) {
  const paint = (value, code) =>
    color ? `\u001b[${code}m${value}\u001b[0m` : value;
  const counts = result.counts;
  const duration = report?.stats?.duration;
  const lines = [
    paint("SoloDesk desktop tests", "1;36"),
    paint(`${result.target} · Electron ${result.electron}`, "2"),
  ];
  const groups = new Map();
  for (const item of collectTests(report?.suites)) {
    const group = groupFor(item.file);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  for (const [group, tests] of groups) {
    lines.push(
      "",
      paint(`${group}  ${tests.length} test${tests.length === 1 ? "" : "s"}`, "1;34"),
    );
    for (const item of tests) {
      const label =
        item.status === "expected"
          ? "PASS"
          : item.status === "skipped"
            ? "SKIP"
            : "FAIL";
      const tone =
        label === "PASS" ? "1;32" : label === "SKIP" ? "1;33" : "1;31";
      const time = Number.isFinite(item.duration)
        ? ` · ${(item.duration / 1000).toFixed(1)}s`
        : "";
      lines.push(`  ${paint(label, tone)}  ${item.title}${paint(time, "2")}`);
      if (label === "FAIL") {
        const location = item.line ? `${item.file}:${item.line}` : item.file;
        lines.push(`        ${paint(location, "2")}`);
        for (const error of item.errors)
          lines.push(`        ${shortError(error).replaceAll("\n", "\n        ")}`);
      }
    }
  }
  if (report?.errors?.length) {
    for (const error of report.errors)
      lines.push(`${paint("ERROR", "1;31")}  ${shortError(error).replaceAll("\n", "\n       ")}`);
  }
  const elapsed = Number.isFinite(duration)
    ? ` · ${(duration / 1000).toFixed(1)}s`
    : "";
  lines.push(
    "",
    `${paint(result.status.toUpperCase(), result.status === "passed" ? "1;32" : "1;31")}  ${counts?.passed ?? 0} passed · ${counts?.failed ?? 0} failed · ${counts?.skipped ?? 0} skipped${elapsed}`,
  );
  if (result.code || result.reason)
    lines.push(`${paint("Reason", "1;31")}  ${result.code || result.reason}`);
  if (!report && !debug) {
    const details = (result.stderr || result.stdout || "")
      .trim()
      .split("\n")
      .slice(-12)
      .join("\n")
      .slice(-1600);
    if (details) lines.push(`Process output:\n${details}`);
  }
  lines.push(`${paint("Report", "1;36")}  ${reportPath}`);
  if (debug && result.stderr?.trim())
    lines.push("", "Browser debug log:", result.stderr.trim());
  else if (result.status !== "passed")
    lines.push("Browser logs: SOLODESK_DESKTOP_DEBUG=1 npm run test:desktop");
  return lines.join("\n");
}
