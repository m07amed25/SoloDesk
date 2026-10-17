import { run, validatePolicy, POLICY_PATHS } from './check-governance.mjs';
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  parseArguments,
  ReviewIO,
  checkLinks,
  validateProposal,
  validateEvidencePack,
  validatePhase,
  validateDecisions,
  digestFiles,
} from "./check-governance.mjs";
const cli = path.resolve("tooling/check-governance.mjs");
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "f001-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, file, text) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
}
test("Foundation: reject unknown and missing CLI options", () => {
  assert.throws(() => parseArguments(["--assume-owner-approved"]));
  assert.throws(() => parseArguments(["--evidence"]));
});
test("Foundation: explicit JSON format and root", (t) => {
  const root = temporary(t);
  assert.deepEqual(parseArguments(["--root", root, "--format", "json"]), {
    root,
    evidence: null,
    format: "json",
  });
});
test("Foundation: local IO refuses traversal, symlink escape and oversized files", (t) => {
  const root = temporary(t);
  write(root, "ok.md", "safe");
  const io = new ReviewIO(root);
  assert.equal(io.read("ok.md").toString(), "safe");
  assert.throws(() => io.read("../outside"));
  fs.symlinkSync(os.tmpdir(), path.join(root, "outside"));
  assert.throws(() => io.read("outside/secret"));
  write(root, "large.md", "x".repeat(2 * 1024 * 1024 + 1));
  assert.throws(() => io.read("large.md"));
});
test("Foundation: CLI failure is safe and has exit 2", () => {
  const result = spawnSync(process.execPath, [cli, "--unknown"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.doesNotMatch(result.stdout + result.stderr, /Error:.*\n\s+at /);
});

const policyCases = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/governance/policy-references.json", import.meta.url),
  ),
).cases;
for (const item of policyCases)
  test("US1: " + item.name, (t) => {
    const root = temporary(t);
    write(root, "target.md", item.target);
    const actual = checkLinks(item.text, "source.md", new ReviewIO(root));
    assert.deepEqual(
      actual.findings.map((f) => f.code),
      item.expected,
    );
  });
test("US1: encoded/angle paths and external references remain separate", (t) => {
  const root = temporary(t);
  write(root, "file name.md", "# Scope");
  const result = checkLinks(
    "[one](file%20name.md#scope) [two](<file name.md>) [web](https://example.invalid/?private=hidden)",
    "source.md",
    new ReviewIO(root),
  );
  assert.deepEqual(result.findings, []);
  assert.equal(result.external_references.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /private=hidden/);
});
test("US1: phase IDs, self prerequisites, blockers and decision classification", () => {
  assert.ok(
    validatePhase({
      id: "F999",
      milestone: "P00",
      parent_requirements: ["NFR-014"],
    }).some((f) => f.code === "phase-identity"),
  );
  assert.ok(
    validatePhase({ id: "F001", prerequisites: ["F001"] }).some(
      (f) => f.code === "phase-prerequisite",
    ),
  );
  assert.ok(
    validateDecisions([
      { id: "Q-01", classification: "open", adopted: true },
    ]).some((f) => f.code === "decision-promotion"),
  );
});
const proposals = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/governance/proposals.json", import.meta.url),
  ),
);
for (const item of proposals.cases)
  test("US2: proposal rejects " + item.expected, () => {
    assert.ok(
      validateProposal({
        ...structuredClone(proposals.valid),
        ...item.patch,
      }).some((f) => f.code === item.expected),
    );
  });
test("US2: valid proposed PR keeps real identities null", () =>
  assert.deepEqual(validateProposal(proposals.valid), []));
