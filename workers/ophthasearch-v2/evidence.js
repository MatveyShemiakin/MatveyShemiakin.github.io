import { filterRelevantDocuments } from './relevance.js';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanLower(value) {
  return clean(value).toLowerCase();
}

function normalizeDoi(value) {
  return cleanLower(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '');
}

function arrayOfStrings(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  const text = clean(value);
  return text ? [text] : [];
}

function normalizeYear(value) {
  const match = clean(value).match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function inferSourceType(record = {}, context = {}) {
  const explicit = cleanLower(record.sourceType || record.source_type || context.sourceType);
  if (explicit) return explicit;
  const provider = cleanLower(context.retrievedFrom || record.providerKey || record.provider);
  if (record.nct || record.registryId || provider === 'clinicaltrials') return 'trial_registry';
  if (record.guidelineVersion || record.guideline_version || explicit === 'guideline') return 'guideline';
  return 'journal_article';
}

export function normalizeDocument(record = {}, context = {}) {
  const retrievedFrom = arrayOfStrings(context.retrievedFrom || record.retrieved_from || record.retrievedFrom || record.providerKey || record.provider);
  const authors = Array.isArray(record.authors)
    ? arrayOfStrings(record.authors)
    : clean(record.authors || record.authorString)
      ? clean(record.authors || record.authorString).split(/\s*,\s*/).filter(Boolean)
      : [];

  return {
    source_id: clean(record.source_id),
    source_type: inferSourceType(record, context),
    title: clean(record.title),
    authors,
    journal_or_body: clean(record.journal_or_body || record.journal || record.journalTitle || record.organization),
    year: normalizeYear(record.year || record.pubYear || record.publicationYear),
    abstract_or_summary: clean(record.abstract_or_summary || record.abstractText || record.summary || record.description),
    doi: normalizeDoi(record.doi),
    pmid: clean(record.pmid),
    pmcid: clean(record.pmcid),
    nct: clean(record.nct || record.registryId).toUpperCase(),
    canonical_url: clean(record.canonical_url || record.sourceUrl || record.url),
    publication_types: arrayOfStrings(record.publication_types || record.publicationTypes),
    guideline_version: clean(record.guideline_version || record.guidelineVersion) || null,
    guideline_status: clean(record.guideline_status || record.guidelineStatus) || null,
    superseded_by: clean(record.superseded_by || record.supersededBy) || null,
    retrieved_from: [...new Set(retrievedFrom)],
    sample_size: Number.isFinite(Number(record.sample_size ?? record.sampleSize)) ? Number(record.sample_size ?? record.sampleSize) : null,
    primary_outcomes: arrayOfStrings(record.primary_outcomes || record.primaryOutcomes),
    verification: {
      identifier_verified: Boolean(record.verification?.identifier_verified || record.identifierVerified),
      metadata_crosschecked: Boolean(record.verification?.metadata_crosschecked || record.metadataCrosschecked)
    }
  };
}

function titleKey(document) {
  const firstAuthor = cleanLower(document.authors?.[0]).replace(/[^a-zа-я0-9]+/gi, ' ');
  const title = cleanLower(document.title).replace(/[^a-zа-я0-9]+/gi, ' ');
  return title && document.year ? `title:${title}|${document.year}|${firstAuthor}` : '';
}

function identityKeys(document) {
  const keys = [];
  if (document.doi) keys.push(`doi:${document.doi}`);
  if (document.pmid) keys.push(`pmid:${cleanLower(document.pmid)}`);
  if (document.nct) keys.push(`nct:${cleanLower(document.nct)}`);
  const fallback = titleKey(document);
  if (fallback) keys.push(fallback);
  return keys;
}

function mergeDocuments(left, right) {
  return {
    ...left,
    title: left.title || right.title,
    authors: left.authors?.length ? left.authors : right.authors,
    journal_or_body: left.journal_or_body || right.journal_or_body,
    year: left.year || right.year,
    abstract_or_summary: left.abstract_or_summary || right.abstract_or_summary,
    doi: left.doi || right.doi,
    pmid: left.pmid || right.pmid,
    pmcid: left.pmcid || right.pmcid,
    nct: left.nct || right.nct,
    canonical_url: left.canonical_url || right.canonical_url,
    publication_types: [...new Set([...(left.publication_types || []), ...(right.publication_types || [])])],
    retrieved_from: [...new Set([...(left.retrieved_from || []), ...(right.retrieved_from || [])])],
    sample_size: left.sample_size ?? right.sample_size,
    primary_outcomes: [...new Set([...(left.primary_outcomes || []), ...(right.primary_outcomes || [])])],
    verification: {
      identifier_verified: Boolean(left.verification?.identifier_verified || right.verification?.identifier_verified),
      metadata_crosschecked: Boolean(left.verification?.metadata_crosschecked || right.verification?.metadata_crosschecked)
    }
  };
}

export function deduplicateDocuments(documents = []) {
  const output = [];
  const keyToIndex = new Map();
  for (const raw of documents) {
    const document = raw?.source_type ? raw : normalizeDocument(raw);
    const keys = identityKeys(document);
    const duplicateIndex = keys.map((key) => keyToIndex.get(key)).find((value) => Number.isInteger(value));
    if (Number.isInteger(duplicateIndex)) {
      output[duplicateIndex] = mergeDocuments(output[duplicateIndex], document);
      for (const key of identityKeys(output[duplicateIndex])) keyToIndex.set(key, duplicateIndex);
      continue;
    }
    const index = output.length;
    output.push(document);
    for (const key of keys) keyToIndex.set(key, index);
  }
  return output;
}

export function classifyEvidence(document = {}) {
  if (document.source_type === 'trial_registry' || document.nct) {
    return { tier: null, rank: 90, group: 'ongoing', label: 'Registered / ongoing study', useForEfficacy: false };
  }
  if (document.source_type === 'guideline') {
    return { tier: 0, rank: 0, group: 'guideline', label: 'Current guideline / consensus', useForEfficacy: true };
  }
  const text = cleanLower([...(document.publication_types || []), document.title].join(' '));
  if (/systematic review|meta-analysis|meta analysis|network meta/.test(text)) return { tier: 1, rank: 1, group: 'systematic', label: 'Systematic review / meta-analysis', useForEfficacy: true };
  if (/randomized controlled|randomised controlled|randomized trial|randomised trial|\brct\b/.test(text)) return { tier: 2, rank: 2, group: 'rct', label: 'Randomized controlled trial', useForEfficacy: true };
  if (/cohort|case-control|case control|prospective|retrospective|observational|comparative study/.test(text)) return { tier: 3, rank: 3, group: 'observational', label: 'Comparative / observational study', useForEfficacy: true };
  if (/case series|case report/.test(text)) return { tier: 4, rank: 4, group: 'case', label: 'Case series / report', useForEfficacy: true };
  if (/narrative review|expert opinion|editorial|commentary/.test(text)) return { tier: 5, rank: 5, group: 'expert', label: 'Narrative / expert evidence', useForEfficacy: true };
  return { tier: null, rank: 6, group: 'other', label: 'Design not classified', useForEfficacy: true };
}

export function qualityFlags(document = {}, intent = {}) {
  const flags = [];
  const text = cleanLower([...(document.publication_types || []), document.title, document.abstract_or_summary].join(' '));
  if (/retrospective/.test(text)) flags.push('retrospective-design');
  if (Number.isFinite(document.sample_size) && document.sample_size > 0 && document.sample_size < 50) flags.push('small-sample');
  const outcomes = (document.primary_outcomes || []).map(cleanLower);
  if (outcomes.some((outcome) => /intraocular pressure|iop|anatomical closure|central retinal thickness|crt/.test(outcome))) flags.push('surrogate-outcome');
  if (document.source_type === 'guideline' && (document.superseded_by || /superseded|withdrawn|obsolete/.test(cleanLower(document.guideline_status)))) flags.push('superseded-guideline');
  if (intent.condition && document.abstract_or_summary && !cleanLower(`${document.title} ${document.abstract_or_summary}`).includes(cleanLower(intent.condition)) && !cleanLower(`${document.title} ${document.abstract_or_summary}`).includes(cleanLower(intent.domain))) flags.push('indirect-population');
  return [...new Set(flags)];
}

function attachEvidenceMetadata(item, intent, sourceId) {
  const evidence = classifyEvidence(item.document);
  return {
    ...item.document,
    source_id: sourceId,
    relevance_score: item.score,
    evidence,
    quality_flags: qualityFlags(item.document, intent)
  };
}

export function buildEvidencePack(intent = {}, documents = [], { relevanceThreshold = 0.45, maxSources = 24 } = {}) {
  const deduplicated = deduplicateDocuments(documents.map((document) => document?.source_type ? document : normalizeDocument(document)));
  const relevant = filterRelevantDocuments(deduplicated, intent, relevanceThreshold)
    .sort((a, b) => b.score - a.score || classifyEvidence(a.document).rank - classifyEvidence(b.document).rank)
    .slice(0, maxSources);

  const sources = relevant.map((item, index) => attachEvidenceMetadata(item, intent, `S${index + 1}`));
  const efficacy = sources.filter((source) => source.evidence.useForEfficacy && source.evidence.group !== 'guideline');
  const guidelines = sources.filter((source) => source.evidence.group === 'guideline');
  const ongoingTrials = sources.filter((source) => source.evidence.group === 'ongoing');

  return {
    schema_version: '2.0',
    intent,
    sources,
    guidelines,
    efficacy,
    safety: [],
    alternatives: [],
    ongoing_trials: ongoingTrials,
    contradictions: [],
    evidence_gaps: []
  };
}
