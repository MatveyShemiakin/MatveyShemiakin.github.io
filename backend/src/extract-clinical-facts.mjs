import { emptyClinicalFacts } from './clinical-schema.mjs';
import { providerFromEnvironment } from './providers.mjs';

function normalized(text) {
  return String(text || '').toLowerCase().replaceAll('ё', 'е');
}

function hasAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function isNegated(text, phrase) {
  const index = text.indexOf(phrase);
  if (index < 0) return false;
  const prefix = text.slice(Math.max(0, index - 28), index);
  const suffix = text.slice(index + phrase.length, index + phrase.length + 36);
  const suffixClause = suffix.split(/[.;,]/, 1)[0];
  return /(?:нет|без|не отмечает|отрицает|отсутств)/.test(prefix)
    || /(?:^|[ ])(?:нет|отсутствуют?|не отмечаются?)(?:[ ]|$)/.test(suffixClause.trim());
}

function addSymptom(facts, text, id, phrases) {
  const matched = phrases.find((phrase) => text.includes(phrase));
  if (!matched) return;
  if (isNegated(text, matched)) {
    facts.negated_facts.push(id);
    return;
  }
  facts.symptoms.push(id);
}

export function extractFactsLocally(caseText) {
  const text = normalized(caseText);
  const facts = emptyClinicalFacts();

  if (hasAny(text, ['односторон', 'один глаз', 'правого глаза', 'левого глаза', 'od', 'os'])) facts.laterality = 'unilateral';
  if (hasAny(text, ['двусторон', 'оба глаза', 'обоих глаз'])) facts.laterality = 'bilateral';
  if (hasAny(text, ['асимметрич'])) facts.laterality = 'asymmetric';

  if (hasAny(text, ['рецидив', 'повторн', 'второй эпизод', 'не первый эпизод'])) facts.course = 'recurrent';
  else if (hasAny(text, ['хроническ', 'несколько месяцев', 'несколько лет'])) facts.course = 'chronic';
  else if (hasAny(text, ['первый эпизод', 'впервые'])) facts.course = 'first';

  if (hasAny(text, ['в течение часа', 'несколько часов', 'сегодня утром', 'внезапно'])) facts.onset = 'hours';
  else if (hasAny(text, ['несколько дней', 'суток', 'дня назад'])) facts.onset = 'days';
  else if (hasAny(text, ['несколько недель', 'неделю', 'недели'])) facts.onset = 'weeks';
  else if (hasAny(text, ['несколько месяцев', 'месяц', 'месяцев'])) facts.onset = 'months';

  addSymptom(facts, text, 'pain', ['боль', 'боли', 'болит']);
  addSymptom(facts, text, 'photophobia', ['светобоязнь', 'светобоязни', 'фотофобия']);
  addSymptom(facts, text, 'redness', ['покраснение', 'красный глаз', 'инъекция']);
  addSymptom(facts, text, 'itching', ['зуд']);
  addSymptom(facts, text, 'dryness', ['сухость', 'сухой глаз']);
  addSymptom(facts, text, 'foreign_body_sensation', ['ощущение песка', 'инородного тела']);
  addSymptom(facts, text, 'tearing', ['слезотечение']);
  addSymptom(facts, text, 'flashes', ['вспышки', 'фотопсии']);
  addSymptom(facts, text, 'floaters', ['мушки', 'плавающие помутнения']);
  addSymptom(facts, text, 'field_defect', ['занавес', 'дефект поля', 'выпадение поля']);
  addSymptom(facts, text, 'halos', ['ореолы']);
  addSymptom(facts, text, 'distortion', ['метаморфопсии', 'искажение линий']);
  addSymptom(facts, text, 'vision_loss', ['снижение зрения', 'ухудшение зрения', 'резко хуже видит']);
  addSymptom(facts, text, 'headache', ['головная боль']);
  addSymptom(facts, text, 'nausea', ['тошнота', 'рвота']);

  const iopMatch = text.match(/(?:вгд|давление)(?:\s*(?:od|os|справа|слева))?\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)/);
  if (iopMatch) {
    facts.examination.iop_mm_hg = Number(iopMatch[1].replace(',', '.'));
    facts.examination.iop_state = facts.examination.iop_mm_hg > 21 ? 'high' : facts.examination.iop_mm_hg < 8 ? 'low' : 'normal';
  } else if (hasAny(text, ['вгд повыш', 'высокое вгд', 'офтальмогипертенз'])) {
    facts.examination.iop_state = 'high';
  }

  const cellsMatch = text.match(/(?:клетки|cells?)\s*[:=]?\s*(0\.5\+|[1-4]\+|\d+(?:[.,]\d+)?)/);
  if (cellsMatch) facts.examination.anterior_chamber_cells = cellsMatch[1];

  if (hasAny(text, ['гипопион'])) facts.examination.hypopyon = !isNegated(text, 'гипопион');
  if (hasAny(text, ['задние синехии', 'синехии'])) facts.examination.synechiae = !isNegated(text, 'синехии');
  if (hasAny(text, ['инфильтрат роговицы', 'роговичный инфильтрат'])) facts.examination.corneal_infiltrate = !isNegated(text, 'инфильтрат');
  if (hasAny(text, ['дефект эпителия'])) facts.examination.epithelial_defect = !isNegated(text, 'дефект эпителия');

  const vitritisPhrase = [
    'витреит', 'витрит', 'клетки в стекловидном теле', 'взвесь в стекловидном теле',
    'помутнения в стекловидном теле', 'выпот в стекловидном теле'
  ].find((phrase) => text.includes(phrase));
  if (vitritisPhrase) facts.examination.vitritis = !isNegated(text, vitritisPhrase);

  if (hasAny(text, ['разрыв сетчатки'])) facts.examination.retinal_tear = !isNegated(text, 'разрыв сетчатки');
  if (hasAny(text, ['отслойка сетчатки'])) facts.examination.retinal_detachment = !isNegated(text, 'отслойка сетчатки');

  if (hasAny(text, ['после фако', 'после операции по поводу катаракты', 'после факоэмульсификации'])) facts.procedures.push('recent_cataract_surgery');
  else if (hasAny(text, ['после операции на глазу', 'после офтальмологической операции'])) facts.procedures.push('recent_eye_surgery');
  if (hasAny(text, ['после инъекции', 'после интравитреальной инъекции'])) facts.procedures.push('recent_injection');

  const diagnosisMap = [
    ['увеит', 'передний увеит'], ['иридоциклит', 'передний увеит'],
    ['кератит', 'кератит'], ['глауком', 'глаукома'],
    ['сухой глаз', 'синдром сухого глаза'], ['мгд', 'дисфункция мейбомиевых желёз'],
    ['отслойка сетчатки', 'отслойка сетчатки'], ['разрыв сетчатки', 'разрыв сетчатки'],
    ['эндофтальмит', 'эндофтальмит']
  ];
  diagnosisMap.forEach(([phrase, diagnosis]) => {
    if (text.includes(phrase) && !facts.suspected_diagnoses.includes(diagnosis)) facts.suspected_diagnoses.push(diagnosis);
  });

  if (facts.symptoms.includes('vision_loss')) facts.red_flags.push('Снижение зрения');
  if (facts.examination.hypopyon === true) facts.red_flags.push('Гипопион');
  if (facts.examination.vitritis === true && facts.examination.hypopyon === true) facts.red_flags.push('Гипопион с признаками вовлечения стекловидного тела');
  if (facts.examination.retinal_detachment === true) facts.red_flags.push('Отслойка сетчатки');
  if (facts.examination.iop_mm_hg !== null && facts.examination.iop_mm_hg >= 40) facts.red_flags.push('ВГД ≥40 мм рт. ст.');
  if (facts.symptoms.includes('field_defect')) facts.red_flags.push('Дефект поля зрения или занавес');

  const extractedCount = [
    facts.laterality, facts.course, facts.onset,
    ...facts.symptoms, facts.examination.iop_mm_hg,
    facts.examination.anterior_chamber_cells,
    facts.examination.hypopyon,
    facts.examination.vitritis,
    ...facts.procedures, ...facts.suspected_diagnoses
  ].filter((value) => value !== null && value !== '').length;
  facts.source_confidence = Math.min(0.85, 0.25 + extractedCount * 0.06);
  return facts;
}

