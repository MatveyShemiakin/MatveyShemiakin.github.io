import { RESEARCH_ALLOWED_ORIGIN } from './pipeline.js';
import { sanitizeFreeText } from './storage/privacy.js';
import { validateFeedbackRequest } from './storage/feedback.js';
import { insertFeedback, researchRunExists } from './storage/d1.js';

export const MAX_FEEDBACK_BODY_BYTES = 16 * 1024;

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': RESEARCH_ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    ...extra
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store'
    })
  });
}

function datasetFeedbackEnabled(env = {}) {
  return Boolean(
    env?.OPHTHASEARCH_DB &&
    String(env?.OPHTHASEARCH_DATASET_HASH_KEY || '').trim()
  );
}

function feedbackRecord(payload, privacy, feedbackId) {
  const hasSafeComment = privacy.storageState === 'redacted_text' && Boolean(privacy.redactedText);
  return {
    feedback_id: feedbackId,
    run_id: payload.runId,
    created_at: new Date().toISOString(),
    rating: payload.rating,
    error_tags_json: JSON.stringify(payload.errorTags),
    comment_redacted: hasSafeComment ? privacy.redactedText : null,
    comment_storage_state: hasSafeComment ? 'redacted_text' : 'metadata_only',
    review_status: 'unreviewed'
  };
}

export async function handleFeedbackRequest(request, env, ctx, deps = {}) {
  if (request.headers.get('Origin') !== RESEARCH_ALLOWED_ORIGIN) {
    return json({ ok: false, error: { code: 'ORIGIN_NOT_ALLOWED' } }, 403);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== 'POST') return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);
  }
  if (!datasetFeedbackEnabled(env)) {
    return json({ ok: false, error: { code: 'FEEDBACK_UNAVAILABLE' } }, 503);
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_FEEDBACK_BODY_BYTES) {
    return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);
  }

  let payload;
  try {
    payload = validateFeedbackRequest(JSON.parse(text));
  } catch {
    return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);
  }

  const store = deps.datasetStore || {};
  const exists = store.researchRunExists || researchRunExists;
  const write = store.insertFeedback || insertFeedback;

  try {
    if (!await exists(env.OPHTHASEARCH_DB, payload.runId)) {
      return json({ ok: false, error: { code: 'RUN_NOT_FOUND' } }, 404);
    }
    const privacy = sanitizeFreeText(payload.comment);
    const feedbackId = typeof deps.randomUUID === 'function'
      ? deps.randomUUID()
      : globalThis.crypto.randomUUID();
    await write(env.OPHTHASEARCH_DB, feedbackRecord(payload, privacy, feedbackId));
    return json({ ok: true, feedback_id: feedbackId }, 200);
  } catch {
    return json({ ok: false, error: { code: 'FEEDBACK_UNAVAILABLE' } }, 503);
  }
}
