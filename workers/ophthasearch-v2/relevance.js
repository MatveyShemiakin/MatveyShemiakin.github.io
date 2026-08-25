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
    if (interventionMatch && comparatorMatch) return 0.32;
    if (interventionMatch || comparatorMatch) return 0.04;
    return -0.5;
  }

  if (interventionMatch || comparatorMatch) return 0.18;
  return -0.28;
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
