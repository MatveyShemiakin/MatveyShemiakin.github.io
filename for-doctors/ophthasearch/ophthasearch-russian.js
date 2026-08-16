const CONCEPTS = [
  ['population','full-thickness macular hole',['макулярный разрыв','полнослойный макулярный разрыв']],
  ['population','diabetic macular edema',['диабетический макулярный отек','диабетический макулярный отёк','дмо']],
  ['population','neovascular age-related macular degeneration',['неоваскулярная вмд','влажная вмд']],
  ['population','age-related macular degeneration',['возрастная макулярная дегенерация','возрастная макулярная дистрофия','вмд']],
  ['population','epiretinal membrane',['эпиретинальная мембрана','эпиретинальный фиброз','эрм']],
  ['population','rhegmatogenous retinal detachment',['регматогенная отслойка сетчатки','рос']],
  ['population','retinal detachment',['отслойка сетчатки']],
  ['population','proliferative diabetic retinopathy',['пролиферативная диабетическая ретинопатия','пдр']],
  ['population','diabetic retinopathy',['диабетическая ретинопатия']],
  ['population','normal-tension glaucoma',['глаукома нормального давления','нормотензивная глаукома']],
  ['population','primary open-angle glaucoma',['первичная открытоугольная глаукома','открытоугольная глаукома','поуг']],
  ['population','angle-closure glaucoma',['закрытоугольная глаукома','зоуг']],
  ['population','glaucoma',['глаукома']],
  ['population','cataract',['катаракта']],
  ['population','intraocular lens dislocation',['дислокация иол','смещение иол','дислокация интраокулярной линзы']],
  ['population','keratoconus',['кератоконус']],
  ['population','bacterial keratitis',['бактериальный кератит']],
  ['population','infectious keratitis',['инфекционный кератит']],
  ['population','corneal ulcer',['язва роговицы']],
  ['population','Fuchs endothelial corneal dystrophy',['эндотелиальная дистрофия фукса','дистрофия фукса']],
  ['population','corneal graft failure',['болезнь трансплантата роговицы','несостоятельность трансплантата роговицы']],
  ['population','anterior uveitis',['передний увеит']],
  ['population','uveitis',['увеит']],
  ['population','endophthalmitis',['эндофтальмит']],
  ['population','retinal vein occlusion',['окклюзия вен сетчатки','тромбоз вен сетчатки']],

  ['intervention','inverted ILM flap',['инвертированный лоскут впм','инвертированный лоскут внутренней пограничной мембраны']],
  ['intervention','internal limiting membrane peeling',['стандартный пилинг впм','пилинг впм','пилинг внутренней пограничной мембраны']],
  ['intervention','pars plana vitrectomy',['витрэктомия','витреэктомия']],
  ['intervention','trabeculectomy',['трабекулэктомия']],
  ['intervention','minimally invasive glaucoma surgery',['мигс','минимально инвазивная хирургия глаукомы']],
  ['intervention','glaucoma drainage device',['глаукомный дренаж','дренажная хирургия глаукомы']],
  ['intervention','aflibercept',['афлиберцепт']],
  ['intervention','faricimab',['фарицимаб']],
  ['intervention','ranibizumab',['ранибизумаб']],
  ['intervention','bevacizumab',['бевацизумаб']],
  ['intervention','brolucizumab',['бролуцизумаб']],
  ['intervention','anti-VEGF therapy',['анти-вегф терапия','анти вегф терапия','анти-vegf терапия']],
  ['intervention','phacoemulsification',['факоэмульсификация','факоэмульсификация катаракты']],
  ['intervention','intraocular lens fixation',['фиксация иол','подшивание иол','шовная фиксация иол']],
  ['intervention','scleral fixation of intraocular lens',['склеральная фиксация иол']],
  ['intervention','DMEK',['дмек','десцеметова мембранная эндотелиальная кератопластика']],
  ['intervention','DSAEK',['дсаэк','эндотелиальная кератопластика dsaek']],
  ['intervention','penetrating keratoplasty',['сквозная кератопластика','скп']],
  ['intervention','corneal cross-linking',['кросслинкинг','кросс-линкинг']],

  ['outcome','best corrected visual acuity',['максимально корригированная острота зрения','острота зрения','мкоз']],
  ['outcome','anatomical closure',['анатомическое закрытие','закрытие разрыва']],
  ['outcome','intraocular pressure',['внутриглазное давление','вгд']],
  ['outcome','visual field progression',['прогрессирование поля зрения']],
  ['outcome','recurrence',['рецидив','рецидивирование']],
  ['outcome','complications',['осложнение','осложнения']],
  ['outcome','endothelial cell density',['плотность эндотелиальных клеток','эндотелиальная плотность']],
  ['outcome','graft survival',['выживаемость трансплантата']]
];

const LATIN_STOP = new Set(['is','are','does','do','did','what','which','the','a','an','of','in','for','with','to','from','after','before','than','or','and','versus','vs','compared','comparison','among','patients','patient']);

