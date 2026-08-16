import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEuropePmcQuery, normalizeEuropePmcRecord, buildSearchUrl } from '../for-doctors/ophthasearch/ophthasearch.js';

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
  assert.equal(normalized.title, 'A trial in ophthalmology');
  assert.equal(normalized.pmid, '12345678');
  assert.equal(normalized.pmcid, 'PMC123456');
  assert.equal(normalized.doi, '10.1000/example');
  assert.deepEqual(normalized.publicationTypes, ['Journal Article', 'Randomized Controlled Trial']);
  assert.equal(normalized.isOpenAccess, true);
  assert.equal(normalized.europePmcUrl, 'https://europepmc.org/article/MED/12345678');
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
  assert.equal(url.searchParams.get('pageSize'), '25');
  assert.equal(url.searchParams.get('query'), '(corneal transplant)');
});
