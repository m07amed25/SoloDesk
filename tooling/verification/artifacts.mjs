import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseRecord } from "./records.mjs";
export function safePath(root, relative) {
  if (
    typeof relative !== "string" ||
    !relative ||
    path.isAbsolute(relative) ||
    /^[A-Za-z]:|\\|\0/.test(relative) ||
    relative.split("/").includes("..")
  )
    throw new Error("unsafe-path");
  const base = fs.realpathSync(root),
    result = path.resolve(base, relative);
  if (!result.startsWith(base + path.sep)) throw new Error("unsafe-path");
  let current = base;
  for (const bit of relative.split("/")) {
    current = path.join(current, bit);
    if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink())
      throw new Error("symlink-path");
  }
  return result;
}
export const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
export function redact(text) {
  return String(text)
    .replace(
      /(?:gh[pousr]_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{12,}|F002_SECRET_[A-Za-z0-9_]+)/g,
      "[REDACTED]",
    )
    .replace(/(?:https?|wss?):\/\/[^\s"'<>\\]+/g, (url) => {
      try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
      } catch {
        return "[URL]";
      }
    });
}
export function allocate(root, id) {
  if (!/^[\w-]{1,128}$/.test(id)) throw new Error("unsafe-allocation-id");
  const rel = `.verification/${id}`,
    dest = safePath(root, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  if (fs.existsSync(dest)) throw new Error("allocation-exists");
  fs.mkdirSync(dest, { mode: 0o700 });
  fs.writeFileSync(
    path.join(dest, ".owner.json"),
    JSON.stringify({ id, root: fs.realpathSync(root) }),
    { mode: 0o600 },
  );
  return rel;
}
export function writeRecord(root, relative, value) {
  if (!/^\.verification\/[\w-]+\//.test(relative))
    throw new Error("owned-output-required");
  const dest = safePath(root, relative),
    owner = path.join(
      root,
      relative.split("/").slice(0, 2).join("/"),
      ".owner.json",
    );
  if (!fs.existsSync(owner)) throw new Error("owned-output-required");
  const identity = JSON.parse(
    fs.readFileSync(
      safePath(
        root,
        relative.split("/").slice(0, 2).join("/") + "/.owner.json",
      ),
      "utf8",
    ),
  );
  if (
    identity.root !== fs.realpathSync(root) ||
    identity.id !== relative.split("/")[1]
  )
    throw new Error("owned-output-required");
  const data = JSON.stringify(value, null, 2) + "\n";
  if (Buffer.byteLength(data) > 2 * 1024 * 1024)
    throw new Error("artifact-oversize");
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  const tmp = `${dest}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, data, { mode: 0o600, flag: "wx" });
  fs.renameSync(tmp, dest);
  return dest;
}
export function artifact(root, relative, context, run, check) {
  validateArtifact(root, relative);
  const file = safePath(root, relative),
    bytes = fs.readFileSync(file);
  if (bytes.length > (relative.endsWith(".png") ? 5 : 2) * 1024 * 1024)
    throw new Error("artifact-oversize");
  if (!/\.(json|txt|png)$/.test(relative)) throw new Error("artifact-kind");
  return {
    id: digest(bytes),
    context_ref: context,
    run_ref: run,
    check_ref: check,
    path: relative,
    sha256: digest(bytes),
    bytes: bytes.length,
    collection_status: "collected",
    redaction_status: "synthetic-reviewed",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}
export function validateArtifact(root, relative, record) {
  if (
    /%[0-9a-f]{2}/i.test(relative) ||
    !/^\.verification\/[\w-]+\/[\w./-]+\.(json|txt|png)$/.test(relative)
  )
    throw new Error("artifact-kind");
  const file = safePath(root, relative),
    stat = fs.statSync(file);
  const max = relative.endsWith(".png") ? 5242880 : 2097152;
  if (!stat.isFile() || stat.size > max) throw new Error("artifact-oversize");
  const bytes = fs.readFileSync(file);
  if (relative.endsWith(".png")) {
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error("artifact-encoding");
  } else {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\u0000") || redact(text) !== text)
      throw new Error("artifact-unsafe");
    if (relative.endsWith(".json")) parseRecord(text);
  }
  if (
    record &&
    (record.sha256 !== digest(bytes) ||
      record.bytes !== bytes.length ||
      !Number.isFinite(Date.parse(record.expires_at)) ||
      Date.parse(record.expires_at) <= Date.now() ||
      record.collection_status !== "collected" ||
      !["synthetic-reviewed", "redacted-reviewed"].includes(
        record.redaction_status,
      ))
  )
    throw new Error("artifact-binding");
  return true;
}
