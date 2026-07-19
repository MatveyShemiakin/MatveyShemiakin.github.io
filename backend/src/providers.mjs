import { clinicalFactsSchema } from './clinical-schema.mjs';
import { resolveYandexAuth } from './yandex-auth.mjs';

const DEFAULT_TIMEOUT_MS = 35_000;

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function parseJsonContent(content) {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    if (content.json && typeof content.json === 'object') return content.json;
    return content;
  }

  const raw = Array.isArray(content)
    ? content.map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        if (typeof item?.content === 'string') return item.content;
        return '';
      }).join('')
    : String(content || '');

  const text = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!text) throw new Error('Model returned an empty response');
  try {
    return JSON.parse(text);
  } catch (_error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (_nestedError) {
        // Continue to a stable error below.
      }
    }
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
        'Return exactly one JSON object and no markdown or explanatory text.'
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

function responseOutput(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.json && typeof part.json === 'object') return part.json;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part === 'string') return part;
    }
  }
  return null;
}

async function callResponses({
  baseUrl,
  apiKey,
  authScheme = 'Bearer',
  model,
  caseText,
  priorFacts,
  extraHeaders = {},
  format = 'json_schema'
}) {
  const timeout = withTimeout();
  try {
    const responseFormat = format === 'json_schema'
      ? {
          type: 'json_schema',
          name: 'clinical_facts',
          description: 'Structured ophthalmology facts extracted from the physician case description.',
          strict: true,
          schema: clinicalFactsSchema
        }
      : { type: 'json_object' };

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authScheme} ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify({
        model,
        store: false,
        temperature: 0,
        max_output_tokens: 2500,
        input: buildMessages(caseText, priorFacts),
        text: { format: responseFormat }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${message.slice(0, 300)}`);
    }

    const payload = await response.json();
    return {
      facts: parseJsonContent(responseOutput(payload)),
      usage: payload?.usage || null,
      provider_response_id: payload?.id || null
    };
  } finally {
    timeout.clear();
  }
}

async function callYandexStructured(args) {
  try {
    return await callResponses({ ...args, format: 'json_schema' });
  } catch (error) {
    if (!/valid JSON|empty response|json_schema|response format/i.test(String(error?.message || ''))) throw error;
    return callResponses({ ...args, format: 'json_object' });
  }
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
        response_format: { type: 'json_object' }
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

export function providerFromEnvironment(env = process.env) {
  const provider = String(env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'yandex') {
    if (!env.YANDEX_FOLDER_ID || !env.YANDEX_MODEL) {
      throw new Error('YANDEX_FOLDER_ID and YANDEX_MODEL are required');
    }
    const auth = resolveYandexAuth(env);
    const model = env.YANDEX_MODEL.startsWith('gpt://')
      ? env.YANDEX_MODEL
      : `gpt://${env.YANDEX_FOLDER_ID}/${env.YANDEX_MODEL}`;
    const common = {
      baseUrl: env.YANDEX_BASE_URL || 'https://ai.api.cloud.yandex.net/v1',
      apiKey: auth.credential,
      authScheme: auth.authScheme,
      model,
      extraHeaders: { 'x-folder-id': env.YANDEX_FOLDER_ID }
    };
    return {
      id: 'yandex',
      auth_source: auth.source,
      extract: async ({ caseText, priorFacts }) => {
        try {
          return await callYandexStructured({ ...common, caseText, priorFacts });
        } catch (error) {
          if (!/valid JSON|empty response|response format/i.test(String(error?.message || ''))) throw error;
          return callChatCompletions({ ...common, caseText, priorFacts });
        }
      }
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
        priorFacts,
        format: 'json_schema'
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
