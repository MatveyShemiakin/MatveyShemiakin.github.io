import { normalizeIntent, validateResearchRequest } from './contracts.js';
import { parseStructuredModelResponse } from './structured-response.js';

export const INTENT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

const QUESTION_TYPES = ['general', 'comparison', 'therapy', 'surgery', 'management', 'diagnosis', 'prognosis', 'safety'];

const NAMED_INTERVENTIONS = [
  ['latanoprost', ['latanoprost', 'латанопрост']],
  ['timolol', ['timolol', 'тимолол']],
  ['travoprost', ['travoprost', 'травопрост']],
  ['bimatoprost', ['bimatoprost', 'биматопрост']],
  ['tafluprost', ['tafluprost', 'тафлупрост']],
  ['brimonidine', ['brimonidine', 'бримонидин']],
  ['dorzolamide', ['dorzolamide', 'дорзоламид']],
  ['brinzolamide', ['brinzolamide', 'бринзоламид']],
  ['netarsudil', ['netarsudil', 'нетарсудил']],
  ['aflibercept', ['aflibercept', 'афлиберцепт']],
  ['faricimab', ['faricimab', 'фарицимаб']],
  ['ranibizumab', ['ranibizumab', 'ранибизумаб']],
  ['bevacizumab', ['bevacizumab', 'бевацизумаб']],
  ['brolucizumab', ['brolucizumab', 'бролуцизумаб']],
  ['natamycin', ['natamycin', 'натамицин']],
  ['voriconazole', ['voriconazole', 'вориконазол']],
  ['fluoroquinolone monotherapy', ['fluoroquinolone monotherapy', 'fluoroquinolone', 'фторхинолон в монотерапии', 'фторхинолон']],
  ['fortified antibiotics', ['fortified antibiotics', 'fortified antibiotic', 'фортифицированные антибиотики', 'фортифицированные антибиотик']],
  ['selective laser trabeculoplasty', ['selective laser trabeculoplasty', 'slt', 'слт', 'селективная лазерная трабекулопластика']],
  ['pars plana vitrectomy', ['pars plana vitrectomy', 'vitrectomy', 'витрэктомия', 'витреэктомия']],
  ['scleral buckling', ['scleral buckling', 'scleral buckle', 'эписклеральное пломбирование', 'склеральное пломбирование']],
  ['pneumatic retinopexy', ['pneumatic retinopexy', 'пневматическая ретинопексия']],
  ['Yamane fixation', ['yamane fixation', 'yamane technique', 'фиксация yamane', 'техника yamane']],
  ['sutured scleral fixation', ['sutured scleral fixation', 'scleral-sutured fixation', 'suture scleral fixation']],
  ['femtosecond laser-assisted cataract surgery', ['femtosecond laser-assisted cataract surgery', 'flacs', 'фемтосекундная лазерная хирургия катаракты']],
  ['phacoemulsification', ['phacoemulsification', 'факоэмульсификация']],
  ['MIGS', ['migs', 'microinvasive glaucoma surgery', 'minimally invasive glaucoma surgery']],
  ['trabeculectomy', ['trabeculectomy', 'трабекулэктомия']],
  ['inverted internal limiting membrane flap', ['inverted ilm flap', 'inverted internal limiting membrane flap', 'инвертированный лоскут впм']],
  ['internal limiting membrane peeling', ['conventional ilm peeling', 'ilm peeling', 'internal limiting membrane peeling', 'пилинг впм']]
];

function normalizedQuestion(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function stringArraySchema(maxItems = 16) {
  return { type: 'array', maxItems, items: { type: 'string', minLength: 1, maxLength: 300 } };
}

export function buildIntentSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      domain: { type: 'string', maxLength: 120 },
      condition: { type: 'string', maxLength: 240 },
      question_type: { type: 'string', enum: QUESTION_TYPES },
      population: stringArraySchema(),
      interventions: stringArraySchema(),
      comparators: stringArraySchema(),
      outcomes: stringArraySchema(),
      modifiers: stringArraySchema(),
      requested_depth: { type: 'string', enum: ['specialist'] },
      needs_dosing: { type: 'boolean' },
      needs_alternatives: { type: 'boolean' },
      ambiguities: stringArraySchema(8)
    },
    required: [
      'domain', 'condition', 'question_type', 'population', 'interventions', 'comparators',
      'outcomes', 'modifiers', 'requested_depth', 'needs_dosing', 'needs_alternatives', 'ambiguities'
    ]
  };
}

