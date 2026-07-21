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
  if(!document.querySelector('link[href^="/legal.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/legal.css?v=20260721-3';document.head.appendChild(l)}
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
})();