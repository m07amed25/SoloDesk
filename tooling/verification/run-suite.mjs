import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { envelope, readRecord, validateRecord } from './records.mjs';
import { redact, safePath, allocate, writeRecord } from './artifacts.mjs';
import { makeContext } from './context.mjs';
export function childEnvironment(extra={}) {const keys=['PATH','SystemRoot','COMSPEC','PATHEXT','TMP','TEMP','TMPDIR','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','LANG','LC_ALL'];const env={};for(const key of keys)if(process.env[key])env[key]=process.env[key];return {...env,...extra};}
export function runProcess(exe,args,{cwd,timeout=300000,maxBytes=2097152,env=childEnvironment()}={}) {
 return new Promise(resolve=>{let child,stdout='',stderr='',bytes=0,reason='',closed=false;const started=Date.now();
  try{child=spawn(exe,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,detached:process.platform!=='win32'});}catch{resolve({code:2,reason:'unavailable',stdout:'',stderr:'',elapsed_ms:Date.now()-started});return;}
  const kill=signal=>{try{if(process.platform!=='win32')process.kill(-child.pid,signal);else if(signal==='SIGKILL')spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',shell:false});else child.kill(signal);}catch{/* Already closed. */}};
  const stop=why=>{if(reason)return;reason=why;kill('SIGTERM');};
  const timer=setTimeout(()=>stop('timed-out'),timeout);
  const hard=setTimeout(()=>kill('SIGKILL'),timeout+10000);
  const deadline=setTimeout(()=>{if(!closed){kill('SIGKILL');finish(2,'cleanup-failed');}},timeout+20000);
  const signal=()=>stop('canceled');process.once('SIGTERM',signal);process.once('SIGINT',signal);
  const capture=stream=>chunk=>{bytes+=chunk.length;if(bytes>maxBytes){stop('output-limit');return;}if(stream==='out')stdout+=chunk;else stderr+=chunk;};
  child.stdout.on('data',capture('out'));child.stderr.on('data',capture('err'));
  function finish(code,forced){if(closed)return;closed=true;clearTimeout(timer);clearTimeout(hard);clearTimeout(deadline);process.off('SIGTERM',signal);process.off('SIGINT',signal);resolve({code:code??2,reason:forced||reason,stdout:redact(stdout),stderr:redact(stderr),elapsed_ms:Date.now()-started});}
  child.on('error',()=>finish(2,'unavailable'));child.on('close',code=>finish(code));
 });
}
export function testCounts(text,min=1) {
 const get=key=>{const matches=[...text.matchAll(new RegExp(`(?:#|ℹ) ${key} (\\d+)`,'g'))];return matches.length?Number(matches.at(-1)[1]):null;};
 const executed=get('tests'),passed=get('pass'),failed=get('fail'),skipped=get('skipped')??0,todo=get('todo')??0,canceled=get('cancelled')??0;
 if(executed===null||passed===null||failed===null||executed<min||passed!==executed||failed||skipped||todo||canceled)throw new Error('suite-empty-or-incomplete');
 return {kind:'tests',executed,passed,failed,skipped,todo};
}
export async function runCheck(root,check,context,run) {
 const started=new Date().toISOString();const args=check.argv.map(x=>x==='$NODE'?process.execPath:x);const exe=check.executable==='$NODE'?process.execPath:check.executable;
 const result=await runProcess(exe,args,{cwd:root,timeout:check.timeout_ms||300000});
 let status=result.reason==='unavailable'?'unavailable':result.code===0&&!result.reason?'passed':'failed',counts={kind:'inputs',executed:1},reason=result.reason;
 if(status==='passed'&&check.kind==='tests'){try{counts=testCounts(result.stdout,check.min_tests||1);}catch{status='failed';reason='suite-empty-or-incomplete';}}
 return validateRecord(envelope('report',`${run}:${check.id}`,{context_ref:context.id,run_ref:run,check_id:check.id,target_id:check.target||null,command_id:check.id,argv:[exe,...args],producer:{mode:context.execution_mode,job:process.env.GITHUB_JOB||'local'},started_at:started,finished_at:new Date().toISOString(),status,reason_code:reason||null,expected:check.kind==='tests'?'Nonzero complete independent assertions':'Declared command succeeds',observed:{exit:result.code,reason,elapsed_ms:result.elapsed_ms,stdout:result.stdout,stderr:result.stderr},counts,artifacts:[],findings:status==='passed'?[]:[{code:reason||'check-failed'}],cleanup:{status:reason==='cleanup-failed'?'failed':'completed'},tool_versions:{node:process.versions.node}}));
}
export async function command(root,o,output) {
 const manifest=readRecord(path.join(root,'verification/suites.v1.json'));
 const context=o.context?readRecord(safePath(root,o.context)):makeContext(root,{base:o.base,mode:'local'});
 const id=`run-${crypto.randomUUID()}`,scratch=allocate(root,id);writeRecord(root,`${scratch}/context.json`,context);
 let selection;
 if(fs.existsSync(path.join(root,'tooling/verification/selection.mjs')))selection=(await import('./selection.mjs')).selectChecks(context,readRecord(path.join(root,'verification/policy.v1.json')),manifest);
 const group=o.group||(o.profile==='desktop'?'desktop':'baseline');
 if(!['baseline','security','desktop'].includes(group))throw new Error('invalid-group');
 const checks=manifest.checks.filter(c=>c.group===group&&(!o.target||c.target===o.target));
 if(!checks.length)return{exit:2,value:{automated_ready:false,findings:[{code:'group-unavailable'}]}};
 const reports=[];const deadline=Date.now()+2700000;
 for(const check of checks){if(Date.now()>deadline)throw new Error('coordinator-timeout');const report=await runCheck(root,check,context,id);writeRecord(root,`${scratch}/${check.id.replace(/:/g,'-')}.json`,report);reports.push(report);}
 const failed=reports.some(r=>r.status!=='passed');
 const summary={scope_complete:group,full_verification:'incomplete',automated_ready:false,context_ref:context.id,run_ref:id,scratch,reports:reports.map(r=>({check_id:r.check_id,status:r.status,reason:r.reason_code,counts:r.counts})),selected_required:selection?.checks.filter(c=>c.selected).map(c=>c.check_id)||null};
 if(o.profile==='all')return{exit:failed?1:2,value:{...summary,findings:[{code:'all-groups-required-use-hosted-aggregate'}]}};
 return {exit:failed?1:0,value:output(root,o.out,summary)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const suite=process.argv[2];const manifest=readRecord(path.join(process.cwd(),'verification/suites.v1.json'));const c=manifest.checks.find(x=>x.id===suite);if(!c)throw new Error('unknown-suite');
 const r=await runProcess(c.executable==='$NODE'?process.execPath:c.executable,c.argv,{cwd:process.cwd(),timeout:c.timeout_ms});process.stdout.write(r.stdout);process.stderr.write(r.stderr);if(c.kind==='tests'&&r.code===0){try{testCounts(r.stdout,c.min_tests);}catch{r.code=1;}}process.exitCode=r.reason?2:r.code;
}
