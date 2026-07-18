import { extractClinicalFacts } from './extract-clinical-facts.mjs';

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

export async function handler(event, _context) {
  const env = process.env;
  const origin = allowedOrigin(event, env);
  const method = event?.httpMethod || event?.requestContext?.http?.method || 'POST';

  if (method === 'OPTIONS') return response(204, {}, origin);
  if (method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);

  try {
    const body = parseBody(event);
    const result = await extractClinicalFacts({
      caseText: body.case_text,
      priorFacts: body.prior_facts || null,
      env
    });

    return response(200, {
      ok: true,
      provider: result.provider,
      facts: result.facts,
      usage: result.usage,
      provider_response_id: result.provider_response_id
    }, origin);
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|must contain|too long|JSON/.test(safeMessage) ? 400 : 502;
    return response(status, {
      ok: false,
      error: status === 400 ? 'invalid_request' : 'provider_error',
      message: safeMessage.slice(0, 300)
    }, origin);
  }
}

export default handler;