test("US2: template exposes required sections without approval checkbox", () => {
  const text = fs.existsSync(".github/pull_request_template.md")
    ? fs.readFileSync(".github/pull_request_template.md", "utf8")
    : "";
  for (const heading of [
    "Problem and result",
    "Identity and prerequisites",
    "Included and excluded scope",
    "Documentation and source authority",
    "Verification",
    "Agent QA",
    "Impacts and applicability",
    "Recovery and compatibility",
    "Limits and rollout",
    "Owner decision",
  ])
    assert.ok(text.includes("## " + heading), heading);
  assert.match(text, /checkbox.*approval|approval.*checkbox/i);
});
const evidenceFixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/governance/evidence-records.json", import.meta.url),
  ),
);
function recordRoot(t) {
  const root = temporary(t);
  for (const [file, text] of Object.entries(evidenceFixture.files))
    write(root, file, text);
  return root;
}
function checkPack(t, mutate, context = {}) {
  const root = recordRoot(t);
  const pack = structuredClone(evidenceFixture.valid);
  mutate?.(pack);
  return validateEvidencePack(pack, new ReviewIO(root), {
    observed_head: "a".repeat(40),
    comparison_base: "b".repeat(40),
    changed_paths: ["policy.md"],
    required_paths: ["policy.md"],
    ...context,
  });
}
test("US3: complete current pre-owner pack validates structurally", (t) =>
  assert.deepEqual(checkPack(t), []));
for (const [name, mutate, code] of [
  ["unknown version", (p) => (p.schema_version = 9), "schema-version"],
  [
    "missing observation",
    (p) => delete p.evidence[0].observed,
    "missing-field",
  ],
  [
    "duplicate record ID",
    (p) => (p.evidence[1].id = p.evidence[0].id),
    "duplicate-id",
  ],
  [
    "dangling snapshot",
    (p) => (p.evidence[0].snapshot_ref = "absent"),
    "record-reference",
  ],
  [
    "dangling pack",
    (p) => (p.evidence[0].pack_id = "absent"),
    "record-reference",
  ],
  [
    "unknown scenario",
    (p) => (p.evidence[0].scenario_ids = ["A-99"]),
    "unknown-reference",
  ],
  [
    "missing artifact",
    (p) => (p.evidence[0].artifact_refs = ["absent.md"]),
    "missing-artifact",
  ],
  [
    "missing coverage",
    (p) => (p.evidence = p.evidence.slice(1)),
    "missing-coverage",
  ],
  [
    "blanket waiver",
    (p) => (p.categories[0].applicable = false),
    "category-applicability",
  ],
  [
    "digest mismatch",
    (p) => (p.snapshot.content_digest = "0".repeat(64)),
    "snapshot-digest",
  ],
  [
    "source assertion",
    (p) => (p.merge_authorized = true),
    "authority-assertion",
  ],
  [
    "blocking finding waived",
    (p) =>
      (p.findings = [
        {
          id: "finding",
          blocking: true,
          severity: "blocker",
          disposition: "accepted limitation",
        },
      ]),
    "blocking-finding",
  ],
])
  test("US3: " + name, (t) =>
    assert.ok(
      checkPack(t, mutate).some((f) => f.code === code),
      code,
    ),
  );
for (const status of [
  "failed",
  "not run",
  "unavailable",
  "stale",
  "not applicable",
])
  test("US3: required " + status + " cannot pass", (t) => {
    assert.ok(
      checkPack(t, (p) => (p.evidence[0].status = status)).some(
        (f) => f.code === "evidence-status",
      ),
    );
  });
test("US3: missing changed tooling is not hidden by a supplied digest", (t) => {
  assert.ok(
    checkPack(t, null, {
      changed_paths: ["policy.md", "tooling/check-governance.mjs"],
    }).some((f) => f.code === "snapshot-scope"),
  );
});
test("US3: changed baseline needs an explicit current-context assessment", (t) => {
  assert.ok(
    checkPack(t, null, { comparison_base: "c".repeat(40) }).some(
      (f) => f.code === "snapshot-context",
    ),
  );
});
test("US3: independently fixed canonical digest handles Unicode, order and bytes", (t) => {
  const fixture = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/governance/snapshot-digests.json", import.meta.url),
    ),
  );
  const root = temporary(t);
  for (const [file, text] of Object.entries(fixture.files))
    write(root, file, text);
  assert.equal(
    digestFiles(new ReviewIO(root), Object.keys(fixture.files).reverse()),
    fixture.expected_digest,
  );
  write(root, "مرحبا.md", "نص\n");
  assert.notEqual(
    digestFiles(new ReviewIO(root), Object.keys(fixture.files)),
    fixture.expected_digest,
  );
});

