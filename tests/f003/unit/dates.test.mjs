import {test} from 'node:test';import assert from 'node:assert/strict';import {calendarDate,instant,timeContext} from '../../../packages/domain/src/dates.ts';
for(const v of ['0001-01-01','9999-12-31','2000-02-29','2028-02-29'])test(`A-11 valid calendar ${v}`,()=>assert.equal(calendarDate(v).value,v));
for(const v of ['1900-02-29','2026-13-01','2026-00-01','2026-02-30','2026-01-00'])test(`A-11 invalid calendar ${v}`,()=>assert.equal(calendarDate(v).ok,false));
test('A-11 date is independent of timezone',()=>{for(const zone of ['UTC','Africa/Cairo','America/New_York'])assert.equal(timeContext({zone,offsetKnown:false},()=>true).ok,true);assert.equal(calendarDate('2028-02-29').value,'2028-02-29');});
for(const offsetMinutes of [-840,840])test(`A-11 original offset ${offsetMinutes}`,()=>assert.equal(timeContext({offsetKnown:true,offsetMinutes},()=>true).ok,true));
test('A-11 UTC boundaries and no precision truncation',()=>{assert.equal(instant('9999-12-31T23:59:59.999Z').ok,true);for(const v of ['9999-12-31T24:00:00.000Z','2026-10-18T01:00:00.000+00:00','2026-10-18T01:00:00.0000Z'])assert.equal(instant(v).ok,false);});
