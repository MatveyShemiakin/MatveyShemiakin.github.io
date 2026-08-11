(function(){
  const METRIKA_ID=111504350;
  const CONSENT_KEY='site_cookie_choice';
  const SCRIPT_SRC='https://mc.yandex.ru/metrika/tag.js?id=111504350';

  function hasAnalyticsConsent(){
    try{return window.localStorage.getItem(CONSENT_KEY)==='analytics'}catch(_){return false}
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

  window.initSiteAnalytics=initSiteAnalytics;
  window.addEventListener('site:analytics-consent',initSiteAnalytics);
  if(hasAnalyticsConsent())initSiteAnalytics();
})();
