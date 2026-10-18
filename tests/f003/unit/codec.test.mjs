import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decode} from '../../../packages/contracts/src/codec.ts';
const codec={encode:t=>new TextEncoder().encode(t),decode:b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b)};
test('A-05 valid Arabic serialized data round-trips',()=>assert.deepEqual(decode(codec.encode('{"text":"مرحبا"}'),codec),{ok:true,value:{text:'مرحبا'}}));
test('A-02 duplicate decoded names rejected',()=>assert.equal(decode(codec.encode('{"a":1,"\\u0061":2}'),codec).ok,false));
import {encode} from '../../../packages/contracts/src/codec.ts';
import {plainData,Issues} from '../../../packages/contracts/src/validation.ts';
const bad=['{"a":1,}','[1,]','{"a":NaN}','{"a":1} trailing','{"a":9007199254740993}','{"a":"\\ud800"}','{"__proto__":{}}','{"constructor":1}','{"a":-0}'];
for(const text of bad)test(`A-02 malformed ${text}`,()=>assert.equal(decode(codec.encode(text),codec).ok,false));
for(const [label,valid,invalid]of [
 ['members',Object.fromEntries(Array.from({length:64},(_,i)=>['k'+i,0])),Object.fromEntries(Array.from({length:65},(_,i)=>['k'+i,0]))],
 ['array',Array(1000).fill(0),Array(1001).fill(0)],
 ['scalar string','😀'.repeat(4096),'😀'.repeat(4097)],
 ['key','k'.repeat(64),'k'.repeat(65)],
])test(`A-03 ${label} at/beyond limit`,()=>{const a=label==='key'?{[valid]:0}:valid,b=label==='key'?{[invalid]:0}:invalid;assert.equal(decode(codec.encode(JSON.stringify(a)),codec).ok,true);assert.equal(decode(codec.encode(JSON.stringify(b)),codec).ok,false);});
const nested=n=>{let v=0;while(n--)v=[v];return v;};
test('A-03 container depth 16/17',()=>{assert.equal(decode(codec.encode(JSON.stringify(nested(16))),codec).ok,true);assert.equal(decode(codec.encode(JSON.stringify(nested(17))),codec).ok,false);});
test('A-03 node bound 4096/4097',()=>{const a=Array.from({length:4},()=>Array(1000).fill(0));a.push(Array(90).fill(0));assert.equal(decode(codec.encode(JSON.stringify(a)),codec).ok,true);a[4].push(0);assert.equal(decode(codec.encode(JSON.stringify(a)),codec).ok,false);});
test('A-03 original encoded bytes 262144/262145',()=>{const text='{"a":0}';assert.equal(decode(codec.encode(text+' '.repeat(262144-text.length)),codec).ok,true);assert.equal(decode(codec.encode(text+' '.repeat(262145-text.length)),codec).ok,false);});
test('A-03 malformed UTF8 rejected',()=>assert.equal(decode(new Uint8Array([0xc0,0xaf]),codec).ok,false));
test('A-03 object accessors never invoked',()=>{let called=0;const v={get a(){called++;return 1;}};assert.equal(plainData(v).ok,false);assert.equal(called,0);});
for(const [name,v]of [['Date',new Date()],['function',{a:()=>1}],['bigint',{a:1n}],['sparse',Array(2)],['symbol',{[Symbol()]:1}],['undefined',{a:undefined}]])test(`A-03 rejects process value ${name}`,()=>assert.equal(encode(v,codec).ok,false));
test('A-03 issues are capped before allocation',()=>{const issues=new Issues();for(let i=0;i<1000;i++)issues.add('invalid_type',['payload',i]);assert.equal(issues.result().issues.length,32);assert.equal(issues.result().issuesTruncated,true);});
