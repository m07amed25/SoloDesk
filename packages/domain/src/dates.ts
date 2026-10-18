import {ok,fail,record,type Result} from './integers.ts';
export function calendarDate(input:unknown):Result<string>{
  if(typeof input!=='string')return fail('invalid_type');
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input))return fail('invalid_format');
  const [y,m,d]=input.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(y<1||m<1||m>12||d<1||d>days[m-1])return fail('out_of_range');return ok(input);
}
export function instant(input:unknown):Result<string>{
  if(typeof input!=='string')return fail('invalid_type');
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(input))return fail('invalid_format');
  const date=calendarDate(input.slice(0,10));if(!date.ok)return date;
  if(Number(input.slice(11,13))>23||Number(input.slice(14,16))>59||Number(input.slice(17,19))>59)return fail('out_of_range');return ok(input);
}
export function timeContext(input:unknown,lookup:(zone:string)=>boolean):Result<Readonly<{zone?:string;offsetMinutes?:number;offsetKnown:boolean}>>{
  if(!record(input,['zone','offsetMinutes','offsetKnown'],['offsetKnown'])||typeof input.offsetKnown!=='boolean')return fail('invalid_type');
  if(Object.hasOwn(input,'zone')&&(typeof input.zone!=='string'||!/^[A-Za-z][A-Za-z0-9_+/-]{0,63}$/.test(input.zone)||!lookup(input.zone)))return fail('invalid_format');
  if(Object.hasOwn(input,'offsetMinutes')&&(typeof input.offsetMinutes!=='number'||!Number.isInteger(input.offsetMinutes)||Math.abs(input.offsetMinutes)>840||!input.offsetKnown))return fail('out_of_range');
  return ok(Object.freeze({...input}) as {zone?:string;offsetMinutes?:number;offsetKnown:boolean});
}
