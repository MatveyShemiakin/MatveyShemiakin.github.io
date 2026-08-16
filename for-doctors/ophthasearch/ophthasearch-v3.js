const EUROPE_PMC_API = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const CLINICAL_TRIALS_API = 'https://clinicaltrials.gov/api/v2/studies';
const JSTAGE_API = 'https://api.jstage.jst.go.jp/searchapi/do';

const PUB_TYPE_MAP = {
  review: 'review',
  'systematic-review': 'systematic review',
  'clinical-trial': 'clinical trial',
  rct: 'randomized controlled trial'
};

const PROVIDER_LABELS = {
  europepmc: 'Europe PMC',
  clinicaltrials: 'ClinicalTrials.gov',
  jstage: 'J-STAGE'
};

const CLINICAL_CONCEPTS = [
  { category: 'population', term: 'neovascular age-related macular degeneration', aliases: ['неоваскулярная вмд', 'влажная вмд', 'neovascular amd', 'wet amd'] },
  { category: 'population', term: 'age-related macular degeneration', aliases: ['возрастная макулярная дегенерация', 'возрастная макулярная дистрофия', 'вмд', 'amd'] },
  { category: 'population', term: 'diabetic macular edema', aliases: ['диабетический макулярный отек', 'диабетический макулярный отёк', 'дмо', 'dme'] },
  { category: 'population', term: 'proliferative diabetic retinopathy', aliases: ['пролиферативная диабетическая ретинопатия', 'пдр', 'pdr'] },
  { category: 'population', term: 'diabetic retinopathy', aliases: ['диабетическая ретинопатия', 'др', 'diabetic retinopathy'] },
  { category: 'population', term: 'full-thickness macular hole', aliases: ['макулярный разрыв', 'полнослойный макулярный разрыв', 'ftmh', 'macular hole'] },
  { category: 'population', term: 'epiretinal membrane', aliases: ['эпиретинальная мембрана', 'эпиретинальный фиброз', 'эрм', 'erm'] },
  { category: 'population', term: 'rhegmatogenous retinal detachment', aliases: ['регматогенная отслойка сетчатки', 'рос', 'rrd'] },
  { category: 'population', term: 'retinal detachment', aliases: ['отслойка сетчатки', 'retinal detachment'] },
  { category: 'population', term: 'retinal vein occlusion', aliases: ['окклюзия вен сетчатки', 'тромбоз вен сетчатки', 'rvo'] },
  { category: 'population', term: 'normal-tension glaucoma', aliases: ['глаукома нормального давления', 'нормотензивная глаукома', 'ntg', 'normal tension glaucoma'] },
  { category: 'population', term: 'primary open-angle glaucoma', aliases: ['первичная открытоугольная глаукома', 'открытоугольная глаукома', 'поуг', 'poag'] },
  { category: 'population', term: 'angle-closure glaucoma', aliases: ['закрытоугольная глаукома', 'зоуг', 'angle closure glaucoma'] },
  { category: 'population', term: 'glaucoma', aliases: ['глаукома', 'glaucoma'] },
  { category: 'population', term: 'cataract', aliases: ['катаракта', 'cataract'] },
  { category: 'population', term: 'intraocular lens dislocation', aliases: ['дислокация иол', 'дислокация интраокулярной линзы', 'смещение иол', 'iol dislocation'] },
  { category: 'population', term: 'keratoconus', aliases: ['кератоконус', 'keratoconus'] },
  { category: 'population', term: 'bacterial keratitis', aliases: ['бактериальный кератит', 'bacterial keratitis'] },
  { category: 'population', term: 'infectious keratitis', aliases: ['инфекционный кератит', 'infectious keratitis'] },
  { category: 'population', term: 'corneal ulcer', aliases: ['язва роговицы', 'corneal ulcer'] },
  { category: 'population', term: 'Fuchs endothelial corneal dystrophy', aliases: ['эндотелиальная дистрофия фукса', 'дистрофия фукса', 'fuchs dystrophy'] },
  { category: 'population', term: 'corneal graft failure', aliases: ['болезнь трансплантата роговицы', 'несостоятельность трансплантата роговицы', 'corneal graft failure'] },
  { category: 'population', term: 'anterior uveitis', aliases: ['передний увеит', 'anterior uveitis'] },
  { category: 'population', term: 'uveitis', aliases: ['увеит', 'uveitis'] },
  { category: 'population', term: 'endophthalmitis', aliases: ['эндофтальмит', 'endophthalmitis'] },
  { category: 'population', term: 'macular edema', aliases: ['макулярный отек', 'макулярный отёк', 'macular edema'] },

  { category: 'intervention', term: 'inverted ILM flap', aliases: ['инвертированный лоскут впм', 'инвертированный лоскут внутренней пограничной мембраны', 'inverted ilm flap'] },
  { category: 'intervention', term: 'internal limiting membrane peeling', aliases: ['пилинг впм', 'пилинг внутренней пограничной мембраны', 'стандартный пилинг впм', 'ilm peeling'] },
  { category: 'intervention', term: 'pars plana vitrectomy', aliases: ['витрэктомия', 'витреэктомия', 'ppv', 'pars plana vitrectomy'] },
  { category: 'intervention', term: 'trabeculectomy', aliases: ['трабекулэктомия', 'trabeculectomy'] },
  { category: 'intervention', term: 'minimally invasive glaucoma surgery', aliases: ['мигс', 'migs', 'минимально инвазивная хирургия глаукомы'] },
  { category: 'intervention', term: 'glaucoma drainage device', aliases: ['дренажная хирургия глаукомы', 'глаукомный дренаж', 'glaucoma drainage device'] },
  { category: 'intervention', term: 'aflibercept', aliases: ['афлиберцепт', 'aflibercept'] },
  { category: 'intervention', term: 'faricimab', aliases: ['фарицимаб', 'faricimab'] },
  { category: 'intervention', term: 'ranibizumab', aliases: ['ранибизумаб', 'ranibizumab'] },
  { category: 'intervention', term: 'bevacizumab', aliases: ['бевацизумаб', 'bevacizumab'] },
  { category: 'intervention', term: 'brolucizumab', aliases: ['бролуцизумаб', 'brolucizumab'] },
  { category: 'intervention', term: 'anti-VEGF therapy', aliases: ['анти-vegf терапия', 'анти вегф терапия', 'anti-vegf'] },
  { category: 'intervention', term: 'phacoemulsification', aliases: ['факоэмульсификация', 'факоэмульсификация катаракты', 'phacoemulsification'] },
  { category: 'intervention', term: 'intraocular lens fixation', aliases: ['фиксация иол', 'подшивание иол', 'шовная фиксация иол', 'iol fixation'] },
  { category: 'intervention', term: 'scleral fixation of intraocular lens', aliases: ['склеральная фиксация иол', 'scleral fixation'] },
  { category: 'intervention', term: 'DMEK', aliases: ['dmek', 'дмек', 'десцеметова мембранная эндотелиальная кератопластика'] },
  { category: 'intervention', term: 'DSAEK', aliases: ['dsaek', 'дсаэк', 'эндотелиальная кератопластика dsaek'] },
  { category: 'intervention', term: 'penetrating keratoplasty', aliases: ['сквозная кератопластика', 'скп', 'penetrating keratoplasty', 'pkp'] },
  { category: 'intervention', term: 'corneal cross-linking', aliases: ['кросслинкинг', 'кросс-линкинг', 'corneal cross linking', 'cxl'] },
  { category: 'intervention', term: 'topical corticosteroids', aliases: ['топические глюкокортикостероиды', 'стероидные капли', 'topical corticosteroids'] },

  { category: 'outcome', term: 'best corrected visual acuity', aliases: ['максимально корригированная острота зрения', 'острота зрения', 'мкоз', 'bcva', 'best corrected visual acuity'] },
  { category: 'outcome', term: 'anatomical closure', aliases: ['анатомическое закрытие', 'закрытие разрыва', 'anatomical closure'] },
  { category: 'outcome', term: 'intraocular pressure', aliases: ['внутриглазное давление', 'вгд', 'iop', 'intraocular pressure'] },
  { category: 'outcome', term: 'visual field progression', aliases: ['прогрессирование поля зрения', 'visual field progression'] },
  { category: 'outcome', term: 'recurrence', aliases: ['рецидив', 'рецидивирование', 'recurrence'] },
  { category: 'outcome', term: 'complications', aliases: ['осложнения', 'осложнение', 'complications'] },
  { category: 'outcome', term: 'endothelial cell density', aliases: ['плотность эндотелиальных клеток', 'эндотелиальная плотность', 'endothelial cell density'] },
  { category: 'outcome', term: 'graft survival', aliases: ['выживаемость трансплантата', 'graft survival'] }
];

