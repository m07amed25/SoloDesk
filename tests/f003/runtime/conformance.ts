import {integer,integerOp} from '../../../packages/domain/src/integers.ts';
import {decimalOp} from '../../../packages/domain/src/decimals.ts';
import {toDecimal} from '../../../packages/domain/src/rationals.ts';
import {moneyToDecimal} from '../../../packages/domain/src/money.ts';
import {secondsOp} from '../../../packages/domain/src/seconds.ts';
import {calendarDate,instant} from '../../../packages/domain/src/dates.ts';
import {canonical} from '../../../packages/contracts/src/intent.ts';
import {CODES,ISSUE_KEYS} from '../../../packages/contracts/src/errors.ts';
import {en} from '../../../packages/localization/src/en.ts';
import {ar} from '../../../packages/localization/src/ar.ts';
export function runFixtures(){
 const cases:Readonly<{id:string;actual:unknown;expected:unknown}>[]=[
  {id:'exact-large',actual:integerOp('9007199254740993','1','add'),expected:{ok:true,value:'9007199254740994'}},
  {id:'decimal-sum',actual:decimalOp({coefficient:'1',scale:1},{coefficient:'2',scale:1},'add'),expected:{ok:true,value:{coefficient:'3',scale:1}}},
  {id:'third',actual:toDecimal({numerator:'1',denominator:'3'}),expected:{ok:false,issue:'non_representable'}},
  {id:'eighth',actual:toDecimal({numerator:'1',denominator:'8'}),expected:{ok:true,value:{coefficient:'125',scale:3}}},
  {id:'source-seconds',actual:secondsOp({seconds:'59'},{seconds:'61'},'add'),expected:{ok:true,value:{seconds:'120'}}},
  {id:'leap-valid',actual:calendarDate('2028-02-29'),expected:{ok:true,value:'2028-02-29'}},
  {id:'leap-invalid',actual:calendarDate('2027-02-29'),expected:{ok:false,issue:'out_of_range'}},
  {id:'instant-precision',actual:instant('2026-10-18T01:02:03.0001Z'),expected:{ok:false,issue:'invalid_format'}},
  {id:'float-denial',actual:integer(1.2),expected:{ok:false,issue:'invalid_type'}},
  {id:'canonical-Arabic',actual:canonical({b:'أ',a:['x',1]}),expected:{ok:true,value:'{"a":["x",1],"b":"أ"}'}},
  ...[0,2,3].map(exponent=>({id:`precision-${exponent}`,actual:moneyToDecimal({minorUnits:'123',currency:'XTS',exponent,profileVersion:'synthetic-v1'}),expected:{ok:true,value:{coefficient:'123',scale:exponent}}})),
  ...[...CODES.map(c=>`error.${c.toLowerCase()}`),...ISSUE_KEYS.map(k=>`issue.${k}`)].map(key=>({id:key,actual:Boolean(en[key]?.trim()&&ar[key]?.trim()),expected:true})),
 ];
 const observations=cases.map(v=>({id:v.id,passed:JSON.stringify(v.actual)===JSON.stringify(v.expected),value:v.actual}));
 return {pack:'F003-runtime-v1',executed:observations.length,passed:observations.filter(x=>x.passed).length,failed:observations.filter(x=>!x.passed).length,observations};
}
