import {test} from 'node:test';
import assert from 'node:assert/strict';
import {integer,revision} from '../../../packages/domain/src/integers.ts';
import {id} from '../../../packages/domain/src/ids.ts';
import {decimal} from '../../../packages/domain/src/decimals.ts';
import {rational} from '../../../packages/domain/src/rationals.ts';
import {money} from '../../../packages/domain/src/money.ts';
import {seconds} from '../../../packages/domain/src/seconds.ts';
import {calendarDate,instant,timeContext} from '../../../packages/domain/src/dates.ts';
const uuid='11111111-1111-4111-8111-111111111111';
const cases=[
 ['exact integer beyond binary64',()=>integer('9007199254740993'),{ok:true,value:'9007199254740993'}],
 ['38-digit boundary',()=>integer('9'.repeat(38)),{ok:true,value:'9'.repeat(38)}],
 ['decimal normalization',()=>decimal({coefficient:'120',scale:2}),{ok:true,value:{coefficient:'12',scale:1}}],
 ['decimal zero',()=>decimal({coefficient:'0',scale:18}),{ok:true,value:{coefficient:'0',scale:0}}],
 ['ratio reduction',()=>rational({numerator:'2',denominator:'6'}),{ok:true,value:{numerator:'1',denominator:'3'}}],
 ['ratio zero',()=>rational({numerator:'0',denominator:'6'}),{ok:true,value:{numerator:'0',denominator:'1'}}],
 ['maximum counter',()=>revision('9223372036854775807'),{ok:true,value:'9223372036854775807'}],
 ['valid ID',()=>id({kind:'project',value:uuid},'project'),{ok:true,value:{kind:'project',value:uuid}}],
 ['valid leap day',()=>calendarDate('2028-02-29'),{ok:true,value:'2028-02-29'}],
 ['UTC milliseconds',()=>instant('2026-10-18T01:02:03.000Z'),{ok:true,value:'2026-10-18T01:02:03.000Z'}],
 ['source seconds',()=>seconds({seconds:'61'}),{ok:true,value:{seconds:'61'}}],
];
for(const [label,run,expected] of cases)test(`constructor ${label}`,()=>assert.deepEqual(run(),expected));
const invalid=[
 ['float',()=>integer(123)],['minus zero',()=>integer('-0')],['leading zero',()=>integer('01')],['plus',()=>integer('+1')],['space',()=>integer(' 1')],['localized',()=>integer('١')],['exponent',()=>integer('1e3')],['39 digits',()=>integer('1'.repeat(39))],['counter overflow',()=>revision('9223372036854775808')],['negative counter',()=>revision('-1')],['decimal unknown',()=>decimal({coefficient:'1',scale:0,secret:true})],['decimal scale',()=>decimal({coefficient:'1',scale:19})],['noncanonical decimal',()=>decimal({coefficient:'120',scale:2},true)],['oversized reducible decimal',()=>decimal({coefficient:'1'+'0'.repeat(38),scale:18})],['ratio denominator zero',()=>rational({numerator:'1',denominator:'0'})],['ratio denominator negative',()=>rational({numerator:'1',denominator:'-2'})],['noncanonical ratio',()=>rational({numerator:'2',denominator:'6'},true)],['wrong ID kind',()=>id({kind:'project',value:uuid},'workspace')],['nil ID',()=>id({kind:'project',value:'00000000-0000-0000-0000-000000000000'},'project')],['UUID version 7',()=>id({kind:'project',value:uuid.replace('-4111-','-7111-')},'project')],['impossible leap day',()=>calendarDate('2027-02-29')],['year zero',()=>calendarDate('0000-01-01')],['rollover',()=>calendarDate('2026-04-31')],['unqualified instant',()=>instant('2026-10-18T01:02:03')],['leap second',()=>instant('2026-10-18T01:02:60.000Z')],['extra precision',()=>instant('2026-10-18T01:02:03.0001Z')],['negative seconds',()=>seconds({seconds:'-1'})],['fractional seconds',()=>seconds({seconds:'1.5'})],['offset bound',()=>timeContext({offsetKnown:true,offsetMinutes:841},()=>true)],['unknown offset not UTC',()=>timeContext({offsetKnown:false,offsetMinutes:0},()=>true)],['unknown zone',()=>timeContext({offsetKnown:true,zone:'Invalid/Zone'},()=>false)],
];
for(const [label,run]of invalid)test(`constructor rejects ${label}`,()=>assert.equal(run().ok,false));
for(const exponent of [0,2,3])test(`synthetic currency precision ${exponent}`,()=>assert.equal(money({minorUnits:'123',currency:'XTS',exponent,profileVersion:'synthetic-v1'}).value.exponent,exponent));
test('ordinary negative money rejected and explicit adjustment allowed',()=>{const p={minorUnits:'-1',currency:'XTS',exponent:2,profileVersion:'synthetic-v1'};assert.equal(money(p).ok,false);assert.equal(money({...p,adjustment:true}).ok,true);});
// Controlled hosted gate trial, removed in the repair commit.
test('F003 controlled hosted assertion failure',()=>assert.equal('observed','expected'));
