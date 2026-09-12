import {writeFile,appendFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {cases} from './cases.mjs';
import {buildReasoningMessages,buildReasoningSchema} from '../../workers/ophthasearch-v2/reasoner.js';
import {parseStructuredModelResponse} from '../../workers/ophthasearch-v2/structured-response.js';
import {verifyClaimsAndCitations} from '../../workers/ophthasearch-v2/citations.js';
export const models=['@cf/google/gemma-4-26b-a4b-it','@cf/qwen/qwen3-30b-a3b-fp8','@cf/openai/gpt-oss-120b'];
export async function runBenchmark(modelList,caseList,run,{maxCalls=9,onResult=()=>{}}={}) {
 const rows=[];let calls=0;
 for(const model of modelList) for(const c of caseList){
  if(calls>=Math.min(9,Math.max(0,maxCalls)))return rows;
  calls++;const start=Date.now();let row;
  try{row={model,caseId:c.id,status:'ok',result:await run(model,c)};}
  catch(e){row={model,caseId:c.id,status:[401,403,429].includes(e.status)||e.code===4006?'blocked':'error',error:{status:e.status||null,code:e.code||null,message:String(e.message).slice(0,180)}};}
  row.elapsedMs=Date.now()-start;rows.push(row);await onResult(row);
  if(row.status==='blocked')return rows;
  if(row.status==='error')break;
 }
 return rows;
}
async function main(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 if(!account||!token)throw new Error('Existing Cloudflare credentials are required; no requests sent');
 await mkdir('eval-results',{recursive:true});
 await writeFile('eval-results/manifest.json',JSON.stringify({date:new Date().toISOString(),commit:process.env.GITHUB_SHA,models,maxCalls:9,maxOutputTokensPerCall:2400,cases:cases.map(c=>({id:c.id,rubric:c.rubric,evidenceHash:createHash('sha256').update(JSON.stringify(c.pack)).digest('hex')})),note:'Curated evidence summaries, single sample per cell. Human clinical review required. No production model switch.'},null,2));
 const rows=await runBenchmark(models,cases,async(model,c)=>{
  const messages=buildReasoningMessages(c.pack);
  const params={messages,response_format:{type:'json_schema',json_schema:buildReasoningSchema(c.pack.sources.map(s=>s.source_id))},temperature:0.1};
  if(model.includes('/gemma-'))Object.assign(params,{max_completion_tokens:2400,chat_template_kwargs:{enable_thinking:false},reasoning_effort:'low'});
  else Object.assign(params,{max_tokens:2400});
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(55000)});
  const body=await response.json();
  if(!response.ok||body.success===false)throw Object.assign(new Error(`Cloudflare inference failed (HTTP ${response.status})`),{status:response.status,code:body.errors?.[0]?.code});
  const result=body.result;let draft,verified,validationError;
  try{draft=parseStructuredModelResponse(result);verified=verifyClaimsAndCitations(draft,c.pack);}catch(e){validationError=String(e.message);}
  return {usage:result?.usage||null,raw:result,draft: draft||null,verified:verified||null,validationError:validationError||null};
 },{onResult:async row=>{await appendFile('eval-results/results.jsonl',JSON.stringify(row)+'\n');console.log('EVAL_RESULT '+JSON.stringify(row));}});
 console.log(`Benchmark completed: ${rows.length} requests; no automatic retries or model switch.`);
 if(rows.some(r=>r.status==='blocked'))process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(String(e.message));process.exitCode=1;});