export function buildIntentMessages(request) {
  return [
    {
      role: 'system',
      content: [
        'You are the query interpretation component of OphthaSearch, a professional ophthalmology research system.',
        'Convert the clinician question into a compact research intent. Do not answer the medical question and do not invent evidence.',
        'Preserve specifically named drugs, procedures, devices and comparators as canonical English generic terms whenever possible.',
        'For questions asking whether A is better than B, set question_type to comparison, interventions to A and comparators to B.',
        'Infer only the ophthalmic domain/condition that is strongly implied by standard specialist terminology; otherwise leave condition empty and record the ambiguity.',
        'Use population for explicit patient subgroups, outcomes for explicit or strongly implied clinical endpoints, and modifiers for case details that should affect search relevance.',
        'For broad pharmacological-therapy questions about first-line treatment or combinations, needs_dosing may be true because a clinically useful answer normally requires regimen detail. For pure comparative-effect questions, set needs_dosing false unless dosing was requested.',
        'needs_alternatives is true for comparison, therapy, surgery or management questions.',
        'Return only structured JSON matching the supplied schema.'
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify({ language: request.language, question: request.question })
    }
  ];
}

function parseModelIntent(response) {
  return parseStructuredModelResponse(response, { label: 'Intent model returned invalid structured JSON' });
}

export async function interpretIntentWithAi(payload, env = {}, deps = {}) {
  const request = validateResearchRequest(payload);
  const run = deps.runModel || env?.AI?.run?.bind(env.AI);
  if (typeof run !== 'function') throw new Error('Workers AI binding unavailable');
  const response = await run(INTENT_MODEL, {
    messages: buildIntentMessages(request),
    response_format: { type: 'json_schema', json_schema: buildIntentSchema() },
    chat_template_kwargs: { enable_thinking: false },
    max_completion_tokens: 700,
    temperature: 0
  });
  return normalizeIntent({ ...parseModelIntent(response), language: request.language });
}

function detectCondition(text) {
  if (/\bpoag\b|поуг|первич[а-я]*\s+открытоугольн[а-я]*\s+глауком|primary\s+open[- ]angle\s+glaucoma/.test(text)) {
    return { domain: 'glaucoma', condition: 'primary open-angle glaucoma' };
  }
  if (/normal[- ]tension\s+glaucoma|нормотензивн[а-я]*\s+глауком|глауком[а-я]*\s+нормальн[а-я]*\s+давлен/.test(text)) {
    return { domain: 'glaucoma', condition: 'normal-tension glaucoma' };
  }
  if (/angle[- ]closure\s+glaucoma|закрытоугольн[а-я]*\s+глауком|зоуг/.test(text)) {
    return { domain: 'glaucoma', condition: 'angle-closure glaucoma' };
  }
  if (/neovascular\s+age[- ]related\s+macular\s+degeneration|\bnamd\b|wet\s+amd|влажн[а-я]*\s+(?:форма\s+)?вмд/.test(text)) {
    return { domain: 'retina', condition: 'neovascular age-related macular degeneration' };
  }
  if (/diabetic\s+macular\s+(?:edema|oedema)|\bdme\b|диабетическ[а-я]*\s+макулярн[а-я]*\s+отек/.test(text)) {
    return { domain: 'retina', condition: 'diabetic macular edema' };
  }
  if (/retinal\s+vein\s+occlusion|\b(?:crvo|brvo|rvo)\b|окклюз[а-я]*\s+(?:центральн[а-я]*\s+|ветв[а-я]*\s+)?вен[а-я]*\s+сетчатк/.test(text)) {
    return { domain: 'retina', condition: 'retinal vein occlusion' };
  }
  if (/epiretinal\s+membrane|\berm\b|эпиретинальн[а-я]*\s+(?:мембран|фиброз)/.test(text)) {
    return { domain: 'retina', condition: 'epiretinal membrane' };
  }
  if (/full[- ]thickness\s+macular\s+hole|macular\s+hole|макулярн[а-я]*\s+разрыв/.test(text)) {
    return { domain: 'retina', condition: 'full-thickness macular hole' };
  }
  if (/rhegmatogenous\s+retinal\s+detachment|retinal\s+detachment|регматогенн[а-я]*\s+отслойк[а-я]*\s+сетчатк|отслойк[а-я]*\s+сетчатк/.test(text)) {
    return { domain: 'retina', condition: 'retinal detachment' };
  }
  if (/iol\s+dislocation|intraocular\s+lens\s+dislocation|dislocated\s+(?:posterior\s+chamber\s+)?intraocular\s+lens|dislocated\s+iol|subluxated\s+(?:intraocular\s+lens|iol)|дислокац[а-я]*\s+иол|смещен[а-я]*\s+иол|дислокац[а-я]*\s+интраокулярн[а-я]*\s+линз/.test(text)) {
    return { domain: 'lens-iol', condition: 'intraocular lens dislocation' };
  }
  if (/fungal\s+keratitis|mycotic\s+keratitis|грибков[а-я]*\s+кератит/.test(text)) return { domain: 'cornea', condition: 'fungal keratitis' };
  if (/bacterial\s+keratitis|бактериальн[а-я]*\s+кератит/.test(text)) return { domain: 'cornea', condition: 'bacterial keratitis' };
  if (/glaucoma|глауком/.test(text)) return { domain: 'glaucoma', condition: 'glaucoma' };
  if (/cataract|катаракт/.test(text)) return { domain: 'lens-iol', condition: 'cataract' };
  if (/anterior\s+uveitis|передн[а-я]*\s+увеит/.test(text)) return { domain: 'uveitis', condition: 'uveitis' };
  if (/uveitis|увеит/.test(text)) return { domain: 'uveitis', condition: 'uveitis' };
  if (/keratitis|кератит/.test(text)) return { domain: 'cornea', condition: 'keratitis' };
  return { domain: 'ophthalmology', condition: '' };
}

function findNamedInterventions(text) {
  const found = [];
  for (const [canonical, aliases] of NAMED_INTERVENTIONS) {
    let position = Number.POSITIVE_INFINITY;
    for (const alias of aliases) {
      const normalized = normalizedQuestion(alias);
      const index = text.indexOf(normalized);
      if (index >= 0 && index < position) position = index;
    }
    if (Number.isFinite(position)) found.push({ canonical, position });
  }
  return found.sort((a, b) => a.position - b.position).map((entry) => entry.canonical);
}

function hasExplicitComparison(text, named = []) {
  if (/преимущ|сравн|по сравнению|что\s+(?:эффективнее|лучше)|\bversus\b|\bvs\.?\b|better|superior|inferior/.test(text)) return true;
  return named.length >= 2 && /\sили\s/.test(text);
}

function detectQuestionType(text, condition, named = []) {
  if (hasExplicitComparison(text, named)) return 'comparison';
  const safetyText = text.replace(/неосложненн?[а-я]*/g, '');
  if (/безопас|осложн|риск|safety|risk|adverse/.test(safetyText)) return 'safety';
  if (/медикаментоз|лекарствен|фармаколог|препарат|капл|терапи[а-я]*|pharmacolog|medication|medical therapy|drug therapy|first[- ]line|\btherapy\b/.test(text)) return 'therapy';
  if (/операц|оперир|хирург|surgery|surgical|vitrectom|витрэктом|витреэктом|пилинг|peeling/.test(text)) return 'surgery';
  if (['epiretinal membrane', 'full-thickness macular hole'].includes(condition) && /тактик|management|preferred management|стоит ли/.test(text)) return 'surgery';
  if (/диагност|diagnos|screen/.test(text)) return 'diagnosis';
  if (/прогноз|исход|prognos/.test(text)) return 'prognosis';
  if (/тактик|management|вести|ведение/.test(text)) return 'management';
  if (/лечен|treat|therap/.test(text)) return 'therapy';
  return 'general';
}

function detectInterventions(text, questionType, named) {
  const interventions = [];
  if (questionType === 'therapy' && /медикаментоз|лекарствен|фармаколог|препарат|капл|pharmacolog|medication|medical therapy|drug therapy|first[- ]line/.test(text)) {
    interventions.push('pharmacological therapy');
  }
  if (questionType !== 'comparison') interventions.push(...named);
  return [...new Set(interventions)];
}

function detectOutcomes(text, domain) {
  const outcomes = [];
  if (/intraocular\s+pressure|\biop\b|внутриглазн[а-я]*\s+давлен|вгд/.test(text) || domain === 'glaucoma') outcomes.push('intraocular pressure');
  if (/visual\s+acuity|\bvis\b|острот[а-я]*\s+зрен/.test(text)) outcomes.push('visual acuity');
  if (/metamorph|метаморф/.test(text)) outcomes.push('metamorphopsia');
  if (/central\s+retinal\s+thickness|retinal\s+thickness|crt|толщин[а-я]*\s+сетчатк/.test(text)) outcomes.push('retinal thickness');
  return outcomes;
}

function detectModifiers(text, condition) {
  const modifiers = [];
  const vis = text.match(/\bvis\s*[:=]?\s*\d+(?:[.,]\d+)?/i);
  if (vis) modifiers.push(vis[0].replace(',', '.'));
  const size = text.match(/\b\d{2,4}\s*(?:µm|um|мкм)\b/i);
  if (size) modifiers.push(size[0].replace(/um/i, 'µm').replace(/мкм/i, 'µm'));
  if (/phakic|факич/.test(text)) modifiers.push('phakic');
  if (/metamorph|метаморф/.test(text)) modifiers.push('metamorphopsia');
  if (/ocular\s+surface\s+disease|синдром[а-я]*\s+сух[а-я]*\s+глаз|сух[а-я]*\s+глаз/.test(text)) modifiers.push('ocular surface disease');
  if (!/glaucoma/i.test(condition) && /glaucoma|глауком/.test(text)) modifiers.push('glaucoma');
  if (/стекловидн[а-я]*\s+тел|vitreous/.test(text)) modifiers.push('vitreous involvement');
  return [...new Set(modifiers)];
}

function fallbackInterpret(request) {
  const text = normalizedQuestion(request.question);
  const { domain, condition } = detectCondition(text);
  const named = findNamedInterventions(text);
  const question_type = detectQuestionType(text, condition, named);
  let interventions = detectInterventions(text, question_type, named);
  let comparators = [];

  if (question_type === 'comparison' && named.length >= 2) {
    interventions = [named[0]];
    comparators = named.slice(1);
  }

  const outcomes = detectOutcomes(text, domain);
  const modifiers = detectModifiers(text, condition);
  const asksForDosing = /доз|концентрац|кратност|схем|длительност|dose|dosing|concentration|frequency|duration|regimen/.test(text);
  const broadPharmacotherapy = question_type === 'therapy' && interventions.includes('pharmacological therapy');

  return normalizeIntent({
    language: request.language,
    domain,
    condition,
    question_type,
    population: [],
    interventions,
    comparators,
    outcomes,
    modifiers,
    requested_depth: 'specialist',
    needs_dosing: asksForDosing || broadPharmacotherapy,
    needs_alternatives: ['comparison', 'therapy', 'surgery', 'management'].includes(question_type),
    ambiguities: condition ? [] : ['specific ophthalmic condition not resolved']
  });
}

function mergeUnique(...arrays) {
  const seen = new Set();
  const result = [];
  for (const values of arrays) {
    for (const raw of values || []) {
      const value = String(raw || '').trim();
      const key = value.toLowerCase();
      if (!value || seen.has(key)) continue;
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function hasStrongTypeAnchor(text, fallback) {
  const named = findNamedInterventions(text);
  if (hasExplicitComparison(text, named)) return true;
  if (fallback.question_type === 'surgery' && /операц|оперир|хирург|surgery|surgical|vitrectom|витрэктом|витреэктом|пилинг|peeling/.test(text)) return true;
  if (fallback.question_type === 'therapy' && /медикаментоз|лекарствен|фармаколог|терапи[а-я]*|pharmacolog|medication|\btherapy\b|treat/.test(text)) return true;
  if (fallback.question_type === 'management' && /тактик|management|ведение/.test(text)) return true;
  if (fallback.question_type === 'diagnosis' && /диагност|diagnos|screen/.test(text)) return true;
  if (fallback.question_type === 'prognosis' && /прогноз|prognos/.test(text)) return true;
  return false;
}

function reconcileExplicitIntent(request, modelIntent, fallback) {
  const text = normalizedQuestion(request.question);
  const named = findNamedInterventions(text);
  const explicitComparison = hasExplicitComparison(text, named);
  const knownCondition = Boolean(fallback.condition);
  const result = normalizeIntent({ ...modelIntent, language: request.language });

  if (knownCondition) {
    result.domain = fallback.domain;
    result.condition = fallback.condition;
    result.ambiguities = result.ambiguities.filter((value) => !/condition|ophthalmic/i.test(value));
  }

  if (hasStrongTypeAnchor(text, fallback)) result.question_type = fallback.question_type;

  if (explicitComparison && fallback.interventions.length && fallback.comparators.length) {
    result.interventions = fallback.interventions;
    result.comparators = fallback.comparators;
  } else {
    result.interventions = mergeUnique(result.interventions, fallback.interventions);
    result.comparators = mergeUnique(result.comparators, fallback.comparators);
  }

  result.outcomes = mergeUnique(result.outcomes, fallback.outcomes);
  result.modifiers = mergeUnique(result.modifiers, fallback.modifiers);
  result.needs_dosing = Boolean(result.needs_dosing || fallback.needs_dosing);
  result.needs_alternatives = Boolean(result.needs_alternatives || fallback.needs_alternatives);
  if (knownCondition && !result.ambiguities.length) result.ambiguities = [];
  return normalizeIntent(result);
}

export async function interpretClinicalQuestion(payload, deps = {}) {
  const request = validateResearchRequest(payload);
  const fallback = fallbackInterpret(request);
  if (typeof deps.interpretIntent === 'function') {
    try {
      const modelIntent = await deps.interpretIntent(request);
      if (modelIntent && typeof modelIntent === 'object') return reconcileExplicitIntent(request, modelIntent, fallback);
    } catch {
      // Deterministic fallback is required so interpretation failure never blocks retrieval.
    }
  }
  return fallback;
}
