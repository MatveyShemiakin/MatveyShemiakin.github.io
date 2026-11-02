import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function api(iso){
 const source=fs.readFileSync('assets/events/events.js','utf8').replace('init();\n})();','window.checkFuture=future;window.checkSubmission=openSubmission;\n})();');
 const RealDate=Date;class Clock extends RealDate{constructor(...a){super(...(a.length?a:[iso]))}static now(){return new RealDate(iso).getTime()}}
 const w={addEventListener(){}};vm.runInNewContext(source,{window:w,document:{addEventListener(){},documentElement:{lang:'en'},body:{dataset:{}}},localStorage:{getItem(){return null}},Date:Clock,Intl});return w;
}
test('a known closing time expires immediately, while a date-only deadline remains on its day',()=>{
 const a=api('2026-11-05T05:00:00Z');assert.equal(a.checkFuture({date:'2026-11-05T13:00:00+09:00',timeKnown:true}),false);assert.equal(a.checkFuture({date:'2026-11-05',timeKnown:false}),true);
});
test('submissions close automatically and scheduled ASRS call starts on its published opening date',()=>{
 const e={end:'2027-07-31',submissionOpen:false,submissionOpens:'2026-12-03',deadlines:[{kind:'abstract',date:'2027-01-28',timeKnown:false}]};
 assert.equal(api('2026-11-02T12:00:00Z').checkSubmission(e),false);assert.equal(api('2026-12-04T12:00:00Z').checkSubmission(e),true);assert.equal(api('2027-01-29T12:00:00Z').checkSubmission(e),false);
 const jos={end:'2027-04-18',submissionOpen:true,deadlines:[{kind:'abstract',date:'2026-11-05T13:00:00+09:00',timeKnown:true}]};assert.equal(api('2026-11-05T05:00:00Z').checkSubmission(jos),false);
});
test('date-only call opening is active from the start of its published calendar day',()=>{
 const e={end:'2027-07-31',submissionOpen:false,submissionOpens:'2026-12-03',deadlines:[{kind:'abstract',date:'2027-01-28',timeKnown:false}]};
 const before=process.env.TZ;process.env.TZ='UTC';try{assert.equal(api('2026-12-03T00:01:00Z').checkSubmission(e),true)}finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before}
});
