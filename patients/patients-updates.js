(function(factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  api.init(window,document);
})(function(){
  'use strict';

  const METRIKA_ID=111504350;
  const CONSENT_KEY='site_cookie_choice';
  const STORAGE_KEY='patient_updates_read_v1';
  const FEED_URL='/patients/updates.json';

  function normalizeUpdates(value){
    if(!Array.isArray(value))return [];
    const seen=new Set();
    const valid=[];
    for(const item of value){
      if(!item||typeof item!=='object')continue;
      const id=String(item.id||'').trim();
      const published=String(item.published||'').trim();
      const title=String(item.title||'').trim();
      const description=String(item.description||'').trim();
      const url=String(item.url||'').trim();
      if(!id||seen.has(id)||!/^\d{4}-\d{2}-\d{2}$/.test(published)||!title||!description||!/^\/patients\//.test(url))continue;
      const timestamp=Date.parse(published+'T00:00:00Z');
      if(!Number.isFinite(timestamp))continue;
      seen.add(id);
      valid.push({id,published,title,description,url,timestamp});
    }
    return valid.sort((a,b)=>b.timestamp-a.timestamp).map(({timestamp,...item})=>item);
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

  function unreadIds(items,seen){
    return items.filter(item=>!seen.has(item.id)).map(item=>item.id);
  }

  function withReadId(seen,id){
    const next=new Set(seen);
    if(id)next.add(id);
    return next;
  }

  function withAllRead(items,seen){
    const next=new Set(seen);
    for(const item of items)next.add(item.id);
    return next;
  }

  function sendGoal(root,goal){
    try{
      if(!root||!root.localStorage||root.localStorage.getItem(CONSENT_KEY)!=='analytics'||typeof root.ym!=='function')return false;
      root.ym(METRIKA_ID,'reachGoal',goal);
      return true;
    }catch(_){return false;}
  }

  function formatDate(value){
    try{
      return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T00:00:00'));
    }catch(_){return value;}
  }

  function init(root,doc){
    if(!root||!doc)return;
    const host=doc.getElementById('patient-updates');
    const toggle=doc.getElementById('patient-updates-toggle');
    const count=doc.getElementById('patient-updates-count');
    const panel=doc.getElementById('patient-updates-panel');
    const list=doc.getElementById('patient-updates-list');
    const markAll=doc.getElementById('patient-updates-mark-all');
    if(!host||!toggle||!count||!panel||!list||!markAll)return;

    let items=[];
    let seen=readSeen(root.localStorage);

    function updateCount(){
      const unread=unreadIds(items,seen).length;
      count.textContent=String(unread);
      count.hidden=unread===0;
      toggle.classList.toggle('has-updates',unread>0);
      toggle.setAttribute('aria-label',unread>0?`Что нового: ${unread} непросмотренных`:'Что нового');
      markAll.disabled=unread===0;
    }

    function closePanel(){
      panel.hidden=true;
      toggle.setAttribute('aria-expanded','false');
    }

    function openPanel(){
      panel.hidden=false;
      toggle.setAttribute('aria-expanded','true');
      sendGoal(root,'updates_open');
    }

    function markOne(id){
      seen=withReadId(seen,id);
      writeSeen(root.localStorage,seen);
      updateCount();
    }

    function makeItem(item){
      const link=doc.createElement('a');
      link.className='patient-update-item';
      link.href=item.url;
      const isNew=!seen.has(item.id);
      if(isNew)link.classList.add('is-new');

      const meta=doc.createElement('div');
      meta.className='patient-update-meta';
      if(isNew){
        const label=doc.createElement('span');
        label.className='patient-update-new';
        label.textContent='НОВОЕ';
        meta.append(label);
      }
      const time=doc.createElement('time');
      time.dateTime=item.published;
      time.textContent=formatDate(item.published);
      meta.append(time);

      const title=doc.createElement('h3');
      title.textContent=item.title;
      const description=doc.createElement('p');
      description.textContent=item.description;
      const arrow=doc.createElement('span');
      arrow.className='patient-update-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='→';

      link.append(meta,title,description,arrow);
      link.addEventListener('click',function(){
        markOne(item.id);
        sendGoal(root,'update_click');
      });
      return link;
    }

    function render(){
      list.textContent='';
      if(!items.length){
        const empty=doc.createElement('p');
        empty.className='patient-updates-empty';
        empty.textContent='Пока новых материалов нет.';
        list.append(empty);
        updateCount();
        return;
      }
      const fragment=doc.createDocumentFragment();
      for(const item of items)fragment.append(makeItem(item));
      list.append(fragment);
      updateCount();
    }

    toggle.addEventListener('click',function(){
      if(panel.hidden)openPanel();else closePanel();
    });

    markAll.addEventListener('click',function(){
      if(!unreadIds(items,seen).length)return;
      seen=withAllRead(items,seen);
      writeSeen(root.localStorage,seen);
      render();
      sendGoal(root,'updates_mark_read');
    });

    doc.addEventListener('click',function(event){
      if(panel.hidden||host.contains(event.target))return;
      closePanel();
    });

    doc.addEventListener('keydown',function(event){
      if(event.key!=='Escape'||panel.hidden)return;
      closePanel();
      toggle.focus();
    });

    const fetcher=typeof root.fetch==='function'?root.fetch.bind(root):null;
    if(!fetcher){render();return;}
    fetcher(FEED_URL,{credentials:'same-origin',cache:'no-cache'})
      .then(response=>response.ok?response.json():Promise.reject(new Error('updates feed unavailable')))
      .then(data=>{items=normalizeUpdates(data);render();})
      .catch(()=>{items=[];render();});
  }

  return {normalizeUpdates,readSeen,writeSeen,unreadIds,withReadId,withAllRead,sendGoal,init};
});
