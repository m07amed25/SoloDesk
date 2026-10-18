import {intent} from '../../../packages/contracts/src/intent.ts';
import {request} from '../../../packages/contracts/src/envelopes.ts';import {registry} from '../fixtures/operations.mjs';import {workspace,otherWorkspace,actor,device,project,tagged} from '../fixtures/context.mjs';import {error,result} from '../fixtures/outcomes.mjs';
export class MapAdapter {
 constructor(){this.permitted=true;this.available=true;this.projectAllowed=true;this.effects=0;this.lookups=0;this.receipts=new Map();this.locals=new Set();this.resources=new Map([[project.value,{workspace:workspace.value,kind:'project',revision:'0'}],[tagged('project',66).value,{workspace:otherWorkspace.value,kind:'project',revision:'0'}]]);}
 current(ctx,req){return this.permitted&&this.available&&this.projectAllowed&&ctx?.actorId?.kind==='actor'&&ctx.actorId.value===actor.value&&ctx.workspaceId?.value===req.workspaceId.value&&ctx.deviceId?.value===device.value&&ctx.sessionObservation==='synthetic-session';}
 apply(raw,ctx,mode='commit'){const parsed=request(raw,registry);if(!parsed.ok)return Object.freeze({status:'rejected',error:error('VALIDATION')});const req=parsed.value;
  if(!this.current(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});
  const key=intent(req,ctx,registry);if(!key.ok)return result(req,'rejected',{error:error('FORBIDDEN')});
  const prior=this.receipts.get(key.value.scope);if(prior){if(prior.intent!==key.value.canonical)return result(req,'rejected',{error:error('VALIDATION')});return {...prior.result,requestId:req.requestId};}
  if(mode==='cancel_before')return result(req,'rejected',{error:error('SERVICE_UNAVAILABLE')});
  if(mode==='local'){this.locals.add(key.value.scope);return result(req,'local_saved',{receiptId:tagged('receipt',10),localRevision:'1'});}
  if(mode==='queue'){return this.locals.has(key.value.scope)?result(req,'queued',{receiptId:tagged('receipt',10),localRevision:'1',queueState:'pending'}):result(req,'rejected',{error:error('VALIDATION')});}
  if(mode==='job')return result(req,'job_accepted',{receiptId:tagged('receipt',10),acceptedAt:'2026-10-18T01:02:04.000Z',jobState:'accepted'});
  this.lookups++;const ref=req.payload.reference,res=this.resources.get(ref.id.value);
  if(!res||res.workspace!==req.workspaceId.value||res.kind!==ref.kind)return result(req,'rejected',{error:error('RESOURCE_UNAVAILABLE')});
  if(req.expectedRevision!==res.revision)return result(req,'conflict',{error:error('REVISION_CONFLICT'),currentRevision:res.revision});
  if(!this.current(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});
  this.effects++;res.revision=(BigInt(res.revision)+1n).toString();const committed=result(req,'authoritative_committed',{receiptId:tagged('receipt',10),committedRevision:res.revision,committedAt:'2026-10-18T01:02:04.000Z'});
  this.receipts.set(key.value.scope,{intent:key.value.canonical,result:committed});
  return mode==='lose_reply'||mode==='cancel_after'?result(req,'outcome_unknown',{error:error('OUTCOME_UNKNOWN','unknown'),reconciliation:req.operationId}):committed;
 }
 resolve(raw,ctx){const parsed=request(raw,registry);if(!parsed.ok)return {status:'rejected',error:error('VALIDATION')};const req=parsed.value;if(!this.current(ctx,req))return result(req,'rejected',{error:error('FORBIDDEN')});const key=intent(req,ctx,registry);if(!key.ok)return result(req,'rejected',{error:error('FORBIDDEN')});const prior=this.receipts.get(key.value.scope);if(prior&&prior.intent!==key.value.canonical)return result(req,'rejected',{error:error('VALIDATION')});return prior?{...prior.result,requestId:req.requestId}:result(req,'outcome_unknown',{error:error('OUTCOME_UNKNOWN','unknown'),reconciliation:req.operationId});}
}
