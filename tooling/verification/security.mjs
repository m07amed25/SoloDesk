import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import parseSPDX from "spdx-expression-parse";
import { verifyStyleSources } from "../ui-info.mjs";
import { runProcess, childEnvironment } from "./run-suite.mjs";
import { safePath, digest, allocate } from "./artifacts.mjs";
export function auditFindings(data) {
  if (
    data.error ||
    !data.vulnerabilities ||
    typeof data.vulnerabilities !== "object"
  )
    throw new Error("audit-unavailable");
  return Object.entries(data.vulnerabilities).map(([name, v]) => ({
    code: "dependency",
    package: name,
    version: v.range || "unknown",
    severity: v.severity,
    action: "Responsible review/remediation required",
    advisories: (v.via || [])
      .filter((x) => typeof x === "object")
      .map((x) => ({ source: x.source, severity: x.severity })),
  }));
}
export function licenseFindings(packages) {
  const findings = [];
  for (const p of packages) {
    try {
      if (
        typeof p.license !== "string" ||
        /^(UNLICENSED|UNKNOWN|SEE LICENSE)/i.test(p.license)
      )
        throw new Error();
      parseSPDX(p.license);
      if (p.licenses?.some((x) => (x.type || x) !== p.license))
        throw new Error();
    } catch {
      findings.push({
        code: "license-unknown-or-conflicting",
        package: p.name,
        version: p.version,
        severity: "blocking",
        action: "Inspect upstream metadata and obtain responsible disposition",
      });
    }
  }
  return findings;
}
export function applyDispositions(findings, dispositions, scope) {
  for (const d of dispositions)
    if (
      !d.owner ||
      !d.reason ||
      !d.evidence ||
      d.scope !== scope ||
      !Number.isFinite(Date.parse(d.expires_at)) ||
      Date.parse(d.expires_at) <= Date.now() ||
      ["secret", "privilege", "data-loss"].includes(d.code)
    )
      throw new Error("disposition-invalid");
  return findings.filter(
    (f) =>
      !dispositions.some(
        (d) =>
          d.code === f.code &&
          d.package === f.package &&
          d.version === f.version &&
          d.severity === f.severity,
      ),
  );
}
export function workflowFindings(text) {
  const findings = [];
  for (const [code, re] of Object.entries({
    "privileged-trigger": /pull_request_target|workflow_run:/,
    "write-permission":
      /write-all|(?:contents|actions|id-token|packages|deployments|pull-requests):\s*write/,
    "persisted-credentials": /persist-credentials:\s*true/,
    "masked-failure": /continue-on-error:\s*true/,
    "unsafe-cache": /actions\/cache|cache:\s*(npm|yarn|pnpm)/,
    "untrusted-execution": /\beval\b|curl[^\n]*\|\s*(sh|bash)/,
  }))
    if (re.test(text)) findings.push({ code, severity: "blocking" });
  for (const match of text.matchAll(/uses:\s*([^\s#]+)/g))
    if (!/^[\w./-]+@[a-f0-9]{40}$/.test(match[1]))
      findings.push({ code: "unpinned-action", severity: "blocking" });
  return findings;
}

export function scanF010SecretEvidence(root) {
  const findings = [];
  const targetDirs = ["app/renderer", "app/preload"];
  const prohibitedPatterns = [
    { pattern: /FIXTURE_SECRET_/g, rule: "f010-fixture-secret-leak" },
    { pattern: /\bservice_role\b/g, rule: "f010-service-role-leak" },
    { pattern: /\bcode_verifier\b/g, rule: "f010-pkce-verifier-leak" },
    { pattern: /\b(access_token|refresh_token)\b/g, rule: "f010-token-leak" },
    {
      pattern: /[?&]code=[A-Za-z0-9_-]+(&|$)/g,
      rule: "f010-raw-callback-leak",
    },
  ];

  for (const dir of targetDirs) {
    const fullDir = path.join(root, dir);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith(".d.ts")) continue;
      const parentDir = entry.parentPath || entry.path || fullDir;
      const filePath = path.join(parentDir, entry.name);
      const relativePath = path.relative(root, filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, rule } of prohibitedPatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            findings.push({
              code: "secret",
              rule,
              location: relativePath,
              line: i + 1,
              severity: "blocking",
              action:
                "Remove credential, token, code_verifier, or secret marker from renderer/preload surface",
            });
          }
        }
      }
    }
  }
  return findings;
}

