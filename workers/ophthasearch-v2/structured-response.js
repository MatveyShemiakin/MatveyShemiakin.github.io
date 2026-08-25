function cleanJsonText(value) {
  return String(value ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content;
  const text = content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    })
    .filter(Boolean)
    .join('');
  return text || content;
}

function parseCandidate(candidate) {
  if (candidate == null) return null;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  const text = cleanJsonText(contentText(candidate));
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return null; }
}

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function sortedKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'none';
  const keys = Object.keys(value).sort().slice(0, 16);
  return keys.length ? keys.join(',') : 'none';
}

export function describeStructuredModelResponse(response) {
  const choice = Array.isArray(response?.choices) ? response.choices[0] : null;
  const message = choice?.message;
  const rawContent = contentText(message?.content);
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  const startsJson = content.startsWith('{') || content.startsWith('[');
  const endsJson = content.endsWith('}') || content.endsWith(']');
  const finishReason = choice?.finish_reason ?? response?.finish_reason ?? 'unknown';
  const completionTokens = response?.usage?.completion_tokens ?? response?.usage?.output_tokens ?? 'unknown';

  return [
    `top_keys=${sortedKeys(response)}`,
    `choices=${Array.isArray(response?.choices) ? response.choices.length : 0}`,
    `finish_reason=${String(finishReason)}`,
    `message_keys=${sortedKeys(message)}`,
    `content_type=${valueType(message?.content)}`,
    `content_length=${content.length}`,
    `starts_json=${startsJson}`,
    `ends_json=${endsJson}`,
    `completion_tokens=${String(completionTokens)}`,
    `response_type=${valueType(response?.response)}`,
    `result_type=${valueType(response?.result)}`,
    `output_text_type=${valueType(response?.output_text)}`
  ].join(' ');
}

export function parseStructuredModelResponse(response, { label = 'Model returned invalid structured JSON' } = {}) {
  const message = response?.choices?.[0]?.message;
  const candidates = [
    message?.parsed,
    message?.content,
    response?.response,
    response?.result?.response,
    response?.result,
    response?.output_text,
    response?.text,
    response
  ];

  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (!parsed) continue;
    // Do not mistake an OpenAI-compatible completion envelope for the requested payload.
    if (parsed === response && Array.isArray(parsed?.choices)) continue;
    return parsed;
  }
  throw new Error(`${label} [${describeStructuredModelResponse(response)}]`);
}
