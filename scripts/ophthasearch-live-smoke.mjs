const endpoint = process.env.OPHTHASEARCH_ENDPOINT;
if (!endpoint) throw new Error('OPHTHASEARCH_ENDPOINT is required');

const origin = 'https://matveyshemyakin.ru';
const maxAttempts = Math.max(1, Number(process.env.OPHTHASEARCH_SMOKE_ATTEMPTS || 3));
const retryDelayMs = Math.max(0, Number(process.env.OPHTHASEARCH_SMOKE_RETRY_MS || 12000));

const cases = [
  {
    id: 'poag-latanoprost-vs-timolol',
    language: 'ru',
    question: 'Есть ли преимущество латанопроста перед тимололом при первичной открытоугольной глаукоме?',
    validateIntent(intent) {
      if (intent.question_type !== 'comparison') throw new Error(`question_type=${intent.question_type}`);
      if (intent.condition !== 'primary open-angle glaucoma') throw new Error(`condition=${intent.condition}`);
      assertIncludes(intent.interventions, /latanoprost/i, 'latanoprost intervention');
      assertIncludes(intent.comparators, /timolol/i, 'timolol comparator');
    }
  },
  {
    id: 'rrd-surgical-management',
    language: 'ru',
    question: 'Тактика хирургического лечения регматогенной отслойки сетчатки',
    validateIntent(intent) {
      if (intent.question_type !== 'surgery') throw new Error(`question_type=${intent.question_type}`);
      if (intent.condition !== 'rhegmatogenous retinal detachment') throw new Error(`condition=${intent.condition}`);
    },
    validateSources(sources) {
      const firstTitles = sources.slice(0, 5).map((source) => String(source?.title || ''));
      if (/proteom|proteomic|molecular biomarker/i.test(firstTitles[0] || '')) {
        throw new Error(`topic-only molecular paper ranked first: ${firstTitles[0]}`);
      }
      if (!firstTitles.some((title) => /vitrect|scleral|buckl|retinopex|surg|repair|tamponade/i.test(title))) {
        throw new Error(`no surgical RRD evidence in first five sources: ${JSON.stringify(firstTitles)}`);
      }
    }
  },
  {
    id: 'large-macular-hole-ilm-comparison',
    language: 'en',
    question: 'Inverted ILM flap vs conventional ILM peeling for macular hole >400 µm',
    validateIntent(intent) {
      if (intent.question_type !== 'comparison') throw new Error(`question_type=${intent.question_type}`);
      if (intent.condition !== 'full-thickness macular hole') throw new Error(`condition=${intent.condition}`);
      assertIncludes(intent.interventions, /inverted.*ilm.*flap/i, 'inverted ILM flap intervention');
      assertIncludes(intent.comparators, /(?:internal limiting membrane|ilm).*peel/i, 'ILM peeling comparator');
      assertIncludes(intent.modifiers, /400/, '400 µm modifier');
    }
  }
];

function assertIncludes(values, pattern, label) {
  const list = Array.isArray(values) ? values.map(String) : [];
  if (!list.some((value) => pattern.test(value))) throw new Error(`${label} missing: ${JSON.stringify(list)}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reasoningDiagnostics(result) {
  const adapters = Array.isArray(result?.diagnostics?.adapters) ? result.diagnostics.adapters : [];
  return adapters.filter((entry) => entry?.trackId === 'reasoning' || entry?.adapter === 'workers-ai');
}

function validateCommon(testCase, body) {
  if (body?.ok !== true) throw new Error(`Worker returned ok=${body?.ok}`);
  const result = body.result || {};
  const intent = result.intent || {};
  testCase.validateIntent(intent);

  if (result.status === 'evidence_only') {
    throw new Error(`status=evidence_only reasoning=${JSON.stringify(reasoningDiagnostics(result))}`);
  }
  if (!['complete', 'partial'].includes(result.status)) throw new Error(`status=${result.status}`);

  const answer = result.answer || {};
  const bottomLine = String(answer.clinical_bottom_line || '').trim();
  if (bottomLine.length < 40) throw new Error(`clinical_bottom_line is too short: ${bottomLine}`);

  const citations = Array.isArray(answer.bottom_line_citations) ? answer.bottom_line_citations : [];
  if (!citations.length) throw new Error('clinical_bottom_line has no verified citation');

  const sources = Array.isArray(answer.sources) ? answer.sources : [];
  if (!sources.length) throw new Error('answer has no verified sources');

  const knownSourceIds = new Set(sources.map((source) => String(source?.source_id || '')));
  for (const sourceId of citations) {
    if (!knownSourceIds.has(String(sourceId))) throw new Error(`bottom-line citation ${sourceId} is absent from sources`);
  }

  const management = Array.isArray(answer.management) ? answer.management : [];
  if (!management.length) throw new Error('management/tactic section is empty');
  if (!management.some((item) => String(item?.action || '').trim().length >= 12)) {
    throw new Error('management/tactic section has no substantive action');
  }

  testCase.validateSources?.(sources);

  return {
    id: testCase.id,
    status: result.status,
    condition: intent.condition,
    question_type: intent.question_type,
    interventions: intent.interventions,
    comparators: intent.comparators,
    modifiers: intent.modifiers,
    sources: sources.length,
    citations: citations.length,
    management: management.length,
    bottomLine
  };
}

async function runCase(testCase) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`\n[${testCase.id}] attempt ${attempt}/${maxAttempts}`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schemaVersion: '2.0',
          language: testCase.language,
          question: testCase.question,
          mode: 'standard',
          filters: {}
        }),
        signal: AbortSignal.timeout(120000)
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 1000)}`);
      const body = JSON.parse(text);
      const summary = validateCommon(testCase, body);
      console.log(JSON.stringify(summary, null, 2));
      return summary;
    } catch (error) {
      lastError = error;
      console.error(`[${testCase.id}] ${error?.stack || error}`);
      if (attempt < maxAttempts) await delay(retryDelayMs);
    }
  }
  throw new Error(`${testCase.id} failed after ${maxAttempts} attempts: ${lastError?.message || lastError}`);
}

const summaries = [];
for (const testCase of cases) summaries.push(await runCase(testCase));
console.log(`\nOphthaSearch live acceptance passed: ${summaries.length}/${cases.length}`);
