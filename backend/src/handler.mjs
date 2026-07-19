import { extractClinicalFacts } from './extract-clinical-facts.mjs';
import { buildPhysicianChoiceContext } from './knowledge-retrieval.mjs';
import { generateClinicalOptions } from './generate-clinical-options.mjs';
import { analyzeCase } from './analyze-case.mjs';

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
  if (!event || typeof event !== 'object') return '';
  return event?.headers?.origin || event?.headers?.Origin || '';
}

function allowedOrigin(event, env) {
  const configured = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const origin = requestOrigin(event);
  if (!configured.length) return '*';
  return configured.includes(origin) ? origin : configured[0];
}

function decodeJsonValue(value, base64Encoded = false) {
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (typeof value !== 'string') return value;
  const raw = base64Encoded ? Buffer.from(value, 'base64').toString('utf8') : value;
  return JSON.parse(raw);
}

export function parseRequestBody(event) {
  let current = event;

  for (let depth = 0; depth < 4; depth += 1) {
    current = decodeJsonValue(current, false);
    if (!current || typeof current !== 'object') return {};

    if (
      Object.prototype.hasOwnProperty.call(current, 'action')
      || Object.prototype.hasOwnProperty.call(current, 'case_text')
      || Object.prototype.hasOwnProperty.call(current, 'facts')
    ) {
      return current;
    }

    if (!Object.prototype.hasOwnProperty.call(current, 'body')) return current;
    current = decodeJsonValue(current.body, current.isBase64Encoded === true);
  }

  throw new Error('Request JSON nesting is too deep');
}

export function runtimeEnvironment(context, baseEnv = process.env) {
  const iamToken = context?.access_token || context?.accessToken || context?.token || '';
  if (!iamToken) return baseEnv;
  return {
    ...baseEnv,
    YANDEX_IAM_TOKEN: iamToken
  };
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

async function handleAnalyzeCase(body, env) {
  return analyzeCase({
    caseText: body.case_text,
    priorFacts: body.prior_facts || null,
    authoringMode: draftMode(body, env),
    env
  });
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

export async function handler(event, context) {
  const env = runtimeEnvironment(context);
  const origin = allowedOrigin(event, env);
  const method = event && typeof event === 'object'
    ? (event?.httpMethod || event?.requestContext?.http?.method || 'POST')
    : 'POST';

  if (method === 'OPTIONS') return response(204, {}, origin);
  if (method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);

  try {
    const body = parseRequestBody(event);
    const action = body.action || 'analyze_case';
    let payload;
    if (action === 'analyze_case') payload = await handleAnalyzeCase(body, env);
    else if (action === 'build_options') payload = await handleBuildOptions(body, env);
    else if (action === 'generate_options') payload = await handleGenerateOptions(body, env);
    else payload = await handleExtract(body, env);
    return response(200, payload, origin);
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|must contain|too long|JSON|between 2 and 5|nesting|at least/.test(safeMessage) ? 400 : 502;
    return response(status, {
      ok: false,
      error: status === 400 ? 'invalid_request' : 'provider_error',
      message: safeMessage.slice(0, 300)
    }, origin);
  }
}

export default handler;
