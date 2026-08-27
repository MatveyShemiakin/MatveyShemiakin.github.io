import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller=fs.readFileSync(new URL('../site-motion.js', import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../site-motion.css', import.meta.url),'utf8');

assert.match(controller,/function\s+mountHeroMission\s*\(/,'homepage mission must be mounted by the global motion controller');
assert.match(controller,/Сделать современную офтальмохирургию понятной, предсказуемой и безопасной для пациента/,'Russian mission text missing');
assert.match(controller,/Make modern ophthalmic surgery understandable, predictable, and safe for the patient/,'English mission text missing');
assert.match(controller,/\.direction-card/,'homepage direction cards must reveal individually');
assert.match(controller,/\.condition-card/,'patient condition cards must reveal individually');
assert.match(controller,/\.library-card/,'doctor library cards must reveal individually');
assert.match(controller,/\.doctor-workspace-panel/,'doctor workspace panels must reveal individually');
assert.match(controller,/\.metric/,'science metrics must reveal individually');
assert.match(controller,/\.publication/,'publication rows must reveal individually');
assert.match(controller,/\.contact-link/,'contact actions must reveal individually');
assert.match(controller,/\.urgent/,'urgent content exclusion must remain configured');
assert.match(controller,/\.red-flag/,'red flag exclusion must remain configured');
assert.doesNotMatch(controller,/\.style\.|setAttribute\(['"]style|cssText/,'motion controller must not inject inline styles');

assert.match(css,/\.direction-grid/,'direction grid must participate in staggered reveal');
assert.match(css,/\.condition-grid/,'patient condition grid must participate in staggered reveal');
assert.match(css,/\.library-grid/,'doctor library grid must participate in staggered reveal');
assert.match(css,/>\s*\.site-motion-reveal:nth-child\(2\)/,'second child stagger selector missing');
assert.match(css,/transition-delay:\s*80ms/,'first stagger delay missing');
assert.match(css,/transition-delay:\s*160ms/,'second stagger delay missing');
assert.match(css,/\.direction-card\.site-motion-reveal/,'direction cards need component-level sequencing');
assert.match(css,/\.condition-number/,'icon/number reveal part missing');
assert.match(css,/:where\(h2, h3, strong, \.library-label\)/,'heading reveal sequence missing');
assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'reduced motion fallback missing');
assert.doesNotMatch(css,/animation:\s*[^;]*infinite/i,'no infinite motion allowed');

console.log('London-style scroll reveal and homepage mission contract verified.');
