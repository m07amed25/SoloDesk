import {fail,type Result} from '../../domain/src/integers.ts';
import type {Id} from '../../domain/src/ids.ts';
import type {Data} from './validation.ts';
export type OperationDefinition=Readonly<{owner:string;name:string;kind:'query'|'command';versions:readonly number[];device:boolean;revision:'required'|'absent';occurrence:boolean;payload:(input:unknown,workspace:Id<'workspace'>)=>Result<Data>}>;
/** Definitions are trusted developer registrations, never executable input from a request. */
export class Registry {
  private operations=new Map<string,OperationDefinition>();
  constructor(definitions:readonly OperationDefinition[]){
    for(const d of definitions){
      if(!/^[a-z][a-z0-9.-]{0,63}$/.test(d.name)||!/^F[0-9]{3}$/.test(d.owner)||this.operations.has(d.name)||d.versions.length!==1||d.versions[0]!==1||!['command','query'].includes(d.kind)||!['required','absent'].includes(d.revision)||typeof d.payload!=='function')throw new Error('invalid trusted registration');
      this.operations.set(d.name,Object.freeze({...d,versions:Object.freeze([...d.versions])}));
    }
  }
  get(name:string):OperationDefinition|undefined{return this.operations.get(name);}
  catalogue(){return Object.freeze([...this.operations.values()].map(d=>Object.freeze({owner:d.owner,name:d.name,kind:d.kind,versions:d.versions,device:d.device,revision:d.revision,occurrence:d.occurrence})));}
  validatePayload(name:string,input:unknown,workspace:Id<'workspace'>):Result<Data>{const d=this.operations.get(name);return d?d.payload(input,workspace):fail('invalid_format');}
}
