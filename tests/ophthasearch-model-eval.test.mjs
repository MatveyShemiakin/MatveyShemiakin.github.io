import test from 'node:test';
import assert from 'node:assert/strict';
import {runBenchmark} from '../scripts/ophthasearch-eval/runner.mjs';
const models=['a','b','c'];const cases=[{id:'1'},{id:'2'},{id:'3'},{id:'4'}];
test('benchmark stops at request budget without retries',async()=>{
 let calls=0;const rows=await runBenchmark(models,cases,async()=>{calls++;return {response:'{}'};},{maxCalls:3});
 assert.equal(calls,3);assert.equal(rows.length,3);
});
test('quota exhaustion stops the whole benchmark after one failed call',async()=>{
 let calls=0;const rows=await runBenchmark(models,cases,async()=>{calls++;throw Object.assign(new Error('quota'),{code:4006});});
 assert.equal(calls,1);assert.equal(rows[0].status,'blocked');
});
test('an unavailable model is skipped without retrying its remaining cases',async()=>{
 let calls=0;const rows=await runBenchmark(['bad','good'],cases,async model=>{calls++;if(model==='bad')throw Object.assign(new Error('unavailable'),{status:404});return {response:'{}'};});
 assert.equal(calls,5);assert.equal(rows.filter(r=>r.status==='ok').length,4);
});
