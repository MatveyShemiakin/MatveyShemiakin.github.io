(function(){
  const lang=(document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const DATA=window.PATIENT_FAQ_DATA||{categories:[],faqs:[]};
  const pathGrid=document.getElementById('path-grid');
  const faqIndex=document.getElementById('faq-index');
  const topSearch=document.getElementById('hub-search-top');
  const faqSearch=document.getElementById('hub-search-faq');
  const status=document.getElementById('hub-search-status');
  const empty=document.getElementById('hub-search-empty');
  const cataractBase=lang==='en'?'/en/patients/cataract/':'/patients/cataract/';
  const TOPIC_URLS=lang==='en'?{
    before:'/en/patients/before-surgery/',day:'/en/patients/surgery-day/',early:'/en/patients/recovery/',daily:'/en/patients/daily-life/',drops:'/en/patients/eye-drops/',glasses:'/en/patients/glasses/'
  }:{
    before:'/patients/before-surgery/',day:'/patients/surgery-day/',early:'/patients/recovery/',daily:'/patients/daily-life/',drops:'/patients/eye-drops/',glasses:'/patients/glasses/'
  };
  const T=lang==='en'?{
    questions:n=>`${n} ${n===1?'question':'questions'}`,
    shown:n=>`${n} ${n===1?'answer':'answers'} found`,
    all:n=>`${n} patient questions available`,
    empty:'No matching question was found. Try another word.',
    open:'Open →'
  }:{
    questions:n=>`${n} ${pluralRu(n,'вопрос','вопроса','вопросов')}`,
    shown:n=>`Найдено: ${n} ${pluralRu(n,'ответ','ответа','ответов')}`,
    all:n=>`Доступно ${n} ${pluralRu(n,'вопрос','вопроса','вопросов')}`,
    empty:'По вашему запросу ничего не найдено. Попробуйте другое слово.',
    open:'Открыть →'
  };
  function pluralRu(n,one,few,many){const a=Math.abs(n)%100,b=a%10;return a>10&&a<20?many:b>1&&b<5?few:b===1?one:many;}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е').replace(/[ьъ]/g,'').replace(/[^a-zа-я0-9]+/gi,' ').trim();
  const words=v=>norm(v).split(/\s+/).filter(Boolean);

  if(pathGrid){
    pathGrid.innerHTML=DATA.categories.map(c=>{
      const count=DATA.faqs.filter(f=>f.cat===c.key).length;
      return `<a class="path-card" href="${TOPIC_URLS[c.key]}"><span>${esc(c.number)}</span><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><strong>${T.questions(count)} →</strong></a>`;
    }).join('');
  }

  if(faqIndex){
    faqIndex.innerHTML=DATA.categories.map(c=>{
      const items=DATA.faqs.filter(f=>f.cat===c.key).map(f=>{
        const search=[f.q,f.short,...f.paragraphs,...f.important].join(' ');
        return `<a class="faq-index-link" href="${cataractBase}#${esc(f.id)}" data-search="${esc(search)}"><span>${esc(f.q)}</span><span aria-hidden="true">↗</span></a>`;
      }).join('');
      return `<section class="faq-index-group" data-index-group="${esc(c.key)}"><div class="faq-index-head"><span>${esc(c.number)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div></div><div class="faq-index-list">${items}</div></section>`;
    }).join('');
  }

  const inputs=[topSearch,faqSearch].filter(Boolean);
  let syncing=false;
  function apply(raw){
    const tokens=words(raw);
    const isSearching=tokens.length>0;
    let count=0;
    faqIndex?.querySelectorAll('.faq-index-link').forEach(link=>{
      const match=!isSearching||tokens.every(t=>norm(link.dataset.search).includes(t));
      link.hidden=!match;
      if(match)count++;
    });
    faqIndex?.querySelectorAll('.faq-index-group').forEach(group=>{
      group.hidden=![...group.querySelectorAll('.faq-index-link')].some(link=>!link.hidden);
    });
    if(status)status.textContent=isSearching?T.shown(count):T.all(count);
    if(empty){empty.hidden=count!==0;empty.textContent=T.empty;}
  }
  function syncFrom(source){
    if(syncing)return;
    syncing=true;
    inputs.forEach(input=>{if(input!==source)input.value=source.value;input.closest('.smart-search,.search-box')?.classList.toggle('has-value',Boolean(input.value));});
    syncing=false;
    apply(source.value);
  }
  inputs.forEach(input=>{
    input.addEventListener('input',()=>syncFrom(input));
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        event.preventDefault();
        document.getElementById('faq')?.scrollIntoView({behavior:'smooth',block:'start'});
        faqSearch?.focus();
      }
    });
  });
  apply('');
})();
