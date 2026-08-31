const endpoint = process.env.OPHTHASEARCH_ENDPOINT;
if (!endpoint) throw new Error('OPHTHASEARCH_ENDPOINT is required');

const origin = 'https://matveyshemyakin.ru';
const maxAttempts = Math.max(1, Number(process.env.OPHTHASEARCH_SMOKE_ATTEMPTS || 2));
const retryDelayMs = Math.max(0, Number(process.env.OPHTHASEARCH_SMOKE_RETRY_MS || 5000));
const maxCaseMs = Math.max(5000, Number(process.env.OPHTHASEARCH_MAX_CASE_MS || 35000));

function assertIncludes(values, pattern, label) {
  const list = Array.isArray(values) ? values.map(String) : [];
  if (!list.some((value) => pattern.test(value))) throw new Error(`${label} missing: ${JSON.stringify(list)}`);
}

function assertText(text, pattern, label) {
  if (!pattern.test(String(text || ''))) throw new Error(`${label} missing from: ${String(text || '').slice(0, 1200)}`);
}

function clinicalCase({
  id,
  language = 'ru',
  question,
  condition,
  questionType,
  interventions = [],
  comparators = [],
  modifiers = [],
  answerPatterns = [],
  forbiddenAnswerPatterns = [],
  validateSources
}) {
  return {
    id,
    language,
    question,
    validateIntent(intent) {
      if (condition && intent.condition !== condition) throw new Error(`condition=${intent.condition}`);
      if (questionType && intent.question_type !== questionType) throw new Error(`question_type=${intent.question_type}`);
      interventions.forEach((pattern, index) => assertIncludes(intent.interventions, pattern, `intervention[${index}]`));
      comparators.forEach((pattern, index) => assertIncludes(intent.comparators, pattern, `comparator[${index}]`));
      modifiers.forEach((pattern, index) => assertIncludes(intent.modifiers, pattern, `modifier[${index}]`));
    },
    validateAnswer(answer, bottomLine) {
      answerPatterns.forEach((pattern, index) => assertText(bottomLine, pattern, `answer pattern[${index}]`));
      for (const pattern of forbiddenAnswerPatterns) {
        if (pattern.test(bottomLine)) throw new Error(`forbidden answer framing ${pattern}: ${bottomLine}`);
      }
    },
    validateSources
  };
}

