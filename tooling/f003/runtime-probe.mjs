import {pack} from '../../tests/f003/fixtures/runtime-pack.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {runProcess,childEnvironment} from '../verification/run-suite.mjs';import {writeRecord,safePath} from '../verification/artifacts.mjs';import {buildFixtures} from './build.mjs';
export function validateObservation(value,engine,version){if(version&&value?.version!==version)throw new Error('runtime-version');if(!value||value.engine!==engine||value.pack!=='F003-runtime-v1'||!Number.isSafeInteger(value.executed)||value.executed!==pack.count||value.passed!==value.executed||value.failed!==0||value.observations?.length!==value.executed||new Set(value.observations.map(x=>x.id)).size!==value.executed||value.observations.some(x=>x.passed!==true||!pack.ids.includes(x.id)))throw new Error('runtime-incomplete');return value;}
export function runtimeExecutable(engine,root=process.cwd()){
 const pins=JSON.parse(fs.readFileSync(path.join(root,'verification/f003-runtime.v1.json'),'utf8'));
 if(engine==='node')return {executable:process.execPath,version:pins.node};
 if(engine==='electron'){const base=path.join(root,'node_modules/electron');const relative=fs.readFileSync(path.join(base,'path.txt'),'utf8').trim();const executable=path.resolve(base,'dist',relative);if(!executable.startsWith(path.resolve(base,'dist')+path.sep))throw new Error('unsafe-electron');return {executable,version:pins.electron};}
 if(engine!=='deno')throw new Error('runtime-kind');
 const asset=pins.deno_assets[`${process.platform}-${process.arch}`];if(!asset)throw new Error('runtime-unavailable');
 const executable=safePath(root,'.verification/f003-tools/deno');if(fs.lstatSync(executable).isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex')!==asset.binary_sha256)throw new Error('runtime-digest');
 return {executable,version:pins.deno};
}
export async function probe(engine,prepared,root=process.cwd()){
 const deadline=Date.now()+60000;
 const built=prepared||await buildFixtures(root),pin=runtimeExecutable(engine,root);
 if(crypto.createHash('sha256').update(fs.readFileSync(built.bundle)).digest('hex')!==built.sha256)throw new Error('stale-bundle');
 const entry=safePath(root,`${built.owned}/${engine}.mjs`);
 const fingerprint=engine==='deno'?"{engine:'deno',version:Deno.version.deno}":`{engine:'${engine}',version:${engine==='electron'?'process.versions.electron':'process.versions.node'},node:process.versions.node}`;
 fs.writeFileSync(entry,`import {runFixtures} from './bundle/conformance.mjs';const codec={encode:t=>new TextEncoder().encode(t),decode:b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b)};console.log(JSON.stringify({...runFixtures(codec),...${fingerprint}}));`,{flag:'wx',mode:0o600});
 if(engine==='deno'){
  const check=await runProcess(pin.executable,['check','--no-config','--no-lock',path.join(root,'tests/f003/runtime/conformance.ts')],{cwd:root,timeout:Math.max(1,deadline-Date.now()),env:childEnvironment({DENO_DIR:safePath(root,`${built.owned}/deno-cache`)})});
  if(check.code!==0||check.reason)throw new Error('deno-source-check');
 }
 const args=engine==='deno'?['run','--no-config','--no-lock','--cached-only','--no-prompt',entry]:[entry];
 const result=await runProcess(pin.executable,args,{cwd:root,timeout:Math.max(1,deadline-Date.now()),env:childEnvironment(engine==='electron'?{ELECTRON_RUN_AS_NODE:'1'}:{})});
 if(result.code!==0||result.reason)throw new Error(`runtime-${engine}-${result.reason||'failed'}`);
 const observation=validateObservation(JSON.parse(result.stdout),engine,pin.version);
 writeRecord(root,`${built.owned}/${engine}.json`,{...observation,bundle_sha256:built.sha256});return observation;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const built=await buildFixtures();const kinds=process.argv[2]==='electron'?['electron']:['node','electron','deno'];const results=[];for(const kind of kinds)results.push(await probe(kind,built));if(new Set(results.map(x=>JSON.stringify(x.observations))).size!==1)throw new Error('runtime-disagreement');console.log(JSON.stringify({status:'passed',owned:built.owned,results:results.map(x=>({engine:x.engine,version:x.version,executed:x.executed,passed:x.passed}))}));}catch(error){console.error(error.message);process.exitCode=1;}
}
