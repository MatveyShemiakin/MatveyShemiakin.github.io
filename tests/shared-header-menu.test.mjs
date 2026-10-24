import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const source=fs.readFileSync('site-mega-nav.js','utf8');
 const document={events:{},activeElement:null,addEventListener(name,fn){this.events[name]=fn}};
 const groups=[0,1].map(()=>{
  const classes=new Set();
  const group={events:{},classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains(k){return classes.has(k)}},addEventListener(name,fn){this.events[name]=fn},contains(el){return el===this.toggle||el===this.link},querySelector(){return this.toggle}};
  group.toggle={attrs:{},setAttribute(k,v){this.attrs[k]=v},closest(selector){return selector==='.site-mega-nav__toggle'?this:selector==='.site-mega-nav__group'?group:null},focus(){document.activeElement=this;nav.events.focusin({target:this})}};
  group.link={closest(selector){return selector==='.site-mega-nav__group'?group:null},focus(){document.activeElement=this;nav.events.focusin({target:this})}};
  return group;
 });
 const nav={events:{},addEventListener(name,fn){this.events[name]=fn},querySelectorAll(){return groups},querySelector(){return groups.find(g=>g.toggle.attrs['aria-expanded']==='true')?.toggle},contains(el){return groups.some(g=>g.contains(el))}};
 const sandbox={document,window:{setTimeout(fn){fn()}}};
 vm.runInNewContext(source.slice(source.indexOf('  function setOpen('),source.indexOf('  function mount('))+'\nthis.bindMenu=bind;',sandbox);
 sandbox.bindMenu(nav);return {groups,nav,document};
}
test('focusing the toggle before clicking does not immediately close the menu',()=>{
 const f=fixture(),g=f.groups[0];g.toggle.focus();f.nav.events.click({target:g.toggle});assert.equal(g.toggle.attrs['aria-expanded'],'true');
});
test('Escape closes the menu without reopening it when focus returns to its toggle',()=>{
 const f=fixture(),g=f.groups[0];g.link.focus();f.document.events.keydown({key:'Escape'});assert.equal(g.toggle.attrs['aria-expanded'],'false');
});
test('outside click closes the open group and a new group closes its predecessor',()=>{
 const f=fixture();f.groups[0].link.focus();f.groups[1].link.focus();assert.equal(f.groups[0].toggle.attrs['aria-expanded'],'false');f.document.events.click({target:{}});assert.equal(f.groups[1].toggle.attrs['aria-expanded'],'false');
});
