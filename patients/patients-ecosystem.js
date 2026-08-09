(function(){
  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The shared legal.js module owns the official ProDoctorov widget on patient pages.
     Remove the preview-only duplicate author slot before legal.js initializes it. */
  document.querySelectorAll('.author-section .pd-slot').forEach(slot=>slot.remove());
  document.querySelectorAll('.author-section .author-panel.has-widget').forEach(panel=>panel.classList.remove('has-widget'));

  function parsePhrases(input){
    return String(input.dataset.phrases||'').split('|').map(x=>x.trim()).filter(Boolean);
  }

  function setupTypewriter(input){
    if(!input||reduceMotion)return;
    const phrases=parsePhrases(input);
    if(!phrases.length)return;
    const box=input.closest('.smart-search,.search-box');
    if(!box)return;
    box.classList.add('has-typewriter');
    const layer=document.createElement('div');
    layer.className='type-layer';
    layer.setAttribute('aria-hidden','true');
    const text=document.createElement('span');
    const cursor=document.createElement('span');
    cursor.className='type-cursor';
    layer.append(text,cursor);
    box.append(layer);
    let phraseIndex=0,charIndex=0,deleting=false,pause=0;
    const tick=()=>{
      if(document.activeElement===input||input.value){setTimeout(tick,220);return;}
      const phrase=phrases[phraseIndex];
      if(pause>0){pause--;setTimeout(tick,120);return;}
      if(!deleting){
        charIndex++;
        text.textContent=phrase.slice(0,charIndex);
        if(charIndex>=phrase.length){deleting=true;pause=12;}
      }else{
        charIndex--;
        text.textContent=phrase.slice(0,charIndex);
        if(charIndex<=0){deleting=false;phraseIndex=(phraseIndex+1)%phrases.length;pause=3;}
      }
      setTimeout(tick,deleting?42:74);
    };
    input.addEventListener('input',()=>box.classList.toggle('has-value',Boolean(input.value)));
    tick();
  }

  document.querySelectorAll('[data-animated-search]').forEach(setupTypewriter);

  const pressures=[16,17,19,22,25,24,21,18];
  let pressureIndex=0;
  if(!reduceMotion&&document.querySelector('[data-pressure]')){
    setInterval(()=>{
      pressureIndex=(pressureIndex+1)%pressures.length;
      document.querySelectorAll('[data-pressure]').forEach(node=>node.textContent=pressures[pressureIndex]);
    },650);
  }

  if(location.pathname.includes('/patients/cataract/')){
    const isEnglish=(document.documentElement.lang||'ru').toLowerCase().startsWith('en');
    const canonical=new URL(location.pathname.endsWith('/')?location.pathname:location.pathname+'/',location.origin).href;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(tag=>{
      try{
        const data=JSON.parse(tag.textContent||'{}');
        if(data['@type']!=='FAQPage'||!String(data['@id']||'').endsWith('#faq'))return;
        data['@id']=canonical+'#faq';
        data.url=canonical;
        data.name=isEnglish?'Cataract surgery and recovery FAQs':'Катаракта — частые вопросы об операции и восстановлении';
        tag.textContent=JSON.stringify(data);
      }catch(error){}
    });
  }
})();
