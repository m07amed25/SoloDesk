import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// Bounded, read-only local governance diagnostics; never executes recorded procedures.
export class InputError extends Error {}
export function parseArguments(args) {
  const options = { root: process.cwd(), evidence: null, format: "text" };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = Object.assign(Object.create(null), {
      "--root": "root",
      "--evidence": "evidence",
      "--format": "format",
    })[args[i]];
    if (!key || seen.has(key) || !args[i + 1] || args[i + 1].startsWith("--"))
      throw new InputError(
        "Invalid or duplicate option; use --root, --evidence or --format json.",
      );
    seen.add(key);
    options[key] = args[++i];
  }
  if (!["text", "json"].includes(options.format))
    throw new InputError("Unsupported output format.");
  return options;
}
export class ReviewIO {
  constructor(root) {
    try {
      this.root = fs.realpathSync(root);
    } catch {
      throw new InputError("Unreadable review root.");
    }
    this.cache = new Map();
    this.bytes = 0;
  }
  resolve(file) {
    if (
      typeof file !== "string" ||
      !file ||
      file.includes("\0") ||
      path.isAbsolute(file) ||
      /^[A-Za-z]:|^\\\\/.test(file)
    )
      throw new InputError("Expected a bounded repository-relative path.");
    const lexical = path.resolve(this.root, file);
    if (path.relative(this.root, lexical).split(path.sep).includes(".."))
      throw new InputError("Path escapes review root.");
    let real;
    try {
      real = fs.realpathSync(lexical);
    } catch {
      throw new InputError("Missing or unreadable local target.");
    }
    if (path.relative(this.root, real).split(path.sep).includes(".."))
      throw new InputError("Symlink escapes review root.");
    return real;
  }
  read(file) {
    const real = this.resolve(file);
    if (this.cache.has(real)) return this.cache.get(real);
    let stat;
    try {
      stat = fs.statSync(real);
    } catch {
      throw new InputError("Unreadable local target.");
    }
    if (
      !stat.isFile() ||
      stat.size > 2 * 1024 * 1024 ||
      this.bytes + stat.size > 32 * 1024 * 1024 ||
      this.cache.size >= 512
    )
      throw new InputError("Input exceeds review file/count/byte bounds.");
    let bytes;
    try {
      bytes = fs.readFileSync(real);
    } catch {
      throw new InputError("Unreadable local target.");
    }
    this.bytes += bytes.length;
    this.cache.set(real, bytes);
    return bytes;
  }
}
export const STATES = [
  "planned",
  "decision-ready",
  "building",
  "PR open/draft",
  "automated checks passed",
  "agent QA passed",
  "awaiting user approval",
  "approved",
  "merged",
  "released",
];
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const array = (value) => Array.isArray(value);
const object = (value) =>
  value !== null && typeof value === "object" && !array(value);
