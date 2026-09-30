(function(){
  const progress=document.querySelector('.reading-progress span');
  const links=[...document.querySelectorAll('.article-toc a,.mobile-toc-panel a')];
  const sections=[...document.querySelectorAll('.article-body section[id]')];
  const toggle=document.querySelector('.mobile-toc button');
  const mobile=document.querySelector('.mobile-toc');
  function updateProgress(){
    if(!progress)return;
    const max=document.documentElement.scrollHeight-window.innerHeight;
    const ratio=max>0?Math.min(1,Math.max(0,window.scrollY/max)):0;
    progress.style.width=(ratio*100).toFixed(2)+'%';
  }
  function updateActive(){
    let current=sections[0]?.id||'';
    for(const section of sections){if(section.getBoundingClientRect().top<=150)current=section.id;}
    links.forEach(link=>{const active=link.hash==='#'+current;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  function update(){updateProgress();updateActive();}
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  if(toggle&&mobile)toggle.addEventListener('click',()=>{const open=mobile.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false');});
  document.querySelectorAll('.mobile-toc-panel a').forEach(link=>link.addEventListener('click',()=>{mobile?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}));
  update();
})();
