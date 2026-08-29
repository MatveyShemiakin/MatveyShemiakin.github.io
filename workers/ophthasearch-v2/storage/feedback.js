export const FEEDBACK_ERROR_TAGS = new Set([
  'irrelevant_sources',
  'wrong_conclusion',
  'missing_evidence',
  'wrong_management',
  'citation_problem',
  'too_slow',
  'other'
]);

const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_COMMENT_LENGTH = 1000;
const MAX_ERROR_TAGS = 7;

function clean(value, max = 1000) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length > max) throw new Error('Feedback value is too long');
  return text;
}

export function validateFeedbackRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Feedback payload is required');
  if (payload.schemaVersion !== '2.0') throw new Error('Unsupported feedback schemaVersion');

  const runId = clean(payload.runId, 80);
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('Invalid feedback runId');

  const rating = clean(payload.rating, 20);
  if (!['helpful', 'problem'].includes(rating)) throw new Error('Invalid feedback rating');

  const rawTags = payload.errorTags == null ? [] : payload.errorTags;
  if (!Array.isArray(rawTags)) throw new Error('Feedback error tags must be an array');
  if (rawTags.length > MAX_ERROR_TAGS) throw new Error('Too many feedback error tags');

  const errorTags = [];
  const seen = new Set();
  for (const raw of rawTags) {
    const tag = clean(raw, 80);
    if (!FEEDBACK_ERROR_TAGS.has(tag)) throw new Error(`Invalid feedback tag: ${tag || '(empty)'}`);
    if (!seen.has(tag)) {
      seen.add(tag);
      errorTags.push(tag);
    }
  }

  return {
    schemaVersion: '2.0',
    runId,
    rating,
    errorTags,
    comment: clean(payload.comment, MAX_COMMENT_LENGTH)
  };
}
