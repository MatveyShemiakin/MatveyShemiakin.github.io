export const V2_SCHEMA_VERSION = '2.0';
export const SUPPORTED_LANGUAGES = new Set(['ru', 'en']);
export const MAX_QUESTION_LENGTH = 1200;
export const MAX_INTENT_ITEMS = 16;

function cleanString(value, max = 500, label = 'value', { required = false } = {}) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (required && !text) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} is too long`);
  return text;
}

function cleanArray(value, label, maxItems = MAX_INTENT_ITEMS) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maxItems) throw new Error(`${label} has too many items`);
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const text = cleanString(item, 300, label);
    if (!text) continue;
    const key = text.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

export function validateResearchRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Request payload is required');
  if (payload.schemaVersion !== V2_SCHEMA_VERSION) throw new Error('Unsupported schemaVersion');
  if (!SUPPORTED_LANGUAGES.has(payload.language)) throw new Error('Unsupported language');
  const question = cleanString(payload.question, MAX_QUESTION_LENGTH, 'Question', { required: true });
  const mode = cleanString(payload.mode || 'standard', 20, 'Mode');
  if (!['standard'].includes(mode)) throw new Error('Unsupported mode');
  return {
    schemaVersion: V2_SCHEMA_VERSION,
    language: payload.language,
    question,
    mode,
    filters: payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters) ? { ...payload.filters } : {}
  };
}

export function normalizeIntent(intent = {}) {
  const language = SUPPORTED_LANGUAGES.has(intent.language) ? intent.language : 'en';
  return {
    language,
    domain: cleanString(intent.domain, 120, 'Domain'),
    condition: cleanString(intent.condition, 240, 'Condition'),
    question_type: cleanString(intent.question_type || 'general', 80, 'Question type'),
    population: cleanArray(intent.population, 'Population'),
    interventions: cleanArray(intent.interventions, 'Interventions'),
    comparators: cleanArray(intent.comparators, 'Comparators'),
    outcomes: cleanArray(intent.outcomes, 'Outcomes'),
    modifiers: cleanArray(intent.modifiers, 'Modifiers'),
    requested_depth: cleanString(intent.requested_depth || 'specialist', 40, 'Requested depth'),
    needs_dosing: Boolean(intent.needs_dosing),
    needs_alternatives: intent.needs_alternatives !== false,
    ambiguities: cleanArray(intent.ambiguities, 'Ambiguities')
  };
}

function assertCitationList(citations, knownSourceIds, path) {
  if (citations == null) return;
  if (!Array.isArray(citations)) throw new Error(`${path}.citations must be an array`);
  for (const rawId of citations) {
    const sourceId = String(rawId || '').trim();
    if (!knownSourceIds.has(sourceId)) throw new Error(`Unknown source citation: ${sourceId || '(empty)'}`);
  }
}

function validateCitedItems(items, knownSourceIds, path) {
  if (items == null) return [];
  if (!Array.isArray(items)) throw new Error(`${path} must be an array`);
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${path}[${index}] must be an object`);
    assertCitationList(item.citations, knownSourceIds, `${path}[${index}]`);
  }
  return items;
}

export function validateStructuredAnswer(answer, sourceIds) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('Structured answer is required');
  if (answer.schemaVersion !== V2_SCHEMA_VERSION) throw new Error('Unsupported answer schemaVersion');
  cleanString(answer.clinical_bottom_line, 4000, 'Clinical bottom line', { required: true });

  const knownSourceIds = sourceIds instanceof Set ? sourceIds : new Set(Array.isArray(sourceIds) ? sourceIds : []);
  validateCitedItems(answer.management, knownSourceIds, 'management');
  validateCitedItems(answer.arguments_for, knownSourceIds, 'arguments_for');
  validateCitedItems(answer.arguments_against, knownSourceIds, 'arguments_against');
  validateCitedItems(answer.alternatives, knownSourceIds, 'alternatives');
  validateCitedItems(answer.guideline_positions, knownSourceIds, 'guideline_positions');
  validateCitedItems(answer.uncertainties, knownSourceIds, 'uncertainties');

  if (!Array.isArray(answer.sources)) throw new Error('sources must be an array');
  for (const source of answer.sources) {
    if (!source || typeof source !== 'object') throw new Error('Invalid source metadata');
    const sourceId = cleanString(source.source_id, 40, 'Source ID', { required: true });
    if (!knownSourceIds.has(sourceId)) throw new Error(`Unknown source metadata: ${sourceId}`);
  }

  return answer;
}