const approvalCases=JSON.parse(fs.readFileSync(new URL('./fixtures/governance/approvals.json',import.meta.url))).cases;
function withOwner(pack) {
 pack.proposal.pr_url='https://github.com/synthetic/repository/pull/7';pack.proposal.author_id='owner';
 Object.assign(pack.approval,{decision:'approved',pr_url:pack.proposal.pr_url,decision_maker:{id:'owner',kind:'human'},decided_at:'2026-10-17T12:00:00Z',source_reference:{kind:'user-message',reference:'synthetic-message'}});
}
for(const [name,mutate,code]of[
 ['agent',p=>p.approval.decision_maker.kind='agent','approval-human'],
 ['stale',p=>p.approval.snapshot_ref='old','approval-reference'],
 ['missing source',p=>p.approval.source_reference=null,'missing-field'],
 ['false independent',p=>p.approval.kind='independent platform review','approval-kind'],
 ['editable truth',p=>p.approval.source_verified=true,'authority-assertion'],
 ['no real PR',p=>p.approval.pr_url=null,'approval-reference']
])test('US4: '+name+' cannot establish approval',t=>{
 assert.ok(checkPack(t,p=>{withOwner(p);mutate(p);}).some(f=>f.code===code),code);
});
test('US4: even complete attributed owner records are only structurally valid',t=>{
 assert.deepEqual(checkPack(t,withOwner),[]);
 const output=run(['--root',recordRoot(t),'--format','json']);
 assert.equal(output.summary.owner_source_verification,'required');assert.equal(output.merge_authorized,undefined);
});
test('US4: rejected/withdrawn approval cannot support approved phase',t=>{
 for(const decision of ['rejected','withdrawn','changes requested'])
  assert.ok(checkPack(t,p=>{withOwner(p);p.approval.decision=decision;p.phase.delivery_state='approved';}).some(f=>f.code==='approval-state'));
});
test('US4: changed head invalidates approval even if a record asserts current',t=>{
 assert.ok(checkPack(t,withOwner,{observed_head:'d'.repeat(40)}).some(f=>f.code==='approval-stale'));
});
test('US4: fixture matrix separates documentary checks from ten manual outcomes',()=>{
 assert.equal(approvalCases.length,10);
 assert.deepEqual(approvalCases.filter(c=>c.manual_expected==='eligible').map(c=>c.id),['AP-01']);
});
test('US5: blocked/failed overlays require owner and next action',t=>{
 for(const condition of ['blocked','failed'])assert.ok(checkPack(t,p=>p.phase.condition=condition).some(f=>f.code==='missing-field'));
});
for(const state of ['merged','released'])test('US5: '+state+' cannot be asserted without an actual outcome record',t=>{
 assert.ok(checkPack(t,p=>{withOwner(p);p.phase.delivery_state=state;}).some(f=>f.code==='outcome-evidence'));
});
test('US5: missing PR cannot advance review lifecycle',t=>{
 assert.ok(checkPack(t,p=>p.phase.delivery_state='awaiting user approval').some(f=>f.code==='phase-proof'));
});
test('US5: malformed or skipped transition cannot manufacture state',t=>{
 assert.ok(checkPack(t,p=>p.transitions=[{id:'event-1',from:'planned',to:'merged'}]).some(f=>f.code==='transition-order'));
});
test('US5: superseded record cannot erase its referenced history',t=>{
 assert.ok(checkPack(t,p=>p.evidence[0].supersedes='removed').some(f=>f.code==='record-reference'));
});
test('US5: synthetic current history is preserved and read-only',t=>{
 const root=recordRoot(t);const pack=structuredClone(evidenceFixture.valid);const before=JSON.stringify(pack);
 validateEvidencePack(pack,new ReviewIO(root),{observed_head:'a'.repeat(40),comparison_base:'b'.repeat(40),changed_paths:['policy.md'],required_paths:['policy.md']});
 assert.equal(JSON.stringify(pack),before);
});

