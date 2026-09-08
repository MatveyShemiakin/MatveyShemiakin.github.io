import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidencePack } from '../workers/ophthasearch-v2/evidence.js';
import { buildReasoningMessages } from '../workers/ophthasearch-v2/reasoner.js';
import { verifyClaimsAndCitations } from '../workers/ophthasearch-v2/citations.js';
import { interpretClinicalQuestion } from '../workers/ophthasearch-v2/query-interpreter.js';
import { runResearchPipeline } from '../workers/ophthasearch-v2/pipeline.js';
import { handleResearchRequest } from '../workers/ophthasearch-v2/pipeline.js';

const intent = {language:'ru',domain:'glaucoma',condition:'primary open-angle glaucoma',question_type:'comparison',interventions:['latanoprost'],comparators:['timolol']};
const question = 'Латанопрост или тимолол при ПОУГ?';
const payload = {schemaVersion:'2.0',language:'ru',question,mode:'standard',filters:{}};
const article = {title:'Latanoprost versus timolol in primary open-angle glaucoma: randomized trial', abstractText:'Patients with glaucoma were randomized to latanoprost or timolol monotherapy. Latanoprost reduced intraocular pressure more than timolol.',doi:'10.1000/direct',publicationTypes:['Randomized Controlled Trial']};
const pack = () => ({...buildEvidencePack(intent,[article]),question});
const draft = (line) => ({schemaVersion:'2.0',clinical_bottom_line:line,bottom_line_citations:['S1'],confidence:'moderate',management:[],sources:[]});

test('passes the original clinical question to synthesis without discarding qualifiers', () => {
  const messages = buildReasoningMessages(pack());
  assert.equal(JSON.parse(messages[1].content).question, question);
});
test('rejects a conclusion that swaps timolol for netarsudil despite a valid citation ID', () => {
  assert.throws(()=>verifyClaimsAndCitations(draft('Латанопрост эффективнее нетарсудила.'),pack()), /comparison|question/i);
});
test('accepts a conclusion naming the actual comparison in Russian inflection', () => {
  assert.match(verifyClaimsAndCitations(draft('Снижение ВГД при использовании латанопроста больше, чем при применении тимолола.'),pack()).clinical_bottom_line,/тимолола/);
});
test('does not use a source about a different comparator to support the main comparison', () => {
  const p=pack(); p.sources[0].title='Latanoprost versus netarsudil in glaucoma'; p.sources[0].abstract_or_summary='Latanoprost was compared with netarsudil.';
  assert.throws(()=>verifyClaimsAndCitations(draft('Латанопрост эффективнее тимолола.'),p), /comparison|evidence/i);
});
test('human clinical evidence excludes explicit animal studies', () => {
  const p=buildEvidencePack(intent,[article,{...article,doi:'10.1000/cat',title:'Latanoprost versus timolol in normal feline eyes',abstractText:'An experimental study in cats with glaucoma.'}]);
  assert.equal(p.sources.length,1);
});
test('empty retrieval reports no evidence rather than an unavailable model or available sources', async () => {
  const r=await runResearchPipeline(payload,{}, {adapters:{},guidelineFinder:()=>[]});
  assert.equal(r.diagnostics.reason,'NO_EVIDENCE');
  assert.doesNotMatch(r.answer.clinical_bottom_line,/Доступен проверенный набор|reasoning-модели/);
});
test('quota errors have a distinct machine-readable reason', async () => {
  const r=await runResearchPipeline(payload,{}, {adapters:{pubmed:async()=>({records:[article]})},guidelineFinder:()=>[],reasoner:async()=>{throw new Error('4006: daily free allocation exhausted');}});
  assert.equal(r.diagnostics.reason,'AI_QUOTA_EXCEEDED');
});

