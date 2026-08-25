import { validateStructuredAnswer } from './contracts.js';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function normalized(value) {
  return clean(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[–—]/g, '-')
    .replace(/[^a-zа-я0-9.%µ+/-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceMap(evidencePack) {
  return new Map((evidencePack?.sources || []).map((source) => [source.source_id, source]));
}

function citationIds(value, path, map, { required = false } = {}) {
  if (!Array.isArray(value)) throw new Error(`${path} citations must be an array`);
  if (required && !value.length) throw new Error(`${path} requires at least one source citation`);
  const result = [];
  for (const raw of value) {
    const id = clean(raw);
    if (!map.has(id)) throw new Error(`Unknown source citation: ${id || '(empty)'}`);
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

function safeCitationIds(value, map) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const raw of value) {
    const id = clean(raw);
    if (map.has(id) && !result.includes(id)) result.push(id);
  }
  return result;
}

function evidenceText(source) {
  return normalized([
    source.title,
    source.abstract_or_summary,
    source.extracted_evidence,
    ...(Array.isArray(source.evidence_notes) ? source.evidence_notes : []),
    ...(Array.isArray(source.primary_outcomes) ? source.primary_outcomes : [])
  ].filter(Boolean).join(' '));
}

function regimenSupported(value, sources) {
  const needle = normalized(value);
  if (!needle) return true;
  return sources.some((source) => evidenceText(source).includes(needle));
}

function verifyManagementItem(item, map) {
  if (!item || typeof item !== 'object') return null;
  const citations = safeCitationIds(item.citations, map);
  if (!citations.length) return null;
  const citedSources = citations.map((id) => map.get(id));
  const verified = { ...item, citations };
  for (const field of ['dose', 'frequency', 'duration']) {
    const value = clean(item[field]);
    verified[field] = value && regimenSupported(value, citedSources) ? value : '';
  }
  return verified;
}

function verifyCitedSection(items, map, { citationsRequired = true } = {}) {
  if (!Array.isArray(items)) return [];
  const verified = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const text = clean(item.text);
    if (!text) continue;
    const citations = safeCitationIds(item.citations || [], map);
    if (citationsRequired && !citations.length) continue;
    verified.push({ ...item, text, citations });
  }
  return verified;
}

function safeSource(source) {
  return {
    source_id: source.source_id,
    source_type: source.source_type || '',
    title: source.title || '',
    authors: Array.isArray(source.authors) ? [...source.authors] : [],
    journal_or_body: source.journal_or_body || '',
    year: source.year ?? null,
    doi: source.doi || '',
    pmid: source.pmid || '',
    pmcid: source.pmcid || '',
    nct: source.nct || '',
    canonical_url: source.canonical_url || '',
    guideline_version: source.guideline_version || null,
    retrieved_from: Array.isArray(source.retrieved_from) ? [...source.retrieved_from] : [],
    evidence: source.evidence ? { ...source.evidence } : null,
    quality_flags: Array.isArray(source.quality_flags) ? [...source.quality_flags] : []
  };
}

export function verifyClaimsAndCitations(draft, evidencePack) {
  if (!draft || draft.schemaVersion !== '2.0') throw new Error('Invalid reasoning draft schema');
  const map = sourceMap(evidencePack);
  if (!map.size) throw new Error('Evidence Pack has no sources');
  const bottomLine = clean(draft.clinical_bottom_line);
  if (!bottomLine) throw new Error('Clinical bottom line is required');

  // The main conclusion remains strict: it must be traceable to known Evidence Pack sources.
  const bottomLineCitations = citationIds(draft.bottom_line_citations || [], 'clinical_bottom_line', map, { required: true });

  // Secondary sections are fail-soft. Unsupported regimen details or bad secondary
  // citations are removed instead of discarding an otherwise verified conclusion.
  const answer = {
    schemaVersion: '2.0',
    clinical_bottom_line: bottomLine,
    bottom_line_citations: bottomLineCitations,
    confidence: ['high', 'moderate', 'low', 'insufficient'].includes(draft.confidence) ? draft.confidence : 'insufficient',
    management: (Array.isArray(draft.management) ? draft.management : [])
      .map((item) => verifyManagementItem(item, map))
      .filter(Boolean),
    arguments_for: verifyCitedSection(draft.arguments_for || [], map),
    arguments_against: verifyCitedSection(draft.arguments_against || [], map),
    alternatives: verifyCitedSection(draft.alternatives || [], map),
    guideline_positions: verifyCitedSection(draft.guideline_positions || [], map),
    uncertainties: verifyCitedSection(draft.uncertainties || [], map, { citationsRequired: false }),
    clinical_interpretation: clean(draft.clinical_interpretation),
    sources: [...map.values()].map(safeSource)
  };

  validateStructuredAnswer(answer, new Set(map.keys()));
  return answer;
}

export function renderSafeSources(evidencePack) {
  return [...sourceMap(evidencePack).values()].map(safeSource);
}
