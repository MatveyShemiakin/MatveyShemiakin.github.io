(function(){
  if(document.querySelector('.site-mobile-search'))return;
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
    const rootTheme=document.documentElement.dataset.siteTheme||document.documentElement.dataset.theme||document.body.dataset.theme;
    if(rootTheme==='dark'||rootTheme==='light')return rootTheme;
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
  search.id='site-search-dialog';
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
      <p class="site-mobile-search__empty" role="status" aria-live="polite"></p><div class="site-mobile-search__results"></div>
    </section>`;

  document.body.append(nav,search);
  const searchButton=nav.querySelector('[data-mobile-nav="search"]');
  const input=search.querySelector('.site-mobile-search__input');
  const results=search.querySelector('.site-mobile-search__results');
  // iOS and Android keyboards shrink the visual viewport without reliably
  // changing the CSS layout viewport. Position with a CSS class rule (never
  // an inline style) so the dialog stays inside the actually visible area.
  const viewportStyles=document.createElement('style');
  viewportStyles.id='site-search-visual-viewport';
  let viewportFrame=0;
  function syncSearchViewport(){
    if(search.hidden)return;
    if(!window.visualViewport||!window.matchMedia('(max-width:760px)').matches){
      search.classList.remove('site-mobile-search--visual-viewport','site-mobile-search--compact');
      return;
    }
    const viewport=window.visualViewport;
    const top=Math.max(0,viewport.offsetTop);
    const left=Math.max(0,viewport.offsetLeft);
    viewportStyles.textContent=`@media(max-width:760px){.site-mobile-search.site-mobile-search--visual-viewport{inset:auto;top:${top}px;left:${left}px;width:${viewport.width}px;height:${viewport.height}px}}`;
    if(!viewportStyles.isConnected)document.head.appendChild(viewportStyles);
    search.classList.add('site-mobile-search--visual-viewport');
    search.classList.toggle('site-mobile-search--compact',viewport.height<440);
  }
  function scheduleSearchViewportSync(){
    if(viewportFrame)cancelAnimationFrame(viewportFrame);
    viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;syncSearchViewport();});
  }
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',scheduleSearchViewportSync);
    window.visualViewport.addEventListener('scroll',scheduleSearchViewportSync);
  }
  window.addEventListener('resize',scheduleSearchViewportSync);
  let previousActive=currentSection();

  function applyActive(section){
    nav.querySelectorAll('[data-mobile-nav]').forEach(item=>{
      const active=item.dataset.mobileNav===section;
      item.classList.toggle('is-active',active);
      if(active&&item.tagName==='A')item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    });
  }

  const status=search.querySelector('[role="status"]');
  const messages=lang==='en'?{
    loading:'Loading website search…',error:'Search could not load. Check your connection and try again.',retry:'Try again',
    found:n=>`${n} matching sections`,more:'Show more',initial:'Search all public materials in Russian and English.'
  }:{
    loading:'Загрузка поиска по сайту…',error:'Не удалось загрузить поиск. Проверьте соединение и повторите попытку.',retry:'Повторить',
    found:n=>`Найдено разделов: ${n}`,more:'Показать ещё',initial:'Поиск по всем открытым материалам на русском и английском.'
  };
  let records=null,loading=null,requestId=0,shown=20,opener=null;
  let background=[];
  const desktop=document.querySelector('header[data-site-header] [data-site-search-open]')||document.createElement('button');
  desktop.className='site-mobile-nav__item';
  desktop.type='button';
  desktop.dataset.siteSearchOpen='';
  desktop.innerHTML=icon('search')+'<span>'+text.search+'</span>';
  desktop.setAttribute('aria-haspopup','dialog');
  desktop.setAttribute('aria-controls',search.id);
  desktop.setAttribute('aria-expanded','false');
  const mount=['header .nav-right','header .header-actions','header .professional-updates-nav-actions','header .doctors-nav-actions','header .nav-actions','header .header-row','header .terms-nav-links','header .container.nav','header .header-inner','.site-head .container','.privacy-shell'].map(selector=>document.querySelector(selector)).find(Boolean);
  if(mount&&!desktop.isConnected){if(mount.matches('.privacy-shell'))mount.querySelector('.privacy-back')?.after(desktop);else mount.appendChild(desktop);}
  searchButton.setAttribute('aria-controls',search.id);
  searchButton.setAttribute('aria-haspopup','dialog');

  function loadCore(){
    if(window.SiteSearch)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='/site-search-core.js?v=20261017-1';
      const timeout=setTimeout(()=>{script.remove();reject(new Error('Search engine timeout'));},15000);
      script.onload=()=>{clearTimeout(timeout);window.SiteSearch?resolve():reject(new Error('Invalid engine'));};
      script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error('Search engine unavailable'));};
      document.head.appendChild(script);
    });
  }
  async function loadIndex(){
    if(records)return records;
    if(loading)return loading;
    loading=(async()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),15000);
      try{
        const [,response]=await Promise.all([loadCore(),fetch('/site-search-index.json?v=20261017-1',{signal:controller.signal,cache:'no-cache'})]);
        if(!response.ok)throw new Error('Search index HTTP '+response.status);
        const data=await response.json();
        if(data.version!==1||!Array.isArray(data.records))throw new Error('Invalid index');
        records=data.records.filter(item=>item&&typeof item.title==='string'&&typeof item.text==='string'&&window.SiteSearch.safeURL(item.url));
        return records;
      }finally{clearTimeout(timeout);loading=null;}
    })();
    return loading;
  }
  function appendHighlight(host,value,query){
    const terms=window.SiteSearch.terms(query);
    String(value).split(/([\p{L}\p{N}]+)/gu).forEach(part=>{
      const normalized=window.SiteSearch.stem(window.SiteSearch.normalize(part));
      if(normalized&&terms.some(term=>normalized===term||(term.length>=4&&normalized.startsWith(term)))){
        const mark=document.createElement('mark');mark.textContent=part;host.append(mark);
      }else host.append(document.createTextNode(part));
    });
  }
  function action(label,handler){
    const button=document.createElement('button');button.type='button';button.className='site-mobile-search__result';button.textContent=label;button.addEventListener('click',handler);results.append(button);return button;
  }
  async function render(query){
    const id=++requestId;
    results.replaceChildren();
    results.scrollTop=0;
    search.querySelector('form').removeAttribute('aria-busy');
    if(!query.trim()){status.textContent=messages.initial;return;}
    status.textContent=messages.loading;
    search.querySelector('form').setAttribute('aria-busy','true');
    try{
      await loadIndex();
      if(id!==requestId||search.hidden)return;
      const matches=window.SiteSearch.search(records,query,lang);
      status.textContent=matches.length?messages.found(matches.length):text.noResults;
      matches.slice(0,shown).forEach(item=>{
        const link=document.createElement('a');link.className='site-mobile-search__result';link.href=item.url;
        const copy=document.createElement('span');
        const strong=document.createElement('strong');appendHighlight(strong,item.title,query);
        const small=document.createElement('small');small.textContent=item.page+' · '+item.lang.toUpperCase();
        const excerpt=document.createElement('small');appendHighlight(excerpt,window.SiteSearch.snippet(item.text,query),query);
        copy.append(strong,small,excerpt);
        const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='→';link.append(copy,arrow);results.append(link);
        link.addEventListener('click',()=>{closeSearch(false);if(new URL(link.href).pathname===location.pathname)setTimeout(revealHash,0);});
      });
      if(matches.length>shown)action(messages.more,()=>{const position=shown;shown+=20;render(input.value).then(()=>results.children[position]?.focus());});
    }catch(_){
      if(id!==requestId||search.hidden)return;
      status.textContent=messages.error;action(messages.retry,()=>render(input.value));
    }finally{
      if(id===requestId)search.querySelector('form').removeAttribute('aria-busy');
    }
  }

  function syncTheme(){const theme=detectTheme();if(nav.dataset.theme!==theme)nav.dataset.theme=theme;if(search.dataset.theme!==theme)search.dataset.theme=theme}
  function openSearch(event){
    if(!search.hidden)return;
    opener=event?.currentTarget||searchButton;
    previousActive=currentSection();search.hidden=false;
    document.body.classList.add('site-mobile-search-open');
    scheduleSearchViewportSync();
    [searchButton,desktop].forEach(button=>button.setAttribute('aria-expanded','true'));
    applyActive('search');syncTheme();shown=20;render(input.value);
    background=[...document.body.children].filter(element=>element!==search&&!element.inert);
    background.forEach(element=>element.inert=true);
    requestAnimationFrame(()=>{try{input.focus({preventScroll:true});}catch(_){input.focus();}});
  }
  function closeSearch(restore=true){
    ++requestId;clearTimeout(timer);input.blur();search.hidden=true;document.body.classList.remove('site-mobile-search-open');
    if(viewportFrame)cancelAnimationFrame(viewportFrame);
    viewportFrame=0;
    search.classList.remove('site-mobile-search--visual-viewport','site-mobile-search--compact');
    background.forEach(element=>element.inert=false);background=[];
    [searchButton,desktop].forEach(button=>button.setAttribute('aria-expanded','false'));
    applyActive(previousActive);if(restore)opener?.focus();
  }
  searchButton.addEventListener('click',openSearch);
  desktop.addEventListener('click',openSearch);
  search.querySelectorAll('[data-mobile-search-close]').forEach(button=>button.addEventListener('click',()=>closeSearch()));
  search.querySelector('form').addEventListener('submit',event=>{event.preventDefault();shown=20;render(input.value);});
  let timer;
  input.maxLength=200;
  input.addEventListener('input',()=>{++requestId;clearTimeout(timer);shown=20;timer=setTimeout(()=>render(input.value),120);});
  document.addEventListener('keydown',event=>{
    if(search.hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeSearch();}
    if(event.key==='Tab'){
      const targets=[...search.querySelectorAll('button:not([tabindex="-1"]),input,a[href]')].filter(el=>!el.disabled);
      const first=targets[0],last=targets[targets.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  // Open existing tabs/accordions when a result links into a collapsed section.
  function revealHash(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
    const target=document.getElementById(id);if(!target)return;
    let parent=target;
    while(parent&&parent!==document.body){
      if(parent.tagName==='DETAILS')parent.open=true;
      if(parent.hasAttribute('data-panel')){
        const tab=[...document.querySelectorAll('[data-tab]')].find(button=>button.dataset.tab===parent.dataset.panel);tab?.click();
      }
      parent=parent.parentElement;
    }
    if(id.startsWith('search-'))requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange',revealHash);
  window.addEventListener('load',revealHash);

  const aboutLink=nav.querySelector('[data-mobile-nav="about"]');
  if(path==='/'||path==='/en/')aboutLink.addEventListener('click',event=>{const target=document.getElementById('about');if(!target)return;event.preventDefault();target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});history.replaceState(null,'','#about');applyActive('about')});

  applyActive(currentSection());
  syncTheme();

  document.addEventListener('click',event=>{if(event.target.closest('[data-site-theme],[data-theme-toggle],.theme-toggle,.site-theme-toggle'))setTimeout(syncTheme,0)});
  window.addEventListener('site-theme-change',syncTheme);
  window.addEventListener('storage',syncTheme);
  if(window.matchMedia){const media=window.matchMedia('(prefers-color-scheme: dark)');if(media.addEventListener)media.addEventListener('change',syncTheme)}
})();
