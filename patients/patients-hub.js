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
    shown:n=>`${n} ${n===1?'material':'materials'} found`,
    all:n=>`${n} patient questions available`,
    empty:'No matching material was found. Try another word.',
    indexing:'Searching the published patient materials…',
    conditions:'Conditions',
    conditionMatches:'Matching condition pages',
    pageMatches:'Questions and sections on this page'
  }:{
    questions:n=>`${n} ${pluralRu(n,'вопрос','вопроса','вопросов')}`,
    shown:n=>`Найдено: ${n} ${pluralRu(n,'материал','материала','материалов')}`,
    all:n=>`Доступно ${n} ${pluralRu(n,'вопрос','вопроса','вопросов')}`,
    empty:'По вашему запросу ничего не найдено. Попробуйте другое слово.',
    indexing:'Ищу по опубликованным материалам…',
    conditions:'Заболевания и состояния',
    conditionMatches:'Подходящие материалы по заболеваниям',
    pageMatches:'Вопросы и разделы на этой странице'
  };

  function pluralRu(n,one,few,many){const a=Math.abs(n)%100,b=a%10;return a>10&&a<20?many:b>1&&b<5?few:b===1?one:many;}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е').replace(/[ьъ]/g,'').replace(/[^a-zа-я0-9]+/gi,' ').trim();
  const words=v=>norm(v).split(/\s+/).filter(Boolean);
  const tokenMatches=(hay,token)=>hay.includes(token)||(token.length>=5&&hay.includes(token.slice(0,-1)))||(token.length>=7&&hay.includes(token.slice(0,-2)));
  const matches=(hay,tokens)=>tokens.every(token=>tokenMatches(hay,token));

  const pendingGlaucoma=[...document.querySelectorAll('.condition-card.is-pending')].find(card=>{
    const title=(card.querySelector('h3')?.textContent||'').trim().toLowerCase();
    return title===(lang==='en'?'glaucoma':'глаукома');
  });
  if(pendingGlaucoma){
    const link=document.createElement('a');
    link.className='condition-card';
    link.href=lang==='en'?'/en/patients/glaucoma/':'/patients/glaucoma/';
    link.innerHTML=pendingGlaucoma.innerHTML;
    const copy=link.querySelector('p');
    const action=link.querySelector('strong');
    if(copy)copy.textContent=lang==='en'
      ?'Symptoms, warning signs, examination, eye drops, laser treatment, surgery and long-term follow-up.'
      :'Симптомы, опасные признаки, обследование, капли, лазерное и хирургическое лечение, длительное наблюдение.';
    if(action)action.textContent=lang==='en'?'Open material →':'Открыть материал →';
    pendingGlaucoma.replaceWith(link);
  }

  if(pathGrid){
    pathGrid.innerHTML=DATA.categories.map(c=>{
      const count=DATA.faqs.filter(f=>f.cat===c.key).length;
      return `<a class="path-card" href="${TOPIC_URLS[c.key]}"><span>${esc(c.number)}</span><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><strong>${T.questions(count)} →</strong></a>`;
    }).join('');
  }

  const conditionCards=[...document.querySelectorAll('.condition-card[href]')].map(card=>({
    title:(card.querySelector('h3')?.textContent||'').trim(),
    text:(card.querySelector('p')?.textContent||'').trim(),
    href:new URL(card.getAttribute('href'),location.origin).pathname
  }));

  if(faqIndex){
    const conditions=conditionCards.map(item=>`<a class="faq-index-link" data-condition-result href="${esc(item.href)}" data-search="${esc(item.title+' '+item.text)}"><span><b>${esc(item.title)}</b><small>${esc(item.text)}</small></span><span aria-hidden="true">↗</span></a>`).join('');
    const conditionGroup=`<section class="faq-index-group condition-index-group" data-condition-group hidden><div class="faq-index-head"><span>•</span><div><h3>${T.conditions}</h3><p>${T.conditionMatches}</p></div></div><div class="faq-index-list">${conditions}</div></section>`;
    const remoteContainer='<div data-condition-detail-groups></div>';
    const questionGroups=DATA.categories.map(c=>{
      const items=DATA.faqs.filter(f=>f.cat===c.key).map(f=>{
        const search=[f.q,f.short,...f.paragraphs,...f.important].join(' ');
        return `<a class="faq-index-link" href="${cataractBase}#${esc(f.id)}" data-question-result data-search="${esc(search)}"><span>${esc(f.q)}</span><span aria-hidden="true">↗</span></a>`;
      }).join('');
      return `<section class="faq-index-group" data-index-group="${esc(c.key)}"><div class="faq-index-head"><span>${esc(c.number)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div></div><div class="faq-index-list">${items}</div></section>`;
    }).join('');
    faqIndex.innerHTML=conditionGroup+remoteContainer+questionGroups;
  }

  const inputs=[topSearch,faqSearch].filter(Boolean);
  let syncing=false;
  let conditionIndexReady=false;

  function apply(raw){
    const tokens=words(raw);
    const isSearching=tokens.length>0;
    let count=0;
    faqIndex?.querySelectorAll('.faq-index-link').forEach(link=>{
      const isConditionOverview=link.hasAttribute('data-condition-result');
      const isConditionDetail=link.hasAttribute('data-condition-detail-result');
      let match=false;
      if(isSearching)match=matches(norm(link.dataset.search),tokens);
      else match=!isConditionOverview&&!isConditionDetail;
      link.hidden=!match;
      if(match)count++;
    });
    faqIndex?.querySelectorAll('.faq-index-group').forEach(group=>{
      group.hidden=![...group.querySelectorAll('.faq-index-link')].some(link=>!link.hidden);
    });
    const questionCount=[...(faqIndex?.querySelectorAll('[data-question-result]')||[])].filter(link=>!link.hidden).length;
    if(status){
      if(isSearching&&!conditionIndexReady)status.textContent=T.indexing;
      else status.textContent=isSearching?T.shown(count):T.all(questionCount);
    }
    if(empty){
      empty.hidden=!conditionIndexReady||count!==0||!isSearching;
      empty.textContent=T.empty;
    }
  }

  function syncFrom(source){
    if(syncing)return;
    syncing=true;
    inputs.forEach(input=>{if(input!==source)input.value=source.value;input.closest('.smart-search,.search-box')?.classList.toggle('has-value',Boolean(input.value));});
    syncing=false;
    apply(source.value);
  }

  function cleanText(value){return String(value||'').replace(/\s+/g,' ').trim();}

  function extractConditionItems(doc,page){
    const seen=new Set();
    const items=[];
    doc.querySelectorAll('.faq-item').forEach(item=>{
      const question=cleanText(item.querySelector('.faq-question')?.textContent);
      if(!question)return;
      const section=cleanText(item.closest('[data-panel]')?.querySelector('.topic-head h2')?.textContent)||page.title;
      const id=item.id||'';
      const key=id||question;
      if(seen.has(key))return;
      seen.add(key);
      const searchable=cleanText([page.title,section,item.textContent].join(' '));
      const href=id?`${page.href}#${encodeURIComponent(id)}`:page.href;
      items.push({title:question,section,searchable,href});
    });
    if(items.length)return items;
    doc.querySelectorAll('main section[id],main article[id]').forEach(section=>{
      const title=cleanText(section.querySelector('h2,h3')?.textContent);
      if(!title)return;
      const key=section.id||title;
      if(seen.has(key))return;
      seen.add(key);
      items.push({
        title,
        section:page.title,
        searchable:cleanText([page.title,section.textContent].join(' ')),
        href:section.id?`${page.href}#${encodeURIComponent(section.id)}`:page.href
      });
    });
    return items;
  }

  async function fetchConditionPage(page){
    const response=await fetch(page.href,{credentials:'same-origin'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const html=await response.text();
    const doc=new DOMParser().parseFromString(html,'text/html');
    return {...page,items:extractConditionItems(doc,page)};
  }

  function renderConditionDetails(pages){
    const host=faqIndex?.querySelector('[data-condition-detail-groups]');
    if(!host)return;
    host.innerHTML=pages.filter(page=>page.items.length).map((page,index)=>{
      const links=page.items.map(item=>`<a class="faq-index-link" data-condition-detail-result href="${esc(item.href)}" data-search="${esc(item.searchable)}"><span><b>${esc(item.title)}</b><small>${esc(item.section)}</small></span><span aria-hidden="true">↗</span></a>`).join('');
      return `<section class="faq-index-group condition-detail-group" data-condition-detail-group="${esc(page.href)}" hidden><div class="faq-index-head"><span>${String(index+1).padStart(2,'0')}</span><div><h3>${esc(page.title)}</h3><p>${T.pageMatches}</p></div></div><div class="faq-index-list">${links}</div></section>`;
    }).join('');
  }

  async function buildConditionIndex(){
    const remotePages=conditionCards.filter(page=>page.href!==cataractBase);
    if(!remotePages.length){conditionIndexReady=true;apply(faqSearch?.value||topSearch?.value||'');return;}
    const settled=await Promise.allSettled(remotePages.map(fetchConditionPage));
    const pages=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
    renderConditionDetails(pages);
    conditionIndexReady=true;
    apply(faqSearch?.value||topSearch?.value||'');
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
  buildConditionIndex();
})();
