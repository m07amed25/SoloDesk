import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const MAX_FILE = 2 * 1024 * 1024;
export const statuses = [
  "passed",
  "failed",
  "not run",
  "unavailable",
  "stale",
  "not applicable",
];
export function parseRecord(text) {
  if (Buffer.byteLength(text) > MAX_FILE) throw new Error("input-limit");
  const data = JSON.parse(text);
  const stack = [];
  for (const token of text.matchAll(/"(?:\\.|[^"\\])*"|[{}:,]|\[|\]/g)) {
    const v = token[0],
      top = stack.at(-1);
    if (v === "{") stack.push({ object: true, keys: new Set(), key: true });
    else if (v === "[") stack.push({ object: false });
    else if (v === "}" || v === "]") stack.pop();
    else if (v === "," && top?.object) top.key = true;
    else if (v === ":" && top?.object) top.key = false;
    else if (v.startsWith('"') && top?.object && top.key) {
      const key = JSON.parse(v);
      if (top.keys.has(key)) throw new Error("duplicate-key");
      top.keys.add(key);
    }
  }
  return data;
}
function walk(v, depth = 0) {
  if (depth > 32) throw new Error("depth-limit");
  if (typeof v === "number" && (!Number.isSafeInteger(v) || v < 0))
    throw new Error("nonnegative-safe-integer-required");
  if (Array.isArray(v) && v.length > 2048) throw new Error("collection-limit");
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      if (
        [
          "__proto__",
          "constructor",
          "prototype",
          "merge_authorized",
          "source_verified",
          "assume_owner_approved",
        ].includes(k)
      )
        throw new Error("unsafe-field");
      if (k.endsWith("_at") && x !== null) {
        if (
          typeof x !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x) ||
          !Number.isFinite(Date.parse(x)) ||
          new Date(x).toISOString().replace(".000Z", "Z") !==
            x.replace(".000Z", "Z")
        )
          throw new Error("timestamp-invalid");
      }
      if (typeof x === "string" && Buffer.byteLength(x) > MAX_FILE)
        throw new Error("string-limit");
      walk(x, depth + 1);
    }
}
const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../schema/verification",
);
export function validateRecord(v) {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("record-required");
  if (v.schema_version !== 1) throw new Error("unsupported-version");
  if (!/^solodesk\.verification\.[a-z]+$/.test(v.schema || ""))
    throw new Error("unsupported-schema");
  const kind = v.schema.split(".").at(-1),
    file = path.join(dir, `${kind}-v1.schema.json`);
  if (!fs.existsSync(file)) throw new Error("unsupported-schema");
  const schema = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const key of schema.required)
    if (v[key] === undefined || v[key] === null)
      throw new Error(`required-field:${key}`);
  for (const [key, value] of Object.entries(v)) {
    const prop = schema.properties[key];
    if (!prop) throw new Error(`unknown-field:${key}`);
    const type = Array.isArray(value) ? "array" : typeof value;
    if (prop.type && prop.type !== type) throw new Error(`field-type:${key}`);
    if (prop.enum && !prop.enum.includes(value))
      throw new Error(`field-enum:${key}`);
  }
  if (typeof v.id !== "string" || !v.id || v.id.length > 256)
    throw new Error("id-required");
  walk(v);
  if (kind === "policy") {
    if (!v.mandatory_checks.length) throw new Error("mandatory-checks-empty");
    if (new Set(v.mandatory_checks).size !== v.mandatory_checks.length)
      throw new Error("duplicate-mandatory-check");
  }
  for (const key of ["proposal_head_sha", "base_sha", "tested_sha"])
    if (v[key] !== undefined && !/^[a-f0-9]{40,64}$/.test(v[key]))
      throw new Error(`invalid-sha:${key}`);
  if (kind === "context" && v.execution_mode === "local" && v.provider)
    throw new Error("local-provider-forgery");
  if (
    kind === "report" &&
    v.status === "passed" &&
    v.counts?.kind === "tests" &&
    (!v.counts.executed || v.counts.failed || v.counts.skipped || v.counts.todo)
  )
    throw new Error("suite-empty-or-incomplete");
  if (kind === "report" && !statuses.includes(v.status))
    throw new Error("status-invalid");
  if (kind === "review") {
    if (
      ![
        "open",
        "mitigated-awaiting-verification",
        "closed",
        "individually accepted limitation",
      ].includes(v.status)
    )
      throw new Error("finding-status");
    if (
      v.status === "individually accepted limitation" &&
      (v.blocking ||
        /exposure|privilege|data-loss|constitutional/i.test(v.diagnostic))
    )
      throw new Error("constitutional-blocker");
  }
  if (
    kind === "adoption" &&
    ["authorized", "activated", "verified", "reverted"].includes(v.outcome)
  )
    throw new Error("adoption-source-unverified");
  return v;
}
export function readRecord(file, { validate = true } = {}) {
  if (fs.statSync(file).size > MAX_FILE) throw new Error("input-limit");
  const v = parseRecord(fs.readFileSync(file, "utf8"));
  return validate ? validateRecord(v) : v;
}
export function envelope(kind, id, fields = {}) {
  return {
    schema: `solodesk.verification.${kind}`,
    schema_version: 1,
    id,
    ...fields,
  };
}
export function canonicalJSON(value) {
  if (Array.isArray(value))
    return "[" + value.map(canonicalJSON).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalJSON(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
