(function(){
  const lang=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const T=lang==='en'?{
    privacy:'Privacy policy',cookies:'Cookie settings',warning:'Telegram is intended only for organisational and general information. Do not send medical records, examination results, photographs, diagnoses or other health information. Medical advice, diagnosis and treatment are not provided through the website or Telegram.',
    cookie:'This website uses essential cookies and local storage. Optional analytics may be enabled only with your consent. You can accept analytics or continue with essential technologies only.',accept:'Accept analytics',reject:'Essential only'
  }:{
    privacy:'Политика обработки персональных данных',cookies:'Настройки cookie',warning:'Telegram предназначен только для организационных и общих информационных вопросов. Не направляйте медицинские документы, результаты обследований, фотографии, диагнозы и иные сведения о здоровье. Медицинские консультации, диагностика и назначение лечения через сайт и Telegram не осуществляются.',
    cookie:'Сайт использует необходимые cookie и локальное хранилище. Необязательная веб-аналитика может быть включена только с вашего согласия. Вы можете разрешить аналитику или продолжить только с необходимыми технологиями.',accept:'Разрешить аналитику',reject:'Только необходимые'
  };
  const privacyUrl=lang==='en'?'/en/privacy.html':'/privacy.html';
  if(!document.querySelector('link[href^="/legal.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/legal.css?v=20260723-4';document.head.appendChild(l)}
  const footer=document.querySelector('footer .footer-row')||document.querySelector('footer');
  if(footer&&!footer.querySelector('.legal-footer-link')){
    const wrap=document.createElement('span');wrap.className='legal-footer-wrap';
    const a=document.createElement('a');a.className='legal-footer-link';a.href=privacyUrl;a.textContent=T.privacy;
    const sep=document.createElement('span');sep.className='legal-footer-separator';sep.setAttribute('aria-hidden','true');sep.textContent='·';
    const b=document.createElement('button');b.type='button';b.className='legal-cookie-settings';b.textContent=T.cookies;b.addEventListener('click',()=>{localStorage.removeItem('site_cookie_choice');showBanner()});
    wrap.append(a,sep,b);footer.appendChild(wrap);
  }
  document.querySelectorAll('a[href*="t.me/ShemMYu"]').forEach(a=>{
    const container=a.closest('.hero-actions,.contact-actions,.author-links')||a.parentElement;
    if(!container||container.querySelector('.telegram-privacy-note'))return;
    const p=document.createElement('p');p.className='telegram-privacy-note';p.textContent=T.warning+' ';
    const link=document.createElement('a');link.href=privacyUrl;link.textContent=T.privacy+'.';p.appendChild(link);container.appendChild(p);
  });
  let banner;
  function enableAnalytics(){window.dispatchEvent(new CustomEvent('site:analytics-consent'));if(typeof window.initSiteAnalytics==='function')window.initSiteAnalytics()}
  function choose(value){localStorage.setItem('site_cookie_choice',value);if(banner)banner.hidden=true;if(value==='analytics')enableAnalytics()}
  function showBanner(){if(!banner){banner=document.createElement('aside');banner.className='cookie-banner';banner.setAttribute('role','dialog');banner.setAttribute('aria-label',T.cookies);const inner=document.createElement('div');inner.className='cookie-banner__inner';const p=document.createElement('p');p.textContent=T.cookie+' ';const link=document.createElement('a');link.href=privacyUrl;link.textContent=T.privacy+'.';p.appendChild(link);const actions=document.createElement('div');actions.className='cookie-banner__actions';const reject=document.createElement('button');reject.type='button';reject.className='cookie-reject';reject.textContent=T.reject;reject.onclick=()=>choose('essential');const accept=document.createElement('button');accept.type='button';accept.className='cookie-accept';accept.textContent=T.accept;accept.onclick=()=>choose('analytics');actions.append(reject,accept);inner.append(p,actions);banner.appendChild(inner);document.body.appendChild(banner)}banner.hidden=false}
  const choice=localStorage.getItem('site_cookie_choice');if(choice==='analytics')enableAnalytics();else if(!choice)showBanner();

  function initPatientFab(){
    if(!/^\/(?:en\/)?patients(?:\/|$)/.test(window.location.pathname)||document.querySelector('.patient-fab'))return;
    const F=lang==='en'?{
      open:'Open quick actions',close:'Close quick actions',telegram:'Message me directly',telegramNote:'Organisational questions only',share:'Share this page',shareNote:'Send the page link',copied:'Link copied',siteLogo:'MS'
    }:{
      open:'Открыть быстрые действия',close:'Закрыть быстрые действия',telegram:'Написать лично',telegramNote:'Только организационные вопросы',share:'Поделиться страницей',shareNote:'Отправить ссылку',copied:'Ссылка скопирована',siteLogo:'МШ'
    };
    const root=document.createElement('div');
    root.className='patient-fab';
    root.innerHTML=`
      <div class="patient-fab__menu" id="patient-fab-menu" aria-hidden="true">
        <a class="patient-fab__action" href="https://t.me/ShemMYu" target="_blank" rel="noopener">
          <span class="patient-fab__logo patient-fab__logo--telegram" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="20" fill="#27A7E7"/><path d="M10.4 19.2 29.8 11.7c.9-.3 1.7.2 1.4 1.4l-3.3 15.6c-.2 1.1-1 1.4-2 .9l-5-3.7-2.4 2.4c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2l-11.4 7.2-4.9-1.5c-1-.3-1.1-1 .2-1.5Z" fill="#fff"/></svg>
          </span>
          <span><strong>${F.telegram}</strong><small>${F.telegramNote}</small></span>
        </a>
        <button class="patient-fab__action" type="button" data-patient-share>
          <span class="patient-fab__logo patient-fab__logo--site" aria-hidden="true">${F.siteLogo}</span>
          <span><strong>${F.share}</strong><small data-patient-share-note>${F.shareNote}</small></span>
        </button>
      </div>
      <button class="patient-fab__main" type="button" aria-label="${F.open}" aria-expanded="false" aria-controls="patient-fab-menu">
        <svg class="patient-fab__main-chat" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v10H9l-5 4v-14Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <svg class="patient-fab__main-close" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;
    document.body.appendChild(root);
    const main=root.querySelector('.patient-fab__main');
    const menu=root.querySelector('.patient-fab__menu');
    const share=root.querySelector('[data-patient-share]');
    const shareNote=root.querySelector('[data-patient-share-note]');
    let restoreTimer;
    function setOpen(open){
      root.classList.toggle('is-open',open);
      main.setAttribute('aria-expanded',String(open));
      main.setAttribute('aria-label',open?F.close:F.open);
      menu.setAttribute('aria-hidden',String(!open));
    }
    function copyFallback(text){
      const input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
    }
    function showCopied(){
      clearTimeout(restoreTimer);shareNote.textContent=F.copied;root.classList.add('is-copied');
      restoreTimer=setTimeout(()=>{shareNote.textContent=F.shareNote;root.classList.remove('is-copied')},1800);
    }
    main.addEventListener('click',()=>setOpen(!root.classList.contains('is-open')));
    document.addEventListener('pointerdown',event=>{if(root.classList.contains('is-open')&&!root.contains(event.target))setOpen(false)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('is-open')){setOpen(false);main.focus()}});
    share.addEventListener('click',async()=>{
      const data={title:document.title,text:lang==='en'?'Patient information from Matvey Shemyakin':'Материалы для пациентов от Матвея Шемякина',url:window.location.href};
      try{
        if(navigator.share){await navigator.share(data);return}
        if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(data.url);else copyFallback(data.url);
        showCopied();
      }catch(error){if(error&&error.name==='AbortError')return;try{copyFallback(data.url);showCopied()}catch(ignore){}}
    });
  }
  initPatientFab();
})();
