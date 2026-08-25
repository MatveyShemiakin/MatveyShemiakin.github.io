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
  throw new Error(label);
}
