export const tagged=(kind,n=1)=>Object.freeze({kind,value:`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`});
export const workspace=tagged('workspace',1),otherWorkspace=tagged('workspace',2),actor=tagged('actor',3),device=tagged('device',4),project=tagged('project',5);
export const context=Object.freeze({actorId:actor,workspaceId:workspace,deviceId:device,sessionObservation:'synthetic-session',authorityObservation:'synthetic-current'});
export const reference=Object.freeze({kind:'project',id:project,workspaceId:workspace});
export const utf8=Object.freeze({encode:text=>new TextEncoder().encode(text),decode:bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)});
