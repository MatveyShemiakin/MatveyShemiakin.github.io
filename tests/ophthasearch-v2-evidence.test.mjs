import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDocument,
  deduplicateDocuments,
  classifyEvidence,
  buildEvidencePack,
  qualityFlags
} from '../workers/ophthasearch-v2/evidence.js';

const glaucomaIntent = {
  language: 'en',
  domain: 'glaucoma',
  condition: 'primary open-angle glaucoma',
  question_type: 'therapy',
  population: [],
  interventions: ['pharmacological therapy'],
  comparators: [],
  outcomes: ['intraocular pressure'],
  modifiers: [],
  needs_dosing: true,
  needs_alternatives: true,
  ambiguities: []
};

test('normalizes source metadata into the v2 document contract', () => {
  const doc = normalizeDocument({
    title: '  Glaucoma therapy trial  ',
    authors: ['Smith J', 'Lee K'],
    journal: 'Ophthalmology',
    year: '2025',
    abstractText: 'A randomized study.',
    doi: ' https://doi.org/10.1000/ABC ',
    pmid: '12345678',
    publicationTypes: ['Randomized Controlled Trial'],
    sourceUrl: 'https://example.org/article'
  }, { retrievedFrom: 'europepmc' });
  assert.equal(doc.title, 'Glaucoma therapy trial');
  assert.equal(doc.doi, '10.1000/abc');
  assert.equal(doc.pmid, '12345678');
  assert.deepEqual(doc.retrieved_from, ['europepmc']);
  assert.equal(doc.source_type, 'journal_article');
});

test('deduplicates in identifier priority DOI then PMID then NCT then title-year-author', () => {
  const docs = [
    normalizeDocument({ title: 'Paper A', year: 2025, doi: '10.1000/a', pmid: '111', authors: ['Alpha A'] }, { retrievedFrom: 'pubmed' }),
    normalizeDocument({ title: 'Paper A copy', year: 2025, doi: '10.1000/A', pmid: '999', authors: ['Alpha A'] }, { retrievedFrom: 'europepmc' }),
    normalizeDocument({ title: 'Paper B', year: 2024, pmid: '222', authors: ['Beta B'] }, { retrievedFrom: 'pubmed' }),
    normalizeDocument({ title: 'Paper B duplicate', year: 2024, pmid: '222', authors: ['Beta B'] }, { retrievedFrom: 'openalex' }),
    normalizeDocument({ title: 'Trial C', year: 2026, nct: 'NCT01234567' }, { retrievedFrom: 'clinicaltrials' }),
    normalizeDocument({ title: 'Trial C duplicate', year: 2026, nct: 'nct01234567' }, { retrievedFrom: 'other-registry' }),
    normalizeDocument({ title: 'No ID study', year: 2023, authors: ['Gamma G'] }, { retrievedFrom: 'source-a' }),
    normalizeDocument({ title: 'No ID Study', year: 2023, authors: ['Gamma G'] }, { retrievedFrom: 'source-b' })
  ];
  const result = deduplicateDocuments(docs);
  assert.equal(result.length, 4);
  assert.deepEqual(result[0].retrieved_from.sort(), ['europepmc', 'pubmed']);
  assert.deepEqual(result[1].retrieved_from.sort(), ['openalex', 'pubmed']);
  assert.deepEqual(result[2].retrieved_from.sort(), ['clinicaltrials', 'other-registry']);
  assert.deepEqual(result[3].retrieved_from.sort(), ['source-a', 'source-b']);
});

test('classifies registries as ongoing context and never efficacy evidence', () => {
  const evidence = classifyEvidence(normalizeDocument({ sourceType: 'trial_registry', title: 'Registered glaucoma trial', nct: 'NCT00000001' }, { retrievedFrom: 'clinicaltrials' }));
  assert.equal(evidence.group, 'ongoing');
  assert.equal(evidence.useForEfficacy, false);
});

test('classifies systematic reviews, RCTs, cohorts and case reports in hierarchy order', () => {
  const systematic = classifyEvidence(normalizeDocument({ publicationTypes: ['Systematic Review', 'Meta-Analysis'] }));
  const rct = classifyEvidence(normalizeDocument({ publicationTypes: ['Randomized Controlled Trial'] }));
  const cohort = classifyEvidence(normalizeDocument({ publicationTypes: ['Retrospective Cohort Study'] }));
  const caseReport = classifyEvidence(normalizeDocument({ publicationTypes: ['Case Reports'] }));
  assert.ok(systematic.rank < rct.rank);
  assert.ok(rct.rank < cohort.rank);
  assert.ok(cohort.rank < caseReport.rank);
});

test('relevance gate prevents an unrelated meta-analysis outranking a relevant glaucoma RCT', () => {
  const relevant = normalizeDocument({
    title: 'Randomized trial of first-line medical therapy for primary open-angle glaucoma',
    abstractText: 'Prostaglandin analogue treatment reduced intraocular pressure.',
    publicationTypes: ['Randomized Controlled Trial'],
    year: 2025
  }, { retrievedFrom: 'pubmed' });
  const unrelated = normalizeDocument({
    title: 'Meta-analysis of vitrectomy for rhegmatogenous retinal detachment',
    abstractText: 'Retinal reattachment after pars plana vitrectomy.',
    publicationTypes: ['Systematic Review', 'Meta-Analysis'],
    year: 2026
  }, { retrievedFrom: 'pubmed' });
  const pack = buildEvidencePack(glaucomaIntent, [unrelated, relevant]);
  assert.equal(pack.sources.length, 1);
  assert.equal(pack.sources[0].title, relevant.title);
  assert.equal(pack.sources[0].source_id, 'S1');
});

test('Evidence Pack assigns immutable source IDs and separates ongoing trials', () => {
  const article = normalizeDocument({
    title: 'Medical treatment of primary open-angle glaucoma',
    abstractText: 'Topical therapy lowers intraocular pressure in glaucoma.',
    publicationTypes: ['Systematic Review'],
    doi: '10.1000/glaucoma'
  }, { retrievedFrom: 'europepmc' });
  const trial = normalizeDocument({
    sourceType: 'trial_registry',
    title: 'Primary open-angle glaucoma medication study',
    abstractText: 'Registered interventional study in primary open-angle glaucoma.',
    nct: 'NCT01234567'
  }, { retrievedFrom: 'clinicaltrials' });
  const pack = buildEvidencePack(glaucomaIntent, [article, trial]);
  assert.deepEqual(pack.sources.map((source) => source.source_id), ['S1', 'S2']);
  assert.equal(pack.efficacy.length, 1);
  assert.equal(pack.ongoing_trials.length, 1);
  assert.equal(pack.ongoing_trials[0].source_id, 'S2');
});

test('quality flags surface retrospective, small-sample and surrogate-endpoint limitations', () => {
  const flags = qualityFlags(normalizeDocument({
    title: 'Retrospective glaucoma cohort',
    abstractText: 'Retrospective study of 24 eyes using intraocular pressure as the primary endpoint.',
    publicationTypes: ['Retrospective Cohort Study'],
    sampleSize: 24,
    primaryOutcomes: ['intraocular pressure']
  }));
  assert.ok(flags.includes('retrospective-design'));
  assert.ok(flags.includes('small-sample'));
  assert.ok(flags.includes('surrogate-outcome'));
});
