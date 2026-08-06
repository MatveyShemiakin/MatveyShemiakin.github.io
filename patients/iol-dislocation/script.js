(function(){
  const page=document.querySelector('.sim-page');
  if(!page)return;

  const tabs=[...page.querySelectorAll('[data-tab]')];
  const panels=[...page.querySelectorAll('[data-panel]')];
  const progress=page.querySelector('.reading-progress span');
  const themeButton=page.querySelector('[data-site-theme]');
  const isEnglish=document.documentElement.lang.toLowerCase().startsWith('en');
  const themeKey='site_theme_v1';

  function updateReadingProgress(){
    if(!progress)return;
    const root=document.documentElement;
    const available=Math.max(1,root.scrollHeight-window.innerHeight);
    const value=Math.max(0,Math.min(1,window.scrollY/available));
    progress.style.transform='scaleX('+value+')';
  }

  function activate(id,shouldScroll){
    const exists=panels.some(panel=>panel.dataset.panel===id);
    if(!exists)return;
    tabs.forEach(button=>{
      const active=button.dataset.tab===id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
    });
    panels.forEach(panel=>{
      const active=panel.dataset.panel===id;
      panel.classList.toggle('active',active);
      panel.hidden=!active;
    });
    if(shouldScroll){
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
    }
    requestAnimationFrame(updateReadingProgress);
  }

  tabs.forEach(button=>{
    button.setAttribute('role','tab');
    button.addEventListener('click',()=>activate(button.dataset.tab,false));
  });

  page.querySelectorAll('[data-jump]').forEach(button=>{
    button.addEventListener('click',()=>activate(button.dataset.jump,true));
  });
  page.querySelectorAll('[data-next]').forEach(button=>{
    button.addEventListener('click',()=>activate(button.dataset.next,true));
  });

  function setTheme(theme,persist=true){
    const dark=theme==='dark';
    page.classList.toggle('theme-dark',dark);
    page.classList.toggle('theme-light',!dark);
    if(persist){try{localStorage.setItem(themeKey,dark?'dark':'light')}catch(error){}}
    document.documentElement.dataset.siteTheme=dark?'dark':'light';
    document.documentElement.dataset.theme=dark?'dark':'light';
    if(themeButton){
      themeButton.setAttribute(
        'aria-label',
        isEnglish
          ?(dark?'Switch to light colour scheme':'Switch to dark colour scheme')
          :(dark?'Включить светлую цветовую гамму':'Включить тёмную цветовую гамму')
      );
    }
  }

  let storedTheme=document.documentElement.dataset.siteTheme||'light';
  try{storedTheme=document.documentElement.dataset.siteTheme||localStorage.getItem(themeKey)||'light'}catch(error){}
  setTheme(storedTheme,false);
  window.addEventListener('site-theme-change',event=>setTheme(event.detail&&event.detail.theme?event.detail.theme:'light',false));
  themeButton?.addEventListener('click',()=>{
    setTheme(page.classList.contains('theme-dark')?'light':'dark');
  });

  function applyResponsiveClass(){
    page.classList.remove('desktop','tablet','mobile');
    if(window.innerWidth<=680)page.classList.add('mobile');
    else if(window.innerWidth<=1020)page.classList.add('tablet');
    else page.classList.add('desktop');
    updateReadingProgress();
  }

  page.querySelectorAll('.author-photo img').forEach(image=>{
    image.addEventListener('error',()=>image.classList.add('image-unavailable'),{once:true});
  });

  page.querySelector('footer a[href="#top"]')?.addEventListener('click',event=>{
    event.preventDefault();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  function openHashTarget(){
    const id=decodeURIComponent(location.hash.slice(1));
    if(!id)return;
    const target=document.getElementById(id);
    if(!target)return;
    const panel=target.closest('[data-panel]');
    if(panel)activate(panel.dataset.panel,false);
    if(target.matches('details'))target.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }

  page.addEventListener('toggle',updateReadingProgress,true);
  window.addEventListener('scroll',updateReadingProgress,{passive:true});
  window.addEventListener('resize',applyResponsiveClass,{passive:true});
  window.addEventListener('hashchange',openHashTarget);

  panels.forEach((panel,index)=>{
    const active=index===0;
    panel.hidden=!active;
  });
  applyResponsiveClass();
  openHashTarget();
  updateReadingProgress();
})();