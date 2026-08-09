import assert from 'node:assert/strict';
import fs from 'node:fs';

const legal=fs.readFileSync('legal.js','utf8');

assert.match(legal,/closest\('\.hero-actions,\.contact-actions'\)/,'Telegram warning should remain near direct contact actions');
assert.doesNotMatch(legal,/closest\([^\n]*author-links/,'Telegram warning must not be injected into the author/material-prepared block');
assert.doesNotMatch(legal,/\.author-links'\)\|\|a\.parentElement/,'author links must not fall back into Telegram warning injection');

console.log('Author block Telegram privacy-note regression passed');
