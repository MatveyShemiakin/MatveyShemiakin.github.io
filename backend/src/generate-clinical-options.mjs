import { buildPhysicianChoiceContext } from './knowledge-retrieval.mjs';
import { optionProviderFromEnvironment } from './option-providers.mjs';

const DIAGNOSTIC_LABELS = {
  'au-hsv-classification': 'HSV-ассоциированный передний увеит',
  'au-vzv-classification': 'VZV-ассоциированный передний увеит',
  'au-fuchs-classification': 'Синдром Фукса',
  'au-hlab27-classification': 'HLA-B27-ассоциированный передний увеит',
  'au-cmv-diagnostic-option': 'CMV-ассоциированный передний увеит',
  'au-classification-framework': 'Передний увеит иной или пока неуточнённой этиологии'
};

const MANAGEMENT_LABELS = {
  'au-hsv-vzv-treatment-option': 'Противовирусная тактика при подозрении на HSV/VZV',
  'au-cmv-topical-treatment-option': 'Местная противовирусная тактика при CMV',
  'au-cmv-systemic-treatment-option': 'Системная противовирусная тактика при тяжёлом или атипичном CMV',
  'au-cmv-maintenance-option': 'Поддерживающая тактика при рецидивирующем CMV',
  'au-noninfectious-local-option': 'Местная противовоспалительная тактика при неинфекционном фенотипе',
  'au-noninfectious-systemic-escalation': 'Системная стероид-сберегающая эскалация'
};

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function optionId(prefix, sourceId, index) {
  return `${prefix}_${String(sourceId || index).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function matchingCaseFacts(chunk, context) {
  const generic = new Set(['all_cases', 'anterior_uveitis', 'grading', 'activity']);
  const inferred = new Set(context.inferred_tags || []);
  const matched = (chunk.tags || []).filter((tag) => inferred.has(tag) && !generic.has(tag));
  return matched.length
    ? matched.map((tag) => `В описании случая распознан признак: ${tag.replaceAll('_', ' ')}.`)
    : ['Вариант сохранён в дифференциальном ряду на основании профильного пакета знаний.'];
}

function discriminatingTests(chunk) {
  const id = chunk.id;
  if (id.includes('hsv') || id.includes('vzv')) {
    return ['Уточнить чувствительность роговицы, характер атрофии радужки и анамнез кератита/зостера.', 'Рассмотреть ПЦР водянистой влаги при клинически значимой неопределённости.'];
  }
  if (id.includes('cmv')) {
    return ['Оценить гипертензивный фенотип, характер преципитатов и рецидивы.', 'Обсудить исследование водянистой влаги методом ПЦР.'];
  }
  if (id.includes('hlab27')) {
    return ['Уточнить воспалительную боль в спине, псориаз, ВЗК и чередование глаз.', 'Рассмотреть HLA-B27 и профильное системное обследование по фенотипу.'];
  }
  if (id.includes('fuchs')) {
    return ['Оценить хроническое малосимптомное течение, диффузные изменения радужки, витреит и отсутствие типичных задних синехий.'];
  }
  return ['Уточнить возраст, латеральность, течение, преципитаты, ВГД, радужку, роговицу и задний отрезок.'];
}

function mockOptions({ caseText, facts, context, warning = null }) {
  let diagnosticChunks = context.diagnostic_evidence
    .filter((chunk) => chunk.kind === 'diagnostic_option')
    .slice(0, 5);

  if (diagnosticChunks.length < 2) {
    const fallback = context.diagnostic_evidence.find((chunk) => chunk.kind === 'classification');
    if (fallback) diagnosticChunks = unique([...diagnosticChunks, fallback]);
  }

  const diagnosticOptions = diagnosticChunks.slice(0, 5).map((chunk, index) => ({
    id: optionId('diagnosis', chunk.id, index),
    label: DIAGNOSTIC_LABELS[chunk.id] || `Диагностический вариант ${index + 1}`,
    support_level: chunk.retrieval_score >= 6 ? 'strong' : chunk.retrieval_score >= 4 ? 'moderate' : 'weak',
    supporting_facts: matchingCaseFacts(chunk, context),
    against_or_missing_facts: ['Не все классификационные признаки подтверждены структурированными данными.', 'Вариант не является окончательным диагнозом.'],
    tests_to_discriminate: discriminatingTests(chunk),
    evidence_chunk_ids: [chunk.id],
    selected: false
  }));

  while (diagnosticOptions.length < 2) {
    diagnosticOptions.push({
      id: `diagnosis_unresolved_${diagnosticOptions.length + 1}`,
      label: diagnosticOptions.length ? 'Неинфекционный передний увеит иной этиологии' : 'Передний увеит неуточнённой этиологии',
      support_level: 'insufficient',
      supporting_facts: ['Имеются признаки переднего увеита, но этиологическая определённость недостаточна.'],
      against_or_missing_facts: ['Требуется уточнение клинического фенотипа и исключение инфекции.'],
      tests_to_discriminate: ['Дополнить данные о преципитатах, ВГД, радужке, роговице, заднем отрезке и системных признаках.'],
      evidence_chunk_ids: context.diagnostic_evidence[0]?.id ? [context.diagnostic_evidence[0].id] : [],
      selected: false
    });
  }

  const diagnosticIds = diagnosticOptions.map((item) => item.id);
  const managementOptions = (context.treatment_candidates || []).slice(0, 8).map((candidate, index) => ({
    id: optionId('management', candidate.option_source_chunk_id, index),
    label: MANAGEMENT_LABELS[candidate.option_source_chunk_id] || `Вариант ведения ${index + 1}`,
    applies_to_diagnostic_option_ids: diagnosticIds,
    rationale: candidate.claim,
    components: [{
      intervention: candidate.claim,
      regimen: null,
      duration: null,
      status: 'insufficient_source_detail'
    }],
    monitoring: ['Контролировать активность воспаления, остроту зрения, ВГД и осложнения в сроки, выбранные врачом по тяжести случая.'],
    risks_and_constraints: candidate.safety_requirements || [],
    evidence_chunk_ids: [candidate.option_source_chunk_id],
    selected: false,
    physician_selection_required: true
  }));

  const safety = context.safety_evidence.map((chunk) => chunk.claim);
  return {
    case_summary: caseText?.trim() || `Структурированный случай переднего увеита: ${JSON.stringify(facts).slice(0, 800)}`,
    urgency: {
      level: (facts.red_flags || []).length ? 'same_day' : 'uncertain',
      rationale: safety[0] || 'Срочность требует оценки по остроте зрения, ВГД, гипопиону и вовлечению заднего отрезка.',
      evidence_chunk_ids: context.safety_evidence.map((chunk) => chunk.id)
    },
    diagnostic_options: diagnosticOptions,
    management_options: managementOptions,
    questions_to_resolve: unique([
      'Какие данные ещё необходимы, чтобы различить предложенные этиологические варианты?',
      managementOptions.length ? null : 'Лечебные варианты заблокированы до экспертной проверки evidence package.'
    ]),
    physician_selection_required: true,
    final_decision_owner: 'physician',
    limitations: unique([...(context.limitations || []), warning])
  };
}

export function validateClinicalOptions(options, context) {
  if (!options || typeof options !== 'object') throw new Error('Generated options are required');
  if (options.physician_selection_required !== true || options.final_decision_owner !== 'physician') {
    throw new Error('Physician decision ownership was violated');
  }
  if (!Array.isArray(options.diagnostic_options) || options.diagnostic_options.length < 2 || options.diagnostic_options.length > 5) {
    throw new Error('Model must return between 2 and 5 diagnostic options');
  }
  if ((options.diagnostic_options || []).some((item) => item.selected !== false)) {
    throw new Error('A diagnostic option was selected automatically');
  }
  if ((options.management_options || []).some((item) => item.selected !== false || item.physician_selection_required !== true)) {
    throw new Error('A management option was selected automatically');
  }

  const allowedEvidenceIds = new Set((context.evidence_chunks || []).map((chunk) => chunk.id));
  const citedIds = [
    ...(options.urgency?.evidence_chunk_ids || []),
    ...(options.diagnostic_options || []).flatMap((item) => item.evidence_chunk_ids || []),
    ...(options.management_options || []).flatMap((item) => item.evidence_chunk_ids || [])
  ];
  const unknown = citedIds.filter((id) => !allowedEvidenceIds.has(id));
  if (unknown.length) throw new Error(`Model cited evidence that was not retrieved: ${unique(unknown).join(', ')}`);

  const treatmentIds = new Set((context.treatment_candidates || []).map((item) => item.option_source_chunk_id));
  for (const option of options.management_options || []) {
    if (!(option.evidence_chunk_ids || []).some((id) => treatmentIds.has(id))) {
      throw new Error(`Management option ${option.id} lacks retrieved treatment evidence`);
    }
  }
  if (!treatmentIds.size && (options.management_options || []).length) {
    throw new Error('Management options were generated while treatment evidence was locked');
  }
  return options;
}

export async function generateClinicalOptions({
  caseText = '',
  facts,
  supplementalTags = [],
  authoringMode = false,
  env = process.env
}) {
  if (!facts || typeof facts !== 'object') throw new Error('facts are required');
  const context = await buildPhysicianChoiceContext({ facts, supplementalTags, authoringMode });
  const provider = optionProviderFromEnvironment(env);

  if (provider.id === 'mock') {
    const options = validateClinicalOptions(mockOptions({ caseText, facts, context }), context);
    return {
      provider: 'mock',
      options,
      context_meta: {
        package: context.package,
        inferred_tags: context.inferred_tags,
        evidence_chunk_ids: context.evidence_chunks.map((chunk) => chunk.id),
        treatment_evidence_enabled: context.treatment_candidates.length > 0
      },
      usage: null,
      provider_response_id: null,
      degraded: false
    };
  }

  try {
    const generated = await provider.generate({ caseText, facts, context });
    const options = validateClinicalOptions(generated.options, context);
    return {
      provider: provider.id,
      options,
      context_meta: {
        package: context.package,
        inferred_tags: context.inferred_tags,
        evidence_chunk_ids: context.evidence_chunks.map((chunk) => chunk.id),
        treatment_evidence_enabled: context.treatment_candidates.length > 0
      },
      usage: generated.usage,
      provider_response_id: generated.provider_response_id,
      degraded: false
    };
  } catch (error) {
    if (env.AI_DISABLE_DEGRADED_MODE === 'true') throw error;
    const warning = 'Yandex AI не вернул валидный структурированный результат; показан безопасный детерминированный fallback по извлечённым evidence chunks.';
    const options = validateClinicalOptions(mockOptions({ caseText, facts, context, warning }), context);
    return {
      provider: `${provider.id}-fallback`,
      options,
      context_meta: {
        package: context.package,
        inferred_tags: context.inferred_tags,
        evidence_chunk_ids: context.evidence_chunks.map((chunk) => chunk.id),
        treatment_evidence_enabled: context.treatment_candidates.length > 0
      },
      usage: null,
      provider_response_id: null,
      degraded: true,
      provider_warning: warning
    };
  }
}