const cases = [
  clinicalCase({
    id: 'poag-latanoprost-vs-timolol',
    question: 'Есть ли преимущество латанопроста перед тимололом при первичной открытоугольной глаукоме?',
    condition: 'primary open-angle glaucoma',
    questionType: 'comparison',
    interventions: [/latanoprost/i],
    comparators: [/timolol/i],
    answerPatterns: [/латанопрост|latanoprost/i, /тимолол|timolol/i],
    forbiddenAnswerPatterns: [/фиксированн\w*\s+комбинац|fixed[- ](?:dose )?combination/i],
    validateSources(sources) {
      const titles = sources.slice(0, 6).map((source) => String(source?.title || ''));
      if (!titles.some((title) => /latanoprost/i.test(title) && /timolol/i.test(title))) {
        throw new Error(`no direct latanoprost/timolol source in first six: ${JSON.stringify(titles)}`);
      }
    }
  }),
  clinicalCase({
    id: 'poag-travoprost-vs-bimatoprost',
    question: 'Travoprost vs bimatoprost for primary open-angle glaucoma: which lowers IOP more effectively?',
    language: 'en',
    condition: 'primary open-angle glaucoma',
    questionType: 'comparison',
    interventions: [/travoprost/i],
    comparators: [/bimatoprost/i],
    answerPatterns: [/travoprost/i, /bimatoprost/i]
  }),
  clinicalCase({
    id: 'poag-brimonidine-vs-dorzolamide',
    question: 'Бримонидин или дорзоламид как дополнительная терапия при ПОУГ: что эффективнее?',
    condition: 'primary open-angle glaucoma',
    questionType: 'comparison',
    interventions: [/brimonidine/i],
    comparators: [/dorzolamide/i],
    answerPatterns: [/бримонидин|brimonidine/i, /дорзоламид|dorzolamide/i]
  }),
  clinicalCase({
    id: 'poag-slt-vs-latanoprost',
    question: 'SLT vs latanoprost as initial treatment for primary open-angle glaucoma',
    language: 'en',
    condition: 'primary open-angle glaucoma',
    questionType: 'comparison',
    interventions: [/selective laser trabeculoplasty/i],
    comparators: [/latanoprost/i],
    answerPatterns: [/SLT|selective laser trabeculoplasty/i, /latanoprost/i]
  }),
  clinicalCase({
    id: 'poag-first-line-pharmacotherapy',
    question: 'Современная медикаментозная терапия ПОУГ: что использовать первой линией и когда переходить на комбинацию?',
    condition: 'primary open-angle glaucoma',
    questionType: 'therapy',
    interventions: [/pharmacological therapy/i],
    answerPatterns: [/ВГД|глауком|простагланд|терап/i]
  }),
  clinicalCase({
    id: 'poag-ocular-surface-modifier',
    question: 'Медикаментозная терапия ПОУГ у пациента с синдромом сухого глаза: как выбрать препарат?',
    condition: 'primary open-angle glaucoma',
    questionType: 'therapy',
    interventions: [/pharmacological therapy/i],
    modifiers: [/ocular surface disease/i],
    answerPatterns: [/сух|поверхност|переносим|консервант/i]
  }),
  clinicalCase({
    id: 'normal-tension-glaucoma-management',
    question: 'Тактика лечения нормотензивной глаукомы при прогрессировании поля зрения',
    condition: 'normal-tension glaucoma',
    questionType: 'therapy',
    answerPatterns: [/давлен|ВГД|прогресс|глауком/i]
  }),
  clinicalCase({
    id: 'angle-closure-medical-therapy',
    question: 'Медикаментозная терапия закрытоугольной глаукомы: что использовать и когда менять тактику?',
    condition: 'angle-closure glaucoma',
    questionType: 'therapy',
    interventions: [/pharmacological therapy/i],
    answerPatterns: [/угол|глауком|ВГД|давлен/i]
  }),
  clinicalCase({
    id: 'rrd-surgical-management',
    question: 'Тактика хирургического лечения регматогенной отслойки сетчатки',
    condition: 'rhegmatogenous retinal detachment',
    questionType: 'surgery',
    interventions: [/pars plana vitrectomy/i, /scleral buckling/i, /pneumatic retinopexy/i],
    answerPatterns: [/витрэктом|vitrect|склераль|buckl|ретинопекс/i],
    validateSources(sources) {
      const firstTitles = sources.slice(0, 5).map((source) => String(source?.title || ''));
      if (/proteom|proteomic|molecular biomarker/i.test(firstTitles[0] || '')) {
        throw new Error(`topic-only molecular paper ranked first: ${firstTitles[0]}`);
      }
      if (!firstTitles.some((title) => /vitrect|scleral|buckl|retinopex|surg|repair|tamponade/i.test(title))) {
        throw new Error(`no surgical RRD evidence in first five sources: ${JSON.stringify(firstTitles)}`);
      }
    }
  }),
  clinicalCase({
    id: 'rrd-ppv-vs-scleral-buckle',
    question: 'Pars plana vitrectomy vs scleral buckling for rhegmatogenous retinal detachment',
    language: 'en',
    condition: 'rhegmatogenous retinal detachment',
    questionType: 'comparison',
    interventions: [/pars plana vitrectomy/i],
    comparators: [/scleral buckling/i],
    answerPatterns: [/vitrectomy/i, /scleral buckl/i]
  }),
  clinicalCase({
    id: 'rrd-pneumatic-vs-buckle',
    question: 'Pneumatic retinopexy vs scleral buckling for uncomplicated rhegmatogenous retinal detachment',
    language: 'en',
    condition: 'rhegmatogenous retinal detachment',
    questionType: 'comparison',
    interventions: [/pneumatic retinopexy/i],
    comparators: [/scleral buckling/i],
    answerPatterns: [/pneumatic retinopexy/i, /scleral buckl/i]
  }),
  clinicalCase({
    id: 'erm-surgery-vis08-metamorphopsia',
    question: 'Стоит ли оперировать ERM при Vis 0.8 и выраженных metamorphopsia?',
    condition: 'epiretinal membrane',
    questionType: 'surgery',
    modifiers: [/0\.8/, /metamorph/i],
    answerPatterns: [/мембран|ERM|метаморф|хирург/i]
  }),
  clinicalCase({
    id: 'erm-surgery-vis05',
    question: 'Хирургическая тактика при эпиретинальной мембране: Vis 0.5, выраженное искажение изображения',
    condition: 'epiretinal membrane',
    questionType: 'surgery',
    modifiers: [/0\.5/],
    answerPatterns: [/мембран|витрэктом|пилинг|хирург/i]
  }),
  clinicalCase({
    id: 'macular-hole-450-phakic',
    question: 'What is the preferred management of a 450 µm full-thickness macular hole in a phakic patient?',
    language: 'en',
    condition: 'full-thickness macular hole',
    questionType: 'surgery',
    modifiers: [/450/, /phakic/i],
    answerPatterns: [/macular hole|vitrectomy|ILM/i]
  }),
  clinicalCase({
    id: 'large-macular-hole-ilm-comparison',
    question: 'Inverted ILM flap vs conventional ILM peeling for macular hole >400 µm',
    language: 'en',
    condition: 'full-thickness macular hole',
    questionType: 'comparison',
    interventions: [/inverted.*ilm.*flap/i],
    comparators: [/(?:internal limiting membrane|ilm).*peel/i],
    modifiers: [/400/],
    answerPatterns: [/inverted.*ILM|ILM flap/i, /peeling/i]
  }),
  clinicalCase({
    id: 'iol-dislocation-vitreous-glaucoma',
    question: 'Тактика при дислокации ИОЛ в стекловидное тело у пациента с глаукомой.',
    condition: 'intraocular lens dislocation',
    questionType: 'management',
    modifiers: [/vitreous involvement/i, /glaucoma/i],
    answerPatterns: [/ИОЛ|линз|фиксац|репозиц|эксплант|витрэктом/i]
  }),
  clinicalCase({
    id: 'iol-dislocation-vitrectomy',
    question: 'Хирургическая тактика при дислокации ИОЛ в стекловидное тело: нужна ли витрэктомия?',
    condition: 'intraocular lens dislocation',
    questionType: 'surgery',
    interventions: [/pars plana vitrectomy/i],
    modifiers: [/vitreous involvement/i],
    answerPatterns: [/витрэктом|ИОЛ|фиксац|эксплант/i]
  }),
  clinicalCase({
    id: 'cataract-surgical-management',
    question: 'Современная хирургическая тактика при возрастной катаракте: выбор подхода и ключевые риски',
    condition: 'cataract',
    questionType: 'surgery',
    answerPatterns: [/катаракт|фако|ИОЛ|хирург/i]
  }),
  clinicalCase({
    id: 'keratitis-antibacterial-therapy',
    question: 'Современная антибактериальная терапия бактериального кератита: стартовая схема и критерии эскалации',
    condition: 'keratitis',
    questionType: 'therapy',
    answerPatterns: [/кератит|антибактери|антибиот|роговиц/i]
  }),
  clinicalCase({
    id: 'uveitis-medical-therapy',
    question: 'Медикаментозная терапия переднего увеита: стартовая тактика, мониторинг и критерии изменения лечения',
    condition: 'uveitis',
    questionType: 'therapy',
    answerPatterns: [/увеит|воспален|стероид|циклоплег|терап/i]
  })
];

