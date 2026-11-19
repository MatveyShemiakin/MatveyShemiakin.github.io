"""Apply the one shared header without reserializing any page content."""
from __future__ import annotations
import argparse
import hashlib
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from string import Template

ROOT=Path(__file__).resolve().parents[1]
CSS=('site-language-switch.css','site-theme.css','site-mega-nav.css','mobile-nav.css','site-header.css')
SCRIPTS=('site-language-switch.js','site-theme.js','site-mega-nav.js','mobile-nav.js')
PAGE_ASSETS=('for-doctors/simple-questions/series.css','legal.js','legal.css','for-doctors/collaboration-entry.css')
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Elements(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=False)
  self.text=text;self.lines=[0];self.stack=[];self.nodes=[]
  self.lines.extend(m.end() for m in re.finditer('\n',text));self.feed(text)
 def position(self):
  line,column=self.getpos();return self.lines[line-1]+column
 def handle_starttag(self,tag,attrs):
  start=self.position();node={'tag':tag,'attrs':dict(attrs),'start':start,'open_end':start+len(self.get_starttag_text()),'parent':self.stack[-1] if self.stack else None}
  if tag not in VOID:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):pass
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]['tag']==tag:
    node=self.stack[i];del self.stack[i:]
    node.update(close_start=self.position(),end=self.text.index('>',self.position())+1);self.nodes.append(node);return

def is_public_page(relative):
 p=Path(relative)
 return p.suffix=='.html' and p.parts[0] not in {'.git','logbook','media','tests','shared'} and p.name!='konspekt.html'

def public_pages():
 return sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*.html') if is_public_page(p.relative_to(ROOT)) and '<html' in p.read_text().lower())

def asset_version(asset):return hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()[:12]

def asset_tag(asset):
 url='/'+asset+'?v='+asset_version(asset)
 return f'<link rel="stylesheet" href="{url}">' if asset.endswith('.css') else f'<script'+('' if asset=='site-theme-init.js' else ' defer')+f' src="{url}"></script>'

def _headers(text):
 shells={'site-header','site-head','patient-header','doctors-header','terms-head','professional-updates-header','clinical-header'}
 return [n for n in sorted(Elements(text).nodes,key=lambda n:n['start']) if n['tag']=='header' and shells.intersection(n['attrs'].get('class','').split())]

def _header(text):return next(iter(_headers(text)),None)

def _remaining_header(text,node):
 if node['attrs'].get('data-site-header')=='shared':return ''
 inner=text[node['open_end']:node['close_start']]
 nodes=Elements(text).nodes
 containers={'nav','header-inner','header-row','doctors-nav','professional-updates-nav','terms-nav'}
 nav=next((n for n in sorted(nodes,key=lambda n:n['start']) if n['parent'] is not None and n['parent']['start']==node['start'] and containers.intersection(n['attrs'].get('class','').split())),None)
 context=''
 if nav:
  # Keep notification widgets; article anchors belong in the page's own content.
  descendants=[n for n in sorted(nodes,key=lambda n:n['start']) if nav['open_end']<=n['start'] and n['end']<=nav['close_start']]
  for n in descendants:
   if n['attrs'].get('id') in {'patient-updates','doctors-updates'}:
    widget=text[n['start']:n['end']]
    if n['attrs']['id']=='doctors-updates':widget='<!-- doctors-updates:start -->'+widget+'<!-- doctors-updates:end -->'
    context+=widget
  if context:context='<div class="container" data-site-header-context>'+context+'</div>'
  inner=text[node['open_end']:nav['start']]+text[nav['end']:node['close_start']]
 else:inner=''
 if not inner.strip():return context
 opening=text[node['start']:node['open_end']].replace('<header','<section',1)
 return context+opening+re.sub(r'(?m)^[ \t]+$','',inner)+'</section>'

