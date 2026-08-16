(function(factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  api.init(window,document);
})(function(){
  'use strict';

  const METRIKA_ID=111504350;
  const CONSENT_KEY='site_cookie_choice';
  const STORAGE_KEY='doctor_updates_read_v1';
  const FEED_URL='/for-doctors/updates.json';

  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}
  function eventKey(item){
    if(item&&String(item.event_id||'').trim())return String(item.event_id).trim();
    const id=String(item&&item.id||'').trim();
    const revision=Math.max(1,Number(item&&item.revision)||1);
    return id?`${id}:${revision}`:'';
  }

  function normalizeUpdates(value){
    if(!Array.isArray(value))return [];
    const seen=new Set();
    const valid=[];
    for(const raw of value){
      if(!raw||typeof raw!=='object')continue;
      const id=String(raw.id||'').trim();
      const published=String(raw.published||'').trim();
      const updated=String(raw.updated||'').trim();
      const revision=Math.max(1,Number(raw.revision)||1);
      const kind=raw.kind==='updated'?'updated':'new';
      const title=String(raw.title||'').trim();
      const titleEn=String(raw.title_en||'').trim();
      const description=String(raw.description||'').trim();
      const descriptionEn=String(raw.description_en||'').trim();
      const url=String(raw.url||'').trim();
      const urlEn=String(raw.url_en||'').trim();
      const key=eventKey({...raw,id,revision});
      if(!id||!key||seen.has(key)||!validDate(published)||!validDate(updated)||!title||!/^\/for-doctors\//.test(url))continue;
      if(urlEn&&!/^\/en\/for-doctors\//.test(urlEn))continue;
      seen.add(key);
      valid.push({
        id,
        event_id:key,
        published,
        updated,
        revision,
        kind,
        title,
        title_en:titleEn||title,
        description,
        description_en:descriptionEn||description,
        url,
        url_en:urlEn||url,
      });
    }
    return valid.sort((a,b)=>b.updated.localeCompare(a.updated)||b.revision-a.revision||a.id.localeCompare(b.id));
  }

  function localizeItem(item,lang){
    const en=String(lang||'').toLowerCase().startsWith('en');
    return en
      ?{title:item.title_en||item.title,description:item.description_en||item.description,url:item.url_en||item.url}
      :{title:item.title||item.title_en,description:item.description||item.description_en,url:item.url||item.url_en};
  }

  function readSeen(storage){
    try{
      const value=JSON.parse(storage&&storage.getItem?storage.getItem(STORAGE_KEY)||'[]':'[]');
      return new Set(Array.isArray(value)?value.filter(item=>typeof item==='string'&&item):[]);
    }catch(_){return new Set();}
  }

  function writeSeen(storage,seen){
    try{
      if(!storage||typeof storage.setItem!=='function')return false;
      storage.setItem(STORAGE_KEY,JSON.stringify([...seen]));
      return true;
    }catch(_){return false;}
  }

  function unreadEventIds(items,seen){
    return items.map(eventKey).filter(Boolean).filter(key=>!seen.has(key));
  }

  function withReadEvent(seen,item){
    const next=new Set(seen);
    const key=eventKey(item);
    if(key)next.add(key);
    return next;
  }

  function withAllRead(items,seen){
    const next=new Set(seen);
    for(const item of items){
      const key=eventKey(item);
      if(key)next.add(key);
    }
    return next;
  }

  function sendGoal(root,goal){
    try{
      if(!root||!root.localStorage||root.localStorage.getItem(CONSENT_KEY)!=='analytics'||typeof root.ym!=='function')return false;
      root.ym(METRIKA_ID,'reachGoal',goal);
      return true;
    }catch(_){return false;}
  }

  function strings(lang){
    const en=String(lang||'').toLowerCase().startsWith('en');
    return en?{
      toggle:'What’s new',unread:n=>`What’s new: ${n} unread`,section:'Updates',title:'What’s new',markAll:'Mark all read',empty:'No new clinical materials yet.',newLabel:'NEW',updatedLabel:'UPDATED'
    }:{
      toggle:'Что нового',unread:n=>`Что нового: ${n} непросмотренных`,section:'Обновления',title:'Что нового',markAll:'Прочитать всё',empty:'Пока новых клинических материалов нет.',newLabel:'НОВОЕ',updatedLabel:'ОБНОВЛЕНО'
    };
  }

  function formatDate(value,lang){
    try{
      return new Intl.DateTimeFormat(String(lang||'').toLowerCase().startsWith('en')?'en-GB':'ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T00:00:00'));
    }catch(_){return value;}
  }

  function init(root,doc){
    if(!root||!doc)return;
    const host=doc.getElementById('doctors-updates');
    const toggle=doc.getElementById('doctors-updates-toggle');
    const count=doc.getElementById('doctors-updates-count');
    const panel=doc.getElementById('doctors-updates-panel');
    const list=doc.getElementById('doctors-updates-list');
    const markAll=doc.getElementById('doctors-updates-mark-all');
    const sectionLabel=doc.getElementById('doctors-updates-section-label');
    const titleNode=doc.getElementById('doctors-updates-title');
    if(!host||!toggle||!count||!panel||!list||!markAll)return;

    const lang=(doc.documentElement&&doc.documentElement.lang)||'ru';
    const T=strings(lang);
    if(sectionLabel)sectionLabel.textContent=T.section;
    if(titleNode)titleNode.textContent=T.title;
    markAll.textContent=T.markAll;
    let items=[];
    let seen=readSeen(root.localStorage);

    function updateCount(){
      const unread=unreadEventIds(items,seen).length;
      count.textContent=String(unread);
      count.hidden=unread===0;
      toggle.classList.toggle('has-updates',unread>0);
      toggle.setAttribute('aria-label',unread>0?T.unread(unread):T.toggle);
      markAll.disabled=unread===0;
    }

    function closePanel(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
    function openPanel(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');sendGoal(root,'doctors_updates_open');}

    function markOne(item){
      seen=withReadEvent(seen,item);
      writeSeen(root.localStorage,seen);
      updateCount();
    }

    function makeItem(item){
      const localized=localizeItem(item,lang);
      const link=doc.createElement('a');
      link.className='doctors-update-item';
      link.href=localized.url;
      const isNew=!seen.has(eventKey(item));
      if(isNew)link.classList.add('is-new');

      const meta=doc.createElement('div');
      meta.className='doctors-update-meta';
      if(isNew){
        const label=doc.createElement('span');
        label.className='doctors-update-new';
        label.textContent=item.kind==='updated'?T.updatedLabel:T.newLabel;
        meta.append(label);
      }
      const time=doc.createElement('time');
      time.dateTime=item.updated;
      time.textContent=formatDate(item.updated,lang);
      meta.append(time);

      const heading=doc.createElement('h3');
      heading.textContent=localized.title;
      const description=doc.createElement('p');
      description.textContent=localized.description||(item.kind==='updated'?T.updatedLabel:T.newLabel);
      const arrow=doc.createElement('span');
      arrow.className='doctors-update-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='→';
      link.append(meta,heading,description,arrow);
      link.addEventListener('click',function(){markOne(item);sendGoal(root,'doctors_update_click');});
      return link;
    }

    function render(){
      list.textContent='';
      if(!items.length){
        const empty=doc.createElement('p');
        empty.className='doctors-updates-empty';
        empty.textContent=T.empty;
        list.append(empty);
        updateCount();
        return;
      }
      const fragment=doc.createDocumentFragment();
      for(const item of items)fragment.append(makeItem(item));
      list.append(fragment);
      updateCount();
    }

    toggle.addEventListener('click',function(){panel.hidden?openPanel():closePanel();});
    markAll.addEventListener('click',function(){
      if(!unreadEventIds(items,seen).length)return;
      seen=withAllRead(items,seen);
      writeSeen(root.localStorage,seen);
      render();
      sendGoal(root,'doctors_updates_mark_read');
    });
    doc.addEventListener('click',function(event){if(!panel.hidden&&!host.contains(event.target))closePanel();});
    doc.addEventListener('keydown',function(event){if(event.key==='Escape'&&!panel.hidden){closePanel();toggle.focus();}});

    const fetcher=typeof root.fetch==='function'?root.fetch.bind(root):null;
    if(!fetcher){render();return;}
    fetcher(FEED_URL,{credentials:'same-origin',cache:'no-cache'})
      .then(response=>response.ok?response.json():Promise.reject(new Error('doctor updates feed unavailable')))
      .then(data=>{items=normalizeUpdates(data);render();})
      .catch(()=>{items=[];render();});
  }

  return {STORAGE_KEY,normalizeUpdates,eventKey,localizeItem,readSeen,writeSeen,unreadEventIds,withReadEvent,withAllRead,sendGoal,init};
});