const issue = (
  code,
  location,
  rule,
  action = "Repair the indicated record or reference and repeat validation.",
) => ({
  code,
  severity: "error",
  location: String(location)
    .replace(/[\r\n]/g, "")
    .slice(0, 200),
  rule,
  action,
});
function fields(value, names, location, result) {
  for (const name of names)
    if (
      value?.[name] === undefined ||
      value[name] === null ||
      value[name] === ""
    )
      result.push(
        issue(
          "missing-field",
          `${location}.${name}`,
          "Required field is missing.",
        ),
      );
}
export function withoutFences(text) {
  let fence = null;
  return text
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (match) {
        if (!fence) fence = { kind: match[1][0], length: match[1].length };
        else if (match[1][0] === fence.kind && match[1].length >= fence.length)
          fence = null;
        return "";
      }
      return fence ? "" : line;
    })
    .join("\n");
}
export function anchors(text) {
  const ids = new Set();
  const counts = new Map();
  const plain = withoutFences(text);
  for (const match of plain.matchAll(/\bid\s*=\s*["']([^"']+)["']/g))
    ids.add(match[1]);
  for (const match of plain.matchAll(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/gm)) {
    const slug = match[1]
      .replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/([*_]{1,3})(.*?)\1/g, "$2")
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "")
      .replace(/\s/g, "-");
    const count = counts.get(slug) || 0;
    counts.set(slug, count + 1);
    ids.add(count ? `${slug}-${count}` : slug);
  }
  return ids;
}
export function checkLinks(text, source, io) {
  const findings = [],
    external_references = [];
  const plain = withoutFences(text).replace(/`+[^`\n]*`+/g, "");
  const refs = new Map();
  const links = [];
  const covered = new Set();
  for (const m of plain.matchAll(/^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm))
    refs.set(m[1].toLowerCase(), m[2].replace(/^<|>$/g, ""));
  for (const m of plain.matchAll(
    /!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^"'\n]*["'])?\s*\)/g,
  )) {
    links.push({ target: m[1].replace(/^<|>$/g, ""), index: m.index });
    covered.add(m.index + m[0].indexOf("]("));
  }
  for (const m of plain.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const ref = refs.get((m[2] || m[1]).toLowerCase());
    if (!ref)
      findings.push(
        issue(
          "missing-reference",
          source,
          "Reference-style link has no definition.",
        ),
      );
    else links.push({ target: ref, index: m.index });
  }
  for (const m of plain.matchAll(/\]\(/g))
    if (!covered.has(m.index))
      findings.push(
        issue(
          "unsupported-link",
          source,
          "Unsupported inline link syntax; use a supported bounded target.",
        ),
      );
  for (const { target, index } of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      external_references.push({
        source,
        target: /^https?:/i.test(target) ? (()=>{try{return new URL(target).origin;}catch{return "external URL (manual inspection required)";}})() : "external source (manual inspection required)",
      });
      continue;
    }
    const section =
      [...plain.slice(0, index).matchAll(/^## (.+)$/gm)].at(-1)?.[1] || "";
    if (
      path.isAbsolute(target) &&
      source === "AGENT.md" &&
      /Session-provided and optional tooling skills/.test(section)
    ) {
      external_references.push({
        source,
        target: "machine-specific skill catalogue reference",
      });
      continue;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      findings.push(
        issue("unsupported-link", source, "Malformed encoded link."),
      );
      continue;
    }
    const hash = decoded.indexOf("#");
    const local = hash < 0 ? decoded : decoded.slice(0, hash);
    const fragment = hash < 0 ? null : decoded.slice(hash + 1);
    if (path.isAbsolute(local) || /^[A-Za-z]:|^\\/.test(local)) {
      findings.push(
        issue("unsafe-target", source, "Required link escapes repository."),
      );
      continue;
    }
    const candidate = local
      ? path.relative(
          io.root,
          path.resolve(io.root, path.dirname(source), local),
        )
      : source;
    if (
      path
        .relative(io.root, path.resolve(io.root, candidate))
        .split(path.sep)
        .includes("..")
    ) {
      findings.push(
        issue("unsafe-target", source, "Link traverses outside repository."),
      );
      continue;
    }
    try {
      const resolved = io.resolve(candidate);
      if (
        fragment &&
        (!fs.statSync(resolved).isFile() ||
          !anchors(io.read(candidate).toString("utf8")).has(fragment))
      )
        findings.push(
          issue(
            "missing-anchor",
            source,
            "Local link fragment does not resolve.",
          ),
        );
    } catch (error) {
      if (/bounds/.test(error.message)) throw error;
      findings.push(
        issue(
          error.message.includes("escape") ? "unsafe-target" : "missing-target",
          source,
          "Local link target is missing, unsafe or unreadable.",
        ),
      );
    }
  }
  return { findings, external_references };
}
export function validatePhase(phase) {
  const result = [];
  fields(
    phase,
    [
      "id",
      "milestone",
      "parent_requirements",
      "outcome",
      "included_scope",
      "excluded_scope",
      "prerequisites",
      "blocking_decisions",
      "responsible_roles",
      "delivery_state",
      "condition",
      "last_valid_state",
      "history_refs",
    ],
    "phase",
    result,
  );
  if (
    phase?.id !== "F001" ||
    phase?.milestone !== "P00" ||
    !phase?.parent_requirements?.includes("NFR-014")
  )
    result.push(issue("phase-identity", "phase", "Expected F001/P00/NFR-014."));
  if (!array(phase?.prerequisites) || phase.prerequisites.length)
    result.push(
      issue("phase-prerequisite", "phase", "F001 has no prerequisite phases."),
    );
  for (const key of ["included_scope", "excluded_scope", "responsible_roles"])
    if (
      !array(phase?.[key]) ||
      !phase[key].length ||
      phase[key].some((v) => !nonempty(v))
    )
      result.push(
        issue("phase-scope", `phase.${key}`, "Expected a nonempty list."),
      );
  for (const key of ["blocking_decisions", "history_refs"])
    if (!array(phase?.[key]))
      result.push(issue("phase-list", `phase.${key}`, "Expected a list."));
  if (
    !STATES.includes(phase?.delivery_state) ||
    !STATES.includes(phase?.last_valid_state)
  )
    result.push(issue("phase-state", "phase", "Unknown lifecycle state."));
  if (!["active", "blocked", "failed"].includes(phase?.condition))
    result.push(issue("phase-condition", "phase", "Unknown phase condition."));
  if (["blocked", "failed"].includes(phase?.condition))
    fields(phase, ["reason", "owner", "next_action"], "phase", result);
  return result;
}
export function validateDecisions(decisions) {
  const result = [];
  if (!array(decisions))
    return [issue("decision-list", "decisions", "Expected a list.")];
  for (const decision of decisions) {
    fields(
      decision,
      [
        "id",
        "classification",
        "owner",
        "rationale",
        "affected_principles",
        "affected_requirements",
        "compatibility",
        "migration",
        "verification",
        "version",
        "date",
      ],
      "decision",
      result,
    );
    if (!["confirmed", "recommended", "open"].includes(decision.classification))
      result.push(
        issue("decision-classification", "decision", "Unknown classification."),
      );
    if (decision.adopted && decision.classification !== "confirmed")
      result.push(
        issue(
          "decision-promotion",
          "decision",
          "Open/recommended records cannot imply adoption.",
        ),
      );
    if (
      decision.classification === "confirmed" &&
      !nonempty(decision.authorization_reference)
    )
      result.push(
        issue(
          "decision-authority",
          "decision",
          "Confirmed policy requires its authority reference.",
        ),
      );
  }
  return result;
}

export function validateProposal(proposal, io = null) {
  const result = [];
  fields(
    proposal,
    [
      "phase_id",
      "title",
      "branch",
      "target",
      "problem",
      "result",
      "scope",
      "doc_refs",
      "impact",
      "recovery",
      "limitations",
    ],
    "proposal",
    result,
  );
  if (
    proposal?.phase_id !== "F001" ||
    !/^\[F001\] .+/.test(proposal?.title || "") ||
    !/^feat\/f001-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(proposal?.branch || "") ||
    proposal?.target !== "main"
  )
    result.push(
      issue(
        "proposal-identity",
        "proposal",
        "Expected one correctly named F001 proposal targeting main.",
      ),
    );
  if (
    proposal?.primary_prs &&
    (!array(proposal.primary_prs) || proposal.primary_prs.length !== 1)
  )
    result.push(
      issue("proposal-primary", "proposal", "One phase has one primary PR."),
    );
  if (
    proposal?.pr_url !== null &&
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[1-9]\d*$/.test(
      proposal?.pr_url || "",
    )
  )
    result.push(
      issue(
        "proposal-url",
        "proposal.pr_url",
        "Expected a real PR URL or explicitly pending null.",
      ),
    );
  if (proposal?.split_after_implementation)
    result.push(
      issue(
        "proposal-split",
        "proposal",
        "Agree new phase IDs before implementing a split.",
      ),
    );
  if (
    !object(proposal?.scope) ||
    !array(proposal.scope.included) ||
    !proposal.scope.included.length ||
    !array(proposal.scope.excluded) ||
    !proposal.scope.excluded.length
  )
    result.push(
      issue(
        "proposal-scope",
        "proposal.scope",
        "Included and excluded scope lists are required.",
      ),
    );
  if (!array(proposal?.doc_refs) || !proposal.doc_refs.length)
    result.push(
      issue(
        "proposal-docs",
        "proposal.doc_refs",
        "Documentation references are required.",
      ),
    );
  else if (io)
    for (const ref of proposal.doc_refs) {
      try {
        io.read(ref);
      } catch {
        result.push(
          issue(
            "missing-artifact",
            "proposal.doc_refs",
            "Required document is unavailable.",
          ),
        );
      }
    }
  if (proposal?.pr_url)
    fields(
      proposal,
      ["head_revision", "base_revision", "snapshot_ref"],
      "proposal",
      result,
    );
  return result;
}
export const CATEGORY_IDS = ['documentation','evidence','regression','application','authorization','recovery','localization','native','migration','privacy'];
const REQUIRED_CATEGORIES = new Set(['documentation','evidence','regression','recovery','privacy']);
const EVIDENCE_EXCLUSIONS = new Set(['docs/qa/F001.md','docs/qa/F001.evidence.json']);
const isoTime = value => nonempty(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) &&
  Number(value.slice(8,10))<=new Date(Date.UTC(Number(value.slice(0,4)),Number(value.slice(5,7)),0)).getUTCDate();
const revision = value => typeof value==='string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
export function digestFiles(io, files) {
  if (!array(files) || new Set(files).size!==files.length) throw new InputError('Duplicate or invalid snapshot paths.');
  const hash=createHash('sha256').update('F001-review-v1\n');
  const normalized=files.map(file=>{
    if (!nonempty(file) || file.includes('\\') || path.posix.normalize(file)!==file) throw new InputError('Use canonical POSIX snapshot paths.');
    io.resolve(file);return file;
  }).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
  for (const file of normalized) {
    const name=Buffer.from(file);const bytes=io.read(file);
    hash.update(`${name.length}:`).update(name).update('\n').update(`${bytes.length}:`).update(bytes).update('\n');
  }
  return hash.digest('hex');
}
function ownedPath(file) {
  return ['AGENT.md','AGENTS.md','README.md','plan.md','.gitignore','docs/README.md',
    '.specify/memory/constitution.md','.github/pull_request_template.md','docs/development/delivery-governance.md',
    'docs/features/F001.md','tooling/check-governance.mjs','tooling/check-governance.test.mjs'].includes(file) ||
    file.startsWith('specs/001-delivery-governance/') || file.startsWith('tooling/fixtures/governance/');
}
function checkSnapshot(pack, io, context, result) {
  const s=pack.snapshot;
  fields(s,['id','observed_head','comparison_base','reviewed_paths','content_digest','digest_format','working_tree_state','created_at','carry_forward','unrelated_paths'],'snapshot',result);
  if (!revision(s?.observed_head) || !revision(s?.comparison_base) || !isoTime(s?.created_at) || !['clean','uncommitted'].includes(s?.working_tree_state))
    result.push(issue('snapshot-identity','snapshot','Expected real revision IDs, timestamp and working-tree state.'));
  if (!array(s?.reviewed_paths) || !s.reviewed_paths.length) { result.push(issue('snapshot-scope','snapshot','Review scope must not be empty.'));return; }
  if (s.digest_format!=='F001-review-v1') result.push(issue('snapshot-format','snapshot','Unknown digest framing version.'));
  if (s.reviewed_paths.some(v=>EVIDENCE_EXCLUSIONS.has(v))) result.push(issue('snapshot-self-reference','snapshot','Evidence containers must not be included in their own digest.'));
  if (!array(s.unrelated_paths) || s.unrelated_paths.some(v=>!object(v) || !nonempty(v.path) || !nonempty(v.reason) || ownedPath(v.path)))
    result.push(issue('snapshot-unrelated','snapshot','Only inventoried unrelated changes may be excluded from F001 scope.'));
  const unrelated=new Set((array(s.unrelated_paths)?s.unrelated_paths:[]).map(v=>v?.path));
  for (const file of new Set([...(context.required_paths||[]),...(context.changed_paths||[])])) {
    if (!EVIDENCE_EXCLUSIONS.has(file) && !s.reviewed_paths.includes(file) && !(unrelated.has(file) && !ownedPath(file)))
      result.push(issue('snapshot-scope','snapshot','A required or changed subject is omitted from review.'));
  }
  try { if (digestFiles(io,s.reviewed_paths)!==s.content_digest) result.push(issue('snapshot-digest','snapshot','Reviewed bytes no longer match the recorded digest.')); }
  catch (error) { if (error instanceof InputError && /bounds/.test(error.message)) throw error; result.push(issue('snapshot-scope','snapshot','Snapshot paths are missing, duplicated or unsafe.')); }
  if (!array(s.carry_forward)) result.push(issue('snapshot-context','snapshot','Expected explicit carry-forward assessments.'));
  const changed=(context.observed_head && context.observed_head!==s.observed_head) || (context.comparison_base && context.comparison_base!==s.comparison_base);
  if (changed) {
    const assessed=(array(s.carry_forward)?s.carry_forward:[]).some(v=>v.old_head===s.observed_head && v.old_base===s.comparison_base &&
      (v.new_head===context.observed_head || (v.new_head==='content-bound' && context.content_seal===true && s.working_tree_state==='uncommitted' && pack.approval.decision==='pending')) && v.new_base===context.comparison_base &&
      v.content_digest===s.content_digest && nonempty(v.reason) && nonempty(v.reviewer) && isoTime(v.recorded_at) &&
      array(v.prior_evidence_ids) && v.prior_evidence_ids.length>0 && v.prior_evidence_ids.every(id=>pack.evidence.some(e=>e.id===id)));
    if (!assessed) result.push(issue('snapshot-context','snapshot','Changed head/base requires an exact current-context assessment, not a rewritten measured SHA.'));
  }
}
export function validateApproval(pack, context={}) {
  const result=[],a=pack.approval;
  if (!object(a)) return [issue('approval-record','approval','Expected an explicit pending or attributed owner-decision record.')];
  fields(a,['id','phase_id','snapshot_ref','evidence_pack_ref','decision','kind','limitations'],'approval',result);
  if (a.phase_id!=='F001' || a.snapshot_ref!==pack.snapshot?.id || a.evidence_pack_ref!==pack.pack_id)
    result.push(issue('approval-reference','approval','Approval must identify this exact phase/pack/snapshot.'));
  if (!['pending','approved','changes requested','rejected','withdrawn'].includes(a.decision)) result.push(issue('approval-state','approval','Unknown decision state.'));
  if (!['owner authorization','independent platform review'].includes(a.kind)) result.push(issue('approval-kind','approval','Owner authorization and independent review are distinct.'));
  for (const flag of ['approved','source_verified','merge_authorized']) if (a[flag]) result.push(issue('authority-assertion','approval','Editable assertions cannot authenticate consent.'));
  if (a.decision!=='pending') {
    fields(a,['decision_maker','decided_at','source_reference'],'approval',result);
    if (!object(a.decision_maker) || a.decision_maker.kind!=='human' || !nonempty(a.decision_maker.id)) result.push(issue('approval-human','approval','Final authorization must identify the actual human decision maker.'));
    if (!isoTime(a.decided_at)) result.push(issue('approval-time','approval','Attributed decisions require an actual timestamp.'));
    if (!object(a.source_reference) || !['user-message','platform-review'].includes(a.source_reference.kind) || !nonempty(a.source_reference.reference))
      result.push(issue('approval-source','approval','An attributable source reference is required; its authenticity remains unverified by the tool.'));
    if (a.pr_url!==pack.proposal?.pr_url || !nonempty(a.pr_url)) result.push(issue('approval-reference','approval','Decision must identify the actual proposal PR.'));
  }
  if (a.kind==='independent platform review' && a.decision_maker?.id===pack.proposal?.author_id)
    result.push(issue('approval-kind','approval','An author decision is not independent platform review.'));
  if (['approved','merged','released'].includes(pack.phase?.delivery_state) && (a.decision!=='approved' || a.kind!=='owner authorization'))
    result.push(issue('approval-state','phase','Current owner authorization is required for this asserted state.'));
  if (a.decision==='approved' && ((context.observed_head && context.observed_head!==pack.snapshot?.observed_head) ||
      (context.comparison_base && context.comparison_base!==pack.snapshot?.comparison_base)))
    result.push(issue('approval-stale','approval','Changed review context requires current owner confirmation.'));
  return result;
}
export function validateHistory(pack) {
  const result=[],phase=pack.phase,events=pack.transitions;
  if (!object(phase) || !array(events)) return [issue('phase-proof','phase','Missing lifecycle records.')];
  const current=STATES.indexOf(phase.delivery_state);
  if (current>=3 && !nonempty(pack.proposal?.pr_url)) result.push(issue('phase-proof','phase','A published review stage requires the actual primary PR.'));
  let previous='planned';
  for (const event of events) {
    fields(event,['id','from','to','recorded_at','actor','event','source_reference','snapshot_ref','evidence_refs','reason'],'transition',result);
    const from=STATES.indexOf(event.from),to=STATES.indexOf(event.to);
    if (from<0 || to<0 || event.from!==previous || (event.event!=='invalidation' && to!==from+1) ||
        (event.event==='invalidation' && to>=from)) result.push(issue('transition-order','transition','Only supported advances or explained invalidations are allowed.'));
    if (!isoTime(event.recorded_at) || !nonempty(event.actor) || !nonempty(event.reason) || !nonempty(event.source_reference) || event.snapshot_ref!==pack.snapshot.id)
      result.push(issue('transition-proof','transition','A transition requires actual actor/time/source and its snapshot.'));
    if (!array(event.evidence_refs) || event.evidence_refs.some(id=>!pack.evidence.some(e=>e.id===id))) result.push(issue('record-reference','transition','Unknown supporting evidence.'));
    previous=event.to;
  }
  if (events.length && previous!==phase.delivery_state) result.push(issue('phase-proof','phase','Current state must match the retained transition history.'));
  for (const id of phase.history_refs||[]) if (!events.some(e=>e.id===id)) result.push(issue('record-reference','phase.history_refs','Unknown transition history reference.'));
  if (current>=8) {
    const event=pack.merge_event;
    if (!object(event) || event.pr_url!==pack.proposal?.pr_url || !revision(event.merge_revision) || !isoTime(event.recorded_at) ||
        !nonempty(event.source_reference) || !nonempty(event.inspection?.observed) || !nonempty(event.inspection?.reviewer))
      result.push(issue('outcome-evidence','merge_event','Merged requires an actual inspected merge event, never a planned identity.'));
  }
  if (current>=9) {
    const event=pack.release_event;
    if (!object(event) || !nonempty(event.build) || !isoTime(event.recorded_at) || !nonempty(event.source_reference) || !nonempty(event.authorization_reference))
      result.push(issue('outcome-evidence','release_event','Release requires separate actual rollout and authorization evidence.'));
  }
  return result;
}
export function validateEvidencePack(pack, io, context={}) {
  const result=[];
  if (!object(pack) || pack.schema_version!==1) return [issue('schema-version','pack','Unsupported evidence record version.')];
  fields(pack,['pack_id','phase','proposal','snapshot','categories','evidence','findings','decisions','approval','transitions'],'pack',result);
  for (const flag of ['approved','source_verified','merge_authorized']) if (pack[flag]) result.push(issue('authority-assertion','pack','Editable fields cannot establish approval or merge authority.'));
  const collections=['categories','evidence','findings','decisions','transitions'];
  for (const key of collections) {
    if (!array(pack[key])) result.push(issue('record-list',key,'Expected a record list.'));
    else if (pack[key].length>2048) throw new InputError('Record collection exceeds review bounds.');
    else if (pack[key].some(v=>!object(v))) result.push(issue('record-object',key,'Every record must be an object.'));
  }
  if (collections.some(key=>!array(pack[key]) || pack[key].some(v=>!object(v)))) return result;
  if (!object(pack.phase) || !object(pack.proposal) || !object(pack.snapshot) || !object(pack.approval)) return [...result,issue('record-object','pack','Expected phase/proposal/snapshot/approval objects.')];
  result.push(...validatePhase(pack.phase),...validateProposal(pack.proposal,io),...validateDecisions(pack.decisions));
  const all=[pack.phase,pack.snapshot,pack.approval,...pack.categories,...pack.evidence,...pack.findings,...pack.decisions,...pack.transitions];
  const ids=new Set();
  for (const record of all) {
    if (!nonempty(record.id)) result.push(issue('missing-field','record.id','Record IDs must be nonempty.'));
    else if (ids.has(record.id) || record.id===pack.pack_id) result.push(issue('duplicate-id','record.id','IDs must be unique within the pack.'));
    else ids.add(record.id);
  }
  for (const record of all) {
    if (record.supersedes && !ids.has(record.supersedes)) result.push(issue('record-reference','record.supersedes','Superseded record is absent; retain its history.'));
  }
  checkSnapshot(pack,io,context,result);
  if (pack.proposal.snapshot_ref && pack.proposal.snapshot_ref!==pack.snapshot.id) result.push(issue('record-reference','proposal.snapshot_ref','Unknown snapshot reference.'));
  if (pack.proposal.head_revision && pack.proposal.head_revision!==pack.snapshot.observed_head) result.push(issue('record-reference','proposal.head_revision','Proposal must identify the measured head.'));
  if (pack.proposal.base_revision && pack.proposal.base_revision!==pack.snapshot.comparison_base) result.push(issue('record-reference','proposal.base_revision','Proposal must identify the measured base.'));
  const categoryMap=new Map(pack.categories.map(c=>[c.id,c]));
  for (const id of CATEGORY_IDS) if (!categoryMap.has(id)) result.push(issue('missing-category','categories','Required review subject is absent.'));
  for (const c of pack.categories) {
    if (!CATEGORY_IDS.includes(c.id) || typeof c.applicable!=='boolean' || !nonempty(c.subject) ||
        (!c.applicable && (!nonempty(c.reason) || REQUIRED_CATEGORIES.has(c.id))))
      result.push(issue('category-applicability','categories','Applicability must be specific; mandatory governance subjects cannot be waived.'));
  }
  const scenarios=new Set(),requirements=new Set(),usedCategories=new Set(),regressions=new Set();
  for (const e of pack.evidence) {
    fields(e,['id','pack_id','scenario_ids','requirement_ids','category','subject','applicable','snapshot_ref','environment','fixtures_or_documents','procedure','status','artifact_refs','reviewer','recorded_at','finding_refs'],'evidence',result);
    if (e.pack_id!==pack.pack_id || e.snapshot_ref!==pack.snapshot.id) result.push(issue('record-reference','evidence','Evidence refers to an absent pack or snapshot.'));
    if (!array(e.scenario_ids) || !array(e.requirement_ids) || !array(e.finding_refs) || !array(e.artifact_refs) || !array(e.fixtures_or_documents)) {result.push(issue('record-list','evidence','Expected scoped reference lists.'));continue;}
    for (const id of e.scenario_ids) {
      if (!/^A-(?:0[1-9]|1\d|2[0-2])$/.test(id)) result.push(issue('unknown-reference','evidence.scenario_ids','Unknown F001 scenario.'));
      else scenarios.add(id);
    }
    for (const id of e.requirement_ids) {
      if (id!=='NFR-014' && !/^FR-(?:00[1-9]|01\d|02[0-6])$/.test(id)) result.push(issue('unknown-reference','evidence.requirement_ids','Unknown F001 requirement.'));
      else requirements.add(id);
    }
    if (e.finding_refs.some(id=>!pack.findings.some(f=>f.id===id))) result.push(issue('record-reference','evidence.finding_refs','Unknown finding reference.'));
    if (typeof e.applicable!=='boolean' || !['passed','failed','not run','unavailable','stale','not applicable'].includes(e.status) ||
        (e.applicable && e.status!=='passed') || (!e.applicable && (e.status!=='not applicable' || !nonempty(e.applicability_reason))) )
      result.push(issue('evidence-status','evidence.status','Required applicable evidence must actually pass; inapplicability needs a specific reason.'));
    if (!categoryMap.has(e.category) || categoryMap.get(e.category).applicable!==e.applicable) result.push(issue('category-applicability','evidence.category','Evidence applicability must agree with its review subject.'));
    if (e.applicable) {
      fields(e,['expected','observed'],'evidence',result);
      if (!nonempty(e.expected) || !nonempty(e.observed) || !e.artifact_refs.length || !e.fixtures_or_documents.length)
        result.push(issue('evidence-observation','evidence','Actual observations, inputs and artifacts are required.'));
      usedCategories.add(e.category);if (e.category==='regression') regressions.add(e.procedure);
    }
    if (!object(e.reviewer) || !nonempty(e.reviewer.id) || !['agent','human','automation'].includes(e.reviewer.kind) || !isoTime(e.recorded_at))
      result.push(issue('evidence-reviewer','evidence','Expected actual reviewer identity/type and timestamp.'));
    for (const ref of [...e.artifact_refs,...e.fixtures_or_documents]) {
      if (!nonempty(ref)) {result.push(issue('missing-artifact','evidence','Artifact reference is empty.'));continue;}
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) {
        if (!e.external_inspection || !nonempty(e.external_inspection.observed) || !isoTime(e.external_inspection.recorded_at))
          result.push(issue('external-artifact','evidence','External artifacts require an actual inspection record.'));
      } else {try {io.read(ref);} catch (error) {if (/bounds/.test(error.message))throw error;result.push(issue('missing-artifact','evidence','Required local artifact is missing or unsafe.'));}}
    }
  }
  for (let n=1;n<=22;n++) if (!scenarios.has(`A-${String(n).padStart(2,'0')}`)) result.push(issue('missing-coverage','evidence','An F001 scenario has no evidence.'));
  for (let n=1;n<=26;n++) if (!requirements.has(`FR-${String(n).padStart(3,'0')}`)) result.push(issue('missing-coverage','evidence','An F001 requirement has no evidence.'));
  for (const id of REQUIRED_CATEGORIES) if (!usedCategories.has(id)) result.push(issue('missing-coverage','evidence','An applicable mandatory review subject has no evidence.'));
  for (const command of ['npm run test:launcher','npm run typecheck','npm run build']) if (!regressions.has(command)) result.push(issue('missing-regression','evidence','A mandatory current shell regression result is missing.'));
  for (const f of pack.findings) {
    fields(f,['id','evidence_refs','affected_requirements','severity','blocking','observation','owner','next_action','disposition','closure_evidence'],'finding',result);
    if (!['blocker','major','minor'].includes(f.severity) || typeof f.blocking!=='boolean' || !['open','fixed','accepted limitation'].includes(f.disposition)) result.push(issue('finding-state','finding','Unknown severity/disposition.'));
    if ((f.blocking || f.severity==='blocker') && f.disposition!=='fixed') result.push(issue('blocking-finding','finding','Blocking findings cannot be waived.'));
    if (f.disposition==='fixed' && (!array(f.closure_evidence) || !f.closure_evidence.length || f.closure_evidence.some(id=>!pack.evidence.some(e=>e.id===id && e.status==='passed')))) result.push(issue('finding-closure','finding','A fixed finding requires retained passing closure evidence.'));
    if (!array(f.evidence_refs) || f.evidence_refs.some(id=>!pack.evidence.some(e=>e.id===id))) result.push(issue('record-reference','finding','Unknown evidence reference.'));
  }
  result.push(...validateApproval(pack, context));
  result.push(...validateHistory(pack));
  return result;
}

export const POLICY_PATHS = [
  'AGENTS.md','AGENT.md','.specify/memory/constitution.md','plan.md',
  'specs/001-delivery-governance/spec.md','docs/development/delivery-governance.md',
  '.github/pull_request_template.md','docs/features/F001.md','docs/qa/F001.md',
  'README.md','docs/README.md','docs/product/requirements.md','docs/planning/coverage.md',
];
export function validatePolicy(io) {
  const findings=[], external_references=[], documents=new Map();
  for(const file of POLICY_PATHS) {
    try { documents.set(file,io.read(file).toString('utf8')); }
    catch(error) {
      if(/bounds|escape/.test(error.message)) throw error;
      findings.push(issue('missing-policy',file,'Required governance source is unavailable.'));
    }
  }
  for(const [file,text] of documents) {
    const links=checkLinks(text,file,io);
    findings.push(...links.findings);external_references.push(...links.external_references);
  }
  const template=documents.get('.github/pull_request_template.md');
  if(template) for(const heading of ['Problem and result','Identity and prerequisites','Included and excluded scope',
    'Documentation and source authority','Verification','Agent QA','Impacts and applicability',
    'Recovery and compatibility','Limits and rollout','Owner decision']) {
    if(!template.includes('## '+heading)) findings.push(issue('template-section','.github/pull_request_template.md','Required PR description section is missing.'));
  }
  const guide=documents.get('docs/development/delivery-governance.md');
  if(guide) {
    for(const clause of [/explicit user final approval/i,/independent platform review/i,/Material changes invalidate/i,/cannot\s+approve, merge or authenticate/i])
      if(!clause.test(guide)) findings.push(issue('approval-policy','docs/development/delivery-governance.md','A required approval/source/currentness rule is missing.'));
    if(/(?:skip|bypass|waive) (?:the )?(?:owner|user|final) approval|(?:green|passing) checks (?:authorize|permit) merge/i.test(guide))
      findings.push(issue('approval-bypass','docs/development/delivery-governance.md','Known approval bypass formulation requires repair.'));
  }
  const spec=documents.get('specs/001-delivery-governance/spec.md');
  if(spec) {
    const definitions=[...spec.matchAll(/(?:^- \*\*((?:FR|SC)-\d{3})\*\*:|^\d+\. \*\*(A-\d{2}) — Given)/gm)].map(m=>m[1]||m[2]);
    const expectedIds=new Set();
    for(const [prefix,total,width] of [['FR',26,3],['SC',7,3],['A',22,2]]) for(let n=1;n<=total;n++) {
      const id=prefix+'-'+String(n).padStart(width,'0');expectedIds.add(id);
      if(definitions.filter(v=>v===id).length!==1) findings.push(issue('local-definition','specs/001-delivery-governance/spec.md','Each required F001-local ID needs exactly one owning definition.'));
    }
    const known=new Set(definitions);
    for(const file of ['specs/001-delivery-governance/spec.md','docs/features/F001.md','docs/qa/F001.md']) {
      for(const id of new Set(withoutFences(documents.get(file)||'').match(/\b(?:FR-\d{3}|SC-\d{3}|A-\d{2})\b/g)||[])) {
        if(!known.has(id) || !expectedIds.has(id)) findings.push(issue('unknown-reference',file,'Unknown F001-local identifier in this feature namespace.'));
      }
    }
  }
  const register=[documents.get('docs/product/requirements.md')||'',documents.get('docs/planning/coverage.md')||''].join('\n');
  const stable=new Set(register.match(/\b(?:PLT|CRM|WRK|TIM|FIN|INS|NFR|SEC|DATA|UX|OPS|INT)-\d{3}\b/g)||[]);
  const phases=new Set([...((documents.get('plan.md')||'').matchAll(/^### (F\d{3})\s/gm))].map(m=>m[1]));
  const phaseDefinitions=[...((documents.get('plan.md')||'').matchAll(/^### (F\d{3})\s/gm))].map(m=>m[1]);
  if(new Set(phaseDefinitions).size!==phaseDefinitions.length) findings.push(issue('duplicate-definition','plan.md','A phase identity is defined more than once; retain history without reusing IDs.'));
  for(const [file,text] of documents) {
    if(file==='docs/product/requirements.md'||file==='docs/planning/coverage.md') continue;
    for(const id of new Set(withoutFences(text).match(/\b(?:PLT|CRM|WRK|TIM|FIN|INS|NFR|SEC|DATA|UX|OPS|INT)-\d{3}\b/g)||[]))
      if(!stable.has(id)) findings.push(issue('unknown-reference',file,'Stable requirement ID is absent from its owning registers.'));
    for(const id of new Set(withoutFences(text).match(/\bF\d{3}\b/g)||[]))
      if(!phases.has(id) && id!=='F000') findings.push(issue('unknown-reference',file,'Phase ID is absent from the root plan.'));
  }
  return {findings,external_references};
}
function gitRead(root,args,required=true) {
  const result=spawnSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:2*1024*1024,timeout:10000});
  if(result.status!==0) {if(required) throw new InputError('Required Git context is unavailable.');return null;}
  return result.stdout;
}
export function run(args = process.argv.slice(2)) {
  const options=parseArguments(args),io=new ReviewIO(options.root);
  let pack=null,context={},snapshot=null;
  if(options.evidence) {
    try { pack=JSON.parse(io.read(options.evidence).toString('utf8')); }
    catch(error) { throw new InputError('Unreadable or invalid evidence input.'); }
    if(!object(pack)||pack.schema_version!==1) throw new InputError('Unsupported evidence version.');
  }
  const policy=validatePolicy(io), findings=[...policy.findings];
  if(pack) {
    if(!revision(pack.snapshot?.comparison_base)) findings.push(issue('snapshot-identity','snapshot','A valid comparison commit is required.'));
    else {
      context={
        observed_head:gitRead(io.root,['rev-parse','HEAD']).trim(),
        comparison_base:gitRead(io.root,['rev-parse','refs/remotes/origin/main'],false)?.trim()||pack.snapshot.comparison_base,
        required_paths:POLICY_PATHS.filter(p=>!EVIDENCE_EXCLUSIONS.has(p)),
        changed_paths:[...new Set([
          ...gitRead(io.root,['diff','--name-only','-z',pack.snapshot.comparison_base,'--']).split('\0'),
          ...gitRead(io.root,['ls-files','--others','--exclude-standard','-z']).split('\0')
        ].filter(Boolean))]
      };
      context.content_seal=gitRead(io.root,['merge-base','--is-ancestor',pack.snapshot.observed_head,context.observed_head],false)!==null;
    }
    findings.push(...validateEvidencePack(pack,io,context));
    snapshot={id:pack.snapshot?.id||null,observed_head:pack.snapshot?.observed_head||null,current_head:context.observed_head||null,
      comparison_base:context.comparison_base||null,content_digest:pack.snapshot?.content_digest||null};
  }
  return {schema_version:1,mode:pack?'evidence':'policy',checked_paths:[...io.cache.keys()].map(p=>path.relative(io.root,p).split(path.sep).join('/')).sort(),snapshot,
    findings,external_references:policy.external_references,
    summary:{status:findings.length?'blocked':'valid',finding_count:findings.length,owner_source_verification:'required',owner_decision:pack?.approval?.decision||'unverified'}};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const options=parseArguments(process.argv.slice(2)),result=run();
    if(options.format==='json') process.stdout.write(JSON.stringify(result)+'\n');
    else process.stdout.write(`Governance ${result.mode}: ${result.summary.status} (${result.findings.length} findings)\n`+
      result.findings.map(f=>`${f.code}: ${f.location} — ${f.rule}\n`).join('')+
      'Owner source verification: required; local validity grants no approval or merge authority.\n');
    process.exitCode=result.findings.length?1:0;
  } catch {
    process.stderr.write('Governance input error: check arguments, JSON/version, paths, size limits and Git context.\n');
    process.exitCode=2;
  }
}
