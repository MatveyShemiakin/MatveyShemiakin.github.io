import { interpretClinicalQuestion, interpretIntentWithAi } from './query-interpreter.js';

function isResolvedIntent(intent = {}) {
  return Boolean(
    String(intent.condition || '').trim() &&
    String(intent.domain || '').trim() &&
    intent.domain !== 'ophthalmology' &&
    !(Array.isArray(intent.ambiguities) && intent.ambiguities.length)
  );
}

export async function resolveClinicalIntent(payload, env = {}, deps = {}) {
  const deterministic = await interpretClinicalQuestion(payload);
  if (isResolvedIntent(deterministic)) return deterministic;

  let interpretIntent = deps.interpretIntent;
  if (typeof interpretIntent !== 'function' && typeof env?.AI?.run === 'function') {
    interpretIntent = (validatedRequest) => interpretIntentWithAi(validatedRequest, env, deps.intentReasonerDeps || {});
  }
  if (typeof interpretIntent !== 'function') return deterministic;

  return interpretClinicalQuestion(payload, { interpretIntent });
}
