import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDocuments } from '../../../tooling/verification/documentation.mjs';
function root(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'f002-doc-'));t.after(()=>fs.rmSync(d,{force:true,recursive:true}));fs.writeFileSync(path.join(d,'target.md'),'# مرحبا\n\n<a id="explicit"></a>');return d;}
test('Unicode and explicit anchors resolve locally without fetching',t=>{const d=root(t);fs.writeFileSync(path.join(d,'source.md'),'[x](target.md#مرحبا) [y](target.md#explicit) [remote](https://example.invalid/no-network)');assert.deepEqual(checkDocuments(d,['source.md']).findings,[]);});
test('missing target and fragment fail',t=>{const d=root(t);fs.writeFileSync(path.join(d,'source.md'),'[x](missing.md) [y](target.md#absent)');assert.equal(checkDocuments(d,['source.md']).findings.length,2);});
test('traversal and unsupported required references fail',t=>{const d=root(t);fs.writeFileSync(path.join(d,'source.md'),'[x](../private.md)');assert.equal(checkDocuments(d,['source.md']).findings.length,1);});
