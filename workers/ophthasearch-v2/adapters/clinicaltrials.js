const SEARCH_URL = 'https://clinicaltrials.gov/api/v2/studies';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function unique(values) { return [...new Set(values.map(clean).filter(Boolean))]; }

function normalize(study = {}) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const conditions = protocol.conditionsModule || {};
  const design = protocol.designModule || {};
  const status = protocol.statusModule || {};
  const description = protocol.descriptionModule || {};
  const arms = protocol.armsInterventionsModule || {};
  const sponsors = protocol.sponsorCollaboratorsModule || {};
  const nct = clean(identification.nctId).toUpperCase();
  const interventions = Array.isArray(arms.interventions) ? arms.interventions.map((item) => item?.name) : [];
  const conditionList = Array.isArray(conditions.conditions) ? conditions.conditions : [];
  const postedDate = status.studyFirstPostDateStruct?.date || status.startDateStruct?.date || '';
  return {
    sourceType: 'trial_registry',
    title: clean(identification.briefTitle || identification.officialTitle),
    authors: [],
    journal: 'ClinicalTrials.gov',
    year: clean(postedDate).slice(0, 4),
    abstractText: clean(description.briefSummary || description.detailedDescription),
    doi: '',
    pmid: '',
    pmcid: '',
    nct,
    publicationTypes: unique(['ClinicalTrials.gov registry', design.studyType, design.designInfo?.allocation]),
    sourceUrl: nct ? `https://clinicaltrials.gov/study/${encodeURIComponent(nct)}` : '',
    providerKey: 'clinicaltrials',
    trialStatus: clean(status.overallStatus),
    conditions: unique(conditionList),
    interventions: unique(interventions),
    sponsor: clean(sponsors.leadSponsor?.name),
    verification: { identifier_verified: Boolean(nct), metadata_crosschecked: false }
  };
}

export async function search(track, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const query = clean(track?.query);
  if (!query) return { provider: 'clinicaltrials', records: [], total: 0 };
  const params = new URLSearchParams({ 'query.term': query, format: 'json', pageSize: String(deps.limit || 12), countTotal: 'true' });
  const response = await fetchImpl(`${SEARCH_URL}?${params}`, { headers: { Accept: 'application/json' }, signal: deps.signal });
  if (!response.ok) throw new Error(`ClinicalTrials.gov HTTP ${response.status}`);
  const data = await response.json();
  const studies = Array.isArray(data?.studies) ? data.studies : [];
  return { provider: 'clinicaltrials', records: studies.map(normalize), total: Number(data?.totalCount || studies.length) };
}
