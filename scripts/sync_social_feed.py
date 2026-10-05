import hashlib,json,os,sys,urllib.request
from pathlib import Path
from setup_social_telegram import api,tg,derived,ROOT
from build_social_feed import build_pages

def main():
 token=os.environ['TELEGRAM_BOT_TOKEN'];endpoint=os.environ['SOCIAL_ENDPOINT']
 payload=api(endpoint+'/export',derived(token,'export'))
 posts=payload['posts'];feed=ROOT/'social/feed.json';previous=json.loads(feed.read_text()) if feed.exists() else []
 covers={p['id']:p.get('cover') for p in previous}
 media=ROOT/'social/media';media.mkdir(parents=True,exist_ok=True)
 for post in posts:
  cover=covers.get(post['id'])
  if post.get('cover_file_id'):
   try:
    info=tg(token,'getFile',{'file_id':post['cover_file_id']});path=info['file_path']
    if '..' in path or not path.startswith(('photos/','thumbnails/')):raise ValueError('Unexpected media path')
    if info.get('file_size',0)>8000000:raise ValueError('Large cover')
    req=urllib.request.Request('https://api.telegram.org/file/bot'+token+'/'+path)
    with urllib.request.urlopen(req,timeout=30) as r:data=r.read(8000001)
    if len(data)>8000000:raise ValueError('Large cover')
    if not (data.startswith(b'\xff\xd8\xff') or data.startswith(b'\x89PNG')):raise ValueError('Unsupported image')
    ext='.jpg' if data.startswith(b'\xff\xd8') else '.png'
    name=hashlib.sha256(post['cover_file_id'].encode()).hexdigest()[:24]+ext
    (media/name).write_bytes(data);cover='/social/media/'+name
   except Exception:print('Cover unavailable; retaining previous cover if present')
  post.pop('cover_file_id',None)
  if cover:post['cover']=cover
 excludes=ROOT/'social/excluded.json';ids=json.loads(excludes.read_text()) if excludes.exists() else []
 merged={p['id']:p for p in previous}
 for p in posts:
  if p['id'] not in merged or (p.get('edited') or p.get('date',0),p.get('update_id',0))>=(merged[p['id']].get('edited') or merged[p['id']].get('date',0),merged[p['id']].get('update_id',0)):merged[p['id']]=p
 posts=sorted((p for p in merged.values() if p['id'] not in ids),key=lambda p:p.get('date',0),reverse=True)
 feed.write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n');build_pages(posts)
 print('Public feed generated: '+str(len(posts))+' records')
if __name__=='__main__':
 try:main()
 except Exception as e:print('Sync failed: '+type(e).__name__+'; previous published feed retained',file=sys.stderr);sys.exit(1)