export function scanF011SecretEvidence(root) {
  const findings = [];
  const targetDirs = ["app/renderer", "app/preload", "packages/localization"];
  const prohibitedPatterns = [
    { pattern: /CANARY_TOTP_SECRET/g, rule: "f011-totp-secret-leak" },
    { pattern: /CANARY_QR/g, rule: "f011-qr-code-leak" },
    { pattern: /CANARY[-_]CODE/g, rule: "f011-recovery-code-leak" },
    { pattern: /CANARY_SUPER_SECRET_PASSWORD/g, rule: "f011-password-leak" },
    { pattern: /CANARY_PAYLOAD/g, rule: "f011-jwt-token-leak" },
    { pattern: /CANARY_RAW_CLAIMS/g, rule: "f011-claims-leak" },
    { pattern: /\btotp_secret\b/g, rule: "f011-totp-field-leak" },
    {
      pattern: /\b(rawTotpSecret|rawRecoveryCodes)\b/g,
      rule: "f011-canary-identifier-leak",
    },
  ];

  for (const dir of targetDirs) {
    const fullDir = path.join(root, dir);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith(".d.ts")) continue;
      const parentDir = entry.parentPath || entry.path || fullDir;
      const filePath = path.join(parentDir, entry.name);
      const relativePath = path.relative(root, filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, rule } of prohibitedPatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            findings.push({
              code: "secret",
              rule,
              location: relativePath,
              line: i + 1,
              severity: "blocking",
              action:
                "Remove TOTP secret, recovery code, password, or sensitive canary from renderer/preload/localization surface",
            });
          }
        }
      }
    }
  }
  return findings;
}

export function scanF012SecretEvidence(root) {
  const findings = [];
  const targetDirs = ["app/renderer", "app/preload", "packages/localization"];
  const prohibitedPatterns = [
    { pattern: /CANARY_DATABASE_KEY/g, rule: "f012-db-key-leak" },
    { pattern: /CANARY_AUTH_TOKEN/g, rule: "f012-auth-token-leak" },
    { pattern: /CANARY_RAW_ERROR/g, rule: "f012-raw-error-leak" },
    { pattern: /CANARY_HIDDEN_TENANT/g, rule: "f012-hidden-tenant-leak" },
    { pattern: /\bsolodesk_sqlite_key_\b/g, rule: "f012-key-marker-leak" },
    { pattern: /\bsolodesk_secret_token_\b/g, rule: "f012-secret-marker-leak" },
    { pattern: /\bINTERNAL_DB_ERROR_\b/g, rule: "f012-db-error-leak" },
  ];

  for (const dir of targetDirs) {
    const fullDir = path.join(root, dir);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith(".d.ts")) continue;
      const parentDir = entry.parentPath || entry.path || fullDir;
      const filePath = path.join(parentDir, entry.name);
      const relativePath = path.relative(root, filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, rule } of prohibitedPatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            findings.push({
              code: "secret",
              rule,
              location: relativePath,
              line: i + 1,
              severity: "blocking",
              action:
                "Remove SQLite key, token, raw error, or canary from renderer/preload/localization surface",
            });
          }
        }
      }
    }
  }
  return findings;
}

