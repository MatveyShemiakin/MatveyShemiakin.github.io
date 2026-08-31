import { readFile } from 'node:fs/promises';

const PACKAGE_ROOT = new URL('../knowledge/pathologies/anterior-uveitis/', import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, PACKAGE_ROOT), 'utf8'));
}

function add(set, value) {
  if (value) set.add(String(value).toLowerCase());
}

export function inferClinicalTags(facts = {}, supplementalTags = []) {
  const tags = new Set(['anterior_uveitis', 'all_cases']);
  add(tags, facts.laterality);
  add(tags, facts.course);
  add(tags, facts.onset);

  if (facts.onset === 'hours' || facts.onset === 'days') tags.add('acute');
  if (facts.examination?.iop_state === 'high' || Number(facts.examination?.iop_mm_hg) > 21) tags.add('high_iop');
  if (facts.examination?.vitritis === true) tags.add('vitritis');
  if (facts.examination?.hypopyon === true) tags.add('hypopyon');
  if (facts.examination?.corneal_infiltrate === true || facts.examination?.epithelial_defect === true) tags.add('keratitis');

  for (const symptom of facts.symptoms || []) add(tags, symptom);
  for (const diagnosis of facts.suspected_diagnoses || []) {
    const normalized = String(diagnosis).toLowerCase();
    if (normalized.includes('увеит') || normalized.includes('uveitis')) tags.add('anterior_uveitis');
    if (normalized.includes('герп') || normalized.includes('hsv')) tags.add('hsv');
    if (normalized.includes('zoster') || normalized.includes('vzv')) tags.add('vzv');
    if (normalized.includes('cmv') || normalized.includes('цитомегалов')) tags.add('cmv');
    if (normalized.includes('fuchs') || normalized.includes('фукс')) tags.add('fuchs');
    if (normalized.includes('hla-b27') || normalized.includes('hla_b27')) tags.add('hla_b27');
  }
  for (const tag of supplementalTags || []) add(tags, tag);
  return [...tags];
}

function scoreChunk(chunk, tagSet) {
  let score = 0;
  for (const tag of chunk.tags || []) {
    if (!tagSet.has(tag)) continue;
    score += tag === 'all_cases' ? 0.5 : 2;
  }
  if (chunk.kind === 'safety') score += 1;
  return score;
}

export async function retrieveEvidence({
  facts = {},
  supplementalTags = [],
  includeLocked = false,
  limit = 12
} = {}) {
  const [manifest, evidence] = await Promise.all([
    readJson('manifest.json'),
    readJson('evidence.json')
  ]);
  const inferredTags = inferClinicalTags(facts, supplementalTags);
  const tagSet = new Set(inferredTags);

  const chunks = evidence.evidence_chunks
    .filter((chunk) => includeLocked || chunk.activation === 'retrievable')
    .map((chunk) => ({ ...chunk, retrieval_score: scoreChunk(chunk, tagSet) }))
    .filter((chunk) => chunk.retrieval_score > 0)
    .sort((a, b) => b.retrieval_score - a.retrieval_score || a.id.localeCompare(b.id))
    .slice(0, limit);

  return {
    package: {
      package_id: manifest.package_id,
      version: manifest.version,
      status: manifest.status,
      review_status: manifest.review_status
    },
    inferred_tags: inferredTags,
    evidence_chunks: chunks
  };
}

export async function buildPhysicianChoiceContext({
  facts = {},
  supplementalTags = [],
  authoringMode = false
} = {}) {
  const retrieval = await retrieveEvidence({
    facts,
    supplementalTags,
    includeLocked: authoringMode,
    limit: 20
  });

  const diagnosticEvidence = retrieval.evidence_chunks.filter((chunk) =>
    ['diagnostic_option', 'diagnostic_reasoning', 'classification'].includes(chunk.kind)
  );
  const treatmentEvidence = retrieval.evidence_chunks.filter((chunk) => chunk.kind === 'treatment_option');
  const safetyEvidence = retrieval.evidence_chunks.filter((chunk) => chunk.kind === 'safety');

  return {
    ...retrieval,
    generation_contract: {
      task: 'Generate multiple evidence-grounded diagnostic and management options for physician review.',
      final_decision_owner: 'physician',
      required_number_of_diagnostic_options: { min: 2, max: 5 },
      do_not_select_final_diagnosis: true,
      do_not_select_final_treatment: true,
      do_not_invent_drugs_or_doses: true,
      cite_evidence_chunk_ids_for_material_claims: true,
      explain_supporting_facts_and_missing_or_conflicting_facts: true
    },
    diagnostic_evidence: diagnosticEvidence,
    treatment_candidates: treatmentEvidence.map((chunk) => ({
      option_source_chunk_id: chunk.id,
      selected: false,
      physician_selection_required: true,
      activation: chunk.activation,
      evidence_strength: chunk.evidence_strength,
      claim: chunk.claim,
      source_ids: chunk.source_ids,
      safety_requirements: chunk.safety_requirements || []
    })),
    safety_evidence: safetyEvidence,
    limitations: authoringMode
      ? ['Draft authoring mode: treatment candidates are not approved for clinical deployment.']
      : ['Locked treatment evidence is excluded until clinical and legal review is complete.']
  };
}
