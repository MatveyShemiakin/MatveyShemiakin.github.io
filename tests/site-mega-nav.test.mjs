import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('site-mega-nav.js', 'utf8');
const css = fs.readFileSync('site-mega-nav.css', 'utf8');

for (const token of [
  'Пациентам','Для врачей','О враче','Катаракта','Глаукома','Смещение искусственного хрусталика',
  'Бактериальный кератит и язва роговицы','Ведение после сквозной кератопластики','Офтальмологические события',
  'Patients','For doctors','About the doctor','Cataract','Glaucoma','Intraocular lens dislocation','Ophthalmology events'
]) assert.ok(js.includes(token), `missing menu token: ${token}`);

for (const route of [
  '/patients/','/patients/cataract/','/patients/glaucoma/','/patients/iol-dislocation/',
  '/for-doctors/','/for-doctors/bacterial-keratitis/','/for-doctors/penetrating-keratoplasty/','/for-doctors/events/','/en/for-doctors/events/',
  '/#about','/#directions','/#education','/#science','/#contacts',
  '/en/patients/','/en/for-doctors/','/en/#about'
]) assert.ok(js.includes(route), `missing route: ${route}`);

for (const token of ['aria-expanded','focusin','Escape','closest','site-mega-nav__toggle']) {
  assert.ok(js.includes(token), `missing accessibility/interaction hook: ${token}`);
}

assert.ok(css.includes('@media (max-width:1020px)') || css.includes('@media(max-width:1020px)'), 'desktop cutoff missing');
assert.ok(css.includes('.site-mega-nav'), 'component styles missing');
assert.ok(!js.includes('style='), 'generated markup must not contain inline style attributes');

console.log('site mega navigation contract: ok');
