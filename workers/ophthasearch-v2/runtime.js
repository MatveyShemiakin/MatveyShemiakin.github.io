// Runtime safeguards; no dependencies and no model requests in tests.
export const RELEASE = '20260907-r1';
const inFlight = new Map();
const gates = new WeakMap();
let quotaUntil = 0;

export function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Request aborted'));
    const done = () => { signal?.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(done, ms);
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('Request aborted')); };
    signal?.addEventListener('abort', abort, {once:true});
  });
}

export function providerFetch(fetchImpl = globalThis.fetch) {
  return async (url, options = {}) => {
    const ncbi = new URL(url).hostname === 'eutils.ncbi.nlm.nih.gov';
    for (let attempt = 0; attempt < 2; attempt++) {
      if (ncbi) {
        // Shared per-isolate admission gate covers ESearch AND EFetch across tracks.
        const previous = gates.get(fetchImpl) || 0;
        const slot = Math.max(Date.now(), previous);
        gates.set(fetchImpl, slot + 400);
        await delay(Math.max(0, slot - Date.now()), options.signal);
      }
      if (options.signal?.aborted) throw new Error('Request aborted');
      const response = await fetchImpl(url, options);
      if (![429,502,503,504].includes(response.status) || attempt === 1) return response;
      const retryAfter = Number(response.headers.get('Retry-After'));
      await response.body?.cancel();
      await delay(Math.min(1500, Math.max(800, Number.isFinite(retryAfter) ? retryAfter * 1000 : 800)), options.signal);
    }
  };
}

export async function boundedModel(run, model, options, timeoutMs = 35000) {
  if (Date.now() < quotaUntil) throw new Error('AI_QUOTA_EXCEEDED');
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => run(model, options)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs); })
    ]);
  } catch (error) {
    if (/4006|daily free allocation|AI_QUOTA_EXCEEDED/i.test(String(error?.message))) {
      // Short circuit breaker conserves quota; does not claim a durable account-wide limit.
      quotaUntil = Date.now() + 60000;
    }
    throw error;
  } finally { clearTimeout(timer); }
}

export function cacheableQuestion(payload) {
  // Only generic, short questions. Patient-specific narratives are not persisted.
  return payload.question.length <= 200 && !/\d|пациент|больн|patient|woman|man\b|женщин|мужчин|анамнез|history|@|телефон|фио|name|фамил|у меня|у моего|у моей|мне |мой |моя |моего|\bi have\b|\bmy\b|\bI am\b/i.test(payload.question);
}

export async function cachedResearch(request, payload, compute, cache, ctx) {
  if (!cache || !cacheableQuestion(payload)) return compute();
  const text = JSON.stringify([RELEASE,payload.language,payload.question.toLowerCase().replace(/ё/g,'е'),payload.mode,payload.filters]);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const key = new Request(new URL(`/__ophtha_cache/${RELEASE}/${hash}`, request.url));
  try {
    const hit = await cache.match(key);
    if (hit) {
      const value = await hit.json();
      return {...value,diagnostics:{...value.diagnostics,cached:true}};
    }
  } catch { /* Cache availability must not decide search availability. */ }
  if (inFlight.has(hash)) return inFlight.get(hash);
  const work = (async () => {
    const result = await compute();
    if (['complete','partial'].includes(result.status) && result.answer?.bottom_line_citations?.length && result.answer?.sources?.length) {
      const value = {...result,diagnostics:{...result.diagnostics,cached:false,generatedAt:new Date().toISOString()}};
      const save = cache.put(key,new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}})).catch(()=>{});
      if (ctx?.waitUntil) ctx.waitUntil(save); else await save;
      return value;
    }
    return result;
  })();
  // Bound memory without cancelling a request already admitted.
  if (inFlight.size < 32) inFlight.set(hash,work);
  try { return await work; } finally { if (inFlight.get(hash) === work) inFlight.delete(hash); }
}