async function boundedDownload(url, file, max = 33554432) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error("scanner-download-unavailable");
  const reader = response.body.getReader(),
    chunks = [];
  let count = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    count += part.value.byteLength;
    if (count > max) {
      await reader.cancel();
      throw new Error("scanner-download-limit");
    }
    chunks.push(part.value);
  }
  fs.writeFileSync(file, Buffer.concat(chunks), { mode: 0o600 });
}
export async function scanner(root, name) {
  if (process.platform !== "linux" || process.arch !== "x64")
    throw new Error("scanner-platform-unavailable");
  const manifest = JSON.parse(
    fs.readFileSync(safePath(root, "verification/toolchain.v1.json"), "utf8"),
  );
  const tool = manifest.cli_binaries.find(
    (t) => t.name === name && t.platform === "linux-x64",
  );
  if (!tool || !/^https:\/\/github\.com\//.test(tool.url))
    throw new Error("scanner-pin-missing");
  const dir = safePath(root, `.verification/tools/${name}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const archive = path.join(dir, path.basename(new URL(tool.url).pathname));
  if (!fs.existsSync(archive)) await boundedDownload(tool.url, archive);
  if (
    fs.statSync(archive).size > 33554432 ||
    digest(fs.readFileSync(archive)) !== tool.sha256
  )
    throw new Error("scanner-checksum");
  // Extract the one reviewed archive member on every run; no cross-run binary trust.
  execFileSync("tar", ["-xzf", archive, "-C", dir, name], {
    timeout: 10000,
    maxBuffer: 2097152,
  });
  const exe = safePath(root, `.verification/tools/${name}/${name}`);
  fs.chmodSync(exe, 0o700);
  const version = await runProcess(exe, ["--version"], {
    cwd: root,
    timeout: 5000,
  });
  if (
    version.code ||
    !`${version.stdout}${version.stderr}`.includes(tool.version)
  )
    throw new Error("scanner-version");
  return { exe, tool };
}
export async function securityCheck(root, kind) {
  let findings = [],
    inputs = 0,
    source,
    version;
  if (kind === "dependencies") {
    const npmCli =
      process.env.npm_execpath ||
      path.join(
        path.dirname(process.execPath),
        "../lib/node_modules/npm/bin/npm-cli.js",
      );
    const result = await runProcess(
      process.execPath,
      [npmCli, "audit", "--json", "--include=dev", "--include=optional"],
      {
        cwd: root,
        timeout: 240000,
        env: childEnvironment({ HOME: process.env.HOME || "" }),
      },
    );
    if (result.reason || result.code > 1) throw new Error("audit-unavailable");
    const data = JSON.parse(result.stdout);
    findings = auditFindings(data);
    inputs = data.metadata?.dependencies?.total || 0;
    source = "npm registry audit";
    version = "11.19.0";
  } else if (kind === "licenses") {
    const lock = JSON.parse(
      fs.readFileSync(safePath(root, "package-lock.json"), "utf8"),
    );
    const packages = Object.entries(lock.packages)
      .filter(([p]) => p)
      .map(([p, m]) => ({
        name: m.name || p.split("node_modules/").at(-1),
        version: m.version,
        license: m.license,
        licenses: m.licenses,
      }));
    const vendor = verifyStyleSources(root);
    packages.push({
      name: vendor.name,
      version: vendor.version,
      license: vendor.license,
    });
    findings = licenseFindings(packages);
    inputs = packages.length;
    source = "Complete locked dependency graph SPDX metadata";
    version = "spdx-expression-parse 5.0.0";
  } else if (kind === "workflow-syntax") {
    const { exe, tool } = await scanner(root, "actionlint");
    const file = safePath(root, ".github/workflows/verify.yml");
    findings = workflowFindings(fs.readFileSync(file, "utf8"));
    const result = await runProcess(exe, ["-shellcheck=", file], {
      cwd: root,
      timeout: 60000,
    });
    if (result.code || result.reason)
      findings.push({ code: "workflow-syntax", severity: "blocking" });
    inputs = 1;
    source = tool.name;
    version = tool.version;
  } else if (kind === "secrets") {
    const { exe, tool } = await scanner(root, "gitleaks");
    const own = allocate(root, `scanner-${crypto.randomUUID()}`),
      report = safePath(root, `${own}/private.json`);
    const snapshot = safePath(root, `${own}/input`);
    fs.mkdirSync(snapshot, { mode: 0o700 });
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, maxBuffer: 2097152 },
    )
      .toString()
      .split("\0")
      .filter(Boolean);
    let total = 0;
    for (const relative of files) {
      if (
        fs
          .lstatSync(path.join(root, relative), { throwIfNoEntry: false })
          ?.isSymbolicLink()
      ) {
        const dest = path.join(snapshot, relative);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, fs.readlinkSync(path.join(root, relative)));
        continue;
      }
      const file = safePath(root, relative);
      if (!fs.existsSync(file)) continue;
      const size = fs.statSync(file).size;
      total += size;
      if (size > 2097152 || total > 33554432)
        throw new Error("scanner-input-limit");
      const dest = path.join(snapshot, relative);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
    }
    try {
      const result = await runProcess(
        exe,
        [
          "dir",
          snapshot,
          "--config",
          ".gitleaks.toml",
          "--redact=100",
          "--no-banner",
          "--log-level",
          "error",
          "--report-format",
          "json",
          "--report-path",
          report,
        ],
        { cwd: root, timeout: 240000, maxBytes: 2097152 },
      );
      if (result.reason || result.code > 1)
        throw new Error("scanner-unavailable");
      if (!fs.existsSync(report) || fs.statSync(report).size > 2097152)
        throw new Error("scanner-report-unavailable");
      const raw = JSON.parse(fs.readFileSync(report, "utf8"));
      if (!Array.isArray(raw)) throw new Error("scanner-malformed");
      findings = raw.map((f) => ({
        code: "secret",
        rule: f.RuleID,
        location: String(f.File).slice(0, 512),
        line: f.StartLine,
        severity: "blocking",
        action: "Remove credential/sentinel, rotate actual exposure, rerun",
      }));
      findings.push(...scanF010SecretEvidence(root));
      findings.push(...scanF011SecretEvidence(root));
      findings.push(...scanF012SecretEvidence(root));
      inputs = files.length;
      source = tool.name;
      version = tool.version;
    } finally {
      fs.rmSync(report, { force: true });
      fs.rmSync(snapshot, { recursive: true, force: true });
    }
  } else throw new Error("scanner-kind");
  if (!inputs) throw new Error("scanner-empty");
  const dispositions = JSON.parse(
    fs.readFileSync(
      safePath(root, "verification/scanner-dispositions.v1.json"),
      "utf8",
    ),
  );
  findings = applyDispositions(findings, dispositions.dispositions, "F002");
  return {
    kind,
    source,
    version,
    inputs,
    findings,
    status: findings.length ? "failed" : "passed",
    legal_approval: "not inferred",
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const value = await securityCheck(process.cwd(), process.argv[2]);
    console.log(JSON.stringify(value));
    process.exitCode = value.status === "passed" ? 0 : 1;
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "unavailable",
        code: /^[a-z-]+$/.test(error.message)
          ? error.message
          : "scanner-failed",
        next_action:
          "Restore pinned scanner/network/metadata and rerun; do not waive",
      }),
    );
    process.exitCode = 2;
  }
}
