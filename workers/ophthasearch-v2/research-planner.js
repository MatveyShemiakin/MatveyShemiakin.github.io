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

export function buildResearchPlan(intent = {}) {
  const condition = clean(intent.condition || intent.domain || 'ophthalmic condition');
  const treatment = treatmentLabel(intent);
  const tracks = [
    makeTrack(
      'guidelines',
      'Current professional-society and authority recommendations',
      `${condition} guideline ${treatment}`,
      ['guideline-registry'],
      ['guideline', 'consensus'],
      'current'
    ),
    makeTrack(
      'efficacy',
      'Comparative effectiveness for the requested management domain',
      `${condition} ${treatment} comparative efficacy randomized trial systematic review`,
      ['pubmed', 'europepmc'],
      ['systematic-review', 'meta-analysis', 'randomized-controlled-trial', 'comparative-study']
    ),
    makeTrack(
      'safety',
      'Adverse events, contraindications and tolerability',
      `${condition} ${treatment} safety adverse effects contraindications tolerability`,
      ['pubmed', 'europepmc'],
      ['systematic-review', 'randomized-controlled-trial', 'cohort', 'safety-study']
    ),
    makeTrack(
      'alternatives',
      'Competing treatment strategies and when to choose them',
      `${condition} alternative treatment comparative management`,
      ['pubmed', 'europepmc', 'guideline-registry'],
      ['guideline', 'systematic-review', 'randomized-controlled-trial', 'comparative-study']
    ),
    makeTrack(
      'monitoring-escalation',
      'Monitoring, failure criteria and escalation/de-escalation triggers',
      `${condition} monitoring treatment failure escalation target outcomes follow-up`,
      ['guideline-registry', 'pubmed', 'europepmc'],
      ['guideline', 'consensus', 'prospective-study', 'comparative-study']
    ),
    makeTrack(
      'pivotal-evidence',
      'Practice-changing and recent pivotal evidence',
      `${condition} ${treatment} pivotal trial meta-analysis recent`,
      ['pubmed', 'europepmc', 'openalex'],
      ['systematic-review', 'meta-analysis', 'randomized-controlled-trial'],
      'recent-10y-plus-landmark'
    )
  ];

  if (intent.question_type === 'therapy' && intent.interventions?.includes('pharmacological therapy')) {
    const byId = new Map(tracks.map((track) => [track.id, track]));
    byId.get('efficacy').query = `${condition} first-line pharmacological therapy prostaglandin analogue beta blocker carbonic anhydrase inhibitor alpha agonist comparative efficacy`;
    byId.get('safety').query = `${condition} topical medication safety adverse effects ocular surface adherence tolerability`;
    byId.get('alternatives').query = `${condition} selective laser trabeculoplasty versus medication first-line alternative treatment`;
    byId.get('monitoring-escalation').query = `${condition} target intraocular pressure monitoring escalation combination therapy treatment failure`;
    byId.get('pivotal-evidence').query = `${condition} medication randomized trial meta-analysis first-line treatment recent`;
  }

  return tracks;
}
