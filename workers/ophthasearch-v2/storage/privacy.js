const DIRECT_IDENTIFIER_PATTERNS = [
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/u,
  /(?:^|\D)(?:\+?\d[\s().-]*){10,}(?:$|\D)/u,
  /\b\d{7,}\b/u,
  /https?:\/\/\S+\?\S+/iu,
  /(?:ф\.?\s*и\.?\s*о\.?|имя\s+пациента|телефон|e-?mail|номер\s+(?:истории|карты)|адрес|patient\s+name|phone|email|chart\s+(?:number|no\.?|#)|medical\s+record|address)(?=\s|:|,|;|\.|$)/iu
];

export function normalizeQuestionText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeFreeText(value) {
  const normalized = normalizeQuestionText(value);
  if (!normalized || DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { storageState: 'metadata_only', redactedText: null };
  }
  return { storageState: 'redacted_text', redactedText: normalized };
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprintQuestion(question, secret) {
  const normalized = normalizeQuestionText(question);
  const keyMaterial = String(secret ?? '');
  if (!keyMaterial.trim()) throw new Error('Dataset fingerprint secret is required');
  if (!normalized) throw new Error('Question is required');
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable');

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(keyMaterial),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(normalized));
  return bytesToHex(signature);
}
