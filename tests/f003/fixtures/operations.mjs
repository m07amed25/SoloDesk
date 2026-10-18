import {Registry} from '../../../packages/contracts/src/registry.ts';
import {record,ok,fail} from '../../../packages/domain/src/integers.ts';
import {decimal} from '../../../packages/domain/src/decimals.ts';
import {rational} from '../../../packages/domain/src/rationals.ts';
import {money} from '../../../packages/domain/src/money.ts';
import {seconds} from '../../../packages/domain/src/seconds.ts';
import {calendarDate,instant} from '../../../packages/domain/src/dates.ts';
import {scopedReference,plainData} from '../../../packages/contracts/src/validation.ts';
import {tagged,workspace,device,reference} from './context.mjs';
import {values} from './values.mjs';
const echo=(v)=>{
 if(!record(v,['text','decimal','ratio','money','seconds','date','instant'])||typeof v.text!=='string')return fail('invalid_type');
 for(const result of [decimal(v.decimal,true),rational(v.ratio,true),money(v.money),seconds(v.seconds),calendarDate(v.date),instant(v.instant)])if(!result.ok)return result;
 return plainData(v);
};
const recordPayload=(v,tenant)=>{
 if(!record(v,['reference','value']))return fail('invalid_type');
 const ref=scopedReference(v.reference,'project',tenant),value=decimal(v.value,true);if(!ref.ok)return ref;if(!value.ok)return value;
 return ok(Object.freeze({reference:ref.value,value:value.value}));
};
export const registry=new Registry([{owner:'F003',name:'conformance.echo',kind:'query',versions:[1],device:false,revision:'absent',occurrence:false,payload:echo},{owner:'F003',name:'conformance.record',kind:'command',versions:[1],device:true,revision:'required',occurrence:true,payload:recordPayload}]);
export const echoRequest=()=>({protocolVersion:1,payloadVersion:1,boundsProfile:'F003-bounds-v1',kind:'query',operation:'conformance.echo',requestId:tagged('request',6),workspaceId:workspace,payload:structuredClone(values)});
export const recordRequest=()=>({protocolVersion:1,payloadVersion:1,boundsProfile:'F003-bounds-v1',kind:'command',operation:'conformance.record',requestId:tagged('request',6),workspaceId:workspace,deviceId:device,operationId:tagged('operation',7),expectedRevision:'0',occurredAt:'2026-10-18T01:02:03.000Z',payload:{reference:structuredClone(reference),value:{coefficient:'123',scale:2}}});
