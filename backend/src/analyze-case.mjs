import { extractClinicalFacts } from './extract-clinical-facts.mjs';
import { generateClinicalOptions } from './generate-clinical-options.mjs';

function normalize(value) {
  return String(value || '').toLowerCase().replaceAll('ё', 'е');
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function inferSupplementalTags(caseText, facts) {
  const text = normalize(caseText);
  const tags = [];
  const add = (condition, tag) => { if (condition) tags.push(tag); };

  add(/hla[- ]?b27|\bb27\b/.test(text), 'hla_b27');
  add(/спондилоарт|анкилозир|воспалительн\w* бол\w* в спине/.test(text), 'spondyloarthritis');
  add(/псориаз/.test(text), 'psoriasis');
  add(/болезн\w* крон|язвенн\w* колит|воспалительн\w* заболеван\w* кишеч/.test(text), 'inflammatory_bowel_disease');
  add(/герпес|hsv/.test(text), 'hsv');
  add(/опоясывающ|zoster|vzv/.test(text), 'vzv');
  add(/cmv|цитомегалов/.test(text), 'cmv');
  add(/фукс|fuchs/.test(text), 'fuchs');
  add(/секторн\w* атроф\w* радуж/.test(text), 'sectoral_iris_atrophy');
  add(/диффузн\w* атроф\w* радуж/.test(text), 'diffuse_iris_atrophy');
  add(/снижен\w* чувствительн\w* роговиц/.test(text), 'reduced_corneal_sensation');
  add(/кератит|рубц\w* роговиц/.test(text), 'keratitis');
  add(/фибрин/.test(text), 'fibrin');
  add(/гипопион/.test(text), 'hypopyon');
  add(/витреит|витрит|клетк\w*.*стекловид|помутнен\w*.*стекловид|выпот.*стекловид/.test(text), 'vitritis');
  add(/ретинит|васкулит сетчат/.test(text), 'retinitis');
  add(/после операц|после фако/.test(text), 'postoperative');
  add(/после инъекц|интравитреальн\w* инъекц/.test(text), 'post_injection');
  add(/иммуносупресс|иммунодефиц|вич|химиотерап/.test(text), 'immunosuppressed');

  if (facts?.examination?.iop_state === 'high' || Number(facts?.examination?.iop_mm_hg) > 21) tags.push('high_iop');
  if (facts?.course) tags.push(facts.course);
  if (facts?.laterality) tags.push(facts.laterality);
  if (facts?.onset === 'hours' || facts?.onset === 'days') tags.push('acute');
  return unique(tags);
}

function recognizedFacts(caseText, facts, tags) {
  const labels = {
    unilateral: 'Одностороннее поражение',
    bilateral: 'Двустороннее поражение',
    asymmetric: 'Асимметричное поражение',
    first: 'Первый эпизод',
    recurrent: 'Рецидивирующее течение',
    chronic: 'Хроническое течение',
    hours: 'Начало в течение часов',
    days: 'Начало в течение дней',
    weeks: 'Начало в течение недель',
    months: 'Начало в течение месяцев',
    pain: 'Боль',
    photophobia: 'Светобоязнь',
    redness: 'Покраснение',
    vision_loss: 'Снижение зрения',
    hla_b27: 'Указана связь с HLA-B27',
    spondyloarthritis: 'Указан спондилоартрит / воспалительная боль в спине',
    psoriasis: 'Указан псориаз',
    inflammatory_bowel_disease: 'Указано воспалительное заболевание кишечника',
    hsv: 'Есть указание на HSV',
    vzv: 'Есть указание на VZV / опоясывающий герпес',
    cmv: 'Есть указание на CMV',
    fuchs: 'Есть указание на синдром Фукса',
    sectoral_iris_atrophy: 'Секторная атрофия радужки',
    diffuse_iris_atrophy: 'Диффузная атрофия радужки',
    reduced_corneal_sensation: 'Снижена чувствительность роговицы',
    keratitis: 'Кератит / роговичный анамнез',
    fibrin: 'Фибрин в передней камере',
    hypopyon: 'Гипопион',
    vitritis: 'Вовлечение стекловидного тела',
    retinitis: 'Ретинит / васкулит сетчатки',
    postoperative: 'Связь с операцией',
    post_injection: 'Связь с внутриглазной инъекцией',
    immunosuppressed: 'Иммуносупрессия'
  };

  const rows = [];
  const push = (id, value, confidence = facts?.source_confidence || 0.6) => {
    if (value === null || value === undefined || value === '' || value === false) return;
    rows.push({ id, label: labels[id] || id, value: String(value), confidence });
  };

  push(facts?.laterality, facts?.laterality);
  push(facts?.course, facts?.course);
  push(facts?.onset, facts?.onset);
  for (const symptom of facts?.symptoms || []) push(symptom, symptom);
  if (facts?.examination?.iop_mm_hg !== null && facts?.examination?.iop_mm_hg !== undefined) {
    rows.push({ id: 'iop_mm_hg', label: 'ВГД', value: `${facts.examination.iop_mm_hg} мм рт. ст.`, confidence: facts.source_confidence || 0.7 });
  } else if (facts?.examination?.iop_state) {
    rows.push({ id: 'iop_state', label: 'Состояние ВГД', value: facts.examination.iop_state, confidence: facts.source_confidence || 0.6 });
  }
  if (facts?.examination?.anterior_chamber_cells) {
    rows.push({ id: 'anterior_chamber_cells', label: 'Клетки передней камеры', value: facts.examination.anterior_chamber_cells, confidence: facts.source_confidence || 0.7 });
  }
  if (facts?.examination?.hypopyon === true) push('hypopyon', 'есть');
  if (facts?.examination?.vitritis === true) push('vitritis', 'есть');
  if (facts?.examination?.synechiae === true) rows.push({ id: 'synechiae', label: 'Задние синехии', value: 'есть', confidence: facts.source_confidence || 0.6 });
  for (const tag of tags) if (labels[tag]) push(tag, 'указано', 0.72);

  const deduplicated = new Map();
  for (const row of rows) deduplicated.set(row.id, row);
  return [...deduplicated.values()].slice(0, 24);
}

function buildQuestions(facts, tags, modelQuestions = []) {
  const questions = [];
  const ask = (id, text, reason, priority = 'important') => {
    if (!questions.some((item) => item.id === id)) questions.push({ id, text, reason, priority });
  };
  const exam = facts?.examination || {};
  const tagSet = new Set(tags);

  if (!facts?.laterality) ask('laterality', 'Какой глаз поражён и является ли процесс односторонним, двусторонним или альтернирующим?', 'Латеральность существенно меняет этиологический ряд.');
  if (!facts?.course) ask('course', 'Это первый эпизод, рецидивирующее или хроническое воспаление?', 'Течение помогает различить HLA-B27, вирусный, Fuchs и другие фенотипы.');
  if (exam.visual_acuity_reduced === null) ask('visual_acuity', 'Какова острота зрения каждого глаза и насколько она изменилась?', 'Нужна для оценки срочности и поражения заднего отрезка.', 'safety');
  if (!exam.anterior_chamber_cells) ask('activity', 'Какова степень клеточной реакции и опалесценции в передней камере?', 'Активность определяет тяжесть и динамику контроля.');
  if (exam.iop_mm_hg === null && !exam.iop_state) ask('iop', 'Какое ВГД на поражённом и парном глазу?', 'Гипертензивный фенотип поддерживает вирусные варианты и влияет на безопасность.', 'safety');
  if (exam.hypopyon === null) ask('hypopyon', 'Есть ли гипопион или выраженный фибрин?', 'Нужен для исключения опасных инфекционных и послеоперационных состояний.', 'safety');
  if (exam.vitritis === null) ask('posterior', 'Есть ли витреит, ретинит, васкулит или иные признаки поражения заднего отрезка?', 'Заднее вовлечение меняет срочность и лечебную тактику.', 'safety');

  const viralRelevant = tagSet.has('high_iop') || tagSet.has('hsv') || tagSet.has('vzv') || tagSet.has('cmv') || facts?.laterality === 'unilateral';
  if (viralRelevant && !tagSet.has('sectoral_iris_atrophy') && !tagSet.has('diffuse_iris_atrophy')) {
    ask('iris_atrophy', 'Есть ли секторная или диффузная атрофия радужки?', 'Это важный различающий признак HSV/VZV/CMV и синдрома Фукса.');
  }
  if (viralRelevant && !tagSet.has('reduced_corneal_sensation')) {
    ask('corneal_sensation', 'Оценена ли чувствительность роговицы и есть ли текущий или перенесённый кератит?', 'Помогает оценить герпетическую этиологию.');
  }
  if (!tagSet.has('hla_b27') && !tagSet.has('spondyloarthritis')) {
    ask('systemic', 'Есть ли воспалительная боль в спине, псориаз, ВЗК, язвы полости рта/гениталий или другие системные признаки?', 'Системный фенотип определяет целевое обследование.');
  }

  for (const text of modelQuestions || []) {
    if (typeof text !== 'string' || text.trim().length < 5) continue;
    ask(`model_${questions.length + 1}`, text.trim(), 'Вопрос сформирован моделью для различения предложенных вариантов.', 'important');
  }

  return questions
    .sort((a, b) => (a.priority === 'safety' ? -1 : 0) - (b.priority === 'safety' ? -1 : 0))
    .slice(0, 7);
}

export async function analyzeCase({ caseText, priorFacts = null, authoringMode = false, env = process.env }) {
  if (!caseText || typeof caseText !== 'string' || caseText.trim().length < 10) {
    throw new Error('case_text must contain at least 10 characters');
  }

  const extraction = await extractClinicalFacts({ caseText, priorFacts, env });
  const tags = inferSupplementalTags(caseText, extraction.facts);
  const generated = await generateClinicalOptions({
    caseText,
    facts: extraction.facts,
    supplementalTags: tags,
    authoringMode,
    env
  });

  return {
    ok: true,
    action: 'analyze_case',
    provider: generated.provider,
    case_text: caseText,
    facts: extraction.facts,
    recognized_facts: recognizedFacts(caseText, extraction.facts, tags),
    missing_questions: buildQuestions(extraction.facts, tags, generated.options.questions_to_resolve),
    diagnostic_options: generated.options.diagnostic_options,
    management_options: generated.options.management_options,
    urgency: generated.options.urgency,
    limitations: generated.options.limitations,
    physician_selection_required: true,
    final_decision_owner: 'physician',
    context_meta: generated.context_meta,
    usage: {
      extraction: extraction.usage || null,
      generation: generated.usage || null
    }
  };
}