const RU_GENERIC_TERMS = [
  ['хирургическое лечение', 'surgery'], ['хирургия', 'surgery'], ['операция', 'surgery'], ['лечение', 'treatment'],
  ['диагностика', 'diagnosis'], ['прогноз', 'prognosis'], ['профилактика', 'prevention'], ['безопасность', 'safety'],
  ['эффективность', 'efficacy'], ['сравнение', 'comparison'], ['осложнение', 'complication'], ['осложнения', 'complications']
];

const EN_STOP_WORDS = new Set(['is','are','does','do','did','what','which','who','when','where','why','how','the','a','an','of','in','for','with','to','from','after','before','than','or','and','versus','vs','compared','comparison','among','patients','patient','there','any']);

const COPY = {
  ru: {
    emptyQuery: 'Введите клинический вопрос.',
    loading: 'Преобразуем вопрос и ищем доказательства…',
    noResults: 'По этому клиническому вопросу результаты не найдены.',
    partial: 'Часть источников временно недоступна. Ответ построен по доступным публикациям.',
    error: 'Не удалось получить данные из подключённых источников. Повторите поиск позже.',
    results: (visible, providers) => `${visible.toLocaleString('ru-RU')} ключевых записей · ${providers} источн.`,
    abstract: 'Аннотация / описание', citations: 'Цитирований', openAccess: 'Open access', openPubMed: 'PubMed', openDoi: 'DOI', fullText: 'Полный текст',
    trial: 'Клиническое исследование', sourceUnavailable: 'Недоступен', sourceReady: 'Готов', sourceSearching: 'Поиск…', sourceSkipped: 'Не применён к фильтру', sourceResults: (count) => `${Number(count || 0).toLocaleString('ru-RU')} найдено`,
    questionAnalysis: 'Как OphthaSearch понял вопрос', normalizedQuery: 'Поисковый запрос', answerTitle: 'Что показывает найденная литература', evidenceMap: 'Карта доказательств',
    p: 'P · Пациенты / проблема', i: 'I · Вмешательство', c: 'C · Сравнение', o: 'O · Исход', notSpecified: 'не указано',
    designSupport: 'Опора автоматического вывода', notGrade: 'Это не GRADE: GRADE оценивает совокупность доказательств по исходу, а не отдельную статью.',
    benefit: 'Сигнал в пользу эффекта', noDifference: 'Нет убедимого преимущества', risk: 'Риски / неблагоприятный сигнал',
    systematicReviews: 'Систематические обзоры / метаанализы', rcts: 'RCT', observational: 'Наблюдательные исследования', caseEvidence: 'Серии / описания случаев', ongoing: 'Зарегистрированные исследования',
    summary: {
      benefit: 'В исследованиях более высокого уровня преобладает сигнал в пользу клинического эффекта или преимущества изучаемого подхода.',
      'no-difference': 'В исследованиях более высокого уровня чаще не показано убедительного преимущества одного подхода над другим.',
      mixed: 'Данные неоднородны: часть публикаций показывает преимущество, часть — отсутствие значимых различий или потенциальные риски.',
      risk: 'В найденных данных присутствует неблагоприятный сигнал или указание на риски; его необходимо сопоставить с ожидаемой пользой.',
      insufficient: 'Надёжных сравнительных данных для содержательного ответа пока недостаточно.'
    },
    strength: { strong: 'выше средней', moderate: 'средняя', limited: 'ограниченная', insufficient: 'недостаточная' },
    evidenceTier: (tier, label) => tier ? `Уровень дизайна ${tier}/5 · ${label}` : label,
    registryNotEfficacy: 'Реестр · не доказательство эффективности', keyStudies: 'Ключевые исследования', sourceExcerpt: 'Фрагмент вывода'
  },
  en: {
    emptyQuery: 'Enter a clinical question.', loading: 'Interpreting the question and searching evidence…', noResults: 'No results were found for this clinical question.',
    partial: 'Some sources are temporarily unavailable. The answer is based on responding databases.', error: 'Connected sources could not be loaded. Please try again later.',
    results: (visible, providers) => `${visible.toLocaleString('en-US')} key records · ${providers} sources`, abstract: 'Abstract / description', citations: 'Citations', openAccess: 'Open access', openPubMed: 'PubMed', openDoi: 'DOI', fullText: 'Full text',
    trial: 'Clinical study', sourceUnavailable: 'Unavailable', sourceReady: 'Ready', sourceSearching: 'Searching…', sourceSkipped: 'Not used for this filter', sourceResults: (count) => `${Number(count || 0).toLocaleString('en-US')} found`,
    questionAnalysis: 'How OphthaSearch interpreted the question', normalizedQuery: 'Search query', answerTitle: 'What the retrieved literature shows', evidenceMap: 'Evidence map',
    p: 'P · Population / problem', i: 'I · Intervention', c: 'C · Comparator', o: 'O · Outcome', notSpecified: 'not specified', designSupport: 'Support for the automated conclusion',
    notGrade: 'This is not GRADE: GRADE rates a body of evidence for an outcome, not an individual paper.', benefit: 'Signal of benefit / effect', noDifference: 'No convincing advantage', risk: 'Risk / adverse signal',
    systematicReviews: 'Systematic reviews / meta-analyses', rcts: 'RCTs', observational: 'Observational studies', caseEvidence: 'Case series / reports', ongoing: 'Registered studies',
    summary: {
      benefit: 'Higher-level studies predominantly signal a clinical effect or advantage of the studied approach.',
      'no-difference': 'Higher-level studies more often do not show a convincing advantage of one approach over the other.',
      mixed: 'The evidence is heterogeneous: some publications suggest benefit, while others show no important difference or potential risk.',
      risk: 'The retrieved evidence contains an adverse or risk signal that should be balanced against expected benefit.',
      insufficient: 'There is not enough reliable comparative evidence for a substantive answer.'
    },
    strength: { strong: 'above average', moderate: 'moderate', limited: 'limited', insufficient: 'insufficient' },
    evidenceTier: (tier, label) => tier ? `Design evidence ${tier}/5 · ${label}` : label, registryNotEfficacy: 'Registry · not efficacy evidence', keyStudies: 'Key studies', sourceExcerpt: 'Conclusion excerpt'
  }
};