def _detach_updates(text):
 # Preserve complete widgets and their generator markers when moving them.
 widgets=[]
 for node in sorted(Elements(text).nodes,key=lambda n:n['start'],reverse=True):
  if node['attrs'].get('id') not in {'patient-updates','doctors-updates'}:continue
  parent=node['parent'];in_navigation=False
  while parent:
   if 'data-site-header-context' in parent['attrs'] or parent['tag']=='header':in_navigation=True;break
   parent=parent['parent']
  if not in_navigation:continue
  start,end=node['start'],node['end']
  before='<!-- doctors-updates:start -->';after='<!-- doctors-updates:end -->'
  if text[:start].endswith(before) and text[end:].startswith(after):start-=len(before);end+=len(after)
  widgets.insert(0,text[start:end]);text=text[:start]+text[end:]
 text=re.sub(r'<div\b[^>]*\bdata-site-header-context[^>]*>\s*</div>','',text)
 return text,''.join(widgets)

def content_without_navigation(text):
 text,updates=_detach_updates(text)
 for node in reversed(_headers(text)):
  text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
 return inject_assets(_without_generated_breadcrumbs(_without_duplicate_article_shortcuts(text)))+updates

def _without_duplicate_article_shortcuts(text):
 # Legacy header anchor rows are not breadcrumbs. Keep real article TOCs intact.
 nodes=Elements(text).nodes
 for node in sorted(nodes,key=lambda n:n['start'],reverse=True):
  if 'data-site-header-context' not in node['attrs']:continue
  children=[n for n in nodes if n['parent'] is node]
  links=[n['attrs'].get('href','') for n in nodes if n['tag']=='a' and node['open_end']<=n['start'] and n['end']<=node['close_start']]
  if children and all(n['tag']=='nav' for n in children) and all(href.startswith('#') for href in links):
   text=text[:node['start']]+text[node['end']:]
 return text

BREADCRUMB_TITLES={
 'patients':('Пациентам','Patients'),
 'social':('Публикации из соцсетей','Social media posts'),
 'collaboration':('Профессиональное сотрудничество','Professional collaboration'),
 'privacy.html':('Политика конфиденциальности','Privacy policy'),
 'for-doctors':('Для врачей','For doctors'),
 'bacterial-keratitis':('Бактериальный кератит','Bacterial keratitis'),
 'complicated-cataract':('Осложнённая катаракта','Complicated cataract'),
 'iol-dislocation':('Дислокация ИОЛ','IOL dislocation'),
 'iol-calculation':('Расчёт ИОЛ','IOL power calculation'),
 'simple-questions':('Простые вопросы — сложные решения','Simple questions — complex decisions'),
 'updates':('Обновления','Updates'),
 'professional-use.html':('Условия профессионального использования','Professional use terms'),
 'ophthasearch':('OphthaSearch','OphthaSearch'),
 'ophthasearch-v2':('OphthaSearch','OphthaSearch'),
 'ophtha-arcade':('Ophtha Arcade','Ophtha Arcade'),
 'ophtha-merge':('Ophtha Merge','Ophtha Merge'),
}

BREADCRUMB_CLASSES={'site-breadcrumbs','clinical-breadcrumbs','breadcrumbs','crumbs','crumb','learn-breadcrumbs','article-crumb'}
BREADCRUMB_TITLES.update({
 'events':('Офтальмологические мероприятия','Ophthalmology events'),
 'free-learning':('Бесплатное обучение','Free learning'),
 'cabinet':('Кабинет офтальмолога','Ophthalmologist workspace'),
 'penetrating-keratoplasty':('Ведение после сквозной кератопластики','Follow-up after penetrating keratoplasty'),
 'cataract':('Катаракта','Cataract'),
 'cataract-postop-plan':('Послеоперационный план','Postoperative plan'),
 'before-surgery':('До операции','Before surgery'),
 'surgery-day':('День операции','Surgery day'),
 'recovery':('Первые дни после операции','Early recovery'),
 'daily-life':('Повседневная жизнь','Daily life'),
 'eye-drops':('Глазные капли','Eye drops'),
 'glasses':('Очки и зрение','Glasses and vision'),
 'glaucoma':('Глаукома','Glaucoma'),
 'health':('Здоровье в повседневной жизни','Everyday health'),
 'instagram-account-blocking':('Блокировка Instagram','Instagram account blocking'),
})