const comparisons=[
 ['Тимолол или латанопрост при ПОУГ?','timolol','latanoprost'],
 ['Латанопрост или тимолол при ПОУГ?','latanoprost','timolol'],
 ['Travoprost versus timolol for glaucoma','travoprost','timolol'],
 ['Bimatoprost versus latanoprost for glaucoma','bimatoprost','latanoprost'],
 ['Tafluprost versus timolol for glaucoma','tafluprost','timolol'],
 ['Brimonidine versus dorzolamide for glaucoma','brimonidine','dorzolamide'],
 ['Brinzolamide versus dorzolamide for glaucoma','brinzolamide','dorzolamide'],
 ['Netarsudil versus latanoprost for glaucoma','netarsudil','latanoprost'],
 ['Aflibercept versus ranibizumab for macular edema','aflibercept','ranibizumab'],
 ['Faricimab versus aflibercept for macular edema','faricimab','aflibercept'],
 ['Bevacizumab versus ranibizumab for macular edema','bevacizumab','ranibizumab'],
 ['Brolucizumab versus aflibercept for macular edema','brolucizumab','aflibercept'],
 ['Латанопрост против травопроста при глаукоме','latanoprost','travoprost'],
 ['Тимолол против бримонидина при глаукоме','timolol','brimonidine'],
 ['Афлиберцепт или ранибизумаб при макулярном отеке?','aflibercept','ranibizumab'],
 ['Фарицимаб или афлиберцепт при макулярном отеке?','faricimab','aflibercept'],
 ['Дорзоламид или бринзоламид при глаукоме?','dorzolamide','brinzolamide'],
 ['Тафлупрост или латанопрост при глаукоме?','tafluprost','latanoprost'],
 ['Бевацизумаб или афлиберцепт при макулярном отеке?','bevacizumab','aflibercept'],
 ['Травопрост или биматопрост при глаукоме?','travoprost','bimatoprost']
];
for(const [q,a,b] of comparisons) test(`preserves comparison arms in order: ${q}`,async()=>{
  const r=await interpretClinicalQuestion({...payload,question:q});
  assert.equal(r.question_type,'comparison');
  assert.deepEqual(r.interventions,[a]); assert.deepEqual(r.comparators,[b]);
});

test('a known named comparison does not spend an AI call interpreting the question', async () => {
  let calls=0;
  await runResearchPipeline(payload,{AI:{run:async()=>{calls++; throw new Error('should not interpret');}}},{adapters:{},guidelineFinder:()=>[]});
  assert.equal(calls,0);
});

test('successful generic queries are cached and failures are not', async () => {
  const entries=new Map(); let calls=0;
  const cache={match:async r=>entries.get(r.url)?.clone(),put:async(r,v)=>{entries.set(r.url,v.clone());}};
  const deps={cache,researchPipeline:async()=>{calls++;return {schemaVersion:'2.0',status:'complete',intent,plan:[],diagnostics:{},answer:{...draft('Латанопрост эффективнее тимолола.'),sources:pack().sources}};}};
  const request=()=>new Request('https://api.test/v2/research',{method:'POST',headers:{Origin:'https://matveyshemyakin.ru','Content-Type':'application/json'},body:JSON.stringify(payload)});
  await handleResearchRequest(request(),{},null,deps);
  const second=await (await handleResearchRequest(request(),{},null,deps)).json();
  assert.equal(calls,1); assert.equal(second.result.diagnostics.cached,true);
  entries.clear(); calls=0; deps.researchPipeline=async()=>{calls++;return {status:'evidence_only',answer:{sources:[]},diagnostics:{}};};
  await handleResearchRequest(request(),{},null,deps); await handleResearchRequest(request(),{},null,deps);
  assert.equal(calls,2);
});

const {requestResearch}=await import('../for-doctors/ophthasearch-v2/ophthasearch-v2.js');
test('browser search has a bounded wait even when the network never settles',async()=>{
  await assert.rejects(()=>requestResearch('glaucoma','en',{timeoutMs:15,fetchImpl:()=>new Promise(()=>{})}),/time|long/i);
});

