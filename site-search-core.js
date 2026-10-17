(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SiteSearch=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const words=value=>normalize(value).split(/\s+/).filter(Boolean);
  function stem(word){
    if(/^[а-я]+$/.test(word)&&word.length>4){
      return word.replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|ий|ый|ой|ая|яя|ое|ее|ые|ие|ов|ев|ей|ам|ям|ах|ях|ом|ем|ию|ия|ью|а|я|ы|и|у|ю|е|о)$/,'');
    }
    return word.length>4?word.replace(/(ing|es|s)$/,''):word;
  }
  const terms=value=>words(value).map(stem);
  const safeURL=url=>typeof url==='string'&&/^\/(?!\/)/.test(url)&&!/[\u0000-\u0020\\]/.test(url);
  function search(records,query,lang){
    const needles=[...new Set(terms(String(query).slice(0,200)))];
    if(!needles.length)return [];
    const phrase=normalize(query);
    const seen=new Set();
    return records.filter(item=>safeURL(item.url)).map(item=>{
      const title=terms(item.title),page=terms(item.page),body=terms(item.text);
      const match=(list,term)=>list.some(word=>word===term||(term.length>=4&&word.startsWith(term)));
      let score=0;
      for(const term of needles){
        const inTitle=match(title,term),inPage=match(page,term),inBody=match(body,term);
        if(!inTitle&&!inPage&&!inBody)return null;
        score+=(inTitle?16:0)+(inPage?4:0)+(inBody?2:0);
      }
      if(normalize(item.title)===phrase)score+=40;
      else if(normalize(item.title).includes(phrase))score+=20;
      if(normalize(item.text).includes(phrase))score+=4;
      if(item.lang===lang)score+=1;
      return {...item,score};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).filter(item=>{
      if(seen.has(item.url))return false;
      seen.add(item.url);return true;
    });
  }
  function snippet(value,query){
    const text=String(value||'').replace(/\s+/g,' ').trim();
    const needles=terms(query);
    const tokens=[...text.matchAll(/[\p{L}\p{N}]+/gu)];
    const hit=tokens.find(token=>needles.some(n=>stem(normalize(token[0])).startsWith(n)));
    let start=hit?Math.max(0,hit.index-65):0;
    if(start)start=text.indexOf(' ',start)+1||start;
    let end=Math.min(text.length,start+210);
    if(end<text.length){const space=text.lastIndexOf(' ',end);if(space>start)end=space;}
    return (start?'…':'')+text.slice(start,end)+(end<text.length?'…':'');
  }
  return {normalize,stem,terms,search,snippet,safeURL};
});
