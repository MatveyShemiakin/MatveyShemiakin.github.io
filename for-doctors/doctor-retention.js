(function(factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  api.init(window,document);
})(function(){
  'use strict';

  const METRIKA_ID=111504350;
  const CONSENT_KEY='site_cookie_choice';
  const TOPICS_KEY='doctor_topics_v1';
  const BOOKMARKS_KEY='doctor_bookmarks_v1';
  const CONTINUE_KEY='doctor_continue_v1';
  const LAST_VISIT_KEY='doctor_last_visit_v1';
  const FEED_URL='/for-doctors/updates.json';
  const TOPIC_RE=/^[a-z0-9-]+$/;

  function normalizeTopics(value){
    if(!Array.isArray(value))return [];
    const result=[];
    const seen=new Set();
    for(const raw of value){
      const topic=String(raw||'').trim().toLowerCase();
      if(!topic||!TOPIC_RE.test(topic)||seen.has(topic))continue;
      seen.add(topic);
      result.push(topic);
    }
    return result;
  }

  function toggleTopic(value,topic){
    const topics=normalizeTopics(value);
    const normalized=normalizeTopics([topic])[0];
    if(!normalized)return topics;
    return topics.includes(normalized)?topics.filter(item=>item!==normalized):[...topics,normalized];
  }

  function readJson(storage,key,fallback){
    try{
      if(!storage||typeof storage.getItem!=='function')return fallback;
      const raw=storage.getItem(key);
      if(raw===null||raw==='')return fallback;
      return JSON.parse(raw);
    }catch(_){return fallback;}
  }

  function writeJson(storage,key,value){
    try{
      if(!storage||typeof storage.setItem!=='function')return false;
      storage.setItem(key,JSON.stringify(value));
      return true;
    }catch(_){return false;}
  }

  function topicOverlap(itemTopics,selected){
    const wanted=new Set(normalizeTopics(selected));
    if(!wanted.size)return true;
    return normalizeTopics(itemTopics).some(topic=>wanted.has(topic));
  }

  function newSinceVisit(items,lastVisit,topics){
    const prior=String(lastVisit||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(prior)||!Array.isArray(items))return [];
    return items.filter(item=>{
      const updated=String(item&&item.updated||'');
      return /^\d{4}-\d{2}-\d{2}$/.test(updated)&&updated>prior&&topicOverlap(item.topics,topics);
    });
  }

  function upsertBookmark(value,item){
    const list=Array.isArray(value)?value.filter(entry=>entry&&typeof entry==='object'):[];
    const url=String(item&&item.url||'').trim();
    if(!/^\/(?:en\/)?for-doctors\//.test(url))return list;
    const next={
      url,
      title:String(item.title||'').trim()||url,
      topics:normalizeTopics(item.topics),
      saved_at:String(item.saved_at||new Date().toISOString()),
    };
    return [next,...list.filter(entry=>String(entry.url||'')!==url)]
      .sort((a,b)=>String(b.saved_at||'').localeCompare(String(a.saved_at||'')))
      .slice(0,30);
  }

  function removeBookmark(value,url){
    const target=String(url||'');
    return (Array.isArray(value)?value:[]).filter(entry=>entry&&String(entry.url||'')!==target);
  }

  function upsertProgress(value,item){
    const list=Array.isArray(value)?value.filter(entry=>entry&&typeof entry==='object'):[];
    const url=String(item&&item.url||'').trim();
    if(!/^\/(?:en\/)?for-doctors\//.test(url))return list;
    const ratio=Math.min(1,Math.max(0,Number(item.ratio)||0));
    const next={
      url,
      title:String(item.title||'').trim()||url,
      heading:String(item.heading||'').trim(),
      ratio,
      updated_at:String(item.updated_at||new Date().toISOString()),
    };
    return [next,...list.filter(entry=>String(entry.url||'')!==url)]
      .sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))
      .slice(0,8);
  }

  function relatedItems(items,currentId,currentTopics,limit){
    const source=Array.isArray(items)?items:[];
    const wanted=new Set(normalizeTopics(currentTopics));
    const scored=source
      .filter(item=>item&&String(item.id||'')!==String(currentId||''))
      .map(item=>({
        item,
        score:normalizeTopics(item.topics).filter(topic=>wanted.has(topic)).length,
      }));
    scored.sort((a,b)=>b.score-a.score||String(b.item.updated||'').localeCompare(String(a.item.updated||''))||String(a.item.id||'').localeCompare(String(b.item.id||'')));
    return scored.slice(0,Math.max(0,Number(limit)||3)).map(entry=>entry.item);
  }

  function sendGoal(root,goal){
    try{
      if(!root||!root.localStorage||root.localStorage.getItem(CONSENT_KEY)!=='analytics'||typeof root.ym!=='function')return false;
      root.ym(METRIKA_ID,'reachGoal',goal);
      return true;
    }catch(_){return false;}
  }

  function localized(item,lang){
    const en=String(lang||'').toLowerCase().startsWith('en');
    return {
      title:en?(item.title_en||item.title):(item.title||item.title_en),
      description:en?(item.description_en||item.description):(item.description||item.description_en),
      url:en?(item.url_en||item.url):(item.url||item.url_en),
    };
  }

  function normalizeFeed(value){
    if(!Array.isArray(value))return [];
    return value.filter(item=>item&&typeof item==='object'&&String(item.id||'')&&String(item.updated||''))
      .map(item=>({...item,topics:normalizeTopics(item.topics)}));
  }

  function strings(lang){
    const en=String(lang||'').toLowerCase().startsWith('en');
    return en?{
      noReturn:'Choose topics to make this workspace more useful on your next visit.',
      returnOne:'1 professional update since your last visit.',
      returnMany:n=>`${n} professional updates since your last visit.`,
      noContinue:'Your recently read materials will appear here.',
      noSaved:'Save useful materials to keep them here.',
      noPersonal:'Choose topics to personalize this section.',
      saved:'Saved',save:'Save',progress:n=>`${Math.round(n*100)}% read`,
    }:{
      noReturn:'Выберите темы — при следующем визите здесь появятся обновления именно по вашим интересам.',
      returnOne:'1 профессиональное обновление с вашего последнего визита.',
      returnMany:n=>`${n} профессиональных обновления с вашего последнего визита.`,
      noContinue:'Недавно прочитанные материалы появятся здесь автоматически.',
      noSaved:'Сохраняйте полезные материалы — они будут доступны здесь.',
      noPersonal:'Выберите темы, чтобы персонализировать этот блок.',
      saved:'Сохранено',save:'Сохранить',progress:n=>`Прочитано ${Math.round(n*100)}%`,
    };
  }

  function makeLink(doc,item,lang,extra){
    const data=localized(item,lang);
    const link=doc.createElement('a');
    link.className='doctor-workspace-link';
    link.href=data.url;
    const title=doc.createElement('strong');
    title.textContent=data.title;
    const meta=doc.createElement('span');
    meta.textContent=extra||data.description||'';
    link.append(title,meta);
    return link;
  }

  function renderList(doc,node,items,lang,emptyText,extraFn){
    if(!node)return;
    node.textContent='';
    if(!items.length){
      const empty=doc.createElement('p');
      empty.className='doctor-workspace-empty';
      empty.textContent=emptyText;
      node.append(empty);
      return;
    }
    const fragment=doc.createDocumentFragment();
    for(const item of items)fragment.append(makeLink(doc,item,lang,extraFn?extraFn(item):''));
    node.append(fragment);
  }

  function currentHeading(doc){
    const headings=[...doc.querySelectorAll('main h2, main h3')];
    let active='';
    for(const heading of headings){
      if(heading.getBoundingClientRect().top<=160)active=(heading.textContent||'').trim();
      else break;
    }
    return active;
  }

  function init(root,doc){
    if(!root||!doc)return;
    const lang=(doc.documentElement&&doc.documentElement.lang)||'ru';
    const T=strings(lang);
    const storage=root.localStorage;
    const hub=doc.getElementById('doctor-workspace');
    const bookmarkButton=doc.getElementById('doctor-bookmark-toggle');
    const relatedNode=doc.getElementById('doctor-related-list');
    const telegramLinks=[...doc.querySelectorAll('[data-doctor-telegram]')];
    for(const link of telegramLinks)link.addEventListener('click',()=>sendGoal(root,'doctor_telegram_click'));

    const fetcher=typeof root.fetch==='function'?root.fetch.bind(root):null;
    if(!fetcher)return;
    fetcher(FEED_URL,{credentials:'same-origin',cache:'no-cache'})
      .then(response=>response.ok?response.json():Promise.reject(new Error('clinician feed unavailable')))
      .then(raw=>{
        const items=normalizeFeed(raw);
        const topics=normalizeTopics(readJson(storage,TOPICS_KEY,[]));

        if(hub){
          const summary=doc.getElementById('doctor-return-summary');
          const topicList=doc.getElementById('doctor-topic-list');
          const continueList=doc.getElementById('doctor-continue-list');
          const bookmarkList=doc.getElementById('doctor-bookmark-list');
          const personalList=doc.getElementById('doctor-personal-list');
          const previousVisit=storage&&typeof storage.getItem==='function'?storage.getItem(LAST_VISIT_KEY):'';
          const fresh=newSinceVisit(items,previousVisit,topics);
          if(summary){
            summary.textContent=!previousVisit?T.noReturn:(fresh.length===1?T.returnOne:(fresh.length?T.returnMany(fresh.length):T.noReturn));
          }
          if(previousVisit&&fresh.length)sendGoal(root,'doctor_return_visit');

          const topicLabels=String(lang).toLowerCase().startsWith('en')?{
            'cataract-iol':'Cataract / IOL','cornea':'Cornea','glaucoma':'Glaucoma','retina':'Retina','drugs':'Drugs','research':'Research','events':'Events'
          }:{
            'cataract-iol':'Катаракта / ИОЛ','cornea':'Роговица','glaucoma':'Глаукома','retina':'Сетчатка','drugs':'Препараты','research':'Исследования','events':'События'
          };
          if(topicList){
            topicList.textContent='';
            for(const [topic,labelText] of Object.entries(topicLabels)){
              const button=doc.createElement('button');
              button.type='button';
              button.className='doctor-topic-chip';
              button.textContent=labelText;
              button.setAttribute('aria-pressed',topics.includes(topic)?'true':'false');
              button.addEventListener('click',function(){
                const current=normalizeTopics(readJson(storage,TOPICS_KEY,[]));
                const next=toggleTopic(current,topic);
                writeJson(storage,TOPICS_KEY,next);
                sendGoal(root,'doctor_topic_follow');
                root.location.reload();
              });
              topicList.append(button);
            }
          }

          const progress=readJson(storage,CONTINUE_KEY,[]);
          renderList(doc,continueList,Array.isArray(progress)?progress.slice(0,3):[],lang,T.noContinue,item=>`${item.heading?item.heading+' · ':''}${T.progress(Number(item.ratio)||0)}`);
          if(continueList){for(const link of continueList.querySelectorAll('a'))link.addEventListener('click',()=>sendGoal(root,'doctor_continue_open'));}

          const bookmarks=readJson(storage,BOOKMARKS_KEY,[]);
          renderList(doc,bookmarkList,Array.isArray(bookmarks)?bookmarks.slice(0,4):[],lang,T.noSaved,()=>T.saved);

          const personal=topics.length?items.filter(item=>topicOverlap(item.topics,topics)).slice(0,4):items.slice(0,4);
          renderList(doc,personalList,personal,lang,T.noPersonal,item=>String(item.updated||''));

          try{if(storage&&typeof storage.setItem==='function')storage.setItem(LAST_VISIT_KEY,new Date().toISOString());}catch(_){}
        }

        const pathname=root.location&&root.location.pathname?root.location.pathname:'';
        const current=items.find(item=>localized(item,lang).url===pathname||localized(item,lang).url===pathname.replace(/index\.html$/,''));
        if(current&&bookmarkButton){
          function bookmarks(){const value=readJson(storage,BOOKMARKS_KEY,[]);return Array.isArray(value)?value:[];}
          function isSaved(){return bookmarks().some(item=>String(item.url||'')===localized(current,lang).url);}
          function paint(){const saved=isSaved();bookmarkButton.textContent=saved?T.saved:T.save;bookmarkButton.setAttribute('aria-pressed',saved?'true':'false');}
          paint();
          bookmarkButton.addEventListener('click',function(){
            const data=localized(current,lang);
            const value=bookmarks();
            if(isSaved()){
              writeJson(storage,BOOKMARKS_KEY,removeBookmark(value,data.url));
              sendGoal(root,'doctor_bookmark_remove');
            }else{
              writeJson(storage,BOOKMARKS_KEY,upsertBookmark(value,{url:data.url,title:data.title,topics:current.topics,saved_at:new Date().toISOString()}));
              sendGoal(root,'doctor_bookmark_add');
            }
            paint();
          });
        }

        if(current&&relatedNode){
          const related=relatedItems(items,current.id,current.topics,3);
          renderList(doc,relatedNode,related,lang,'');
          for(const link of relatedNode.querySelectorAll('a'))link.addEventListener('click',()=>sendGoal(root,'doctor_related_open'));
        }

        if(current&&pathname&&doc.querySelector('main')){
          let ticking=false;
          const saveProgress=function(){
            ticking=false;
            const main=doc.querySelector('main');
            if(!main)return;
            const max=Math.max(1,(doc.documentElement.scrollHeight||0)-(root.innerHeight||0));
            const ratio=Math.min(1,Math.max(0,(root.scrollY||0)/max));
            if(ratio<.04)return;
            const data=localized(current,lang);
            const value=readJson(storage,CONTINUE_KEY,[]);
            writeJson(storage,CONTINUE_KEY,upsertProgress(value,{url:data.url,title:data.title,heading:currentHeading(doc),ratio,updated_at:new Date().toISOString()}));
          };
          root.addEventListener('scroll',function(){
            if(ticking)return;
            ticking=true;
            if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(saveProgress);else setTimeout(saveProgress,100);
          },{passive:true});
        }
      })
      .catch(()=>{});
  }

  return {
    TOPICS_KEY,BOOKMARKS_KEY,CONTINUE_KEY,LAST_VISIT_KEY,
    normalizeTopics,toggleTopic,readJson,writeJson,newSinceVisit,
    upsertBookmark,removeBookmark,upsertProgress,relatedItems,sendGoal,init,
  };
});
