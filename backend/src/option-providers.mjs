import { clinicalOptionsSchema } from './clinical-options-schema.mjs';
import { resolveYandexAuth } from './yandex-auth.mjs';
import { parseJsonContent } from './providers.mjs';

const DEFAULT_TIMEOUT_MS = 45_000;

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function buildOptionMessages({ caseText, facts, context }) {
  return [
    {
      role: 'system',
      content: [
        'You are an ophthalmology clinical decision-support drafting engine for physicians.',
        'Generate multiple evidence-grounded options, never a final diagnosis or final treatment choice.',
        'The physician is the sole decision owner. Every selected field must remain false.',
        'Use only evidence chunks supplied in the request. Do not cite or invent other sources, drugs, doses or durations.',
        'When treatment evidence is absent, return an empty management_options array and explain that treatment evidence is locked.',
        'Separate supporting facts from missing or conflicting facts.',
        'Return concise professional Russian text as exactly one JSON object with no markdown.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        case_text: caseText || '',
        structured_facts: facts,
        retrieved_context: context
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
  extraHeaders = {},
  input,
  format = 'json_schema'
}) {
  const timeout = withTimeout();
  try {
    const responseFormat = format === 'json_schema'
      ? {
          type: 'json_schema',
          name: 'physician_choice_options',
          description: 'Multiple evidence-grounded diagnostic and management options for physician selection.',
          strict: true,
          schema: clinicalOptionsSchema
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
        max_output_tokens: 6500,
        input: buildOptionMessages(input),
        text: { format: responseFormat }
      })
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${message.slice(0, 300)}`);
    }
    const payload = await response.json();
    return {
      options: parseJsonContent(responseOutput(payload)),
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

async function callChatCompletions({ baseUrl, apiKey, authScheme, model, extraHeaders = {}, input }) {
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
        messages: buildOptionMessages(input),
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${message.slice(0, 300)}`);
    }
    const payload = await response.json();
    return {
      options: parseJsonContent(payload?.choices?.[0]?.message?.content),
      usage: payload?.usage || null,
      provider_response_id: payload?.id || null
    };
  } finally {
    timeout.clear();
  }
}

export function optionProviderFromEnvironment(env = process.env) {
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
      generate: async (input) => {
        try {
          return await callYandexStructured({ ...common, input });
        } catch (error) {
          if (!/valid JSON|empty response|response format/i.test(String(error?.message || ''))) throw error;
          return callChatCompletions({ ...common, input });
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
      generate: (input) => callResponses({
        baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        input,
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
      generate: (input) => callChatCompletions({
        baseUrl: env.AI_BASE_URL,
        apiKey: env.AI_API_KEY,
        authScheme: env.AI_AUTH_SCHEME || 'Bearer',
        model: env.AI_MODEL,
        input
      })
    };
  }

  return { id: 'mock', generate: null };
}
