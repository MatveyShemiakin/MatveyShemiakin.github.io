(function(){
  'use strict';

  var root=document.documentElement;
  var storageKey='site_theme_v1';
  var legacyKeys=['site_theme','site-theme','iol_dislocation_theme','skp-theme','pkp_theme'];
  var isEnglish=(root.lang||'ru').toLowerCase().indexOf('en')===0;
  var media=null;
  var toggle=null;

  var labels=isEnglish?{
    dark:'Switch to dark theme',
    light:'Switch to light theme',
    titleDark:'Dark theme',
    titleLight:'Light theme'
  }:{
    dark:'Включить тёмную тему',
    light:'Включить светлую тему',
    titleDark:'Тёмная тема',
    titleLight:'Светлая тема'
  };

  function normaliseTheme(value){
    return value==='dark'?'dark':'light';
  }

  function readStoredTheme(){
    try{
      var value=localStorage.getItem(storageKey);
      return value==='light'||value==='dark'?value:null;
    }catch(error){
      return null;
    }
  }

  function mirrorLegacyTheme(theme){
    try{
      legacyKeys.forEach(function(key){localStorage.setItem(key,theme);});
    }catch(error){ }
  }

  function updateThemeMeta(theme){
    var meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement('meta');
      meta.name='theme-color';
      document.head.appendChild(meta);
    }
    meta.content=theme==='dark'?'#041225':'#f4f1eb';
  }

  function updatePageBridges(theme){
    var dark=theme==='dark';
    document.querySelectorAll('.sim-page').forEach(function(page){
      page.classList.toggle('theme-dark',dark);
      page.classList.toggle('theme-light',!dark);
    });

    var mobileNav=document.querySelector('.site-mobile-nav');
    var mobileSearch=document.querySelector('.site-mobile-search');
    if(mobileNav)mobileNav.dataset.theme=theme;
    if(mobileSearch)mobileSearch.dataset.theme=theme;
  }

  function updateToggle(theme){
    if(!toggle)return;
    var dark=theme==='dark';
    toggle.setAttribute('aria-label',dark?labels.light:labels.dark);
    toggle.setAttribute('title',dark?labels.titleLight:labels.titleDark);
    toggle.setAttribute('aria-pressed',String(dark));
    toggle.dataset.theme=theme;
  }

  function applyTheme(value,options){
    var theme=normaliseTheme(value);
    var settings=options||{};
    var previous=root.dataset.siteTheme;

    root.dataset.siteTheme=theme;
    root.dataset.theme=theme;
    updateThemeMeta(theme);
    updatePageBridges(theme);
    updateToggle(theme);

    if(settings.persist){
      try{localStorage.setItem(storageKey,theme);}catch(error){ }
      mirrorLegacyTheme(theme);
    }

    if(previous!==theme||settings.forceEvent){
      window.dispatchEvent(new CustomEvent('site-theme-change',{detail:{theme:theme}}));
    }
  }

  function iconMarkup(){
    return '<svg class="site-theme-toggle__icon site-theme-toggle__icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg><svg class="site-theme-toggle__icon site-theme-toggle__icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.5A8.2 8.2 0 0 1 8.5 3.8 8.3 8.3 0 1 0 20.2 15.5Z"></path></svg>';
  }

  function removeLegacyToggles(){
    var selectors=[
      '[data-theme-toggle]',
      'button[data-site-theme]',
      'button.theme-toggle',
      'button.site-theme-toggle:not([data-site-theme-toggle])'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(element){
      element.remove();
    });
  }

  function findHost(){
    var languageSwitch=document.querySelector('.site-language-switch');
    if(languageSwitch&&languageSwitch.parentElement)return {host:languageSwitch.parentElement,after:languageSwitch};

    var selectors=[
      '.nav-right',
      '.patient-header .header-row',
      '.site-head .nav',
      '.doctors-nav-actions',
      '.terms-nav',
      '.site-header .header-actions',
      '.site-header .nav',
      '.site-header .header-inner',
      'header .container',
      '.site-language-utility'
    ];

    for(var i=0;i<selectors.length;i+=1){
      var host=document.querySelector(selectors[i]);
      if(host)return {host:host,after:null};
    }

    var shell=document.querySelector('.privacy-shell,.terms-main,.professional-use-shell,main');
    if(shell){
      var utility=document.createElement('div');
      utility.className='site-theme-utility';
      shell.insertBefore(utility,shell.firstChild);
      return {host:utility,after:null};
    }

    return {host:document.body,after:null};
  }

  function mountToggle(){
    removeLegacyToggles();

    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='site-theme-toggle';
    toggle.dataset.siteThemeToggle='';
    toggle.innerHTML=iconMarkup();

    var placement=findHost();
    if(placement.after&&placement.after.parentElement===placement.host){
      placement.after.insertAdjacentElement('afterend',toggle);
    }else{
      placement.host.appendChild(toggle);
    }

    toggle.addEventListener('click',function(){
      applyTheme(root.dataset.siteTheme==='dark'?'light':'dark',{persist:true});
    });
    updateToggle(normaliseTheme(root.dataset.siteTheme));
  }

  function init(){
    if(root.dataset.siteThemeReady==='true')return;
    root.dataset.siteThemeReady='true';

    if(root.dataset.siteThemeFamily==='bacterial')document.body.classList.add('bacterial-clinical-page');

    mountToggle();
    applyTheme(root.dataset.siteTheme||window.__siteThemeInitial||'light',{persist:false,forceEvent:true});

    window.addEventListener('storage',function(event){
      if(event.key!==storageKey)return;
      if(event.newValue==='light'||event.newValue==='dark')applyTheme(event.newValue,{persist:false});
    });

    if(window.matchMedia){
      media=window.matchMedia('(prefers-color-scheme: dark)');
      var onSystemChange=function(event){
        if(readStoredTheme())return;
        applyTheme(event.matches?'dark':'light',{persist:false});
      };
      if(media.addEventListener)media.addEventListener('change',onSystemChange);
      else if(media.addListener)media.addListener(onSystemChange);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();