const {providerFetch,cachedResearch,cacheableQuestion}=await import('../workers/ophthasearch-v2/runtime.js');
test('NCBI calls are paced and transient rejection is retried',async()=>{
  const starts=[];
  const fetcher=providerFetch(async()=>{starts.push(Date.now());return new Response('{}',{status:starts.length===1?429:200});});
  const result=await fetcher('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
  assert.equal(result.status,200); assert.equal(starts.length,2); assert.ok(starts[1]-starts[0]>=750);
});
test('aborted provider requests do not reach the upstream service',async()=>{
  let calls=0;const controller=new AbortController();controller.abort();
  await assert.rejects(()=>providerFetch(async()=>{calls++;})('https://eutils.ncbi.nlm.nih.gov/test',{signal:controller.signal}),/aborted/);
  assert.equal(calls,0);
});
test('patient narratives and numerical clinical measurements bypass shared cache',()=>{
  assert.equal(cacheableQuestion({...payload,question:'Пациент 65 лет, ВГД 28'}),false);
  assert.equal(cacheableQuestion({...payload,question:'A patient with glaucoma'}),false);
});
test('concurrent identical generic requests share one computation',async()=>{
  let calls=0;let resolve;
  const gate=new Promise(r=>{resolve=r;});
  const cache={match:async()=>null,put:async()=>{}};
  const compute=async()=>{calls++;await gate;return {status:'evidence_only'};};
  const req=new Request('https://api.test/v2/research');
  const a=cachedResearch(req,payload,compute,cache);const b=cachedResearch(req,payload,compute,cache);
  await new Promise(r=>setTimeout(r,10));resolve();await Promise.all([a,b]);assert.equal(calls,1);
});

test('combination slash is not evidence of opposing monotherapy arms',()=>{
  const p=pack();p.sources[0].title='Latanoprost/timolol versus bimatoprost for glaucoma';p.sources[0].abstract_or_summary='Fixed-combination comparison.';
  assert.throws(()=>verifyClaimsAndCitations(draft('Латанопрост эффективнее тимолола.'),p),/comparison/);
});
test('animal population explicitly present only in abstract is excluded',()=>{
  const p=buildEvidencePack(intent,[{...article,abstractText:'We randomized rabbits with induced glaucoma to latanoprost or timolol.'}]);
  assert.equal(p.sources.length,0);
});
test('Russian SLT comparison uses canonical procedure aliases',()=>{
  const i={...intent,interventions:['selective laser trabeculoplasty'],comparators:['latanoprost']};
  const p=buildEvidencePack(i,[{...article,title:'Selective laser trabeculoplasty versus latanoprost in primary open-angle glaucoma'}]);
  assert.doesNotThrow(()=>verifyClaimsAndCitations(draft('Селективная лазерная трабекулопластика сравнивается с латанопростом; вывод ограничен.'),p));
});
test('first-person narratives bypass shared cache',()=>{
  for(const q of ['У меня глаукома и астма, можно ли тимолол?','I have glaucoma and asthma; can I use timolol?']) assert.equal(cacheableQuestion({...payload,question:q}),false);
});

// Offline end-to-end contract fixtures: retrieval -> selection -> citation/arm checks -> response.
// These validate program behavior, not clinical efficacy or model accuracy.
const clinicalScenarios=[
 ['glaucoma','primary open-angle glaucoma','latanoprost','timolol'],
 ['glaucoma','glaucoma','travoprost','timolol'],
 ['glaucoma','glaucoma','bimatoprost','latanoprost'],
 ['glaucoma','glaucoma','brimonidine','dorzolamide'],
 ['glaucoma','glaucoma','tafluprost','latanoprost'],
 ['retina','macular edema','aflibercept','ranibizumab'],
 ['retina','macular edema','faricimab','aflibercept'],
 ['retina','macular edema','bevacizumab','ranibizumab'],
 ['glaucoma','glaucoma','netarsudil','latanoprost'],
 ['glaucoma','glaucoma','brinzolamide','dorzolamide'],
 ['glaucoma','glaucoma','selective laser trabeculoplasty','latanoprost'],
 ['glaucoma','glaucoma','trabeculectomy','tube shunt'],
 ['retina','retinal detachment','pars plana vitrectomy','scleral buckling'],
 ['retina','full-thickness macular hole','inverted ILM flap','internal limiting membrane peeling'],
 ['lens-iol','intraocular lens dislocation','Yamane fixation','sutured scleral fixation'],
 ['cornea','keratoconus','penetrating keratoplasty','deep anterior lamellar keratoplasty'],
 ['cornea','endothelial dystrophy','DMEK','DSAEK'],
 ['lens-iol','cataract','phacoemulsification','femtosecond laser-assisted cataract surgery'],
 ['glaucoma','normal-tension glaucoma','latanoprost','timolol'],
 ['retina','diabetic macular edema','faricimab','ranibizumab']
];
for (const [domain,condition,a,b] of clinicalScenarios) test(`offline pipeline: ${a} vs ${b} / ${condition}`,async()=>{
  const i={...intent,domain,condition,interventions:[a],comparators:[b]};
  const q=`${a} versus ${b} for ${condition}?`;
  const record={...article,title:`${a} versus ${b} for ${condition}`,abstractText:`A comparative trial examined ${a} versus ${b} for ${condition}. This is a synthetic test fixture, not clinical evidence.`};
  const adapter=async()=>({records:[record,{...article,doi:'10.1000/unrelated',title:'Unrelated diagnostic imaging',abstractText:'A different disease.'}]});
  const r=await runResearchPipeline({...payload,question:q}, {}, {
    interpreter:async()=>i,
    adapters:Object.fromEntries(['pubmed','europepmc','jstage','clinicaltrials','openalex','crossref'].map(k=>[k,adapter])),
    guidelineFinder:()=>[],
    reasoner:async p=>{
      assert.equal(p.question,q);assert.equal(p.sources.length,1);
      assert.throws(()=>verifyClaimsAndCitations(draft(`${a} compared with an unrelated intervention.`),p),/comparison/);
      return verifyClaimsAndCitations(draft(`Evidence comparing ${a} with ${b} is limited.`),p);
    }
  });
  assert.equal(r.status,'complete');assert.equal(r.answer.sources.length,1);assert.deepEqual(r.answer.bottom_line_citations,['S1']);
});

test('an abstract about A/B combination versus C cannot support A versus B',()=>{
  const p=pack();p.sources[0].title='Comparative glaucoma therapy';p.sources[0].abstract_or_summary='Latanoprost/timolol was compared with bimatoprost in glaucoma.';
  assert.throws(()=>verifyClaimsAndCitations(draft('Латанопрост эффективнее тимолола.'),p),/comparison/);
});

const {search:searchEurope}=await import('../workers/ophthasearch-v2/adapters/europepmc.js');
const {buildResearchPlan}=await import('../workers/ophthasearch-v2/research-planner.js');
test('primary comparison retrieval searches named treatments in titles, not incidental full-text mentions',async()=>{
  let actual;
  await searchEurope(buildResearchPlan(intent).find(t=>t.id==='efficacy'),{fetchImpl:async url=>{actual=new URL(url).searchParams.get('query');return Response.json({resultList:{result:[]}});}});
  assert.match(actual,/TITLE:"latanoprost"/);assert.match(actual,/TITLE:"timolol"/);
});

for (const title of ['Co-delivery of latanoprost and timolol for glaucoma', 'Additive effect of latanoprost and timolol', 'Latanoprost in glaucoma patients treated concomitantly with timolol', 'Effects of latanoprost and timolol: an ex vivo and in vitro study']) test(`excludes non-comparative evidence: ${title}`,()=>{
  const p=pack();p.sources[0].title=title;
  assert.throws(()=>verifyClaimsAndCitations(draft('Латанопрост эффективнее тимолола.'),p),/comparison/);
});

test('recognizes Russian anterior neuropathy separately from English posterior PION and citicoline', async()=>{
  const a=await interpretClinicalQuestion({...payload,question:'Цитиколин в терапии ПИОН'});
  assert.equal(a.condition,'anterior ischemic optic neuropathy');assert.ok(a.interventions.includes('citicoline'));
  const b=await interpretClinicalQuestion({...payload,language:'en',question:'Citicoline for PION'});
  assert.equal(b.condition,'posterior ischemic optic neuropathy');
});
test('rare neuropathy query excludes stroke-only evidence and retains NAION aliases',()=>{
  const i={language:'ru',domain:'neuro-ophthalmology',condition:'anterior ischemic optic neuropathy',question_type:'therapy',interventions:['citicoline'],comparators:[]};
  const p=buildEvidencePack(i,[{title:'Citicoline in NAION: randomized pilot study',abstractText:'Patients with NAION received citicoline treatment.',pmid:'1'}, {title:'Citicoline for stroke',abstractText:'Citicoline treatment improved visual function after stroke.',pmid:'2'}]);
  assert.deepEqual(p.sources.map(s=>s.pmid),['1']);assert.ok(p.sources[0].quality_flags.includes('pilot-study'));
});
test('pilot-only support cannot become a routine treatment recommendation',()=>{
  const p=pack();p.intent.question_type='therapy';p.sources[0].quality_flags=['pilot-study'];
  const a=verifyClaimsAndCitations({...draft('Предварительные данные об эффективности латанопроста.'),confidence:'high',management:[{action:'Start treatment',citations:['S1']}]},p);
  assert.equal(a.confidence,'low');assert.equal(a.management.length,0);assert.ok(a.uncertainties.length);
});

test('Crossref search includes smaller-journal abstracts and uses primary retrieval track',async()=>{
  const {search}=await import('../workers/ophthasearch-v2/adapters/crossref.js');
  assert.equal(typeof search,'function');
  const primary=buildResearchPlan({...intent,question_type:'therapy',condition:'anterior ischemic optic neuropathy',interventions:['citicoline'],comparators:[]}).find(t=>t.id==='efficacy');
  assert.ok(primary.sourceClasses.includes('crossref'));
  const r=await search(primary,{fetchImpl:async url=>{
    assert.ok(new URL(url).searchParams.get('query.bibliographic').includes('citicoline'));
    return Response.json({message:{'total-results':1,items:[{DOI:'10.1000/rare',type:'journal-article',title:['Citicoline in NAION'],abstract:'<jats:p>Not statistically significant versus placebo.</jats:p>'}]}});
  }});
  assert.equal(r.records[0].doi,'10.1000/rare');assert.match(r.records[0].abstractText,/Not statistically significant/);assert.doesNotMatch(r.records[0].abstractText,/<jats/);
});
