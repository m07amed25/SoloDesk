import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makeContext } from '../../../tooling/verification/context.mjs';
import { safePath } from '../../../tooling/verification/artifacts.mjs';
function repo(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f002-context-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const git=(...a)=>execFileSync('git',a,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();git('init');git('config','user.name','Synthetic');git('config','user.email','synthetic@example.invalid');fs.writeFileSync(path.join(dir,'base.md'),'base');git('add','.');git('commit','-m','synthetic');return {dir,git};}
test('actual head/base and dirty Unicode file inventory',t=>{const{dir,git}=repo(t);const sha=git('rev-parse','HEAD');fs.writeFileSync(path.join(dir,'مرحبا.md'),'synthetic');const c=makeContext(dir,{base:sha,mode:'local'});assert.equal(c.tested_sha,sha);assert.equal(c.base_sha,sha);assert.equal(c.working_tree.state,'dirty');assert.ok(c.changed_paths.includes('مرحبا.md'));});
test('missing revision and forged hosted context rejected',t=>{const{dir}=repo(t);assert.throws(()=>makeContext(dir,{base:'f'.repeat(40)}));assert.throws(()=>makeContext(dir,{mode:'hosted-pr',event:{}}),/provider|hosted/);});
test('traversal and external symlink rejected',t=>{const{dir}=repo(t);assert.throws(()=>safePath(dir,'../escape'));fs.symlinkSync(os.tmpdir(),path.join(dir,'outside'),'junction');assert.throws(()=>safePath(dir,'outside/file'),/path|symlink/);});
