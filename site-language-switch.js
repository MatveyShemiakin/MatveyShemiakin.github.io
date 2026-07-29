(function(){
  'use strict';

  function normalisePath(value){
    try{
      const url=new URL(value,window.location.origin);
      return url.pathname+url.search+url.hash;
    }catch(error){
      return value;
    }
  }

  function alternateUrl(targetLanguage){
    const alternate=document.querySelector(`link[rel~="alternate"][hreflang="${targetLanguage}"]`);
    if(alternate&&alternate.href)return normalisePath(alternate.href);

    const path=window.location.pathname.replace(/\/{2,}/g,'/');
    if(targetLanguage==='ru'){
      if(path==='/en/'||path==='/en')return '/';
      return path.startsWith('/en/')?path.slice(3):path;
    }

    if(path==='/for-doctors/bacterial-keratitis/'||path==='/for-doctors/bacterial-keratitis'){
      return '/en/for-doctors/';
    }
    if(path==='/')return '/en/';
    return path.startsWith('/en/')?path:`/en${path}`;
  }

  function createSwitch(){
    const currentLanguage=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
    const nav=document.createElement('nav');
    nav.className='site-language-switch';
    nav.setAttribute('aria-label',currentLanguage==='en'?'Website language':'Язык сайта');

    const ru=document.createElement('a');
    ru.className='site-language-switch__link';
    ru.href=alternateUrl('ru');
    ru.lang='ru';
    ru.hreflang='ru';
    ru.textContent='RU';
    ru.setAttribute('aria-label',currentLanguage==='en'?'Russian version':'Русская версия');

    const en=document.createElement('a');
    en.className='site-language-switch__link';
    en.href=alternateUrl('en');
    en.lang='en';
    en.hreflang='en';
    en.textContent='EN';
    en.setAttribute('aria-label',currentLanguage==='en'?'English version':'Английская версия');

    const active=currentLanguage==='en'?en:ru;
    active.classList.add('is-active');
    active.setAttribute('aria-current','page');
    nav.append(ru,en);
    return nav;
  }

  function findHeaderHost(){
    const selectors=[
      '.nav-right',
      '.patient-header .header-row',
      '.site-head .nav',
      '.doctors-nav-actions',
      '.site-header .header-actions',
      '.site-header .nav',
      '.site-header .header-inner',
      'header .container'
    ];
    for(const selector of selectors){
      const element=document.querySelector(selector);
      if(element)return element;
    }
    return null;
  }

  function initLanguageSwitch(){
    if(document.documentElement.dataset.siteLanguageSwitch==='ready')return;
    document.documentElement.dataset.siteLanguageSwitch='ready';

    const existing=[...document.querySelectorAll('.site-language-switch,.language-switch,.patient-language-switch,.doctors-language')];
    const first=existing[0]||null;
    const parent=first&&first.parentElement;
    const next=first&&first.nextSibling;
    existing.forEach(element=>element.remove());

    const languageSwitch=createSwitch();
    if(parent){
      parent.insertBefore(languageSwitch,next&&next.parentNode===parent?next:null);
      return;
    }

    const host=findHeaderHost();
    if(host){
      host.appendChild(languageSwitch);
      return;
    }

    const shell=document.querySelector('.privacy-shell,.professional-use-shell,.legal-shell,main');
    if(shell){
      const row=document.createElement('div');
      row.className='site-language-utility';
      row.appendChild(languageSwitch);
      shell.insertBefore(row,shell.firstChild);
      return;
    }

    const row=document.createElement('div');
    row.className='site-language-utility';
    row.appendChild(languageSwitch);
    document.body.insertBefore(row,document.body.firstChild);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initLanguageSwitch,{once:true});
  }else{
    initLanguageSwitch();
  }
})();
