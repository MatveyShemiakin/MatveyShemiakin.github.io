(function(){
  const METRIKA_ID=111504350;
  const CONSENT_KEY='site_cookie_choice';
  const SCRIPT_SRC='https://mc.yandex.ru/metrika/tag.js?id=111504350';
  const READ_GOALS=[
    {percent:25,id:'read_25'},
    {percent:50,id:'read_50'},
    {percent:75,id:'read_75'},
    {percent:90,id:'read_90'}
  ];

  let trackingBound=false;
  let readingFramePending=false;
  const reachedReadGoals=new Set();

  function hasAnalyticsConsent(){
    try{return window.localStorage.getItem(CONSENT_KEY)==='analytics'}catch(_){return false}
  }

  function sendGoal(target){
    if(!hasAnalyticsConsent()||typeof window.ym!=='function')return false;
    window.ym(METRIKA_ID,'reachGoal',target);
    return true;
  }

  function initSiteAnalytics(){
    if(window.__siteAnalyticsInitialized||!hasAnalyticsConsent())return;
    window.__siteAnalyticsInitialized=true;

    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for(let j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r)return}
      k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
    })(window,document,'script',SCRIPT_SRC,'ym');

    window.ym(METRIKA_ID,'init',{
      ssr:true,
      webvisor:true,
      clickmap:true,
      ecommerce:'dataLayer',
      referrer:document.referrer,
      url:window.location&&window.location.href,
      accurateTrackBounce:true,
      trackLinks:true
    });
  }

  function safeUrl(link){
    try{return new URL(link.href,window.location.href)}catch(_){return null}
  }

  function isTelegramLink(link){
    const url=safeUrl(link);
    if(!url)return false;
    const host=url.hostname.toLowerCase();
    return host==='t.me'||host==='telegram.me'||host.endsWith('.telegram.me');
  }

  function isProDoctorovLink(link){
    const url=safeUrl(link);
    if(!url)return false;
    const host=url.hostname.toLowerCase();
    return host==='prodoctorov.ru'||host.endsWith('.prodoctorov.ru');
  }

  function isCtaLink(link){
    if(typeof link.matches==='function'&&link.matches('[data-analytics-cta], .button.primary, .cta, .cta-button, .contact-button'))return true;
    const label=(link.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return /запис|консультац|написать лично|write personally|book appointment|make an appointment/.test(label);
  }

  function handleDocumentClick(event){
    const target=event.target;
    if(!target||typeof target.closest!=='function')return;

    const summary=target.closest('summary');
    if(summary){
      const details=typeof summary.closest==='function'?summary.closest('details'):summary.parentElement;
      window.setTimeout(function(){
        if(details&&details.open)sendGoal('faq_open');
      },0);
    }

    const link=target.closest('a');
    if(!link)return;
    if(isTelegramLink(link))sendGoal('telegram_click');
    if(isProDoctorovLink(link))sendGoal('prodoctorov_click');
    if(isCtaLink(link))sendGoal('cta_click');
  }

  function handleSearchInput(event){
    const target=event.target;
    if(!target||typeof target.matches!=='function'||!target.matches('input[type="search"]'))return;
    if(!String(target.value||'').trim()||target.dataset.analyticsSearchTracked==='1')return;
    if(sendGoal('search_use'))target.dataset.analyticsSearchTracked='1';
  }

  function readingPercent(){
    const material=document.getElementById('content-material')||document.querySelector('main');
    if(!material||typeof material.getBoundingClientRect!=='function')return 0;
    const rect=material.getBoundingClientRect();
    const scrollY=window.scrollY||window.pageYOffset||0;
    const viewportHeight=window.innerHeight||document.documentElement.clientHeight||0;
    const height=Math.max(rect.height||material.offsetHeight||0,1);
    const materialTop=rect.top+scrollY;
    const viewportBottom=scrollY+viewportHeight;
    return Math.max(0,Math.min(100,((viewportBottom-materialTop)/height)*100));
  }

  function trackReadingProgress(){
    const percent=readingPercent();
    for(const goal of READ_GOALS){
      if(percent>=goal.percent&&!reachedReadGoals.has(goal.id)&&sendGoal(goal.id)){
        reachedReadGoals.add(goal.id);
      }
    }
  }

  function scheduleReadingProgress(){
    if(readingFramePending)return;
    readingFramePending=true;
    const raf=window.requestAnimationFrame||function(fn){return window.setTimeout(fn,0)};
    raf(function(){
      readingFramePending=false;
      trackReadingProgress();
    });
  }

  function bindInteractionTracking(){
    if(trackingBound)return;
    trackingBound=true;
    document.addEventListener('click',handleDocumentClick);
    document.addEventListener('input',handleSearchInput);
    window.addEventListener('scroll',scheduleReadingProgress,{passive:true});
    window.addEventListener('resize',scheduleReadingProgress);
    scheduleReadingProgress();
  }

  function handleAnalyticsConsent(){
    initSiteAnalytics();
    scheduleReadingProgress();
  }

  window.initSiteAnalytics=initSiteAnalytics;
  window.addEventListener('site:analytics-consent',handleAnalyticsConsent);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindInteractionTracking);
  else bindInteractionTracking();
  if(hasAnalyticsConsent())initSiteAnalytics();
})();
