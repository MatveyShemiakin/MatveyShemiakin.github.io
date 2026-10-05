const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/health')return json({ok:true});
 if(u.pathname==='/export'&&request.method==='GET'){
  if(!env.EXPORT_SECRET||request.headers.get('Authorization')!==`Bearer ${env.EXPORT_SECRET}`)return json({ok:false},403);
  const latest=new Map();let cursor;do{const page=await env.POSTS.list({prefix:'post:',cursor});for(const k of page.keys){const v=await env.POSTS.get(k.name);if(v){const p=JSON.parse(v);if(!latest.has(p.id)||latest.get(p.id).update_id<p.update_id)latest.set(p.id,p);}}cursor=page.list_complete?undefined:page.cursor;}while(cursor);
  return json({posts:[...latest.values()]});
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
 await env.POSTS.put(`${key}:${update.update_id}`,JSON.stringify({id:key,update_id:update.update_id,source:'telegram',text,date:m.date,edited:m.edit_date||null,album:m.media_group_id||null,cover_file_id:cover||null,url:`https://t.me/DrShemMYu/${m.message_id}`}));
 return json({ok:true});
}};
