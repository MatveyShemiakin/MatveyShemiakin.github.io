import fs from 'node:fs';
import assert from 'node:assert/strict';
const legal=fs.readFileSync('legal.js','utf8');
const doctors=fs.readFileSync('doctors-legal.js','utf8');
const legalCss=fs.readFileSync('legal.css','utf8');
const doctorsCss=fs.readFileSync('doctors-legal.css','utf8');
assert.match(legal,/SITE_BREADCRUMBS_V1/);
assert.match(doctors,/CLINICAL_BREADCRUMBS_V1/);
assert.match(legalCss,/\.site-breadcrumbs/);
assert.match(doctorsCss,/\.clinical-breadcrumbs/);
for(const page of ['patients/before-surgery/index.html','patients/surgery-day/index.html','patients/recovery/index.html','patients/daily-life/index.html','patients/eye-drops/index.html','patients/glasses/index.html','patients/iol-dislocation/index.html','en/patients/before-surgery/index.html','en/patients/surgery-day/index.html','en/patients/recovery/index.html','en/patients/daily-life/index.html','en/patients/eye-drops/index.html','en/patients/glasses/index.html','en/patients/iol-dislocation/index.html']){
  const html=fs.readFileSync(page,'utf8');
  assert.match(html,/class=["']crumbs["']/);
  assert.match(html,/legal\.js\?v=20260805-1/);
}
for(const page of ['for-doctors/bacterial-keratitis/index.html','for-doctors/penetrating-keratoplasty/index.html','en/for-doctors/penetrating-keratoplasty/index.html']){
  assert.match(fs.readFileSync(page,'utf8'),/doctors-legal\.js\?v=20260805-1/);
}
for(const page of ['for-doctors/professional-use.html','en/for-doctors/professional-use.html']){
  assert.match(fs.readFileSync(page,'utf8'),/legal\.js\?v=20260805-1/);
}
console.log('Breadcrumb implementation checks passed.');
