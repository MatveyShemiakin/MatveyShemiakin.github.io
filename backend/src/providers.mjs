import { clinicalFactsSchema } from './clinical-schema.mjs';
import { resolveYandexAuth } from './yandex-auth.mjs';

const DEFAULT_TIMEOUT_MS = 45_000;

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function parseJsonContent(content) {
  if (content && typeof content === 'object') return content;
  const text = String(content || '').trim();
  if (!text) throw new Error('Model returned an empty response');
  try {
    return JSON.parse(text);
  } catch (_error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('Model response is not valid JSON');
  }
}

function buildMessages(caseText, priorFacts) {
  return [
    {
      role: 'system',
      content: [
        'You extract structured ophthalmology facts from Russian clinical text.',
        'Do not diagnose or recommend treatment.',
        'Never infer an absent fact. Use null or an empty array when unknown.',
        'Respect negation and uncertainty.',
        'Return only JSON conforming to the supplied schema.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        case_text: caseText,
        prior_facts: priorFacts || null
      })
    }
  ];
}

async function callChatCompletions({ baseUrl, apiKey, authScheme, model, caseText, priorFacts, extraHeaders = {} }) {
  const timeout = withTimeout();
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authScheme} ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: buildMessages(caseText, priorFacts),
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'clinical_facts',
            strict: true,
            schema: clinicalFactsSchema
          }
        }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${message.slice(0, 300)}`);
    }

    const payload = await response.json();
    return {
      facts: parseJsonContent(payload?.choices?.[0]?.message?.content),
      usage: payload?.usage || null,
      provider_response_id: payload?.id || null
    };
  } finally {
    timeout.clear();
  }
}

async function callResponses({ baseUrl, apiKey, model, caseText, priorFacts }) {
  const timeout = withTimeout();
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        store: false,
        input: buildMessages(caseText, priorFacts),
        text: {
          format: {
            type: 'json_schema',
            name: 'clinical_facts',
            strict: true,
            schema: clinicalFactsSchema
          }
        }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${message.slice(0, 300)}`);
    }

    const payload = await response.json();
    const outputText = payload?.output_text || payload?.output
      ?.flatMap((item) => item?.content || [])
      ?.find((item) => item?.type === 'output_text')?.text;

    return {
      facts: parseJsonContent(outputText),
      usage: payload?.usage || null,
      provider_response_id: payload?.id || null
    };
  } finally {
    timeout.clear();
  }
}

export function providerFromEnvironment(env = process.env) {
  const provider = String(env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'yandex') {
    if (!env.YANDEX_FOLDER_ID || !env.YANDEX_MODEL) {
      throw new Error('YANDEX_FOLDER_ID and YANDEX_MODEL are required');
    }
    const auth = resolveYandexAuth(env);
    return {
      id: 'yandex',
      auth_source: auth.source,
      extract: ({ caseText, priorFacts }) => callChatCompletions({
        baseUrl: env.YANDEX_BASE_URL || 'https://ai.api.cloud.yandex.net/v1',
        apiKey: auth.credential,
        authScheme: auth.authScheme,
        model: env.YANDEX_MODEL.startsWith('gpt://')
          ? env.YANDEX_MODEL
          : `gpt://${env.YANDEX_FOLDER_ID}/${env.YANDEX_MODEL}`,
        caseText,
        priorFacts,
        extraHeaders: { 'x-folder-id': env.YANDEX_FOLDER_ID }
      })
    };
  }

  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
      throw new Error('OPENAI_API_KEY and OPENAI_MODEL are required');
    }
    return {
      id: 'openai',
      extract: ({ caseText, priorFacts }) => callResponses({
        baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        caseText,
        priorFacts
      })
    };
  }

  if (provider === 'openai-compatible') {
    if (!env.AI_API_KEY || !env.AI_MODEL || !env.AI_BASE_URL) {
      throw new Error('AI_API_KEY, AI_MODEL and AI_BASE_URL are required');
    }
    return {
      id: 'openai-compatible',
      extract: ({ caseText, priorFacts }) => callChatCompletions({
        baseUrl: env.AI_BASE_URL,
        apiKey: env.AI_API_KEY,
        authScheme: env.AI_AUTH_SCHEME || 'Bearer',
        model: env.AI_MODEL,
        caseText,
        priorFacts
      })
    };
  }

  return { id: 'mock', extract: null };
}
