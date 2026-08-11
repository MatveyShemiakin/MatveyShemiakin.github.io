import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8');

function setup(choice='analytics') {
  const calls=[];
  const docListeners={};
  const winListeners={};
  const firstScript={parentNode:{insertBefore(){}}};
  const material={
    offsetHeight:1000,
    getBoundingClientRect(){return {top:-800,height:1000};}
  };
  const document={
    referrer:'',
    readyState:'complete',
    scripts:[],
    documentElement:{scrollHeight:1000,clientHeight:200},
    body:{scrollHeight:1000},
    createElement(){return {};},
    getElementsByTagName(){return [firstScript];},
    addEventListener(type,fn){(docListeners[type]??=[]).push(fn);},
    getElementById(id){return id==='content-material'?material:null;},
    querySelector(sel){return sel==='main'?material:null;}
  };
  const window={
    localStorage:{getItem(){return choice;}},
    location:{href:'https://matveyshemyakin.ru/patients/cataract/'},
    innerHeight:200,
    scrollY:800,
    ym(...args){calls.push(args);},
    addEventListener(type,fn){(winListeners[type]??=[]).push(fn);},
    requestAnimationFrame(fn){fn();},
    setTimeout,
    clearTimeout
  };
  const context=vm.createContext({window,document,setTimeout,clearTimeout,URL,console});
  vm.runInContext(code,context);
  return {calls,docListeners,winListeners};
}

function goalCalls(env,name){
  return env.calls.filter(call=>call[1]==='reachGoal'&&call[2]===name);
}

function fire(env,type,target){
  for(const fn of env.docListeners[type]||[])fn({target});
}

function targetFor(anchor=null,summary=null){
  return {
    closest(selector){
      if(selector==='a')return anchor;
      if(selector==='summary')return summary;
      return null;
    }
  };
}

function anchor(href,text='',classes=[]) {
  return {
    href,
    textContent:text,
    matches(selector){
      return selector.split(',').some(item=>{
        item=item.trim();
        if(item==='[data-analytics-cta]')return false;
        if(item==='.button.primary')return classes.includes('button')&&classes.includes('primary');
        if(item==='.cta'||item==='.cta-button'||item==='.contact-button')return classes.includes(item.slice(1));
        return false;
      });
    }
  };
}

{
  const env=setup();
  const link=anchor('https://t.me/ShemMYu','Написать лично',['button','primary']);
  fire(env,'click',targetFor(link));
  assert.equal(goalCalls(env,'telegram_click').length,1);
  assert.equal(goalCalls(env,'cta_click').length,1);
}

{
  const env=setup();
  const link=anchor('https://prodoctorov.ru/moskva/vrach/1115864-shemyakin/','ПроДокторов');
  fire(env,'click',targetFor(link));
  assert.equal(goalCalls(env,'prodoctorov_click').length,1);
}

{
  const env=setup();
  const input={
    value:'капли после операции',
    dataset:{},
    matches(selector){return selector==='input[type="search"]';}
  };
  fire(env,'input',input);
  fire(env,'input',input);
  assert.equal(goalCalls(env,'search_use').length,1);
  assert.equal(goalCalls(env,'search_use')[0].length,3);
}

{
  const env=setup();
  const details={open:false};
  const summary={parentElement:details};
  fire(env,'click',targetFor(null,summary));
  details.open=true;
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(goalCalls(env,'faq_open').length,1);
}

{
  const env=setup();
  for(const fn of env.winListeners.scroll||[])fn();
  for(const id of ['read_25','read_50','read_75','read_90']){
    assert.equal(goalCalls(env,id).length,1);
  }
}

{
  const env=setup('necessary');
  const link=anchor('https://t.me/ShemMYu','Написать лично',['button','primary']);
  fire(env,'click',targetFor(link));
  assert.equal(env.calls.filter(call=>call[1]==='reachGoal').length,0);
}

console.log('analytics event behavior tests passed');
