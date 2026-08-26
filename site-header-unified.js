(function(rootFactory){
  const api=rootFactory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window==='undefined'||typeof document==='undefined')return;
  const run=()=>api.normalizeHeader(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})(function(){
  'use strict';

  function normalizePath(value){
    const raw=(value||'/').split('?')[0].split('#')[0].replace(/\/{2,}/g,'/');
    if(raw==='/')return '/';
    return raw.endsWith('/')?raw:raw+'/';
  }

  function pageContext(path,lang){
    const normalized=normalizePath(path);
    const bare=normalized.startsWith('/en/')?normalized.slice(3):normalized;
    let section='other';
    if(bare==='/')section='main';
    else if(bare.startsWith('/patients/'))section='patients';
    else if(bare.startsWith('/for-doctors/'))section='doctors';
    else if(bare.startsWith('/collaboration/'))section='collaboration';
    return {path:normalized,lang:(lang||'ru').toLowerCase().startsWith('en')?'en':'ru',section};
  }

  function languageRoutes(path){
    const normalized=normalizePath(path);
    if(normalized==='/')return {ru:'/',en:'/en/'};
    if(normalized==='/en/')return {ru:'/',en:'/en/'};
    if(normalized.startsWith('/en/'))return {ru:normalized.slice(3)||'/',en:normalized};
    return {ru:normalized,en:'/en'+normalized};
  }

  function escapeAttr(value){
    return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  }

  function headerMarkup(options){
    const opts=options||{};
    const context=pageContext(opts.path||'/',opts.lang||'ru');
    const routes=languageRoutes(context.path);
    const en=context.lang==='en';
    const brand=en?'MS':'МШ';
    const home=en?'/en/':'/';
    const homeLabel=en?'Home':'На главную';
    const languageLabel=en?'Site language':'Язык сайта';
    const ruLabel=en?'Russian version':'Русская версия';
    const enLabel=en?'English version':'Английская версия';
    const themeLabel=en?'Switch color theme':'Переключить цветовую гамму';
    let contextMarkup='';
    if(opts.hasPatientBell)contextMarkup='<div class="unified-site-header__context" data-unified-context="patient-updates"></div>';
    else if(opts.hasDoctorBell)contextMarkup='<div class="unified-site-header__context" data-unified-context="doctors-updates"></div>';
    else contextMarkup='<div class="unified-site-header__context" data-unified-context="none" hidden></div>';

    return '<header class="unified-site-header" data-unified-site-header="true">'+
      '<div class="container unified-site-header__inner">'+
        '<a class="unified-site-header__brand monogram" href="'+escapeAttr(home)+'" aria-label="'+escapeAttr(homeLabel)+'">'+brand+'</a>'+
        '<div class="unified-site-header__nav-mount" data-unified-nav-mount="true"></div>'+
        contextMarkup+
        '<div class="unified-site-header__controls">'+
          '<nav class="unified-site-header__language" aria-label="'+escapeAttr(languageLabel)+'">'+
            '<a href="'+escapeAttr(routes.ru)+'" lang="ru" hreflang="ru" aria-label="'+escapeAttr(ruLabel)+'"'+(context.lang==='ru'?' aria-current="page" class="is-active"':'')+'>RU</a>'+
            '<a href="'+escapeAttr(routes.en)+'" lang="en" hreflang="en" aria-label="'+escapeAttr(enLabel)+'"'+(context.lang==='en'?' aria-current="page" class="is-active"':'')+'>EN</a>'+
          '</nav>'+
          '<button class="unified-site-header__theme" type="button" data-unified-theme-toggle aria-label="'+escapeAttr(themeLabel)+'" title="'+escapeAttr(themeLabel)+'"><span aria-hidden="true">◐</span></button>'+
        '</div>'+
      '</div>'+
    '</header>';
  }

  function findLegacyHeader(doc){
    return doc.querySelector('body > header')||doc.querySelector('.site-header,.patient-header,.doctors-header,.site-head');
  }

  function detachFirst(doc,selectors){
    for(const selector of selectors){
      const node=doc.querySelector(selector);
      if(node){node.remove();return node;}
    }
    return null;
  }

  function bindFallbackTheme(button,doc,win){
    if(!button)return;
    button.addEventListener('click',function(){
      const html=doc.documentElement;
      const current=html.dataset.siteTheme||html.dataset.theme||'light';
      const next=current==='dark'?'light':'dark';
      html.dataset.siteTheme=next;
      html.dataset.theme=next;
      try{win.localStorage.setItem('site_theme_v1',next);}catch(_){ }
      try{win.dispatchEvent(new win.CustomEvent('site-theme-change',{detail:{theme:next}}));}catch(_){ }
    });
  }

  function normalizeHeader(doc,win){
    if(!doc||!win)return null;
    const existingCanonical=doc.querySelector('[data-unified-site-header="true"]');
    if(existingCanonical)return existingCanonical;

    const lang=(doc.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
    const path=win.location&&win.location.pathname?win.location.pathname:'/';
    const oldHeader=findLegacyHeader(doc);

    const mega=detachFirst(doc,['.site-mega-nav']);
    const patientBell=detachFirst(doc,['#patient-updates','.patient-updates']);
    const doctorBell=detachFirst(doc,['#doctors-updates','.doctors-updates']);
    const language=detachFirst(doc,['.site-language-switch']);
    const theme=detachFirst(doc,['.site-theme-toggle[data-site-theme-toggle]','button[data-theme-toggle]','.site-theme-toggle']);

    const template=doc.createElement('template');
    template.innerHTML=headerMarkup({path,lang,hasPatientBell:!!patientBell,hasDoctorBell:!!doctorBell}).trim();
    const header=template.content.firstElementChild;
    if(!header)return null;

    const mount=header.querySelector('.unified-site-header__nav-mount');
    if(mega&&mount)mount.appendChild(mega);

    const contextSlot=header.querySelector('.unified-site-header__context');
    const contextual=patientBell||doctorBell;
    if(contextual&&contextSlot){contextSlot.replaceWith(contextual);contextual.classList.add('unified-site-header__context-control');}

    const controls=header.querySelector('.unified-site-header__controls');
    const fallbackLanguage=header.querySelector('.unified-site-header__language');
    if(language&&controls){fallbackLanguage&&fallbackLanguage.remove();controls.insertBefore(language,controls.firstChild);}

    const fallbackTheme=header.querySelector('[data-unified-theme-toggle]');
    if(theme&&controls){fallbackTheme&&fallbackTheme.remove();controls.appendChild(theme);}
    else bindFallbackTheme(fallbackTheme,doc,win);

    if(oldHeader&&oldHeader.parentNode)oldHeader.replaceWith(header);
    else doc.body.insertBefore(header,doc.body.firstChild);

    doc.documentElement.classList.add('unified-site-header-ready');
    return header;
  }

  return {normalizePath,pageContext,languageRoutes,headerMarkup,normalizeHeader};
});
