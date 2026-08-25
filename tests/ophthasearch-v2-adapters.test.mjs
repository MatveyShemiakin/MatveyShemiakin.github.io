import test from 'node:test';
import assert from 'node:assert/strict';
import { search as searchPubMed } from '../workers/ophthasearch-v2/adapters/pubmed.js';
import { search as searchEuropePmc } from '../workers/ophthasearch-v2/adapters/europepmc.js';
import { search as searchClinicalTrials } from '../workers/ophthasearch-v2/adapters/clinicaltrials.js';
import { verifyDoi } from '../workers/ophthasearch-v2/adapters/crossref.js';
import { search as searchOpenAlex } from '../workers/ophthasearch-v2/adapters/openalex.js';
import { runAdaptersWithDeadlines } from '../workers/ophthasearch-v2/adapters/index.js';

const track = {
  id: 'efficacy',
  query: 'primary open-angle glaucoma pharmacological therapy',
  sourceClasses: ['pubmed', 'europepmc'],
  evidenceTypes: ['systematic-review', 'randomized-controlled-trial'],
  dateWindow: 'current-plus-pivotal'
};

test('PubMed adapter uses official ESearch then EFetch MEDLINE and normalizes PMID records', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/esearch.fcgi')) {
      return new Response(JSON.stringify({ esearchresult: { idlist: ['12345678'] } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(`PMID- 12345678\nTI  - First-line glaucoma medication trial\nAU  - Smith J\nJT  - Ophthalmology\nDP  - 2025 Jan\nPT  - Randomized Controlled Trial\nAID - 10.1000/glaucoma [doi]\nAB  - Primary open-angle glaucoma medication lowered intraocular pressure.\n\n`, { status: 200 });
  };
  const result = await searchPubMed(track, { fetchImpl });
  assert.equal(calls.length, 2);
  const esearch = new URL(calls[0]);
  assert.equal(esearch.origin + esearch.pathname, 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
  assert.equal(esearch.searchParams.get('db'), 'pubmed');
  assert.equal(esearch.searchParams.get('term'), track.query);
  const efetch = new URL(calls[1]);
  assert.equal(efetch.pathname.endsWith('/efetch.fcgi'), true);
  assert.equal(efetch.searchParams.get('rettype'), 'medline');
  assert.equal(result.records[0].pmid, '12345678');
  assert.equal(result.records[0].doi, '10.1000/glaucoma');
  assert.match(result.records[0].abstractText, /intraocular pressure/i);
});

test('Europe PMC adapter uses official core JSON search', async () => {
  let requested = '';
  const result = await searchEuropePmc(track, { fetchImpl: async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ hitCount: 1, resultList: { result: [{ id: '123', source: 'MED', pmid: '123', title: 'Glaucoma review', abstractText: 'Primary open-angle glaucoma treatment.', pubYear: '2026', pubTypeList: { pubType: ['Systematic Review'] } }] } }), { status: 200 });
  } });
  const url = new URL(requested);
  assert.equal(url.origin + url.pathname, 'https://www.ebi.ac.uk/europepmc/webservices/rest/search');
  assert.equal(url.searchParams.get('resultType'), 'core');
  assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(result.records[0].pmid, '123');
});

test('ClinicalTrials adapter uses modern v2 studies API and returns trial-registry records', async () => {
  let requested = '';
  const result = await searchClinicalTrials(track, { fetchImpl: async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ studies: [{ protocolSection: { identificationModule: { nctId: 'NCT01234567', briefTitle: 'Glaucoma medication study' }, conditionsModule: { conditions: ['Primary Open-Angle Glaucoma'] }, designModule: { studyType: 'INTERVENTIONAL' }, statusModule: { overallStatus: 'RECRUITING', studyFirstPostDateStruct: { date: '2026-01-01' } }, descriptionModule: { briefSummary: 'Medication in primary open-angle glaucoma.' }, armsInterventionsModule: { interventions: [{ name: 'Latanoprost' }] } } }] }), { status: 200 });
  } });
  const url = new URL(requested);
  assert.equal(url.origin + url.pathname, 'https://clinicaltrials.gov/api/v2/studies');
  assert.equal(url.searchParams.get('query.term'), track.query);
  assert.equal(result.records[0].sourceType, 'trial_registry');
  assert.equal(result.records[0].nct, 'NCT01234567');
});

test('Crossref verifier uses versioned works DOI endpoint and crosschecks DOI metadata', async () => {
  let requested = '';
  const verified = await verifyDoi('10.1000/GLAUCOMA', { fetchImpl: async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ message: { DOI: '10.1000/glaucoma', title: ['Glaucoma medication trial'], published: { 'date-parts': [[2025]] }, author: [{ family: 'Smith', given: 'Jane' }], 'container-title': ['Ophthalmology'] } }), { status: 200 });
  }, mailto: 'research@example.org' });
  assert.match(requested, /^https:\/\/api\.crossref\.org\/v1\/works\//);
  assert.match(requested, /mailto=research%40example\.org/);
  assert.equal(verified.doi, '10.1000/glaucoma');
  assert.equal(verified.verification.identifier_verified, true);
});

test('OpenAlex search requires an API key and uses works search when configured', async () => {
  await assert.rejects(() => searchOpenAlex(track, { fetchImpl: async () => new Response('{}'), apiKey: '' }), /api key/i);
  let requested = '';
  const result = await searchOpenAlex(track, { apiKey: 'oa-test-key', fetchImpl: async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ results: [{ id: 'https://openalex.org/W1', display_name: 'Glaucoma work', publication_year: 2025, doi: 'https://doi.org/10.1000/oa', cited_by_count: 42, ids: { pmid: 'https://pubmed.ncbi.nlm.nih.gov/12345678' }, primary_location: { landing_page_url: 'https://example.org/work' }, type: 'article' }] }), { status: 200 });
  } });
  const url = new URL(requested);
  assert.equal(url.origin + url.pathname, 'https://api.openalex.org/works');
  assert.equal(url.searchParams.get('api_key'), 'oa-test-key');
  assert.equal(url.searchParams.get('search'), track.query);
  assert.equal(result.records[0].doi, '10.1000/oa');
});

test('deadline runner returns fast adapters even when another adapter stalls', async () => {
  const adapters = {
    fast: async () => ({ records: [{ title: 'Fast evidence' }] }),
    stalled: async () => new Promise(() => {})
  };
  const started = Date.now();
  const result = await runAdaptersWithDeadlines(track, adapters, { timeoutMs: 30 });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 500, `deadline isolation took ${elapsed}ms`);
  assert.equal(result.fast.status, 'fulfilled');
  assert.equal(result.stalled.status, 'timeout');
  assert.equal(result.fast.records[0].title, 'Fast evidence');
});
