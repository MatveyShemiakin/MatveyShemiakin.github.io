(function(){
  const lang=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const cleanPath=window.location.pathname.replace(/\/{2,}/g,'/').replace(/\/+$/,'');
  const path=cleanPath?cleanPath+'/':'/';
  const text=lang==='en'?{
    navLabel:'Main mobile navigation',patients:'Patients',doctors:'Doctors',search:'Search',about:'About',
    searchKicker:'Website search',searchTitle:'Find a topic',searchPlaceholder:'Enter a condition or topic',searchButton:'Search',close:'Close search',
    noResults:'No matching pages were found. Try a shorter or more general query.',popular:'Popular sections',
    patientsNote:'Patient information',doctorsNote:'Professional resources',aboutNote:'About Matvey Shemyakin'
  }:{
    navLabel:'Основная мобильная навигация',patients:'Пациентам',doctors:'Врачам',search:'Поиск',about:'Об авторе',
    searchKicker:'Поиск по сайту',searchTitle:'Найдите нужную тему',searchPlaceholder:'Введите заболевание или тему',searchButton:'Найти',close:'Закрыть поиск',
    noResults:'Подходящих страниц не найдено. Попробуйте сократить или обобщить запрос.',popular:'Популярные разделы',
    patientsNote:'Информация для пациентов',doctorsNote:'Профессиональные материалы',aboutNote:'О Матвее Шемякине'
  };

  const routes=lang==='en'?{
    patients:'/en/patients/',doctors:'/en/for-doctors/',about:'/en/#about'
  }:{
    patients:'/patients/',doctors:'/for-doctors/',about:'/#about'
  };

  const index=lang==='en'?[
    {title:'Patients',note:'Patient information',url:'/en/patients/',keywords:'patients surgery recovery questions cataract'},
    {title:'Intraocular lens dislocation',note:'Symptoms, examination and treatment',url:'/en/patients/iol-dislocation/',keywords:'iol lens dislocation displacement double vision surgery'},
    {title:'Before eye surgery',note:'Preparation and common questions',url:'/en/patients/before-surgery/',keywords:'before surgery preparation food medicines'},
    {title:'Surgery day',note:'What to expect in hospital',url:'/en/patients/surgery-day/',keywords:'operation day hospital pain anaesthesia'},
    {title:'Early recovery',note:'The first days after surgery',url:'/en/patients/recovery/',keywords:'recovery after surgery restrictions warning signs'},
    {title:'Daily life after surgery',note:'Activities and restrictions',url:'/en/patients/daily-life/',keywords:'daily life washing sleep sport work'},
    {title:'Eye drops',note:'How to use prescribed drops',url:'/en/patients/eye-drops/',keywords:'drops medicines instillation schedule'},
    {title:'Glasses and vision',note:'Vision correction after surgery',url:'/en/patients/glasses/',keywords:'glasses refraction vision correction'},
    {title:'For doctors',note:'Professional ophthalmology library',url:'/en/for-doctors/',keywords:'doctors clinical notes ophthalmology'},
    {title:'Follow-up after penetrating keratoplasty',note:'Clinical material for doctors',url:'/en/for-doctors/penetrating-keratoplasty/',keywords:'corneal graft keratoplasty transplant follow up'},
    {title:'About Matvey Shemyakin',note:'Clinical, surgical and research work',url:'/en/#about',keywords:'about doctor ophthalmologist surgeon biography'},
    {title:'Clinical specialties',note:'Main surgical directions',url:'/en/#directions',keywords:'specialties cataract glaucoma cornea retina'},
    {title:'Research and publications',note:'Scientific work',url:'/en/#science',keywords:'science research publications conferences'}
  ]:[
    {title:'Пациентам',note:'Информация для пациентов',url:'/patients/',keywords:'пациентам операция восстановление вопросы катаракта'},
    {title:'Смещение искусственного хрусталика',note:'Симптомы, обследование и лечение',url:'/patients/iol-dislocation/',keywords:'иол дислокация смещение линза двоение операция'},
    {title:'До операции на глазах',note:'Подготовка и частые вопросы',url:'/patients/before-surgery/',keywords:'до операции подготовка еда лекарства'},
    {title:'День операции',note:'Что ожидает пациента в стационаре',url:'/patients/surgery-day/',keywords:'день операции стационар боль анестезия'},
    {title:'Первые дни после операции',note:'Раннее восстановление',url:'/patients/recovery/',keywords:'восстановление после операции ограничения тревожные признаки'},
    {title:'Повседневная жизнь после операции',note:'Режим и ограничения',url:'/patients/daily-life/',keywords:'жизнь умывание сон спорт работа'},
    {title:'Глазные капли',note:'Как применять назначенные препараты',url:'/patients/eye-drops/',keywords:'капли лекарства закапывание схема'},
    {title:'Очки и зрение',note:'Коррекция зрения после операции',url:'/patients/glasses/',keywords:'очки рефракция зрение коррекция'},
    {title:'Для врачей',note:'Профессиональная библиотека по офтальмологии',url:'/for-doctors/',keywords:'врачам клинические конспекты офтальмология'},
    {title:'Бактериальный кератит',note:'Клинический конспект для врачей',url:'/for-doctors/bacterial-keratitis/',keywords:'кератит язва роговица инфекция антибиотики'},
    {title:'Ведение после сквозной кератопластики',note:'Клинический материал для врачей',url:'/for-doctors/penetrating-keratoplasty/',keywords:'роговица трансплантат кератопластика наблюдение'},
    {title:'О Матвее Шемякине',note:'Клиническая, хирургическая и научная работа',url:'/#about',keywords:'об авторе врач офтальмолог хирург биография'},
    {title:'Направления работы',note:'Основные хирургические направления',url:'/#directions',keywords:'направления катаракта глаукома роговица сетчатка'},
    {title:'Наука и публикации',note:'Научная деятельность',url:'/#science',keywords:'наука исследования публикации конференции'}
  ];

  function icon(name){
    const icons={
      patients:'<path d="M8 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M2.5 20.5v-1.2A5.3 5.3 0 0 1 7.8 14h.4a5.3 5.3 0 0 1 5.3 5.3v1.2"></path><path d="M17 8v6M14 11h6"></path>',
      doctors:'<path d="M9 3v4a3 3 0 0 0 6 0V3"></path><path d="M6 3v4a6 6 0 0 0 12 0V3"></path><path d="M12 13v2.5a4.5 4.5 0 0 0 9 0V14"></path><circle cx="21" cy="11.5" r="1.5"></circle>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path>',
      about:'<circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>',
      arrow:'<path d="M5 12h14M14 7l5 5-5 5"></path>',
      close:'<path d="m7 7 10 10M17 7 7 17"></path>'
    };
    return '<svg class="site-mobile-nav__icon" viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  }

  function currentSection(){
    if(/^\/(?:en\/)?patients\//.test(path))return'patients';
    if(/^\/(?:en\/)?for-doctors\//.test(path))return'doctors';
    if(path==='/'||path==='/en/')return'about';
    return'';
  }

  function detectTheme(){
    if(document.querySelector('.theme-dark,[data-theme="dark"]'))return'dark';
    if(document.querySelector('.theme-light,[data-theme="light"]'))return'light';
    const keys=['iol_dislocation_theme','site_theme','site-theme','theme','color-theme','pkp_theme'];
    for(const key of keys){
      try{const value=localStorage.getItem(key);if(value==='dark'||value==='light')return value}catch(_){ }
    }
    return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }

  const nav=document.createElement('nav');
  nav.className='site-mobile-nav';
  nav.setAttribute('aria-label',text.navLabel);
  nav.innerHTML=`
    <a class="site-mobile-nav__item" data-mobile-nav="patients" href="${routes.patients}">${icon('patients')}<span class="site-mobile-nav__label">${text.patients}</span></a>
    <a class="site-mobile-nav__item" data-mobile-nav="doctors" href="${routes.doctors}">${icon('doctors')}<span class="site-mobile-nav__label">${text.doctors}</span></a>
    <button class="site-mobile-nav__item" data-mobile-nav="search" type="button" aria-expanded="false">${icon('search')}<span class="site-mobile-nav__label">${text.search}</span></button>
    <a class="site-mobile-nav__item" data-mobile-nav="about" href="${routes.about}">${icon('about')}<span class="site-mobile-nav__label">${text.about}</span></a>`;

  const search=document.createElement('div');
  search.className='site-mobile-search';
  search.hidden=true;
  search.innerHTML=`
    <button class="site-mobile-search__backdrop" type="button" data-mobile-search-close tabindex="-1" aria-label="${text.close}"></button>
    <section class="site-mobile-search__dialog" role="dialog" aria-modal="true" aria-labelledby="site-mobile-search-title">
      <div class="site-mobile-search__head">
        <div><span class="site-mobile-search__kicker">${text.searchKicker}</span><h2 class="site-mobile-search__title" id="site-mobile-search-title">${text.searchTitle}</h2></div>
        <button class="site-mobile-search__close" type="button" data-mobile-search-close aria-label="${text.close}">${icon('close')}</button>
      </div>
      <form class="site-mobile-search__form" role="search">
        <input class="site-mobile-search__input" type="search" autocomplete="off" enterkeyhint="search" placeholder="${text.searchPlaceholder}" aria-label="${text.searchPlaceholder}">
        <button class="site-mobile-search__submit" type="submit" aria-label="${text.searchButton}">${icon('search')}</button>
      </form>
      <div class="site-mobile-search__results" aria-live="polite"></div>
    </section>`;

  document.body.append(nav,search);
  const searchButton=nav.querySelector('[data-mobile-nav="search"]');
  const input=search.querySelector('.site-mobile-search__input');
  const results=search.querySelector('.site-mobile-search__results');
  let previousActive=currentSection();

  function applyActive(section){
    nav.querySelectorAll('[data-mobile-nav]').forEach(item=>{
      const active=item.dataset.mobileNav===section;
      item.classList.toggle('is-active',active);
      if(active&&item.tagName==='A')item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    });
  }

  function normalize(value){return value.toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s-]/gi,' ').replace(/\s+/g,' ').trim()}
  function render(query){
    const terms=normalize(query).split(' ').filter(Boolean);
    const matches=(terms.length?index.filter(item=>{const hay=normalize(item.title+' '+item.note+' '+item.keywords);return terms.every(term=>hay.includes(term))}):index.slice(0,6)).slice(0,8);
    results.replaceChildren();
    if(!matches.length){const empty=document.createElement('p');empty.className='site-mobile-search__empty';empty.textContent=text.noResults;results.appendChild(empty);return}
    matches.forEach(item=>{
      const link=document.createElement('a');link.className='site-mobile-search__result';link.href=item.url;
      const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.title;const small=document.createElement('small');small.textContent=item.note;copy.append(strong,small);
      const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<path d="M5 12h14M14 7l5 5-5 5"></path>';
      link.append(copy,arrow);results.appendChild(link);
    });
  }

  function syncTheme(){const theme=detectTheme();if(nav.dataset.theme!==theme)nav.dataset.theme=theme;if(search.dataset.theme!==theme)search.dataset.theme=theme}
  function openSearch(){previousActive=currentSection();search.hidden=false;document.body.classList.add('site-mobile-search-open');searchButton.setAttribute('aria-expanded','true');applyActive('search');render(input.value);requestAnimationFrame(()=>input.focus())}
  function closeSearch(){search.hidden=true;document.body.classList.remove('site-mobile-search-open');searchButton.setAttribute('aria-expanded','false');applyActive(previousActive);searchButton.focus()}

  searchButton.addEventListener('click',openSearch);
  search.querySelectorAll('[data-mobile-search-close]').forEach(button=>button.addEventListener('click',closeSearch));
  search.querySelector('form').addEventListener('submit',event=>{event.preventDefault();render(input.value)});
  input.addEventListener('input',()=>render(input.value));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!search.hidden)closeSearch()});

  const aboutLink=nav.querySelector('[data-mobile-nav="about"]');
  if(path==='/'||path==='/en/')aboutLink.addEventListener('click',event=>{const target=document.getElementById('about');if(!target)return;event.preventDefault();target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});history.replaceState(null,'','#about');applyActive('about')});

  applyActive(currentSection());
  syncTheme();
  render('');

  const themeObserver=new MutationObserver(syncTheme);
  [document.documentElement,document.body,...document.querySelectorAll('.sim-page')].forEach(node=>node&&themeObserver.observe(node,{attributes:true,attributeFilter:['class','data-theme']}));
  document.addEventListener('click',event=>{if(event.target.closest('[data-site-theme],.theme-toggle,.site-theme-toggle'))setTimeout(syncTheme,0)});
  window.addEventListener('storage',syncTheme);
  if(window.matchMedia){const media=window.matchMedia('(prefers-color-scheme: dark)');if(media.addEventListener)media.addEventListener('change',syncTheme)}
})();