function selectedCases() {
  const requested = String(process.env.OPHTHASEARCH_CASE_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!requested.length) return cases;
  const known = new Map(cases.map((testCase) => [testCase.id, testCase]));
  const unknown = requested.filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`Unknown OPHTHASEARCH_CASE_IDS: ${unknown.join(', ')}`);
  return requested.map((id) => known.get(id));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reasoningDiagnostics(result) {
  const adapters = Array.isArray(result?.diagnostics?.adapters) ? result.diagnostics.adapters : [];
  return adapters.filter((entry) => entry?.trackId === 'reasoning' || entry?.adapter === 'workers-ai');
}

function validateCommon(testCase, body, elapsedMs) {
  if (body?.ok !== true) throw new Error(`Worker returned ok=${body?.ok}`);
  const result = body.result || {};
  const intent = result.intent || {};
  testCase.validateIntent(intent);

  if (result.status === 'evidence_only') {
    throw new Error(`status=evidence_only reasoning=${JSON.stringify(reasoningDiagnostics(result))}`);
  }
  if (!['complete', 'partial'].includes(result.status)) throw new Error(`status=${result.status}`);
  if (elapsedMs > maxCaseMs) throw new Error(`latency ${elapsedMs}ms exceeds ${maxCaseMs}ms budget`);

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

  testCase.validateAnswer?.(answer, bottomLine);
  testCase.validateSources?.(sources);

  return {
    id: testCase.id,
    elapsed_ms: elapsedMs,
    status: result.status,
    condition: intent.condition,
    question_type: intent.question_type,
    interventions: intent.interventions,
    comparators: intent.comparators,
    modifiers: intent.modifiers,
    sources: sources.length,
    citations: citations.length,
    management: management.length,
    top_sources: sources.slice(0, 3).map((source) => String(source?.title || '')),
    bottomLine
  };
}

async function runCase(testCase) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`\n[${testCase.id}] attempt ${attempt}/${maxAttempts}`);
    try {
      const started = Date.now();
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
        signal: AbortSignal.timeout(Math.max(45000, maxCaseMs + 10000))
      });
      const text = await response.text();
      const elapsedMs = Date.now() - started;
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 1000)}`);
      const body = JSON.parse(text);
      const summary = validateCommon(testCase, body, elapsedMs);
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

const activeCases = selectedCases();
const summaries = [];
for (const testCase of activeCases) summaries.push(await runCase(testCase));
const elapsed = summaries.map((item) => item.elapsed_ms).sort((a, b) => a - b);
const average = elapsed.length ? Math.round(elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length) : 0;
const slowest = elapsed.at(-1) || 0;
console.log(`\nOphthaSearch live acceptance passed: ${summaries.length}/${activeCases.length}; average=${average}ms; slowest=${slowest}ms`);
