(function(){
  'use strict';

  var root=document.documentElement;
  var path=(window.location.pathname||'/').replace(/\/{2,}/g,'/');
  var storageKey='site_theme_v1';
  var legacyKeys=['site_theme','site-theme','iol_dislocation_theme','skp-theme','pkp_theme','theme','color-theme'];
  var stored=null;

  try{
    stored=localStorage.getItem(storageKey);
    if(stored!=='light'&&stored!=='dark'){
      stored=null;
      for(var i=0;i<legacyKeys.length;i+=1){
        var legacyValue=localStorage.getItem(legacyKeys[i]);
        if(legacyValue==='light'||legacyValue==='dark'){
          stored=legacyValue;
          localStorage.setItem(storageKey,stored);
          break;
        }
      }
    }
  }catch(error){
    stored=null;
  }

  var systemDark=false;
  try{
    systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  }catch(error){
    systemDark=false;
  }

  var theme=stored||(systemDark?'dark':'light');
  var family='generic';

  if(path==='/'||path==='/en/'||path==='/en')family='home';
  else if(/\/(?:en\/)?patients\/iol-dislocation\/?$/.test(path))family='iol';
  else if(/\/(?:en\/)?patients\//.test(path))family='patients';
  else if(/\/for-doctors\/bacterial-keratitis\/?$/.test(path))family='bacterial';
  else if(/\/(?:en\/)?for-doctors\/penetrating-keratoplasty\/?$/.test(path))family='pkp';
  else if(/\/(?:en\/)?for-doctors\/professional-use\.html$/.test(path))family='terms';
  else if(/\/(?:en\/)?for-doctors\/?$/.test(path))family='doctors';
  else if(/\/(?:en\/)?privacy\.html$/.test(path))family='privacy';

  root.dataset.siteTheme=theme;
  root.dataset.theme=theme;
  root.dataset.siteThemeFamily=family;

  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',theme==='dark'?'#041225':'#f4f1eb');

  window.__siteThemeInitial=theme;
})();