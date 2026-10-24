import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('language controller preserves the valid counterpart supplied by the shared header',()=>{
 const shared={href:'/en/patients/',remove(){throw new Error('Shared valid counterpart was replaced')}};
 const document={documentElement:{dataset:{},lang:'ru'},readyState:'complete',querySelector(selector){return selector==='header[data-site-header] .site-language-switch'?shared:null},querySelectorAll(){return [shared]}};
 vm.runInNewContext(fs.readFileSync('site-language-switch.js','utf8'),{document,window:{location:{pathname:'/patients/cataract-postop-plan/',origin:'https://matveyshemyakin.ru'}}});
 assert.equal(shared.href,'/en/patients/');
});
test('theme button uses the pressed state owned by its controller',()=>{
 const html=fs.readFileSync('shared/site-header.html','utf8');assert.doesNotMatch(html,/role="switch"/);
});
