import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('patients/iol-dislocation/header-photo.css', 'utf8');
const ruHtml = fs.readFileSync('patients/iol-dislocation/index.html', 'utf8');
const enHtml = fs.readFileSync('en/patients/iol-dislocation/index.html', 'utf8');
const stylesheetReference = '/patients/iol-dislocation/header-photo.css?v=20260806-3';

assert.match(
  css,
  /background:\s*url\([^\n]+\)\s+96%\s+4%\s*\/\s*auto\s+165%\s+no-repeat;/,
  'desktop crop should move the eye lower and zoom out',
);
assert.match(
  css,
  /@media \(max-width: 1020px\)[\s\S]*background-position:\s*95%\s+5%;[\s\S]*background-size:\s*auto\s+155%;/,
  'tablet crop should show more of the cornea',
);
assert.match(
  css,
  /@media \(max-width: 680px\)[\s\S]*opacity:\s*\.85;[\s\S]*background-position:\s*76%\s+4%;[\s\S]*background-size:\s*auto\s+145%;/,
  'mobile photograph should be visible and framed lower',
);
assert.match(
  css,
  /@media \(max-width: 680px\)[\s\S]*rgba\(4, 18, 37, \.10\) 100%/,
  'mobile right edge overlay should be light enough to reveal the image',
);

for (const [label, html] of [['Russian', ruHtml], ['English', enHtml]]) {
  assert.equal(
    (html.match(new RegExp(stylesheetReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
    1,
    `${label} page must load the refreshed stylesheet exactly once`,
  );
  assert.doesNotMatch(html, /header-photo\.css\?v=20260806-2/, `${label} page must not retain the stale cache key`);
}

console.log('IOL header desktop, mobile visibility and cache refresh verified.');