function normText(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim(); }
function uniqueStrings(values) { return [...new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))]; }
function safeHttpUrl(value) { if (!value) return ''; try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
function sourceLink(key, url) { const safe = safeHttpUrl(url); return safe ? { key, label: PROVIDER_LABELS[key] || key, url: safe } : null; }
function isoDate(date) { return date.toISOString().slice(0, 10); }
function subtractYears(date, years) { const copy = new Date(date.getTime()); copy.setUTCFullYear(copy.getUTCFullYear() - years); return copy; }
function dateYears(state) { return { '1y': 1, '5y': 5, '10y': 10 }[state?.date] || 0; }
function quoteTerm(term) { return /\s/.test(term) ? `"${term}"` : term; }

function findConceptMatches(question) {
  const normalized = normText(question);
  const found = [];
  for (const concept of CLINICAL_CONCEPTS) {
    const aliases = [...concept.aliases].sort((a, b) => b.length - a.length);
    const alias = aliases.find((item) => normalized.includes(normText(item)));
    if (alias && !found.some((item) => item.category === concept.category && item.term === concept.term)) found.push({ ...concept, matchedAlias: alias });
  }
  return found;
}

function detectQuestionType(question) {
  const q = normText(question);
  if (/преимущ|эффективнее|что лучше|сравн|по сравнению|\bversus\b|\bvs\b|better|superior/.test(q)) return 'comparison';
  if (/безопас|осложн|риск|safety|risk|complication|adverse/.test(q)) return 'safety';
  if (/диагност|точност|чувствительност|специфичност|diagnos|accuracy|sensitivity|specificity/.test(q)) return 'diagnosis';
  if (/прогноз|исход|prognos|outcome/.test(q)) return 'prognosis';
  if (/эффектив|помогает|работает|лечен|effective|efficacy|treat/.test(q)) return 'effectiveness';
  return 'general';
}

export function normalizeClinicalQuestion(question) {
  const original = String(question || '').trim();
  const language = /[а-яё]/i.test(original) ? 'ru' : 'en';
  const matches = findConceptMatches(original);
  const populations = matches.filter((m) => m.category === 'population');
  const interventions = matches.filter((m) => m.category === 'intervention');
  const outcomes = matches.filter((m) => m.category === 'outcome');

  let searchQuery = original;
  if (language === 'ru') {
    const terms = matches.map((m) => m.term);
    const lower = normText(original);
    for (const [ru, en] of RU_GENERIC_TERMS) if (lower.includes(normText(ru))) terms.push(en);
    const latinTokens = original.match(/[A-Za-z][A-Za-z0-9+./-]{1,}/g) || [];
    for (const token of latinTokens) if (!EN_STOP_WORDS.has(token.toLowerCase())) terms.push(token);
    const numbers = original.match(/(?:>|<|≥|≤)?\s?\d+(?:[.,]\d+)?\s?(?:µm|um|мкм|mm|мм)?/gi) || [];
    for (const number of numbers) terms.push(number.replace(/мкм/gi, 'µm').replace(/мм/gi, 'mm').replace(/\s+/g, ''));
    const unique = uniqueStrings(terms);
    searchQuery = unique.length ? unique.map(quoteTerm).join(' ') : original;
  }

  const questionType = detectQuestionType(original);
  const pico = {
    population: populations[0]?.term || '',
    intervention: interventions[0]?.term || '',
    comparator: interventions[1]?.term || '',
    outcome: outcomes[0]?.term || ''
  };
  const cyrillicWords = (original.match(/[а-яё]{4,}/gi) || []).length;
  const coverage = language === 'en' ? 'native' : matches.length >= 2 ? 'high' : matches.length === 1 ? 'partial' : cyrillicWords ? 'low' : 'native';
  return { original, language, searchQuery, questionType, pico, concepts: matches.map(({ category, term }) => ({ category, term })), coverage };
}

export function buildEuropePmcQuery(state) {
  const rawQuery = String(state?.q || '').trim(); if (!rawQuery) return '';
  const parts = [`(${rawQuery})`]; const now = state?.now instanceof Date ? state.now : new Date(); const years = dateYears(state);
  if (years) parts.push(`FIRST_PDATE:[${isoDate(subtractYears(now, years))} TO ${isoDate(now)}]`);
  if (state?.openAccess) parts.push('OPEN_ACCESS:y');
  const pubType = PUB_TYPE_MAP[state?.pubType]; if (pubType) parts.push(`PUB_TYPE:"${pubType}"`);
  let query = parts.join(' AND '); if (state?.sort === 'newest') query += ' sort_date:y'; return query;
}

function firstFullTextUrl(record) { const list = record?.fullTextUrlList?.fullTextUrl; if (!Array.isArray(list)) return ''; for (const item of list) { const u = safeHttpUrl(item?.url); if (u) return u; } return ''; }

export function normalizeEuropePmcRecord(record = {}) {
  const source = String(record.source || record.src || '').trim(); const id = String(record.id || record.extId || record.pmid || record.pmcid || '').trim();
  const publicationTypes = Array.isArray(record?.pubTypeList?.pubType) ? record.pubTypeList.pubType.filter(Boolean).map(String) : [];
  const pmid = String(record.pmid || (source === 'MED' ? record.id || '' : '')).trim(); const pmcid = String(record.pmcid || '').trim(); const doi = String(record.doi || '').trim();
  const europePmcUrl = source && id ? `https://europepmc.org/article/${encodeURIComponent(source)}/${encodeURIComponent(id)}` : '';
  return { kind:'article', providerKey:'europepmc', providerLabel:PROVIDER_LABELS.europepmc, sourceKeys:['europepmc'], sourceLinks:[sourceLink('europepmc', europePmcUrl)].filter(Boolean), id,
    title:String(record.title || '').trim(), authors:String(record.authorString || '').trim(), journal:String(record.journalTitle || record.journalInfo?.journal?.title || '').trim(),
    year:String(record.pubYear || record.firstPublicationDate || '').slice(0,4), publicationTypes, abstractText:String(record.abstractText || '').trim(), citedByCount:Number.isFinite(Number(record.citedByCount)) ? Number(record.citedByCount) : null,
    pmid, pmcid, doi, registryId:'', isOpenAccess:record.isOpenAccess === true || String(record.isOpenAccess || '').toUpperCase() === 'Y', fullTextUrl:firstFullTextUrl(record), sourceUrl:europePmcUrl, europePmcUrl,
    pubMedUrl:pmid ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/` : '', doiUrl:doi ? `https://doi.org/${encodeURIComponent(doi)}` : '', trialStatus:'', phase:'', sponsor:'', conditions:'', interventions:'' };
}

export function buildSearchUrl(state) { const params = new URLSearchParams({ query:buildEuropePmcQuery(state), format:'json', resultType:'core', pageSize:'18' }); return `${EUROPE_PMC_API}?${params.toString()}`; }
export async function searchEuropePmc(state, fetchImpl = globalThis.fetch) { if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable'); const response = await fetchImpl(buildSearchUrl(state), { headers:{ Accept:'application/json' } }); if (!response.ok) throw new Error(`Europe PMC HTTP ${response.status}`); const data = await response.json(); const records = Array.isArray(data?.resultList?.result) ? data.resultList.result : []; return { providerKey:'europepmc', hitCount:Number(data?.hitCount || 0), results:records.map(normalizeEuropePmcRecord) }; }

function clinicalTrialsAdvancedFilter(state) { if (state?.pubType === 'clinical-trial') return 'AREA[StudyType]INTERVENTIONAL'; if (state?.pubType === 'rct') return 'AREA[StudyType]INTERVENTIONAL AND AREA[DesignAllocation]RANDOMIZED'; return ''; }
function shouldSearchClinicalTrials(state) { return !['review','systematic-review'].includes(state?.pubType); }
export function buildClinicalTrialsUrl(state) { const params = new URLSearchParams({ 'query.term':String(state?.q || '').trim(), format:'json', pageSize:'12', countTotal:'true' }); const advanced = clinicalTrialsAdvancedFilter(state); if (advanced) params.set('filter.advanced', advanced); return `${CLINICAL_TRIALS_API}?${params.toString()}`; }
export function normalizeClinicalTrialsStudy(study = {}) {
  const p = study?.protocolSection || {}, identification=p?.identificationModule || {}, status=p?.statusModule || {}, sponsorModule=p?.sponsorCollaboratorsModule || {}, conditionsModule=p?.conditionsModule || {}, design=p?.designModule || {}, description=p?.descriptionModule || {}, arms=p?.armsInterventionsModule || {};
  const nctId=String(identification?.nctId || '').trim(), sourceUrl=nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : '', phases=Array.isArray(design?.phases) ? design.phases : [], conditions=Array.isArray(conditionsModule?.conditions) ? conditionsModule.conditions : [], interventions=Array.isArray(arms?.interventions) ? arms.interventions.map((i)=>i?.name).filter(Boolean) : [], studyType=String(design?.studyType || '').trim(), allocation=String(design?.designInfo?.allocation || '').trim();
  const publicationTypes=uniqueStrings(['ClinicalTrials.gov registry', studyType === 'INTERVENTIONAL' ? 'Interventional study' : studyType, allocation === 'RANDOMIZED' ? 'Randomized' : allocation]);
  return { kind:'trial', providerKey:'clinicaltrials', providerLabel:PROVIDER_LABELS.clinicaltrials, sourceKeys:['clinicaltrials'], sourceLinks:[sourceLink('clinicaltrials',sourceUrl)].filter(Boolean), id:nctId, registryId:nctId, title:String(identification?.briefTitle || identification?.officialTitle || '').trim(), authors:'', journal:'', year:String(status?.startDateStruct?.date || status?.studyFirstPostDateStruct?.date || '').slice(0,4), publicationTypes, abstractText:String(description?.briefSummary || description?.detailedDescription || '').trim(), citedByCount:null, pmid:'', pmcid:'', doi:'', isOpenAccess:null, fullTextUrl:'', sourceUrl, europePmcUrl:'', pubMedUrl:'', doiUrl:'', trialStatus:String(status?.overallStatus || '').trim(), phase:phases.join(' / '), sponsor:String(sponsorModule?.leadSponsor?.name || '').trim(), conditions:uniqueStrings(conditions).join(', '), interventions:uniqueStrings(interventions).join(', ') };
}
export async function searchClinicalTrials(state, fetchImpl = globalThis.fetch) { if (!shouldSearchClinicalTrials(state)) return { providerKey:'clinicaltrials', hitCount:0, results:[], skipped:true, reason:'publication-type' }; if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable'); const r=await fetchImpl(buildClinicalTrialsUrl(state),{headers:{Accept:'application/json'}}); if(!r.ok) throw new Error(`ClinicalTrials.gov HTTP ${r.status}`); const d=await r.json(); const studies=Array.isArray(d?.studies)?d.studies:[]; return {providerKey:'clinicaltrials',hitCount:Number(d?.totalCount || studies.length),results:studies.map(normalizeClinicalTrialsStudy)}; }

function shouldSearchJStage(state) { return state?.pubType === 'any' && !state?.openAccess; }
export function buildJStageUrl(state) { const params=new URLSearchParams({service:'3',text:String(state?.q||'').trim(),sortflg:'1',count:'12'}); const now=state?.now instanceof Date?state.now:new Date(), years=dateYears(state); if(years){params.set('pubyearfrom',String(now.getUTCFullYear()-years));params.set('pubyearto',String(now.getUTCFullYear()));} return `${JSTAGE_API}?${params.toString()}`; }
function firstByLocalName(root, localName) { if(!root?.getElementsByTagNameNS)return null; return root.getElementsByTagNameNS('*',localName)?.[0]||null; }
function textByLocalName(root, localName) { return String(firstByLocalName(root,localName)?.textContent || '').trim(); }
function localizedText(root, containerName, preferred='en') { const c=firstByLocalName(root,containerName); if(!c)return''; const p=firstByLocalName(c,preferred); if(p?.textContent?.trim())return p.textContent.trim(); const f=preferred==='en'?firstByLocalName(c,'ja'):firstByLocalName(c,'en'); return String(f?.textContent || c.textContent || '').trim(); }
function jStageAuthors(entry, preferred='en'){const a=firstByLocalName(entry,'author');if(!a)return'';const n=firstByLocalName(a,preferred)||firstByLocalName(a,preferred==='en'?'ja':'en')||a;const names=Array.from(n.getElementsByTagNameNS?.('*','name')||[]).map((x)=>String(x.textContent||'').trim()).filter(Boolean);return uniqueStrings(names).join(', ');}
export function parseJStageXml(xmlText, preferredLanguage='en', parserFactory){const Parser=parserFactory||globalThis.DOMParser;if(typeof Parser!=='function')throw new Error('DOMParser is unavailable');const xml=new Parser().parseFromString(String(xmlText||''),'application/xml');if(firstByLocalName(xml,'parsererror'))throw new Error('J-STAGE returned invalid XML');const result=firstByLocalName(xml,'result'),status=textByLocalName(result,'status');if(status&&status!=='0')throw new Error(`J-STAGE API ${status}: ${textByLocalName(result,'message')}`);const entries=Array.from(xml.getElementsByTagNameNS('*','entry')||[]);const results=entries.map((entry)=>{const title=localizedText(entry,'article_title',preferredLanguage)||textByLocalName(entry,'title'),journal=localizedText(entry,'material_title',preferredLanguage),articleLink=localizedText(entry,'article_link',preferredLanguage)||textByLocalName(entry,'id'),doi=textByLocalName(entry,'doi'),sourceUrl=safeHttpUrl(articleLink);return{kind:'article',providerKey:'jstage',providerLabel:PROVIDER_LABELS.jstage,sourceKeys:['jstage'],sourceLinks:[sourceLink('jstage',sourceUrl)].filter(Boolean),id:doi||sourceUrl,registryId:'',title,authors:jStageAuthors(entry,preferredLanguage),journal,year:textByLocalName(entry,'pubyear').slice(0,4),publicationTypes:['J-STAGE'],abstractText:'',citedByCount:null,pmid:'',pmcid:'',doi,isOpenAccess:null,fullTextUrl:'',sourceUrl,europePmcUrl:'',pubMedUrl:'',doiUrl:doi?`https://doi.org/${encodeURIComponent(doi)}`:'',trialStatus:'',phase:'',sponsor:'',conditions:'',interventions:''};}).filter((x)=>x.title||x.sourceUrl);return{hitCount:Number(textByLocalName(xml,'totalResults')||results.length),results};}
export async function searchJStage(state,fetchImpl=globalThis.fetch,parserFactory){if(!shouldSearchJStage(state))return{providerKey:'jstage',hitCount:0,results:[],skipped:true,reason:'unsupported-filter'};if(typeof fetchImpl!=='function')throw new Error('Fetch API is unavailable');const r=await fetchImpl(buildJStageUrl(state),{headers:{Accept:'application/xml,text/xml;q=0.9,*/*;q=0.5'}});if(!r.ok)throw new Error(`J-STAGE HTTP ${r.status}`);const parsed=parseJStageXml(await r.text(),'en',parserFactory);return{providerKey:'jstage',...parsed};}

function resultIdentity(result){const doi=String(result?.doi||'').trim().toLowerCase();if(doi)return`doi:${doi}`;const registry=String(result?.registryId||'').trim().toLowerCase();if(registry)return`registry:${registry}`;const pmid=String(result?.pmid||'').trim().toLowerCase();if(pmid)return`pmid:${pmid}`;const title=normText(result?.title).replace(/[^\p{L}\p{N}]+/gu,' ').trim();return title?`title:${title}|${String(result?.year||'')}`:`provider:${result?.providerKey}|${result?.id||Math.random()}`;}
function mergeSourceLinks(a=[],b=[]){const map=new Map();for(const item of[...a,...b])if(item?.url)map.set(`${item.key}:${item.url}`,item);return[...map.values()];}
export function mergeProviderResults(results=[]){const map=new Map();for(const item of results){if(!item)continue;const key=resultIdentity(item);if(!map.has(key)){map.set(key,{...item,sourceKeys:uniqueStrings(item.sourceKeys||[item.providerKey]),sourceLinks:mergeSourceLinks(item.sourceLinks,[])});continue;}const e=map.get(key);map.set(key,{...e,authors:e.authors||item.authors||'',journal:e.journal||item.journal||'',abstractText:e.abstractText||item.abstractText||'',fullTextUrl:e.fullTextUrl||item.fullTextUrl||'',pmid:e.pmid||item.pmid||'',pmcid:e.pmcid||item.pmcid||'',doi:e.doi||item.doi||'',isOpenAccess:e.isOpenAccess===true||item.isOpenAccess===true,sourceKeys:uniqueStrings([...(e.sourceKeys||[]),...(item.sourceKeys||[item.providerKey])]),sourceLinks:mergeSourceLinks(e.sourceLinks,item.sourceLinks)});}return[...map.values()];}
function interleave(groups){const out=[],max=Math.max(0,...groups.map((g)=>g.length));for(let i=0;i<max;i+=1)for(const g of groups)if(g[i])out.push(g[i]);return out;}
export async function searchAllProviders(state,fetchImpl=globalThis.fetch,parserFactory){const tasks=[['europepmc',()=>searchEuropePmc(state,fetchImpl)],['clinicaltrials',()=>searchClinicalTrials(state,fetchImpl)],['jstage',()=>searchJStage(state,fetchImpl,parserFactory)]];const settled=await Promise.allSettled(tasks.map(([,run])=>run()));const providers=[],groups=[];settled.forEach((outcome,index)=>{const key=tasks[index][0];if(outcome.status==='fulfilled'){const value=outcome.value;providers.push({key,status:value.skipped?'skipped':'ready',hitCount:Number(value.hitCount||0),reason:value.reason||''});if(!value.skipped)groups.push(value.results||[]);}else providers.push({key,status:'error',hitCount:0,reason:String(outcome.reason?.message||outcome.reason||'')});});const merged=mergeProviderResults(interleave(groups));return{providers,results:merged};}

export function classifyEvidence(result={}) {
  if (result.kind === 'trial' || result.providerKey === 'clinicaltrials') return { tier:null, rank:90, group:'ongoing', label:'Registered study', useForEfficacy:false };
  const text = normText([...(result.publicationTypes || []), result.title || ''].join(' '));
  if (/systematic review|meta-analysis|meta analysis|network meta/.test(text)) return { tier:1, rank:1, group:'systematic', label:'Systematic review / meta-analysis', useForEfficacy:true };
  if (/randomized controlled|randomised controlled|\brct\b|randomized trial|randomised trial/.test(text)) return { tier:2, rank:2, group:'rct', label:'Randomized controlled trial', useForEfficacy:true };
  if (/cohort|case-control|case control|prospective study|retrospective study|observational/.test(text)) return { tier:3, rank:3, group:'observational', label:'Observational comparative study', useForEfficacy:true };
  if (/case series|case report|case reports/.test(text)) return { tier:4, rank:4, group:'case', label:'Case series / report', useForEfficacy:true };
  if (/editorial|expert opinion|narrative review|commentary/.test(text)) return { tier:5, rank:5, group:'expert', label:'Expert / narrative evidence', useForEfficacy:true };
  return { tier:null, rank:6, group:'other', label:'Design not classified', useForEfficacy:true };
}

export function buildEvidenceLandscape(results=[]) {
  const landscape={systematicReviews:0,rcts:0,observational:0,caseEvidence:0,other:0,ongoingTrials:0};
  for(const result of results){const e=classifyEvidence(result);if(e.group==='systematic')landscape.systematicReviews+=1;else if(e.group==='rct')landscape.rcts+=1;else if(e.group==='observational')landscape.observational+=1;else if(e.group==='case')landscape.caseEvidence+=1;else if(e.group==='ongoing')landscape.ongoingTrials+=1;else landscape.other+=1;}return landscape;
}

function splitSentences(text){return String(text||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s)=>s.trim()).filter((s)=>s.length>25);}
function evidenceExcerpt(result, questionInfo){const sentences=splitSentences(result.abstractText);if(!sentences.length)return'';const conceptTokens=uniqueStrings((questionInfo?.concepts||[]).flatMap((c)=>c.term.toLowerCase().split(/\s+/).filter((w)=>w.length>3)));let best='',score=-1;for(const sentence of sentences){const s=sentence.toLowerCase();let current=0;if(/conclusion|conclusions|result|results/.test(s))current+=3;if(/significant|superior|difference|similar|comparable|risk|adverse|improv|effective|benefit|closure|visual acuity|intraocular pressure/.test(s))current+=2;for(const token of conceptTokens)if(s.includes(token))current+=1;if(current>=score){score=current;best=sentence;}}return best||sentences[sentences.length-1];}
function signalFromExcerpt(excerpt){const s=normText(excerpt);if(!s)return'unknown';if(/no significant difference|no statistically significant difference|did not differ|not significantly different|similar|comparable|equivalent|non-inferior|noninferior|not superior|no benefit/.test(s))return'noDifference';if(/increased risk|higher risk|adverse|complication|worse|inferior|harm|toxicity|gliosis|vision loss|decreased visual acuity/.test(s))return'risk';if(/significantly higher|significantly lower|superior|improved|improvement|benefit|effective|greater|reduced|better|higher closure|lower recurrence|lower intraocular pressure/.test(s))return'benefit';return'unknown';}

export function synthesizeEvidenceAnswer(results=[], questionInfo={}) {
  const signals={benefit:[],noDifference:[],risk:[],unknown:[]};let ongoingTrials=0;
  for(const result of results){const evidence=classifyEvidence(result);if(!evidence.useForEfficacy){ongoingTrials+=1;continue;}if(!result.abstractText)continue;const excerpt=evidenceExcerpt(result,questionInfo);const signal=signalFromExcerpt(excerpt);signals[signal].push({result,evidence,excerpt});}
  const high=[...signals.benefit,...signals.noDifference,...signals.risk].filter((x)=>(x.evidence.tier||9)<=2);const pool=high.length?high:[...signals.benefit,...signals.noDifference,...signals.risk];
  const counts={benefit:pool.filter((x)=>signals.benefit.includes(x)).length,noDifference:pool.filter((x)=>signals.noDifference.includes(x)).length,risk:pool.filter((x)=>signals.risk.includes(x)).length};
  let summaryKey='insufficient';const nonZero=Object.values(counts).filter((n)=>n>0).length;
  if(pool.length){if(nonZero>=2)summaryKey='mixed';else if(counts.benefit)summaryKey='benefit';else if(counts.noDifference)summaryKey='no-difference';else if(counts.risk)summaryKey='risk';}
  const landscape=buildEvidenceLandscape(results);let strengthKey='insufficient';if(landscape.systematicReviews>=1&&landscape.rcts>=1)strengthKey='strong';else if(landscape.systematicReviews>=1||landscape.rcts>=2)strengthKey='moderate';else if(landscape.rcts>=1||landscape.observational>=2)strengthKey='limited';
  return{summaryKey,strengthKey,signals,ongoingTrials,landscape};
}

function rankEvidenceResults(results,state){return [...results].sort((a,b)=>{const ea=classifyEvidence(a),eb=classifyEvidence(b);if(ea.rank!==eb.rank)return ea.rank-eb.rank;if(state?.sort==='newest')return Number(b.year||0)-Number(a.year||0);return Number(b.citedByCount||0)-Number(a.citedByCount||0);}).slice(0,36);}
function createElement(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined&&text!==null)el.textContent=text;return el;}
function addExternalLink(container,href,label,className='ophtha-result-link'){const safe=safeHttpUrl(href);if(!safe)return;const link=createElement('a',className,label);link.href=safe;link.target='_blank';link.rel='noopener noreferrer';container.append(link);}
function humanizeToken(value){return String(value||'').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,(letter)=>letter.toUpperCase());}

function ensureStyles(){if(document.querySelector('link[data-ophtha-v3-style]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/for-doctors/ophthasearch/ophthasearch-v3.css?v=20260816-1';link.dataset.ophthaV3Style='true';document.head.append(link);}
function ensureClinicalUi(root,copy){let panel=document.querySelector('#ophtha-clinical-answer');if(panel)return panel;panel=createElement('section','ophtha-clinical-answer');panel.id='ophtha-clinical-answer';panel.hidden=true;panel.innerHTML=`<div class="ophtha-question-interpretation"><div class="ophtha-clinical-head"><span class="ophtha-clinical-kicker"></span><h2></h2></div><div class="ophtha-pico-grid" data-pico-grid></div><p class="ophtha-normalized-query"><strong></strong> <code data-normalized-query></code></p></div><div class="ophtha-answer-summary"><div class="ophtha-answer-main"><span class="ophtha-clinical-kicker" data-answer-kicker></span><h2 data-answer-title></h2><p class="ophtha-answer-text" data-answer-text></p><p class="ophtha-answer-strength"><strong data-strength-label></strong> <span data-strength></span></p><p class="ophtha-grade-note" data-grade-note></p></div><div class="ophtha-signal-grid" data-signal-grid></div><div class="ophtha-landscape"><h3 data-landscape-title></h3><div class="ophtha-landscape-grid" data-landscape-grid></div></div></div>`;
  const searchCard=document.querySelector('.ophtha-search-card');searchCard?.insertAdjacentElement('afterend',panel);return panel;}

function renderQuestionInterpretation(panel,info,copy){panel.hidden=false;const interpretation=panel.querySelector('.ophtha-question-interpretation');interpretation.querySelector('.ophtha-clinical-kicker').textContent='PICO';interpretation.querySelector('h2').textContent=copy.questionAnalysis;const grid=interpretation.querySelector('[data-pico-grid]');grid.replaceChildren();for(const [key,label] of [['population',copy.p],['intervention',copy.i],['comparator',copy.c],['outcome',copy.o]]){const item=createElement('article','ophtha-pico-item');item.append(createElement('span','ophtha-pico-label',label),createElement('strong','ophtha-pico-value',info.pico[key]||copy.notSpecified));grid.append(item);}interpretation.querySelector('.ophtha-normalized-query strong').textContent=`${copy.normalizedQuery}:`;interpretation.querySelector('[data-normalized-query]').textContent=info.searchQuery;}
function signalCard(title,items,kind,copy){const card=createElement('article',`ophtha-signal-card ophtha-signal-card--${kind}`);const head=createElement('div','ophtha-signal-head');head.append(createElement('strong','',title),createElement('span','ophtha-signal-count',String(items.length)));card.append(head);const list=createElement('div','ophtha-signal-list');for(const item of items.slice(0,2)){const p=createElement('p','ophtha-signal-excerpt',item.excerpt);const meta=createElement('span','ophtha-signal-meta',copy.evidenceTier(item.evidence.tier,item.evidence.label));list.append(p,meta);}if(!items.length)list.append(createElement('p','ophtha-signal-empty','—'));card.append(list);return card;}
function renderSynthesis(panel,synthesis,copy){panel.querySelector('[data-answer-kicker]').textContent='Evidence synthesis';panel.querySelector('[data-answer-title]').textContent=copy.answerTitle;panel.querySelector('[data-answer-text]').textContent=copy.summary[synthesis.summaryKey]||copy.summary.insufficient;panel.querySelector('[data-strength-label]').textContent=`${copy.designSupport}:`;panel.querySelector('[data-strength]').textContent=copy.strength[synthesis.strengthKey];panel.querySelector('[data-grade-note]').textContent=copy.notGrade;const signalGrid=panel.querySelector('[data-signal-grid]');signalGrid.replaceChildren(signalCard(copy.benefit,synthesis.signals.benefit,'benefit',copy),signalCard(copy.noDifference,synthesis.signals.noDifference,'neutral',copy),signalCard(copy.risk,synthesis.signals.risk,'risk',copy));panel.querySelector('[data-landscape-title]').textContent=copy.evidenceMap;const lg=panel.querySelector('[data-landscape-grid]');lg.replaceChildren();const l=synthesis.landscape;for(const [label,value] of [[copy.systematicReviews,l.systematicReviews],[copy.rcts,l.rcts],[copy.observational,l.observational],[copy.caseEvidence,l.caseEvidence],[copy.ongoing,l.ongoingTrials]]){const item=createElement('article','ophtha-landscape-item');item.append(createElement('strong','',String(value)),createElement('span','',label));lg.append(item);}}

function renderResultCard(result,copy){const evidence=classifyEvidence(result);const article=createElement('article',`ophtha-result-card ophtha-result-card--${result.kind||'article'}`);const top=createElement('div','ophtha-result-top'),badges=createElement('div','ophtha-result-badges');for(const sourceKey of result.sourceKeys||[result.providerKey])badges.append(createElement('span','ophtha-badge ophtha-badge-source',PROVIDER_LABELS[sourceKey]||sourceKey));if(!evidence.useForEfficacy)badges.append(createElement('span','ophtha-badge ophtha-badge-registry',copy.registryNotEfficacy));else badges.append(createElement('span',`ophtha-badge ophtha-badge-evidence ophtha-evidence-tier-${evidence.tier||'u'}`,copy.evidenceTier(evidence.tier,evidence.label)));if(result.isOpenAccess===true)badges.append(createElement('span','ophtha-badge ophtha-badge-oa',copy.openAccess));if(result.year)badges.append(createElement('span','ophtha-result-year',result.year));top.append(badges);article.append(top,createElement('h2','ophtha-result-title',result.title||'Untitled'));const meta=result.kind==='trial'?[result.sponsor,result.conditions,result.interventions]:[result.authors,result.journal];if(meta.filter(Boolean).length)article.append(createElement('p','ophtha-result-meta',meta.filter(Boolean).join(' · ')));const ids=[];if(result.registryId)ids.push(result.registryId);if(result.pmid)ids.push(`PMID ${result.pmid}`);if(result.pmcid)ids.push(result.pmcid);if(result.doi)ids.push(`DOI ${result.doi}`);if(result.citedByCount!==null&&result.citedByCount!==undefined)ids.push(`${copy.citations}: ${result.citedByCount}`);if(ids.length)article.append(createElement('p','ophtha-result-identifiers',ids.join(' · ')));if(result.abstractText){const details=createElement('details','ophtha-abstract');details.append(createElement('summary','ophtha-abstract-summary',copy.abstract),createElement('p','ophtha-abstract-text',result.abstractText));article.append(details);}const links=createElement('div','ophtha-result-links');for(const link of result.sourceLinks||[])addExternalLink(links,link.url,link.label);addExternalLink(links,result.pubMedUrl,copy.openPubMed);addExternalLink(links,result.doiUrl,copy.openDoi);addExternalLink(links,result.fullTextUrl,copy.fullText,'ophtha-result-link ophtha-result-link-primary');if(links.children.length)article.append(links);return article;}

function getState(root){return{q:root.querySelector('#ophtha-query')?.value||'',sort:root.querySelector('#ophtha-sort')?.value||'relevance',date:root.querySelector('#ophtha-date')?.value||'any',openAccess:Boolean(root.querySelector('#ophtha-oa')?.checked),pubType:root.querySelector('#ophtha-pubtype')?.value||'any'};}
function applyState(root,state){const map=[['#ophtha-query','q'],['#ophtha-sort','sort'],['#ophtha-date','date'],['#ophtha-pubtype','pubType']];for(const[s,k]of map){const el=root.querySelector(s);if(el)el.value=state[k]||({sort:'relevance',date:'any',pubType:'any'}[k]||'');}const oa=root.querySelector('#ophtha-oa');if(oa)oa.checked=Boolean(state.openAccess);}
function readUrlState(){const p=new URLSearchParams(location.search);return{q:p.get('q')||'',sort:p.get('sort')||'relevance',date:p.get('date')||'any',openAccess:p.get('oa')==='1',pubType:p.get('type')||'any'};}
function writeUrlState(state,replace=false){const p=new URLSearchParams();if(state.q)p.set('q',state.q);if(state.sort!=='relevance')p.set('sort',state.sort);if(state.date!=='any')p.set('date',state.date);if(state.openAccess)p.set('oa','1');if(state.pubType!=='any')p.set('type',state.pubType);history[replace?'replaceState':'pushState']({},'',`${location.pathname}${p.toString()?`?${p}`:''}`);}
function setProviderState(key,status,copy,hitCount=0){const card=document.querySelector(`[data-provider-status="${key}"]`);if(!card)return;const state=card.querySelector('[data-provider-state]');if(!state)return;card.dataset.state=status;if(status==='searching')state.textContent=copy.sourceSearching;else if(status==='ready')state.textContent=copy.sourceResults(hitCount);else if(status==='skipped')state.textContent=copy.sourceSkipped;else if(status==='error')state.textContent=copy.sourceUnavailable;else state.textContent=copy.sourceReady;}

function initBrowser(){const root=document.querySelector('[data-ophthasearch]'),form=document.querySelector('#ophtha-search-form'),resultsEl=document.querySelector('#ophtha-results'),statusEl=document.querySelector('#ophtha-status'),countEl=document.querySelector('#ophtha-result-count');if(!root||!form||!resultsEl||!statusEl||!countEl)return;ensureStyles();const lang=root.dataset.lang==='en'?'en':'ru',copy=COPY[lang],clinicalPanel=ensureClinicalUi(root,copy);const heading=document.querySelector('#ophtha-search-heading');if(heading)heading.textContent=copy.keyStudies;const input=root.querySelector('#ophtha-query');if(input){input.placeholder=lang==='ru'?'Например: Есть ли преимущество inverted ILM flap перед пилингом ВПМ при макулярном разрыве >400 мкм?':'Example: Is inverted ILM flap superior to conventional ILM peeling for macular holes >400 µm?';}let requestId=0;for(const key of['europepmc','clinicaltrials','jstage'])setProviderState(key,'idle',copy);
  const render=async(rawState,options={})=>{if(!String(rawState.q||'').trim()){resultsEl.replaceChildren();countEl.textContent='';statusEl.textContent=copy.emptyQuery;statusEl.dataset.state='idle';clinicalPanel.hidden=true;return;}const questionInfo=normalizeClinicalQuestion(rawState.q);renderQuestionInterpretation(clinicalPanel,questionInfo,copy);const searchState={...rawState,q:questionInfo.searchQuery||rawState.q};const current=++requestId;statusEl.textContent=copy.loading;statusEl.dataset.state='loading';resultsEl.setAttribute('aria-busy','true');for(const key of['europepmc','clinicaltrials','jstage'])setProviderState(key,'searching',copy);try{const response=await searchAllProviders(searchState);if(current!==requestId)return;for(const provider of response.providers)setProviderState(provider.key,provider.status,copy,provider.hitCount);const synthesis=synthesizeEvidenceAnswer(response.results,questionInfo);renderSynthesis(clinicalPanel,synthesis,copy);const ranked=rankEvidenceResults(response.results,rawState);resultsEl.replaceChildren(...ranked.map((r)=>renderResultCard(r,copy)));const responding=response.providers.filter((p)=>p.status==='ready').length,errors=response.providers.filter((p)=>p.status==='error').length;countEl.textContent=ranked.length?copy.results(ranked.length,responding):'';if(!ranked.length){statusEl.textContent=errors===response.providers.length?copy.error:copy.noResults;statusEl.dataset.state=errors===response.providers.length?'error':'empty';}else if(errors){statusEl.textContent=copy.partial;statusEl.dataset.state='warning';}else{statusEl.textContent='';statusEl.dataset.state='ready';}if(!options.fromPopstate)writeUrlState(rawState,Boolean(options.replaceUrl));}catch(error){if(current!==requestId)return;console.error('OphthaSearch v3:',error);resultsEl.replaceChildren();countEl.textContent='';statusEl.textContent=copy.error;statusEl.dataset.state='error';}finally{if(current===requestId)resultsEl.removeAttribute('aria-busy');}};
  form.addEventListener('submit',(event)=>{event.preventDefault();const state=getState(root);if(!String(state.q).trim()){statusEl.textContent=copy.emptyQuery;statusEl.dataset.state='error';input?.focus();return;}render(state);});for(const id of['ophtha-sort','ophtha-date','ophtha-oa','ophtha-pubtype'])document.getElementById(id)?.addEventListener('change',()=>{const state=getState(root);if(String(state.q).trim())render(state);});window.addEventListener('popstate',()=>{const state=readUrlState();applyState(root,state);render(state,{fromPopstate:true});});const initial=readUrlState();applyState(root,initial);if(String(initial.q).trim())render(initial,{replaceUrl:true});}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initBrowser,{once:true});else initBrowser();}
