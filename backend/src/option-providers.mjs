import { clinicalOptionsSchema } from './clinical-options-schema.mjs';

const DEFAULT_TIMEOUT_MS = 60_000;

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
        'Return concise professional Russian text as strict JSON matching the schema.'
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
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'physician_choice_options',
            strict: true,
            schema: clinicalOptionsSchema
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
      options: parseJsonContent(payload?.choices?.[0]?.message?.content),
      usage: payload?.usage || null,
      provider_response_id: payload?.id || null
    };
  } finally {
    timeout.clear();
  }
}

async function callResponses({ baseUrl, apiKey, model, input }) {
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
        input: buildOptionMessages(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'physician_choice_options',
            strict: true,
            schema: clinicalOptionsSchema
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
      options: parseJsonContent(outputText),
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
    if (!env.YANDEX_API_KEY || !env.YANDEX_FOLDER_ID || !env.YANDEX_MODEL) {
      throw new Error('YANDEX_API_KEY, YANDEX_FOLDER_ID and YANDEX_MODEL are required');
    }
    return {
      id: 'yandex',
      generate: (input) => callChatCompletions({
        baseUrl: env.YANDEX_BASE_URL || 'https://ai.api.cloud.yandex.net/v1',
        apiKey: env.YANDEX_API_KEY,
        authScheme: 'Api-Key',
        model: env.YANDEX_MODEL.startsWith('gpt://')
          ? env.YANDEX_MODEL
          : `gpt://${env.YANDEX_FOLDER_ID}/${env.YANDEX_MODEL}`,
        extraHeaders: { 'x-folder-id': env.YANDEX_FOLDER_ID },
        input
      })
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
        input
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
