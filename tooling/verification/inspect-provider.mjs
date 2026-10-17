import { execFileSync } from "node:child_process";
import { envelope } from "./records.mjs";
export function normalizeProvider(run, jobs, pr, context, artifacts) {
  if (
    pr &&
    (pr.head.sha !== context.proposal_head_sha ||
      pr.base.sha !== context.base_sha)
  )
    throw new Error("context-stale");
  if (![context.proposal_head_sha, context.tested_sha].includes(run.head_sha))
    throw new Error("provider-association");
  const duration =
    (run.status && run.status !== "completed"
      ? Date.now()
      : Date.parse(run.updated_at)) -
    Date.parse(run.run_started_at || run.created_at);
  if (!Number.isFinite(duration) || duration < 0 || duration > 3000000)
    throw new Error("execution-budget");
  return envelope("provider", `provider-${run.id}-${run.run_attempt}`, {
    context_ref: context.id,
    repository: context.proposal.repository,
    run_id: run.id,
    attempt: run.run_attempt,
    workflow: {
      id: run.workflow_id || null,
      path: run.path,
      raw_head_sha: run.head_sha,
      event: run.event,
    },
    jobs: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      conclusion: j.conclusion,
      status: j.status || "completed",
    })),
    current_head: pr?.head.sha || run.head_sha,
    current_base: pr?.base.sha || context.base_sha,
    tested_sha: context.tested_sha,
    observed_at: new Date().toISOString(),
    authenticated: true,
    artifacts: artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      expired: a.expired,
      size_bytes: a.size_in_bytes,
      expires_at: a.expires_at,
    })),
    findings: [],
  });
}
async function api(endpoint, token, settings = false) {
  if (!/^\/repos\/[\w.-]+\/[\w.-]+\//.test(endpoint))
    throw new Error("provider-endpoint");
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (settings && [403, 404].includes(response.status))
      return { unavailable: true, http_status: response.status };
    throw new Error("provider-unavailable");
  }
  const reader = response.body.getReader(),
    chunks = [];
  let bytes = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 2097152) {
      await reader.cancel();
      throw new Error("provider-input-limit");
    }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function pages(endpoint, key, token, request = api) {
  const items = [];
  for (let page = 1; page <= 20; page++) {
    const value = await request(
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      token,
    );
    const batch = value[key];
    if (!Array.isArray(batch)) throw new Error("provider-malformed");
    items.push(...batch);
    if (items.length > 2048) throw new Error("provider-collection-limit");
    if (batch.length < 100) return items;
  }
  throw new Error("provider-pagination-limit");
}
export async function inspectProvider(
  context,
  { runId, attempt, prNumber } = {},
) {
  const repo = context.proposal.repository;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !/^\d+$/.test(String(runId)) ||
    !/^\d+$/.test(String(attempt))
  )
    throw new Error("provider-identity");
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  const prefix = `/repos/${repo}`,
    run = await api(
      `${prefix}/actions/runs/${runId}/attempts/${attempt}`,
      token,
    );
  const jobs = await pages(
    `${prefix}/actions/runs/${runId}/attempts/${attempt}/jobs`,
    "jobs",
    token,
  );
  const artifacts = await pages(
    `${prefix}/actions/runs/${runId}/artifacts`,
    "artifacts",
    token,
  );
  const pr = prNumber ? await api(`${prefix}/pulls/${prNumber}`, token) : null;
  if (
    String(run.id) !== String(runId) ||
    String(run.run_attempt) !== String(attempt) ||
    run.path !== ".github/workflows/verify.yml"
  )
    throw new Error("provider-association");
  return normalizeProvider(run, jobs, pr, context, artifacts);
}
export async function inspectSettings(context) {
  const repo = context.proposal.repository;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("provider-identity");
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  const prefix = `/repos/${repo}`;
  const repository = await api(prefix + "/", token);
  const protection = await api(
    prefix + "/branches/main/protection",
    token,
    true,
  );
  const rulesets = await api(prefix + "/rulesets", token, true);
  const actions = await api(
    prefix + "/actions/permissions/workflow",
    token,
    true,
  );
  return {
    repository: {
      full_name: repository.full_name,
      default_branch: repository.default_branch,
      visibility: repository.visibility,
      permissions: repository.permissions,
    },
    protection,
    rulesets,
    actions,
    observed_at: new Date().toISOString(),
    outcome: "prepared",
    settings_changed: false,
  };
}
export async function command(root, o, output) {
  if (o.mode === "settings") {
    const { readRecord } = await import("./records.mjs");
    const { safePath } = await import("./artifacts.mjs");
    if (!o.context) throw new Error("provider-context-required");
    return {
      exit: 0,
      value: output(
        root,
        o.out,
        await inspectSettings(readRecord(safePath(root, o.context))),
      ),
    };
  }
  if (
    !/^\d+$/.test(o["run-id"] || "") ||
    !/^\d+$/.test(o.attempt || "") ||
    !o.context
  )
    throw new Error("provider-context-required");
  const { readRecord } = await import("./records.mjs");
  const { safePath } = await import("./artifacts.mjs");
  const c = readRecord(safePath(root, o.context));
  const value = await inspectProvider(c, {
    runId: o["run-id"],
    attempt: o.attempt,
    prNumber: o.pr,
  });
  return { exit: 0, value: output(root, o.out, value) };
}
