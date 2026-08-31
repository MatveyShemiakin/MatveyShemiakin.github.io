import { interpretClinicalQuestion, interpretIntentWithAi } from './query-interpreter.js';

const COMPARISON_ALIASES = new Map([
  ['selective laser trabeculoplasty', ['selective laser trabeculoplasty', 'slt', 'слт']],
  ['pars plana vitrectomy', ['pars plana vitrectomy', 'ppv', 'vitrectomy', 'витрэктомия', 'витреэктомия']],
  ['scleral buckling', ['scleral buckling', 'scleral buckle', 'склеральное пломбирование', 'эписклеральное пломбирование']],
  ['pneumatic retinopexy', ['pneumatic retinopexy', 'пневморетинопексия']],
  ['inverted ILM flap', ['inverted ilm flap', 'inverted internal limiting membrane flap', 'инвертированный лоскут впм']],
  ['internal limiting membrane peeling', ['conventional ilm peeling', 'standard ilm peeling', 'internal limiting membrane peeling', 'ilm peeling', 'пилинг впм']]
]);

function normalizedQuestion(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function itemPosition(question, canonical) {
  const aliases = COMPARISON_ALIASES.get(canonical) || [canonical];
  let position = Number.POSITIVE_INFINITY;
  for (const alias of aliases) {
    const index = question.indexOf(normalizedQuestion(alias));
    if (index >= 0) position = Math.min(position, index);
  }
  return position;
}

function splitMixedComparison(intent = {}, question = '') {
  if (intent.question_type !== 'comparison') return intent;
  if (Array.isArray(intent.comparators) && intent.comparators.length) return intent;
  const candidates = Array.isArray(intent.interventions) ? [...new Set(intent.interventions)] : [];
  if (candidates.length < 2) return intent;

  const text = normalizedQuestion(question);
  const ordered = candidates
    .map((canonical, originalIndex) => ({ canonical, originalIndex, position: itemPosition(text, canonical) }))
    .sort((left, right) => left.position - right.position || left.originalIndex - right.originalIndex);

  if (!Number.isFinite(ordered[0]?.position) || !Number.isFinite(ordered[1]?.position)) return intent;
  return {
    ...intent,
    interventions: [ordered[0].canonical],
    comparators: ordered.slice(1).map((item) => item.canonical)
  };
}

function isResolvedIntent(intent = {}) {
  return Boolean(
    String(intent.condition || '').trim() &&
    String(intent.domain || '').trim() &&
    intent.domain !== 'ophthalmology' &&
    !(Array.isArray(intent.ambiguities) && intent.ambiguities.length)
  );
}

export async function resolveClinicalIntent(payload, env = {}, deps = {}) {
  const deterministic = splitMixedComparison(await interpretClinicalQuestion(payload), payload?.question);
  if (isResolvedIntent(deterministic)) return deterministic;

  let interpretIntent = deps.interpretIntent;
  if (typeof interpretIntent !== 'function' && typeof env?.AI?.run === 'function') {
    interpretIntent = (validatedRequest) => interpretIntentWithAi(validatedRequest, env, deps.intentReasonerDeps || {});
  }
  if (typeof interpretIntent !== 'function') return deterministic;

  const interpreted = await interpretClinicalQuestion(payload, { interpretIntent });
  return splitMixedComparison(interpreted, payload?.question);
}
