// Setup only. Test execution never downloads a missing runtime.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {safePath} from '../verification/artifacts.mjs';
const root=process.cwd(),pins=JSON.parse(fs.readFileSync('verification/f003-runtime.v1.json','utf8'));
const asset=pins.deno_assets[`${process.platform}-${process.arch}`];
if(!asset||process.platform!=='linux')throw new Error('pinned-setup-target-unavailable');
const dir=safePath(root,'.verification/f003-tools');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const archive=path.join(dir,'deno.zip'),executable=path.join(dir,'deno');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let bytes=fs.existsSync(archive)?fs.readFileSync(archive):null;
if(!bytes||hash(bytes)!==asset.zip_sha256){
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('runtime-download-failed');
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>asset.zip_bytes)throw new Error('runtime-download-bound');chunks.push(chunk);}bytes=Buffer.concat(chunks);
}
if(bytes.length!==asset.zip_bytes||hash(bytes)!==asset.zip_sha256)throw new Error('runtime-archive-digest');
fs.writeFileSync(archive,bytes,{mode:0o600});
const names=execFileSync('unzip',['-Z1',archive],{encoding:'utf8',timeout:10000});if(names.trim()!=='deno')throw new Error('runtime-archive-entries');
const binary=execFileSync('unzip',['-p',archive,'deno'],{maxBuffer:200000000,timeout:10000});
if(hash(binary)!==asset.binary_sha256)throw new Error('runtime-binary-digest');
fs.writeFileSync(executable,binary,{mode:0o700});fs.chmodSync(executable,0o700);
console.log(JSON.stringify({runtime:'deno',version:pins.deno,sha256:asset.binary_sha256,status:'verified'}));
