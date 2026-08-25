function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9+.-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinedDocumentText(document = {}) {
  return normalizeText([
    document.title,
    document.abstract_or_summary,
    document.journal_or_body,
    ...(Array.isArray(document.publication_types) ? document.publication_types : [])
  ].filter(Boolean).join(' '));
}

function containsPhrase(text, phrase) {
  const needle = normalizeText(phrase);
  return Boolean(needle && text.includes(needle));
}

function containsAny(text, values = []) {
  return values.some((value) => containsPhrase(text, value));
}

const THERAPY_TERMS = [
  'therapy', 'treatment', 'medical treatment', 'pharmacological', 'medication', 'drug',
  'prostaglandin', 'beta blocker', 'carbonic anhydrase inhibitor', 'alpha agonist',
  'rho kinase inhibitor', 'fixed combination', 'latanoprost', 'travoprost', 'bimatoprost',
  'timolol', 'dorzolamide', 'brinzolamide', 'brimonidine', 'netarsudil',
  'терапия', 'лечение', 'медикаментоз', 'препарат', 'капли'
];

const DRUG_TERMS = new Set([
  'latanoprost', 'timolol', 'travoprost', 'bimatoprost', 'tafluprost', 'brimonidine',
  'dorzolamide', 'brinzolamide', 'netarsudil', 'aflibercept', 'faricimab',
  'ranibizumab', 'bevacizumab', 'brolucizumab'
]);

const FIXED_COMBINATION_TERMS = [
  'fixed combination', 'fixed-dose combination', 'fixed dose combination', 'fixed-combination',
  'combination product', 'комбинац'
];

const DIRECT_MONOTHERAPY_TERMS = [
  'monotherapy', 'head-to-head', 'head to head', 'versus', ' vs ', 'compared with', 'compared to',
  'монотерап', 'сравнен'
];

const SURGERY_TERMS = [
  'surgery', 'surgical', 'operation', 'operative', 'vitrectomy', 'pars plana vitrectomy',
  'scleral buckle', 'scleral buckling', 'pneumatic retinopexy', 'retinopexy', 'tamponade',
  'ilm peeling', 'internal limiting membrane peeling', 'inverted ilm flap', 'membrane peeling',
  'хирург', 'операц', 'витрэктом', 'витреэктом', 'склеральн', 'пломбирован', 'пневморетинопекс', 'пилинг'
];

const MOLECULAR_CONTEXT_TERMS = [
  'proteome', 'proteomic', 'protein expression', 'biomarker', 'molecular', 'metabolomic',
  'transcriptomic', 'cytokine', 'gene expression', 'pathway analysis',
  'протеом', 'биомаркер', 'молекуляр', 'метаболом', 'цитокин'
];

const DIAGNOSIS_TERMS = [
  'diagnosis', 'diagnostic', 'screening', 'optical coherence tomography', 'oct',
  'диагност', 'скрининг', 'томография'
];

const GENERIC_INTERVENTIONS = new Set([
  'pharmacological therapy', 'medical therapy', 'drug therapy', 'management',
  'surgical management', 'treatment', 'therapy'
]);

const GLAUCOMA_TERMS = ['glaucoma', 'primary open-angle glaucoma', 'open-angle glaucoma', 'poag', 'глауком', 'поуг'];
const RETINAL_DETACHMENT_TERMS = ['retinal detachment', 'rhegmatogenous retinal detachment', 'rrd', 'отслойка сетчатки'];
const MACULAR_HOLE_TERMS = ['macular hole', 'full-thickness macular hole', 'ftmh', 'макулярный разрыв'];
const ERM_TERMS = ['epiretinal membrane', 'erm', 'эпиретинальная мембрана', 'эпиретинальный фиброз'];

function competingDomainPenalty(text, intent) {
  const target = normalizeText([intent?.domain, intent?.condition].filter(Boolean).join(' '));
  const groups = [
    { terms: GLAUCOMA_TERMS, targetTerms: GLAUCOMA_TERMS },
    { terms: RETINAL_DETACHMENT_TERMS, targetTerms: RETINAL_DETACHMENT_TERMS },
    { terms: MACULAR_HOLE_TERMS, targetTerms: MACULAR_HOLE_TERMS },
    { terms: ERM_TERMS, targetTerms: ERM_TERMS }
  ];

  let penalty = 0;
  for (const group of groups) {
    const documentMatches = containsAny(text, group.terms);
    const targetMatches = containsAny(target, group.targetTerms);
    if (documentMatches && !targetMatches) penalty += 0.65;
  }
  return Math.min(0.85, penalty);
}

