import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { envelope } from './records.mjs';
import { safePath } from './artifacts.mjs';
export function git(root,...args) { return execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}).trim(); }
export function makeContext(root,{base,mode='local',event,env=process.env}={}) {
  if(!['local','hosted-pr','hosted-push'].includes(mode))throw new Error('invalid-mode');
  const tested=git(root,'rev-parse','HEAD');
  if(mode!=='local' && (env.GITHUB_ACTIONS!=='true'||!/^\d+$/.test(env.GITHUB_RUN_ID||'')||!event?.repository))throw new Error('hosted-provider-required');
  const proposal=event?.pull_request;
  if(mode==='hosted-pr'&&!proposal?.head?.sha)throw new Error('hosted-provider-required');
  base=base||proposal?.base?.sha||event?.before||tested;
  if(!/^[a-f0-9]{40,64}$/.test(base)||/^0+$/.test(base))throw new Error('base-sha-required');
  git(root,'cat-file','-e',`${base}^{commit}`);
  const tracked=git(root,'diff','--name-only','-z',base,tested).split('\0').filter(Boolean);
  const dirty=git(root,'status','--porcelain');
  const local=mode==='local'?git(root,'ls-files','--modified','--others','--exclude-standard','-z').split('\0').filter(Boolean):[];
  const changed=[...new Set([...tracked,...local])].sort();
  if(changed.length>512)throw new Error('changed-path-limit');
  if(mode!=='local'&&dirty)throw new Error('hosted-clean-checkout-required');
  const c=envelope('context',crypto.randomUUID(),{phase_ids:['F002'],proposal:{repository:event?.repository?.full_name||'local',number:proposal?.number||event?.number||null},execution_mode:mode,proposal_head_sha:proposal?.head?.sha||tested,base_sha:base,tested_sha:tested,working_tree:{state:dirty?'dirty':'clean',files:local.map(p=>({path:p,sha256:fs.existsSync(safePath(root,p))&&fs.statSync(safePath(root,p)).isFile()?crypto.createHash('sha256').update(fs.readFileSync(safePath(root,p))).digest('hex'):null}))},policy_ref:'F002-policy-v1',policy_authority:'bootstrap-candidate',workflow_identity:{path:'.github/workflows/verify.yml'},changed_paths:changed,environment:{os:process.platform,arch:process.arch,node:process.versions.node,cpus:os.cpus().length,memory_bytes:os.totalmem(),image:env.ImageVersion||'local'}});
  if(mode!=='local')c.provider={repository_id:event.repository.id,event:env.GITHUB_EVENT_NAME,run_id:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,raw_head_sha:proposal?.head?.sha||tested,started_at:new Date().toISOString()};
  return c;
}
