function record(input) {
  return Object.freeze({
    sourceType: 'guideline',
    id: input.id,
    organization: input.organization,
    title: input.title,
    version: input.version,
    publicationDate: input.publicationDate || null,
    lastUpdated: input.lastUpdated || null,
    lastReviewed: input.lastReviewed || null,
    doi: input.doi || '',
    pmid: input.pmid || '',
    canonicalUrl: input.canonicalUrl,
    status: input.status || 'current',
    supersededBy: input.supersededBy || null,
    topics: Object.freeze([...(input.topics || [])]),
    jurisdiction: input.jurisdiction || 'international',
    evidenceMethod: input.evidenceMethod || 'professional-guideline',
    provenance: input.provenance || 'official-or-publisher-metadata'
  });
}

export const GUIDELINES = Object.freeze([
  record({
    id: 'aao-poag-ppp-2026',
    organization: 'American Academy of Ophthalmology',
    title: 'Primary Open-Angle Glaucoma Preferred Practice Pattern®',
    version: '2025-2026 PPP',
    publicationDate: '2026-02-09',
    doi: '10.1016/j.ophtha.2025.12.029',
    pmid: '41665583',
    canonicalUrl: 'https://www.aaojournal.org/article/S0161-6420(25)00815-2/fulltext',
    status: 'current',
    topics: ['glaucoma', 'primary open-angle glaucoma', 'ocular hypertension', 'medical therapy', 'laser trabeculoplasty', 'glaucoma surgery'],
    jurisdiction: 'United States / international professional reference',
    evidenceMethod: 'AAO Preferred Practice Pattern'
  }),
  record({
    id: 'egs-glaucoma-6e-2025',
    organization: 'European Glaucoma Society',
    title: 'European Glaucoma Society – Terminology and Guidelines for Glaucoma, 6th Edition',
    version: '6th Edition',
    publicationDate: '2025-09-08',
    doi: '10.1136/bjophthalmol-2025-egsguidelines',
    pmid: '41026937',
    canonicalUrl: 'https://www.eugs.org/pages/guidelines',
    status: 'current',
    topics: ['glaucoma', 'primary open-angle glaucoma', 'angle-closure glaucoma', 'ocular hypertension', 'medical therapy', 'laser therapy', 'glaucoma surgery'],
    jurisdiction: 'Europe / international professional reference',
    evidenceMethod: 'EGS evidence-based guideline'
  }),
  record({
    id: 'nice-ng81-glaucoma',
    organization: 'National Institute for Health and Care Excellence',
    title: 'Glaucoma: diagnosis and management',
    version: 'NG81',
    publicationDate: '2017-11-01',
    lastUpdated: '2022-01-26',
    lastReviewed: '2025-03-26',
    canonicalUrl: 'https://www.nice.org.uk/guidance/ng81',
    status: 'current',
    topics: ['glaucoma', 'chronic open-angle glaucoma', 'primary open-angle glaucoma', 'ocular hypertension', 'pharmacological treatment', 'selective laser trabeculoplasty', 'glaucoma surgery'],
    jurisdiction: 'United Kingdom',
    evidenceMethod: 'NICE guideline methodology'
  }),
  record({
    id: 'egs-glaucoma-5e-2020',
    organization: 'European Glaucoma Society',
    title: 'European Glaucoma Society Terminology and Guidelines for Glaucoma, 5th Edition',
    version: '5th Edition',
    publicationDate: '2020-10-01',
    canonicalUrl: 'https://www.eugs.org/pages/guidelines',
    status: 'superseded',
    supersededBy: 'egs-glaucoma-6e-2025',
    topics: ['glaucoma', 'primary open-angle glaucoma', 'ocular hypertension'],
    jurisdiction: 'Europe / international professional reference',
    evidenceMethod: 'EGS evidence-based guideline'
  })
]);

function searchableIntent(intent = {}) {
  return [
    intent.domain,
    intent.condition,
    intent.question_type,
    ...(Array.isArray(intent.interventions) ? intent.interventions : []),
    ...(Array.isArray(intent.outcomes) ? intent.outcomes : []),
    ...(Array.isArray(intent.modifiers) ? intent.modifiers : [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function guidelineTopicScore(guideline, intentText) {
  let score = 0;
  for (const topic of guideline.topics) {
    const normalized = topic.toLowerCase();
    if (intentText.includes(normalized) || normalized.includes(intentText)) score += 4;
    else for (const token of normalized.split(/\s+/)) if (token.length > 5 && intentText.includes(token)) score += 1;
  }
  return score;
}

function guidelineScore(guideline, intentText) {
  const topicScore = guidelineTopicScore(guideline, intentText);
  if (topicScore <= 0) return 0;
  let score = topicScore;
  if (guideline.status === 'current') score += 2;
  const date = guideline.lastUpdated || guideline.publicationDate || '';
  const year = Number(date.slice(0, 4));
  if (Number.isInteger(year)) score += Math.max(0, (year - 2015) / 20);
  return score;
}

export function isCurrentGuideline(guideline, asOf = new Date()) {
  if (!guideline || guideline.status !== 'current' || guideline.supersededBy) return false;
  const effectiveDate = guideline.publicationDate ? new Date(`${guideline.publicationDate}T00:00:00Z`) : null;
  if (effectiveDate && Number.isFinite(effectiveDate.getTime()) && effectiveDate > asOf) return false;
  return true;
}

export function findGuidelines(intent = {}, options = {}) {
  const asOf = options.asOf instanceof Date ? options.asOf : new Date();
  const includeSuperseded = Boolean(options.includeSuperseded);
  const intentText = searchableIntent(intent);
  return GUIDELINES
    .filter((guideline) => includeSuperseded || isCurrentGuideline(guideline, asOf))
    .map((guideline) => ({ guideline, score: guidelineScore(guideline, intentText) }))
    .filter((entry) => entry.score > 2)
    .sort((a, b) => b.score - a.score || String(b.guideline.lastUpdated || b.guideline.publicationDate).localeCompare(String(a.guideline.lastUpdated || a.guideline.publicationDate)))
    .map((entry) => entry.guideline);
}