function mergeFacts(base, incoming) {
  const result = structuredClone(base || emptyClinicalFacts());
  ['laterality', 'course', 'onset', 'source_confidence'].forEach((key) => {
    if (incoming?.[key] !== null && incoming?.[key] !== undefined) result[key] = incoming[key];
  });
  ['symptoms', 'procedures', 'suspected_diagnoses', 'red_flags', 'negated_facts'].forEach((key) => {
    result[key] = Array.from(new Set([...(result[key] || []), ...(incoming?.[key] || [])]));
  });
  Object.entries(incoming?.examination || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) result.examination[key] = value;
  });
  return result;
}

export async function extractClinicalFacts({ caseText, priorFacts, env = process.env }) {
  if (!caseText || typeof caseText !== 'string' || caseText.trim().length < 3) {
    throw new Error('case_text must contain at least 3 characters');
  }
  if (caseText.length > 12_000) throw new Error('case_text is too long');

  const provider = providerFromEnvironment(env);
  if (provider.id === 'mock') {
    return {
      provider: 'mock',
      facts: mergeFacts(priorFacts, extractFactsLocally(caseText)),
      usage: null,
      provider_response_id: null
    };
  }

  const response = await provider.extract({ caseText, priorFacts });
  return {
    provider: provider.id,
    facts: mergeFacts(priorFacts, response.facts),
    usage: response.usage,
    provider_response_id: response.provider_response_id
  };
}
