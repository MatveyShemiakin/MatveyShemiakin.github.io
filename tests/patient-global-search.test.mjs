import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const hub=read('patients/patients-hub.js');
const ruGlaucoma=read('patients/glaucoma/index.html');
const enGlaucoma=read('en/patients/glaucoma/index.html');

assert.match(ruGlaucoma,/Можно ли вылечить глаукому полностью\?/,'source glaucoma FAQ question is missing');
assert.match(enGlaucoma,/class="faq-question"/,'English glaucoma FAQ source is missing');

assert.match(hub,/fetch\(/,'patient hub must fetch published condition pages for indexing');
assert.match(hub,/DOMParser/,'patient hub must parse published condition pages');
assert.match(hub,/\.faq-item/,'patient hub must index FAQ items from condition pages');
assert.match(hub,/\.faq-question/,'patient hub must use real published FAQ questions as result titles');
assert.match(hub,/condition-card\[href\]/,'condition pages must be discovered from the published patient hub cards');
assert.match(hub,/data-condition-detail-result/,'condition FAQ matches must be rendered as searchable results');
assert.match(hub,/location\.hash|#\$\{/,'condition FAQ results must deep-link to the matching published question');
assert.doesNotMatch(hub,/const CONDITION_RESULTS=/,'manual condition keyword lists must not be the primary search index');

console.log('Patient global search structural checks passed');
