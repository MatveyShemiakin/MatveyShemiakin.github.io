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

  function installOphthalmologyEventsPatch(){
    if(!/\/for-doctors\/events\/?$/.test(window.location.pathname)||typeof window.fetch!=='function'||window.__ophEventsPatchInstalled)return;
    window.__ophEventsPatchInstalled=true;
    const originalFetch=window.fetch.bind(window);
    const verified='2026-08-20';
    const ru=[
      {
        id:'ciob-2026',featured:false,level:'regional',title:'CIOB 2026',fullTitle:'Cumbre de Innovación Oftalmológica del Biobío 2026',org:'CIOB',start:'2026-10-02',end:'2026-10-03',city:'Консепсьон',country:'Чили',region:'Латинская Америка',mode:'Очно',venue:'Centro de Eventos Mitrinco, Concepción',categories:['Катаракта / ИОЛ','Роговица','Retina','Глаукома','Research','AI / управление'],credits:'CME/НМО: уточняется организатором',submissionOpen:false,official:'https://www.ciob.cl/',program:'https://www.ciob.cl/',registration:'https://www.ciob.cl/',submit:null,verified,description:'Региональная встреча по инновациям в офтальмологии в регионе Био-Био, Чили.',deadlines:[]
      },
      {
        id:'bolivia-ophthalmology-2026',featured:true,level:'national',title:'XXXI Congreso Boliviano de Oftalmología 2026',fullTitle:'XXXI Congreso Boliviano de Oftalmología “Dra. Rosario García”',org:'Sociedad Boliviana de Oftalmología',start:'2026-10-22',end:'2026-10-24',city:'Санта-Крус-де-ла-Сьерра',country:'Боливия',region:'Латинская Америка',mode:'Очно',venue:'Hotel Los Tajibos, Santa Cruz',categories:['Катаракта / ИОЛ','Роговица','Retina','Глаукома','Детская офтальмология','Страбизм','Research'],credits:'CME/НМО: уточняется организатором',submissionOpen:true,official:'https://cboftalmologia2026.com/',program:'https://cboftalmologia2026.com/',registration:'https://cboftalmologia2026.com/',submit:'https://cboftalmologia2026.com/trabajos.html',verified,description:'Главный национальный офтальмологический конгресс Боливии. Приём научных работ открыт до 30 августа 2026 года, 23:00 по местному времени.',deadlines:[{kind:'abstract',label:'Подача научных работ',date:'2026-08-30T23:00:00-04:00',timeKnown:true,zone:'BOT',url:'https://cboftalmologia2026.com/trabajos.html',note:'Официальный срок: 30 августа 2026, 23:00 по местному времени.'}]
      },
      {
        id:'sprv-gladaof-2026',featured:true,level:'specialty',title:'SPRV 2026 · GLADAOF',fullTitle:'11º Congreso de la Sociedad Panamericana de Retina y Vitreo & 20º Foro del GLADAOF',org:'Sociedad Panamericana de Retina y Vítreo / GLADAOF',start:'2026-10-29',end:'2026-11-01',city:'Сан-Паулу',country:'Бразилия',region:'Латинская Америка',mode:'Очно',venue:'Grand Hyatt, São Paulo',categories:['Retina','Research'],credits:'CME/НМО: уточняется организатором',submissionOpen:false,official:'https://sprv2026.com/',program:'https://sprv2026.com/',registration:'https://sprv2026.com/',submit:null,verified,description:'Панамериканский специализированный конгресс по заболеваниям сетчатки и стекловидного тела совместно с 20-м форумом GLADAOF.',deadlines:[]
      },
      {
        id:'bascom-palmer-curso-2026',featured:true,level:'education',title:'Bascom Palmer CURSO 2026',fullTitle:'XLVIII Bascom Palmer InterAmerican Course in Clinical Ophthalmology 2026',org:'Bascom Palmer Eye Institute',start:'2026-11-01',end:'2026-11-04',city:'Майами',country:'США',region:'Северная Америка',mode:'Очно',venue:'Hyatt Regency Miami Downtown',categories:['Катаракта / ИОЛ','Рефракция','Роговица','Retina','Глаукома','Воспаление','Детская офтальмология','Страбизм','Нейроофтальмология','Окулопластика'],credits:'CME: образовательный курс Bascom Palmer; детали у организатора',submissionOpen:false,official:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',program:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',registration:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',submit:null,verified,description:'48-й Межамериканский курс Bascom Palmer по клинической офтальмологии с практическим разбором актуальных клинических задач по основным субспециальностям.',deadlines:[]
      },
      {
        id:'isa-2026',featured:true,level:'specialty',title:'XVI ISA Meeting',fullTitle:'XVI International Strabismological Association Meeting',org:'International Strabismological Association',start:'2026-11-11',end:'2026-11-14',city:'Буэнос-Айрес',country:'Аргентина',region:'Латинская Америка',mode:'Очно',venue:'Auditorios UCA – Edificio San José',categories:['Страбизм','Детская офтальмология','Research'],credits:'Сертификаты участия и научного участия предусмотрены организатором',submissionOpen:false,official:'https://isa2026.com.ar/',program:'https://isa2026.com.ar/programme-overview/',registration:'https://isa2026.com.ar/registration/',submit:null,verified,description:'16-я международная встреча ISA по страбизму, глазодвигательным нарушениям, бинокулярному зрению и амблиопии. Регистрация открыта.',deadlines:[]
      },
      {
        id:'aacgc-2027',featured:false,level:'specialty',title:'AACGC 2027 · Indonesian National Glaucoma Meeting',fullTitle:'18th Asian Angle-Closure Glaucoma Club Meeting in Conjunction With the 11th Indonesian National Glaucoma Meeting',org:'Asian Angle-Closure Glaucoma Club / Indonesian National Glaucoma Meeting',start:'2027-10-15',end:'2027-10-16',city:'Джакарта',country:'Индонезия',region:'Азия–Тихоокеанский',mode:'Очно',venue:'Jakarta, Indonesia',categories:['Глаукома','Research'],credits:'CME/НМО: уточняется организатором',submissionOpen:false,official:'https://apaophth.org/congress/calendar/',program:'https://apaophth.org/congress/calendar/',registration:'https://apaophth.org/congress/calendar/',submit:null,verified,description:'18-я встреча Asian Angle-Closure Glaucoma Club совместно с 11-й национальной встречей по глаукоме Индонезии.',deadlines:[]
      }
    ];
    const en=[
      {id:'ciob-2026',featured:false,level:'regional',title:'CIOB 2026',fullTitle:'Cumbre de Innovación Oftalmológica del Biobío 2026',org:'CIOB',start:'2026-10-02',end:'2026-10-03',city:'Concepción',country:'Chile',region:'Latin America',mode:'In person',venue:'Centro de Eventos Mitrinco, Concepción',categories:['Cataract / IOL','Cornea','Retina','Glaucoma','Research','AI / management'],credits:'CME/CPD: check with organiser',submissionOpen:false,official:'https://www.ciob.cl/',program:'https://www.ciob.cl/',registration:'https://www.ciob.cl/',submit:null,verified,description:'Regional ophthalmic innovation meeting in the Biobío region of Chile.',deadlines:[]},
      {id:'bolivia-ophthalmology-2026',featured:true,level:'national',title:'XXXI Bolivian Congress of Ophthalmology 2026',fullTitle:'XXXI Congreso Boliviano de Oftalmología “Dra. Rosario García”',org:'Sociedad Boliviana de Oftalmología',start:'2026-10-22',end:'2026-10-24',city:'Santa Cruz de la Sierra',country:'Bolivia',region:'Latin America',mode:'In person',venue:'Hotel Los Tajibos, Santa Cruz',categories:['Cataract / IOL','Cornea','Retina','Glaucoma','Paediatric ophthalmology','Strabismus','Research'],credits:'CME/CPD: check with organiser',submissionOpen:true,official:'https://cboftalmologia2026.com/',program:'https://cboftalmologia2026.com/',registration:'https://cboftalmologia2026.com/',submit:'https://cboftalmologia2026.com/trabajos.html',verified,description:'Bolivia’s main national ophthalmology congress. Scientific submissions remain open until 30 August 2026 at 23:00 local time.',deadlines:[{kind:'abstract',label:'Scientific work submission',date:'2026-08-30T23:00:00-04:00',timeKnown:true,zone:'BOT',url:'https://cboftalmologia2026.com/trabajos.html',note:'Official deadline: 30 August 2026, 23:00 local time.'}]},
      {id:'sprv-gladaof-2026',featured:true,level:'specialty',title:'SPRV 2026 · GLADAOF',fullTitle:'11th Congress of the Pan-American Society of Retina and Vitreous & 20th GLADAOF Forum',org:'Pan-American Society of Retina and Vitreous / GLADAOF',start:'2026-10-29',end:'2026-11-01',city:'São Paulo',country:'Brazil',region:'Latin America',mode:'In person',venue:'Grand Hyatt, São Paulo',categories:['Retina','Research'],credits:'CME/CPD: check with organiser',submissionOpen:false,official:'https://sprv2026.com/',program:'https://sprv2026.com/',registration:'https://sprv2026.com/',submit:null,verified,description:'Pan-American subspecialty congress focused on retina and vitreous, held together with the 20th GLADAOF Forum.',deadlines:[]},
      {id:'bascom-palmer-curso-2026',featured:true,level:'education',title:'Bascom Palmer CURSO 2026',fullTitle:'XLVIII Bascom Palmer InterAmerican Course in Clinical Ophthalmology 2026',org:'Bascom Palmer Eye Institute',start:'2026-11-01',end:'2026-11-04',city:'Miami',country:'USA',region:'North America',mode:'In person',venue:'Hyatt Regency Miami Downtown',categories:['Cataract / IOL','Refractive','Cornea','Retina','Glaucoma','Inflammation','Paediatric ophthalmology','Strabismus','Neuro-ophthalmology','Oculoplastics'],credits:'CME: Bascom Palmer educational course; check organiser details',submissionOpen:false,official:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',program:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',registration:'https://umiamihealth.org/bascom-palmer-eye-institute/healthcare-professionals/continuing-medical-education/xlviii-inter-american-course-in-clinical-ophthalmology',submit:null,verified,description:'The 48th Bascom Palmer InterAmerican Course in Clinical Ophthalmology, focused on practical approaches to current clinical problems across ophthalmic subspecialties.',deadlines:[]},
      {id:'isa-2026',featured:true,level:'specialty',title:'XVI ISA Meeting',fullTitle:'XVI International Strabismological Association Meeting',org:'International Strabismological Association',start:'2026-11-11',end:'2026-11-14',city:'Buenos Aires',country:'Argentina',region:'Latin America',mode:'In person',venue:'Auditorios UCA – Edificio San José',categories:['Strabismus','Paediatric ophthalmology','Research'],credits:'Attendance and scientific participation certificates are provided by the organiser',submissionOpen:false,official:'https://isa2026.com.ar/',program:'https://isa2026.com.ar/programme-overview/',registration:'https://isa2026.com.ar/registration/',submit:null,verified,description:'The 16th ISA meeting covering strabismus, ocular motility, binocular vision and amblyopia. Registration is open.',deadlines:[]},
      {id:'aacgc-2027',featured:false,level:'specialty',title:'AACGC 2027 · Indonesian National Glaucoma Meeting',fullTitle:'18th Asian Angle-Closure Glaucoma Club Meeting in Conjunction With the 11th Indonesian National Glaucoma Meeting',org:'Asian Angle-Closure Glaucoma Club / Indonesian National Glaucoma Meeting',start:'2027-10-15',end:'2027-10-16',city:'Jakarta',country:'Indonesia',region:'Asia–Pacific',mode:'In person',venue:'Jakarta, Indonesia',categories:['Glaucoma','Research'],credits:'CME/CPD: check with organiser',submissionOpen:false,official:'https://apaophth.org/congress/calendar/',program:'https://apaophth.org/congress/calendar/',registration:'https://apaophth.org/congress/calendar/',submit:null,verified,description:'18th Asian Angle-Closure Glaucoma Club Meeting held jointly with the 11th Indonesian National Glaucoma Meeting.',deadlines:[]}
    ];
    window.fetch=async function(input,init){
      const response=await originalFetch(input,init);
      let url='';
      try{url=typeof input==='string'?input:(input&&input.url)||''}catch(_){url=''}
      if(!/ophthalmology-events\.(ru|en)\.json(?:[?#].*)?$/.test(url)||!response.ok)return response;
      try{
        const data=await response.clone().json();
        const patch=/\.en\.json/.test(url)?en:ru;
        const existing=new Set((data.events||[]).map(e=>e.id));
        data.events=[...(data.events||[]),...patch.filter(e=>!existing.has(e.id))];
        data.verifiedAt=verified;
        data.generatedAt='2026-08-20T08:34:00+03:00';
        return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json; charset=utf-8'}});
      }catch(_){return response}
    };
  }

  installOphthalmologyEventsPatch();

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