test('Integration: default policy mode diagnoses absent required sources', t => {
  const result=run(['--root',temporary(t),'--format','json']);
  assert.equal(result.summary.status,'blocked');
  assert.ok(result.findings.some(f=>f.code==='missing-policy'));
});
test('Integration: inherited object names are not CLI options', () => {
  for(const arg of ['constructor','toString','__proto__']) assert.throws(()=>parseArguments([arg,'x']));
});
test('Integration: unknown evidence versions and malformed JSON exit 2 safely',t=>{
  const root=temporary(t);
  for(const value of ['{"schema_version":999}', '{broken']) {
    write(root,'pack.json',value);
    const r=spawnSync(process.execPath,[cli,'--root',root,'--evidence','pack.json'],{encoding:'utf8'});
    assert.equal(r.status,2); assert.doesNotMatch(r.stderr,/at .*\.mjs|broken/);
  }
});
test('Integration: text output is readable and JSON remains structured',t=>{
  const root=temporary(t);
  const text=spawnSync(process.execPath,[cli,'--root',root],{encoding:'utf8'});
  assert.equal(text.status,1); assert.match(text.stdout,/Owner source verification: required/);
  const json=spawnSync(process.execPath,[cli,'--root',root,'--format','json'],{encoding:'utf8'});
  assert.equal(json.status,1); assert.equal(JSON.parse(json.stdout).summary.status,'blocked');
});

test('Integration: exact carry-forward preserves measured identities',t=>{
  const result=checkPack(t,p=>p.snapshot.carry_forward=[{old_head:'a'.repeat(40),old_base:'b'.repeat(40),new_head:'c'.repeat(40),new_base:'b'.repeat(40),content_digest:p.snapshot.content_digest,reason:'Reviewed bytes unchanged',reviewer:'fixture reviewer',recorded_at:'2026-10-17T12:00:00Z',prior_evidence_ids:['ev-1']}],{observed_head:'c'.repeat(40)});
  assert.deepEqual(result,[]);
});
test('Integration: content seal only carries pending uncommitted same-content evidence',t=>{
  function assessment(p) {p.snapshot.carry_forward=[{old_head:'a'.repeat(40),old_base:'b'.repeat(40),new_head:'content-bound',new_base:'b'.repeat(40),content_digest:p.snapshot.content_digest,reason:'Commit seals the exact reviewed bytes',reviewer:'fixture reviewer',recorded_at:'2026-10-17T12:00:00Z',prior_evidence_ids:['ev-1']}];}
  assert.deepEqual(checkPack(t,assessment,{observed_head:'c'.repeat(40),content_seal:true}),[]);
  assert.ok(checkPack(t,assessment,{observed_head:'c'.repeat(40)}).some(f=>f.code==='snapshot-context'));
  assert.ok(checkPack(t,p=>{assessment(p);p.snapshot.content_digest='0'.repeat(64);},{observed_head:'c'.repeat(40),content_seal:true}).some(f=>f.code==='snapshot-digest'));
});
test('Integration: malformed optional snapshot lists fail visibly',t=>{
  assert.ok(checkPack(t,p=>{p.snapshot.unrelated_paths={};p.snapshot.carry_forward={};},{observed_head:'c'.repeat(40)}).some(f=>f.code==='snapshot-unrelated'));
});
test('Integration: evidence containers are excluded explicitly, owned tooling cannot be unrelated',t=>{
  assert.ok(checkPack(t,p=>p.snapshot.reviewed_paths.push('docs/qa/F001.md')).some(f=>f.code==='snapshot-self-reference'));
  assert.ok(checkPack(t,p=>p.snapshot.unrelated_paths.push({path:'tooling/check-governance.mjs',reason:'Skip'})).some(f=>f.code==='snapshot-unrelated'));
});
test('Integration: positive policy, unknown/reused IDs and missing approval rule',t=>{
  const root=temporary(t);
  for(const file of POLICY_PATHS) write(root,file,'# Source\n');
  write(root,'plan.md','### F001 — Scope\n');
  write(root,'specs/001-delivery-governance/spec.md', [ ...Array.from({length:26},(_,i)=>'- **FR-'+String(i+1).padStart(3,'0')+'**: Rule'), ...Array.from({length:7},(_,i)=>'- **SC-'+String(i+1).padStart(3,'0')+'**: Outcome'), ...Array.from({length:22},(_,i)=>(i+1)+'. **A-'+String(i+1).padStart(2,'0')+' — Given** source')].join('\n'));
  write(root,'docs/product/requirements.md','| NFR-014 | Governance |\n');
  write(root,'.github/pull_request_template.md',['Problem and result','Identity and prerequisites','Included and excluded scope','Documentation and source authority','Verification','Agent QA','Impacts and applicability','Recovery and compatibility','Limits and rollout','Owner decision'].map(h=>'## '+h).join('\n'));
  const guide='Explicit user final approval. Independent platform review. Material changes invalidate consent. The tool cannot approve, merge or authenticate.\n';
  write(root,'docs/development/delivery-governance.md',guide);
  assert.deepEqual(validatePolicy(new ReviewIO(root)).findings,[]);
  write(root,'AGENTS.md','NFR-999 F999');
  assert.ok(validatePolicy(new ReviewIO(root)).findings.some(f=>f.code==='unknown-reference'));
  write(root,'plan.md','### F001 — First\n### F001 — Reused\n');
  assert.ok(validatePolicy(new ReviewIO(root)).findings.some(f=>f.code==='duplicate-definition'));
  write(root,'docs/development/delivery-governance.md','Green checks authorize merge.');
  assert.ok(validatePolicy(new ReviewIO(root)).findings.some(f=>f.code==='approval-policy'));
  assert.ok(validatePolicy(new ReviewIO(root)).findings.some(f=>f.code==='approval-bypass'));
});

