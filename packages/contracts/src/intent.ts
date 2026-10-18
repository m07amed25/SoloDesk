import {record,ok,fail,type Result} from '../../domain/src/integers.ts';
import {id} from '../../domain/src/ids.ts';
import {request} from './envelopes.ts';
import {plainData,type Data} from './validation.ts';
import type {Registry} from './registry.ts';
export function canonical(input:unknown):Result<string>{
  const safe=plainData(input);if(!safe.ok)return safe;
  const write=(v:Data):string=>Array.isArray(v)?'['+v.map(write).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+write((v as Record<string,Data>)[k])).join(',')+'}':JSON.stringify(v);
  return ok(write(safe.value));
}
export function intent(raw:unknown,context:unknown,registry:Registry):Result<Readonly<{scope:string;canonical:string;original:Data}>>{
  const parsed=request(raw,registry);if(!parsed.ok)return parsed;const req=parsed.value;
  if(req.kind!=='command'||!record(context,['actorId','workspaceId','deviceId','sessionObservation','authorityObservation'],['actorId','workspaceId','sessionObservation','authorityObservation']))return fail('invalid_type');
  const actor=id(context.actorId,'actor'),workspace=id(context.workspaceId,'workspace');if(!actor.ok)return actor;if(!workspace.ok)return workspace;
  if(workspace.value.value!==req.workspaceId.value||typeof context.sessionObservation!=='string'||!context.sessionObservation||context.sessionObservation.length>64||typeof context.authorityObservation!=='string'||!context.authorityObservation||context.authorityObservation.length>64)return fail('invalid_format');
  if(req.deviceId){const device=id(context.deviceId,'device');if(!device.ok||device.value.value!==req.deviceId.value)return fail('invalid_format');}
  const original={intentVersion:'F003-intent-v1',protocolVersion:req.protocolVersion,payloadVersion:req.payloadVersion,boundsProfile:req.boundsProfile,operation:req.operation,operationId:req.operationId!,workspaceId:req.workspaceId,actorId:actor.value,...(req.deviceId?{deviceId:req.deviceId}:{}),...(req.expectedRevision!==undefined?{expectedRevision:req.expectedRevision}:{}),...(req.occurredAt?{occurredAt:req.occurredAt}:{}),payload:req.payload};
  const bytes=canonical(original);if(!bytes.ok)return bytes;
  return ok(Object.freeze({scope:JSON.stringify([workspace.value.value,actor.value.value,req.operation,req.operationId!.value]),canonical:bytes.value,original:Object.freeze(original)}));
}
