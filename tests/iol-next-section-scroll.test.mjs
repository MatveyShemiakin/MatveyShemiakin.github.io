import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function classList(){
  const values=new Set();
  return {
    toggle(name,force){
      if(force===undefined){
        if(values.has(name))values.delete(name);else values.add(name);
      }else if(force)values.add(name);else values.delete(name);
    },
    add(name){values.add(name);},
    remove(...names){names.forEach((name)=>values.delete(name));},
    contains(name){return values.has(name);},
  };
}

function interactive(dataset={}){
  const listeners={};
  return {
    dataset,
    classList:classList(),
    hidden:false,
    setAttribute(){},
    addEventListener(type,handler){listeners[type]=handler;},
    trigger(type){listeners[type]?.({preventDefault(){}});},
  };
}

const firstTab=interactive({tab:'overview'});
const secondTab=interactive({tab:'symptoms'});
const firstPanel=interactive({panel:'overview'});
const secondPanel=interactive({panel:'symptoms'});
const nextButton=interactive({next:'symptoms'});
let legacyScrollCalls=0;
const topicTabs={scrollIntoView(){legacyScrollCalls+=1;}};
const scrollCalls=[];

const page={
  classList:classList(),
  querySelectorAll(selector){
    if(selector==='[data-tab]')return [firstTab,secondTab];
    if(selector==='[data-panel]')return [firstPanel,secondPanel];
    if(selector==='[data-next]')return [nextButton];
    return [];
  },
  querySelector(selector){
    if(selector==='.topic-tabs')return topicTabs;
    return null;
  },
  addEventListener(){},
};

const documentElement={
  lang:'ru',
  scrollHeight:3000,
  dataset:{},
};

const context={
  document:{
    documentElement,
    querySelector(selector){return selector==='.sim-page'?page:null;},
  },
  window:{
    innerWidth:390,
    innerHeight:800,
    scrollY:2400,
    addEventListener(){},
    scrollTo(options){scrollCalls.push(options);},
  },
  location:{hash:''},
  localStorage:{getItem(){return null;},setItem(){}},
  requestAnimationFrame(callback){callback();return 1;},
  decodeURIComponent,
  console,
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('patients/iol-dislocation/script.js','utf8'),context);
nextButton.trigger('click');

assert.equal(secondPanel.hidden,false,'the requested section must become active');
assert.equal(scrollCalls.length,1,'next-section navigation must request exactly one page scroll');
assert.equal(scrollCalls[0].top,0,'next-section navigation must move the page to its top');
assert.equal(scrollCalls[0].behavior,'smooth','next-section navigation must preserve smooth motion');
assert.equal(legacyScrollCalls,0,'next-section navigation must not retain the old tab-strip scroll target');