function questionTypeScore(text, questionType) {
  const type = normalizeText(questionType);
  if (type === 'therapy' || type === 'treatment' || type === 'effectiveness' || type === 'comparison') {
    if (containsAny(text, THERAPY_TERMS)) return 0.12;
    if (containsAny(text, DIAGNOSIS_TERMS)) return -0.08;
  }
  if (type === 'surgery') {
    const surgical = containsAny(text, SURGERY_TERMS);
    const molecularOnly = containsAny(text, MOLECULAR_CONTEXT_TERMS) && !surgical;
    if (molecularOnly) return -0.22;
    if (surgical) return 0.18;
    return -0.08;
  }
  if (type === 'diagnosis') {
    if (containsAny(text, DIAGNOSIS_TERMS)) return 0.12;
  }
  return 0;
}

function interventionScore(text, interventions = []) {
  let score = 0;
  for (const intervention of interventions) {
    const normalized = normalizeText(intervention);
    if (!normalized) continue;
    if (containsPhrase(text, normalized)) {
      score = Math.max(score, 0.22);
      continue;
    }
    if (/pharmac|medical|medication|drug|медикамент|лекарств/.test(normalized) && containsAny(text, THERAPY_TERMS)) {
      score = Math.max(score, 0.2);
    }
    if (/surg|vitrect|buckl|retinopex|peel|flap|хирург|витрэкт|пилинг/.test(normalized) && containsAny(text, SURGERY_TERMS)) {
      score = Math.max(score, 0.18);
    }
  }
  return score;
}

function specificTerms(values = []) {
  return [...new Set(values
    .map(normalizeText)
    .filter((value) => value && !GENERIC_INTERVENTIONS.has(value)))];
}

function namedTreatmentRelevance(text, intent = {}) {
  const interventions = specificTerms(intent.interventions || []);
  const comparators = specificTerms(intent.comparators || []);
  if (!interventions.length && !comparators.length) return 0;

  const interventionMatch = interventions.some((value) => containsPhrase(text, value));
  const comparatorMatch = comparators.some((value) => containsPhrase(text, value));
  const isComparison = normalizeText(intent.question_type) === 'comparison' && interventions.length && comparators.length;

  if (isComparison) {
    if (interventionMatch && comparatorMatch) return 0.45;
    if (interventionMatch || comparatorMatch) return -0.12;
    return -0.5;
  }

  if (interventionMatch || comparatorMatch) return 0.18;
  return -0.28;
}

function monotherapyComparisonPenalty(text, intent = {}) {
  if (normalizeText(intent.question_type) !== 'comparison') return 0;
  const interventions = specificTerms(intent.interventions || []);
  const comparators = specificTerms(intent.comparators || []);
  if (!interventions.length || !comparators.length) return 0;

  const requested = [...interventions, ...comparators];
  if (!requested.every((term) => DRUG_TERMS.has(term))) return 0;
  if (!containsAny(text, FIXED_COMBINATION_TERMS)) return 0;

  // Fixed-combination studies can remain secondary context, but they must not outrank
  // direct evidence when the clinician asked for A versus B as separate therapies.
  if (containsAny(text, DIRECT_MONOTHERAPY_TERMS) && containsPhrase(text, 'monotherapy')) return 0.25;
  return 0.85;
}

function outcomeScore(text, outcomes = []) {
  let score = 0;
  for (const outcome of outcomes) {
    const normalized = normalizeText(outcome);
    if (!normalized) continue;
    if (containsPhrase(text, normalized)) score = Math.max(score, 0.1);
    if (/intraocular pressure|iop|внутриглазн|вгд/.test(normalized) && /intraocular pressure|\biop\b|внутриглазн|\bвгд\b/.test(text)) {
      score = Math.max(score, 0.1);
    }
  }
  return score;
}

export function scoreMedicalRelevance(document = {}, intent = {}) {
  const text = joinedDocumentText(document);
  if (!text) return 0;

  const condition = normalizeText(intent.condition);
  const domain = normalizeText(intent.domain);
  let score = 0;

  if (condition && containsPhrase(text, condition)) {
    score += 0.55;
  } else if (condition && domain && condition.includes(domain) && containsPhrase(text, domain)) {
    score += 0.15;
  }

  if (domain && containsPhrase(text, domain)) score += 0.25;
  score += interventionScore(text, intent.interventions);
  score += interventionScore(text, intent.comparators);
  score += namedTreatmentRelevance(text, intent);
  score += outcomeScore(text, intent.outcomes);
  score += questionTypeScore(text, intent.question_type);
  score -= competingDomainPenalty(text, intent);
  score -= monotherapyComparisonPenalty(text, intent);

  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

export function filterRelevantDocuments(documents = [], intent = {}, threshold = 0.45) {
  if (!Array.isArray(documents)) throw new Error('documents must be an array');
  const minimum = Number.isFinite(Number(threshold)) ? Number(threshold) : 0.45;
  return documents
    .map((document) => ({ document, score: scoreMedicalRelevance(document, intent) }))
    .filter((item) => item.score >= minimum)
    .sort((a, b) => b.score - a.score);
}
