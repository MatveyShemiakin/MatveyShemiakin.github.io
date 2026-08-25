import { normalizeIntent, validateResearchRequest } from './contracts.js';

function normalizedQuestion(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function detectCondition(text) {
  if (/\bpoag\b|\bпоуг\b|первич\w*\s+открытоугольн\w*\s+глауком|primary\s+open[- ]angle\s+glaucoma/.test(text)) {
    return { domain: 'glaucoma', condition: 'primary open-angle glaucoma' };
  }
  if (/normal[- ]tension\s+glaucoma|нормотензивн\w*\s+глауком|глауком\w*\s+нормальн\w*\s+давлен/.test(text)) {
    return { domain: 'glaucoma', condition: 'normal-tension glaucoma' };
  }
  if (/angle[- ]closure\s+glaucoma|закрытоугольн\w*\s+глауком|\bзоуг\b/.test(text)) {
    return { domain: 'glaucoma', condition: 'angle-closure glaucoma' };
  }
  if (/epiretinal\s+membrane|\berm\b|эпиретинальн\w*\s+(?:мембран|фиброз)/.test(text)) {
    return { domain: 'retina', condition: 'epiretinal membrane' };
  }
  if (/full[- ]thickness\s+macular\s+hole|macular\s+hole|макулярн\w*\s+разрыв/.test(text)) {
    return { domain: 'retina', condition: 'full-thickness macular hole' };
  }
  if (/rhegmatogenous\s+retinal\s+detachment|retinal\s+detachment|регматогенн\w*\s+отслойк\w*\s+сетчатк|отслойк\w*\s+сетчатк/.test(text)) {
    return { domain: 'retina', condition: 'retinal detachment' };
  }
  if (/iol\s+dislocation|intraocular\s+lens\s+dislocation|дислокац\w*\s+иол|смещен\w*\s+иол|дислокац\w*\s+интраокулярн\w*\s+линз/.test(text)) {
    return { domain: 'lens-iol', condition: 'intraocular lens dislocation' };
  }
  if (/glaucoma|глауком/.test(text)) return { domain: 'glaucoma', condition: 'glaucoma' };
  if (/cataract|катаракт/.test(text)) return { domain: 'lens-iol', condition: 'cataract' };
  if (/uveitis|увеит/.test(text)) return { domain: 'uveitis', condition: 'uveitis' };
  if (/keratitis|кератит/.test(text)) return { domain: 'cornea', condition: 'keratitis' };
  return { domain: 'ophthalmology', condition: '' };
}

function detectQuestionType(text, condition) {
  if (/медикаментоз|лекарствен|фармаколог|препарат|капл|pharmacolog|medication|medical therapy|drug therapy|first[- ]line/.test(text)) return 'therapy';
  if (/операц|оперир|хирург|surgery|surgical|vitrectom|пилинг|peeling/.test(text)) return 'surgery';
  if (['epiretinal membrane', 'full-thickness macular hole'].includes(condition) && /тактик|management|preferred management|стоит ли/.test(text)) return 'surgery';
  if (/диагност|diagnos|screen/.test(text)) return 'diagnosis';
  if (/прогноз|prognos/.test(text)) return 'prognosis';
  if (/тактик|management|вести|ведение/.test(text)) return 'management';
  if (/лечен|treat|therap/.test(text)) return 'therapy';
  return 'general';
}

function detectInterventions(text, questionType) {
  const interventions = [];
  if (questionType === 'therapy' && /медикаментоз|лекарствен|фармаколог|препарат|капл|pharmacolog|medication|medical therapy|drug therapy|first[- ]line/.test(text)) {
    interventions.push('pharmacological therapy');
  }
  if (/selective laser trabeculoplasty|\bslt\b|\bслт\b|селективн\w*\s+лазерн\w*\s+трабекулопласт/.test(text)) interventions.push('selective laser trabeculoplasty');
  if (/vitrectom|витрэктом|витреэктом/.test(text)) interventions.push('pars plana vitrectomy');
  if (/ilm\s+peel|пилинг\w*\s+впм/.test(text)) interventions.push('internal limiting membrane peeling');
  return interventions;
}

function detectOutcomes(text, domain) {
  const outcomes = [];
  if (/intraocular\s+pressure|\biop\b|внутриглазн\w*\s+давлен|\bвгд\b/.test(text) || domain === 'glaucoma') outcomes.push('intraocular pressure');
  if (/visual\s+acuity|\bvis\b|острот\w*\s+зрен/.test(text)) outcomes.push('visual acuity');
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
  if (/ocular\s+surface\s+disease|синдром\w*\s+сух\w*\s+глаз|сух\w*\s+глаз/.test(text)) modifiers.push('ocular surface disease');
  if (condition !== 'glaucoma' && /glaucoma|глауком/.test(text)) modifiers.push('glaucoma');
  if (/стекловидн\w*\s+тел|vitreous/.test(text)) modifiers.push('vitreous involvement');
  return [...new Set(modifiers)];
}

function fallbackInterpret(request) {
  const text = normalizedQuestion(request.question);
  const { domain, condition } = detectCondition(text);
  const question_type = detectQuestionType(text, condition);
  const interventions = detectInterventions(text, question_type);
  const outcomes = detectOutcomes(text, domain);
  const modifiers = detectModifiers(text, condition);
  return normalizeIntent({
    language: request.language,
    domain,
    condition,
    question_type,
    population: [],
    interventions,
    comparators: [],
    outcomes,
    modifiers,
    requested_depth: 'specialist',
    needs_dosing: question_type === 'therapy' && interventions.includes('pharmacological therapy'),
    needs_alternatives: ['therapy', 'surgery', 'management'].includes(question_type),
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
