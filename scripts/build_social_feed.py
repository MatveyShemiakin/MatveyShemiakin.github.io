import datetime,html,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def render_cards(posts,lang):
 if not posts:return '<p class="social-empty">'+('Публикации ещё не поступили. Пока можно читать канал в Telegram.' if lang=='ru' else 'Posts have not arrived yet. You can read the channel on Telegram.')+'</p>'
 groups={}
 for p in sorted(posts,key=lambda x:x.get('date',0),reverse=True):groups.setdefault(p.get('album') or p['id'],[]).append(p)
 out=[]
 for group in groups.values():
  p=group[0];url=p.get('url','');url=url if url.startswith('https://t.me/DrShemMYu/') else 'https://t.me/DrShemMYu'
  text='\n\n'.join(dict.fromkeys(x.get('text','') for x in group if x.get('text')))
  date=datetime.datetime.fromtimestamp(p.get('date',0),datetime.timezone.utc).strftime('%Y-%m-%d')
  covers=''.join('<img loading="lazy" src="'+html.escape(x['cover'],quote=True)+'" alt="" width="800" height="600">' for x in group if x.get('cover','').startswith('/social/media/'))
  out.append(f'<article class="social-card"><div class="social-meta">Telegram · <time datetime="{date}">{date}</time></div>{covers}<p class="social-caption">{html.escape(text)}</p><a class="button ghost" href="{html.escape(url,quote=True)}" target="_blank" rel="noopener noreferrer">'+('Открыть в Telegram ↗' if lang=='ru' else 'View on Telegram ↗')+'</a></article>')
 return '\n'.join(out)
def render_guide(lang):
 title='Здоровье в повседневной жизни' if lang=='ru' else 'Everyday health — a practical guide (Russian)'
 desc='Пять привычек из ролика: сон, движение, питание, хобби и психологическое здоровье. Фото, практические шаги и научные источники.' if lang=='ru' else 'Five habits from the video, practical steps and scientific sources. The guide is available in Russian.'
 label='Авторская памятка' if lang=='ru' else 'Author’s guide'
 button='Открыть памятку →' if lang=='ru' else 'Read the guide →'
 return f'<section class="section social-guide-section"><article class="social-card social-guide-card"><img src="/assets/portrait.jpg" alt="Матвей Шемякин" width="1200" height="1800" loading="lazy"><div><div class="eyebrow">{label}</div><h2>{title}</h2><p>{desc}</p><a class="button primary" href="/social/health/">{button}</a></div></article></section>'

def build_pages(posts):
 for lang,prefix in [('ru',''),('en','/en')]:
  title='Публикации из соцсетей' if lang=='ru' else 'Social media posts'
  name='Матвей Шемякин' if lang=='ru' else 'Matvey Shemyakin'
  source=(ROOT/('en/collaboration/index.html' if lang=='en' else 'collaboration/index.html')).read_text()
  import re
  head=source[:source.index('<main>')]
  head=re.sub(r'<title>.*?</title>',f'<title>{title} — {name}</title>',head)
  head=head.replace('/en/collaboration/"','/en/social/"').replace('/collaboration/"','/social/"')
  head=re.sub(r'<meta name="description"[^>]*>',f'<meta name="description" content="{title} — {name}. Telegram.">',head)
  head=head.replace('</head>','<link rel="stylesheet" href="/social-feed.css"></head>')
  main=f'<main><section class="section hero"><div class="eyebrow">{name} · Telegram</div><h1>{title}</h1><p class="hero-copy">'+('Новые заметки, профессиональные события и материалы из моего Telegram-канала.' if lang=='ru' else 'New notes, professional events and posts from my Telegram channel.')+f'</p><a class="button primary" href="https://t.me/DrShemMYu" target="_blank" rel="noopener noreferrer">Telegram ↗</a></section>{render_guide(lang)}<section class="section social-grid">{render_cards(posts,lang)}</section></main>'
  tail=source[source.index('</main>')+len('</main>'):]
  tail=tail.replace('/en/collaboration/"','/en/social/"').replace('/collaboration/"','/social/"')
  tail=re.sub(r'<div class="mobile-cta".*?</div>', '<div class="mobile-cta"><a class="button primary" href="https://t.me/DrShemMYu" target="_blank" rel="noopener noreferrer">'+('Открыть Telegram ↗' if lang=='ru' else 'View Telegram ↗')+'</a></div>',tail)
  head=head.replace(' aria-current="page"','').replace('site-mega-nav.js?v=20260816-2','site-mega-nav.js?v=20261024-2')
  tail=tail.replace('site-mega-nav.js?v=20260816-2','site-mega-nav.js?v=20261024-2')
  folder=ROOT/(prefix.strip('/')+'/social' if prefix else 'social');folder.mkdir(parents=True,exist_ok=True);(folder/'index.html').write_text(head+main+tail)
if __name__=='__main__':
 path=ROOT/'social/feed.json';posts=json.loads(path.read_text()) if path.exists() else [];build_pages(posts)
