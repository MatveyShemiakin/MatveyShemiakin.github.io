import { extractClinicalFacts } from './extract-clinical-facts.mjs';
import { buildPhysicianChoiceContext } from './knowledge-retrieval.mjs';
import { generateClinicalOptions } from './generate-clinical-options.mjs';

function response(statusCode, body, origin = '*') {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function requestOrigin(event) {
  return event?.headers?.origin || event?.headers?.Origin || '';
}

function allowedOrigin(event, env) {
  const configured = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const origin = requestOrigin(event);
  if (!configured.length) return '*';
  return configured.includes(origin) ? origin : configured[0];
}

function parseBody(event) {
  if (!event?.body) return {};
  if (typeof event.body === 'object') return event.body;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw);
}

async function handleExtract(body, env) {
  const result = await extractClinicalFacts({
    caseText: body.case_text,
    priorFacts: body.prior_facts || null,
    env
  });
  return {
    ok: true,
    action: 'extract_facts',
    provider: result.provider,
    facts: result.facts,
    usage: result.usage,
    provider_response_id: result.provider_response_id
  };
}

function draftMode(body, env) {
  return body.authoring_mode === true && env.ALLOW_DRAFT_CLINICAL_OPTIONS === 'true';
}

async function handleBuildOptions(body, env) {
  if (!body.facts || typeof body.facts !== 'object') throw new Error('facts are required');
  const authoringMode = draftMode(body, env);
  const context = await buildPhysicianChoiceContext({
    facts: body.facts,
    supplementalTags: body.supplemental_tags || [],
    authoringMode
  });
  return {
    ok: true,
    action: 'build_options',
    physician_selection_required: true,
    draft_options_enabled: authoringMode,
    context
  };
}

async function handleGenerateOptions(body, env) {
  if (!body.facts || typeof body.facts !== 'object') throw new Error('facts are required');
  const authoringMode = draftMode(body, env);
  const result = await generateClinicalOptions({
    caseText: body.case_text || '',
    facts: body.facts,
    supplementalTags: body.supplemental_tags || [],
    authoringMode,
    env
  });
  return {
    ok: true,
    action: 'generate_options',
    provider: result.provider,
    physician_selection_required: true,
    draft_options_enabled: authoringMode,
    options: result.options,
    context_meta: result.context_meta,
    usage: result.usage,
    provider_response_id: result.provider_response_id
  };
}

export async function handler(event, _context) {
  const env = process.env;
  const origin = allowedOrigin(event, env);
  const method = event?.httpMethod || event?.requestContext?.http?.method || 'POST';

  if (method === 'OPTIONS') return response(204, {}, origin);
  if (method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);

  try {
    const body = parseBody(event);
    const action = body.action || 'extract_facts';
    let payload;
    if (action === 'build_options') payload = await handleBuildOptions(body, env);
    else if (action === 'generate_options') payload = await handleGenerateOptions(body, env);
    else payload = await handleExtract(body, env);
    return response(200, payload, origin);
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|must contain|too long|JSON|between 2 and 5/.test(safeMessage) ? 400 : 502;
    return response(status, {
      ok: false,
      error: status === 400 ? 'invalid_request' : 'provider_error',
      message: safeMessage.slice(0, 300)
    }, origin);
  }
}

export default handler;
