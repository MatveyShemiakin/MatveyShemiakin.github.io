const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/health')return json({ok:true});
 if(u.pathname==='/export'&&request.method==='GET'){
  if(!env.EXPORT_SECRET||request.headers.get('Authorization')!==`Bearer ${env.EXPORT_SECRET}`)return json({ok:false},403);
  return env.POSTS.getByName('DrShemMYu').fetch(new Request('https://storage/export'));
 }
 if(u.pathname!=='/telegram'||request.method!=='POST')return json({ok:false},404);
 if(!env.WEBHOOK_SECRET||request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==env.WEBHOOK_SECRET)return json({ok:false},403);
 const raw=await request.text();if(raw.length>1048576)return json({ok:false},413);
 let update;try{update=JSON.parse(raw);}catch{return json({ok:false},400);}
 const m=update.channel_post||update.edited_channel_post;
 if(!m||m.chat?.type!=='channel'||m.chat.username!=='DrShemMYu')return json({ok:true});
 if(!Number.isSafeInteger(m.message_id)||!Number.isSafeInteger(m.chat.id)||!Number.isSafeInteger(update.update_id))return json({ok:false},400);
 const key=`post:${m.chat.id}:${m.message_id}`;
 const photos=Array.isArray(m.photo)?m.photo:[];
 const cover=photos.length?photos.at(-1)?.file_id:m.video?.thumbnail?.file_id;
 const text=String(m.text||m.caption||'').slice(0,20000);
 if(!text&&!cover)return json({ok:true});
 const stored=await env.POSTS.getByName('DrShemMYu').fetch(new Request('https://storage/record',{method:'POST',body:JSON.stringify({id:key,update_id:update.update_id,source:'telegram',text,date:m.date,edited:m.edit_date||null,album:m.media_group_id||null,cover_file_id:cover||null,url:`https://t.me/DrShemMYu/${m.message_id}`} )}));
 if(!stored.ok)return json({ok:false},503);
 return json({ok:true});
}};

export class SocialFeedStore {
 constructor(ctx){this.storage=ctx.storage;}
 async fetch(request){
  const u=new URL(request.url);
  if(u.pathname==='/record'&&request.method==='POST'){
   const post=await request.json();
   await this.storage.transaction(async tx=>{const old=await tx.get(post.id);if(!old||(old.edited||old.date)<(post.edited||post.date)||((old.edited||old.date)===(post.edited||post.date)&&old.update_id<post.update_id))await tx.put(post.id,post)});
   return json({ok:true});
  }
  if(u.pathname==='/export'){
   const posts=[];let startAfter;
   while(true){const page=await this.storage.list({prefix:'post:',limit:1000,...(startAfter?{startAfter}:{})});posts.push(...page.values());if(page.size<1000)break;startAfter=[...page.keys()].at(-1);}
   return json({posts});
  }
  return json({ok:false},404);
 }
}
