import fs from 'node:fs';
import {runProcess,testCounts} from '../verification/run-suite.mjs';
import {catalogue} from '../../tests/f003/fixtures/catalogue.mjs';
const manifest=JSON.parse(fs.readFileSync('verification/suites.v1.json','utf8'));
const requested=process.argv[2];if(requested&&!catalogue.suites.includes(requested))throw new Error('unknown-F003-suite');
for(const id of requested?[requested]:catalogue.suites){
 const check=manifest.checks.find(c=>c.id===id);if(!check||check.kind!=='tests'||check.executable!=='$NODE')throw new Error('required-F003-suite-missing');
 const run=await runProcess(process.execPath,check.argv,{cwd:process.cwd(),timeout:check.timeout_ms});
 process.stdout.write(run.stdout);process.stderr.write(run.stderr);
 if(run.code!==0||run.reason)throw new Error(`F003-suite-failed:${id}`);
 testCounts(run.stdout,check.min_tests);
}