def breadcrumb_nodes(text):
 nodes=Elements(text).nodes
 candidates=[n for n in nodes if n['tag'] in {'nav','p','ol','div'} and (BREADCRUMB_CLASSES.intersection(n['attrs'].get('class','').split()) or re.search(r'breadcrumb|хлебн|навигационная цепочка',n['attrs'].get('aria-label',''),re.I))]
 return [n for n in candidates if not any(p['start']<n['start'] and n['end']<=p['end'] for p in candidates)]

def _without_generated_breadcrumbs(text):
 # Normalize every legacy variant, not just the latest shared fragment.
 for node in sorted(breadcrumb_nodes(text),key=lambda n:n['start'],reverse=True):
  text=text[:node['start']]+text[node['end']:]
 return re.sub(r'(?m)^[ \t]+$','',text)

def _with_breadcrumbs(text,relative):
 text=_without_generated_breadcrumbs(text)
 if relative in {'index.html','en/index.html'}:return text
 nodes=Elements(text).nodes
 heading=next((n for n in nodes if n['tag']=='h1'),None)
 if not heading or not heading['parent']:return text
 en=relative.startswith('en/');lang=1 if en else 0;prefix='/en' if en else ''
 parts=list(Path(relative.removeprefix('en/')).parts)
 if parts[-1]=='index.html':parts.pop()
 current=parts[-1]
 label=BREADCRUMB_TITLES.get(current)
 title=label[lang] if label else html.unescape(re.sub(r'<[^>]+>',' ',text[heading['open_end']:heading['close_start']])).strip()
 items=[('Home' if en else 'Главная',prefix+'/')]
 if parts[0]=='for-doctors' and len(parts)>1:
  items.append((BREADCRUMB_TITLES['for-doctors'][lang],prefix+'/for-doctors/'))
  if current=='complicated-cataract':items.append((BREADCRUMB_TITLES['simple-questions'][lang],prefix+'/for-doctors/simple-questions/'))
  if current=='ophtha-merge':items.append(('Ophtha Arcade',prefix+'/for-doctors/ophtha-arcade/'))
 if parts[0]=='patients' and len(parts)>1:
  items.append((BREADCRUMB_TITLES['patients'][lang],prefix+'/patients/'))
  if current in {'before-surgery','surgery-day','recovery','daily-life','eye-drops','glasses','cataract-postop-plan'}:
   items.append((BREADCRUMB_TITLES['cataract'][lang],prefix+'/patients/cataract/'))
  if current=='iol-dislocation':title=('Смещение искусственного хрусталика','Intraocular lens dislocation')[lang]
 if parts[0]=='social' and len(parts)>1:items.append((BREADCRUMB_TITLES['social'][lang],prefix+'/social/'))
 if current=='collaboration':items.append((BREADCRUMB_TITLES['for-doctors'][lang],prefix+'/for-doctors/'))
 content=[]
 for name,url in items:
  if not _exists(url):raise ValueError('Breadcrumb target does not exist: '+url)
  content.append('<a href="'+html.escape(url,quote=True)+'">'+html.escape(name)+'</a>')
  content.append('<span class="site-breadcrumbs__separator" aria-hidden="true">/</span>')
 content.append('<span class="site-breadcrumbs__current" aria-current="page">'+html.escape(title)+'</span>')
 nav='<nav class="site-breadcrumbs" data-site-breadcrumbs="shared" aria-label="'+('Breadcrumb' if en else 'Хлебные крошки')+'">'+''.join(content)+'</nav>'
 position=heading['parent']['open_end']
 return text[:position]+nav+text[position:]

def _url(relative):
 path='/'+relative
 return path.removesuffix('index.html') if path.endswith('index.html') else path

def _exists(url):
 target=ROOT/url.lstrip('/')
 return (target/'index.html').exists() if url.endswith('/') else target.exists()

