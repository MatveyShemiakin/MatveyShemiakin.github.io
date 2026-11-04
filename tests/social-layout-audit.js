(async()=>{
  'use strict';
  const frame=document.getElementById('page'),report=document.getElementById('report');
  const params=new URLSearchParams(location.search),rows=[],failures=[];
  localStorage.setItem('site_cookie_choice','essential');
  async function load(path,width,theme){
    localStorage.setItem('site_theme_v1',theme);
    frame.width=String(width);frame.height='844';
    await new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;setTimeout(resolve,150)};
      frame.onload=finish;frame.src=path+'?layout-audit='+theme+'-'+width;
      setTimeout(finish,2500);
    });
    return [frame.contentDocument,frame.contentWindow];
  }
  async function check(path,width,theme){
    const [doc,win]=await load(path,width,theme);
    const row={path,width,theme};rows.push(row);
    const require=(condition,reason)=>{if(!condition)failures.push({...row,reason})};
    require(Boolean(doc&&win&&doc.querySelector('main')),'Page did not load');
    if(!doc||!win)return;
    require(doc.documentElement.dataset.siteTheme===theme,'Wrong theme');
    require(doc.documentElement.scrollWidth<=win.innerWidth+1,'Horizontal page overflow');
    if(path.endsWith('/social/')){
      const card=doc.querySelector('.social-article-card');
      const image=card?.querySelector('img'),copy=card?.querySelector('h2')?.parentElement;
      require(Boolean(card&&image&&copy),'Article card missing');
      if(!card||!image||!copy)return;
      try{await image.decode()}catch(error){}
      const a=card.getBoundingClientRect(),b=image.getBoundingClientRect(),c=copy.getBoundingClientRect();
      row.cardRight=a.right;row.imageRight=b.right;row.viewport=win.innerWidth;
      require(image.naturalWidth>0,'Article image failed to load');
      require(b.left>=a.left-1&&b.right<=a.right+1,'Image extends outside the card');
      require(a.left>=-1&&a.right<=win.innerWidth+1,'Card extends outside the viewport');
      require(copy.scrollWidth<=copy.clientWidth+1,'Text is clipped or overflows');
      if(width<=700)require(b.bottom<=c.top+1,'Mobile image must precede the text');
      else require(b.right<=c.left+1,'Desktop image must precede the text');
    }else{
      const button=doc.querySelector('.patient-hero .hero-actions a');
      const prefix=path.startsWith('/en/')?'/en':'';
      require(button?.getAttribute('href')===prefix+'/social/','Patient button points outside the social section');
      require(button?.textContent.trim()===(prefix?'Social media posts':'Публикации из соцсетей'),'Wrong button label');
      require(!button?.hasAttribute('target'),'Internal social link must stay in the same tab');
    }
  }
  if(params.has('capture')){
    document.body.setAttribute('data-capture','');
    const kind=params.get('page')==='patients'?'patients':'social';
    const path=(params.get('lang')==='en'?'/en':'')+'/'+kind+'/';
    const [doc,win]=await load(path,Number(params.get('width'))||390,params.get('theme')==='dark'?'dark':'light');
    if(kind==='social')doc?.querySelector('.social-article-card')?.scrollIntoView();
    else doc?.querySelector('.patient-hero .hero-actions')?.scrollIntoView();
    document.body.dataset.auditStatus='passed';
    return;
  }
  for(const theme of ['light','dark'])for(const width of [320,390,768,1440])for(const path of ['/social/','/en/social/','/patients/','/en/patients/'])await check(path,width,theme);
  document.body.dataset.auditStatus=failures.length?'failed':'passed';
  report.textContent=JSON.stringify({checked:rows.length,failures,rows},null,2);
})().catch(error=>{document.body.dataset.auditStatus='failed';document.getElementById('report').textContent=String(error.stack||error)});
