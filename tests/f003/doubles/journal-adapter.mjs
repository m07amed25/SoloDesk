import {request} from '../../../packages/contracts/src/envelopes.ts';import {intent} from '../../../packages/contracts/src/intent.ts';import {registry} from '../fixtures/operations.mjs';import {workspace,otherWorkspace,actor,device,project,tagged} from '../fixtures/context.mjs';import {error,result} from '../fixtures/outcomes.mjs';
export class JournalAdapter {
 constructor(){this.permitted=true;this.available=true;this.projectAllowed=true;this.events=[];this.lookups=0;this.resources=[{id:project.value,workspace:workspace.value,kind:'project'},{id:tagged('project',66).value,workspace:otherWorkspace.value,kind:'project'}];}
 get effects(){return this.events.filter(e=>e.type==='commit').length;}
 allowed(ctx,req){return [this.permitted,this.available,this.projectAllowed,ctx?.actorId?.kind==='actor',ctx?.actorId?.value===actor.value,ctx?.workspaceId?.value===req.workspaceId.value,ctx?.deviceId?.value===device.value,ctx?.sessionObservation==='synthetic-session'].every(Boolean);}
 apply(raw,ctx,mode='commit'){
  const parsed=request(raw,registry);if(!parsed.ok)return {status:'rejected',error:error('VALIDATION')};const req=parsed.value;
  if(!this.allowed(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});
  const projection=intent(req,ctx,registry);if(!projection.ok)return result(req,'rejected',{error:error('FORBIDDEN')});const key=projection.value;
  const previous=this.events.find(e=>e.type==='commit'&&e.scope===key.scope);
  if(previous)return previous.canonical===key.canonical?{...previous.response,requestId:req.requestId}:result(req,'rejected',{error:error('VALIDATION')});
  if(mode==='cancel_before')return result(req,'rejected',{error:error('SERVICE_UNAVAILABLE')});
  if(mode==='local'){this.events.push({type:'local',scope:key.scope});return result(req,'local_saved',{receiptId:tagged('receipt',10),localRevision:'1'});}
  if(mode==='queue')return this.events.some(e=>e.type==='local'&&e.scope===key.scope)?result(req,'queued',{receiptId:tagged('receipt',10),localRevision:'1',queueState:'pending'}):result(req,'rejected',{error:error('VALIDATION')});
  if(mode==='job')return result(req,'job_accepted',{receiptId:tagged('receipt',10),acceptedAt:'2026-10-18T01:02:04.000Z',jobState:'accepted'});
  this.lookups++;const ref=req.payload.reference;
  const resource=this.resources.find(r=>r.id===ref.id.value&&r.workspace===req.workspaceId.value&&r.kind===ref.kind);
  if(!resource)return result(req,'rejected',{error:error('RESOURCE_UNAVAILABLE')});
  const revision=String(this.events.filter(e=>e.type==='commit'&&e.resource===resource.id).length);
  if(req.expectedRevision!==revision)return result(req,'conflict',{error:error('REVISION_CONFLICT'),currentRevision:revision});
  if(!this.allowed(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});
  const committed=result(req,'authoritative_committed',{receiptId:tagged('receipt',10),committedRevision:(BigInt(revision)+1n).toString(),committedAt:'2026-10-18T01:02:04.000Z'});
  this.events.push(Object.freeze({type:'commit',scope:key.scope,canonical:key.canonical,resource:resource.id,response:committed}));
  return ['lose_reply','cancel_after'].includes(mode)?result(req,'outcome_unknown',{error:error('OUTCOME_UNKNOWN','unknown'),reconciliation:req.operationId}):committed;
 }
 resolve(raw,ctx){const p=request(raw,registry);if(!p.ok)return {status:'rejected',error:error('VALIDATION')};const req=p.value;if(!this.allowed(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});const key=intent(req,ctx,registry);if(!key.ok)return result(req,'rejected',{error:error('FORBIDDEN')});const prior=this.events.find(e=>e.type==='commit'&&e.scope===key.value.scope);if(prior&&prior.canonical!==key.value.canonical)return result(req,'rejected',{error:error('VALIDATION')});return prior?{...prior.response,requestId:req.requestId}:result(req,'outcome_unknown',{error:error('OUTCOME_UNKNOWN','unknown'),reconciliation:req.operationId});}
}
