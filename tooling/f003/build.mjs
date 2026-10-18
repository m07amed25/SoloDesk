import path from 'node:path';import crypto from 'node:crypto';import fs from 'node:fs';import {build} from 'vite';import {allocate,safePath} from '../verification/artifacts.mjs';
export async function buildFixtures(root=process.cwd()){
 const owned=allocate(root,`f003-runtime-${crypto.randomUUID()}`),out=safePath(root,`${owned}/bundle`);
 await build({root,configFile:false,logLevel:'silent',build:{target:'es2022',outDir:out,emptyOutDir:false,lib:{entry:path.join(root,'tests/f003/runtime/conformance.ts'),formats:['es'],fileName:()=> 'conformance.mjs'}}});
 const bundle=path.join(out,'conformance.mjs');return {root,owned,bundle,sha256:crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex')};
}
