import { normalizeIntent, validateResearchRequest } from './contracts.js';

export const INTENT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

const QUESTION_TYPES = ['general', 'comparison', 'therapy', 'surgery', 'management', 'diagnosis', 'prognosis', 'safety'];

const NAMED_THERAPIES = [
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
  ['brolucizumab', ['brolucizumab', 'бролуцизумаб']]
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
  const raw = response?.response ?? response;
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw || '')); }
  catch { throw new Error('Intent model returned invalid JSON'); }
}

export async function interpretIntentWithAi(payload, env = {}, deps = {}) {
  const request = validateResearchRequest(payload);
  const run = deps.runModel || env?.AI?.run?.bind(env.AI);
  if (typeof run !== 'function') throw new Error('Workers AI binding unavailable');
  const response = await run(INTENT_MODEL, {
    messages: buildIntentMessages(request),
    response_format: { type: 'json_schema', json_schema: buildIntentSchema() },
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
  if (/epiretinal\s+membrane|\berm\b|эпиретинальн[а-я]*\s+(?:мембран|фиброз)/.test(text)) {
    return { domain: 'retina', condition: 'epiretinal membrane' };
  }
  if (/full[- ]thickness\s+macular\s+hole|macular\s+hole|макулярн[а-я]*\s+разрыв/.test(text)) {
    return { domain: 'retina', condition: 'full-thickness macular hole' };
  }
  if (/rhegmatogenous\s+retinal\s+detachment|retinal\s+detachment|регматогенн[а-я]*\s+отслойк[а-я]*\s+сетчатк|отслойк[а-я]*\s+сетчатк/.test(text)) {
    return { domain: 'retina', condition: 'retinal detachment' };
  }
  if (/iol\s+dislocation|intraocular\s+lens\s+dislocation|дислокац[а-я]*\s+иол|смещен[а-я]*\s+иол|дислокац[а-я]*\s+интраокулярн[а-я]*\s+линз/.test(text)) {
    return { domain: 'lens-iol', condition: 'intraocular lens dislocation' };
  }
  if (/glaucoma|глауком/.test(text)) return { domain: 'glaucoma', condition: 'glaucoma' };
  if (/cataract|катаракт/.test(text)) return { domain: 'lens-iol', condition: 'cataract' };
  if (/uveitis|увеит/.test(text)) return { domain: 'uveitis', condition: 'uveitis' };
  if (/keratitis|кератит/.test(text)) return { domain: 'cornea', condition: 'keratitis' };
  return { domain: 'ophthalmology', condition: '' };
}

function detectQuestionType(text, condition) {
  if (/преимущ|сравн|по сравнению|\bversus\b|\bvs\b|better|superior|inferior/.test(text)) return 'comparison';
  if (/безопас|осложн|риск|safety|risk|adverse/.test(text)) return 'safety';
  if (/медикаментоз|лекарствен|фармаколог|препарат|капл|pharmacolog|medication|medical therapy|drug therapy|first[- ]line/.test(text)) return 'therapy';
  if (/операц|оперир|хирург|surgery|surgical|vitrectom|пилинг|peeling/.test(text)) return 'surgery';
  if (['epiretinal membrane', 'full-thickness macular hole'].includes(condition) && /тактик|management|preferred management|стоит ли/.test(text)) return 'surgery';
  if (/диагност|diagnos|screen/.test(text)) return 'diagnosis';
  if (/прогноз|исход|prognos/.test(text)) return 'prognosis';
  if (/тактик|management|вести|ведение/.test(text)) return 'management';
  if (/лечен|treat|therap/.test(text)) return 'therapy';
  return 'general';
}

function detectNamedTherapies(text) {
  const result = [];
  for (const [canonical, aliases] of NAMED_THERAPIES) {
    if (aliases.some((alias) => text.includes(normalizedQuestion(alias)))) result.push(canonical);
  }
  return result;
}

function detectInterventions(text, questionType) {
  const interventions = [];
  if (questionType === 'therapy' && /медикаментоз|лекарствен|фармаколог|препарат|капл|pharmacolog|medication|medical therapy|drug therapy|first[- ]line/.test(text)) {
    interventions.push('pharmacological therapy');
  }
  if (/selective laser trabeculoplasty|\bslt\b|слт|селективн[а-я]*\s+лазерн[а-я]*\s+трабекулопласт/.test(text)) interventions.push('selective laser trabeculoplasty');
  if (/vitrectom|витрэктом|витреэктом/.test(text)) interventions.push('pars plana vitrectomy');
  if (/ilm\s+peel|пилинг[а-я]*\s+впм/.test(text)) interventions.push('internal limiting membrane peeling');
  return [...new Set(interventions)];
}

function detectOutcomes(text, domain) {
  const outcomes = [];
  if (/intraocular\s+pressure|\biop\b|внутриглазн[а-я]*\s+давлен|вгд/.test(text) || domain === 'glaucoma') outcomes.push('intraocular pressure');
  if (/visual\s+acuity|\bvis\b|острот[а-я]*\s+зрен/.test(text)) outcomes.push('visual acuity');
  if (/metamorph|метаморф/.test(text)) outcomes.push('metamorphopsia');
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
  if (condition !== 'glaucoma' && /glaucoma|глауком/.test(text)) modifiers.push('glaucoma');
  if (/стекловидн[а-я]*\s+тел|vitreous/.test(text)) modifiers.push('vitreous involvement');
  return [...new Set(modifiers)];
}

function fallbackInterpret(request) {
  const text = normalizedQuestion(request.question);
  const { domain, condition } = detectCondition(text);
  const question_type = detectQuestionType(text, condition);
  const namedTherapies = detectNamedTherapies(text);
  let interventions = detectInterventions(text, question_type);
  let comparators = [];

  if (question_type === 'comparison' && namedTherapies.length >= 2) {
    interventions = [namedTherapies[0]];
    comparators = namedTherapies.slice(1);
  } else {
    interventions = [...new Set([...interventions, ...namedTherapies])];
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

export async function interpretClinicalQuestion(payload, deps = {}) {
  const request = validateResearchRequest(payload);
  if (typeof deps.interpretIntent === 'function') {
    try {
      const modelIntent = await deps.interpretIntent(request);
      if (modelIntent && typeof modelIntent === 'object') return normalizeIntent({ ...modelIntent, language: request.language });
    } catch {
      // Deterministic fallback is required so interpretation failure never blocks retrieval.
    }
  }
  return fallbackInterpret(request);
}
