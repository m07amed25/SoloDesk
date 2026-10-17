import fs from "node:fs";
import path from "node:path";
import { safePath } from "./artifacts.mjs";
import { git } from "./context.mjs";
function anchors(text) {
  const out = new Set(),
    seen = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (m) {
      const a = m[1]
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/[^\p{L}\p{N}_\- ]/gu, "")
        .replace(/ /g, "-");
      const n = seen.get(a) || 0;
      out.add(n ? `${a}-${n}` : a);
      seen.set(a, n + 1);
    }
  }
  for (const m of text.matchAll(/<a\s+id=["']([^"']+)["']/g)) out.add(m[1]);
  return out;
}
export function checkDocuments(root, files) {
  const findings = [];
  let checked = 0,
    total = 0;
  const cache = new Map();
  const boundedText = (file) => {
    if (cache.has(file)) return cache.get(file);
    const size = fs.statSync(file).size;
    total += size;
    if (size > 2097152 || total > 33554432) throw new Error("document-limit");
    const text = fs.readFileSync(file, "utf8");
    cache.set(file, text);
    return text;
  };
  for (const relative of files) {
    let text;
    try {
      const p = safePath(root, relative);
      if (fs.statSync(p).size > 2097152) throw new Error("document-limit");
      text = boundedText(p).replace(/```[\s\S]*?```/g, "");
    } catch {
      findings.push({ code: "document-unreadable", path: relative });
      continue;
    }
    const owner = relative.match(/^(specs\/[^/]+)\//)?.[1];
    if (owner && fs.existsSync(path.join(root, owner, "spec.md"))) {
      const spec = boundedText(safePath(root, `${owner}/spec.md`));
      const definitions = [
        ...spec.matchAll(/\*\*((?:FR|SC)-\d{3}|A-\d{2})(?:\*\*| —)/g),
      ].map((m) => m[1]);
      const defined = new Set(definitions);
      if (definitions.length !== defined.size)
        findings.push({ code: "duplicate-local-id", path: relative });
      for (const m of text.matchAll(/\b(?:FR-\d{3}|SC-\d{3}|A-\d{2})\b/g))
        if (!defined.has(m[0]))
          findings.push({ code: "unknown-local-id", path: relative });
    }
    const references = new Map(
      [...text.matchAll(/^\[([^\]]+)\]:\s*(\S+)/gm)].map((m) => [
        m[1].toLowerCase(),
        m[2],
      ]),
    );
    const links = [...text.matchAll(/\[[^\]]*\]\((<[^>]+>|[^)]+)\)/g)].map(
      (m) => m[1],
    );
    for (const m of text.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g)) {
      const target = references.get((m[2] || m[1]).toLowerCase());
      if (target) links.push(target);
      else findings.push({ code: "document-reference", path: relative });
    }
    for (const raw of links) {
      const m = [null, raw];
      const target = m[1].replace(/^<|>$/g, "");
      if (
        /^[a-z][\w+.-]*:/i.test(target) ||
        (relative === "AGENT.md" &&
          target.startsWith("/home/mohamed-s/.codex/"))
      )
        continue;
      const [name, fragment] = target.split("#");
      try {
        const normalized = path.posix.normalize(
          path.posix.join(
            path.posix.dirname(relative),
            decodeURIComponent(name || path.posix.basename(relative)),
          ),
        );
        const file = safePath(root, normalized);
        if (fs.statSync(file).isDirectory()) {
          if (fragment) throw new Error("directory-fragment");
          checked++;
          continue;
        }
        if (!fs.statSync(file).isFile()) throw new Error("target");
        if (
          fragment &&
          !anchors(boundedText(file)).has(decodeURIComponent(fragment))
        )
          throw new Error("anchor");
        checked++;
      } catch {
        findings.push({ code: "document-reference", path: relative });
      }
    }
  }
  return { checked, files: files.length, findings };
}
if (process.argv[1]?.endsWith("/documentation.mjs")) {
  const root = process.cwd();
  const files = [
    ...new Set([
      ...git(root, "ls-files", "-z").split("\0"),
      ...git(root, "ls-files", "--others", "--exclude-standard", "-z").split(
        "\0",
      ),
    ]),
  ].filter(
    (x) =>
      x.endsWith(".md") &&
      !x.startsWith(".agents/") &&
      !x.startsWith(".specify/templates/"),
  );
  const r = checkDocuments(root, files);
  console.log(JSON.stringify(r));
  process.exitCode = r.findings.length ? 1 : 0;
}