function normalize(value){return String(value||'').toLowerCase().replace(/ё/g,'е').replace(/[–—]/g,'-').replace(/[^a-zа-я0-9+./<>≥≤µ-]+/gi,' ').replace(/\s+/g,' ').trim();}
function ruStem(word){let w=normalize(word);if(!/[а-я]/.test(w)||w.length<5)return w;const endings=['иями','ями','ами','ого','ему','ому','ыми','ими','ая','яя','ую','юю','ые','ие','ых','их','ый','ий','ой','ым','им','ом','ем','ах','ях','ов','ев','ам','ям','у','ю','а','я','ы','и','е'];for(const ending of endings){if(w.endsWith(ending)&&w.length-ending.length>=4)return w.slice(0,-ending.length);}return w;}
function tokenise(value){return normalize(value).split(' ').filter(Boolean);}
function tokenEquivalent(a,b){if(a===b)return true;if(/[а-я]/.test(a)&&/[а-я]/.test(b))return ruStem(a)===ruStem(b);return false;}
function phraseMatches(question,phrase){const q=tokenise(question),p=tokenise(phrase);if(!p.length)return false;let cursor=0;for(const pt of p){let found=false;for(let i=cursor;i<q.length;i+=1){if(tokenEquivalent(q[i],pt)){cursor=i+1;found=true;break;}}if(!found)return false;}return true;}
function unique(values){return[...new Set(values.filter(Boolean))];}
function quote(term){return /\s/.test(term)?`"${term}"`:term;}
function detectType(question){const q=normalize(question);if(/преимущ|эффективн|лучше|сравн/.test(q))return'comparison';if(/безопас|осложн|риск/.test(q))return'safety';if(/диагност|точност|чувствительност|специфичност/.test(q))return'diagnosis';if(/прогноз|исход/.test(q))return'prognosis';if(/лечен|помогает|работает/.test(q))return'effectiveness';return'general';}

export function normalizeRussianClinicalQuestion(question){
  const original=String(question||'').trim();
  if(!/[а-яё]/i.test(original))return{original,language:'en',searchQuery:original,questionType:detectType(original),pico:{population:'',intervention:'',comparator:'',outcome:''},concepts:[],coverage:'native'};
  const found=[];
  for(const[category,term,aliases]of CONCEPTS){if(aliases.some((alias)=>phraseMatches(original,alias))&&!found.some((x)=>x.category===category&&x.term===term))found.push({category,term});}
  const terms=found.map((x)=>x.term);
  const latin=original.match(/[A-Za-z][A-Za-z0-9+./-]{1,}/g)||[];for(const token of latin)if(!LATIN_STOP.has(token.toLowerCase()))terms.push(token);
  const numbers=original.match(/(?:>|<|≥|≤)?\s?\d+(?:[.,]\d+)?\s?(?:µm|um|мкм|mm|мм)?/gi)||[];for(const n of numbers)terms.push(n.replace(/мкм/gi,'µm').replace(/мм/gi,'mm').replace(/\s+/g,''));
  const populations=found.filter((x)=>x.category==='population'),interventions=found.filter((x)=>x.category==='intervention'),outcomes=found.filter((x)=>x.category==='outcome');
  return{original,language:'ru',searchQuery:unique(terms).map(quote).join(' ')||original,questionType:detectType(original),pico:{population:populations[0]?.term||'',intervention:interventions[0]?.term||'',comparator:interventions[1]?.term||'',outcome:outcomes[0]?.term||''},concepts:found,coverage:found.length>=2?'high':found.length===1?'partial':'low'};
}

let lastOriginal='';
let lastTranslated='';
let nativePush=null;
let nativeReplace=null;

function translatedUrl(url){if(!lastOriginal||!lastTranslated||typeof url!=='string')return url;try{const parsed=new URL(url,location.origin);if(parsed.searchParams.get('q')===lastTranslated){parsed.searchParams.set('q',lastOriginal);return `${parsed.pathname}${parsed.search}${parsed.hash}`;}}catch{}return url;}
function patchHistory(){if(typeof history==='undefined'||nativePush)return;nativePush=history.pushState.bind(history);nativeReplace=history.replaceState.bind(history);history.pushState=(state,title,url)=>nativePush(state,title,translatedUrl(url));history.replaceState=(state,title,url)=>nativeReplace(state,title,translatedUrl(url));}
function temporarilyTranslateInput(){const input=document.querySelector('#ophtha-query');if(!input)return;const parsed=normalizeRussianClinicalQuestion(input.value);if(parsed.language!=='ru'||!parsed.searchQuery||parsed.searchQuery===input.value)return;lastOriginal=input.value;lastTranslated=parsed.searchQuery;input.value=lastTranslated;queueMicrotask(()=>{if(input.value===lastTranslated)input.value=lastOriginal;});}
function prepareInitialQuery(){const params=new URLSearchParams(location.search);const q=params.get('q')||'';const parsed=normalizeRussianClinicalQuestion(q);if(parsed.language!=='ru'||!parsed.searchQuery||parsed.searchQuery===q)return;lastOriginal=q;lastTranslated=parsed.searchQuery;params.set('q',lastTranslated);nativeReplace=history.replaceState.bind(history);nativeReplace({},'',`${location.pathname}?${params.toString()}${location.hash}`);setTimeout(()=>{const input=document.querySelector('#ophtha-query');if(input&&input.value===lastTranslated)input.value=lastOriginal;const restored=new URLSearchParams(location.search);if(restored.get('q')===lastTranslated){restored.set('q',lastOriginal);nativeReplace({},'',`${location.pathname}?${restored.toString()}${location.hash}`);}},0);}

if(typeof document!=='undefined'){
  prepareInitialQuery();
  patchHistory();
  document.addEventListener('submit',(event)=>{if(event.target?.id==='ophtha-search-form')temporarilyTranslateInput();},true);
  document.addEventListener('change',(event)=>{if(['ophtha-sort','ophtha-date','ophtha-oa','ophtha-pubtype'].includes(event.target?.id))temporarilyTranslateInput();},true);
}