def render_header(relative,updates=''):
 en=relative.startswith('en/');base=relative.removeprefix('en/');ru=_url(base);eng='/en'+ru
 if not _exists(eng):
  eng='/en/for-doctors/ophthasearch/' if 'ophthasearch-v2/' in eng else '/en/patients/' if base.startswith('patients/') else '/en/for-doctors/' if base.startswith('for-doctors/') else '/en/'
 if not _exists(ru):ru='/patients/' if base.startswith('patients/') else '/for-doctors/' if base.startswith('for-doctors/') else '/'
 values=dict(overlay=' data-site-header-overlay' if relative in {'index.html','en/index.html'} else '',home='/en/' if en else '/',prefix='/en' if en else '',monogram='MS' if en else 'МШ',home_label='Home' if en else 'Главная',nav_label='Main navigation' if en else 'Основная навигация',patients='Patients' if en else 'Пациентам',doctors='For doctors' if en else 'Для врачей',about='About the doctor' if en else 'О враче',language_label='Website language' if en else 'Язык сайта',theme_label='Switch to dark theme' if en else 'Включить тёмную тему',search='Search' if en else 'Поиск',ru_url=ru,en_url=eng,ru_active='' if en else ' is-active',en_active=' is-active' if en else '',ru_current='' if en else ' aria-current="page"',en_current=' aria-current="page"' if en else '')
 values['updates']=updates
 return Template((ROOT/'shared/site-header.html').read_text()).substitute({k:html.escape(v,quote=True) if k not in {'overlay','ru_current','en_current','updates'} else v for k,v in values.items()}).strip()

def inject_assets(text):
 assets=set(CSS+SCRIPTS+('site-theme-init.js',))
 def strip_tag(match):
  tag=match.group();url=re.search(r'(?:src|href)=["\'](/[^"\']+)["\']',tag)
  return '' if url and url.group(1).split('?')[0].lstrip('/') in assets else tag
 text=re.sub(r'[ \t]*<link\b[^>]*>|[ \t]*<script\b[^>]*>\s*</script>',strip_tag,text,flags=re.I)
 text=text.replace('</head>',asset_tag('site-theme-init.js')+''.join(asset_tag(a) for a in CSS)+'</head>',1)
 text=text.replace('</body>',''.join(asset_tag(a) for a in SCRIPTS)+'</body>',1)
 # Keep the existing professional notices, but invalidate their legacy header rewriter.
 text=re.sub(r'(/doctors-legal\.js)(?:\?v=[^"\']*)?',lambda m:m.group(1)+'?v='+asset_version('doctors-legal.js'),text)
 for asset in PAGE_ASSETS:
  text=re.sub(r'(/'+re.escape(asset)+r')(?:\?v=[^"\']*)?',lambda m:m.group(1)+'?v='+asset_version(asset),text)
 return text

def update_page(text,relative):
 if not is_public_page(relative) or '<html' not in text.lower():return text
 text,updates=_detach_updates(text)
 headers=_headers(text);current=next((n for n in headers if n['attrs'].get('data-site-header')=='shared'),None)
 header=render_header(relative,updates)
 if current:
  text=text[:current['start']]+header+text[current['end']:]
  for node in reversed(_headers(text)):
   if node['attrs'].get('data-site-header')!='shared':text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
 else:
  first=next(iter(headers),None)
  for node in reversed(headers):text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
  if first and first['parent'] and first['parent']['tag']=='body':text=text[:first['start']]+header+text[first['start']:]
  else:text=re.sub(r'(<body\b[^>]*>)',lambda m:m.group(1)+header,text,count=1,flags=re.I)
 return _with_breadcrumbs(inject_assets(_without_duplicate_article_shortcuts(text)),relative)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();changed=[]
 for rel in public_pages():
  p=ROOT/rel;old=p.read_text();new=update_page(old,rel)
  if old!=new:
   changed.append(rel)
   if not args.check:p.write_text(new)
 if args.check and changed:raise SystemExit('Noncanonical header/assets: '+', '.join(changed))
 print(f'Shared header: {len(public_pages())} pages, {len(changed)} '+('outdated' if args.check else 'updated'))
if __name__=='__main__':main()
