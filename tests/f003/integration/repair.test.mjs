import {test} from 'node:test';import assert from 'node:assert/strict';import {request} from '../../../packages/contracts/src/envelopes.ts';import {registry,recordRequest} from '../fixtures/operations.mjs';import {compatibility} from '../fixtures/compatibility.mjs';
test('A-32 unsupported pending original is preserved through checked repair',()=>{const raw=JSON.stringify({...recordRequest(),protocolVersion:compatibility.newProtocol});const copy=raw;assert.equal(request(JSON.parse(raw),registry).ok,false);assert.equal(raw,copy);assert.equal(compatibility.migration,false);});
test('A-32 compatible reader still interprets existing version',()=>{const raw=JSON.stringify(recordRequest());assert.equal(request(JSON.parse(raw),registry).ok,true);assert.equal(JSON.stringify(request(JSON.parse(raw),registry).value),raw);});
import {MapAdapter} from '../doubles/map-adapter.mjs';
import {JournalAdapter} from '../doubles/journal-adapter.mjs';
import {context,tagged} from '../fixtures/context.mjs';
import {intent} from '../../../packages/contracts/src/intent.ts';
for(const Adapter of [MapAdapter,JournalAdapter])test(`A-32 ${Adapter.name} backout and explicit forward correction retain accepted history`,()=>{
 const adapter=new Adapter(),original=recordRequest(),originalBytes=intent(original,context,registry).value.canonical;
 const committed=adapter.apply(original,context);assert.equal(committed.committedRevision,'1');
 const incompatible={...original,protocolVersion:2};assert.equal(adapter.apply(incompatible,context).status,'rejected');assert.equal(adapter.effects,1);
 assert.deepEqual(adapter.apply(original,context).receiptId,committed.receiptId);
 const correction={...original,operationId:tagged('operation',88),expectedRevision:'1',payload:{...original.payload,value:{coefficient:'124',scale:2}}};assert.equal(adapter.apply(correction,context).committedRevision,'2');assert.equal(adapter.effects,2);
 assert.equal(intent(original,context,registry).value.canonical,originalBytes);assert.equal(adapter.resolve(original,context).committedRevision,'1');
});
