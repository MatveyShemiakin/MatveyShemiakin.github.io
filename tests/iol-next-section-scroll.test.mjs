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
let panelScrollCalls=0;
secondPanel.scrollIntoView=(options)=>{
  panelScrollCalls+=1;
  secondPanel.lastScrollOptions=options;
};
const scrollCalls=[];

const page={
  classList:classList(),
  querySelectorAll(selector){
    if(selector==='[data-tab]')return [firstTab,secondTab];
    if(selector==='[data-panel]')return [firstPanel,secondPanel];
    if(selector==='[data-next]')return [nextButton];
    return [];
  },
  querySelector(){return null;},
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
assert.equal(panelScrollCalls,1,'next-section navigation must scroll to the newly activated section');
assert.equal(secondPanel.lastScrollOptions.block,'start','the new section must begin at the top of the readable viewport');
assert.equal(secondPanel.lastScrollOptions.behavior,'smooth','next-section navigation must preserve smooth motion');
assert.equal(scrollCalls.length,0,'next-section navigation must not scroll the document back to the page header');