test('Integration: external credentials are redacted and record procedures stay inert',t=>{
  const root=recordRoot(t),pack=structuredClone(evidenceFixture.valid);
  const marker=path.join(root,'must-not-exist');
  pack.evidence[0].procedure=`node -e "require('fs').writeFileSync('${marker}','executed')"`;
  const result=validateEvidencePack(pack,new ReviewIO(root));
  assert.deepEqual(result,[]);assert.equal(fs.existsSync(marker),false);
  const refs=checkLinks('[source](https://private:secret@example.invalid/token?key=secret)','policy.md',new ReviewIO(root));
  assert.doesNotMatch(JSON.stringify(refs),/private|secret|token/);
});
test('Integration: record count limits are enforced before processing',t=>{
  const root=recordRoot(t),pack=structuredClone(evidenceFixture.valid);
  pack.evidence=Array(2049).fill({});
  assert.throws(()=>validateEvidencePack(pack,new ReviewIO(root)),/bounds/);
});
test('Integration: blocking severity and fixed finding closure cannot be waived',t=>{
  assert.ok(checkPack(t,p=>p.findings=[{id:'finding',severity:'blocker',blocking:false,disposition:'accepted limitation',evidence_refs:['ev-1'],affected_requirements:['FR-014'],observation:'Required gate absent',owner:'fixture',next_action:'Repair',closure_evidence:[]}]).some(f=>f.code==='blocking-finding'));
  assert.ok(checkPack(t,p=>p.findings=[{id:'finding',severity:'major',blocking:true,disposition:'fixed',evidence_refs:['ev-1'],affected_requirements:['FR-014'],observation:'Repaired',owner:'fixture',next_action:'Closed',closure_evidence:['absent']}]).some(f=>f.code==='finding-closure'));
});

test('Integration: actual owning spec definitions cannot be removed or reused',t=>{
  const root=temporary(t);
  for(const file of POLICY_PATHS) write(root,file,fs.readFileSync(file,'utf8'));
  const file='specs/001-delivery-governance/spec.md';
  const original=fs.readFileSync(file,'utf8');
  write(root,file,original.replace('- **FR-026**:', '- **FR-999**:'));
  const result=validatePolicy(new ReviewIO(root));
  assert.ok(result.findings.some(f=>f.code==='local-definition'));
  assert.ok(result.findings.some(f=>f.code==='unknown-reference'&&f.location===file));
});
