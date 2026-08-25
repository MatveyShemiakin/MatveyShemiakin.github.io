function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function makeTrack(id, purpose, query, sourceClasses, evidenceTypes, dateWindow = 'current-plus-pivotal') {
  return { id, purpose, query: clean(query), sourceClasses: [...sourceClasses], evidenceTypes: [...evidenceTypes], dateWindow };
}

function treatmentLabel(intent) {
  if (intent.interventions?.includes('pharmacological therapy')) return 'pharmacological therapy';
  if (intent.question_type === 'surgery') return 'surgical management';
  return 'management';
}

function specificInterventions(intent = {}) {
  const generic = new Set(['pharmacological therapy', 'medical therapy', 'management', 'surgical management']);
  return [...new Set([...(intent.interventions || []), ...(intent.comparators || [])]
    .map(clean)
    .filter((value) => value && !generic.has(value.toLowerCase())))];
}

function comparisonPhrase(intent = {}) {
  const interventions = (intent.interventions || []).map(clean).filter(Boolean);
  const comparators = (intent.comparators || []).map(clean).filter(Boolean);
  const namedInterventions = interventions.filter((value) => !/^(pharmacological therapy|medical therapy|management|surgical management)$/i.test(value));
  if (namedInterventions.length && comparators.length) return `${namedInterventions.join(' ')} versus ${comparators.join(' ')}`;
  if (namedInterventions.length) return namedInterventions.join(' ');
  return '';
}

function conditionSpecificSurgery(intent = {}) {
  const condition = clean(intent.condition).toLowerCase();
  if (intent.question_type !== 'surgery') return '';
  if (condition === 'rhegmatogenous retinal detachment') {
    return 'pars plana vitrectomy scleral buckling pneumatic retinopexy';
  }
  if (condition === 'full-thickness macular hole') {
    return 'pars plana vitrectomy internal limiting membrane peeling';
  }
  if (condition === 'epiretinal membrane') {
    return 'pars plana vitrectomy epiretinal membrane peeling internal limiting membrane peeling';
  }
  return '';
}

function modifierPhrase(intent = {}) {
  const modifiers = (intent.modifiers || []).map(clean).filter(Boolean);
  if (!modifiers.length) return '';
  const condition = clean(intent.condition).toLowerCase();
  const size = modifiers.find((value) => /(?:>|<|≥|≤)?\s*\d{2,4}\s*µm/i.test(value));
  if (size && condition === 'full-thickness macular hole') return `large macular hole ${size}`;
  const phakic = modifiers.find((value) => /^phakic$/i.test(value));
  if (phakic && condition === 'full-thickness macular hole') return phakic;
  return '';
}

export function buildResearchPlan(intent = {}) {
  const condition = clean(intent.condition || intent.domain || 'ophthalmic condition');
  const treatment = treatmentLabel(intent);
  const named = specificInterventions(intent);
  const requested = comparisonPhrase(intent) || named.join(' ') || conditionSpecificSurgery(intent) || treatment;
  const modifiers = modifierPhrase(intent);
  const focused = clean(`${requested} ${modifiers}`);
  const tracks = [
    makeTrack(
      'guidelines',
      'Current professional-society and authority recommendations',
      `${condition} ${focused} guideline recommendation`,
      ['guideline-registry'],
      ['guideline', 'consensus'],
      'current'
    ),
    makeTrack(
      'efficacy',
      'Comparative effectiveness for the requested management domain',
      `${condition} ${focused} comparative efficacy randomized trial systematic review`,
      ['pubmed', 'europepmc', 'jstage'],
      ['systematic-review', 'meta-analysis', 'randomized-controlled-trial', 'comparative-study']
    ),
    makeTrack(
      'safety',
      'Adverse events, contraindications and tolerability',
      `${condition} ${focused} safety adverse effects contraindications tolerability`,
      ['pubmed', 'europepmc', 'jstage'],
      ['systematic-review', 'randomized-controlled-trial', 'cohort', 'safety-study']
    ),
    makeTrack(
      'alternatives',
      'Competing treatment strategies and when to choose them',
      `${condition} ${focused} alternative treatment comparative management`,
      ['pubmed', 'europepmc', 'jstage', 'guideline-registry'],
      ['guideline', 'systematic-review', 'randomized-controlled-trial', 'comparative-study']
    ),
    makeTrack(
      'monitoring-escalation',
      'Monitoring, failure criteria and escalation/de-escalation triggers',
      `${condition} ${focused} monitoring treatment failure escalation target outcomes follow-up`,
      ['guideline-registry', 'pubmed', 'europepmc'],
      ['guideline', 'consensus', 'prospective-study', 'comparative-study']
    ),
    makeTrack(
      'pivotal-evidence',
      'Practice-changing and recent pivotal evidence',
      `${condition} ${focused} pivotal trial meta-analysis recent`,
      ['pubmed', 'europepmc', 'jstage', 'openalex'],
      ['systematic-review', 'meta-analysis', 'randomized-controlled-trial'],
      'recent-10y-plus-landmark'
    ),
    makeTrack(
      'ongoing-trials',
      'Registered ongoing or recently completed trials that may change practice',
      `${condition} ${focused}`,
      ['clinicaltrials'],
      ['registered-trial'],
      'current'
    )
  ];

  if (intent.question_type === 'therapy' && intent.interventions?.includes('pharmacological therapy') && !named.length) {
    const byId = new Map(tracks.map((track) => [track.id, track]));
    byId.get('efficacy').query = `${condition} first-line pharmacological therapy prostaglandin analogue beta blocker carbonic anhydrase inhibitor alpha agonist comparative efficacy`;
    byId.get('safety').query = `${condition} topical medication safety adverse effects ocular surface adherence tolerability`;
    byId.get('alternatives').query = `${condition} selective laser trabeculoplasty versus medication first-line alternative treatment`;
    byId.get('monitoring-escalation').query = `${condition} target intraocular pressure monitoring escalation combination therapy treatment failure`;
    byId.get('pivotal-evidence').query = `${condition} medication randomized trial meta-analysis first-line treatment recent`;
    byId.get('ongoing-trials').query = `${condition} pharmacological therapy`;
  }

  return tracks;
}
