import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEuropePmcQuery,
  normalizeEuropePmcRecord,
  buildSearchUrl,
  buildClinicalTrialsUrl,
  normalizeClinicalTrialsStudy,
  buildJStageUrl,
  mergeProviderResults
} from '../for-doctors/ophthasearch/ophthasearch.js';

test('buildEuropePmcQuery adds real filters without altering the user query', () => {
  const query = buildEuropePmcQuery({
    q: 'macular hole surgery',
    sort: 'newest',
    date: '5y',
    openAccess: true,
    pubType: 'systematic-review',
    now: new Date('2026-08-16T00:00:00Z')
  });
  assert.match(query, /^\(macular hole surgery\)/);
  assert.match(query, /FIRST_PDATE:\[2021-08-16 TO 2026-08-16\]/);
  assert.match(query, /OPEN_ACCESS:y/);
  assert.match(query, /PUB_TYPE:"systematic review"/);
  assert.match(query, /sort_date:y$/);
});

test('normalizeEuropePmcRecord preserves supplied metadata and canonical identifiers', () => {
  const normalized = normalizeEuropePmcRecord({
    id: '12345678',
    source: 'MED',
    title: 'A trial in ophthalmology',
    authorString: 'Smith J, Lee K',
    journalTitle: 'Ophthalmology',
    pubYear: '2025',
    pubTypeList: { pubType: ['Journal Article', 'Randomized Controlled Trial'] },
    abstractText: 'Abstract text.',
    citedByCount: 9,
    pmid: '12345678',
    pmcid: 'PMC123456',
    doi: '10.1000/example',
    isOpenAccess: 'Y'
  });
  assert.equal(normalized.providerKey, 'europepmc');
  assert.equal(normalized.title, 'A trial in ophthalmology');
  assert.equal(normalized.pmid, '12345678');
  assert.equal(normalized.pmcid, 'PMC123456');
  assert.equal(normalized.doi, '10.1000/example');
  assert.deepEqual(normalized.publicationTypes, ['Journal Article', 'Randomized Controlled Trial']);
  assert.equal(normalized.isOpenAccess, true);
  assert.equal(normalized.sourceUrl, 'https://europepmc.org/article/MED/12345678');
});

test('buildSearchUrl encodes query and uses core JSON results', () => {
  const url = new URL(buildSearchUrl({
    q: 'corneal transplant',
    sort: 'relevance',
    date: 'any',
    openAccess: false,
    pubType: 'any',
    now: new Date('2026-08-16T00:00:00Z')
  }));
  assert.equal(url.origin + url.pathname, 'https://www.ebi.ac.uk/europepmc/webservices/rest/search');
  assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(url.searchParams.get('resultType'), 'core');
  assert.equal(url.searchParams.get('pageSize'), '18');
  assert.equal(url.searchParams.get('query'), '(corneal transplant)');
});

test('buildClinicalTrialsUrl uses modern v2 JSON search and RCT filter when requested', () => {
  const url = new URL(buildClinicalTrialsUrl({ q: 'glaucoma surgery', pubType: 'rct' }));
  assert.equal(url.origin + url.pathname, 'https://clinicaltrials.gov/api/v2/studies');
  assert.equal(url.searchParams.get('query.term'), 'glaucoma surgery');
  assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(url.searchParams.get('countTotal'), 'true');
  assert.match(url.searchParams.get('filter.advanced') || '', /AREA\[StudyType\]INTERVENTIONAL/);
  assert.match(url.searchParams.get('filter.advanced') || '', /AREA\[DesignAllocation\]RANDOMIZED/);
});

test('normalizeClinicalTrialsStudy maps core registry metadata into a common result card', () => {
  const normalized = normalizeClinicalTrialsStudy({
    protocolSection: {
      identificationModule: { nctId: 'NCT01234567', briefTitle: 'Glaucoma surgery trial' },
      statusModule: { overallStatus: 'RECRUITING', startDateStruct: { date: '2025-03-01' } },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'University Eye Center' } },
      conditionsModule: { conditions: ['Glaucoma'] },
      designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE2'], designInfo: { allocation: 'RANDOMIZED' } },
      descriptionModule: { briefSummary: 'A randomized surgical study.' },
      armsInterventionsModule: { interventions: [{ name: 'MIGS' }] }
    }
  });
  assert.equal(normalized.providerKey, 'clinicaltrials');
  assert.equal(normalized.kind, 'trial');
  assert.equal(normalized.registryId, 'NCT01234567');
  assert.equal(normalized.title, 'Glaucoma surgery trial');
  assert.equal(normalized.trialStatus, 'RECRUITING');
  assert.equal(normalized.phase, 'PHASE2');
  assert.equal(normalized.sponsor, 'University Eye Center');
  assert.equal(normalized.sourceUrl, 'https://clinicaltrials.gov/study/NCT01234567');
});

test('buildJStageUrl uses the official article-search service and date window', () => {
  const url = new URL(buildJStageUrl({
    q: 'retinal detachment',
    date: '5y',
    now: new Date('2026-08-16T00:00:00Z')
  }));
  assert.equal(url.origin + url.pathname, 'https://api.jstage.jst.go.jp/searchapi/do');
  assert.equal(url.searchParams.get('service'), '3');
  assert.equal(url.searchParams.get('text'), 'retinal detachment');
  assert.equal(url.searchParams.get('count'), '12');
  assert.equal(url.searchParams.get('pubyearfrom'), '2021');
  assert.equal(url.searchParams.get('pubyearto'), '2026');
});

test('mergeProviderResults removes DOI duplicates while keeping source provenance', () => {
  const merged = mergeProviderResults([
    { providerKey: 'europepmc', title: 'Same paper', doi: '10.1000/ABC', year: '2025' },
    { providerKey: 'jstage', title: 'Same paper', doi: '10.1000/abc', year: '2025' },
    { providerKey: 'clinicaltrials', title: 'Related trial', registryId: 'NCT00000001', year: '2025' }
  ]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].sourceKeys, ['europepmc', 'jstage']);
  assert.equal(merged[1].providerKey, 'clinicaltrials');
});
